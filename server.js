const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { drive } = require('@googleapis/drive');
const authRouter = require('./routes/auth');

const { PORT, MONGODB_STRING_URI } = process.env;

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use('/', authRouter);

/**
 * Start video streaming server.
 * @param {OAuth2Client} auth An authorized OAuth2 client.
 */
function startServer(auth) {
  const driveInstance = new drive({ version: 'v3', auth });

  mongoose.connect(MONGODB_STRING_URI, () => {
    console.log('Connected to database');

    app.listen(PORT, () =>
      console.log(`Server running at: http://localhost:${PORT}`)
    );
  });
}

function setDrive(drive) {
  return (req, res, next) => {
    req.drive = drive;
    next();
  };
}

module.exports = {
  startServer
};
