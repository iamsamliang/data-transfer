import Bubble from "@/components/Routes/Dashboard/Bubble";

export default function Dashboard() {
  return (
    <>
      <h1 className="flex justify-center mt-10 text-2xl">
        Pick a data source to view
      </h1>
      <div className="flex items-center justify-center w-full mt-20">
        <div className="w-1/2">
          <Bubble bubbleText="Google Drive" href="/protected/gdrive" />
        </div>
        <div className="w-1/2">
          <Bubble bubbleText="S3" href="/protected/s3" />
        </div>
      </div>
    </>
  );
}
