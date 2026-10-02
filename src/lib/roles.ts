// Pure role/permission rules. Safe to import from both server and client code.

export const ROLES = ["SUPERADMIN", "CONTENT_ADMIN", "TUTOR", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["ACTIVE", "BLOCKED"] as const;
export type Status = (typeof STATUSES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  CONTENT_ADMIN: "Content Admin",
  TUTOR: "Tutor",
  STUDENT: "Student",
};

/**
 * Which roles each role may block/unblock (and create accounts for).
 * - Super admin: content admins, tutors and students.
 * - Content admin: tutors and students.
 * Nobody can block a super admin.
 */
const MANAGEABLE_ROLES: Record<Role, readonly Role[]> = {
  SUPERADMIN: ["CONTENT_ADMIN", "TUTOR", "STUDENT"],
  CONTENT_ADMIN: ["TUTOR", "STUDENT"],
  TUTOR: [],
  STUDENT: [],
};

export function manageableRoles(actor: Role): readonly Role[] {
  return MANAGEABLE_ROLES[actor];
}

export function canManageRole(actor: Role, target: Role): boolean {
  return MANAGEABLE_ROLES[actor].includes(target);
}

/** Who can open the user-management screen. */
export function canManageUsers(role: Role): boolean {
  return MANAGEABLE_ROLES[role].length > 0;
}

/** Who can create/edit lessons, upload videos and assign tutors. */
export function canManageContent(role: Role): boolean {
  return role === "SUPERADMIN" || role === "CONTENT_ADMIN";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function homePathFor(role: Role): string {
  switch (role) {
    case "SUPERADMIN":
    case "CONTENT_ADMIN":
      return "/admin";
    case "TUTOR":
      return "/tutor";
    case "STUDENT":
      return "/student";
  }
}
