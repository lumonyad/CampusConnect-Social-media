const express = require('express');
const bcrypt = require('bcrypt');
const { getDB } = require('../db/mongo');
const { ObjectId } = require('mongodb');

module.exports = function (STUDENT_ID) {
  const router = express.Router();

  router.get(`/${STUDENT_ID}/login`, (req, res) => {
    if (!req.session.userId) {
      return res.json({ loggedIn: false });
    }

    return res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  });


  router.post(`/${STUDENT_ID}/login`, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }

      const db = getDB();
      const user = await db.collection('users').findOne({ email });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set session
      req.session.userId = user._id.toString();
      req.session.username = user.username;

      return res.json({
        ok: true,
        user: {
          id: user._id,
          username: user.username
        }
      });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /M00XXXXX/login → logout
  router.delete(`/${STUDENT_ID}/login`, (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  return router;
};
