# Schema

## 1. Tables

The database contains 8 tables:

1. `users`
2. `members`
3. `classes`
4. `sessions`
5. `session_co_instructors`
6. `bookings`
7. `booking_timeline`
8. `member_alert_dismissals`

---

## 2. Table-by-Table Design

### 2.1 `users`

Stores staff and instructor accounts.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `name` | VARCHAR | NOT NULL |
| `email` | VARCHAR | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR | NOT NULL |
| `role` | ENUM(`STAFF`, `INSTRUCTOR`) | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `created_at` | DATETIME | NOT NULL |
| `updated_at` | DATETIME | NOT NULL |

Notes:

- `email` is unique and therefore indexed.
- `is_active` allows users to be deactivated without removing historical references.
- Users referenced by other tables are protected from deletion through foreign-key constraints.

---

### 2.2 `members`

Stores studio members and their membership expiry.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `name` | VARCHAR | NOT NULL |
| `email` | VARCHAR | NOT NULL, UNIQUE |
| `membership_expiry` | DATE | NOT NULL |
| `created_at` | DATETIME | NOT NULL |
| `updated_at` | DATETIME | NOT NULL |

Notes:

- `membership_expiry` is a `DATE` because the requirement concerns an expiry date rather than a specific time.
- `membership_expiry` is indexed to support expiry-window queries.

Additional index:

```text
INDEX(membership_expiry)
```

---

### 2.3 `classes`

Stores reusable class definitions and their default session configuration.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `title` | VARCHAR | NOT NULL, UNIQUE |
| `description` | TEXT | NULL |
| `discipline` | ENUM(...) | NOT NULL |
| `default_capacity` | INT | NOT NULL, CHECK > 0 |
| `default_duration` | INT | NOT NULL, CHECK > 0 |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT FALSE |
| `created_at` | DATETIME | NOT NULL |
| `updated_at` | DATETIME | NOT NULL |

Notes:

- `discipline` uses a controlled ENUM domain. The exact discipline values are a design choice; the README requires the field but does not provide a fixed list.
- `default_duration` is stored in minutes.
- Archived classes remain in the database so their sessions and booking history are preserved.
- No additional index is currently required beyond the primary key and unique title index.

---

### 2.4 `sessions`

Stores scheduled occurrences of classes.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `class_id` | INT | NOT NULL, FK → `classes.id` |
| `room` | VARCHAR | NOT NULL |
| `start_time` | DATETIME | NOT NULL |
| `capacity` | INT | NOT NULL, CHECK > 0 |
| `duration` | INT | NOT NULL, CHECK > 0 |
| `primary_instructor_id` | INT | NOT NULL, FK → `users.id` |
| `created_at` | DATETIME | NOT NULL |
| `updated_at` | DATETIME | NOT NULL |

Notes:

- `duration` is stored in minutes.
- `capacity` and `duration` are initialized from the class defaults but can later be changed independently for a specific session.
- `end_time` is derived from `start_time` + `duration` and is not stored separately.
- Every session has exactly one primary instructor.

Additional indexes:

```text
INDEX(class_id)
INDEX(room, start_time)
INDEX(primary_instructor_id, start_time)
```

`room` + `start_time` and `primary_instructor_id` + `start_time` support efficient candidate lookup for overlap checks.

---

### 2.5 `session_co_instructors`

Junction table for the many-to-many relationship between sessions and instructors.

| Column | Type | Constraints |
|---|---|---|
| `session_id` | INT | NOT NULL, FK → `sessions.id` |
| `instructor_id` | INT | NOT NULL, FK → `users.id` |

Primary key:

```text
PRIMARY KEY(session_id, instructor_id)
```

Foreign keys:

```text
session_id → sessions.id
    ON DELETE CASCADE

instructor_id → users.id
    ON DELETE RESTRICT
```

Notes:

- A session can have zero or many co-instructors.
- An instructor can co-instruct many sessions.
- The primary instructor is stored separately in `sessions.primary_instructor_id`.
- Duplicate co-instructor assignments are prevented by the composite primary key.

---

### 2.6 `bookings`

Stores a member's booking and its current lifecycle status.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `member_id` | INT | NOT NULL, FK → `members.id` |
| `session_id` | INT | NOT NULL, FK → `sessions.id` |
| `status` | ENUM(`BOOKED`, `WAITLISTED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`) | NOT NULL |
| `created_at` | DATETIME | NOT NULL |
| `settled_at` | DATETIME | NULL |
| `updated_at` | DATETIME | NOT NULL |

Foreign keys:

```text
member_id → members.id
    ON DELETE RESTRICT

session_id → sessions.id
    ON DELETE RESTRICT
```

### Notes

- `created_at` records when the booking record was created. It is used instead of `booked_at` because a newly created booking may have an initial status of `WAITLISTED` rather than `BOOKED`.
- Bookings are not physically deleted because they form part of the historical booking record.
- Multiple historical bookings for the same member and session are allowed, including a new booking after cancellation. Therefore, the schema does not enforce a lifetime `UNIQUE(member_id, session_id)` constraint.

Additional indexes:

```text
INDEX(member_id, session_id)
INDEX(session_id, status)
```

These support member/session booking checks and session-level operations such as attendance and waitlist handling.

---

### 2.7 `booking_timeline`

Immutable, append-only history of booking status changes.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `booking_id` | INT | NOT NULL, FK → `bookings.id` |
| `from_status` | ENUM(`BOOKED`, `WAITLISTED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`) | NULL |
| `to_status` | ENUM(`BOOKED`, `WAITLISTED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`) | NOT NULL |
| `actor_id` | INT | NULL, FK → `users.id` |
| `change_source` | ENUM(`USER`, `SYSTEM`) | NOT NULL |
| `note` | TEXT | NULL |
| `created_at` | DATETIME | NOT NULL |

Foreign keys:

```text
booking_id → bookings.id
    ON DELETE RESTRICT

actor_id → users.id
    ON DELETE RESTRICT
```

Notes:

- One booking can have many timeline entries.
- `from_status` is nullable only for the initial booking event, where there is no previous status.
- `actor_id` is nullable because some status changes can be generated automatically by the system rather than by a staff member.
- `change_source` distinguishes whether the status change was made by a user or generated by the system.
- `note` is optional because not every status change requires a staff note.
- No `updated_at` is included because the records are immutable.

Additional index:

```text
INDEX(booking_id)
```

This supports retrieving the history for a specific booking.

---

### 2.8 `member_alert_dismissals`

Stores the current membership-expiry alert dismissal state for each member.

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT |
| `member_id` | INT | NOT NULL, UNIQUE, FK → `members.id` |
| `dismissed_by` | INT | NULL, FK → `users.id` |
| `dismissed_at` | DATETIME | NULL |
| `dismissed_expiry` | DATE | NULL |

Foreign keys:

```text
member_id → members.id
    ON DELETE CASCADE

dismissed_by → users.id
    ON DELETE RESTRICT
```

Notes:

- The table stores the current dismissal state for each member rather than maintaining dismissal history.
- `dismissed_expiry` identifies the membership expiry associated with the current dismissal, allowing the alert to reappear after a later renewal.
- `dismissed_by`, `dismissed_at`, and `dismissed_expiry` are nullable because the alert may not have been dismissed yet.
- No `created_at` / `updated_at` because this table stores the member's current alert-dismissal state rather than a history of dismissal events.
- `member_id` is unique, giving a one-to-one relationship with `members`.

Additional index:

```text
INDEX(dismissed_expiry)
```

---

## 3. Relationships

### One-to-Many

#### Class → Session
`classes 1 ───────────< sessions`

One class can have many sessions. Every session belongs to one class.

`sessions.class_id → classes.id`  
`ON DELETE RESTRICT`

#### Session → Booking
`sessions 1 ───────────< bookings`

One session can have many bookings. Every booking belongs to one session.

`bookings.session_id → sessions.id`  
`ON DELETE RESTRICT`

#### Member → Booking
`members 1 ───────────< bookings`

One member can have many bookings. Every booking belongs to one member.

`bookings.member_id → members.id`  
`ON DELETE RESTRICT`

#### Booking → Booking Timeline
`bookings 1 ───────────< booking_timeline`

One booking can have many immutable timeline entries.

`booking_timeline.booking_id → bookings.id`  
`ON DELETE RESTRICT`

#### User → Primary Sessions
`users 1 ───────────< sessions`

One instructor can be the primary instructor for many sessions. Every session has one primary instructor.

`sessions.primary_instructor_id → users.id`  
`ON DELETE RESTRICT`

#### User → Booking Timeline

`users 1 ───────────< booking_timeline`

One user can be the actor for many timeline events. `actor_id` is nullable for system-generated events.

`booking_timeline.actor_id → users.id`
`ON DELETE RESTRICT`

#### User → Member Alert Dismissal
`users 1 ───────────< member_alert_dismissals`

A user can dismiss alerts for multiple members. `dismissed_by` is nullable.

`member_alert_dismissals.dismissed_by → users.id`  
`ON DELETE RESTRICT`

### One-to-One

#### Member → Member Alert Dismissal
`members 1 ─────────── 1 member_alert_dismissals`

`member_id` is unique, so each member has at most one current alert-dismissal state.

`member_alert_dismissals.member_id → members.id`  
`ON DELETE CASCADE`

### Many-to-Many

#### Session ↔ Instructor
```text
sessions N ─────────── N users
          through
       session_co_instructors
```

A session can have zero or many co-instructors, and an instructor can co-instruct many sessions.

```text
session_co_instructors.session_id
    → sessions.id
    ON DELETE CASCADE

session_co_instructors.instructor_id
    → users.id
    ON DELETE RESTRICT
```

The primary instructor is not stored in the junction table.

---

## 4. Delete Behavior

| Relationship | Delete behavior | Reason |
|---|---|---|
| Class → Session | RESTRICT | Preserve sessions and their history |
| Session → Booking | RESTRICT | Preserve booking history |
| Member → Booking | RESTRICT | Preserve member identity in booking history |
| Booking → Timeline | RESTRICT | Preserve immutable timeline |
| User → Session | RESTRICT | Preserve instructor references |
| User → Session Co-Instructors | RESTRICT | Preserve historical assignments |
| User → Timeline | RESTRICT | Preserve historical actor references |
| User → Alert Dismissal | RESTRICT | Preserve dismissal attribution |
| Member → Alert Dismissal | CASCADE | Current alert state has no independent historical value |
| Session → Session Co-Instructors | CASCADE | Junction rows have no independent meaning |

Classes are archived rather than permanently deleted during normal application use. Users are deactivated rather than physically deleted once they are referenced.

---

## 5. Indexing Strategy

Indexes are added based on actual access patterns rather than indexing every foreign key or low-cardinality field.

| Table | Additional Index | Reason |
|---|---|---|
| `users` | None | `email` is already indexed through UNIQUE |
| `members` | `INDEX(membership_expiry)` | Expiry-window queries |
| `classes` | None | Current requirements do not require frequent discipline filtering |
| `sessions` | `INDEX(class_id)` | Retrieve sessions belonging to a class |
| `sessions` | `INDEX(room, start_time)` | Candidate lookup for room overlap |
| `sessions` | `INDEX(primary_instructor_id, start_time)` | Candidate lookup for instructor overlap |
| `session_co_instructors` | None additional | Composite PK already indexes `session_id` |
| `bookings` | `INDEX(member_id, session_id)` | Member/session booking lookup |
| `bookings` | `INDEX(session_id, status)` | Session status operations |
| `booking_timeline` | `INDEX(booking_id)` | Retrieve a booking's history |
| `member_alert_dismissals` | `INDEX(dismissed_expiry)` | Expiry-based alert queries |

Unique constraints and primary keys already provide their corresponding indexes, so duplicate indexes are avoided.

### Indexing Trade-off

The schema deliberately avoids excessive indexing. Additional indexes improve read performance for specific access patterns but increase storage requirements and add overhead to `INSERT`, `UPDATE`, and `DELETE` operations. Therefore, indexes are limited to queries and operations identified by the assignment requirements, with additional indexes to be considered only if actual query performance at larger data volumes requires them.

---

## 6. Database Constraints vs Application Constraints

The schema uses database constraints for structural invariants that must remain valid regardless of which application code accesses the database. Business rules that depend on current state, time, authorization, or relationships across multiple records are enforced by application logic.

| Constraint | Layer | Reason |
|---|---|---|
| User and member email uniqueness | Database (`UNIQUE`) | Prevents duplicate email addresses at the storage level. |
| Class title uniqueness | Database (`UNIQUE`) | Ensures each class has a unique title. |
| Required fields | Database (`NOT NULL`) | Prevents required data from being stored as `NULL`. |
| Positive capacity and duration | Database (`CHECK`) | Prevents invalid non-positive values from being stored. |
| Valid role, discipline, and booking-status values | Database (`ENUM`) | Restricts columns to the defined set of valid values. |
| Session–co-instructor uniqueness | Database (Composite `PRIMARY KEY`) | Prevents the same instructor from being assigned to the same session more than once. |
| Referential integrity | Database (`FOREIGN KEY`) | Prevents references to non-existent records. |
| Deletion of referenced records | Database (`ON DELETE RESTRICT` / `CASCADE`) | Preserves required historical relationships while allowing dependent records to be removed where appropriate. |
| Primary/co-instructor eligibility | Application | Requires checking the referenced user's current role and active status. |
| Primary instructor cannot also be a co-instructor | Application | Requires comparing the primary instructor with the session's co-instructor assignments. |
| Archived classes cannot create new sessions | Application | Depends on the current archived state of the class and the requested operation. |
| Booking vs waitlist decision | Application | Depends on the session's current capacity and active bookings. |
| Booking status transitions | Application | Depends on the current booking state and the requested operation. |
| Waitlist promotion | Application | Requires selecting and updating the appropriate waitlisted booking after cancellation. |
| Attendance settlement timing | Application | Requires comparing the session's scheduled time with the current time. |
| Staff authorization | Application | Depends on the authenticated user's role and the requested operation. |
| Membership expiry alert behavior | Application | Depends on the member's current expiry date and dismissal state. |
| Active-booking uniqueness | Application | The final rule allows historical cancelled bookings while preventing more than one non-cancelled booking for the same member and session. |
| Booking timeline actor/source validation | Application | Timeline entries must distinguish user-generated changes from system-generated changes and handle the actor accordingly. |
| Room and instructor overlap | Application | Requires evaluating time intervals using `existing.start_time < new.end_time AND new.start_time < existing.end_time`. |

### Why this boundary?

Database constraints are used for stable structural invariants that the database can enforce independently.

Application logic handles business rules involving multiple records, current state, time, authorization, or workflows, where encoding the rule directly into the schema would add unnecessary complexity.

---

## 7. Deliberate Denormalisation

None.

The schema does not intentionally duplicate the same data across tables. Values such as duration and capacity are stored on both classes and sessions, but these represent different concepts:

- `classes.default_duration` / `default_capacity` are defaults for newly created sessions.
- `sessions.duration` / `capacity` represent the actual configuration of a specific scheduled session.

Therefore, this is not considered deliberate denormalisation.

No additional denormalisation was introduced because the assignment does not require it and doing so would add unnecessary data duplication and consistency concerns.

---

## 8. What Would Break First at 100× the Data?

At an illustrative 100× scale (for example, around 100,000 bookings and thousands of sessions per month), the first pressure points would likely be **booking queries, bulk session generation, aggregate reporting, and the growth of booking history**.

### 1. Booking List/Search

Goal 6 combines:

- member name/email search,
- class/session/status filters,
- sorting,
- pagination,
- total result count.

At 100× the data, these joined and filtered queries would become one of the most likely performance bottlenecks.

The current indexes support the main booking access patterns, but more specialized indexes or search strategies could be introduced based on actual query performance.

### 2. Conflict Detection During Bulk Session Generation

Bulk session generation checks room and instructor conflicts while creating recurring sessions. At 100× the data, performing overlap checks repeatedly for each generated session would increase query overhead.

The existing `(room, start_time)` and `(primary_instructor_id, start_time)` indexes reduce the candidate set, but large-scale recurring generation could still benefit from more efficient range-based conflict detection or set-based queries.

### 3. Dashboard Aggregate Queries

Dashboard statistics and weekly charts require aggregate queries such as `COUNT(*)` across bookings and session data. As the dataset grows significantly, repeatedly calculating these aggregates over large tables could become expensive.

Possible future optimizations include materialized views or precomputed summary data, depending on the actual query workload and freshness requirements.

### 4. Booking Timeline Growth

`booking_timeline` is append-only, so its size grows continuously as bookings generate more status changes. At 100× the data, storage and historical queries against this table would become increasingly significant.

The existing `booking_id` index keeps retrieval for an individual booking efficient, but if historical reporting across large time ranges becomes common, partitioning or additional access strategies could be considered based on the workload.

### Overall

The likely first bottleneck is **booking-list/search and aggregate reporting workload**, followed by **bulk conflict detection and the continued growth of booking history**. The existing indexes provide a reasonable starting point; at 100× scale, query plans and actual workload measurements should guide further indexing, query optimization, aggregation strategies, or partitioning rather than introducing these prematurely.

### How These Bottlenecks Could Be Managed

At 100× scale, the first step would be to measure actual query performance using query plans and workload data rather than prematurely optimizing. Based on the observed bottleneck:

- **Booking list/search:** add specialized indexes or optimize search and pagination queries.
- **Bulk conflict detection:** replace repeated per-session overlap queries with more efficient set-based or range-based conflict detection.
- **Dashboard aggregates:** use materialized views or precomputed summaries if repeated aggregate calculations become expensive.
- **Booking timeline:** consider partitioning or other archival/access strategies if the growing history becomes a storage or query bottleneck.

The existing schema and indexes are sufficient for the expected assignment scale. These are potential future optimizations, not part of the current implementation.