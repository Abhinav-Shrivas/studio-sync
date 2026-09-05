# Architecture

This document answers the four architecture questions from the assignment brief:

* **What are the moving pieces, and how do they talk to each other?** → [System Overview](#1-system-overview), [Component Responsibilities](#2-component-responsibilities)
* **Where does each piece run?** → [System Overview](#1-system-overview)
* **What is the request path for one representative user action, end to end?** → [Request/Response Flow](#3-requestresponse-flow)
* **What did you decide not to build, and why?** → [Key Design Decisions](#4-key-design-decisions)

---

## 1. System Overview

The application is a full-stack web application with a **React frontend, Node.js/Express backend, and PostgreSQL database**.

The backend is structured as a **layered modular monolith** rather than microservices. All core business domains run within the same backend application and share the same PostgreSQL database, while responsibilities are separated into modules and layers.

The main architectural flow is:

```text
React Frontend
      │
      │ HTTP / REST API
      ▼
┌──────────────────────────────────────┐
│            Express Backend           │
│                                      │
│  Routes → Middleware → Controllers   │
│                    ↓                 │
│                 Services             │
│                    ↓                 │
│              Repositories            │
│                    ↓                 │
│                 Models               │
└────────────────────┬─────────────────┘
                     │
                     ▼
                PostgreSQL
```

The application is deployed as separate frontend, backend, and database components:

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** Supabase PostgreSQL

The modular monolith approach was chosen because the assignment has a relatively small domain and does not require independent service deployment or scaling. Keeping the system in one backend also simplifies transactions and coordination between closely related operations such as bookings, waitlist promotion, and attendance.

---

## 2. Component Responsibilities

### Frontend

The frontend is a React single-page application responsible for:

* Rendering role-aware UI and navigation for studio staff and instructors.
* Collecting user input and sending requests to the backend APIs.
* Managing shared client-side state (authentication, user role) using React Context API.
* Client-side routing, protected views, and presenting search/filter/sort/pagination controls.
* Displaying loading, empty, success, and error states.

The frontend does **not** act as the security boundary. Hiding an action from the UI improves usability, but all authorization decisions are enforced by the backend.

### Backend

The backend is responsible for authentication, authorization, business rules, validation, persistence coordination, and API responses.

It follows a layered structure:

```text
Routes
  ↓
Middleware
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Models
  ↓
PostgreSQL
```

**Routes**

* Define REST endpoints.
* Connect HTTP requests to the appropriate controllers.
* Expose the API used by the frontend.

**Middleware**

* Handles cross-cutting request concerns such as authentication, authorization, and validation.
* Rejects requests that do not satisfy required access or request conditions before reaching business logic.

**Controllers**

* Handle HTTP-specific concerns.
* Extract request parameters, body, and authenticated-user information.
* Call the appropriate service methods.
* Convert service results into HTTP responses.

**Services**

* Contain the application's business logic.
* Implement rules such as booking capacity, waitlist promotion, membership validation, instructor permissions, session rules, and booking state transitions.
* Coordinate multiple repository operations when a business operation affects multiple entities.

**Repositories**

* Encapsulate database access.
* Provide a clear interface between business logic and Sequelize models.
* Keep database queries out of controllers and most service-level business logic.

**Models**

* Represent the database entities through Sequelize.
* Define associations and database-level model behaviour.

### Database

PostgreSQL is the system's persistent source of truth.

It is responsible for:

* Persisting users, classes, sessions, members, bookings, instructors, and related records.
* Enforcing relational integrity through primary keys, foreign keys, unique constraints, and other database constraints.
* Supporting transactional operations where multiple related writes must succeed or fail together.
* Providing indexes for frequently queried fields.
* Supporting the aggregation queries required by dashboard functionality.

Database constraints are used where the rule can be expressed reliably at the database level, while cross-entity business rules that require application context are handled by the service layer.

---

## 3. Request/Response Flow

A typical operation is creating a booking for a session.

```text
User clicks "Create Booking"
 ▼
React Frontend  →  POST /sessions/:id/bookings  →  Express Route
                                                       ▼
                                              Auth / Role Middleware
                                                       ▼
                                              Booking Controller
                                                       ▼
                                              Booking Service
                                                ├── Validate membership
                                                ├── Check session state
                                                ├── Check capacity
                                                └── Determine BOOKED / WAITLISTED
                                                       ▼
                                              Booking Repository → Sequelize → PostgreSQL
                                                       │
                                                  (persisted)
                                                       │
                                              Controller → HTTP 201 JSON response
                                                       ▼
                                              React Frontend updates UI
```

The important business decisions happen in the service layer rather than the frontend.

For example, the frontend may display that a session is full, but the backend independently checks the actual session capacity before deciding whether a new booking becomes `BOOKED` or `WAITLISTED`.

Similarly, authorization is checked on the server even when the frontend hides an action from a particular role.

---

## 4. Key Design Decisions

* **Modular monolith instead of microservices** — The domain is small enough that splitting into independent services would add operational complexity without benefit. Modules are separated logically within one backend application.

* **Layered backend (Routes → Controllers → Services → Repositories → Models)** — Separates HTTP handling, business logic, and database access. Prevents controllers from accumulating domain rules and queries.

* **Repository layer** — Isolates database access behind a clear interface, keeping persistence concerns out of service-level business logic.

* **Server-side authorization** — The backend enforces all access decisions. The frontend may hide unavailable actions for usability, but the server remains the authority.

* **Context API instead of Redux or TanStack Query** — The application's shared state needs (authentication, user role) were small enough that additional state-management infrastructure was unnecessary.

* **Application logic vs database constraints** — Database-level constraints are used where the rule can be expressed reliably at that level. Cross-entity business rules (e.g., booking state transitions, instructor permissions) are handled in the service layer.

* **Transaction boundaries** — Multi-step operations use database transactions to prevent partial updates.

Full reasoning and alternatives considered are documented in `decisions.md`.

---

## 5. Cross-Cutting Concerns

### Authentication & Authorization

Authentication identifies the currently logged-in user. Authorization is handled server-side based on the user's role and, where required, their relationship to a resource.

The two roles are **Staff** (administrative access to classes, sessions, members, bookings, and studio operations) and **Instructor** (restricted to sessions where they are the primary instructor or a co-instructor).

Frontend role checks provide an appropriate user experience but are not trusted for security.

### Validation & Error Handling

Validation is performed at the API boundary and within the business logic where necessary.

The backend returns appropriate HTTP error responses for conditions such as:

* Unauthenticated requests.
* Unauthorized resource access.
* Invalid request data.
* Missing resources.
* Invalid business operations.
* Resource/state conflicts.

Errors are handled consistently so that the frontend can distinguish successful operations from rejected requests and display appropriate feedback.

### Auditability & History

Booking records retain their state and history rather than being treated as disposable records. Each status transition is recorded in a `BookingTimeline` entry, preserving explicit states (`BOOKED`, `WAITLISTED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`) along with timestamps and optional staff notes.

This allows the system to preserve a full audit trail while supporting lifecycle operations such as cancellation, waitlist promotion, and attendance settlement.

### Data Integrity & Concurrency

Data integrity is protected through a combination of:

* PostgreSQL constraints.
* Foreign keys and relationships.
* Application-level business validation.
* Transactions for multi-step operations.
* Explicit booking state-transition rules.

Booking capacity and waitlist behaviour are handled by the backend rather than relying on client-side state.

For the assignment's expected dataset size, some backend operations intentionally use straightforward/brute-force logic where it keeps the implementation simpler without creating a meaningful performance concern.

---

## 6. Production & Operational Considerations

The application is designed around a stateless HTTP backend, with persistent application state stored in PostgreSQL rather than in individual backend process memory.

The layered structure also allows individual parts of the application to be optimized independently if the dataset or traffic grows.

Current considerations include:

* **Database indexes** are used for commonly queried fields and relationships.
* **Transactions** protect operations that require atomic multi-record changes.
* **Server-side pagination, filtering, and sorting** prevent unnecessarily large result sets from being returned to the frontend.
* **Dashboard aggregations** are performed by PostgreSQL rather than transferring raw records to the frontend for calculation.
* The backend can be deployed independently from the React frontend.
* The frontend is deployed separately as a static/client application.
* PostgreSQL is hosted separately through Supabase.

The current implementation intentionally does not introduce additional infrastructure such as Redis, background workers, or microservices. For the assignment's dataset and expected traffic, that complexity would not provide enough benefit to justify the additional operational overhead.

If the system grew substantially, the main areas to revisit would be database query optimization, indexing strategy, expensive aggregation queries, and the brute-force operations currently considered acceptable for the assignment's small dataset.
