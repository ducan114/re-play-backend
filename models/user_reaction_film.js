const mongoose = require('mongoose');

const UserReactionFilm = new mongoose.Schema({
  filmId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  reaction: {
    type: String,
    enum: ['like', 'dislike'],
    required: true
  }
});

module.exports = mongoose.model('user_reaction_film', UserReactionFilm);
