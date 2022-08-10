const mongoose = require('mongoose');

const PushSubscription = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  subscription: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('push_subscription', PushSubscription);
