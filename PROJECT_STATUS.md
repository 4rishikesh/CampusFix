# CampusFix - Project Status

## Completed Features (Weeks 1–3 plus administration)
- Initialized Backend (Node.js, Express, Mongoose).
- Setup User & Item models with dual date support (`dateLost`, `dateFound`).
- JWT Authentication (Register, Login, Profile).
- **NIT Warangal registration policy** (new public accounts require exact `@student.nitw.ac.in` or `@nitw.ac.in` addresses; faculty addresses remain ordinary users and existing administrator login is unchanged).
- Lost Item Module API (Report, Read, Update, Delete).
- Initialized Frontend (React, Vite, Tailwind CSS setup).
- **Found Item Module** (Private by default, hidden from public feed, strict backend ownership and visibility checks).
- **Image Upload Integration** (Multer memory buffer to Cloudinary direct upload integration, JPEG/PNG/WebP validation, 5 MB limit, and server-side image cleanup on replacement/deletion).
- **Validation and access control** (server-side field validation, private found-item detail protection, owner/admin management checks, archive route, and paginated public feed).
- **Automatic matching engine** (Natural token processing, stemming, Jaro-Winkler field comparison, genuine server-generated 64-bit perceptual hashes, Hamming-distance visual scoring, and persistent deduplicated match records).
- **Administration and blocking** (database-backed block state, per-request database authorization, controlled administrator seed script, protected report/user registry APIs, and a `/admin` dashboard).
- **Moderation lifecycle** (blocking holds active reports for administrator review, removes them from public listings/matching, and dismisses active candidate matches; unblocking does not automatically republish reports).

## API Routes
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/items/lost` - Report lost item
- `POST /api/items/found` - Report found item (Uploads image & enforces private visibility)
- `GET /api/items/lost` - Get public lost items
- `GET /api/items/my-items` - Get user's items
- `GET /api/items/my-matches` - Get potential matches involving the signed-in user's reports
- `GET /api/items/:id` - Get an authorized item detail
- `PUT /api/items/:id` - Update item (Rejects public visibility for found items)
- `PATCH /api/items/:id/archive` - Archive an owned item
- `DELETE /api/items/:id` - Delete item
- `GET /api/admin/users` - Search and paginate users (administrator only)
- `PATCH /api/admin/users/:id/block` - Block a non-admin user and hold active reports (administrator only)
- `PATCH /api/admin/users/:id/unblock` - Restore account access without releasing held reports (administrator only)
- `GET /api/admin/items` - Search all reports, including private reports (administrator only)
- `PATCH /api/admin/items/:id/moderation` - Hold, release, or archive a report (administrator only)

## Known Issues / Incomplete Integrations
- No automated end-to-end test runs against a real MongoDB/Cloudinary account are included. Unit tests use generated images and mocked persistence boundaries; real service credentials remain required for upload verification.
- Image uploads intentionally return a clear 503 when Cloudinary is unconfigured. There is no mock URL or fake upload.
- Matching is deterministic evidence ranking, not proof of ownership. It is synchronous and intended for modest report volumes; see `docs/MATCHING.md` for scale limits.
- Conversation, messaging, and notification modules do not exist in this repository. Their future protected mutations must use the shared authentication middleware; no placeholder endpoints were created.

## Remaining work
- Add real conversation, messaging, and notification modules, then apply the existing database-backed authentication guard to their state-changing routes.
- Add moderation audit history, operational statistics, and end-to-end browser coverage before production use.
