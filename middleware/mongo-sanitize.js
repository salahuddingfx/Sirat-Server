function sanitizeObject(obj) {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key === 'password') continue;
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
}

module.exports = () => (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};
