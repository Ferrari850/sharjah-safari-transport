/**
 * Authentication constants shared by the public auth screens.
 */

/**
 * Minimum password length enforced in the UI.
 *
 * This is a usability guard, not the security boundary: Supabase Auth
 * enforces the authoritative minimum server-side (Authentication →
 * Sign In / Providers → Minimum password length). Keep the two in sync —
 * if the project's setting is lower, a password shorter than this can
 * still be set through the API, and this check alone will not stop it.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Where the emailed recovery link returns the user to. Also the value that
 * must be registered as a Supabase redirect URL for every environment.
 */
export const PASSWORD_RECOVERY_REDIRECT_PATH = "/auth/update-password";
