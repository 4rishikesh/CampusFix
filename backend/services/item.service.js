const FIELDS_BY_TYPE = {
  lost: new Set(['title', 'category', 'location', 'dateLost', 'description', 'visibility']),
  found: new Set(['title', 'category', 'location', 'dateFound', 'description'])
};
const REQUIRED_FIELDS = ['title', 'category', 'location', 'description'];

function validationError(message) {
  const error = new Error(message);
  error.status = 422;
  return error;
}

function cleanString(value, field, { required = false, max = 120 } = {}) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') throw validationError(`${field} must be a string.`);
  const clean = value.trim();
  if (required && !clean) throw validationError(`${field} is required.`);
  if (clean.length > max) throw validationError(`${field} must be ${max} characters or fewer.`);
  return clean;
}

function cleanDate(value, field, { required = false } = {}) {
  if (value === undefined && !required) return undefined;
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw validationError(`${field} must be a valid date.`);
  if (date > new Date()) throw validationError(`${field} cannot be in the future.`);
  return date;
}

function validateItemInput(body, type, { partial = false } = {}) {
  const allowed = FIELDS_BY_TYPE[type];
  if (!allowed) throw validationError('Invalid item type.');
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('Request body must be an object.');
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) throw validationError(`Unexpected field: ${unexpected[0]}.`);
  const data = {};
  for (const field of REQUIRED_FIELDS) {
    if (body[field] !== undefined || !partial) {
      data[field] = cleanString(body[field], field, { required: !partial, max: field === 'description' ? 2000 : field === 'category' ? 60 : 120 });
    }
  }
  const dateField = type === 'lost' ? 'dateLost' : 'dateFound';
  if (body[dateField] !== undefined || !partial) data[dateField] = cleanDate(body[dateField], dateField, { required: !partial });
  if (type === 'lost' && (body.visibility !== undefined || !partial)) {
    if (!['public', 'private'].includes(body.visibility)) throw validationError('visibility must be public or private.');
    data.visibility = body.visibility;
  }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function canManageItem(item, user) {
  return item.user.toString() === user.id || user.role === 'admin';
}

module.exports = { canManageItem, validateItemInput, validationError };
