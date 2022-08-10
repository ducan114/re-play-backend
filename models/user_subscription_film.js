const mongoose = require('mongoose');

const UserSubscriptionFilm = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  filmId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('user_subscription_film', UserSubscriptionFilm);
