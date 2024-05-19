"use client";
import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      className="p-4 bg-blue-500 rounded-lg text-white"
      onClick={() => signIn()}
    >
      Sign in with Google
    </button>
  );
}
