const { Router } = require("express");
const UserReactionFilm = require("../models/user_reaction_film");
const View = require("../models/view");
const Comment = require("../models/comment");
const Film = require("../models/film");
const { findGenre, authenticate, authorize } = require("../middlewares");

const router = new Router();

// Get general report
router.get("/general-report", async (req, res, next) => {
  try {
    const query = req.query;
    const { day, month, year } = query;
    let condition = {};
    let conditionVolatility = {};
    if (day && month && year) {
      condition = {
        createdAt: {
          $gte: new Date(year, month - 1, day),
          $lte: new Date(year, month - 1, day + 1),
        },
      };
      conditionVolatility = {
        createdAt: {
          $gte: new Date(year, month - 1, day - 1),
          $lte: new Date(year, month - 1, day),
        },
      };
    }
    if (!day && month && year) {
      condition = {
        createdAt: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 1),
        },
      };
      conditionVolatility = {
        createdAt: {
          $gte: new Date(year, month - 2, 1),
          $lte: new Date(year, month - 1, 1),
        },
      };
    }
    if (day && !month && year) {
      condition = {
        createdAt: {
          $gte: new Date(year, 0, day),
          $lte: new Date(year, 11, day),
        },
      };
      conditionVolatility = {
        createdAt: {
          $gte: new Date(year - 1, 0, day),
          $lte: new Date(year - 1, 11, day),
        },
      };
    }
    if (!day && !month && year) {
      condition = {
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year + 1, 0, 1),
        },
      };
      conditionVolatility = {
        createdAt: {
          $gte: new Date(year - 1, 0, 1),
          $lte: new Date(year, 0, 1),
        },
      };
    }
    const totalViews = await View.count(condition);
    const totalViewsVolatility = await View.count(conditionVolatility);
    const totalComments = await Comment.count(condition);
    const totalCommentsVolatility = await Comment.count(conditionVolatility);
    const totalLikes = await UserReactionFilm.count({
      ...condition,
      reaction: "like",
    });
    const totalLikesVolatility = await UserReactionFilm.count({
      ...conditionVolatility,
      reaction: "like",
    });

    const totalDislikes = await UserReactionFilm.count({
      ...condition,
      reaction: "dislike",
    });
    const totalDislikesVolatility = await UserReactionFilm.count({
      ...conditionVolatility,
      reaction: "dislike",
    });

    const generalReport = {};
    generalReport.view = {};
    generalReport.view.amount = totalViews;
    generalReport.view.volatility =
      totalViewsVolatility > totalViews
        ? {
            percent:
              ((totalViewsVolatility - totalViews) / totalViewsVolatility) *
              100,
            type: "down",
          }
        : {
            percent:
              ((totalViews - totalViewsVolatility) / totalViewsVolatility) *
              100,
            type: "up",
          };
    generalReport.comment = {};
    generalReport.comment.amount = totalComments;
    generalReport.comment.volatility =
      totalCommentsVolatility > totalComments
        ? {
            percent:
              ((totalCommentsVolatility - totalComments) /
                totalCommentsVolatility) *
              100,
            type: "down",
          }
        : {
            percent:
              ((totalComments - totalCommentsVolatility) /
                totalCommentsVolatility) *
              100,
            type: "up",
          };
    generalReport.like = {};
    generalReport.like.amount = totalLikes;
    generalReport.like.volatility =
      totalLikesVolatility > totalLikes
        ? {
            percent:
              ((totalLikesVolatility - totalLikes) / totalLikesVolatility) *
              100,
            type: "down",
          }
        : {
            percent:
              ((totalLikes - totalLikesVolatility) / totalLikesVolatility) *
              100,
            type: "up",
          };
    generalReport.dislike = {};
    generalReport.dislike.amount = totalDislikes;
    generalReport.dislike.volatility =
      totalDislikesVolatility > totalDislikes
        ? {
            percent:
              ((totalDislikesVolatility - totalDislikes) /
                totalDislikesVolatility) *
              100,
            type: "down",
          }
        : {
            percent:
              ((totalDislikes - totalDislikesVolatility) /
                totalDislikesVolatility) *
              100,
            type: "up",
          };
    const top5view = await View.aggregate([
      {
        $match: condition,
      },
      {
        $group: {
          _id: "$filmId",
          views: { $sum: 1 },
        },
      },
      {
        $sort: { views: -1 },
      },
      {
        $limit: 5,
      },
      {
        $addFields: {
          filmId: {
            $toObjectId: "$_id",
          },
        },
      },
      {
        $lookup: {
          from: "films",
          localField: "filmId",
          foreignField: "_id",
          as: "film",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$film", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $unset: ["film", "filmId"],
      },
    ]);
    generalReport.view.top5 = top5view.map((film) => {
      return {
        name: film.title,
        url: process.env.FRONTEND_URL + "films/" + film.slug,
        posterUrl: film.poster,
        amount: film.views,
        publishedAt: film.releasedDate,
      };
    });
    const top5comment = await Comment.aggregate([
      {
        $match: condition,
      },
      {
        $addFields: {
          filmId: {
            $toObjectId: {
              $substr: ["$room", 0, 24],
            },
          },
        },
      },
      {
        $group: {
          _id: "$filmId",
          comments: { $sum: 1 },
        },
      },
      {
        $sort: { comments: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "films",
          localField: "_id",
          foreignField: "_id",
          as: "film",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$film", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $unset: ["film", "filmId"],
      },
    ]);
    generalReport.comment.top5 = top5comment.map((film) => {
      return {
        name: film.title,
        url: process.env.FRONTEND_URL + "films/" + film.slug,
        posterUrl: film.poster,
        amount: film.comments,
        publishedAt: film.releasedDate,
      };
    });
    const top5like = await UserReactionFilm.aggregate([
      {
        $match: {
          ...condition,
          reaction: "like",
        },
      },
      {
        $set: {
          filmId: {
            $toObjectId: "$filmId",
          },
        },
      },
      {
        $group: {
          _id: "$filmId",
          likes: { $sum: 1 },
        },
      },
      {
        $sort: { likes: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "films",
          localField: "_id",
          foreignField: "_id",
          as: "film",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$film", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $unset: ["film", "filmId"],
      },
    ]);
    generalReport.like.top5 = top5like.map((film) => {
      return {
        name: film.title,
        url: process.env.FRONTEND_URL + "films/" + film.slug,
        posterUrl: film.poster,
        amount: film.likes,
        publishedAt: film.releasedDate,
      };
    });
    const top5dislike = await UserReactionFilm.aggregate([
      {
        $match: {
          ...condition,
          reaction: "dislike",
        },
      },
      {
        $set: {
          filmId: {
            $toObjectId: "$filmId",
          },
        },
      },
      {
        $group: {
          _id: "$filmId",
          likes: { $sum: 1 },
        },
      },
      {
        $sort: { likes: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "films",
          localField: "_id",
          foreignField: "_id",
          as: "film",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [{ $arrayElemAt: ["$film", 0] }, "$$ROOT"],
          },
        },
      },
      {
        $unset: ["film", "filmId"],
      },
    ]);
    generalReport.dislike.top5 = top5dislike.map((film) => {
      return {
        name: film.title,
        url: process.env.FRONTEND_URL + "films/" + film.slug,
        posterUrl: film.poster,
        amount: film.dislikes,
        publishedAt: film.releasedDate,
      };
    });
    res.json(generalReport);
  } catch (err) {
    next(err);
  }
});

// Get graph data
router.get("/monthly-data", async (req, res, next) => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  console.log(year, month);

  const data = {};
  const condition = {};

  condition.createdAt = {
    $gte: new Date(year - 1, month, 1),
    $lte: new Date(year, month, 31),
  };
  const viewData = await View.aggregate([
    {
      $match: condition,
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          month: {
            $month: "$createdAt",
          },
        },
        amount: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        Date: {
          $concat: [
            {
              $toString: "$_id.year",
            },
            "-",
            {
              $toString: {
                $add: ["$_id.month", 1],
              },
            },
          ],
        },
      },
    },
    {
      $unset: ["_id"],
    }
  ]);
  data.view = {};
  data.view.type = "view";
  data.view.content = viewData;

  const commentData = await Comment.aggregate([
    {
      $match: condition,
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          month: {
            $month: "$createdAt",
          },
        },
        amount: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        Date: {
          $concat: [
            {
              $toString: "$_id.year",
            },
            "-",
            {
              $toString: {
                $add: ["$_id.month", 1],
              },
            },
          ],
        },
      },
    },
    {
      $unset: ["_id"],
    }
  ])
  data.comment = {};
  data.comment.type = "comment";
  data.comment.content = commentData;

  const likeData = await UserReactionFilm.aggregate([
    {
      $match: {
        ...condition,
        reaction: "like",
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          month: {
            $month: "$createdAt",
          },
        },
        amount: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        Date: {
          $concat: [
            {
              $toString: "$_id.year",
            },
            "-",
            {
              $toString: {
                $add: ["$_id.month", 1],
              },
            },
          ],
        },
      },
    },
    {
      $unset: ["_id"],
    }
  ])
  data.like = {};
  data.like.type = "like";
  data.like.content = likeData;

  const dislikeData = await UserReactionFilm.aggregate([
    {
      $match: {
        ...condition,
        reaction: "dislike",
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },
          month: {
            $month: "$createdAt",
          },
        },
        amount: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        Date: {
          $concat: [
            {
              $toString: "$_id.year",
            },
            "-",
            {
              $toString: {
                $add: ["$_id.month", 1],
              },
            },
          ],
        },
      },
    },
    {
      $unset: ["_id"],
    }
  ])
  data.dislike = {};
  data.dislike.type = "dislike";
  data.dislike.content = dislikeData;

  res.json(data);
});

module.exports = router;
