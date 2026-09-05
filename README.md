# StudioSync

A comprehensive class scheduling, booking management, and attendance tracking platform built for boutique fitness and dance studios.

---

## Links (See reviewer notes in SUBMISSION.md before visiting live link)

- **Live Application:** [https://studio-sync-pi.vercel.app](https://studio-sync-pi.vercel.app)
- **GitHub Repository:** [https://github.com/Abhinav-Shrivas/studio-sync](https://github.com/Abhinav-Shrivas/studio-sync)

---

## Documentation Quick Links

Everything has been thoroughly documented across dedicated files:

- 📄 **[SUBMISSION.md](./SUBMISSION.md)** — Links, Reviewer notes, demo shortcuts, 10-goal completion checklist, stack breakdown, and retrospective.
- 🧪 **[TEST.md](./TEST.md)** — Automated test suite breakdown (10 test suites, 69 tests passing covering all core business rules).
- 📋 **[ASSIGNMENT.md](./ASSIGNMENT.md)** — Original take-home assignment specification and prompt.
- 📐 **[docs/architecture.md](./docs/architecture.md)** — System architecture, layering, component interactions, and data flow.
- 💡 **[docs/decisions.md](./docs/decisions.md)** — Key technical decisions, trade-offs, and rationale.
- 🗄️ **[docs/schema.md](./docs/schema.md)** — Comprehensive database schema, table definitions, relationships, and constraints.
- 🗓️ **[docs/plan.md](./docs/plan.md)** — Session breakdown, estimation vs. actual time tracking, and milestones.
- 🤖 **[docs/ai-prompts.md](./docs/ai-prompts.md)** — Prompt logs, requirements breakdown, and AI collaboration notes.

---

## Tech Stack

- **Frontend:** React (Vite), React Router, Lucide Icons, Custom CSS Design System
- **Backend:** Node.js, Express.js, JWT Authentication, Role-based Middleware
- **Database & ORM:** PostgreSQL, Sequelize ORM (Migrations, Models, Seeders)
- **Deployment:** Vercel (Frontend), Render (API Server), Supabase (PostgreSQL)

---

## Quickstart (Local Development)

### 1. Backend & Automated Tests
```bash
cd server
npm install
npm test            # Run all 10 integration test suites (69 passing tests)
npm run dev         # Starts backend API on http://localhost:5000
```

### 2. Frontend
```bash
cd client
npm install
npm run dev         # Starts frontend on http://localhost:5173
```
