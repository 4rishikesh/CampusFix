# CampusFix implementation status

Last updated: 10 October 2026

## Current state

CampusFix now has an operational authentication flow, lost-item reporting, private found-item reporting, image-upload safeguards, and an internal matching engine. The React UI communicates with the Express API, and MongoDB persists the application data.

Potential matches are evidence-based leads only. They are not ownership verification and do not expose found reports through the public community feed.

## Completed work
 
### Week 1 foundation and authentication

- React/Vite frontend and Express/Mongoose backend are in place.
- Users can register, log in, and retrieve their profile using JWT bearer authentication.
- Passwords are hashed with bcrypt before being stored.
- Protected frontend routes require a stored JWT.
- The dashboard retrieves only the signed-in user's reports.

### Lost-item module

- Authenticated users can create lost-item reports with title, category, location, date lost, description, visibility, and an optional image.
- Lost reports support public and private visibility.
- The public feed returns only active, public lost reports.
- Public feed queries support page/limit pagination plus category and text filtering.
- Owners and administrators can view, edit, archive, or permanently delete an item.
- Archived reports are excluded from public listings and future automatic matching.

### Found-item module (Week 2)

- Authenticated users can create found-item reports with title, category, location found, date found, description, and an optional image.
- Found reports are forced to `private` server-side. A client cannot make one public by sending a crafted `visibility` field.
- Found reports never appear in the public community feed.
- Ordinary users cannot retrieve, edit, archive, or delete another user's found reports. Administrators are allowed to manage reports.
- The dashboard provides view, edit, archive, and delete actions for a user's own reports.
- Found reports remain available to internal matching even though they are hidden from community listings.

### Image handling (Week 2)

- Multer receives uploads in server memory; images are not accepted as arbitrary client-provided URLs or hashes.
- Only JPEG, PNG, and WebP files are accepted, with a 5 MB limit.
- Invalid types return a client error; oversized files return HTTP 413.
- Image content is decoded before hashing, so malformed image data fails safely.
- Cloudinary credentials remain backend-only.
- Missing Cloudinary credentials result in a clear HTTP 503 for image uploads; reports without an image still work.
- Cloudinary failures return a safe HTTP 502 message.
- Replacing or deleting an image attempts to remove the old Cloudinary asset to limit orphaned uploads.

### Automatic matching engine (Week 3)

- A separate matching service compares active lost reports only with active found reports.
- Text normalization lowercases input, normalizes Unicode, removes punctuation, collapses whitespace, removes common English stop words, and Porter-stems tokens.
- Text fields use Jaro-Winkler similarity and token-level comparison to tolerate small spelling differences.
- Title, description, category, and location are scored separately so one noisy value cannot dominate the result.
- Uploaded images receive a genuine server-generated 64-bit DCT perceptual hash, stored as a 16-character hexadecimal value.
- Image hashes are compared by Hamming distance and converted to a 0–1 visual-similarity score.
- Text-only reports are supported; missing or invalid image hashes simply omit the visual component.
- Match weights and thresholds are documented and configurable in `backend/services/matching.service.js`.
- Strong visual similarity can lower the threshold modestly, but visual similarity alone cannot create a match.
- A `Match` model persists candidate scores and enforces one record per lost/found pair with a unique compound index.
- Re-running the engine updates the same match instead of creating duplicate records.
- Editing a report can dismiss an outdated automatic candidate; archiving or deleting a report dismisses its active candidates.
- The matching engine intentionally has no notification or chat side effect yet. A no-op service boundary is reserved for those modules.

### Frontend usability

- Report-lost and report-found forms support optional image files using multipart requests.
- The dashboard displays a user's potential matches with a similarity percentage and a clear warning that similarity is not proof of ownership.
- Item detail and edit views are available from the dashboard.
- The home page now clearly reports API unavailability rather than incorrectly stating that there are no reports.
- The UI follows the project brief's restrained white, dark-text, light-border visual style without animation, gradients, or decorative effects.

## API routes currently available

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Register a user and issue a JWT |
| `POST /api/auth/login` | Authenticate and issue a JWT |
| `GET /api/auth/profile` | Get the signed-in profile |
| `POST /api/items/lost` | Create a lost report |
| `POST /api/items/found` | Create a private found report |
| `GET /api/items/lost` | Get public active lost reports with filters/pagination |
| `GET /api/items/my-items` | Get the signed-in user's reports |
| `GET /api/items/my-matches` | Get potential matches involving the signed-in user's reports |
| `GET /api/items/:id` | Get an authorized item detail |
| `PUT /api/items/:id` | Update an owned/admin-managed item |
| `PATCH /api/items/:id/archive` | Archive an owned/admin-managed item |
| `DELETE /api/items/:id` | Permanently delete an owned/admin-managed item |

## Verification completed

The backend suite passes 10 tests covering:

- input validation and ownership/admin authorization rules;
- rejection of crafted found-item visibility and client-supplied hash fields;
- text normalization, stemming, fuzzy typo handling, and unrelated reports;
- valid 64-bit image hashes, invalid-image processing failure, Hamming distance, and score bounds;
- opposite-type/active-item matching restrictions and mock-persistence deduplication;
- valid uploads, invalid file types, oversized uploads, and absent Cloudinary configuration.

The frontend production build also succeeds with `npm run build`.

## Required local configuration

Copy `backend/.env.example` to `backend/.env` and supply values for:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_value
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

MongoDB Atlas must permit the development machine's public IP address in **Security → Network Access**. Cloudinary values are required only for reports that include an image.

## Work remaining

### Next priority: notification and secure chat module

- Add a persisted notification model and authenticated API routes.
- Subscribe notifications to newly created candidate matches; do not notify repeatedly for an existing pair.
- Build a secure chat model tied to exactly one lost/found match and its two permitted participants.
- Add authorization checks ensuring only the matched users and administrators can access a conversation.
- Add ownership-verification prompts and a safe-resolution flow. Similarity must never be treated as verification.

### Administration and moderation

- Create an administrator dashboard for all reports, user moderation, and match review.
- Add report resolution/rejection controls and audit logging.
- Add user blocking and ensure a blocked user loses access to appropriate future chat and reporting actions.

### Production hardening and scale

- Add API integration tests against an isolated MongoDB instance and a mocked Cloudinary SDK.
- Add rate limiting, security headers, restrictive production CORS, request logging, and centralized error reporting.
- Move matching to a durable background job when the number of active reports becomes large.
- Add candidate pre-filtering by category/date/location before full scoring to reduce database work.
- Define data-retention rules and an automated archival schedule.
- Add pagination and filtering controls to the frontend public feed.
- Add accessibility review, responsive visual QA, and end-to-end browser tests.

## Important limitations

- The matching engine is deterministic fuzzy logic, not a trained model or embedding-based system.
- Image hashing measures visual resemblance; it cannot determine ownership or detect manipulation reliably.
- The current matching execution is synchronous after a report save and is appropriate only for a modest campus-scale data set.
- Real MongoDB Atlas and Cloudinary behavior requires the configured credentials and network access; unit tests do not claim to verify those third-party accounts.
