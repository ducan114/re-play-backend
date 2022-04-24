const mongoose = require('mongoose');

const Comment = new mongoose.Schema({
  room: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: { type: String, required: true },
  createdAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('comments', Comment);
