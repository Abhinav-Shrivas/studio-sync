# Architecture & Design Decisions

## 1. Auto-increment integer primary keys instead of UUIDs

- **Chose:** INT AUTO_INCREMENT IDs.
- **Rejected:** UUIDs.
- **Why:** The assignment does not require distributed ID generation or public unpredictable identifiers. INT IDs are simpler, easy to debug, and sufficient for the expected scope.


## 2. Model discipline as an ENUM instead of a separate table

- **Chose:** Model discipline as an ENUM.
- **Rejected:** A separate `disciplines` table.
- **Why:** The assignment requires a discipline field but does not require staff to dynamically manage disciplines. A separate table would add unnecessary complexity.


## 3. Soft-archive classes and block new sessions during archival

- **Chose:** Use `is_archived` for soft-archiving classes and prevent new sessions from being created while a class is archived.
- **Rejected:** Permanently deleting classes or allowing new sessions for archived classes.
- **Why:** The README requires archived classes to retain their sessions and bookings. Soft archiving preserves this data while keeping the class out of normal operation.


## 4. Class duration and capacity as independent session defaults

- **Chose:** Treat class duration and capacity as defaults copied to a session at creation time. Later changes to class defaults do not modify existing sessions.
- **Rejected:** Dynamically inheriting class defaults so that existing sessions change when the class is edited.
- **Why:** Sessions can have their own duration and capacity, so existing sessions should retain their configured values. This also prevents a class edit from unexpectedly changing scheduled sessions.


## 5. Deactivate users instead of deleting accounts with historical references

- **Chose:** Deactivate users (staff and instructors) instead of deleting users that are referenced by sessions, booking timelines, or alert dismissals.
- **Rejected:** Deleting users or setting user references to NULL.
- **Why:** User identity is part of the historical session record and administrative audit trails (booking timeline events and alert dismissals), so removing user identities would weaken historical integrity and violate foreign-key constraints.


## 6. Omit session status field and derive state from timestamps and bookings

- **Chose:** Do not add a `session.status` field.
- **Rejected:** Adding states such as `PENDING`, `CANCELLED`, and `COMPLETED`.
- **Why:** The assignment does not define a session lifecycle or cancellation workflow. Adding one would introduce unsupported business rules.


## 7. Global membership-alert dismissal across all staff

- **Chose:** Make membership-alert dismissal global to the member. If one staff member dismisses the alert, it is dismissed for all staff.
- **Rejected:** Staff-specific dismissal, where each staff member has an independent dismissal state.
- **Why:** The alert represents a studio-level operational issue rather than a personal notification. A single dismissal therefore marks the current alert as handled for the studio.


## 8. Seed staff and instructor accounts without user-management API

- **Chose:** Provision the initial staff and instructor accounts through database/application seeding. No user-management API is included.
- **Rejected:** Building staff-facing user creation and management.
- **Why:** The assignment requires staff and instructor roles and requires instructors to be assigned to sessions, but Goal 1 does not specify functionality for staff to create or manage user accounts. The explicitly required staff management operations are classes, sessions, members, and bookings. Seeding provides the required accounts without adding functionality outside the assignment scope.


## 9. Stateless JWT authentication with 1-day token expiry

- **Chose:** JWT-based stateless authentication with a 1-day token expiry. The token contains the user ID and role and is stored by the client in localStorage.
- **Rejected:** Server-side session tracking, refresh tokens, OAuth, and cookie-based authentication.
- **Why:** The assignment only requires email/password authentication and server-side role enforcement. A stateless JWT keeps the implementation small and avoids introducing session storage, refresh-token management, or third-party authentication that is outside the assignment scope.


## 10. Layered architecture with strict separation of concerns

- **Chose:** Keep controllers, services, repositories, middleware, models, and utilities separate.
- **Rejected:** Putting database queries and business logic directly inside controllers.
- **Why:** The separation keeps HTTP handling, business logic, and database access independent and makes the backend easier to test, reason about, and extend as the remaining assignment goals are implemented.


## 11. Freeze sessions permanently after their scheduled start time

- **Chose:** A session becomes permanently immutable once its scheduled start time has passed.
- **Rejected:** Allowing staff to edit the session again after it finishes.
- **Why:** Allowing changes after the session has started could rewrite scheduling information that may already affect bookings, attendance, and historical records. A permanent freeze gives the session a clear lifecycle boundary.


## 12. Instructor availability considers both primary and co-instructor assignments

- **Chose:** An instructor cannot be assigned to overlapping sessions regardless of whether they are primary on one session and co-instructor on another.
- **Rejected:** Checking overlap only for primary-instructor assignments.
- **Why:** An instructor is still committed to the session when serving as a co-instructor, so ignoring co-instructor assignments could schedule the same instructor in two places at once.


## 13. Server-side instructor authorization and shared session response data

- **Chose:** Instructors can access only sessions where they are the primary instructor or a co-instructor.
- **Response behavior:** When an instructor views an authorized session, the response intentionally includes the associated class information, primary instructor information, and co-instructor information as part of the session response.
- **Rejected:** Creating separate filtered response logic solely to hide class or other instructor information from an instructor's authorized session response.
- **Why:** The session query already retrieves these related entities, and creating a separate response structure/filtering logic specifically for instructors would add unnecessary complexity without providing a meaningful security benefit. The important authorization boundary is which sessions the instructor can access, not hiding non-sensitive details of a session they are already authorized to view.


## 14. Partial success instead of all-or-nothing for recurring schedule generation

- **Chose:** Process each recurring occurrence independently. Valid occurrences are created, while existing/conflicting occurrences are skipped and reported with their reasons. Each individual session creation (including co-instructor assignments) is atomic.
- **Rejected:** Wrapping the entire recurring generation request in one transaction where one failure rolls back all successfully created sessions.
- **Why:** A recurring request may contain many independent weekly occurrences. One room/instructor conflict or existing session should not prevent other valid sessions from being created. This also allows the API to clearly report which occurrences were created and which were skipped.


## 15. Never modify an existing session occurrence during recurring generation

- **Chose:** If the same class already has a session at the exact requested start time, skip the occurrence with `ALREADY_EXISTS`. The existing session is never modified, even if its duration or capacity differs.
- **Rejected:** Updating the existing session to match the recurring request, or treating different duration/capacity as a reason to create another session.
- **Why:** Recurring generation is intended to create missing sessions, not update existing schedules. This prevents an already configured session from being unexpectedly overwritten by a later recurring-generation request.


## 16. Serialize booking capacity with a session row lock

- **Chose:** Wrap booking creation and cancellation in PostgreSQL transactions and lock the affected session row with FOR UPDATE before performing capacity-related decisions.
- **Rejected:** A simple COUNT(BOOKED) followed by an insert/update without locking.
- **Why:** Two concurrent requests could otherwise both observe the same available capacity and overbook the session. Locking the session serializes capacity-changing operations for that session. The same mechanism also protects cancellation + waitlist promotion from promoting multiple members for one freed spot.


## 17. User vs system source for timeline history

- **Chose:** Use the existing change_source ENUM('USER', 'SYSTEM') to distinguish user-driven changes from automatic system changes. User-driven entries store the acting user's id; automatic promotion stores SYSTEM with no acting user.
- **Rejected:** Adding a separate actor-type field or pretending an automatic promotion was performed by the staff member who triggered the cancellation.
- **Why:** The timeline must record who made a change, while automatic waitlist promotion has no human actor. The existing change_source field expresses this distinction directly.


## 18. Staff notes use the existing timeline schema

- **Chose:** Represent a standalone staff note using from_status = current status and to_status = current status, with change_source = USER, the staff user's id, and the note text.
- **Rejected:** Adding an event_type column or making to_status nullable solely to represent notes.
- **Why:** The existing timeline schema already requires to_status and does not have an event-type field. Equal status values distinguish a note from an actual status transition under the current state machine, without changing the schema. Notes are append-only and do not modify the booking status.


## 19. Prevent duplicate bookings and allow rebooking after cancellation

- **Chose:** Use a database-level `UNIQUE(member_id, session_id)` constraint to ensure a member cannot create more than one booking for the same session.
- **Rejected:** Relying only on application-level checks to detect duplicate bookings.
- **Why:** The database constraint provides a strong final guarantee against duplicate bookings, even if multiple booking requests arrive concurrently. The application can provide a user-friendly conflict response, while the database enforces the invariant.
- **Later reversed:**
  - The `UNIQUE(member_id, session_id)` constraint prevented a member from booking the same session again after cancelling their previous booking.
  - Since cancelled bookings must remain as historical records for booking history and timeline purposes, the old booking cannot simply be deleted or reused.
  - We therefore removed the unconditional uniqueness constraint and changed the rule to:
    - Multiple historical bookings for the same member/session are allowed.
    - Only one active booking (`BOOKED` or `WAITLISTED`) is allowed at a time.
    - A cancelled booking does not block a new booking.
    - Rebooking always creates a **new booking row**.
    - The application checks for an existing active booking before creating the new booking.


## 20. Case-insensitive partial search

- **Chose:** A single search parameter that performs partial, case-insensitive matching against both member name and email using PostgreSQL `ILIKE`.
- **Rejected:** Separate name and email search parameters, and exact/case-sensitive matching.
- **Why:** It gives a simpler API and more useful booking search. A staff member/instructor can search one term without knowing whether it belongs to the member's name or email.


## 21. Combined filters

- **Chose:** Allow multiple filters/search conditions to be combined in the same request using `AND` semantics.
- **Rejected:** Restricting the API to one filter at a time.
- **Why:** This makes the booking list practically useful—for example, searching a member while simultaneously narrowing results to a specific class and `BOOKED` status. It also naturally maps to database-level query conditions.


## 22. Role-based response projection — Later reversed

This is the strongest architectural decision/reversal:

- **Chose initially:** Return the same detailed booking/session representation to Staff and Instructors, because the README specifies resource access, not explicit field-level restrictions.
- **Rejected initially:** Creating separate endpoints or response formats for each role.
- **Why initially:** Keep the API simple and avoid inventing restrictions not required by the README.
- **Later reversed:** We decided that although an instructor is authorized to access a booking/session, they don't necessarily need every administrative/internal field. We therefore kept the same endpoints and database authorization, but added role-based response projection in the service layer.
    - **Final choice:** Staff keeps the existing detailed response; Instructor receives an instructor-safe projection.
    - **Why reversed:** Separating resource-level authorization from field-level exposure gives a cleaner least-privilege design without duplicating endpoints or queries.


## 23. Membership alert dismissal state

- **Chose:** Store membership-alert dismissal as a one-to-one current state per member in `member_alert_dismissals`. The table stores `member_id`, `dismissed_by`, and `dismissed_at`. A dismissal row means the current membership-expiry alert has been dismissed.
- **Rejected:** Maintaining dismissal history for each membership-expiry cycle.
- **Why:** Goal 10 only requires that a dismissed alert can reappear when the member receives a new, later expiry date. It does not require historical dismissal records. A single current dismissal state is therefore sufficient and keeps the model simple.
- **Later reversed:** The initial design included a `dismissed_expiry` column to record which membership expiry was dismissed. The idea was to keep the dismissal row after a membership renewal and compare `dismissed_expiry` with the member's current expiry date to determine whether the dismissal still applied.

  During implementation planning, this was reconsidered. Since the table represents only the **current dismissal state** rather than historical dismissals, retaining the old dismissal after the membership expiry changes was unnecessary. The final design deletes the member's dismissal row whenever the membership expiry date changes, starting a fresh alert cycle.

  The `dismissed_expiry` column was therefore removed.
- **Final rule:** A dismissal row exists only while the current membership expiry has been dismissed. There is no "undismissed" row in the table (`dismissed_by` and `dismissed_at` are required `NOT NULL`). Absence of a row means the alert is not dismissed; presence of a row means it has been dismissed. Changing the member's expiry date updates the membership and removes any existing dismissal record. When the new expiry later enters the seven-day alert window, the member can receive and dismiss a new alert.