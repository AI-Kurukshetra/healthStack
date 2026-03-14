"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { signUpSchema } from "@/lib/validations/auth.schema";
import { signUpWithApi } from "@/lib/api/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const signUpFormSchema = signUpSchema
  .extend({
    repeatPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.repeatPassword, {
    path: ["repeatPassword"],
    message: "Passwords do not match",
  });

type SignUpFormInput = z.infer<typeof signUpFormSchema>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();
  const form = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      password: "",
      repeatPassword: "",
    },
  });

  const handleSignUp = form.handleSubmit(async (values) => {
    setApiError(null);

    try {
      const result = await signUpWithApi({
        email: values.email,
        password: values.password,
      });

      router.push(result.data.nextPath ?? "/sign-up-success");
      router.refresh();
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : "An error occurred");
    }
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-slate-900/10 bg-white/80 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Create Account
          </p>
          <CardTitle className="text-2xl text-cyan-950">Sign up</CardTitle>
          <CardDescription>
            Start your virtual care workflow in a few steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@clinic.com"
                  className="border-slate-900/15 bg-white"
                  {...form.register("email")}
                />
                {form.formState.errors.email?.message ? (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-slate-700">
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="border-slate-900/15 bg-white"
                  {...form.register("password")}
                />
                {form.formState.errors.password?.message ? (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password" className="text-slate-700">
                    Repeat Password
                  </Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  className="border-slate-900/15 bg-white"
                  {...form.register("repeatPassword")}
                />
                {form.formState.errors.repeatPassword?.message ? (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.repeatPassword.message}
                  </p>
                ) : null}
              </div>
              {apiError ? <p className="text-sm text-red-500">{apiError}</p> : null}
              <Button
                type="submit"
                className="w-full bg-cyan-900 text-white hover:bg-cyan-800"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Creating an account..." : "Sign up"}
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
        </CardContent>
      </Card>
    </div>
  );
}
