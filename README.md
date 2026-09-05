# EduHub

A clean, modern online education library. Upload, browse and search study notes, PDFs, books, slides, quizzes and past papers — with likes, comments, view/download tracking and a dedicated admin area.

## Features

- **Library**: browse resources by category, full-text search, copy links
- **Content types**: uploaded files (notes, PDFs, books, slides, past papers), links, and interactive quizzes
- **Engagement**: views, downloads, likes, comments
- **Authentication**: email/password with bcrypt-hashed passwords and stateless JWT sessions
- **Admin panel**: dashboard stats, resource management, category CRUD, comment moderation, user role management
- **Security**: role-based authorization, API + auth rate limiting, validated inputs, safe file uploads, tamper-resistant JWT secrets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js](https://nextjs.org/) 14 (App Router), React 18, TypeScript |
| Backend | Node.js + [Express](https://expressjs.com/) 4 |
| Database | MySQL / MariaDB (utf8mb4) |
| Auth | JWT (Bearer), bcryptjs |
| Uploads | Multer (50 MB cap) |
| Styling | Plain CSS + Tailwind-ready setup, Lucide icons |

## Architecture

```
Browser (Next.js :3000)
   │  /api/backend/*  ──server-side rewrite──▶  Express API (:4000)
   │                                               │
   │  /uploads/*  (files, served directly) ────────┤
   └── JWT stored in localStorage, sent as Bearer   │
                                                    ▼
                                            MySQL / MariaDB (eduhub)
```

- The Next.js app proxies `/api/backend/*` to the Express API, so the browser only ever talks to one origin.
- Uploaded files are written to `backend/uploads/` and served at `/uploads/*`.
- Auth is stateless: a signed JWT is stored in `localStorage` and sent via the `Authorization` header.

## Project Structure

```
eduhub/
├── backend/                # Express REST API
│   ├── src/
│   │   ├── server.js       # App entry, middleware, routing
│   │   ├── db.js           # MySQL connection pool
│   │   ├── controllers/    # Route handlers (auth, resources, categories, admin)
│   │   ├── routes/         # Express routers
│   │   ├── middleware/     # auth guard, multer upload
│   │   └── utils/          # JWT, quiz validation
│   ├── scripts/
│   │   └── setup.js        # `npm run db:setup` — creates DB, tables, admin
│   ├── uploads/            # Uploaded files (gitignored, runtime only)
│   ├── .env.example        # Template for backend/.env
│   └── package.json
├── database/
│   ├── schema.sql          # Drops & recreates DB + tables
│   └── seed.sql            # Seeds the 8 default categories
└── frontend/               # Next.js 14 App Router
    ├── src/
    │   ├── app/            # Pages & layouts (/, /categories, /category/[key],
    │   │                   #   /resource/[id], /quiz/[id], /login, /signup, /account, /admin/*)
    │   ├── components/     # UI components (ResourceCard, viewer, feedback)
    │   ├── lib/            # API client, auth, hooks, toast, format utils
    │   ├── store/          # Client state
    │   └── types/          # Shared TypeScript types
    ├── .env.example        # Template for frontend/.env.local
    └── package.json
```

## Prerequisites

- **Node.js** 18.17+ (tested with Node 22)
- **MySQL** or **MariaDB** (e.g. via XAMPP) running on `localhost:3306`
- npm

## Local Setup

### 1. Install dependencies

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

Copy the templates and fill in real values — **every credential lives only in these files, which are gitignored**.

```bash
# backend
cd backend
copy .env.example .env      # then edit .env

# frontend
cd ../frontend
copy .env.example .env.local
```

### 3. Set up the database

Make sure MySQL is running, then from the `backend/` directory:

```bash
npm run db:setup
```

This script:
1. Drops and recreates the `eduhub` database,
2. Applies `database/schema.sql` (users, categories, resources, likes, comments),
3. Seeds the 8 default categories from `database/seed.sql`,
4. Creates the admin user from `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`, hashing the password with bcrypt at runtime (never stored in plain text and never hardcoded).

> The default admin email is `admin@eduhub.local`. **Always set a strong `ADMIN_PASSWORD`** in `.env` before running setup — the script refuses placeholder passwords.

### 4. Run

Two terminals:

```bash
# terminal 1 — API (http://localhost:4000)
cd backend
npm run dev

# terminal 2 — frontend (http://localhost:3000)
cd frontend
npm run dev
```

Open http://localhost:3000, log in as admin (the email/password from `.env`), and start adding resources.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | | `4000` | API port |
| `NODE_ENV` | | `development` | `production` hides internal error details and enforces a real JWT secret |
| `CLIENT_ORIGIN` | | `http://localhost:3000` | Frontend origin(s) allowed by CORS (comma-separated) |
| `DB_HOST` / `DB_PORT` | | `localhost` / `3306` | MySQL host / port |
| `DB_USER` / `DB_PASSWORD` | | `root` / empty | MySQL credentials |
| `DB_NAME` | | `eduhub` | Database name |
| `JWT_SECRET` | **required in production** | fallback (dev warning) | Long random string used to sign JWTs; the app refuses to start with the known fallback in production |
| `JWT_EXPIRES_IN` | | `7d` | Token lifetime (`jsonwebtoken` syntax) |
| `ADMIN_NAME` | | `Admin` | Admin account name (used by `db:setup`) |
| `ADMIN_EMAIL` | | `admin@eduhub.local` | Admin account email |
| `ADMIN_PASSWORD` | **required by `db:setup`** | none | Admin password (bcrypt-hashed at setup time) |
| `UPLOAD_DIR` | | `uploads` | Directory for uploaded files (relative to `backend/`) |
| `UPLOAD_BASE_URL` | prod | `http://localhost:4000/uploads` | Public URL prefix used for file links in API responses |
| `MAX_FILE_BYTES` | | `52428800` | Upload size cap in bytes (50 MB) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend origin used by the server-side `/api/backend/*` rewrite |
| `NEXT_PUBLIC_API_BASE` | `/api/backend` | Client-side API base path |

These are non-secret, public build-time values.

## Useful Scripts

| Where | Command | Purpose |
|-------|---------|---------|
| `backend` | `npm start` | Run the API |
| `backend` | `npm run dev` | Run the API with auto-reload |
| `backend` | `npm run db:setup` | Create/reset DB + tables + categories + admin |
| `frontend` | `npm run dev` | Run Next.js in development |
| `frontend` | `npm run build` | Production build (`tsc`-checked) |
| `frontend` | `npm run start` | Serve the production build |
| `frontend` | `npm run lint` | Run ESLint |

## API Overview

Base URL: `http://localhost:4000/api` (via frontend proxy at `/api/backend/*`).

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/register` | public | Register a user |
| POST | `/auth/login` | public | Login, returns JWT |
| GET | `/auth/me` | auth | Current user |
| POST | `/auth/change-password` | auth | Change own password |
| GET | `/categories` | public | Categories + resource counts |
| GET | `/resources` | public | List resources (`?category=` `?q=`) |
| GET | `/resources/:id` | public | Resource detail |
| POST | `/resources` / `/resources/upload` / `/resources/quiz` | admin | Create link / file / quiz |
| PUT / DELETE | `/resources/:id` | admin | Update / delete a resource |
| POST | `/resources/:id/view` `/resources/:id/download` | public | Increment counters |
| GET | `/resources/:id/download` | public | Stream the file |
| POST | `/resources/:id/like` | auth | Toggle like |
| GET/POST | `/resources/:id/comments` | public / auth | List / add comments |
| DELETE | `/resources/comments/:commentId` | admin or owner | Delete a comment |
| GET | `/admin/stats` `/admin/users` `/admin/comments` | admin | Dashboard data |
| PATCH/DELETE | `/admin/users/:id` | admin | Change role / delete user |
| POST/PATCH/DELETE | `/admin/categories` `/admin/categories/:id` | admin | Category management |

## Deployment Notes

1. **Build the frontend once**: `npm run build` then serve with `npm run start` (or deploy the `.next` output to Vercel, a Node PaaS, or behind a reverse proxy).
2. **Never ship `.env` or `.env.local`** — use `backend/.env.example` and `frontend/.env.example` as the templates for each environment.
3. **Production variables**:
   - `NODE_ENV=production`
   - `JWT_SECRET` — a long, random string (e.g. `openssl rand -hex 32`). The API refuses to boot with the known fallback when `NODE_ENV=production`.
   - `CLIENT_ORIGIN` — your public frontend origin(s).
   - `UPLOAD_BASE_URL` — the public HTTPS URL where uploaded files are reached.
   - `ADMIN_PASSWORD` — a strong, unique value; run `npm run db:setup` on the production DB once.
4. **Database**: run `npm run db:setup` against the production MySQL instance, then back up the DB and the `uploads/` directory together — they are tightly coupled.
5. **Files / reverse proxy**: place the API (and `uploads/`) behind HTTPS. On a single host you can serve both apps with a reverse proxy (e.g. Nginx) routing `/` to Next.js and `/uploads` + `/api` to Express.
6. **Uploads persistence**: on horizontally-scaled setups, mount `uploads/` on shared/object storage — the DB stores only file *names*, so the files must be reachable at `UPLOAD_BASE_URL`.

## Security

- Passwords are hashed with bcrypt (10 rounds); the hash is never returned by the API.
- JWTs are validated on every protected route; normal users can never reach admin endpoints.
- `express-rate-limit` protects the whole API, with a stricter limiter on auth routes.
- File uploads reject web-executable types (HTML/SVG/JS and friends) and enforce a size cap; uploads are served with `X-Content-Type-Options: nosniff`.
- SQL queries are fully parameterized; quiz/question payloads are validated before storage.
- In production, internal error details are never leaked to clients.

## License

Private / internal project — no license specified.