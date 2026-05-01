const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbPromise } = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await dbPromise.findOne('users', { email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await dbPromise.insert('users', {
      _id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'member', // global role
      avatar: name.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = user;
    res.status(201).json({ user: userSafe, token });
  } catch (err) {
    if (err.errorType === 'uniqueViolated') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await dbPromise.findOne('users', { email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { password, ...user } = req.user;
  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    await dbPromise.update('users', { _id: req.user._id }, { $set: { name, avatar: name.charAt(0).toUpperCase() } });
    const updated = await dbPromise.findOne('users', { _id: req.user._id });
    const { password, ...userSafe } = updated;
    res.json({ user: userSafe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
