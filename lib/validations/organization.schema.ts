import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const organizationOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
});

export type OrganizationOnboardingInput = z.infer<
  typeof organizationOnboardingSchema
>;
