========================================================
  TASKFLOW — Team Task Manager
  Full-Stack Web Application
========================================================

LIVE URL: [Your Railway URL after deployment]
GITHUB:   [Your GitHub Repository URL]

--------------------------------------------------------
DEMO CREDENTIALS
--------------------------------------------------------
Admin:   admin@demo.com  / demo123
Member:  jordan@demo.com / member123
Member:  sam@demo.com    / member123

--------------------------------------------------------
TECH STACK
--------------------------------------------------------
Backend:
  - Node.js + Express.js (REST API)
  - NeDB (embedded NoSQL database, file-based)
  - JWT (JSON Web Tokens) for authentication
  - bcryptjs for password hashing
  - CORS, dotenv, uuid

Frontend:
  - Vanilla HTML/CSS/JavaScript (Single Page App)
  - No framework dependencies — fast and lightweight
  - Responsive design (mobile + desktop)

Deployment:
  - Railway (backend + frontend served together)

--------------------------------------------------------
FEATURES IMPLEMENTED
--------------------------------------------------------

✅ AUTHENTICATION
  - User signup with name, email, password (hashed)
  - Login with JWT token (7-day expiry)
  - Protected routes via Bearer token middleware
  - Profile management (update name)

✅ ROLE-BASED ACCESS CONTROL (RBAC)
  - Global roles: admin, member
  - Project-level roles: admin, member
  - Project admins can: create/edit/delete project,
    add/remove members, change member roles
  - Members can: view project, create/update tasks,
    assign tasks to project members
  - Non-members cannot access project data

✅ PROJECT MANAGEMENT
  - Create, edit, delete projects
  - Project has: name, description, due date, color, status
  - Progress tracking (tasks done/total percentage)
  - Team management with role assignment

✅ TASK MANAGEMENT
  - Create, update, delete tasks
  - Task fields: title, description, status, priority,
    assigned user, due date
  - Kanban board view (To Do / In Progress / In Review / Done)
  - Task filtering by status
  - Assignee must be project member (validated)

✅ DASHBOARD
  - Summary stats: projects, my tasks, completed, overdue
  - Status breakdown chart
  - Overdue task alerts
  - Due-soon tasks (within 3 days)
  - Recent projects list

✅ VALIDATIONS
  - Required field validation
  - Email uniqueness check
  - Password minimum length
  - Assignee must be project member
  - Role validation (only 'admin' or 'member' accepted)
  - JWT validation on all protected routes

--------------------------------------------------------
PROJECT STRUCTURE
--------------------------------------------------------

taskflow/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js              # NeDB database + promise helpers
│   ├── seed.js            # Demo data seeder
│   ├── middleware/
│   │   └── auth.js        # JWT auth + project access middleware
│   ├── routes/
│   │   ├── auth.js        # /api/auth (signup, login, me, profile)
│   │   ├── projects.js    # /api/projects (CRUD + member management)
│   │   ├── tasks.js       # /api/tasks (CRUD + filtering)
│   │   ├── users.js       # /api/users (search)
│   │   └── dashboard.js   # /api/dashboard (stats)
│   └── package.json
├── frontend/
│   └── index.html         # Complete SPA (HTML + CSS + JS)
├── data/                  # Database files (auto-created)
├── Procfile               # Railway start command
├── railway.toml           # Railway config
└── .env.example

--------------------------------------------------------
REST API ENDPOINTS
--------------------------------------------------------

AUTH:
  POST /api/auth/signup       Create account
  POST /api/auth/login        Login → returns JWT
  GET  /api/auth/me           Get current user (auth)
  PUT  /api/auth/profile      Update profile (auth)

PROJECTS:
  GET    /api/projects          List my projects (auth)
  POST   /api/projects          Create project (auth)
  GET    /api/projects/:id      Get project + members (auth, member)
  PUT    /api/projects/:id      Update project (auth, admin)
  DELETE /api/projects/:id      Delete project (auth, admin)
  POST   /api/projects/:id/members          Add member (auth, admin)
  PUT    /api/projects/:id/members/:userId  Update role (auth, admin)
  DELETE /api/projects/:id/members/:userId  Remove member (auth, admin)

TASKS:
  GET    /api/tasks             List tasks (auth, with filters)
  POST   /api/tasks             Create task (auth, member)
  GET    /api/tasks/:id         Get task (auth, member)
  PUT    /api/tasks/:id         Update task (auth, member)
  DELETE /api/tasks/:id         Delete task (auth, creator/admin)

USERS:
  GET    /api/users             Search users (auth)

DASHBOARD:
  GET    /api/dashboard         Get stats (auth)

Query Parameters for /api/tasks:
  ?projectId=   Filter by project
  ?assignedTo=  Filter by assignee
  ?status=      Filter by status (todo/inprogress/review/done)
  ?priority=    Filter by priority (low/medium/high)

--------------------------------------------------------
DEPLOYMENT ON RAILWAY
--------------------------------------------------------

1. Push code to GitHub repository

2. Go to railway.app → New Project → Deploy from GitHub
   - Select your repository
   - Railway auto-detects Node.js

3. Set Environment Variables in Railway:
   JWT_SECRET=your-random-secret-here
   NODE_ENV=production
   DB_PATH=/app/data

4. Add a Volume (for persistent database):
   - Mount path: /app/data
   - This preserves the NeDB database files

5. After deploy, run seed (optional, for demo data):
   - Open Railway console
   - cd backend && node seed.js

6. Your app will be live at the generated Railway URL

NOTE: Without a volume, database resets on redeploy.
For production use, add a PostgreSQL or MongoDB service.

--------------------------------------------------------
LOCAL DEVELOPMENT
--------------------------------------------------------

1. Clone the repo
2. cd backend && npm install
3. cp ../.env.example .env (edit JWT_SECRET)
4. node seed.js   (optional: add demo data)
5. node server.js
6. Open http://localhost:3000

--------------------------------------------------------
DESIGN DECISIONS
--------------------------------------------------------

1. NeDB chosen for zero-dependency embedded database
   that works without external services — ideal for
   Railway deployment without a separate DB service.
   For production scale, swap to PostgreSQL easily.

2. Single frontend HTML file — no build step required,
   fast to deploy, works immediately on any static host.

3. JWT stored in localStorage (simple, works cross-tab).
   For higher security, use httpOnly cookies.

4. Project-level RBAC: each project has its own admin/
   member roles, separate from global account roles.

5. Kanban board is read-only (no drag-drop) for
   simplicity, but tasks update via click.

========================================================
