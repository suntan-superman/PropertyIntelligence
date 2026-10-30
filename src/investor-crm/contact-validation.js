const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const normalizeContactEmail = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);

export const isValidContactEmail = (value) => {
  const email = normalizeContactEmail(value);
  return !email || EMAIL_PATTERN.test(email);
};

export const normalizeContactPhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
};

export const formatContactPhone = (value) => {
  const raw = String(value ?? "").trim(),
    digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (
    digits.length > 11 ||
    (raw.startsWith("+") && !(digits.length === 11 && digits.startsWith("1")))
  )
    return `+${digits}`;
  const domestic =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (domestic.length <= 3) return domestic;
  if (domestic.length <= 6)
    return `(${domestic.slice(0, 3)}) ${domestic.slice(3)}`;
  return `(${domestic.slice(0, 3)}) ${domestic.slice(3, 6)}-${domestic.slice(6, 10)}`;
};

export const contactPhoneError = (value) => {
  const phone = normalizeContactPhone(value);
  return phone && (phone.length < 7 || phone.length > 15)
    ? "Enter a valid telephone number."
    : "";
};

export const contactEmailError = (value) =>
  value && !isValidContactEmail(value) ? "Enter a valid email address." : "";
