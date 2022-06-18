const { Router } = require('express');
const Genre = require('../models/genre');
const Film = require('../models/film');
const { findGenre, authenticate, authorize } = require('../middlewares');

const router = new Router();

// Get all genres.
router.get('/', async (req, res, next) => {
  try {
    const genres = (await Genre.find()).sort((a, b) =>
      a.name === b.name ? 0 : a.name > b.name ? -1 : 1
    );
    res.json({ genres });
  } catch (err) {
    next(err);
  }
});

// Add a new genre.
router.post(
  '/',
  authenticate,
  authorize('admin'),
  findGenre,
  async (req, res, next) => {
    const { name, description } = req.body;
    if (req.existingGenre)
      return res.status(409).json({ message: 'Genre already exists' });
    try {
      await Genre.create({ name, description });
      res.json({ message: 'New genre created' });
    } catch (err) {
      next(err);
    }
  }
);

// Update an exsisting genre.
router.patch(
  '/:name',
  authenticate,
  authorize('admin'),
  findGenre,
  async (req, res, next) => {
    if (!req.existingGenre)
      return res.status(404).json({ message: 'Genre not found' });
    const { name, description } = req.body;
    try {
      await Genre.updateOne(
        { name: req.existingGenre.name },
        description ? { name, description } : { name }
      );
      await Film.updateMany(
        {
          'genres.name': req.existingGenre.name
        },
        {
          $set: { 'genres.$[i].name': name }
        },
        {
          arrayFilters: [
            {
              'i.name': req.existingGenre.name
            }
          ]
        }
      );
      res.json({ message: 'Genre updated' });
    } catch (err) {
      next(err);
    }
  }
);

// Remove an existing genre.
router.delete(
  '/:name',
  authenticate,
  authorize('admin'),
  findGenre,
  async (req, res, next) => {
    if (!req.existingGenre)
      return res.status(404).json({ message: 'Genre not found' });
    const { name } = req.params;
    try {
      await Genre.deleteOne({ name });
      await Film.updateMany(
        {
          'genres.name': req.existingGenre.name
        },
        {
          $pull: {
            genres: {
              _id: req.existingGenre._id,
              name: req.existingGenre.name
            }
          }
        },
        {
          arrayFilters: [
            {
              'i.name': req.existingGenre.name
            }
          ]
        }
      );
      res.json({ message: 'Genre deleted' });
    } catch (err) {
      next(err);
    }
  }
);

// Get a single genre.
router.get('/:name', findGenre, async (req, res, next) => {
  if (!req.existingGenre)
    return res.status(404).json({ message: 'Genre not found' });
  res.json({ ...req.existingGenre });
});

module.exports = router;
