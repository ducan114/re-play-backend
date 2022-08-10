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
const genreRouter = require('./routes/genres');
const notificationRouter = require('./routes/pushSubscriptions');
const {
  setDrive,
  logErrors,
  clientErrorHandler,
  authenticateSocket,
  socketMiddleware
} = require('./middlewares');
const Comment = require('./models/comment');
const User = require('./models/user');
const Film = require('./models/film');
const Episode = require('./models/episode');

const { PORT = 5000, MONGODB_STRING_URI } = process.env;

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
  app.use('/notifications', notificationRouter);
  app.use('/films', setDrive(driveInstance), filmRouter);
  app.use('/genres', genreRouter);
  app.use('/videos', setDrive(driveInstance), videoRouter);
  app.use(logErrors);
  app.use(clientErrorHandler);

  io.use(socketMiddleware(cookieParser()));
  io.use(authenticateSocket);
  io.on('connection', socket => {
    socket.on('join-chat', (room, cb) =>
      handleSocketError(async () => {
        await validateRoom(room);
        socket.join(room);
        cb();
        socket.on('load-old-comments', comment =>
          handleSocketError(async () => {
            const oldCommentsFilter = {
              room
            };
            if (comment != null) {
              oldCommentsFilter.createdAt = { $lte: comment.createdAt };
              oldCommentsFilter._id = { $lt: comment._id };
            }
            const oldComments = (
              await Comment.find(oldCommentsFilter)
                .sort({ createdAt: -1 })
                .limit(5)
            ).reverse();
            const users = await User.find({
              _id: { $in: oldComments.map(comment => comment.author) }
            });
            const usersMap = Object.fromEntries(
              users.map(user => [
                user._id,
                {
                  _id: user._id,
                  profileImage: user.profileImage,
                  firstName: user.firstName,
                  middleName: user.middleName,
                  lastName: user.lastName
                }
              ])
            );
            const populatedOldComments = oldComments.map(comment => {
              const { _id, content, createdAt } = comment;
              return {
                _id,
                content,
                createdAt,
                author: usersMap[comment.author]
              };
            });
            socket.emit('old-comments', populatedOldComments);
          })
        );
        socket.on('send-comment', comment => {
          if (!socket.request.userId) return;
          handleSocketError(async () => {
            await validateRoom(room);
            const createdAt = new Date();
            const newComment = await Comment.create({
              room,
              author: comment.author._id,
              content: comment.content,
              createdAt
            });
            io.to(room).emit('new-comment', {
              _id: newComment._id,
              ...comment,
              createdAt
            });
          });
        });
      })
    );
    socket.on('disconnect', () => {});

    async function handleSocketError(callback) {
      try {
        await callback();
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    }
  });
}

async function validateRoom(room) {
  const [filmId, episodeId] = room.split('/');
  if (!(await Film.findById(filmId))) throw new Error('Film not found');
  if (episodeId && !(await Episode.findById(episodeId)))
    throw new Error('Episode not found');
}

module.exports = {
  startServer
};
