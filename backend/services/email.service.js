const NITW_REGISTRATION_EMAIL_MESSAGE = 'Please register using a valid @student.nitw.ac.in or @nitw.ac.in email address.';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isAllowedNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  // Match the entire address so suffixes, subdomains, and whitespace inside an
  // address cannot pass by containing an otherwise valid NITW domain.
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(student\.nitw\.ac\.in|nitw\.ac\.in)$/.test(email);
}

function validateNitwRegistrationEmail(value) {
  const email = normalizeEmail(value);
  return isAllowedNitwRegistrationEmail(email)
    ? { email }
    : { error: NITW_REGISTRATION_EMAIL_MESSAGE };
}

module.exports = {
  NITW_REGISTRATION_EMAIL_MESSAGE,
  isAllowedNitwRegistrationEmail,
  normalizeEmail,
  validateNitwRegistrationEmail
};
