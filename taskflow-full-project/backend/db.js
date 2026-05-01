const Datastore = require('nedb');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data');

const db = {
  users: new Datastore({ filename: path.join(dbPath, 'users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(dbPath, 'projects.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(dbPath, 'tasks.db'), autoload: true }),
  members: new Datastore({ filename: path.join(dbPath, 'members.db'), autoload: true }),
};

// Create indexes
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.members.ensureIndex({ fieldName: 'projectId' });
db.tasks.ensureIndex({ fieldName: 'projectId' });

// Promisify helpers
const dbPromise = {
  find: (collection, query) => new Promise((res, rej) => 
    db[collection].find(query, (err, docs) => err ? rej(err) : res(docs))),
  findOne: (collection, query) => new Promise((res, rej) => 
    db[collection].findOne(query, (err, doc) => err ? rej(err) : res(doc))),
  insert: (collection, doc) => new Promise((res, rej) => 
    db[collection].insert(doc, (err, newDoc) => err ? rej(err) : res(newDoc))),
  update: (collection, query, update, options = {}) => new Promise((res, rej) => 
    db[collection].update(query, update, options, (err, n) => err ? rej(err) : res(n))),
  remove: (collection, query, options = {}) => new Promise((res, rej) => 
    db[collection].remove(query, options, (err, n) => err ? rej(err) : res(n))),
  count: (collection, query) => new Promise((res, rej) => 
    db[collection].count(query, (err, n) => err ? rej(err) : res(n))),
};

module.exports = { db, dbPromise };
