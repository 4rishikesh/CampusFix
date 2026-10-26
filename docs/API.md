# CampusFix API

All protected endpoints require `Authorization: Bearer <JWT>`. Authentication loads the current user from MongoDB on every request, so a blocked account is denied with HTTP 403 and `code: "ACCOUNT_BLOCKED"` even when its token has not expired.

## Public registration

`POST /api/auth/register` accepts only new accounts with `name@student.nitw.ac.in` or `name@nitw.ac.in`. The backend trims and lowercases the submitted email, then performs a complete exact-domain validation; suffixes and lookalike domains are rejected with HTTP 422 and `Please register using a valid @student.nitw.ac.in or @nitw.ac.in email address.`

Public registration always creates `role: "user"`. Faculty/staff addresses are not administrator accounts, and privileged request fields are rejected. Existing users—including legacy administrators with other email domains—can continue to use `POST /api/auth/login`.

## Administration

Every endpoint below requires an authenticated administrator. Responses exclude password hashes and other credentials.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/users?page=1&limit=20&search=&blocked=` | Search and paginate users. `blocked` is `true` or `false`. |
| PATCH | `/api/admin/users/:id/block` | Block a non-admin user. Body: optional `{ "reason": "…" }`. Holds active reports and dismisses active candidate matches. |
| PATCH | `/api/admin/users/:id/unblock` | Restore account access. Held reports remain held until reviewed. |
| GET | `/api/admin/items?page=1&limit=20&search=&type=&status=&visibility=&moderation=` | Search/paginate all reports, including private reports. `moderation` is `clear` or `held`. |
| PATCH | `/api/admin/items/:id/moderation` | Body `{ "action": "hold" | "release" | "archive" }`. Release is allowed only for active reports. |

Administrators may also use the existing authorized item-detail endpoint to inspect private reports. Attempts to submit `role`, `isBlocked`, `blockedAt`, `blockedBy`, or `blockReason` during public registration are rejected.

## Secure Communication (Chat)

Each chat room is tied to an active lost/found match candidate between two verified participants.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/chat/initiate` | Body: `{ "matchId": "…" }`. Initializes or returns the existing chat for a candidate match. |
| GET | `/api/chat?status=` | Returns conversations for the signed-in user (or all conversations for administrators). |
| GET | `/api/chat/:id` | Returns authorized conversation details including lost and found report summaries. |
| GET | `/api/chat/:id/messages` | Returns conversation message history and marks unread messages as read. |
| POST | `/api/chat/:id/messages` | Body: `{ "content": "…" }`. Sends an authenticated message and dispatches notifications. |
| POST | `/api/chat/:id/resolve` | Confirms item return, marks both reports as `resolved`, marks match as `confirmed`, and closes the loop. |
| PATCH | `/api/chat/:id/close` | Body: `{ "reason": "…" }`. Closes the conversation. |

## Notifications and Alerts

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/notifications?unreadOnly=&page=&limit=` | Fetches user notifications and real-time `unreadCount`. |
| PATCH | `/api/notifications/:id/read` | Marks a specific notification as read. |
| PATCH | `/api/notifications/read-all` | Marks all notifications for the user as read. |
| DELETE | `/api/notifications/:id` | Dismisses/deletes a notification. |

## Blocking lifecycle

Blocking is a backend action. It denies protected API access, including report creation, editing, archiving, deletion, dashboard/profile reads, chats, and messaging.

Active reports owned by a blocked user are set to `held`. They remain available only to administrators, are excluded from public listings and matching, have active candidate matches dismissed, and close any active chat rooms. Unblocking an account does not republish those reports; an administrator must release, archive, or otherwise review each report.
