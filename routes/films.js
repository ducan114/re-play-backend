const { Router } = require('express');
const crypto = require('crypto');
const Film = require('../models/film');
const Episode = require('../models/episode');
const Genre = require('../models/genre');
const {
  authenticate,
  authorize,
  processFormData,
  findFilm,
  findEpisode
} = require('../middlewares');

const router = Router();
const { DRIVE_APP_ROOT_FOLDER } = process.env;

// Get films
router.get('/', async (req, res) => {
  try {
    const films = await Film.find();
    res.json(films);
  } catch (err) {
    res.status(500).json({ message: 'An internal error occurred' });
  }
});

// Create a new film.
router.post(
  '/',
  authenticate,
  authorize('admin'),
  processFormData(
    ['title', 'description', 'genre'],
    ['poster'],
    ['title', 'poster'],
    async (name, val, data) => {
      if (name === 'genre') {
        if (!data.genres) data.genres = [];
        const genre = await Genre.findById(val);
        if (!genre) throw new Error('Invalid genre');
        data.genres.push({ id: genre._id, name: genre.name });
      } else data[name] = val;
    },
    async (name, file, info, data, req) => {
      if (name === 'poster') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'image') throw new Error('Images only');
        const rootFolder = await req.drive.files.create({
          fields: 'id',
          resource: {
            name: crypto.randomUUID(),
            mimeType: 'application/vnd.google-apps.folder',
            parents: [DRIVE_APP_ROOT_FOLDER]
          }
        });
        const uploadedFile = await req.drive.files.create({
          fields: 'webContentLink, id',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: `poster.${mimeType.split('/')[1]}`,
            parents: [rootFolder.data.id]
          }
        });
        await req.drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        data.poster = uploadedFile.data.webContentLink;
        data.posterId = uploadedFile.data.id;
        data.rootFolder = rootFolder.data.id;
      }
    }
  ),
  async (req, res) => {
    await Film.create({
      ...req.data
    });
    res.json({ message: 'Film created', accessToken: req.newAccessToken });
  }
);

// Get a specific film.
router.get('/:slug', async (req, res) => {
  const slug = req.params.slug;
  try {
    const film = await Film.findOne({ slug });
    if (!film) return res.status(404).json({ message: 'Film not found' });
    res.json({
      ...film._doc,
      episodes: await Episode.find({ filmId: film._id })
    });
  } catch (err) {
    res.status(500).json({ message: 'An internal error occurred' });
  }
});

// Update a specific film.
router.patch(
  '/:slug',
  authenticate,
  authorize('admin'),
  findFilm,
  processFormData(
    ['title', 'description', 'genre'],
    ['poster'],
    [],
    async (name, val, data) => {
      if (name === 'genre') {
        if (!data.genres) data.genres = [];
        const genre = await Genre.findById(val);
        if (!genre) throw new Error('Invalid genre');
        data.genres.push({ id: genre._id, name: genre.name });
      } else data[name] = val;
    },
    async (name, file, info, data, req) => {
      if (name === 'poster') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'image') throw new Error('Images only');
        const uploadedFile = await req.drive.files.create({
          fields: 'webContentLink, id',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: `poster.${mimeType.split('/')[1]}`,
            parents: [req.film.rootFolder]
          }
        });
        await req.drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        data.poster = uploadedFile.data.webContentLink;
        data.posterId = uploadedFile.data.id;
      }
    }
  ),
  async (req, res) => {
    if (Object.keys(req.data).length === 0)
      return res.status(400).json({ message: 'There is nothing to update' });
    try {
      const film = await Film.findById(req.film.id);
      if (!film) return res.status(404).json({ message: 'Film not found' });
      if (req.data.poster)
        await req.drive.files.delete({
          fileId: film.posterId
        });
      const { slug } = await Film.findOneAndUpdate(
        { _id: req.film.id },
        {
          ...film._doc,
          ...req.data,
          updatedAt: new Date()
        },
        {
          new: true
        }
      );
      res.json({
        message: 'Film updated',
        slug: req.data.title ? slug : undefined
      });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Delete a specific film.
router.delete(
  '/:slug',
  authenticate,
  authorize('admin'),
  findFilm,
  async (req, res) => {
    try {
      await req.drive.files.delete({
        fileId: req.film.rootFolder
      });
      await Episode.deleteMany({ filmId: req.film.id });
      await Film.deleteOne({ _id: req.film.id });
      res.json({ message: 'Film deleted' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Check if episode number exists.
router.post(
  '/:slug/checkEpisodeNumber',
  authenticate,
  authorize('admin'),
  findFilm,
  async (req, res) => {
    if (!isValidEpisodeNumber(req.body.episodeNumber))
      return res.status(400).json({ message: 'Invalid episode number' });
    try {
      const episode = await Episode.findOne({
        filmId: req.film.id,
        episodeNumber: req.body.episodeNumber
      });
      res.json({ isAvailable: episode == null });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Add a new episode.
router.post(
  '/:slug',
  authenticate,
  authorize('admin'),
  findFilm,
  processFormData(
    ['title', 'episodeNumber'],
    ['thumbnail', 'video'],
    ['video', 'episodeNumber'],
    async (name, val, data, req) => {
      if (name === 'episodeNumber') {
        if (!isValidEpisodeNumber(val))
          throw new Error('Invalid episode number');
        const episode = await Episode.findOne({
          episodeNumber: val,
          filmId: req.film.id
        });
        if (episode) throw new Error('Episode number is existed');
      }
      data[name] = val;
    },
    async (name, file, info, data, req) => {
      if (name === 'video') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'video') throw new Error('Videos only');
        data.videoMimeType = mimeType;
        const uploadedFile = await req.drive.files.create({
          fields: 'id',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: crypto.randomUUID(),
            parents: [req.film.rootFolder]
          }
        });
        data.videoId = uploadedFile.data.id;
      }

      if (name === 'thumbnail') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'image') throw new Error('Images only');
        const uploadedFile = await req.drive.files.create({
          fields: 'id, webContentLink',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: crypto.randomUUID(),
            parents: [req.film.rootFolder]
          }
        });
        await req.drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        data.thumbnail = uploadedFile.data.webContentLink;
        data.thumbnailId = uploadedFile.data.id;
      }
    },
    data => data.videoId && data.videoMimeType
  ),
  async (req, res) => {
    await Episode.create({
      ...req.data,
      filmId: req.film.id
    });
    res.json({ message: 'Episode created', asscessToken: req.newAccessToken });
  }
);

// Get a specific episode.
router.get('/:slug/:episodeNumber', async (req, res) => {
  const { slug, episodeNumber } = req.params;
  try {
    const { _id: filmId } = await Film.findOne({ slug });
    if (!filmId) return res.status(404).json({ message: 'Film not found' });
    const episode = await Episode.findOne({ filmId, episodeNumber });
    if (episode) return res.json(episode);
    res.json({ message: 'Episode not found' });
  } catch (err) {
    res.status(500).json({ message: 'An internal error occurred' });
  }
});

// Update an episode.
router.patch(
  '/:slug/:episodeNumber',
  authenticate,
  authorize('admin'),
  findFilm,
  findEpisode,
  processFormData(
    ['title', 'episodeNumber', 'removeThumbnail'],
    ['thumbnail', 'video'],
    [],
    async (name, val, data, req) => {
      if (name === 'episodeNumber') {
        if (!isValidEpisodeNumber(val))
          throw new Error('Invalid episode number');
        const episode = await Episode.findOne({
          episodeNumber: val,
          filmId: req.film.id
        });
        if (episode) throw new Error('Episode number is existed');
      }
      data[name] = val;
    },
    async (name, file, info, data, req) => {
      if (name === 'video') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'video') throw new Error('Videos only');
        data.videoMimeType = mimeType;
        const uploadedFile = await req.drive.files.create({
          fields: 'id',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: crypto.randomUUID(),
            parents: [req.film.rootFolder]
          }
        });
        data.videoId = uploadedFile.data.id;
      }

      if (name === 'thumbnail') {
        const { mimeType } = info;
        if (mimeType.split('/')[0] !== 'image') throw new Error('Images only');
        const uploadedFile = await req.drive.files.create({
          fields: 'id, webContentLink',
          media: {
            mimeType,
            body: file
          },
          requestBody: {
            name: crypto.randomUUID(),
            parents: [req.film.rootFolder]
          }
        });
        await req.drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        data.thumbnail = uploadedFile.data.webContentLink;
        data.thumbnailId = uploadedFile.data.id;
      }
    }
  ),
  async (req, res) => {
    if (Object.keys(req.data).length === 0)
      return res.status(400).json({ message: 'There is nothing to update' });
    const filter = {
      filmId: req.film.id,
      episodeNumber: req.episode.episodeNumber
    };
    try {
      const episode = await Episode.findOne(filter);
      if (!episode)
        return res.status(404).json({ message: 'Episode not found' });
      if (
        (req.data.thumbnail || req.data.removeThumbnail) &&
        episode.thumbnailId
      )
        await req.drive.files.delete({
          fileId: episode.thumbnailId
        });
      if (req.data.videoId)
        await req.drive.files.delete({
          fileId: episode.videoId
        });
      const { removeThumbnail, ...data } = req.data;
      if (removeThumbnail) data.$unset = { thumbnail: 1, thumbnailId: 1 };
      await Episode.updateOne(filter, {
        ...data,
        updatedAt: new Date()
      });
      res.json({
        message: 'Episode updated',
        episodeNumber: req.data.episodeNumber
      });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Delete a specific episode.
router.delete(
  '/:slug/:episodeNumber',
  authenticate,
  authorize('admin'),
  findFilm,
  findEpisode,
  async (req, res) => {
    try {
      await req.drive.files.delete({
        fileId: req.episode.videoId
      });
      if (req.episode.thumbnailId)
        await req.drive.files.delete({
          fileId: req.episode.thumbnailId
        });
      await Episode.deleteOne({
        filmId: req.film.id,
        episodeNumber: req.episode.episodeNumber
      });
      res.json({ message: 'Episode deleted' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

function isValidEpisodeNumber(episodeNumber) {
  const epNum = Number(episodeNumber);
  return epNum != null && Number.isInteger(epNum) && epNum > 0;
}
module.exports = router;