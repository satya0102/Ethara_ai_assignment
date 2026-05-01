const express = require('express');
const router = express.Router();
const { dbPromise } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/dashboard - dashboard stats
router.get('/', auth, async (req, res) => {
  try {
    const memberships = await dbPromise.find('members', { userId: req.user._id });
    const projectIds = memberships.map(m => m.projectId);

    const now = new Date();
    const tasks = await dbPromise.find('tasks', { projectId: { $in: projectIds } });
    const projects = await dbPromise.find('projects', { _id: { $in: projectIds } });

    const myTasks = tasks.filter(t => t.assignedTo === req.user._id);
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );
    const dueSoonTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      const diff = (due - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    });

    // Enrich overdue and due soon with project info
    const enrichTask = async (t) => {
      const project = projects.find(p => p._id === t.projectId);
      let assignee = null;
      if (t.assignedTo) {
        const u = await dbPromise.findOne('users', { _id: t.assignedTo });
        if (u) assignee = { _id: u._id, name: u.name, avatar: u.avatar };
      }
      return { ...t, project: project ? { _id: project._id, name: project.name, color: project.color } : null, assignee };
    };

    const [overdueEnriched, dueSoonEnriched, myTasksEnriched] = await Promise.all([
      Promise.all(overdueTasks.slice(0, 10).map(enrichTask)),
      Promise.all(dueSoonTasks.slice(0, 10).map(enrichTask)),
      Promise.all(myTasks.slice(0, 10).map(enrichTask))
    ]);

    // Status breakdown
    const statusCounts = {
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    };

    res.json({
      stats: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        myTasks: myTasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        overdueTasks: overdueTasks.length,
        dueSoonTasks: dueSoonTasks.length,
      },
      statusCounts,
      overdueTasks: overdueEnriched,
      dueSoonTasks: dueSoonEnriched,
      myTasks: myTasksEnriched,
      recentProjects: projects
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
