# CampusFix - Project Status

## Completed Features (All 6 Core Modules Complete)
- **Backend Architecture** (Node.js, Express, Mongoose, Helmet, Rate Limiter, CORS).
- **Setup User, Item, Match, Chat, Message, and Notification models**.
- **JWT Authentication** (Register, Login, Profile with per-request database validation).
- **NIT Warangal registration policy** (new public accounts require exact `@student.nitw.ac.in` or `@nitw.ac.in` addresses; faculty addresses remain ordinary users and administrator login is preserved).
- **Module 1: Lost Item Module** (Report, Read with pagination/filters, Update, Archive, Delete).
- **Module 2: Found Item Module** (Strict private enforcement, protected against visibility tampering, hidden from public feeds, verified in backend tests).
- **Module 3: Administration and Moderation Module** (Admin portal `/admin`, user search/block/unblock, report hold/release/archive moderation, seed script, cascading chat closure on block).
- **Module 4: Automatic Matching Engine** (Natural language processing, stemming, Jaro-Winkler field comparison, 64-bit DCT perceptual image hashing with Hamming distance, deduplicated Match persistence, automated execution on report save/edit).
- **Module 5: Secure Communication Module (Chat)** (Dedicated chat rooms for match pairs, safety checklist guidelines, real-time message exchange, owner verification, safe report resolution workflow, and cascading closure on report archival or user block).
- **Module 6: Notification and Alert Module** (Automatic triggers on match discovery, conversation messages, item resolution, unread notification counter badge in navigation, mark-read and deletion actions).
- **Frontend UI & Workflows** (React 19, Vite, Tailwind CSS, AuthContext, Private/Admin guards, responsive dashboard, matching cards with direct chat connection, image file uploads via FormData).

## API Routes
- `POST /api/auth/register` - Register user (@nitw domains)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `POST /api/items/lost` - Report lost item (with image upload & hash calculation)
- `POST /api/items/found` - Report found item (forced private visibility)
- `GET /api/items/lost` - Get public lost items (paginated & searchable)
- `GET /api/items/my-items` - Get user's own items
- `GET /api/items/my-matches` - Get potential matches involving user's reports
- `GET /api/items/:id` - Get authorized item detail
- `PUT /api/items/:id` - Update item
- `PATCH /api/items/:id/archive` - Archive an item
- `DELETE /api/items/:id` - Delete an item
- `GET /api/admin/users` - Search/paginate users (admin only)
- `PATCH /api/admin/users/:id/block` - Block user & hold reports (admin only)
- `PATCH /api/admin/users/:id/unblock` - Unblock user (admin only)
- `GET /api/admin/items` - Search all reports (admin only)
- `PATCH /api/admin/items/:id/moderation` - Hold, release, or archive a report (admin only)
- `POST /api/chat/initiate` - Open or fetch existing chat for a candidate match
- `GET /api/chat` - Get user's conversations
- `GET /api/chat/:id` - Get conversation details
- `GET /api/chat/:id/messages` - Get conversation messages
- `POST /api/chat/:id/messages` - Send message in conversation
- `POST /api/chat/:id/resolve` - Confirm recovery & resolve both items
- `PATCH /api/chat/:id/close` - Close conversation
- `GET /api/notifications` - Fetch user notifications and unread counter
- `PATCH /api/notifications/:id/read` - Mark single notification as read
- `PATCH /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Dismiss notification

## Test Suite Status
- Total Unit & Integration Tests: 12 tests across security, matching, upload, and communication modules.
- Frontend build: `vite build` completed cleanly with 0 errors.
