const express = require("express");
const { getDB } = require("../db/mongo");
const { ObjectId } = require("mongodb");
const path = require("path");
const multer = require("multer");

const upload = multer({ dest: path.join(__dirname, "..", "uploads") });



module.exports = function (STUDENT_ID) {
  const router = express.Router();

  function requireLogin(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    next();

  }
  router.post(
    `/${STUDENT_ID}/upload-image`,
    requireLogin,
    upload.single("image"),
    (req, res) => {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No file uploaded" });
      }
      const url = `/${STUDENT_ID}/uploads/${req.file.filename}`;
      res.json({ ok: true, url });
    }
  );


  // Create a society
  router.post(`/${STUDENT_ID}/societies`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const { name, description, branch } = req.body;

      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        return res
          .status(400)
          .json({ ok: false, error: "Society name is required." });
      }

      const ownerId = new ObjectId(req.session.userId);

      const owner = await db.collection("users").findOne(
        { _id: ownerId },
        { projection: { username: 1 } }
      );

      const doc = {
        name: trimmedName,
        description: (description || "").trim(),
        branch: (branch || "").trim(),
        ownerId,
        ownerUsername: owner?.username || "Unknown",
        members: [ownerId],           // creator is first member
        createdAt: new Date(),
      };

      const result = await db.collection("societies").insertOne(doc);

      return res.json({
        ok: true,
        society: {
          ...doc,
          _id: result.insertedId,
        },
      });
    } catch (err) {
      console.error("create society error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while creating society." });
    }
  });

router.get(`/${STUDENT_ID}/societies`, requireLogin, async (req, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.session.userId);

    const branch = (req.query.branch || "").trim();
    const q = (req.query.q || "").trim();

    const match = {};

    // filter by branch for the left sidebar
    if (branch) {
      match.branch = branch;
    }

    // filter by search term for the top search bar
    if (q) {
      // escape regex special chars
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      match.$or = [
        { name: regex },
        { description: regex },
      ];
    }

    const societies = await db
      .collection("societies")
      .find(match)
      .sort({ createdAt: -1 })
      .toArray();

    const result = societies.map((s) => ({
      id: s._id,
      name: s.name,
      description: s.description || "",
      branch: s.branch || "",
      ownerId: s.ownerId,
      ownerUsername: s.ownerUsername || "Unknown",
      memberCount: (s.members || []).length,
      isMember: (s.members || []).some(
        (m) => m.toString() === userId.toString()
      ),
      isOwner: s.ownerId.toString() === userId.toString(),
    }));

    return res.json({ ok: true, societies: result });
  } catch (err) {
    console.error("list societies error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error while loading societies." });
  }
});

  router.get(`/${STUDENT_ID}/my-societies`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const ownerId = new ObjectId(req.session.userId);

      const societies = await db
        .collection("societies")
        .find({ ownerId })
        .sort({ createdAt: -1 })
        .toArray();

      const memberIds = [
        ...new Set(
          societies.flatMap((s) => (s.members || []).map((m) => m.toString()))
        ),
      ];

      let usernamesById = new Map();
      if (memberIds.length) {
        const users = await db
          .collection("users")
          .find({ _id: { $in: memberIds.map((id) => new ObjectId(id)) } })
          .project({ username: 1 })
          .toArray();

        usernamesById = new Map(
          users.map((u) => [u._id.toString(), u.username])
        );
      }

      const payload = societies.map((s) => ({
        id: s._id,
        name: s.name,
        members: (s.members || []).map(
          (m) => usernamesById.get(m.toString()) || "Unknown"
        ),
      }));

      return res.json({ ok: true, societies: payload });
    } catch (err) {
      console.error("my societies error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while loading your societies." });
    }
  });


  //  create a post
  router.post(`/${STUDENT_ID}/contents`, requireLogin, async (req, res) => {
    try {
      const { text, images, tags, type, branch } = req.body;
      let imageArray = [];
      if (Array.isArray(images)) {
        imageArray = images;


      }
      if (!text && !imageArray.length === 0) {
        return res
          .status(400)
          .json({ ok: false, error: "Text required or Image" });
      }
      const db = getDB();
      const doc = {
        type: type || 'standard',
        branch: branch || "",
        authorId: new ObjectId(req.session.userId),
        text: text || "",
        images: imageArray || [],
        tags: tags || [],
        createdAt: new Date()
      };

      const result = await db.collection('contents').insertOne(doc);
      res.json({ ok: true, contentId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get(`/${STUDENT_ID}/contents`, async (req, res) => {
    try {
      const db = getDB();
      const q = (req.query.q || '').trim();

      const matchStage = q
        ? { $match: { text: { $regex: q, $options: 'i' } } }
        : { $match: {} };

      const posts = await db
        .collection('contents')
        .aggregate([
          matchStage,
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'authorId',
              foreignField: '_id',
              as: 'author',
            },
          },
          { $unwind: '$author' },
          {
            $project: {
              text: 1,
              type: 1,
              branch: 1,
              images: 1,
              createdAt: 1,
              authorId: 1,
              username: '$author.username',
              avatarPath: '$author.avatarPath',
            },
          },
        ])
        .toArray();

      res.json({ ok: true, posts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  // Add a comment to a post
  router.post(`/${STUDENT_ID}/contents/:id/comments`, requireLogin, async (req, res) => {
    try {
      const { text } = req.body;
      const trimmed = (text || "").trim();
      if (!trimmed) {
        return res.status(400).json({ ok: false, error: "Comment text required." });
      }

      const db = getDB();
      const contentId = new ObjectId(req.params.id);

      const post = await db.collection("contents").findOne(
        { _id: contentId },
        { projection: { authorId: 1 } }
      );

      const commentDoc = {
        contentId,
        authorId: new ObjectId(req.session.userId),
        text: trimmed,
        createdAt: new Date(),
      };

      const result = await db.collection("comments").insertOne(commentDoc);

      // create a notification 
      if (post && post.authorId && post.authorId.toString() !== req.session.userId) {
        await db.collection("notifications").insertOne({
          userId: post.authorId,
          fromUserId: new ObjectId(req.session.userId),
          type: "comment",
          postId: contentId,
          text: "Someone commented on your post",
          read: false,
          createdAt: new Date(),
        });
      }
      

      return res.json({
        ok: true,
        comment: {
          _id: result.insertedId,
          text: commentDoc.text,
          createdAt: commentDoc.createdAt,
          authorUsername: req.session.username || "You",
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });


// Get comments for a post
router.get(`/${STUDENT_ID}/contents/:id/comments`, async (req, res) => {
  try {
    const db = getDB();
    const contentId = new ObjectId(req.params.id);

    const comments = await db
      .collection("comments")
      .aggregate([
        { $match: { contentId } },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },
        {
          $project: {
            text: 1,
            createdAt: 1,
            authorUsername: "$author.username",
          },
        },
      ]) .toArray();

    return res.json({ ok: true, comments });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error" });
  }
});

  router.post(`/${STUDENT_ID}/contents/:id/like`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const contentId = new ObjectId(req.params.id);

      const existing = await db.collection("likes").findOne({ userId, contentId });

      if (existing) {

        await db.collection("likes").deleteOne({ _id: existing._id });
        return res.json({ ok: true, liked: false });
      } else {
        await db.collection("likes").insertOne({
          userId,
          contentId,
          createdAt: new Date(),
        });
        return res.json({ ok: true, liked: true });
      }
    } catch (err) {
      console.error("like error:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  // Get likes count 
  router.get(`/${STUDENT_ID}/contents/:id/likes`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const contentId = new ObjectId(req.params.id);

      const [count, mine] = await Promise.all([
        db.collection("likes").countDocuments({ contentId }),
        db.collection("likes").findOne({ contentId, userId }),
      ]);

      return res.json({
        ok: true,
        count,
        liked: !!mine,
      });
    } catch (err) {
      console.error("likes fetch error:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  router.get(`/${STUDENT_ID}/notifications`, requireLogin, async (req, res) => {
    const db = getDB();
    const userId = new ObjectId(req.session.userId);

    const notifications = await db
      .collection("notifications")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.json({ ok: true, notifications, unreadCount });
  });

  router.post(`/${STUDENT_ID}/notifications/read`, requireLogin, async (req, res) => {
    const db = getDB();
    const userId = new ObjectId(req.session.userId);

    await db
      .collection("notifications")
      .updateMany({ userId, read: false }, { $set: { read: true } });

    res.json({ ok: true });
  });



  //  follow a user
router.post(`/${STUDENT_ID}/follow`, requireLogin, async (req, res) => {
  try {
    const { userIdToFollow } = req.body;
    if (!userIdToFollow) {
      return res.status(400).json({ error: "userIdToFollow required" });
    }

    const db = getDB();
    const followerId = new ObjectId(req.session.userId);
    const followeeId = new ObjectId(userIdToFollow);

    await db.collection("follows").updateOne(
      { followerId, followeeId },
      { $setOnInsert: { followerId, followeeId, createdAt: new Date() } },
      { upsert: true }
    );

    // create follow notification 
    if (followeeId.toString() !== followerId.toString()) {
      await db.collection("notifications").insertOne({
        userId: followeeId,
        fromUserId: followerId,
        type: "follow",
        text: "You have a new follower",
        read: false,
        createdAt: new Date(),
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


  router.delete(`/${STUDENT_ID}/follow`, requireLogin, async (req, res) => {
    try {
      const { userIdToUnfollow } = req.body;
      if (!userIdToUnfollow) {
        return res.status(400).json({ error: 'userIdToUnfollow required' });
      }

      const db = getDB();
      await db.collection('follows').deleteOne({
        followerId: new ObjectId(req.session.userId),
        followeeId: new ObjectId(userIdToUnfollow)
      });

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });



  router.get(`/${STUDENT_ID}/friends`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const me = new ObjectId(req.session.userId);

      const iFollow = await db
        .collection("follows")
        .find({ followerId: me })
        .toArray();
      const followingIds = iFollow.map((f) => f.followeeId);

      const followsMe = await db
        .collection("follows")
        .find({ followeeId: me })
        .toArray();
      const followerIds = followsMe.map((f) => f.followerId.toString());

      const mutualIds = followingIds.filter((id) =>
        followerIds.includes(id.toString())
      );

      if (!mutualIds.length) {
        return res.json({ ok: true, users: [] });
      }

      const users = await db
        .collection("users")
        .find({ _id: { $in: mutualIds } })
        .project({ username: 1, email: 1 })
        .toArray();

      res.json({ ok: true, users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  router.get(`/${STUDENT_ID}/followers`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const me = new ObjectId(req.session.userId);

      // People who follow me
      const followerLinks = await db
        .collection("follows")
        .find({ followeeId: me })
        .toArray();

      if (!followerLinks.length) {
        return res.json({ ok: true, users: [] });
      }

      const followerIds = followerLinks.map((f) => f.followerId);

      const followBackLinks = await db
        .collection("follows")
        .find({
          followerId: me,
          followeeId: { $in: followerIds },
        })
        .toArray();

      const followBackSet = new Set(
        followBackLinks.map((f) => f.followeeId.toString())
      );

      const users = await db
        .collection("users")
        .find({ _id: { $in: followerIds } })
        .project({
          username: 1,
          email: 1,
          avatarPath: 1,
          bio: 1,
          createdAt: 1,
        })
        .toArray();

      const result = users.map((u) => ({
        id: u._id,
        username: u.username,
        email: u.email,
        avatarPath: u.avatarPath,
        bio: u.bio || "",
        isFollowingBack: followBackSet.has(u._id.toString()),
      }));

      res.json({ ok: true, users: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  // Get notifications
  router.get(`/${STUDENT_ID}/notifications`, requireLogin, async (req, res) => {
    const db = getDB();

    const notes = await db
      .collection("notifications")
      .find({ userId: new ObjectId(req.session.userId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const unreadCount = notes.filter(n => !n.read).length;

    res.json({
      ok: true,
      unreadCount,
      notifications: notes
    });
  });

  router.post(`/${STUDENT_ID}/notifications/read`, requireLogin, async (req, res) => {
    const db = getDB();
    await db.collection("notifications").updateMany(
      { userId: new ObjectId(req.session.userId), read: false },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  });


  // posts from followed users
  router.get(`/${STUDENT_ID}/feed`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);

      const follows = await db
        .collection("follows")
        .find({ followerId: userId })
        .toArray();

      const followedIds = follows.map((f) => f.followeeId);

      // see your own posts
      const visibleIds = followedIds



      const posts = await db
        .collection("contents")
        .aggregate([
          { $match: { authorId: { $in: visibleIds } } },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "users",
              localField: "authorId",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
          {
            $project: {
              text: 1,
              type: 1,
              branch: 1,
              images: 1,
              createdAt: 1,
              authorId: 1,
              username: "$author.username",
              avatarPath: "$author.avatarPath",
            },

          },
        ])
        .toArray();

      res.json({ ok: true, posts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  router.get(`/${STUDENT_ID}/me`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);

      const user = await db.collection("users").findOne(
        { _id: userId },
        {
          projection: {
            username: 1,
            email: 1,
            avatarPath: 1,
            bio: 1,
            createdAt: 1,
          },
        }
      );

      if (!user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      const followerCount = await db
        .collection("follows")
        .countDocuments({ followeeId: userId });

      const followingCount = await db
        .collection("follows")
        .countDocuments({ followerId: userId });

      const posts = await db
        .collection("contents")
        .find({ authorId: userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        ok: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatarPath: user.avatarPath,
          bio: user.bio || "",
          createdAt: user.createdAt,
          followerCount,
          followingCount,
        },
        posts,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  // PUT /M0xxxxx/me → update bio + avatar
  router.put(`/${STUDENT_ID}/me`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const { bio, avatarUrl } = req.body;

      await db.collection("users").updateOne(
        { _id: userId },
        {
          $set: {
            bio: bio || "",
            avatarPath: avatarUrl || null,
          },
        }
      );

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  // DELETE POST
  router.delete(
    `/${STUDENT_ID}/contents/:id`,
    requireLogin,
    async (req, res) => {
      try {
        const db = getDB();
        const postId = req.params.id;
        const userId = new ObjectId(req.session.userId);

        const result = await db.collection("contents").deleteOne({
          _id: new ObjectId(postId),
          authorId: userId, // only delete if this user owns it
        });

        if (result.deletedCount === 0) {
          return res
            .status(403)
            .json({ ok: false, error: "Not allowed or post not found" });
        }

        res.json({ ok: true });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: "Server error" });
      }
    }
  );
  router.get(`/${STUDENT_ID}/user/:id`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.params.id);

      const user = await db.collection("users").findOne(
        { _id: userId },
        {
          projection: {
            username: 1,
            email: 1,
            avatarPath: 1,
            bio: 1,
            createdAt: 1,
          },
        }
      );

      if (!user) return res.status(404).json({ ok: false });

      const followerCount = await db
        .collection("follows")
        .countDocuments({ followeeId: userId });

      const followingCount = await db
        .collection("follows")
        .countDocuments({ followerId: userId });

      const posts = await db
        .collection("contents")
        .find({ authorId: userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        ok: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatarPath: user.avatarPath,
          bio: user.bio || "",
          createdAt: user.createdAt,
          followerCount,
          followingCount,
        },
        posts,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false });
    }
  });


  //  send DM 
  router.post(`/${STUDENT_ID}/messages`, requireLogin, async (req, res) => {
    try {
      const { toUserId, text } = req.body;
      if (!toUserId || !text || !text.trim()) {
        return res
          .status(400)
          .json({ ok: false, error: "Recipient and message required" });
      }

      const db = getDB();
      const me = new ObjectId(req.session.userId);
      const them = new ObjectId(toUserId);

      // check mutual follow
      const iFollow = await db.collection("follows").findOne({
        followerId: me,
        followeeId: them,
      });
      const theyFollow = await db.collection("follows").findOne({
        followerId: them,
        followeeId: me,
      });

      if (!iFollow || !theyFollow) {
        return res.status(403).json({
          ok: false,
          error: "You can only message users who follow you back.",
        });
      }

      const doc = {
        fromId: me,
        toId: them,
        text: text.trim(),
        createdAt: new Date(),
      };

      const result = await db.collection("messages").insertOne(doc);
      res.json({ ok: true, messageId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });

  router.get(`/${STUDENT_ID}/messages`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const me = new ObjectId(req.session.userId);
      const otherId = req.query.userId;

      if (!otherId) {
        return res.json({ ok: true, messages: [] });
      }

      const them = new ObjectId(otherId);

      const messages = await db
        .collection("messages")
        .find({
          $or: [
            { fromId: me, toId: them },
            { fromId: them, toId: me },
          ],
        })
        .sort({ createdAt: 1 })
        .toArray();

      res.json({ ok: true, messages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: "Server error" });
    }
  });


  // Create a society
  router.post(`/${STUDENT_ID}/societies`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const { name, description, branch } = req.body;

      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        return res
          .status(400)
          .json({ ok: false, error: "Society name is required." });
      }

      const ownerId = new ObjectId(req.session.userId);

      // get owner username
      const owner = await db.collection("users").findOne(
        { _id: ownerId },
        { projection: { username: 1 } }
      );

      const doc = {
        name: trimmedName,
        description: (description || "").trim(),
        branch: (branch || "").trim(),
        ownerId,
        ownerUsername: owner?.username || "Unknown",
        members: [ownerId],             
        createdAt: new Date(),
      };

      const result = await db.collection("societies").insertOne(doc);

      return res.json({
        ok: true,
        society: {
          ...doc,
          _id: result.insertedId,
        },
      });
    } catch (err) {
      console.error("create society error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while creating society." });
    }
  });

  // Get all societies 
  router.get(`/${STUDENT_ID}/societies`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const branch = (req.query.branch || "").trim();

      const match = branch ? { branch } : {};

      const societies = await db
        .collection("societies")
        .find(match)
        .sort({ createdAt: -1 })
        .toArray();

      const result = societies.map((s) => ({
        id: s._id,
        name: s.name,
        description: s.description || "",
        branch: s.branch || "",
        ownerId: s.ownerId,
        ownerUsername: s.ownerUsername || "Unknown",
        memberCount: (s.members || []).length,
        isMember: (s.members || []).some(
          (m) => m.toString() === userId.toString()
        ),
        isOwner: s.ownerId.toString() === userId.toString(),
      }));

      return res.json({ ok: true, societies: result });
    } catch (err) {
      console.error("list societies error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while loading societies." });
    }
  });

// Join a society
router.post(
  `/${STUDENT_ID}/societies/:id/join`,
  requireLogin,
  async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const rawId = req.params.id;

      let societyObjectId = null;
      try {
        societyObjectId = new ObjectId(rawId);
      } catch (e) {
        // ignore
      }

      const query = societyObjectId
        ? { $or: [{ _id: societyObjectId }, { _id: rawId }] }
        : { _id: rawId };

      const result = await db.collection("societies").findOneAndUpdate(
        query,
        { $addToSet: { members: userId } },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return res
          .status(404)
          .json({ ok: false, error: "Society not found." });
      }

      const count = (result.value.members || []).length;
      return res.json({ ok: true, memberCount: count });
    } catch (err) {
      console.error("join society error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while joining society." });
    }
  }
);



// Leave a society
router.delete(
  `/${STUDENT_ID}/societies/:id/join`,
  requireLogin,
  async (req, res) => {
    try {
      const db = getDB();
      const userId = new ObjectId(req.session.userId);
      const rawId = req.params.id;

      let societyObjectId = null;
      try {
        societyObjectId = new ObjectId(rawId);
      } catch (e) {
      }

      const query = societyObjectId
        ? { $or: [{ _id: societyObjectId }, { _id: rawId }] }
        : { _id: rawId };

      const result = await db.collection("societies").findOneAndUpdate(
        query,
        { $pull: { members: userId } },
        { returnDocument: "after" }
      );

      if (!result.value) {
        return res
          .status(404)
          .json({ ok: false, error: "Society not found." });
      }

      const count = (result.value.members || []).length;

      return res.json({ ok: true, memberCount: count });
    } catch (err) {
      console.error("leave society error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while leaving society." });
    }
  }
);


  // Societies owned by the current user and member usernames
  router.get(`/${STUDENT_ID}/my-societies`, requireLogin, async (req, res) => {
    try {
      const db = getDB();
      const ownerId = new ObjectId(req.session.userId);

      const societies = await db
        .collection("societies")
        .find({ ownerId })
        .sort({ createdAt: -1 })
        .toArray();

      const memberIds = [
        ...new Set(
          societies.flatMap((s) => (s.members || []).map((m) => m.toString()))
        ),
      ];

      let usernamesById = new Map();
      if (memberIds.length) {
        const users = await db
          .collection("users")
          .find({ _id: { $in: memberIds.map((id) => new ObjectId(id)) } })
          .project({ username: 1 })
          .toArray();

        usernamesById = new Map(
          users.map((u) => [u._id.toString(), u.username])
        );
      }

      const payload = societies.map((s) => ({
        id: s._id,
        name: s.name,
        members: (s.members || []).map(
          (m) => usernamesById.get(m.toString()) || "Unknown"
        ),
      }));

      return res.json({ ok: true, societies: payload });
    } catch (err) {
      console.error("my societies error:", err);
      return res
        .status(500)
        .json({ ok: false, error: "Server error while loading your societies." });
    }
  });


  router.get(`/${STUDENT_ID}/weather`, async (req, res) => {
    const branch = (req.query.branch || "main").toLowerCase();

    const coordsByBranch = {
      main: { lat: 51.5908, lon: -0.2299 },      // Hendon-ish
      london: { lat: 51.5074, lon: -0.1278 },
      city: { lat: 51.515, lon: -0.09 },
      north: { lat: 51.62, lon: -0.25 },
      dubai: { lat: 25.2048, lon: 55.2708 },
      mauritius: { lat: -20.256, lon: 57.479 },
    };

    const coords = coordsByBranch[branch] || coordsByBranch.main;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
      const response = await fetch(url);

      if (!response.ok) {
        // external API unhappy – just send a friendly fallback
        return res.json({
          ok: false,
          branch,
          summary: "Weather data currently unavailable.",
        });
      }

      const weather = await response.json();
      const current = weather.current_weather;

      const summary = current
        ? `Weather now: ${current.temperature}°C, wind ${current.windspeed} km/h`
        : "Weather data not available.";

      return res.json({ ok: true, summary, branch });
    } catch (err) {
      console.error("Weather route error:", err);
      return res.json({
        ok: false,
        branch,
        summary: "Weather data currently unavailable.",
      });
    }
  });

  return router;
};
