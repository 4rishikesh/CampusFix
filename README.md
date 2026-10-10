# CampusFix

CampusFix is a React + Express campus lost-and-found application. Lost reports may be public or private; found reports are always private and are never included in the community feed. Active lost/found reports are internally compared by a deterministic matching engine to produce potential leads, not proof of ownership.

## What is implemented

- JWT registration, login, and profile access
- Lost-report creation, public listing, private option, updates, archive, and deletion
- Private-by-default found reports with owner/admin-only detail and management access
- Server-validated JPEG/PNG/WebP uploads (5 MB maximum) through Multer and Cloudinary
- Natural NLP normalization, Porter stemming, Jaro-Winkler comparison, and genuine 64-bit DCT perceptual image hashes
- Persisted, idempotent lost/found match records and a simple dashboard view of a user's potential matches

Notifications and secure chat are intentionally not implemented yet; the matching service exposes a no-side-effect event boundary for that next step.

## Setup

Requirements: Node.js 18+ and a MongoDB deployment. Create `backend/.env` (this file is not committed):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campusfix_dev
JWT_SECRET=use_a_long_random_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Cloudinary values are available in the Cloudinary Console under **Dashboard → Product Environment Credentials**. All three Cloudinary variables are required only for image uploads; reports without an image continue to work. An attempted image upload without them returns HTTP 503 with an actionable error.

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

## API highlights

- `POST /api/items/lost` and `POST /api/items/found` accept multipart form data with optional `image`.
- `GET /api/items/lost?page=1&limit=20&category=&search=` returns only public, active lost reports and pagination metadata.
- `GET /api/items/my-items`, `GET /api/items/my-matches`, `GET /api/items/:id`, `PUT /api/items/:id`, `PATCH /api/items/:id/archive`, and `DELETE /api/items/:id` require a bearer token.

Found report visibility is backend-controlled. A crafted `visibility`, `type`, `user`, or `imageHash` request field is rejected rather than accepted from the client.

## Verification

```bash
cd backend && npm test
cd src && npm run build
```

The backend tests cover normalization/stemming, typo tolerance, unrelated and misleading visual matches, valid 64-bit hashes, score bounds, opposite active-pair filtering, mock-persistence deduplication, input rejection, and ownership checks. They do not claim a real Cloudinary upload or hosted MongoDB test; configure those services for that integration check.

Read [the matching design](docs/MATCHING.md) for formulae, thresholds, privacy behavior, limits, and the next integration plan.
