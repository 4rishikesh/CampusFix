# CampusFix - Project Status

## Completed Features (Weeks 2 and 3)
- Initialized Backend (Node.js, Express, Mongoose).
- Setup User & Item models with dual date support (`dateLost`, `dateFound`).
- JWT Authentication (Register, Login, Profile).
- Lost Item Module API (Report, Read, Update, Delete).
- Initialized Frontend (React, Vite, Tailwind CSS setup).
- **Found Item Module** (Private by default, hidden from public feed, strict backend ownership and visibility checks).
- **Image Upload Integration** (Multer memory buffer to Cloudinary direct upload integration, JPEG/PNG/WebP validation, 5 MB limit, and server-side image cleanup on replacement/deletion).
- **Validation and access control** (server-side field validation, private found-item detail protection, owner/admin management checks, archive route, and paginated public feed).
- **Automatic matching engine** (Natural token processing, stemming, Jaro-Winkler field comparison, genuine server-generated 64-bit perceptual hashes, Hamming-distance visual scoring, and persistent deduplicated match records).

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

## Known Issues / Incomplete Integrations
- No automated end-to-end test runs against a real MongoDB/Cloudinary account are included. Unit tests use generated images and mocked persistence boundaries; real service credentials remain required for upload verification.
- Image uploads intentionally return a clear 503 when Cloudinary is unconfigured. There is no mock URL or fake upload.
- Matching is deterministic evidence ranking, not proof of ownership. It is synchronous and intended for modest report volumes; see `docs/MATCHING.md` for scale limits.

## Next Week's Implementation Plan
- Week 4: Add authenticated notification delivery and secure two-party chat by subscribing to the matching service's clean event boundary.
- Add admin moderation UI and operational monitoring before a larger deployment.
