const mongoose = require('mongoose');

const Episode = new mongoose.Schema({
  title: String,
  episodeNumber: {
    type: Number,
    required: true,
  },
  filmId: {
    type: String,
    required: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  videoMimeType: {
    type: String,
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: new Date(),
  },
  thumbnail: String,
  thumbnailId: String,
  likes: {
    type: Number,
    default: 0,
  },
  dislikes: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('episodes', Episode);
