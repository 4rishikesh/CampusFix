const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const NITW_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(student\.nitw\.ac\.in|nitw\.ac\.in)$/i;
const NITW_REGISTRATION_EMAIL_MESSAGE = 'Please register using a valid @student.nitw.ac.in or @nitw.ac.in email address.';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isAllowedNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  return EMAIL_REGEX.test(email) && NITW_REGEX.test(email);
}

function validateNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  if (!EMAIL_REGEX.test(email) || !NITW_REGEX.test(email)) return { error: NITW_REGISTRATION_EMAIL_MESSAGE };
  return { email };
}

module.exports = {
  NITW_REGISTRATION_EMAIL_MESSAGE,
  isAllowedNitwRegistrationEmail,
  normalizeEmail,
  validateNitwRegistrationEmail
};
