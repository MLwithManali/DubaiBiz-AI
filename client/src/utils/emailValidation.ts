
const commonDomainTypos: Record<string, string> = {
  "gmil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gail.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "hotmal.com": "hotmail.com",
};

export function validateEmail(value: string): string | null {
  const email = value.trim();

  if (!email) {
    return "Email address is required.";
  }

  if (email.length > 254) {
    return "Email address is too long.";
  }

  const parts = email.split("@");

  if (parts.length !== 2) {
    return "Please enter a valid email address.";
  }

  const [localPart, domain] = parts;

  if (!localPart || localPart.length > 64) {
    return "Invalid email username length.";
  }

  const localRegex =
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

  if (!localRegex.test(localPart)) {
    return "Email contains invalid characters or misplaced dots.";
  }

  const labels = domain.toLowerCase().split(".");

  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ) ||
    !/^[a-z]{2,63}$/.test(labels[labels.length - 1])
  ) {
    return "Please enter a valid email domain.";
  }

  const suggestion =
    commonDomainTypos[domain.toLowerCase()];

  if (suggestion) {
    return `Did you mean ${localPart}@${suggestion}? Please check your email address.`;
  }

  return null;
}
