const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { drive } = require('@googleapis/drive');
const authRouter = require('./routes/auth');
const filmRouter = require('./routes/films');
const videoRouter = require('./routes/videos');
const userRouter = require('./routes/user');
const { setDrive } = require('./middlewares');

const { PORT, MONGODB_STRING_URI } = process.env;

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use('/', authRouter);
app.use('/user', userRouter);

/**
 * Start video streaming server.
 * @param {OAuth2Client} auth An authorized OAuth2 client.
 */
function startServer(auth) {
  const driveInstance = new drive({ version: 'v3', auth });

  app.use('/films', setDrive(driveInstance), filmRouter);
  app.use('/videos', setDrive(driveInstance), videoRouter);

  mongoose.connect(MONGODB_STRING_URI, () => {
    console.log('Connected to database');

    app.listen(PORT, () =>
      console.log(`Server running at: http://localhost:${PORT}`)
    );
  });
}

module.exports = {
  startServer
};
