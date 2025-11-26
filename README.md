# Robecop — PPE Management Portal

Minimal intranet-ready PPE management portal scaffold (Next.js frontend + Express backend + PostgreSQL + Prisma).

Quick start (local / Codespaces)

1) Requirements: Node.js 18+, Docker (optional for DB), and Git.

2) Start Postgres (docker-compose):

```bash
docker compose up -d
```

3) Backend: install and run migrations/seed

```bash
cd backend
cp .env.example .env
# edit DATABASE_URL in .env if needed (default: postgres://robecop:robecop_pass@localhost:5432/robecop_dev)
npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run start:dev
```

4) Frontend: install and run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` for frontend and `http://localhost:4000` for backend API.

Notes
- Authentication: JWT-based in this scaffold. Placeholder for Microsoft Entra ID integration is included in the backend auth route.
 - Authentication: JWT-based in this scaffold by default. You can enable Microsoft Entra ID (SSO) by setting `AUTH_MODE=entra` and configuring the Azure app (not enabled by default in this scaffold).
- Email notifications: skeleton using `nodemailer` and env vars — configure SMTP in `.env`.
- File uploads: uploaded files are stored under `backend/uploads/ppe/<ppeId>/` and served at `http://<backend-host>:4000/uploads/ppe/<ppeId>/<filename>`.
	- Allowed file types: `jpg`, `png`, `pdf`.
	- Max file size: 5 MB (configurable in `backend/src/routes/api.js`).
	- Backup: include the `backend/uploads/` tree in your backup strategy. For production, replace local storage with a durable storage like Azure Blob Storage or S3 and update the upload route accordingly.
- This is a scaffold tailored to the requested features. Extend business logic, tests, and production deployment steps as needed for your intranet.
## Security

- **Rate limiting:** The backend applies rate limiting to the `/auth/login` endpoint to mitigate brute-force attacks. The default configuration allows 5 login attempts per minute per IP and responds with a JSON error `{ error: "Too many login attempts. Please try again later." }` on limit exceed.

- **Configuration:** You can adjust the threshold via environment variables in the backend `.env` (or CI env):
	- `LOGIN_RATE_LIMIT_MAX` — number of allowed attempts per window (default: `5`).
	- `LOGIN_RATE_LIMIT_WINDOW_MS` — length of window in milliseconds (default: `60000` i.e. 1 minute).

Adjust these values as needed for your deployment and consider complementing rate limiting with account lockout policies and IP-based blocking in production.

### Redis-backed rate limiting (production)

For multi-instance or scaled deployments the in-memory rate limiter is insufficient because it tracks requests per-process. To use a shared Redis store for rate limiting, set `REDIS_URL` (e.g. `redis://:password@redis-host:6379`) in your backend environment. The app will automatically use a Redis-backed store when `REDIS_URL` is present.

Make sure to provision a secure Redis instance (with authentication and network access controls) and monitor Redis memory/latency for production workloads.

### Refresh tokens, secure cookies and CSRF

- The backend issues short-lived access tokens and longer-lived refresh tokens. Defaults:
	- `ACCESS_TOKEN_EXPIRES_MINUTES=15`
	- `REFRESH_TOKEN_EXPIRES_DAYS=7`

- When `USE_COOKIES=true`, refresh tokens are set as `HttpOnly` cookies by the server. For production you should also set `COOKIE_SECURE=true` (HTTPS) and choose an appropriate `COOKIE_SAMESITE` (`lax` or `strict`). These are configurable via `.env`.

- If CSRF protection is enabled (`USE_COOKIES=true`), the server exposes `/csrf-token` which returns a token to include in state-changing requests (or the frontend can read the cookie and include the header `x-csrf-token`).

Adjust these settings in `.env` as appropriate for your deployment.
# Robecop
Robecop idea to adapt with APIs (micorsoft etc)
