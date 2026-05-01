const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { dbPromise } = require('../db');
const { auth, projectAccess } = require('../middleware/auth');

// GET /api/tasks - get tasks (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { projectId, assignedTo, status, priority } = req.query;
    
    // Only return tasks from projects user is member of
    const memberships = await dbPromise.find('members', { userId: req.user._id });
    const projectIds = memberships.map(m => m.projectId);

    const query = { projectId: { $in: projectIds } };
    if (projectId) query.projectId = projectId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await dbPromise.find('tasks', query);
    
    // Enrich with assignee info
    const userIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))];
    const users = userIds.length ? await dbPromise.find('users', { _id: { $in: userIds } }) : [];
    
    const enriched = tasks.map(t => ({
      ...t,
      assignee: t.assignedTo ? users.find(u => u._id === t.assignedTo) : null
    })).map(({ assignee, ...t }) => ({
      ...t,
      assignee: assignee ? { _id: assignee._id, name: assignee.name, avatar: assignee.avatar } : null
    }));

    // Sort by dueDate then createdAt
    enriched.sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ tasks: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks - create task
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, title, description, assignedTo, dueDate, priority, status } = req.body;
    if (!projectId || !title) return res.status(400).json({ error: 'ProjectId and title required' });

    // Check user is project member
    const member = await dbPromise.findOne('members', { projectId, userId: req.user._id });
    if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Not a project member' });

    // Validate assignee is also a member
    if (assignedTo) {
      const assigneeMember = await dbPromise.findOne('members', { projectId, userId: assignedTo });
      if (!assigneeMember) return res.status(400).json({ error: 'Assignee is not a project member' });
    }

    const task = await dbPromise.insert('tasks', {
      _id: uuidv4(),
      projectId,
      title,
      description: description || '',
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      priority: priority || 'medium',
      status: status || 'todo',
      createdBy: req.user._id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Enrich
    let assignee = null;
    if (task.assignedTo) {
      const u = await dbPromise.findOne('users', { _id: task.assignedTo });
      if (u) assignee = { _id: u._id, name: u.name, avatar: u.avatar };
    }
    res.status(201).json({ task: { ...task, assignee } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await dbPromise.findOne('tasks', { _id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Verify user is project member
    const member = await dbPromise.findOne('members', { projectId: task.projectId, userId: req.user._id });
    if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

    let assignee = null;
    if (task.assignedTo) {
      const u = await dbPromise.findOne('users', { _id: task.assignedTo });
      if (u) assignee = { _id: u._id, name: u.name, avatar: u.avatar };
    }
    res.json({ task: { ...task, assignee } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await dbPromise.findOne('tasks', { _id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check membership
    const member = await dbPromise.findOne('members', { projectId: task.projectId, userId: req.user._id });
    if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

    const { title, description, assignedTo, dueDate, priority, status } = req.body;
    const update = { updatedAt: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (priority !== undefined) update.priority = priority;
    if (status !== undefined) update.status = status;

    await dbPromise.update('tasks', { _id: req.params.id }, { $set: update });
    const updated = await dbPromise.findOne('tasks', { _id: req.params.id });
    
    let assignee = null;
    if (updated.assignedTo) {
      const u = await dbPromise.findOne('users', { _id: updated.assignedTo });
      if (u) assignee = { _id: u._id, name: u.name, avatar: u.avatar };
    }
    res.json({ task: { ...updated, assignee } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await dbPromise.findOne('tasks', { _id: req.params.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const member = await dbPromise.findOne('members', { projectId: task.projectId, userId: req.user._id });
    if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

    // Only task creator or project admin can delete
    if (task.createdBy !== req.user._id && member?.role !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only task creator or project admin can delete tasks' });
    }

    await dbPromise.remove('tasks', { _id: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
