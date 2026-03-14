"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const AUTH_INPUT_STYLES =
  "h-11 rounded-xl border-slate-400/70 bg-white text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)] placeholder:text-slate-500 focus-visible:border-cyan-900/60 focus-visible:ring-2 focus-visible:ring-cyan-800/20";

export const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return <Input ref={ref} className={cn(AUTH_INPUT_STYLES, className)} {...props} />;
});

AuthInput.displayName = "AuthInput";
