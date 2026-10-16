# CampusFix

CampusFix is a React + Express campus lost-and-found application. Lost reports may be public or private; found reports are always private and are never included in the community feed. Active lost/found reports are internally compared by a deterministic matching engine to produce potential leads, not proof of ownership.

## What is implemented

- JWT registration, login, and profile access with exact NIT Warangal email-domain validation for new public accounts
- Lost-report creation, public listing, private option, updates, archive, and deletion
- Private-by-default found reports with owner/admin-only detail and management access
- Server-validated JPEG/PNG/WebP uploads (5 MB maximum) through Multer and Cloudinary
- Natural NLP normalization, Porter stemming, Jaro-Winkler comparison, and genuine 64-bit DCT perceptual image hashes
- Persisted, idempotent lost/found match records and a simple dashboard view of a user's potential matches
- Database-backed administrator blocking with held-report moderation, private-report review, and a protected `/admin` dashboard
- Per-request database authorization, Helmet headers, API rate limits, and configurable CORS

Notifications and secure chat are intentionally not implemented yet; the matching service exposes a no-side-effect event boundary for that next step.

## Setup

Requirements: Node.js 18+ and a MongoDB deployment. Create `backend/.env` (this file is not committed):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campusfix_dev
JWT_SECRET=use_a_long_random_secret
CLIENT_ORIGIN=http://localhost:5173
ADMIN_BOOTSTRAP_EMAIL=campus-admin@example.edu
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Cloudinary values are available in the Cloudinary Console under **Dashboard → Product Environment Credentials**. All three Cloudinary variables are required only for image uploads; reports without an image continue to work. An attempted image upload without them returns HTTP 503 with an actionable error.

Create `src/.env` from `src/.env.example` when the frontend should call a non-default API URL. It contains only `VITE_API_BASE_URL`; never add backend credentials to it. `CLIENT_ORIGIN` may be a comma-separated list and is mandatory in production.

Install and run in two terminals:

```bash
cd backend
npm install
npm start
```

```bash
cd src
npm install
npm run dev
```

The API runs on `http://localhost:5000`; Vite will print the frontend URL (normally `http://localhost:5173`).

## Administrator bootstrap and blocking

Public registration always creates an ordinary user. To promote the first administrator, first register the intended account, then set `ADMIN_BOOTSTRAP_EMAIL` in `backend/.env` to that exact email and run:

```bash
cd backend
npm run seed:admin
```

The seed script requires `MONGO_URI`, refuses missing accounts and blocked accounts, and is never run by the server. The provisioned administrator uses the ordinary Login page and is sent to `/admin`.

## NITW registration emails

New public accounts must use an exact NIT Warangal address: `name@student.nitw.ac.in` for students or `name@nitw.ac.in` for faculty/staff. Registration normalizes surrounding whitespace and casing, then validates the complete address against those two exact domains. Gmail, lookalike, and subdomain addresses are rejected.

Faculty/staff email addresses always create ordinary user accounts. They do not confer administrator access; administrators are promoted only through the controlled seed process. Existing accounts and administrator logins continue to work even if their historical email does not match the new registration rule.

Blocking is enforced server-side on every authenticated request. A blocked user cannot use protected report operations and their active reports are held for administrator review, excluded from the public feed and matching, and left unpublished after unblocking until an admin releases or archives them. The repository does not yet contain chat, message, or notification APIs, so no fake blocking endpoints were added for those future modules.

## API highlights

- `POST /api/items/lost` and `POST /api/items/found` accept multipart form data with optional `image`.
- `GET /api/items/lost?page=1&limit=20&category=&search=` returns only public, active lost reports and pagination metadata.
- `GET /api/items/my-items`, `GET /api/items/my-matches`, `GET /api/items/:id`, `PUT /api/items/:id`, `PATCH /api/items/:id/archive`, and `DELETE /api/items/:id` require a bearer token.
- `GET /api/admin/users`, `PATCH /api/admin/users/:id/block`, `PATCH /api/admin/users/:id/unblock`, `GET /api/admin/items`, and `PATCH /api/admin/items/:id/moderation` require a bearer token for a database-authorized administrator.

Found report visibility is backend-controlled. A crafted `visibility`, `type`, `user`, or `imageHash` request field is rejected rather than accepted from the client.

## Verification

```bash
cd backend && npm test
cd src && npm run lint && npm run build
```

The backend tests cover normalization/stemming, typo tolerance, uploads, ownership, real in-memory-MongoDB block/unblock authorization, held-report moderation, private-report confidentiality, and registration privilege-escalation rejection. They do not claim a real Cloudinary upload or hosted MongoDB test; configure those services for that integration check.

Read [the matching design](docs/MATCHING.md) and [API documentation](docs/API.md) for matching, moderation, and endpoint details.
