"use server";

import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import {
  Bucket,
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { drive_v3, google } from "googleapis";
import * as stream from "stream";

type listBucketsOutput = {
  message?: string;
  buckets?: Bucket[];
};

function getS3Client(googleIDToken: string) {
  return new S3Client({
    region: process.env.COGNITO_REGION!,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: process.env.COGNITO_REGION! },
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
      logins: {
        "accounts.google.com": googleIDToken,
      },
    }),
  });
}

export async function listS3Buckets(
  googleIDToken: string
): Promise<listBucketsOutput> {
  const session = await getServerSession();
  if (!session || !session.user) redirect("/api/auth/signin");

  try {
    const s3Client = getS3Client(googleIDToken);
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);
    let buckets = result.Buckets;

    if (buckets === undefined || buckets.length === 0)
      return { message: "No buckets" };

    return { buckets: result.Buckets };
  } catch (error) {
    return { message: "Error listing buckets" };
  }
}

export async function listBucketObjects(
  googleIDToken: string,
  bucketName: string
) {
  const session = await getServerSession();
  if (!session || !session.user) redirect("/api/auth/signin");

  const s3Client = getS3Client(googleIDToken);
  const input = {
    Bucket: bucketName,
  };
  const command = new ListObjectsV2Command(input);
  const response = await s3Client.send(command);

  const objects = response.Contents;

  return objects;
}

async function ensureFolderExists(
  drive: drive_v3.Drive,
  folderName: string
): Promise<string> {
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });

  const files = res.data.files;
  if (files && files.length > 0) {
    // Folder exists, return its ID
    return files[0].id!;
  } else {
    // Folder does not exist, create it
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    return file.data.id!;
  }
}

export async function transferToGoogle(
  googleIDToken: string,
  googleAccessToken: string,
  googleRefreshToken: string | undefined,
  bucketName: string,
  objectKeys: string[]
) {
  const session = await getServerSession();
  if (!session || !session.user) redirect("/api/auth/signin");

  const s3Client = getS3Client(googleIDToken);

  const oauth2Client = new google.auth.OAuth2({});

  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  });

  // if (oauth2Client.isTokenExpiring()) {
  //   const { tokens } = await oauth2Client.refreshAccessToken();
  //   const newAccessToken = tokens.access_token;

  //   session.user.accessToken = newAccessToken;
  // }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const folderId = await ensureFolderExists(drive, "S3Upload");

  let errorred = false;

  for (const objectKey of objectKeys) {
    const input = {
      Bucket: bucketName,
      Key: objectKey,
    };
    const command = new GetObjectCommand(input);
    const response = await s3Client.send(command);
    const fileStream = response.Body as stream.Readable;

    const fileMetadata = {
      name: objectKey,
      parents: [folderId],
    };

    const media = {
      mimeType: response.ContentType,
      body: fileStream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    if (file.status !== 200) errorred = true;
  }

  return errorred;
}

export async function listGDriveFiles(
  googleAccessToken: string,
  googleRefreshToken: string | undefined
) {
  const session = await getServerSession();
  if (!session || !session.user) redirect("/api/auth/signin");

  const oauth2Client = new google.auth.OAuth2({});

  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  let allFiles: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      // @ts-ignore
      const res = await drive.files.list({
        q: `trashed=false and 'me' in owners and mimeType != 'application/vnd.google-apps.folder'`,
        spaces: "drive",
        pageSize: 1000,
        pageToken: pageToken,
        fields: "nextPageToken, files(id, name, mimeType)",
      });

      if (res.data.files) {
        allFiles = allFiles.concat(res.data.files);
      }

      pageToken = res.data.nextPageToken;
    } while (pageToken);

    return allFiles;
  } catch (err) {
    throw err;
  }
}

async function ensureBucketExists(
  s3Client: S3Client,
  bucketName: string
) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (err) {
    if (err instanceof NotFound) {
      console.log(`Bucket ${bucketName} does not exist, creating...`);
      await s3Client.send(
        new CreateBucketCommand({
          Bucket: bucketName,
        })
      );
      console.log(`Bucket ${bucketName} created`);
    } else if (
      err instanceof S3ServiceException &&
      err.$metadata?.httpStatusCode === 403
    ) {
      console.error(
        "Access denied. Check your AWS credentials and permissions."
      );
      throw err;
    } else {
      console.error("An unexpected error occurred:", err);
      throw err;
    }
  }
}

async function downloadFileFromDrive(
  drive: drive_v3.Drive,
  file: drive_v3.Schema$File
): Promise<Buffer> {
  if (
    file.mimeType &&
    file.mimeType.startsWith("application/vnd.google-apps")
  ) {
    // Handle Google Workspace files (Google Docs, Sheets, etc.)
    const mimeTypeMap: { [key: string]: string } = {
      "application/vnd.google-apps.document": "application/pdf",
      "application/vnd.google-apps.spreadsheet":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.google-apps.presentation": "application/pdf",
      "application/vnd.google-apps.drawing": "application/pdf",
    };

    const exportMimeType = mimeTypeMap[file.mimeType];
    if (!exportMimeType) {
      throw new Error(
        `Unsupported Google Workspace file type: ${file.mimeType}`
      );
    }

    const res = await drive.files.export(
      { fileId: file.id!, mimeType: exportMimeType },
      { responseType: "arraybuffer" }
    );
    // @ts-ignore
    return Buffer.from(res.data);
  } else {
    // Handle binary files
    const res = await drive.files.get(
      { fileId: file.id!, alt: "media" },
      { responseType: "arraybuffer" }
    );
    // @ts-ignore
    return Buffer.from(res.data);
  }
}

async function uploadFileToS3(
  s3: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string
) {
  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  };
  await s3.send(new PutObjectCommand(uploadParams));
}

export async function transferToS3(
  googleIDToken: string,
  googleAccessToken: string,
  googleRefreshToken: string | undefined,
  files: drive_v3.Schema$File[],
  bucketName: string
) {
  const session = await getServerSession();
  if (!session || !session.user) redirect("/api/auth/signin");

  const s3Client = getS3Client(googleIDToken);

  const oauth2Client = new google.auth.OAuth2({});
  oauth2Client.setCredentials({
    access_token: googleAccessToken,
    refresh_token: googleRefreshToken,
  });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  let errorred = false;

  try {
    await ensureBucketExists(s3Client, bucketName);

    console.log(
      `transferring selected files to S3 bucket called ${bucketName}`
    );

    for (const file of files) {
      if (file.id && file.name && file.mimeType) {
        const fileData = await downloadFileFromDrive(drive, file);
        await uploadFileToS3(
          s3Client,
          bucketName,
          file.name,
          fileData,
          file.mimeType
        );
      }
    }
    console.log(`Finished transferring files`);
  } catch (error) {
    throw error;
  }

  return errorred;
}
