"use client";

import { listGDriveFiles, transferToS3 } from "@/actions";
import LoadingIcon from "@/components/LoadingIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { drive_v3 } from "googleapis";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GDrive() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<
    drive_v3.Schema$File[] | undefined
  >();
  const [selectedFiles, setSelectedFiles] = useState<
    drive_v3.Schema$File[]
  >([]);
  const [isTransferring, setTransferring] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function populateFiles(
      googleAccessToken: string,
      googleRefreshToken: string | undefined
    ) {
      const gDriveFiles = await listGDriveFiles(
        googleAccessToken,
        googleRefreshToken
      );
      setFiles(gDriveFiles);
    }

    if (
      status === "authenticated" &&
      session.idToken &&
      session.accessToken
    ) {
      populateFiles(session.accessToken, session.refreshToken);
    }
  }, [session, status]);

  function handleSelectFileChange(file: drive_v3.Schema$File) {
    setSelectedFiles((prev) =>
      prev.includes(file)
        ? prev.filter((item) => item !== file)
        : [...prev, file]
    );
  }

  async function transferFiles() {
    toast({
      title: "Initiating Transfer",
      description:
        "Selected files are being transferred to S3 bucket 'from-gdrive-1234891-sam'",
    });
    setTransferring(true);
    const errorred = await transferToS3(
      session?.idToken!,
      session?.accessToken!,
      session?.refreshToken,
      selectedFiles,
      "from-gdrive-1234891-sam"
    );

    if (errorred) {
      toast({
        title: "Transfer Error",
        description:
          "Some or all of selected files failed to transfer to the S3 bucket. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Transfer Complete",
        description:
          "Selected files successfully transferred to S3 bucket 'from-gdrive-1234891-sam'.",
      });
      setSelectedFiles([]);
    }
    setTransferring(false);
  }

  return (
    <>
      <div className="flex justify-between my-4 mx-6">
        <Button onClick={() => router.back()}>
          Choose Data Source
        </Button>
        <Button
          onClick={async () => await transferFiles()}
          disabled={selectedFiles.length === 0}
        >
          Transfer Files
        </Button>
      </div>
      <div className="flex flex-col gap-8 justify-center items-center mt-8 p-8">
        <h1 className="text-2xl">
          Choose files from your Google Drive to transfer to AWS S3
        </h1>
        {isTransferring || files === undefined ? (
          <LoadingIcon size={38} />
        ) : (
          <ul className="flex flex-col gap-4">
            {files.map((file, fileIdx) => (
              <>
                {file.name != null ? (
                  <li key={file.id}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${fileIdx}`}
                        checked={selectedFiles.includes(file)}
                        onCheckedChange={() =>
                          handleSelectFileChange(file)
                        }
                      />
                      <label
                        htmlFor={`${fileIdx}`}
                        className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {file.name}
                      </label>
                    </div>
                  </li>
                ) : (
                  ""
                )}
              </>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
