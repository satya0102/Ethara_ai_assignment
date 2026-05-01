const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbPromise } = require('../db');
const { auth, projectAccess } = require('../middleware/auth');

// GET /api/projects - list projects user is member of
router.get('/', auth, async (req, res) => {
  try {
    // Get all projects user is member of
    const memberships = await dbPromise.find('members', { userId: req.user._id });
    const projectIds = memberships.map(m => m.projectId);
    
    let projects = await dbPromise.find('projects', { _id: { $in: projectIds } });
    
    // Enrich with member counts and task counts
    const enriched = await Promise.all(projects.map(async (p) => {
      const memberCount = await dbPromise.count('members', { projectId: p._id });
      const taskCount = await dbPromise.count('tasks', { projectId: p._id });
      const completedCount = await dbPromise.count('tasks', { projectId: p._id, status: 'done' });
      const myRole = memberships.find(m => m.projectId === p._id)?.role;
      return { ...p, memberCount, taskCount, completedCount, myRole };
    }));

    res.json({ projects: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - create project (any authenticated user)
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, dueDate, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const project = await dbPromise.insert('projects', {
      _id: uuidv4(),
      name,
      description: description || '',
      dueDate: dueDate || null,
      color: color || '#6366f1',
      createdBy: req.user._id,
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    // Creator becomes admin of this project
    await dbPromise.insert('members', {
      _id: uuidv4(),
      projectId: project._id,
      userId: req.user._id,
      role: 'admin',
      joinedAt: new Date().toISOString()
    });

    res.status(201).json({ project: { ...project, myRole: 'admin', memberCount: 1, taskCount: 0, completedCount: 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', auth, projectAccess(), async (req, res) => {
  try {
    const project = await dbPromise.findOne('projects', { _id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const members = await dbPromise.find('members', { projectId: project._id });
    const userIds = members.map(m => m.userId);
    const users = await dbPromise.find('users', { _id: { $in: userIds } });
    
    const membersWithInfo = members.map(m => {
      const user = users.find(u => u._id === m.userId);
      return { ...m, user: user ? { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } : null };
    });

    res.json({ project, members: membersWithInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id - update project
router.put('/:id', auth, projectAccess(['admin']), async (req, res) => {
  try {
    const { name, description, dueDate, color, status } = req.body;
    const update = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (color) update.color = color;
    if (status) update.status = status;

    await dbPromise.update('projects', { _id: req.params.id }, { $set: update });
    const project = await dbPromise.findOne('projects', { _id: req.params.id });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, projectAccess(['admin']), async (req, res) => {
  try {
    await dbPromise.remove('projects', { _id: req.params.id });
    await dbPromise.remove('members', { projectId: req.params.id }, { multi: true });
    await dbPromise.remove('tasks', { projectId: req.params.id }, { multi: true });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/members - add member
router.post('/:projectId/members', auth, projectAccess(['admin']), async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await dbPromise.findOne('users', { email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

    const existing = await dbPromise.findOne('members', { projectId: req.params.projectId, userId: user._id });
    if (existing) return res.status(409).json({ error: 'User is already a member' });

    const member = await dbPromise.insert('members', {
      _id: uuidv4(),
      projectId: req.params.projectId,
      userId: user._id,
      role,
      joinedAt: new Date().toISOString()
    });

    res.status(201).json({ 
      member: { ...member, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/members/:userId - update member role
router.put('/:projectId/members/:userId', auth, projectAccess(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    await dbPromise.update('members', 
      { projectId: req.params.projectId, userId: req.params.userId }, 
      { $set: { role } }
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId/members/:userId - remove member
router.delete('/:projectId/members/:userId', auth, projectAccess(['admin']), async (req, res) => {
  try {
    await dbPromise.remove('members', { projectId: req.params.projectId, userId: req.params.userId });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
