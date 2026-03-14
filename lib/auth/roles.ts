export type UserRole = "patient" | "provider" | "admin" | "unknown";

type UserMetadata = {
  role?: string;
};

type AuthUser = {
  user_metadata?: UserMetadata;
};

export function getUserRole(user: AuthUser | null): UserRole {
  if (!user) {
    return "unknown";
  }

  const role = user.user_metadata?.role;

  if (role === "patient" || role === "provider" || role === "admin") {
    return role;
  }

  return "unknown";
}

export function isProvider(user: AuthUser | null): boolean {
  return getUserRole(user) === "provider";
}
