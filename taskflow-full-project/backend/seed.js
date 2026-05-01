// Run: node seed.js
// Seeds demo admin user and sample data

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Datastore = require('nedb');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data');
require('fs').mkdirSync(dbPath, { recursive: true });

const db = {
  users: new Datastore({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(dbPath, 'projects.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(dbPath, 'tasks.db'), autoload: true }),
  members: new Datastore({ filename: path.join(dbPath, 'members.db'), autoload: true }),
};

async function seed() {
  const insert = (col, doc) => new Promise((res,rej) => db[col].insert(doc, (e,d) => e?rej(e):res(d)));
  const remove = (col, q) => new Promise((res,rej) => db[col].remove(q,{multi:true},(e,n) => e?rej(e):res(n)));

  console.log('Clearing existing data...');
  await Promise.all(['users','projects','tasks','members'].map(c => remove(c,{})));

  console.log('Creating demo users...');
  const adminHash = await bcrypt.hash('demo123', 10);
  const memberHash = await bcrypt.hash('member123', 10);

  const admin = await insert('users', {
    _id: uuidv4(), name: 'Alex Admin', email: 'admin@demo.com',
    password: adminHash, role: 'admin', avatar: 'A',
    createdAt: new Date().toISOString()
  });
  const member1 = await insert('users', {
    _id: uuidv4(), name: 'Jordan Developer', email: 'jordan@demo.com',
    password: memberHash, role: 'member', avatar: 'J',
    createdAt: new Date().toISOString()
  });
  const member2 = await insert('users', {
    _id: uuidv4(), name: 'Sam Designer', email: 'sam@demo.com',
    password: memberHash, role: 'member', avatar: 'S',
    createdAt: new Date().toISOString()
  });

  console.log('Creating projects...');
  const proj1 = await insert('projects', {
    _id: uuidv4(), name: 'Product Redesign', description: 'Complete UI/UX overhaul of the main product',
    color: '#7c5cfc', createdBy: admin._id, status: 'active',
    dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });
  const proj2 = await insert('projects', {
    _id: uuidv4(), name: 'Backend API v2', description: 'REST API rewrite with improved performance',
    color: '#3b82f6', createdBy: admin._id, status: 'active',
    dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });

  console.log('Adding members...');
  const addMember = (projectId, userId, role) => insert('members', { _id: uuidv4(), projectId, userId, role, joinedAt: new Date().toISOString() });
  await addMember(proj1._id, admin._id, 'admin');
  await addMember(proj1._id, member1._id, 'member');
  await addMember(proj1._id, member2._id, 'admin');
  await addMember(proj2._id, admin._id, 'admin');
  await addMember(proj2._id, member1._id, 'admin');

  console.log('Creating tasks...');
  const now = new Date();
  const yesterday = new Date(now - 24*60*60*1000).toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 2*24*60*60*1000).toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 7*24*60*60*1000).toISOString().split('T')[0];

  const tasks = [
    { projectId: proj1._id, title: 'Design system audit', status: 'done', priority: 'high', assignedTo: member2._id, dueDate: yesterday, description: 'Document all existing UI components' },
    { projectId: proj1._id, title: 'Create wireframes for dashboard', status: 'inprogress', priority: 'high', assignedTo: member2._id, dueDate: tomorrow, description: 'Low-fidelity wireframes for new dashboard layout' },
    { projectId: proj1._id, title: 'User research interviews', status: 'done', priority: 'medium', assignedTo: admin._id, dueDate: yesterday, description: '5 user interviews to validate designs' },
    { projectId: proj1._id, title: 'High-fidelity mockups', status: 'todo', priority: 'high', assignedTo: member2._id, dueDate: nextWeek, description: '' },
    { projectId: proj1._id, title: 'Implement design tokens', status: 'inprogress', priority: 'medium', assignedTo: member1._id, dueDate: tomorrow, description: 'CSS custom properties for colors, spacing, typography' },
    { projectId: proj1._id, title: 'Accessibility review', status: 'todo', priority: 'medium', assignedTo: null, dueDate: nextWeek, description: '' },
    { projectId: proj1._id, title: 'OVERDUE: Competitive analysis', status: 'todo', priority: 'low', assignedTo: member1._id, dueDate: yesterday, description: 'Look at 5 competitor products' },
    { projectId: proj2._id, title: 'Auth service refactor', status: 'inprogress', priority: 'high', assignedTo: member1._id, dueDate: tomorrow, description: 'JWT-based auth with refresh tokens' },
    { projectId: proj2._id, title: 'Database schema migration', status: 'review', priority: 'high', assignedTo: admin._id, dueDate: tomorrow, description: 'Migrate from v1 schema' },
    { projectId: proj2._id, title: 'API documentation', status: 'todo', priority: 'medium', assignedTo: member1._id, dueDate: nextWeek, description: 'OpenAPI/Swagger docs' },
    { projectId: proj2._id, title: 'Rate limiting middleware', status: 'done', priority: 'medium', assignedTo: admin._id, dueDate: yesterday, description: '' },
    { projectId: proj2._id, title: 'OVERDUE: Load testing', status: 'todo', priority: 'high', assignedTo: member1._id, dueDate: yesterday, description: 'Simulate 10k concurrent users' },
  ];

  for (const t of tasks) {
    await insert('tasks', { _id: uuidv4(), ...t, createdBy: admin._id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  console.log('\n✅ Seed complete!');
  console.log('Demo accounts:');
  console.log('  Admin:  admin@demo.com / demo123');
  console.log('  Member: jordan@demo.com / member123');
  console.log('  Member: sam@demo.com / member123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
