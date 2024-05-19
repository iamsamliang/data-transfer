import Link from "next/link";

type BubbleProps = {
  bubbleText: string;
  href?: string;
  //   onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export default function Bubble({ bubbleText, href = "" }: BubbleProps) {
  return (
    <div className={`flex flex-col items-center relative text-center`}>
      <Link
        className={`w-48 h-48 flex items-center justify-center bg-blue-500 text-white rounded-full hover:duration-500 hover:-translate-y-2`}
        href={href}
      >
        {bubbleText}
      </Link>
    </div>
  );
}
