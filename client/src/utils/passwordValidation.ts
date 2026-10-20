
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

export function validatePassword(
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

export function passwordsMatch(
  password: string,
  confirmPassword: string
): boolean {
  return (
    password.length > 0 &&
    password === confirmPassword
  );
}
