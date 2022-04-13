const mongoose = require('mongoose');

const slug = require('mongoose-slug-updater');

mongoose.plugin(slug);

const Film = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  slug: {
    type: String,
    slug: 'title',
    unique: true
  },
  genres: [
    {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      }
    }
  ],
  collections: [
    {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      }
    }
  ],
  releasedDate: {
    type: Date,
    default: new Date()
  },
  views: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: new Date()
  },
  poster: {
    type: String,
    required: true
  },
  posterId: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  rootFolder: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('films', Film);
