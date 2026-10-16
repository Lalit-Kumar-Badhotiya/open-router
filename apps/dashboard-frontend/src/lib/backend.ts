/**
 * Base URL of the primary backend (`apps/primary-backend`).
 *
 * Used for the typed Eden client, CORS and the Google OAuth redirect —
 * so it must match the backend's `FRONTEND_URL`/`GOOGLE_REDIRECT_URI`
 * configuration in `apps/primary-backend/.env`.
 *
 * - Production: https://open-router-primary-backend.onrender.com
 * - Local dev:  http://localhost:3000 (make sure FRONTEND_URL is http://localhost:3001)
 */
export const PRIMARY_BACKEND_URL = "https://open-router-primary-backend.onrender.com";
