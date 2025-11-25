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
- Email notifications: skeleton using `nodemailer` and env vars — configure SMTP in `.env`.
- This is a scaffold tailored to the requested features. Extend business logic, tests, and production deployment steps as needed for your intranet.
# Robecop
Robecop idea to adapt with APIs (micorsoft etc)
