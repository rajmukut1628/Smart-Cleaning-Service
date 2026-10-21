# Smart Cleaning Service

Cleaning service booking platform built with React, TypeScript, Express, MongoDB and Socket.IO.

## Run locally

Use Node.js with npm and a reachable MongoDB instance. Install dependencies with `npm ci` separately in `backend` and `frontend`.

1. Copy each `.env.example` to `.env` if an environment file does not already exist. Preserve existing database credentials.
2. Backend: set `MONGO_URI` (legacy `MONGODB_URI` is also accepted), `JWT_SECRET`, `PORT=5003` and `FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173`.
3. Frontend: set `VITE_API_BASE_URL=http://localhost:5003`.
4. In `backend`, run `npm run dev`.
5. In `frontend`, run `npm run dev`, then open `http://localhost:5173`.

Optional: set `VITE_WHATSAPP_NUMBER` to the business number in international format. The WhatsApp shortcut stays hidden until a number is configured.

## Accounts and permissions

Public registration creates customers only. Passwords are hashed; JWTs authenticate API and socket connections. Blocked users cannot authenticate. Admin and worker APIs enforce roles on the server. Only superadmins can create, edit or remove administrators and change user roles.

To provision a superadmin, set `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` (at least 12 characters) in the backend environment, then run `npx ts-node src/scripts/createAdmin.ts`. This command creates a new account or promotes the specified existing account. It does not reset an existing account's password.

## Bookings and cash payments

The server calculates the final amount from the service's base price plus quantity pricing. Admins assign one or more workers. Assignment checks use service duration to detect overlapping schedules in Bangladesh time. Workers advance confirmed jobs to in-progress, then completed.

Payment is **cash after service**. In the admin dashboard, open a booking's Overview and select **Confirm cash received** once the service is completed. Undo confirmation is available for corrections. Payment confirmation records the administrator and timestamp. Revenue and customer spending include completed, paid bookings.

Worker earnings are an equal share of each completed booking's total amount across its unique assigned workers. These figures describe service value allocation; they are not a payroll or bank payout integration.

## Data and UI

- Blue theme across public pages, authentication, dashboards, forms, calendars and management screens.
- Homepage service cards and prices come from the API, with loading, empty and failure states.
- Uploaded images live in `backend/uploads`; retain this directory during deployment and backups.
- Admin preferences are stored per account. Page size and refresh interval are applied in the dashboard.
- Admin mutations produce persisted activity records; historical activity before this feature is not reconstructed.
- Socket delivery originates from authenticated, saved REST messages. Client-supplied socket messages cannot impersonate users.
- Customer custom services remain private to their owner and are included in their service catalog.

## Verification

Frontend: `npm run build` (includes strict TypeScript checking).

Backend: `npm test` (compiles TypeScript and runs regression tests with isolated mocked persistence; does not modify the configured database).

Backend production: `npm run build`, then `npm run start:prod`. Configure the frontend host to serve `index.html` for application routes.

The regression suite covers role escalation, blocked users, protected upload/seeding routes, socket identity, worker earnings, multi-worker photo permissions, job transitions, preferences, schedule overlap and cash-payment permissions.
