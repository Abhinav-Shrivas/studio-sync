# Submission

## Links

- **GitHub repository:** https://github.com/Abhinav-Shrivas/studio-sync
- **Live application:** https://studio-sync-pi.vercel.app

## Notes for the reviewer

- **Cold start:** The deployed backend may be sleeping when the application is first opened. The initial request can take some time while the service wakes up. Please allow the page/API to load before assuming the application is unavailable.
- **Best viewing experience:** The frontend is currently optimized for laptop/desktop use and is not fully responsive on smaller screens. Please open the application on a laptop/desktop for the best experience.
- **Demo credentials:** The sign-in form provides quick-fill buttons and credentials needed to test the available roles. Please use those credentials rather than attempting to create a new account as there is no public sign-up flow.
- **Seeded data:** The application is seeded with demo data so the main workflows can be explored immediately after signing in.
- **Quick Demo buttons:** To make testing key requirements seamless, two demo shortcut buttons have been added at the bottom of the sidebar:
  - **"Test Attendance Settlement":** Links directly to past Session #5 with 10 unsettled bookings to test the attendance marking and settlement workflow.
  - **"Test Waitlist Promotion":** (Available in Staff view) Links directly to Session #12 (Express HIIT) containing active waitlisted members to easily test automatic FIFO waitlist promotion upon cancelling a confirmed booking.
- **Key feature pointers:**
  - **Expiring Membership Alerts (Goal 10):** Located in the top navigation bar (bell icon & banner for Studio Staff) showing live counts of expiring/expired memberships with dismiss and restore logic.
  - **Attendance CSV Export (Goal 7):** Available on any Session detail page (e.g., Session #5) via the **"Export CSV"** button.
  - **Booking History & Audit Log (Goal 9):** Clicking any booking row or attendee displays an immutable timeline tracking all lifecycle events, actors, and staff notes.
  - **Recurring Schedule Generation (Goal 7):** Available from the Sessions page with automatic room & instructor collision detection.
- **Automated test suite:** A comprehensive integration and unit test suite covers all 10 core goals with **10 test suites and 69 passing tests** (detailed breakdown and documentation can be found in [TEST.md](./TEST.md)). You can run them locally via:
  ```bash
  cd server && npm test
  ```

## Demo credentials

The demo credentials are also provided directly in the sign-in form with quick-fill buttons. Use the appropriate credentials there to test the different roles.

| Role | Email | Password |
|------|-------|----------|
| Studio Staff | `staff@studio.com` | `password123` |
| Instructor | `priya@studio.com` | `password123` |

*(Additional active seeded instructors include `raj@studio.com` and `anita@studio.com` with the same password `password123`.)*

## Local Development

If you prefer running and testing the application locally:

### 1. Backend & Automated Tests
```bash
cd server
npm install
npm test            # Runs all 10 test suites (69 passing tests)
npm run dev         # Starts API on http://localhost:5000
```

### 2. Frontend
```bash
cd client
npm install
npm run dev         # Starts Vite dev server on http://localhost:5173
```

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React (Vite) | The application has a dashboard-heavy interface with multiple views, filters, forms, tables, and role-specific UI. React's component-based architecture and SPA model fit this type of interactive application well. I also chose it partly because I already have hands-on experience with React, allowing me to move quickly within the assignment's time constraint. |
| Backend | Node.js + Express.js | Express provides a simple and mature way to build REST APIs, middleware, authentication, validation, and role-based access control. Node.js is well suited for an API-driven application with many I/O-bound operations, and I already have strong familiarity with this stack, which helped me focus time on the application's business rules rather than learning a new framework. |
| ORM | Sequelize | Sequelize is a mature and widely used Node.js ORM with strong support for PostgreSQL and relational modelling. It provides associations, transactions, migrations, validations, and query-building capabilities that fit this application well, especially because the system has several related entities such as classes, sessions, instructors, members, bookings, and booking history. |
| Database | PostgreSQL | PostgreSQL was a natural fit because the application is heavily relational and depends on relationships, constraints, transactions, and consistent state changes. I preferred a relational database over a NoSQL database because bookings, sessions, members, instructors, and history have well-defined relationships and transactional requirements. PostgreSQL also provides strong indexing and query capabilities for the application's search, filtering, sorting, and pagination requirements. |
| Hosting | Vercel + Render + Supabase | Vercel is used to host the React frontend, Render hosts the Node.js/Express backend, and Supabase provides the managed PostgreSQL database. I chose Supabase because it is easy to set up and provides a convenient managed PostgreSQL environment with sufficient storage for the application's data. I preferred keeping the database on Supabase rather than using Render's database offering because of the database lifecycle limitations I encountered with Render. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | **Done** | Implemented studio staff and instructor roles with server-side authorization and role-specific permissions. |
| 2 | Classes | **Done** | Staff can create, edit, archive, and restore classes without affecting their existing sessions or bookings. |
| 3 | Sessions inside classes | **Done** | Staff can create, edit, and delete sessions with configurable instructor, room, duration, capacity, and schedule. |
| 4 | Booking lifecycle with rules | **Done** | Implemented Booked, Waitlisted, Cancelled, Attended, and No Show states with server-side transition rules, membership validation, capacity handling, and automatic waitlist promotion. |
| 5 | Co-instructors | **Done** | Sessions support a primary instructor and multiple co-instructors. Instructor visibility is restricted to sessions they are assigned to. |
| 6 | Finding bookings | **Done** | Booking search, filtering, sorting, and pagination are performed server-side, including total match counts. |
| 7 | Recurring schedule and attendance export | **Done** | Implemented recurring session generation with overlap detection and reporting of created/skipped sessions, along with per-session attendance CSV export. |
| 8 | Dashboard | **Done** | Dashboard includes the required headline metrics, booking breakdowns, and eight-week attendance data. |
| 9 | Booking history | **Done** | Booking history records creation, status changes, the user responsible for each change, and staff notes as an immutable timeline. |
| 10 | Expiring membership alerts | **Done** | Implemented alerts for expired and soon-to-expire memberships, navigation count, dismissal, and reappearance when a newly extended expiry date enters the alert window again. |

**Overall:** The required backend functionality and core workflows for all ten goals are implemented. The main limitations are in frontend polish and responsiveness. The interface is primarily optimized for laptop/desktop use, and because the application was developed within the available time, there may still be edge-case bugs that I was not able to identify through exhaustive manual testing.

## How much time did you actually spend?

Approximately 16–18 hours in total, split across:
- Domain modeling, database schema migrations, and Sequelize setup (~3 hours)
- Backend business logic, concurrency locks, transaction handling, and REST routes (~6 hours)
- Automated unit and integration test coverage across all 10 goals with Jest and Supertest (~3 hours)
- React SPA frontend development, role-based routing, dashboard metrics, filters, and modals (~4-5 hours)

## What would you do next, with another 12 hours?

With another 12 hours, I would focus mainly on improving robustness, code quality, and extending the system beyond the required staff/instructor workflows:

1. **Improve frontend UI/UX and responsiveness:**
   I would focus on elevating the user experience by making the interface fully responsive across mobile and tablet viewports, improving table scrolling, adding smoother state transitions and micro-interactions, and refining accessibility and keyboard navigation across all modals and forms.

2. **Optimize the backend:**
   I would review the backend for unnecessary database queries, repeated operations, and functions that can be simplified or optimized. In particular, I would look at the heavier booking, dashboard, search, and session-related queries and make sure they are efficient as the amount of data grows.

3. **Improve the code structure:**
   The service layer currently contains some validation and utility-related logic that could be separated more cleanly. I would identify these responsibilities and move them into appropriate validation, utility, or domain-specific modules. The goal would be to make the services smaller, easier to understand, and easier to test.

4. **Add a Member role and self-service booking:**
   I would introduce a third **Member** role and allow members to view relevant sessions and book themselves into classes. This would turn the current staff-managed booking workflow into a more complete end-user system.

5. **Add email notifications:**
   I would introduce email notifications for important events. Instructors would be notified when they are assigned to a new session, while members would receive notifications about booking status changes, membership expiry/renewal, and upcoming membership expiration.

Overall, I would use the additional time less for adding unrelated features and more for **hardening the existing booking system, improving maintainability, and extending it toward a complete member-facing workflow**.

## What are you least happy with in this codebase, and why?

* **Code readability:** I am least satisfied with the readability of some parts of the service layer. Some services currently contain validation and utility-related logic that I would ideally separate into dedicated modules. I kept the overall structure as **routes → controllers → services → repositories** to maintain separation of responsibilities, but the service layer itself could still be refactored further.

* **Backend optimization:** Some backend functions currently use straightforward or brute-force approaches. They are sufficient for the current dataset, but with more time I would review the heavier queries and functions, reduce unnecessary database operations, and optimize the logic where appropriate.

* **Frontend consistency:** Although all required features have been implemented, some frontend user flows and UI elements are not as consistent or polished as I would like. I would spend more time improving the overall UI/UX and making the frontend more responsive.

* **Documentation:** I would improve the documentation around complex parts of the codebase. In particular, I would explain the reasoning behind some of the more complicated business logic and edge-case handling so that a reviewer or another developer can understand not only **what** the code does, but also **why** it was implemented that way.

**Time trade-off:** These areas were mainly deprioritized because I chose to spend the available time on completing and validating the core functionality and business rules first. The required features are implemented, but these areas would be my priority for a second iteration.
