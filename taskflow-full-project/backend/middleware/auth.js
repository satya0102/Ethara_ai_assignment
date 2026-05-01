const jwt = require('jsonwebtoken');
const { dbPromise } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbPromise.findOne('users', { _id: decoded._id });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check project membership or admin
const projectAccess = (roles = []) => async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId || req.params.id;
    
    // Global admins bypass
    if (req.user.role === 'admin') return next();

    const member = await dbPromise.findOne('members', { 
      projectId, 
      userId: req.user._id 
    });

    if (!member) return res.status(403).json({ error: 'Access denied' });
    if (roles.length && !roles.includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.projectMember = member;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { auth, projectAccess, JWT_SECRET };
