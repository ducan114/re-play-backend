const { Router } = require('express');
const User = require('../models/user');
const Film = require('../models/film');
const Episode = require('../models/episode');
const UserReactionFilm = require('../models/user_reaction_film');
const UserReactionEpisode = require('../models/user_reaction_episode');
const UserSubscriptionFilm = require('../models/user_subscription_film');
const {
  authenticate,
  findFilm,
  validateRaction,
  findEpisode
} = require('../middlewares');

const router = Router();

// Get user info.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.header(
      'Cache-Control',
      'max-age=0, no-cache, no-store, must-revalidate, proxy-revalidate'
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Create a film reaction.
router.post(
  '/reactions/films/:slug',
  authenticate,
  validateRaction,
  findFilm,
  async (req, res, next) => {
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
      next(err);
    }
  }
);

// Get user reaction about a film.
router.get(
  '/reactions/films/:slug',
  authenticate,
  findFilm,
  async (req, res, next) => {
    try {
      const userReact = await UserReactionFilm.findOne({
        filmId: req.film.id,
        userId: req.user.id
      });
      if (!userReact)
        return res.status(404).json({ message: 'Reaction does not exsist' });
      res.json({ reaction: userReact.reaction });
    } catch (err) {
      next(err);
    }
  }
);

// Update a film reaction.
router.patch(
  '/reactions/films/:slug',
  authenticate,
  validateRaction,
  findFilm,
  async (req, res, next) => {
    try {
      const oldUserReaction = await UserReactionFilm.findOneAndUpdate(
        {
          filmId: req.film.id,
          userId: req.user.id,
          reaction: { $ne: req.reaction }
        },
        { reaction: req.reaction }
      );
      if (!oldUserReaction)
        return res.status(404).json({ message: 'Reaction does not exsist' });
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
      next(err);
    }
  }
);

// Remove reaction about a film.
router.delete(
  '/reactions/films/:slug',
  authenticate,
  findFilm,
  async (req, res, next) => {
    try {
      const userReaction = await UserReactionFilm.findOneAndDelete({
        filmId: req.film.id,
        userId: req.user.id
      });
      if (!userReaction)
        return res.status(404).json({ message: 'Reaction does not exsist' });
      await Film.updateOne(
        { _id: req.film.id },
        { $inc: { [`${userReaction.reaction}s`]: -1 } }
      );
      res.json({ message: 'Reaction removed' });
    } catch (err) {
      next(err);
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
  async (req, res, next) => {
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
      next(err);
    }
  }
);

// Get user reaction about an episode.
router.get(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  findFilm,
  findEpisode,
  async (req, res, next) => {
    try {
      const userReact = await UserReactionEpisode.findOne({
        filmId: req.film.id,
        episodeNumber: req.episode.episodeNumber,
        userId: req.user.id
      });
      if (!userReact)
        return res.status(404).json({ message: 'Reaction does not exsist' });
      res.json({ reaction: userReact.reaction });
    } catch (err) {
      next(err);
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
  async (req, res, next) => {
    try {
      const oldUserReaction = await UserReactionEpisode.findOneAndUpdate(
        {
          filmId: req.film.id,
          episodeNumber: req.episode.episodeNumber,
          userId: req.user.id,
          reaction: { $ne: req.reaction }
        },
        { reaction: req.reaction }
      );
      if (!oldUserReaction)
        return res.status(404).json({ message: 'Reaction does not exsist' });
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
      next(err);
    }
  }
);

// Remove reaction about an episode.
router.delete(
  '/reactions/films/:slug/:episodeNumber',
  authenticate,
  findFilm,
  findEpisode,
  async (req, res, next) => {
    try {
      const userReaction = await UserReactionEpisode.findOneAndDelete({
        filmId: req.film.id,
        episodeNumber: req.episode.episodeNumber,
        userId: req.user.id
      });
      if (!userReaction)
        return res.status(404).json({ message: 'Reaction does not exsist' });
      await Episode.updateOne(
        { filmId: req.film.id, episodeNumber: req.episode.episodeNumber },
        { $inc: { [`${userReaction.reaction}s`]: -1 } }
      );
      res.json({ message: 'Reaction removed' });
    } catch (err) {
      next(err);
    }
  }
);

// Create a new film subscription.
router.post(
  '/subscriptions/films/:slug',
  authenticate,
  findFilm,
  async (req, res, next) => {
    try {
      const userSubscription = await UserSubscriptionFilm.findOne({
        userId: req.user.id,
        filmId: req.film.id
      });
      if (userSubscription)
        return res
          .status(409)
          .json({ message: 'Subscription already existed' });
      await UserSubscriptionFilm.create({
        userId: req.user.id,
        filmId: req.film.id
      });
      res.json({ subscribed: true, message: 'Subscription created' });
    } catch (err) {
      next(err);
    }
  }
);

// Get user subscription for a specific film.
router.get(
  '/subscriptions/films/:slug',
  authenticate,
  findFilm,
  async (req, res, next) => {
    try {
      const userSubscription = await UserSubscriptionFilm.findOne({
        userId: req.user.id,
        filmId: req.film.id
      });
      if (!userSubscription)
        return res
          .status(404)
          .json({ subscribed: false, message: 'Subscription is not existed' });
      res.json({ subscribed: true });
    } catch (err) {
      next(err);
    }
  }
);

// Remove a film subscription.
router.delete(
  '/subscriptions/films/:slug',
  authenticate,
  findFilm,
  async (req, res, next) => {
    try {
      const userSubscription = await UserSubscriptionFilm.findOneAndDelete({
        userId: req.user.id,
        filmId: req.film.id
      });
      if (!userSubscription)
        return res.status(404).json({ message: 'Subscription is not existed' });
      res.json({ subscribed: false, message: 'Subscription removed' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
