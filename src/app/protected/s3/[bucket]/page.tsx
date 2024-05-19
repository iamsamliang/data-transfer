"use client";

import { listBucketObjects, transferToGoogle } from "@/actions";
import LoadingIcon from "@/components/LoadingIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { _Object } from "@aws-sdk/client-s3";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Bucket({
  params,
}: {
  params: { bucket: string };
}) {
  const { data: session, status } = useSession();
  const [objects, setObjects] = useState<_Object[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isTransferring, setTransferring] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function loadObjects(googleIDToken: string) {
      const response = await listBucketObjects(
        googleIDToken,
        params.bucket
      );
      if (!response) return;
      setObjects(response);
    }

    if (status === "authenticated" && session?.idToken) {
      loadObjects(session.idToken);
    }
  }, [status, session, params.bucket]);

  function handleSelectFileChange(objectKey: string) {
    setSelectedFiles((prevSelected) =>
      prevSelected.includes(objectKey)
        ? prevSelected.filter((item) => item !== objectKey)
        : [...prevSelected, objectKey]
    );
  }

  async function transferFiles() {
    toast({
      title: "Initiating Transfer",
      description:
        "Selected files are being transferred to your Google Drive.",
    });
    setTransferring(true);
    const errorred = await transferToGoogle(
      session?.idToken!,
      session?.accessToken!,
      session?.refreshToken,
      params.bucket,
      selectedFiles
    );

    if (errorred) {
      toast({
        title: "Transfer Error",
        description:
          "Some or all of selected files failed to transfer to your Google Drive. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Transfer Complete",
        description:
          "Selected files successfully transferred to your Google Drive under S3Upload folder.",
      });
      setSelectedFiles([]);
    }
    setTransferring(false);
  }

  return (
    <>
      <div className="flex justify-between my-4 mx-6">
        <Button onClick={() => router.back()}>Go Back</Button>
        <Button
          onClick={async () => await transferFiles()}
          disabled={selectedFiles.length === 0}
        >
          Transfer Files
        </Button>
      </div>
      <div className="flex flex-col gap-8 justify-center items-center mt-8 p-8">
        <h1 className="text-2xl">
          Choose files from bucket &quot;{params.bucket}&quot; to
          transfer to Google Drive
        </h1>
        {isTransferring ? (
          <LoadingIcon size={38} />
        ) : (
          <ul className="flex flex-col gap-4">
            {objects.map((object, objIdx) => (
              <>
                {object.Key !== undefined ? (
                  <li key={objIdx}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${objIdx}`}
                        checked={selectedFiles.includes(object.Key)}
                        onCheckedChange={() =>
                          handleSelectFileChange(object.Key!)
                        }
                      />
                      <label
                        htmlFor={`${objIdx}`}
                        className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {object.Key}
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
