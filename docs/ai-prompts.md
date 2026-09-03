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
