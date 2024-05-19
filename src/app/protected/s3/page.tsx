"use client";

import { Button } from "@/components/ui/button";
import { listS3Buckets } from "@/actions";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bucket } from "@aws-sdk/client-s3";
import Link from "next/link";

export default function S3Auth() {
  const { data: session, status } = useSession();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>(
    "Fetching buckets..."
  );

  useEffect(() => {
    if (status == "authenticated" && session?.idToken) {
      setErrorMsg("");
      handleListBuckets(session.idToken);
    }
  }, [status, session]);

  async function handleListBuckets(googleIDToken: string) {
    setErrorMsg("");
    const result = await listS3Buckets(googleIDToken);

    if (result.message) setErrorMsg(result.message);
    else setBuckets(result.buckets!);
  }

  return (
    <>
      <Button className="my-4 mx-6">
        <Link href="/protected/dashboard">Choose Data Source</Link>
      </Button>
      <div className="flex flex-col gap-5 justify-center items-center mt-10">
        {errorMsg ? (
          <h1 className="flex justify-center items-center">
            {errorMsg}
          </h1>
        ) : (
          <>
            <h1 className="flex justify-center items-center text-2xl">
              Choose a Bucket
            </h1>
            <ul className="flex flex-col gap-4 text-center text-white">
              {buckets.map((bucket, bucketIdx) => {
                return (
                  <li
                    className="p-4 bg-green-600 rounded-md"
                    key={bucketIdx}
                  >
                    <Link href={`/protected/s3/${bucket.Name}`}>
                      {bucket.Name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {buckets.length !== 0 ? (
              <Button
                onClick={async () =>
                  await handleListBuckets(session?.idToken!)
                }
              >
                Refresh Buckets
              </Button>
            ) : (
              ""
            )}
          </>
        )}
      </div>
    </>
  );
}
