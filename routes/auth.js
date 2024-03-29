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
      passReqToCallback: true,
      scope: ['profile', 'email']
    },
    async (req, _, __, profile, done) => {
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
      done(null, {
        data: user,
        redirectURL: `${FRONTEND_URL}${req.query.state}`
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

router.get('/signin/oauth2/google', (req, res, next) =>
  passport.authenticate('google', { state: req.query.next })(req, res, next)
);

router.get(
  '/oauth2/google/redirect',
  passport.authenticate('google'),
  (req, res) => {
    const refreshToken = jwt.sign(
      { id: req.user.data._id },
      JWT_REFRESH_TOKEN_SECRET
    );
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'None',
      secure: true
    });
    res.redirect(req.user.redirectURL);
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
      res.header('Cache-Control', 'no-store');
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
    sameSite: 'None',
    secure: true
  });
  res.json({ message: 'Signed out' });
});

module.exports = router;
