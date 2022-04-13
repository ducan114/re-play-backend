const { Router } = require('express');
const Film = require('../models/film');
const Episode = require('../models/episode');
const UserReactionFilm = require('../models/user_reaction_film');
const UserReactionEpisode = require('../models/user_reaction_episode');
const {
  authenticate,
  findFilm,
  validateRaction,
  findEpisode
} = require('../middlewares');

const router = Router();

// Create a film reaction.
router.post(
  '/reactions/films/:slug',
  authenticate,
  validateRaction,
  findFilm,
  async (req, res) => {
    const reaction = req.reaction;
    const filter = { filmId: req.film.id, userId: req.user.id };
    try {
      const userReaction = await UserReactionFilm.findOne(filter);
      if (userReaction)
        return res.status(409).json({ message: 'Reaction already exists' });
      const newUserReaction = await UserReactionFilm.create({
        ...filter,
        reaction
      });
      await Film.updateOne(
        { _id: filter.filmId },
        { $inc: { [`${reaction}s`]: 1 } }
      );
      res.json({
        reaction: newUserReaction.reaction,
        message: 'Reaction created'
      });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Get user reaction about a film.
router.get(
  '/reactions/films/:slug',
  authenticate,
  findFilm,
  async (req, res) => {
    try {
      const userReact = await UserReactionFilm.findOne({
        filmId: req.film.id,
        userId: req.user.id
      });
      if (!userReact)
        return res.json({ message: 'Not reacted to the film yet' });
      res.json({ reaction: userReact.reaction });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Update a film reaction.
router.patch(
  '/reactions/films/:slug',
  authenticate,
  validateRaction,
  findFilm,
  async (req, res) => {
    try {
      const oldUserReaction = await UserReactionFilm.findOneAndUpdate(
        { filmId: req.film.id, userId: req.user.id },
        { reaction: req.reaction }
      );
      await Film.updateOne(
        { _id: req.film.id },
        {
          $inc: {
            [`${oldUserReaction.reaction}s`]: -1,
            [`${req.reaction}s`]: 1
          }
        }
      );
      res.json({ reaction: req.reaction, message: 'Reaction updated' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Remove reaction about a film.
router.delete(
  '/reactions/films/:slug',
  authenticate,
  findFilm,
  async (req, res) => {
    try {
      const userReaction = await UserReactionFilm.findOneAndDelete({
        filmId: req.film.id,
        userId: req.user.id
      });
      await Film.updateOne(
        { _id: req.film.id },
        { $inc: { [`${userReaction.reaction}s`]: -1 } }
      );
      res.json({ message: 'Reaction removed' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Create a episode reaction.
router.post(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  validateRaction,
  findFilm,
  findEpisode,
  async (req, res) => {
    const reaction = req.reaction;
    const filter = {
      filmId: req.film.id,
      episodeNumber: req.episode.episodeNumber,
      userId: req.user.id
    };
    try {
      const userReaction = await UserReactionEpisode.findOne(filter);
      if (userReaction)
        return res.status(409).json({ message: 'Reaction already exists' });
      const newUserReaction = await UserReactionEpisode.create({
        ...filter,
        reaction
      });
      await Episode.updateOne(
        { filmId: filter.filmId, episodeNumber: filter.episodeNumber },
        { $inc: { [`${reaction}s`]: 1 } }
      );
      res.json({
        reaction: newUserReaction.reaction,
        message: 'Reaction created'
      });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Get user reaction about an episode.
router.get(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  findFilm,
  findEpisode,
  async (req, res) => {
    try {
      const userReact = await UserReactionEpisode.findOne({
        filmId: req.film.id,
        episodeNumber: req.episode.episodeNumber,
        userId: req.user.id
      });
      if (!userReact)
        return res.json({ message: 'Not reacted to the film yet' });
      res.json({ reaction: userReact.reaction });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Update an episode reaction.
router.patch(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  validateRaction,
  findFilm,
  findEpisode,
  async (req, res) => {
    try {
      const oldUserReaction = await UserReactionEpisode.findOneAndUpdate(
        {
          filmId: req.film.id,
          episodeNumber: req.episode.episodeNumber,
          userId: req.user.id
        },
        { reaction: req.reaction }
      );
      await Episode.updateOne(
        { filmId: req.film.id, episodeNumber: req.episode.episodeNumber },
        {
          $inc: {
            [`${oldUserReaction.reaction}s`]: -1,
            [`${req.reaction}s`]: 1
          }
        }
      );
      res.json({ reaction: req.reaction, message: 'Reaction updated' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

// Remove reaction about an episode.
router.delete(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  findFilm,
  findEpisode,
  async (req, res) => {
    try {
      const userReaction = await UserReactionEpisode.findOneAndDelete({
        filmId: req.film.id,
        episodeNumber: req.episode.episodeNumber,
        userId: req.user.id
      });
      await Episode.updateOne(
        { filmId: req.film.id, episodeNumber: req.episode.episodeNumber },
        { $inc: { [`${userReaction.reaction}s`]: -1 } }
      );
      res.json({ message: 'Reaction removed' });
    } catch (err) {
      res.status(500).json({ message: 'An internal error occurred' });
    }
  }
);

module.exports = router;
