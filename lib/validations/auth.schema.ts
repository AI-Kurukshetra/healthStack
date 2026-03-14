import { z } from "zod";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8);
const requestIdSchema = z.string().min(1);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signInActionSchema = signInSchema.extend({
  action: z.literal("sign-in"),
});

export const signUpActionSchema = signUpSchema.extend({
  action: z.literal("sign-up"),
});

export const signOutSchema = z.object({
  action: z.literal("sign-out"),
});

export const authMutationSchema = z.discriminatedUnion("action", [
  signInActionSchema,
  signUpActionSchema,
  signOutSchema,
]);

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  emailConfirmedAt: z.string().datetime({ offset: true }).nullable(),
  lastSignInAt: z.string().datetime({ offset: true }).nullable(),
});

export const authSessionStateSchema = z.object({
  isAuthenticated: z.boolean(),
  needsEmailConfirmation: z.boolean(),
});

export const authSessionDataSchema = z.object({
  user: authUserSchema.nullable(),
  session: authSessionStateSchema,
  nextPath: z.string().min(1).optional(),
});

export const signOutResultSchema = z.object({
  success: z.literal(true),
  nextPath: z.literal("/login"),
});

export const authReadResponseSchema = z.object({
  data: authSessionDataSchema,
  meta: z.object({
    requestId: requestIdSchema,
  }),
});

export const authMutationResponseSchema = z.object({
  data: z.union([authSessionDataSchema, signOutResultSchema]),
  message: z.string().min(1),
  requestId: requestIdSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type AuthMutationInput = z.infer<typeof authMutationSchema>;
export type AuthAction = AuthMutationInput["action"];
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSessionData = z.infer<typeof authSessionDataSchema>;
