import { SignUpForm } from "@/components/sign-up-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Health Stack",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
