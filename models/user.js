const mongoose = require('mongoose');

const User = new mongoose.Schema({
  provider: {
    type: String,
    required: true
  },
  providerUserId: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  middleName: String,
  lastName: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  profileImage: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('users', User);
