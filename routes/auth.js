const { Router } = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

const router = Router();
const { JWT_REFRESH_TOKEN_SECRET, JWT_ACCESS_TOKEN_SECRET, FRONTEND_URL } =
  process.env;
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.AUTH_CLIENT_ID,
      clientSecret: process.env.AUTH_CLIENT_SECRET,
      callbackURL: process.env.AUTH_REDIRECT_URI,
      scope: ['profile', 'email']
    },
    async (_, __, profile, done) => {
      const filter = { provider: 'google', providerUserId: profile.id };
      const data = {
        provider: 'google',
        providerUserId: profile.id,
        firstName: profile.name.familyName,
        middleName: profile.name.middleName,
        lastName: profile.name.givenName,
        email: profile.emails[0].value,
        profileImage: profile.photos[0].value
      };
      const user = await User.findOneAndUpdate(filter, data, {
        upsert: true,
        new: true
      });
      done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

router.get('/signin/oauth2/google', passport.authenticate('google'));

router.get(
  '/oauth2/google/redirect',
  passport.authenticate('google'),
  (req, res) => {
    const refreshToken = jwt.sign(
      { id: req.user._id },
      JWT_REFRESH_TOKEN_SECRET
    );
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'Lax',
      secure: true
    });
    res.redirect(FRONTEND_URL);
  }
);

router.get('/token', (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken)
    return res.status(401).json({ message: 'Unauthenticated' });
  jwt.verify(refreshToken, JWT_REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthenticated' });
    try {
      const user = await User.findById(decoded.id);
      const accessToken = jwt.sign(
        {
          id: decoded.id,
          role: user.role
        },
        JWT_ACCESS_TOKEN_SECRET
      );
      res.json(accessToken);
    } catch (err) {
      next(err);
    }
  });
});

router.get('/signout', (req, res) => {
  if (!req.cookies.refreshToken)
    return res.status(401).json({ message: 'Unauthenticated' });
  res.clearCookie('refreshToken', {
    sameSite: 'Lax',
    secure: true
  });
  res.json({ message: 'Signed out' });
});

module.exports = router;
