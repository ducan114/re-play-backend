const jwt = require('jsonwebtoken');
const busboy = require('busboy');
const Film = require('./models/film');
const Episode = require('./models/episode');
const Genre = require('./models/genre');
const { JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_SECRET } = process.env;

function setDrive(drive) {
  return (req, res, next) => {
    req.drive = drive;
    next();
  };
}

function logErrors(err, req, res, next) {
  console.log(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  res.status(500).json({ message: 'An internal error occurred' });
}

function authenticate(req, res, next) {
  const authHeader = req.header('authorization');
  const accessToken = authHeader && authHeader.split(' ')[1];
  if (!accessToken) return res.status(401).json({ message: 'Unauthenticated' });
  jwt.verify(accessToken, JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthenticated' });
    req.user = decoded;
    next();
  });
}

function authorize(role) {
  return (req, res, next) => {
    if (req.user.role !== role)
      return res.status(403).json({ message: 'Unauthorized' });
    next();
  };
}

/**
 *
 * @param {Array<String>} acceptedFields An array of string represents aceppted field labels.
 * @param {Array<String>} acceptedFiles An array of string represents aceppted file labels.
 * @param {Array<String>} requiredData An array of string represents required field or file labels.
 * @param {Function} onField A function called when 'field' event fires.
 * @param {Function} onFile A function called when 'file' event fires.
 * @param {Function?} isDone A function called when the data is processed to determine that the data is properly parsed or not. Default to check all required data is populated or not.
 * @returns
 */
function processFormData(
  acceptedFields,
  acceptedFiles,
  requiredData,
  onField,
  onFile,
  isDone
) {
  return async (req, res, next) => {
    const data = {};
    const requiredDataObj = Object.fromEntries(
      requiredData.map(name => [name, false])
    );
    const bb = busboy({
      headers: req.headers
    });
    let bbFinished = false;
    const PQueue = (await import('p-queue')).default;
    const workQueue = new PQueue({ concurrency: 1 });

    // At the end of the last bb event, isParsedData() will return true
    bb.on('file', (name, file, info) =>
      handleError(async () => {
        if (!acceptedFiles.includes(name)) throw new Error('Invalid file name');
        if (requiredDataObj[name] === false) requiredDataObj[name] = true;
        await onFile(name, file, info, data, req);
        if (isParsedData()) onDone();
      })
    );
    bb.on('field', (name, val) =>
      handleError(async () => {
        if (!acceptedFields.includes(name))
          throw new Error('Invalid field name');
        if (requiredDataObj[name] === false) requiredDataObj[name] = true;
        await onField(name, val, data, req);
        if (isParsedData()) onDone();
      })
    );
    bb.on('finish', () =>
      handleError(() => {
        bbFinished = Object.values(requiredDataObj).every(val => val === true);
        if (!bbFinished) throw new Error('Lack of required data');
        if (isParsedData()) onDone();
      })
    );
    bb.on('error', abort);

    req.pipe(bb);

    function handleError(fn) {
      workQueue.add(async () => {
        try {
          await fn();
        } catch (err) {
          abort();
        }
      });
    }

    function abort() {
      req.unpipe(bb);
      workQueue.pause();
      res.set('Connection', 'close');
      res.sendStatus(400);
    }

    function isParsedData() {
      return (
        (isDone
          ? isDone(data)
          : Object.keys(requiredDataObj).every(key => data[key])) && bbFinished
      );
    }

    function onDone() {
      req.data = data;
      next();
    }
  };
}

async function findFilm(req, res, next) {
  const { slug } = req.params;
  try {
    const film = await Film.findOne({ slug });
    if (!film) return res.status(404).json({ message: 'Film not found' });
    req.film = {
      id: film._id,
      title: film.title,
      rootFolder: film.rootFolder
    };
    next();
  } catch (err) {
    return res.status(500).json({ message: 'An internal error occurred' });
  }
}

function validateRaction(req, res, next) {
  const { reaction } = req.body;
  const validReactions = ['like', 'dislike'];
  if (!reaction || !validReactions.includes(reaction))
    return res.status(400).json({ message: 'Invalid film reaction' });
  req.reaction = reaction;
  next();
}

async function findEpisode(req, res, next) {
  const { episodeNumber } = req.params;
  try {
    const episode = await Episode.findOne({
      filmId: req.film.id,
      episodeNumber
    });
    if (episode == null)
      return res.status(404).json({ message: 'Episode not found' });
    req.episode = {
      filmId: episode.filmId,
      episodeId: episode._id,
      episodeNumber: episode.episodeNumber,
      thumbnailId: episode.thumbnailId,
      videoId: episode.videoId
    };
    next();
  } catch (err) {
    return res.status(500).json({ message: 'An internal error occurred' });
  }
}

/**
 * This fuction wraps an Express middleware to use with socket.io.
 * @param {Function} expressMiddleware An Express middleware function.
 * @returns A socket.io middleware.
 */
function socketMiddleware(expressMiddleware) {
  return (socket, next) => expressMiddleware(socket.request, {}, next);
}

function authenticateSocket(socket, next) {
  const { refreshToken } = socket.request.cookies;
  if (!refreshToken) return next();
  jwt.verify(refreshToken, JWT_REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return next();
    socket.request.userId = decoded.id;
    next();
  });
}

function getSearchRegExp(req, res, next) {
  const { searchTerm = '' } = req.query;
  req.searchRegExp = new RegExp(
    searchTerm.replaceAll(/[\.\[\]\^\$\+\*\?\{\}\(\)\|\\]/g, '\\$&'),
    'i'
  );
  next();
}

async function findGenre(req, res, next) {
  const { name } = { ...req.body, ...req.params };
  if (!name) return res.status(400).json({ message: 'Invalid genre name' });
  try {
    req.existingGenre = await Genre.findOne({ name });
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  setDrive,
  authenticate,
  authorize,
  processFormData,
  findFilm,
  validateRaction,
  findEpisode,
  logErrors,
  clientErrorHandler,
  authenticateSocket,
  socketMiddleware,
  getSearchRegExp,
  findGenre
};
