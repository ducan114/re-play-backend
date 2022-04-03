const jwt = require('jsonwebtoken');
const User = require('./models/user');

const { JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_SECRET } = process.env;

function authenticate(req, res, next) {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.body.accessToken;

  if (!refreshToken)
    return res.status(401).json({ message: 'Not authenticated' });

  jwt.verify(accessToken, JWT_ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (!err) {
      req.user = decoded;
      return next();
    }

    jwt.verify(refreshToken, JWT_REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Not authenticated' });

      const user = await User.findById(decoded.id);
      const newAccessToken = jwt.sign(
        { id: user._id, role: user.role },
        JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: '30m' }
      );
      req.user = decoded;
      req.newAccessToken = newAccessToken;
      next();
    });
  });
}

module.exports = {
  authenticate
};
