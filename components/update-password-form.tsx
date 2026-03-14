"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthInput } from "@/components/auth-input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Password Recovery
        </p>
        <h2 className="text-2xl font-semibold text-cyan-950">Set new password</h2>
        <p className="text-sm text-slate-600">Please enter your new password below.</p>
      </div>
      <form onSubmit={handleForgotPassword}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-slate-700">
              New password
            </Label>
            <AuthInput
              id="password"
              type="password"
              placeholder="New password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-cyan-900 text-white hover:bg-cyan-800"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save new password"}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          Return to{" "}
          <Link
            href="/login"
            className="font-medium text-cyan-900 underline underline-offset-4"
          >
            login
          </Link>
        </div>
      </form>
    </div>
  );
}
