const express = require("express");
const bcrypt = require("bcrypt");
const { getDB } = require("../db/mongo");
const { ObjectId } = require("mongodb");

module.exports = function (STUDENT_ID) {
  const router = express.Router();

  router.post(`/${STUDENT_ID}/users`, async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ ok: false, error: "Please fill in all fields." });
      }

      const db = getDB();

      const existing = await db.collection("users").findOne({
        $or: [{ username }, { email }],
      });

      if (existing) {
        return res.status(409).json({
          ok: false,
          error: "A user with that username or email already exists.",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await db.collection("users").insertOne({
        username,
        email,
        passwordHash,
        avatarPath: null,
        createdAt: new Date(),
      });

      req.session.userId = result.insertedId.toString();
      req.session.username = username;

      return res.status(201).json({
        ok: true,
        user: {
          id: result.insertedId.toString(),
          username,
          email,
          avatarPath: null,
        },
      });
    } catch (err) {
      console.error("register user error:", err);
      return res.status(500).json({
        ok: false,
        error: "Server error while registering user.",
      });
    }
  });

router.get(`/${STUDENT_ID}/users`, async (req, res) => {
  try {
    const rawQ = (req.query.q || "").trim();
    const db = getDB();

    let filter = {};
    if (rawQ) {
      // escape regex special chars so we do a *literal* substring search
      const safe = rawQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter = { username: { $regex: safe, $options: "i" } };
    }

    const users = await db
      .collection("users")
      .find(filter)
      .project({ username: 1, email: 1, avatarPath: 1, _id: 1 })
      .toArray();

    let followingSet = new Set();
    if (req.session.userId) {
      const me = new ObjectId(req.session.userId);
      const follows = await db
        .collection("follows")
        .find({ followerId: me })
        .toArray();

      followingSet = new Set(
        follows.map((f) => f.followeeId.toString())
      );
    }

    const enriched = users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u._id.toString()),
    }));

    res.json({ ok: true, users: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


  return router;
};
