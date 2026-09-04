# Test Suite Overview

This directory contains integration test suites written with **Jest** and **Supertest**, executed against a dedicated PostgreSQL test database (`class_booking_test`).

The test suite prioritizes **behavior-driven coverage** over unit duplication, exercising HTTP routing, authentication/authorization middleware, service-layer business rules, and database constraints end-to-end.

---

## What We Tested & Why

### 1. Authentication & Authorization (`auth/auth.test.js`)
* **Credential Verification & JWT Issuance:** Proves valid staff/instructor logins return a signed JWT with user metadata while strictly omitting sensitive password hashes.
* **Security & Account Status:** Confirms invalid passwords, unknown emails (preventing user enumeration), and deactivated accounts consistently receive `401 Unauthorized`.
* **Middleware & Role Enforcement:** Verifies protected routes block missing/malformed tokens, correctly populate `req.user`, and enforce role-based access (`STAFF` vs `INSTRUCTOR`) with `403 Forbidden`.

### 2. Class Management (`classes/class.test.js`)
* **Class Lifecycle:** Confirms staff can create classes with predefined disciplines and defaults, archive classes (hiding them from default listings), and restore them.
* **Global Uniqueness:** Validates that class title uniqueness is enforced across all classes, including archived ones.
* **Defaults Decoupling:** Proves modifying class-level defaults (`default_duration`, `default_capacity`) does not alter existing session configurations.

### 3. Session Management (`sessions/session.test.js`)
* **Defaults Inheritance & Overrides:** Confirms session creation inherits class defaults when omitted, but accepts explicit overrides.
* **Archive Protection:** Ensures scheduling sessions under archived classes is strictly rejected.
* **Instructor Assignments:** Enforces assignment rules (e.g., primary instructor cannot also be assigned as a co-instructor).
* **Overlap Validation:** Tests the core interval scheduling rule (`existing.start < new.end AND new.start < existing.end`) to block room double-booking and instructor double-booking, while explicitly allowing adjacent back-to-back sessions.
* **Session Freeze Rule:** Proves sessions can be modified before their scheduled start, but become immutable once the start time passes.
* **Capacity & Deletion Guards:** Confirms capacity cannot drop below the count of active `BOOKED` members, and sessions with bookings or past start times cannot be deleted.
* **Instructor Data Isolation & Projection:** Verifies server-side authorization filters ensure instructors can only view sessions they are assigned to (as primary or co-instructor) and receive `403 Forbidden` for unrelated sessions. Proves role-based response projection returns detailed session representations to staff, while restricting instructors to instructor-safe fields (including `capacity`, `room`, `start_time`, `duration`, `class`) and omitting administrative fields (`class.is_archived`, `class.default_capacity`, timestamps).

### 4. Recurring Schedule Generation (`sessions/recurring-schedule.test.js`)
* **Weekly Pattern Generation:** Confirms bulk session creation calculates correct dates across an inclusive date range and applies class defaults or custom overrides.
* **Duplicate Detection:** Verifies existing occurrences matching the same class and exact start time are skipped with `ALREADY_EXISTS` and remain unmutated.
* **Multi-Conflict Reporting:** Tests interval overlap checks for room and instructor double-booking and confirms multiple conflict reasons (`ROOM_CONFLICT`, `INSTRUCTOR_CONFLICT`) are reported together.
* **Partial Success:** Proves valid occurrences are created and committed while conflicted occurrences are skipped without rolling back the batch.
* **Empty Range Handling:** Confirms returning an empty result (`created: []`, `skipped: []`) with HTTP 200 when no matching weekdays occur in the date range.

### 5. Booking & Booking Timeline (`bookings/booking.test.js`)
* **Capacity & Waitlist Creation:** Proves creating bookings with available capacity creates `BOOKED`, and full capacity automatically creates `WAITLISTED`, each with an atomic initial timeline entry.
* **Membership Expiry Guard:** Verifies expired members cannot create new bookings (`400 Bad Request`).
* **Duplicate Active Prevention & Rebooking:** Confirms duplicate active bookings (`BOOKED` or `WAITLISTED`) for the same member and session are rejected (`409 Conflict`), while allowing rebooking after cancellation by generating a new booking row with its own fresh timeline.
* **Atomic Waitlist Promotion:** Proves cancelling a `BOOKED` slot promotes the earliest waitlisted booking (`ORDER BY created_at ASC, id ASC`) with `SYSTEM` source, while cancelling a `WAITLISTED` booking promotes no one.
* **Attendance Settlement:** Validates settling attendance (`ATTENDED`/`NO_SHOW`) only after session start time and verifies instructors can settle only their assigned sessions with an automatic note.
* **Timeline Integrity & Staff Notes:** Confirms staff can append notes without modifying booking status, while keeping history immutable and hidden from instructors (`403 Forbidden`).

### 6. Booking List, Search, Filters, Sorting & Pagination (`bookings/booking-list.test.js`)
* **Staff Access & Pagination:** Confirms staff can view paginated bookings with complete pagination metadata (`page`, `limit`, `total`, `totalPages`) and rejects invalid pagination parameters (`400 Bad Request`).
* **Instructor Access Isolation & Projection:** Proves instructors can only retrieve bookings for sessions where they are primary instructor or assigned as co-instructor (`primary_instructor_id = user.id OR coInstructors.id = user.id`), with isolation guaranteed at the database query level even when attempting query parameter manipulation. Verifies role-based response projection returns detailed booking representations to staff, while restricting instructors to instructor-safe fields (including `session.capacity`) and omitting administrative fields (`member.membership_expiry`, timestamps).
* **Partial Case-Insensitive Search:** Validates searching across member details (`member.name` OR `member.email`) with partial and case-insensitive matching.
* **Filter Combination:** Proves combining filters (`search`, `class_id`, `session_id`, `status`) applies `AND` filtering accurately, and invalid statuses are rejected (`400 Bad Request`).
* **Sorting:** Confirms sorting by `session` accurately orders by `session.start_time` in both ascending and descending directions, as well as sorting by `status`, with disallowed sort fields and invalid sort directions rejected (`400 Bad Request`).
* **Distinct Booking Counts:** Verifies `findAndCountAll` with `distinct: true` avoids inflated counts when sessions have co-instructors assigned.

### 7. Expiring Membership Alerts (`alerts/member-alert.test.js`)
* **Alert Retrieval, Categorization & Count:** Verifies staff can retrieve active alerts categorized into `membershipExpired` (with backend-calculated `daysAgo`) and `membershipExpires` (with backend-calculated `daysRemaining`, where 0 indicates today), while members expiring after 7 days are excluded and total `count` equals the sum of both categories.
* **Role-Based Authorization:** Confirms `GET /membership-alerts` and `POST /membership-alerts/:memberId/dismiss` strictly enforce staff-only access, rejecting `INSTRUCTOR` and simulated `MEMBER` requests with `403 Forbidden`, and unauthenticated requests with `401 Unauthorized`.
* **Staff Dismissal & Audit Data:** Proves dismissing an eligible alert creates an immutable record in `member_alert_dismissals` with `dismissed_by = staffId` and `dismissed_at` timestamp, while preserving member expiry intact.
* **Dismissal Persistence & Count:** Confirms dismissed members are excluded from future alert listings, active `count` decrements, and duplicate dismissal attempts are rejected with `409 Conflict`.
* **Atomic Renewal Reset:** Validates date validation on `PATCH /members/:id`, proves updating non-expiry fields or providing identical expiry preserves the dismissal, and confirms changing `membership_expiry` to a new date atomically deletes the member's dismissal record in a single database transaction.
* **Alert Reappearance Lifecycle:** Proves a renewed member with expiry > 7 days is hidden from alerts, but automatically reappears under `membershipExpires` once the expiry date enters the 7-day window.
* **Re-dismissal Cycle:** Verifies newly reappeared alerts can be dismissed again by staff, creating a fresh dismissal record and hiding the alert.


