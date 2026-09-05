# Plan

## How did you break the work into sessions?

I broke the work into sessions based on **logical development milestones and dependencies**, rather than dividing it into fixed time intervals. I first identified the major stages required to take the project from requirements to a deployed application, then grouped related tasks that could be completed and verified together.

This resulted in seven sessions covering:

* Requirements and schema design
* Project and database setup
* Core backend business logic and APIs
* Backend readiness and API flow review
* Frontend implementation
* Integration, debugging, and feature testing
* Deployment, final verification, and documentation

I chose this approach because each stage produced a meaningful outcome that became the foundation for the next stage, while keeping implementation, integration, and deployment as distinct milestones.

---
### Session 1 — Requirement Analysis & Schema Design

**Estimated:** 2.5 hours
**Actual:** 3 hours

#### Goals
- Understand all 10 required goals and their business rules.
- Identify edge cases and constraints.
- Design the database schema and entity relationships.
- Decide which constraints belong in the database vs application logic.

#### What I did
- Analyzed all 10 goals, identifying requirements, edge cases, and ambiguities.
- Designed the database schema with entity relationships.
- Decided on constraint placement (DB-level vs app-level).
- Documented design decisions and AI-assisted analysis.

#### Why this came next
The booking lifecycle, waitlist promotion, instructor permissions, and session scheduling all depend on the data model. Requirements and schema needed to be finalized before implementation.

#### Outcome
- Requirements analysis, schema design, and design decisions documented.
- Ready to begin project and database setup.

---

### Session 2 — Initial Project & Database Setup

**Estimated:** 1 hour
**Actual:** 1 hour

#### Goals
- Complete project setup with dependencies.
- Implement schema through migrations and Sequelize models.
- Prepare and verify realistic seed data.

#### What I did
- Set up the project, configured dependencies, and implemented database migrations.
- Created Sequelize models for all entities.
- Seeded tables with realistic data (staff, instructors, classes, members, sessions, bookings, alerts).
- Verified migrated and seeded data in PostgreSQL.

#### Why this came next
A populated and verified database was needed as the foundation for developing and testing application features.

#### Outcome
- Project setup, migrations, models, and seed data completed and verified.
- Ready to begin core business logic implementation.

---

### Session 3 — Core Business & API Logic

**Estimated:** 4.5 hours
**Actual:** 4 hours

#### Goals
- Implement core business rules and REST APIs incrementally.
- Cover authentication, class/session management, booking lifecycle, co-instructors, and instructor visibility.
- Test each feature independently before moving on.

#### What I did
Implemented features incrementally, testing each before proceeding:

1. **Auth & authorization** — Role-based access control; instructors restricted to their assigned sessions; server-side permission enforcement.
2. **Class & session management** — CRUD APIs with validation; archiving preserves existing sessions/bookings.
3. **Booking lifecycle** — Capacity checks, membership-expiry validation, Booked/Waitlisted paths, cancellation with automatic waitlist promotion, settlement (Attended/No Show) after session time.
4. **Co-instructors** — Add/remove co-instructors (staff-only); instructor visibility across primary and co-instructor assignments.
5. **Testing & documentation** — Tested each feature (happy paths + edge cases), fixed issues before continuing, and documented design decisions throughout.

#### Why this came next
The schema and seed data provided the foundation; the next step was implementing business rules on top of it. Incremental implementation reduced the risk of interacting bugs.

#### Outcome
- All core backend APIs implemented: auth, classes, sessions, bookings, waitlist, co-instructors.
- Server-side permission and business-rule validation in place.
- Edge cases tested and decisions documented.

---

### Session 4 — Backend Readiness & API Flow Review

**Estimated:** 2 hours
**Actual:** 1.5 hours

#### Goals
- Review backend completeness from the frontend's perspective.
- Map user flows to API requirements and identify gaps.
- Address missing or insufficient API capabilities before frontend work.

#### What I did
- Walked through every major user flow per role, asking: what does the user see, what action do they perform, which API supports it, does the response include all needed data, and how are errors handled?
- Compared expected frontend interactions against implemented APIs.
- Identified and fixed gaps that individual endpoint testing wouldn't reveal.

#### Why this came next
APIs can work correctly in isolation but still be insufficient for complete user flows. Reviewing from the frontend's perspective before building the UI reduced mid-development API changes.

#### Outcome
- Backend gaps identified and addressed.
- API contract confirmed ready for frontend implementation.

---

### Session 5 — Frontend Implementation

**Estimated:** 3 hours
**Actual:** 3.5 hours

#### Goals
- Build all required screens and user flows for staff and instructors.
- Implement role-aware navigation and connect the UI to the available backend APIs.

#### What I did
- Structured the React app around main user workflows using Context API for state management.
- Implemented: authentication, class/session management, instructor views, booking management, co-instructor management, search/filter/sort/pagination, recurring session generation, attendance & CSV export, dashboard statistics, booking history/timeline, membership alerts, and loading/empty/error states against the available APIs.
- Kept UI focused on functional workflows; frontend reflects backend auth rules while backend remains the security boundary.

#### Why this came next
With the backend API contract verified, the frontend could be built confidently against it. Implementation was kept separate from integration testing for cleaner development.

#### Outcome
- Main frontend structure and required user flows implemented against the available backend APIs.
- Ready for integration testing.

---

### Session 6 — Integration, Debugging & Feature Testing

**Estimated:** 2.5 hours
**Actual:** 2 hours

#### Goals
- Test complete user flows end-to-end.
- Fix frontend bugs and backend API gaps exposed during integration.

#### What I did
- Manually tested all major flows as an actual user (auth, classes, sessions, members, bookings, waitlist, co-instructors, recurring sessions, dashboard, history, alerts, attendance, CSV export).
- Fixed frontend-specific issues (UI behaviour, state handling, and integration issues) and addressed backend API gaps (e.g., added missing member retrieval and creation APIs needed by the frontend workflow).
- Re-tested affected flows after each fix to prevent regressions.

#### Why this came next
APIs working in isolation and frontend logic appearing correct don't guarantee they work together. This dedicated integration pass caught issues only visible through real end-to-end usage.

#### Outcome
- Frontend and backend bugs fixed; missing APIs added.
- All major user flows verified as an integrated application.
- Ready for deployment.

---

### Session 7 — Deployment, Final Verification & Documentation

**Estimated:** 3 hours
**Actual:** 2.5 hours

#### Goals
- Deploy to production (Supabase, Render, Vercel).
- Verify deployed application end-to-end.
- Complete project documentation and submission materials.

#### What I did
- Deployed database (Supabase), backend (Render), and frontend (Vercel) with production environment configuration.
- Performed a final production smoke test of the major user flows through the public frontend (auth, classes, sessions, bookings, waitlist, instructor views, dashboard, alerts, attendance, CSV export).
- Fixed deployment-specific issues (env config, API URLs, DB connectivity).
- Reviewed and finalized documentation (architecture, schema, plan, decisions, AI prompts).
- Prepared submission with repo URL, live URL, demo credentials, stack info, and goal checklist.

#### Why this came next
Deployment was kept last because production config should reflect the final application. Post-deployment verification was essential since hosting introduces issues not discoverable locally.

#### Outcome
- Application deployed and publicly accessible.
- Production deployment and end-to-end connectivity verified.
- All documentation completed and submission prepared.

---

## What order did you build in, and why that order?

I built the application incrementally from the foundation upward:

1. **Requirement analysis and schema design** — I first understood the ten required goals, business rules, edge cases, and data relationships. This was necessary because the booking lifecycle, waitlist, permissions, and session scheduling all depend on the underlying data model.
2. **Initial project and database setup** — I converted the finalized schema into migrations and Sequelize models and prepared realistic seed data. This provided a working foundation for application development.
3. **Core business and API logic** — I implemented the main backend functionality incrementally, including authentication, authorization, classes, sessions, bookings, waitlists, co-instructors, and instructor visibility. I tested each feature as I completed it.
4. **Backend readiness and API flow review** — Before starting the frontend, I reviewed the complete user flows from the frontend's perspective and checked whether the available APIs provided everything those flows required.
5. **Frontend implementation** — I built the React frontend around the reviewed API flows, using the Context API for shared state and keeping the UI focused on the required workflows.
6. **Integration, debugging, and feature testing** — I manually went through the application as a user, fixing frontend bugs and addressing backend API gaps discovered during integration. This included adding APIs that were needed by the frontend but had not been identified earlier.
7. **Deployment, final verification, and documentation** — Once the application was working locally, I deployed the database, backend, and frontend, performed a production smoke test, and finalized the project documentation and submission materials.

This order allowed me to establish a stable foundation before moving upward. In particular, reviewing the backend from the frontend's perspective before starting UI development reduced unnecessary API changes, while keeping integration testing as a separate phase allowed frontend and backend issues to be identified and fixed together before deployment.

## What did you estimate versus what it actually took?

| Session                                            |      Estimated |         Actual |
| -------------------------------------------------- | -------------: | -------------: |
| 1 — Requirement Analysis & Schema Design           |      2.5 hours |        3 hours |
| 2 — Initial Project & Database Setup               |         1 hour |         1 hour |
| 3 — Core Business & API Logic                      |      4.5 hours |        4 hours |
| 4 — Backend Readiness & API Flow Review            |        2 hours |      1.5 hours |
| 5 — Frontend Implementation                        |        3 hours |      3.5 hours |
| 6 — Integration, Debugging & Feature Testing       |      2.5 hours |        2 hours |
| 7 — Deployment, Final Verification & Documentation |        3 hours |      2.5 hours |
| **Total**                                          | **18.5 hours** | **17.5 hours** |

Overall, the implementation took **17.5 hours compared with an estimated 18.5 hours**.

The largest overrun was during **requirement analysis and schema design**, which took an additional 30 minutes because I spent more time working through the business rules, edge cases, and data relationships before implementation.

**Frontend implementation** also took slightly longer than estimated as I worked through the required screens and user workflows.

On the other hand, **core backend implementation, API flow review, integration/debugging, and deployment** took slightly less time than estimated. The incremental implementation and testing approach helped reduce the amount of rework needed in these stages.

Overall, the estimates were reasonably close, with the actual implementation finishing approximately **1 hour under the total estimated time**.

### What did you cut when you ran short?

* I did not deliberately cut any of the **ten required goals**. I kept the scope focused on completing the required functionality.
* I avoided spending time on **optional stretch features.**
* I kept the frontend focused on **functional clarity rather than complex UI implementation**.

  * Avoided elaborate animations.
  * Avoided highly sophisticated visual interactions.
  * Avoided unnecessary frontend complexity by using React's built-in Context API for shared state instead of introducing Redux or TanStack Query.
* I also did not spend disproportionate time on **rigorous frontend testing**.

  * Backend business rules received more extensive testing because they contain the core security and domain logic.
  * Frontend testing focused on required user flows, API interactions, states, and role-specific behaviour.
* Kept some brute-force implementations in backend functions where the expected dataset is small enough that the simpler approach is sufficient for the assignment. This avoided spending time on premature optimization while keeping the business logic straightforward.