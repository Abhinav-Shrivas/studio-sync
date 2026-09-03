# Plan

## Session 1 — Requirement Analysis & Schema Design

**Estimated:** 2 hours

**Actual:** 3 hours

### Goals

- Understand all 10 required goals and their business rules.
- Identify important edge cases and constraints.
- Design the initial database schema.
- Decide the relationships between the core entities.
- Identify which constraints should be handled by the database and which
  should be handled by application logic.

### What I did

- Read and broke down the assignment requirements.
- Analyzed all 10 goals and identified their explicit requirements,
  edge cases, and ambiguities.
- Identified the main entities and their relationships.
- Designed the database schema.
- Decided which constraints should be handled by the database and which
  should be handled by application logic.
- Documented important design decisions and AI-assisted analysis.

### Why this came first

I wanted to understand the domain, business rules, and data relationships
before starting implementation. The booking lifecycle, waitlist promotion,
instructor permissions, session scheduling, and booking history all depend
on the underlying data model, so the requirements and schema were finalized
before implementation.

### Outcome

- Requirements analysis completed.
- Initial database schema completed.
- Important design decisions documented.
- Ready to begin project and database setup.

---

## Session 2 — Initial Project & Database Setup

**Estimated:** 1.5 hours

**Actual:** 1 hour

### Goals

- Complete the initial project setup.
- Implement the finalized database schema through migrations.
- Create Sequelize model files for the schema entities.
- Prepare realistic seed data for development and testing.
- Verify the migrated and seeded database.

### What I did

- Completed the initial project setup and configured the required dependencies.
- Implemented database migrations based on the finalized schema.
- Created Sequelize model files for the schema entities.
- Added seed data across the main tables, including staff, instructors,
  classes, members, sessions, bookings, and related records.
- Included realistic scenarios such as past sessions, waitlisted bookings,
  membership alerts, and alert dismissals.
- Verified the migrated and seeded data in PostgreSQL.

### Why this came next

After completing the requirements analysis and schema design, the project
and database needed to be set up before implementing application features.
A populated and verified database provides the foundation required for
developing and testing the upcoming features.

### Outcome

- Initial project setup completed.
- Database migrations completed successfully.
- Sequelize models and seed data completed.
- Database verified with realistic test data.
- Ready to begin authentication and authorization.