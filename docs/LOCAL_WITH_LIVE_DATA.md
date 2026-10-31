# Local UI with the live backend

Run from the project root:

    npm --prefix frontend run dev:live

Open http://localhost:5173. Stop any existing frontend on this port first. No local backend or direct Atlas connection is needed in this mode. Vite forwards /api, /uploads and /socket.io to https://smart-cleaning-service.onrender.com. Normal npm run dev and production builds keep their existing behavior.

This uses the actual deployed accounts, bookings and provider settings. Mutations affect live data immediately; this is not an isolated test database. The live backend must remain reachable. It does not copy or synchronize the old local MongoDB data. Customer Google login still requires the localhost origin in the Google OAuth client and a matching frontend Google Client ID. Staff use password login.

The direct Atlas connection from this PC was not repaired by this mode. The mode avoids that network dependency by using the working deployed API. No database credential is exposed to the browser. Authentication/authorization remain enforced by the deployed backend.
