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