import express, { static as static_ } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", static_(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse application/json
app.use(bodyParser.json());

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:short_url", async function (req, res) {
  const short_url = req.params.short_url;
  prisma.shortUrl
    .findFirstOrThrow({
      where: {
        shorten_url: short_url,
      },
    })
    .then(function (url) {
      return res.redirect(url.original_url);
    })
    .catch(function (err) {
      return res.json({ error: "invalid url" });
    });
});

app.post("/api/users", async function (req, res) {
  const username = req.body.username;
  const user = await prisma.user.create({
    data: {
      username: username,
    },
  });
  return res.json({
    username: user.username,
    _id: user.id,
  });
});

app.post("/api/users/:_id/exercises", async function (req, res) {
  const exercise_post = req.body;
  const id = parseInt(req.params._id);
  const user = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });

  const exercise = await prisma.exercise.create({
    data: {
      description: exercise_post.description,
      duration: parseInt(exercise_post.duration),
      date: exercise_post.date ? new Date(exercise_post.date) : new Date.now(),
      user: {
        connect: {
          id: id,
        },
      },
    },
  });
  return res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: new Date(exercise.date).toDateString(),
    _id: user.id,
  });
});

app.get("/api/users/:_id/logs", async function (req, res) {
  const from_date = req.query.from
    ? new Date(req.query.from + " UTC")
    : undefined;
  const to_date = req.query.to ? new Date(req.query.to + " UTC") : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
  const id = parseInt(req.params._id);
  const user = await prisma.user.findFirst({
    where: {
      id: id,
    },
  });
  const logs = await prisma.exercise.findMany({
    where: {
      user: {
        id: id,
      },
      date: {
        gte: from_date,
        lte: to_date,
      },
    },
    take: limit,
  });
  let formattedLogs = logs.map((log) => {
    const formattedLog = {
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString(),
    };
    return formattedLog;
  });
  return res.json({
    username: user.username,
    count: formattedLogs.length,
    _id: id,
    log: formattedLogs,
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
