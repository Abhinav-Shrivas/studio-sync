## Decision 1

- **Chose:** INT AUTO_INCREMENT IDs.
- **Rejected:** UUIDs.
- **Why:** The assignment does not require distributed ID generation or
public unpredictable identifiers. INT IDs are simpler, easy to debug and sufficient for
the expected scope.

## Decision 2

- **Chose:** Model discipline as an ENUM.
- **Rejected:** A separate `disciplines` table.
- **Why:** The assignment requires a discipline field but does not require
staff to dynamically manage disciplines. A separate table would add
unnecessary complexity.

## Decision 3

- **Chose:** Use `is_archived` for soft-archiving classes and prevent new
sessions from being created while a class is archived.
- **Rejected:** Permanently deleting classes or allowing new sessions for
archived classes.
- **Why:** The README requires archived classes to retain their sessions and
bookings. Soft archiving preserves this data while keeping the class out of
normal operation.

## Decision 4

- **Chose:** Treat class duration and capacity as defaults copied to a session at creation time. Later changes to class defaults do not modify existing sessions.
- **Rejected:** Dynamically inheriting class defaults so that existing sessions change when the class is edited.
- **Why:** Sessions can have their own duration and capacity, so existing sessions should retain their configured values. This also prevents a class edit from unexpectedly changing scheduled sessions.

## Decision 5

- **Chose:** Deactivate users (staff and instructors) instead of deleting
users that are referenced by sessions, booking timelines, or alert dismissals.
- **Rejected:** Deleting users or setting user references to NULL.
- **Why:** User identity is part of the historical session record and
administrative audit trails (booking timeline events and alert dismissals),
so removing user identities would weaken historical integrity and violate
foreign-key constraints.

## Decision 6

- **Chose:** Do not add a `session.status` field.
- **Rejected:** Adding states such as `PENDING`, `CANCELLED`, and `COMPLETED`.
- **Why:** The assignment does not define a session lifecycle or cancellation
workflow. Adding one would introduce unsupported business rules.


## Decision 7

- **Chose:** Make membership-alert dismissal global to the member. If one
staff member dismisses the alert, it is dismissed for all staff.
- **Rejected:** Staff-specific dismissal, where each staff member has an
independent dismissal state.
- **Why:** The alert represents a studio-level operational issue rather than
a personal notification. A single dismissal therefore marks the current
alert as handled for the studio.


## Decision 8

- **Chose:** Provision the initial staff and instructor accounts through
database/application seeding. No user-management API is included.
- **Rejected:** Building staff-facing user creation and management.
- **Why:** The assignment requires staff and instructor roles and requires instructors to be assigned to sessions, but Goal 1 does not specify functionality for staff to create or manage user accounts. The explicitly required staff management operations are classes, sessions, members, and bookings. Seeding provides the required accounts without adding functionality outside the assignment scope.


## Decision 9

- **Chose:** JWT-based stateless authentication with a 1-day token
  expiry. The token contains the user ID and role and is stored by the
  client in localStorage.
- **Rejected:** Server-side session tracking, refresh tokens, OAuth,
  and cookie-based authentication.
- **Why:** The assignment only requires email/password authentication
  and server-side role enforcement. A stateless JWT keeps the
  implementation small and avoids introducing session storage,
  refresh-token management, or third-party authentication that is
  outside the assignment scope.


## Decision 10

- **Chose:** Keep controllers, services, repositories, middleware,
  models, and utilities separate.
- **Rejected:** Putting database queries and business logic directly
  inside controllers.
- **Why:** The separation keeps HTTP handling, business logic, and
  database access independent and makes the backend easier to test,
  reason about, and extend as the remaining assignment goals are
  implemented.


## Decision 11

- **Chose:** A session becomes permanently immutable once its scheduled start time has passed.
- **Rejected:** Allowing staff to edit the session again after it finishes.
- **Why:** Allowing changes after the session has started could rewrite scheduling information that may already affect bookings, attendance, and historical records. A permanent freeze gives the session a clear lifecycle boundary.


## Decision 12

- **Chose:** An instructor cannot be assigned to overlapping sessions regardless of whether they are primary on one session and co-instructor on another.
- **Rejected:** Checking overlap only for primary-instructor assignments.
- **Why:** An instructor is still committed to the session when serving as a co-instructor, so ignoring co-instructor assignments could schedule the same instructor in two places at once.


## Decision 13

- **Chose:** Instructors can access only sessions where they are the primary instructor or a co-instructor.
- **Response behavior:** When an instructor views an authorized session, the response intentionally includes the associated class information, primary instructor information, and co-instructor information as part of the session response.
- **Rejected:** Creating separate filtered response logic solely to hide class or other instructor information from an instructor's authorized session response.
- **Why:** The session query already retrieves these related entities, and creating a separate response structure/filtering logic specifically for instructors would add unnecessary complexity without providing a meaningful security benefit. The important authorization boundary is which sessions the instructor can access, not hiding non-sensitive details of a session they are already authorized to view.