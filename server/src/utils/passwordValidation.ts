
/**
 * DubaiBiz AI
 * Backend Password Validation Utility
 *
 * Used during account registration.
 * Never log or expose actual passwords.
 */

export interface PasswordValidation {
  minLength: boolean;
  maxLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialCharacter: boolean;
  noSpaces: boolean;
  valid: boolean;
}

export function getPasswordRequirements(
  password: string
): PasswordValidation {
  const minLength = password.length >= 12;
  const maxLength = password.length <= 128;

  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);

  const specialCharacter =
    /[^A-Za-z0-9\s]/.test(password);

  const noSpaces = !/\s/.test(password);

  return {
    minLength,
    maxLength,
    uppercase,
    lowercase,
    number,
    specialCharacter,
    noSpaces,

    valid:
      minLength &&
      maxLength &&
      uppercase &&
      lowercase &&
      number &&
      specialCharacter &&
      noSpaces,
  };
}

/**
 * Returns null when the password is valid.
 * Otherwise returns a user-friendly error message.
 */
export function validatePassword(
  password: unknown
): string | null {
  if (typeof password !== "string") {
    return "Password is required.";
  }

  const rules = getPasswordRequirements(password);

  if (!rules.minLength) {
    return "Password must contain at least 12 characters.";
  }

  if (!rules.maxLength) {
    return "Password must not exceed 128 characters.";
  }

  if (!rules.uppercase) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }

  if (!rules.lowercase) {
    return "Password must contain at least one lowercase letter (a-z).";
  }

  if (!rules.number) {
    return "Password must contain at least one number (0-9).";
  }

  if (!rules.specialCharacter) {
    return "Password must contain at least one special character.";
  }

  if (!rules.noSpaces) {
    return "Password must not contain spaces.";
  }

  return null;
}
