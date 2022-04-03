const { Router } = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const { authenticate } = require('../middlewares');

const router = Router();
const { JWT_REFRESH_TOKEN_SECRET, FRONTEND_URL } = process.env;
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
      const user = await User.findOneAndUpdate(
        { provider: 'google', providerUserId: profile.id },
        {
          provider: 'google',
          providerUserId: profile.id,
          firstName: profile.name.familyName,
          middleName: profile.name.middleName,
          lastName: profile.name.givenName,
          email: profile.emails[0].value,
          profileImage: profile.photos[0].value,
          role: 'basic'
        },
        { upsert: true, new: true }
      );

      const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_TOKEN_SECRET);

      done(null, refreshToken);
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
    res.cookie('refreshToken', req.user, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'none',
      secure: true
    });
    res.redirect(FRONTEND_URL);
  }
);

router.post('/signin', authenticate, async (req, res) => {
  try {
    const data = {
      user: await User.findById(req.user.id)
    };
    if (req.newAccessToken) data.accessToken = req.newAccessToken;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'An internal error occurred' });
  }
});

router.get('/signout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Signed out' });
});

module.exports = router;
