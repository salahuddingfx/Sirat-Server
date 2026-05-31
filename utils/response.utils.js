const sendResponse = (res, statusCode, success, data, message = null) => {
  const response = { success };
  if (data) response.data = data;
  if (message) response.message = message;
  return res.status(statusCode).json(response);
};

module.exports = { sendResponse };
