"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Reset Requested
          </p>
          <h2 className="text-2xl font-semibold text-cyan-950">Check your email</h2>
          <p className="text-sm text-slate-600">Password reset instructions sent.</p>
          <p className="pt-2 text-sm text-slate-600">
            If you registered using your email and password, you will receive
            a password reset email.
          </p>
          <div className="mt-4 text-center text-sm">
            Return to{" "}
            <Link
              href="/login"
              className="font-medium text-cyan-900 underline underline-offset-4"
            >
              login
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Account Recovery
            </p>
            <h2 className="text-2xl font-semibold text-cyan-950">Reset your password</h2>
            <p className="text-sm text-slate-600">
              Type in your email and we&apos;ll send you a link to reset your
              password.
            </p>
          </div>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email
                </Label>
                <AuthInput
                  id="email"
                  type="email"
                  placeholder="name@clinic.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-cyan-900 text-white hover:bg-cyan-800"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset email"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-cyan-900 underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
