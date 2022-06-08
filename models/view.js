const mongoose = require('mongoose');

const View = new mongoose.Schema({
  filmId: {
    type: String,
    required: true,
  },
  episodeId: {
    type: String,
    required: true,
  },
  userId: { type: String, required: true },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

module.exports = mongoose.model('views', View);
