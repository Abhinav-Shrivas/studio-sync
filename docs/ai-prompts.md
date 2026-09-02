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