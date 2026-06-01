function cleanValue(value, key) {
  if (key === 'password') return value;
  
  if (typeof value === 'string') {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(item => cleanValue(item));
  }
  if (value && typeof value === 'object') {
    for (const k in value) {
      value[k] = cleanValue(value[k], k);
    }
  }
  return value;
}

module.exports = () => (req, res, next) => {
  if (req.body) {
    cleanValue(req.body);
  }
  if (req.query) {
    cleanValue(req.query);
  }
  if (req.params) {
    cleanValue(req.params);
  }
  next();
};
