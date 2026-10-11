# QuickNotes Data Model

## Entities

**users**

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT | PK, auto-increment |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, default now |

**notes**

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT | PK, auto-increment |
| user_id | BIGINT | FK → users.id, NOT NULL |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | |
| created_at | TIMESTAMP | NOT NULL, default now |
| updated_at | TIMESTAMP | NOT NULL, default now |

**tags**

| Column | Type | Key / constraint |
|--------|------|------------------|
| id | BIGINT | PK, auto-increment |
| user_id | BIGINT | FK → users.id, NOT NULL |
| name | VARCHAR(50) | NOT NULL, UNIQUE per user |

**note_tags**

| Column | Type | Key / constraint |
|--------|------|------------------|
| note_id | BIGINT | PK (part), FK → notes.id |
| tag_id | BIGINT | PK (part), FK → tags.id |

## Relationships

- **One-to-many:** one user has many notes (`notes.user_id`), and one user has many tags (`tags.user_id`).
- **Many-to-many:** a note can have many tags and a tag can label many notes. This is resolved with the join table `note_tags`, whose composite primary key `(note_id, tag_id)` also prevents duplicates.

## SQL schema

```sql
CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL,
  tag_id  BIGINT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
```

## Example queries

```sql
-- 1. Latest 10 notes of a user
SELECT id, title, created_at
FROM notes
WHERE user_id = 7
ORDER BY created_at DESC
LIMIT 10;

-- 2. JOIN: notes of a user with a given tag
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 7 AND t.name = 'farm';

-- 3. Number of notes per tag for a user
SELECT t.name, COUNT(*) AS note_count
FROM tags t
JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 7
GROUP BY t.name
ORDER BY note_count DESC;
```

## Index and reason

`idx_notes_user_created (user_id, created_at DESC)` serves the most common request, "list my newest notes". The database can find one user's rows and read them already sorted, without scanning the whole table or sorting in memory. The cost is slightly slower inserts and extra storage, which is acceptable for a read-heavy app.

## SQL or NoSQL?

I chose a relational SQL database (PostgreSQL or MySQL). The data is clearly structured and relational (users, notes, tags, many-to-many links), and I need integrity guarantees: foreign keys, unique constraints and transactions, for example when a note and its tags are saved together. JOINs make tag queries simple. A single primary with read replicas handles the estimated load, so the horizontal-scaling advantage of NoSQL is not needed yet; it could be added later for caching or search.