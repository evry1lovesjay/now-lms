// Environment shared by the e2e server and the DB reset script, so tests never
// touch the development database or uploaded videos.
export const TEST_PORT = 3100;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

export const testEnv = {
  DATABASE_URL: "file:./test.db",
  VIDEO_STORAGE_DIR: "./storage/test-videos",
  AUTH_SECRET: "e2e-test-secret-that-is-at-least-32-characters-long",
  SEED_SUPERADMIN_EMAIL: "superadmin@nowlms.local",
  SEED_SUPERADMIN_PASSWORD: "ChangeMe123!",
  MAX_VIDEO_MB: "50",
};

export function withTestEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...process.env, ...testEnv, ...extra };
}
