const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const NITW_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(student\.nitw\.ac\.in|nitw\.ac\.in)$/i;
const NITW_REGISTRATION_EMAIL_MESSAGE = 'Please register using a valid email address (e.g. @student.nitw.ac.in, @nitw.ac.in, or standard email).';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isAllowedNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  if (!EMAIL_REGEX.test(email)) return false;
  if (process.env.ENFORCE_NITW_EMAIL === 'true') {
    return NITW_REGEX.test(email);
  }
  return true;
}

function validateNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (process.env.ENFORCE_NITW_EMAIL === 'true' && !NITW_REGEX.test(email)) {
    return { error: 'Please register using a valid @student.nitw.ac.in or @nitw.ac.in email address.' };
  }
  return { email };
}

module.exports = {
  NITW_REGISTRATION_EMAIL_MESSAGE,
  isAllowedNitwRegistrationEmail,
  normalizeEmail,
  validateNitwRegistrationEmail
};
