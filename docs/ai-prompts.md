# AI prompts

## Requirements Analysis

### Prompt

I am starting the SRS/requirements-analysis phase of the assignment.
README.md is the source of truth. Do not invent requirements.

Help me understand each of the 10 goals in detail. For each goal:
- explain what the requirement means,
- identify explicit requirements,
- identify genuine ambiguities or open questions,
- distinguish requirements from implementation/design choices,
- and prepare a detailed acceptance checklist.

I will challenge your interpretations and correct anything that does not match
README.md.

### What I got

AI helped break down the 10 goals into smaller requirements, explain the
booking lifecycle, instructor permissions, co-instructors, recurring sessions,
dashboard, immutable history, and membership alerts.

It also helped identify places where the README was ambiguous.

### What I corrected

I challenged several AI interpretations that went beyond README.md. For example,
AI initially treated some hypothetical cases as open requirements, such as
whether instructors should see membership alerts and what should happen when
a membership expiry is changed to an earlier date.

I removed those unnecessary assumptions and kept the analysis focused on
requirements actually supported by README.md.

I also clarified the distinction between:
- explicit requirements,
- inferred behavior,
- and design decisions.

### Result

I created a goal-by-goal acceptance checklist and a list of genuine
requirements gaps before starting implementation.

---

## Schema Design & Database Decisions

### Prompt

Using the requirements analysis and `README.md` as the source of truth, help me
design the database schema.

Identify the core entities and relationships, then evaluate:

- columns and data types,
- primary and foreign keys,
- column and relationship constraints,
- database-level vs application-level validation,
- indexing requirements,
- and important data-integrity edge cases.

Explain the reasoning and alternatives for significant decisions. Do not
introduce requirements not supported by the assignment.

### What I Got

AI helped identify the core entities, relationships, constraints, foreign
keys, indexing requirements, and the boundary between database and
application-level validation.

### What I Corrected

I reviewed the suggestions against the requirements and challenged decisions
that were unnecessary, overly restrictive, or better handled through
application-level logic.

**Example:** AI initially suggested keeping a separate dismissal record for
each alert cycle. I reviewed the requirement and concluded that dismissal
history is not required, so I chose a single record per member that is updated
when the membership is renewed.

### Result

I finalized the initial database schema, relationships, constraints, foreign
keys, delete behavior, business rules, and indexing strategy before starting
feature implementation.

---

## Database Setup & Seed Data

### Prompt

Using `docs/schema.md` as the source of truth, implement the database
migrations, Sequelize models, and seed data.

Follow the finalized schema exactly, including relationships, constraints,
foreign keys, indexes, and delete behavior. Create coherent demo data across
the relevant tables for development and testing. Do not redesign the schema
or introduce unsupported functionality.

### What I got

AI successfully implemented the database migrations, Sequelize models, and
seed data based on the finalized schema. The generated seed data covered the
main entities and realistic scenarios needed for development and testing.

### Result

Database setup was completed successfully, and the migrated and seeded
database was verified in PostgreSQL.

---

## Authentication & Authorization

### Prompt

Implement the authentication and authorization foundation using the existing project structure. Use email/password login with hashed passwords, JWT authentication with a 1-day expiry, and separate authentication and role-authorization middleware. Keep controllers, services, and repositories separated. Do not implement user management or other business features. Add focused tests for authentication and authorization behavior.

### What I got

- Implemented email/password login with hashed password verification.
- Added JWT authentication with 1-day expiry.
- Added separate authentication and authorization middleware.
- Added focused authentication and authorization tests.

### What I corrected

- The initial test suite had redundant unit tests for middleware
  behavior already covered by HTTP integration tests.
- I asked the AI to remove the redundant tests and keep
  behavior-focused coverage.

### Result

- Authentication and authorization implementation completed.
- Login API verified successfully using Postman.
- All authentication tests pass.
- Documentation updated to reflect the implementation and decisions.

---

## Class & Session Management

### Prompt

Implement the Class and Session Management feature using the existing project structure, schema, authentication/authorization middleware, and layered architecture.

Implement:

* Staff-only class CRUD operations except deletion; use archive/restore instead.
* Class title uniqueness across active and archived classes.
* Class editing, where changes to `default_duration` and `default_capacity` affect only newly created sessions; existing sessions keep their own values.
* Archive behavior: archiving does not delete sessions or bookings, existing sessions remain bookable, but new sessions cannot be created for an archived class. Restore enables new sessions again.
* Staff-only session creation, editing, and deletion.
* Session creation with class defaults copied into the session when duration/capacity are omitted.
* Session duration and capacity can later be changed independently.
* Sessions can be edited or deleted only before their scheduled start time. Once started, they are permanently frozen.
* Sessions with bookings cannot be deleted.
* Capacity cannot be reduced below the number of currently `BOOKED` members.
* Exactly one primary instructor, with zero or more co-instructors. The primary instructor cannot also be a co-instructor.
* Validate room and instructor overlaps using the session start timestamp and duration. Instructor overlap must consider both primary and co-instructor assignments.
* Instructors can only view sessions where they are the primary instructor or a co-instructor. This authorization must be enforced server-side.
* When an instructor is authorized to view a session, returning the associated class, primary instructor, and co-instructor information in the response is acceptable; do not add separate response filtering solely for instructors.
* When changing a session's `class_id`, the target class must exist and must not be archived. Changing the class must not reset the session's existing duration/capacity unless explicitly supplied.

Keep controllers, services, repositories, and models separated. Reuse the existing error handling, transactions, and conventions. Do not implement booking functionality or other unrelated features.

Add only the important automated tests for the above business rules. Do not create exhaustive tests for every validation variation or duplicate scenario. Focus on the core class/session behavior, scheduling constraints, instructor assignment, and server-side instructor authorization.

Before implementation, inspect the existing codebase and schema and avoid unnecessary structural changes.

### What I got

The AI implemented the Class and Session Management feature with the required routes, services, repositories, validations, instructor/room overlap checks, archive behavior, session freeze rules, capacity validation, and server-side instructor authorization. It also added automated tests for the feature.

### What I corrected

* Initially, `GET /classes`, `GET /classes/:id`, and `GET /classes/:id/sessions` were accessible to authenticated users including instructors. I changed the access model so **class viewing/management remains staff-only**, while instructors can access only the sessions they are assigned to.
* Clarified that an instructor's authorized session response can include the associated class, primary instructor, and co-instructor information; separate response filtering was unnecessary.
* Refined the automated test scope to keep only the **important business-rule tests** instead of maintaining an exhaustive set of 40+ tests.
* Clarified that `session.class_id` can be changed before the session starts, provided the target class exists and is active. Changing the class does not reset the session's existing duration or capacity.

### Result

Class and Session Management was successfully implemented with strict staff-only access controls, scheduling interval overlap checks, session freeze behavior, and server-side instructor data isolation verified by automated tests.

---

## Recurring Schedule Generation 

### Prompt

Implement Goal 7: Recurring Schedule Generation using the existing project structure, schema, authentication/authorization middleware, layered architecture, and session validation logic. Do not implement the CSV/export portion.

Implement:
* Staff-only `POST /sessions/recurring` endpoint.
* Accept `class_id`, `start_date`, `end_date`, `weekday`, `start_time`, `room`, `duration` (optional), `capacity` (optional), `primary_instructor_id`, and `co_instructor_ids` (optional).
* Inclusive date range generating one occurrence per matching weekday.
* Duration and capacity default from the class if omitted, or use supplied overrides.
* Target class must exist and not be archived.
* Skip existing occurrences with `reasons: ["ALREADY_EXISTS"]` and never mutate existing sessions.
* Check full-interval room and instructor overlaps (both primary and co-instructors). If both conflict, skip once and report both reasons (`["ROOM_CONFLICT", "INSTRUCTOR_CONFLICT"]`).
* Return an empty result (`created: []`, `skipped: []`) when no matching weekday falls in the date range.
* Support partial success: valid occurrences are created while conflicted ones are skipped.
* Make each occurrence and its co-instructors atomic via a transaction, without wrapping the whole batch in one transaction.
* Return `created`, `skipped`, and `summary` (`total`, `created_count`, `skipped_count`).
* Add maximum 5 focused automated tests covering generation with defaults/overrides, `ALREADY_EXISTS`, multi-conflict reporting, partial success, and empty range handling.

### What I got

The AI implemented the recurring schedule service method, repository existence query, controller action, and staff-only route with overlap detection, duplicate skipping, partial success handling, and 5 automated tests.

### What I corrected

* Replaced a generic staff-only 403 test with a domain-specific test verifying an empty result (`{ created: [], skipped: [], summary: { total: 0, ... } }`) is returned when the date range contains no matching weekday.
* Added clear doc comments to the date, time, and weekday parsing helpers in `session.service.js`.

### Result

Recurring schedule generation was successfully implemented with multi-conflict overlap detection, duplicate session skipping, atomic occurrence creation, and focused integration tests.

---

## Booking & Booking Timeline

### Prompt

Implement Booking and Booking Timeline features using the existing layered architecture and project conventions. Add booking creation with capacity/waitlist handling, membership-expiry validation, cancellation with deterministic waitlist promotion, attendance settlement with staff/instructor authorization, and immutable booking timeline history.

Use PostgreSQL transactions with session row-locking for capacity-changing operations, and create timeline entries atomically with booking status changes. Use `change_source = USER/SYSTEM` with `actor_id` for the actor.

Staff can view timelines and add append-only notes; instructors cannot access timelines. Since the existing timeline schema has no `event_type` and `to_status` is non-nullable, represent staff notes with `from_status` and `to_status` both set to the booking's current status.

Add focused integration tests for the core booking, cancellation/promotion, settlement, authorization, and timeline business rules.

### What I got

AI implemented booking creation, waitlisting, cancellation with deterministic waitlist promotion, attendance settlement, authorization, and booking timeline history with atomic transaction handling.

### What I corrected

* Kept the existing `change_source = USER/SYSTEM` design.
* Clarified that staff notes are append-only timeline entries with `from_status` and `to_status` both set to the current booking status, since the schema has no `event_type` and `to_status` is non-nullable.
* Clarified that standalone staff notes do not need to be part of a booking-status transaction.
* Kept timeline entries immutable with no edit/delete operations.

### Result

Booking and Booking Timeline features were implemented and verified with focused integration tests covering the core business rules, concurrency, authorization, and timeline integrity.

---

## Booking List, Search, Filters, Sorting & Pagination

### Prompt

Implement Goal 6: Booking List / Finding Bookings using the existing project structure, authentication/authorization middleware, layered architecture, and Sequelize/PostgreSQL database-level querying.

Implement:

* Staff and instructor `GET /bookings` endpoint.
* Instructors can only retrieve bookings from sessions where they are the primary instructor or co-instructor.
* Server-side partial, case-insensitive search across member name and email using a single search parameter.
* Server-side filters for class, session, and booking status.
* Allow multiple search/filter conditions to be combined using AND semantics.
* Server-side sorting by booked time, status, and session start time with whitelisted fields/directions.
* Server-side pagination using LIMIT/OFFSET, with a default limit of 10.
* Return total matching result count and pagination metadata.
* Use `findAndCountAll` with `distinct: true` because of the co-instructor many-to-many join.
* Add maximum 6 focused integration tests covering access scoping, search, combined filters, sorting, pagination, and total count.

### What I got

The AI implemented the booking list endpoint with database-level search, filtering, sorting, pagination, instructor access scoping, and total-count handling.

### What I corrected

* Kept a single case-insensitive partial search parameter for both member name and email instead of separate search parameters.
* Allowed multiple filters/search conditions to be combined using AND semantics.
* Kept pagination database-side using LIMIT/OFFSET with a default page size of 10.
* Added deterministic secondary sorting by booking ID for stable pagination.
* Added `distinct: true` to prevent incorrect counts caused by the co-instructor many-to-many join.

### Result

The booking list endpoint was implemented and verified with focused integration tests covering role-based access scoping, combined search/filters, sorting by session start time, and pagination with distinct count guarantees.

---

## Role-Based Response Projection

### Prompt

Update GET /bookings and GET /sessions to use role-based response projection while keeping the existing endpoints, database queries, authorization scoping, and search/filter/sort/pagination behavior unchanged.

Implement the response projection in the service layer using dedicated serializers/mappers.

Staff should retain the existing Staff-facing response representation.
Instructors should receive only the fields required for their operational view.
For booking responses, omit unnecessary administrative fields such as member membership expiry and session capacity.
For session responses, include actual session capacity but omit class archival/default-capacity fields and database timestamps.
Do not create separate endpoints or duplicate repository queries.
Preserve the existing API field naming convention, including createdAt.

### What I got

The AI correctly implemented the role-based response projection in the service layer for both booking and session lists, while preserving the existing endpoints, database queries, and authorization scoping.

### Result

Role-based response projection was implemented across both booking and session lists in the service layer and verified with focused integration tests proving staff receives the full detailed representation and instructors receive the restricted operational projection.

---

## Membership Alerts — implementation

### Prompt

Implement the backend for **Goal 10: Expiring Membership Alerts** according to the finalized design decisions.

Before making changes, inspect the existing project structure, authentication/authorization, member model, repository/service/controller/route conventions, transaction patterns, database schema, and test structure.

The feature must:

* Dynamically calculate membership-expiry alerts when staff requests `GET /membership-alerts`; do not use cron jobs or persisted alert records.
* Include already-expired members and members whose membership expires today or within the next seven days.
* Exclude members whose expiry is more than seven days away.
* Return alerts in two categories: `membershipExpired` and `membershipExpires`.
* Calculate and return `daysAgo` for expired memberships and `daysRemaining` for upcoming expiries.
* Return an active alert `count` that can be used directly by the frontend navigation badge.
* Allow only studio staff to retrieve and dismiss membership alerts.
* Implement `POST /membership-alerts/:memberId/dismiss`.
* Store dismissal state in the existing `member_alert_dismissals` table.
* A dismissal row exists only after an alert is actually dismissed.
* Store the authenticated staff user's id in `dismissed_by` and the dismissal timestamp in `dismissed_at`.
* Dismissing an alert must not modify the member's membership expiry.
* A dismissed alert must not reappear while the membership expiry remains unchanged.
* When staff changes a member's membership expiry through `PATCH /members/:id`, delete the existing dismissal row only when the expiry date actually changes.
* Perform the membership expiry update and dismissal deletion atomically in the same database transaction.
* If the new expiry is more than seven days away, the member should not appear in alerts.
* Once the new expiry enters the seven-day window, the alert should reappear and be dismissible again.
* Do not reintroduce the removed `dismissed_expiry` column.
* Do not expose a generic endpoint for raw `member_alert_dismissals` records.
* Add focused integration tests covering the major business rules rather than creating a test for every individual assertion.

Use the existing layered architecture and conventions rather than introducing unrelated abstractions or modifying other features.

### What I got

The implementation added dynamic membership-alert retrieval and staff-only dismissal, with the alert response divided into `membershipExpired` and `membershipExpires` and including backend-calculated day differences and the active alert count.

The dismissal flow creates a `member_alert_dismissals` row containing the authenticated staff user and dismissal timestamp. Membership expiry changes use a transaction to update the member and remove the existing dismissal when the expiry actually changes, allowing a fresh alert cycle.

Focused integration tests were added for alert eligibility/categorization, authorization, dismissal and audit data, dismissal persistence, expiry-reset behavior, reappearance, and re-dismissal.

### What I corrected

During design review, the initial dismissal model included a `dismissed_expiry` column so the system could keep a dismissal row and determine whether it still applied after a membership renewal.

I rejected that approach after reviewing the lifecycle more carefully. The dismissal table is intended to represent only the **current dismissal state**, not dismissal history. When the membership expiry changes, the old dismissal is therefore no longer relevant.

The final design removes the dismissal row when the expiry changes and starts a fresh alert cycle. `dismissed_expiry` was removed from the schema, and `dismissed_by` and `dismissed_at` were finalized as required fields because a dismissal row is created only when an alert is actually dismissed.

I also deliberately did not add a `GET /member-alert-dismissals` endpoint. The frontend needs the business-level membership-alert view, not the underlying dismissal table.

### Result

Goal 10 backend was fully implemented and verified with 7 focused integration tests covering dynamic alert calculation, staff-only RBAC, dismissal persistence, and atomic renewal reset in a database transaction.

---

## Session Attendance CSV Export

### Prompt

I need to implement Goal 7 of the assignment: exporting a session's attendance as a CSV file.

The export should include the session information and every booking for that session, including the member and final booking status. Only studio staff and instructors assigned to that session (primary instructor or co-instructor) should be allowed to export it.

Please review the existing architecture, authorization approach, schema, and assignment requirements before suggesting an implementation.

I want the CSV generation to be robust and RFC 4180 compliant. In particular, think through edge cases where class titles, room names, instructor names, member names, emails, or other values contain commas, double quotes, or newlines. Every CSV cell, including session metadata, headers, and booking rows, should go through the same escaping/serialization logic.

Also consider how co-instructors should be represented without creating a variable number of columns, and suggest a deterministic, safe filename for the downloaded CSV.

### What I got

The AI suggested implementing the export through a dedicated per-session endpoint and reusing the existing session authorization logic. It recommended restricting access to studio staff and instructors assigned to the session as either the primary instructor or a co-instructor.

It also suggested generating the CSV dynamically from the session and its bookings and using a shared CSV serializer for all cells. The serializer would handle commas, double quotes, and embedded newlines according to RFC 4180.

For co-instructors, it suggested joining their names into a single cell instead of creating a variable number of columns. It also recommended generating a deterministic filename using the class title and session date.

### What I corrected

I made the CSV serialization stricter by ensuring that **every cell** goes through the same `escapeCsvCell()` / `toCsvRow()` logic, including session metadata and column headers, rather than only escaping booking data.

I also rejected approaches that allowed unassigned instructors or members to export attendance and reused the existing `getSessionById` authorization so export permissions remain consistent with session access.

For co-instructors, I kept all names inside one joined cell and passed that cell through the CSV serializer. I also added a sanitized deterministic filename in the format:

`attendance-{sanitized-class-title}-{session-date}.csv`

I then tested the implementation, including CSV values containing commas, quotes, and newlines, as well as the authorization cases.

### Result
Implemented and tested the CSV export with RFC 4180 escaping, session-based authorization, co-instructor support, and deterministic filenames.
