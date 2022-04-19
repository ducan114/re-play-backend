const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { drive } = require('@googleapis/drive');
const authRouter = require('./routes/auth');
const filmRouter = require('./routes/films');
const videoRouter = require('./routes/videos');
const userRouter = require('./routes/user');
const { setDrive, logErrors, clientErrorHandler } = require('./middlewares');

const { PORT, MONGODB_STRING_URI } = process.env;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

/**
 * Start server.
 * @param {OAuth2Client} auth An authorized OAuth2 client.
 */
function startServer(auth) {
  const driveInstance = new drive({ version: 'v3', auth });

  mongoose.connect(MONGODB_STRING_URI, () => {
    console.log('Connected to database');

    server.listen(PORT, () =>
      console.log(`Server running at: http://localhost:${PORT}`)
    );
  });

  app.use(express.json());
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use('/', authRouter);
  app.use('/user', userRouter);
  app.use('/films', setDrive(driveInstance), filmRouter);
  app.use('/videos', setDrive(driveInstance), videoRouter);
  app.use(logErrors);
  app.use(clientErrorHandler);

  io.on('connection', socket => {
    console.log('A user connected');
    console.log(socket.handshake.headers.cookie);
    console.log(socket.handshake.auth.accessToken);

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
}

module.exports = {
  startServer
};
