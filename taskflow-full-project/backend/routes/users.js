const express = require('express');
const router = express.Router();
const { dbPromise } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/users - search users (for adding to projects)
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let users = await dbPromise.find('users', {});
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    // Never return passwords
    const safe = users.map(({ password, ...u }) => u);
    res.json({ users: safe.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
