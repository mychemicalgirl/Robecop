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
# Robecop
Robecop idea to adapt with APIs (micorsoft etc)
