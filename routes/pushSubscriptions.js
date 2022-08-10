const { Router } = require('express');
const webpush = require('web-push');
const PushSubscription = require('../models/push_subscription');
const { authenticate } = require('../middlewares');

const { WEB_PUSH_MAIL_TO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;

const router = new Router();

webpush.setVapidDetails(
  `mailto:${WEB_PUSH_MAIL_TO}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

router.post('/subscribe', authenticate, async (req, res) => {
  const { subscription } = req.body;
  await PushSubscription.create({
    userId: req.user.id,
    subscription: JSON.stringify(subscription)
  });
  res.status(201).json({ success: true });
});

module.exports = router;
