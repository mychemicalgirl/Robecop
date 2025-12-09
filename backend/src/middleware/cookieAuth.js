function cookieToAuthHeader(req, _res, next) {
  try {
    if (!req.headers.authorization && req.cookies && req.cookies.access_token) {
      req.headers.authorization = 'Bearer ' + req.cookies.access_token
    }
  } catch (e) {
    // ignore
  }
  next()
}

module.exports = { cookieToAuthHeader }
