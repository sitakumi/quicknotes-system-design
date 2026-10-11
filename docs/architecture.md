# QuickNotes Architecture (1 million users)

## Requirements

**Functional**
- Register/log in, create, read, update and delete notes
- Tag notes and filter by tag
- List notes with pagination

**Non-functional**
- Availability: 99.9%
- Latency: p95 under 300 ms for reads, under 500 ms for writes
- Durability: no note lost once acknowledged
- Scalability: horizontal scaling of the stateless app tier
- Security: HTTPS, hashed passwords, per-user authorization

## Load estimate

Assumptions: 1,000,000 registered users, 20% active daily (200,000 DAU), each user reads notes 10 times and writes 2 times per day, average note about 1 KB, peak is 5x the average.

| Metric | Calculation | Result |
|--------|-------------|--------|
| Reads/day | 200,000 × 10 | 2,000,000 |
| Reads/second (avg) | 2,000,000 / 86,400 | ≈ 23 (peak ≈ 115) |
| Writes/day | 200,000 × 2 | 400,000 |
| Writes/second (avg) | 400,000 / 86,400 | ≈ 4.6 (peak ≈ 25) |
| Storage/year | 400,000 × 365 × 1 KB | ≈ 146 GB (≈ 200 GB with indexes) |

The load is read-heavy (about 5:1) and modest, so a few app servers and one primary with a replica are enough.

## Diagram

```
                      +--------+
                      | Client |  (browser / mobile)
                      +---+----+
                          |
                      +---v----+
                      |  DNS   |
                      +---+----+
                          |
         static files     |      API calls
        +-----------------+------------------+
        |                                    |
   +----v----+                       +-------v--------+
   |   CDN   |                       | Load balancer  |
   +---------+                       +---+--------+---+
                                         |        |
                                  +------v-+    +-v------+
                                  | App    |    | App    |  (stateless)
                                  | server1|    | server2|  ... N
                                  +--+--+--+    +--+--+--+
                                     |  |          |  |
                    +----------------+  |          |  +----------------+
                    |                   |          |                   |
              +-----v-----+   writes +--v----------v--+          +-----v-----+
              |   Cache   |          |  Primary DB     |          |   Queue   |
              |  (Redis)  |          |  (SQL)          |          +-----+-----+
              +-----------+          +--------+--------+                |
                                   replication|                    +-----v-----+
                                     +--------v--------+           |  Worker   |
                                     |  Read replica   |           +-----------+
                                     +-----------------+  (reads)
```

## Components and the problem each solves

- **Client:** gives users an interface and talks to the API over HTTPS.
- **DNS:** translates the domain name to the address of the CDN and load balancer, and can route to another region on failure.
- **CDN:** serves static files (HTML, CSS, JS) from locations near the user, lowering latency and server load.
- **Load balancer:** spreads requests across app servers and removes unhealthy ones, so no single server is overloaded.
- **App servers (2+):** run the stateless business logic and scale horizontally by adding more instances.
- **Cache (Redis):** keeps hot results in memory so repeated reads avoid the database.
- **Primary database:** the single source of truth that accepts all writes with transactional guarantees.
- **Read replica:** serves read queries and offloads the primary, and can be promoted if the primary fails.
- **Queue:** decouples slow or non-critical work from the request so the user gets a fast response and spikes are absorbed.
- **Worker:** processes queued jobs (tag counts, search indexing, notification emails) in the background, with retries.

## Request flows

**GET /notes**
1. Client sends the request with its token; DNS resolves the domain.
2. The load balancer forwards it to a healthy app server.
3. The app server validates the token and identifies the user.
4. It checks the cache for key `notes:{user}:{page}`.
5. Cache hit: return the cached JSON (step 8).
6. Cache miss: query the read replica (`ORDER BY created_at DESC LIMIT 10`).
7. Store the result in the cache with a short TTL (e.g. 60 s).
8. Return `200 OK` with the JSON list.

**POST /notes**
1. Client sends the JSON body with its token.
2. The load balancer forwards it to an app server.
3. The server validates the token and the input (title required, max 100 characters); invalid input gets `400`.
4. It writes the note and tag links to the primary database in one transaction.
5. It invalidates the cache key `notes:{user}:*`.
6. It publishes a job (e.g. "index note 42") to the queue.
7. It returns `201 Created` with the note and a `Location` header.
8. A worker later consumes the job and does the background work.

## Trade-offs

1. **Caching vs. consistency:** a TTL cache makes reads fast but may serve data that is a few seconds old. Invalidating on write reduces this, at the cost of more code. Notes are not critical data, so this is acceptable.
2. **Read replica vs. replication lag:** reads scale well, but a user may not see a note immediately after creating it. Mitigation: read from the primary right after a write, or let the client add the new note locally.
3. **Queue vs. complexity:** async processing keeps requests fast and resilient, but adds one more system to run and makes work eventually consistent.
4. **SQL vs. NoSQL:** SQL gives integrity and JOINs but scales writes vertically; this is fine for about 25 writes/s at peak.

## Avoiding single points of failure

- DNS with multiple providers or name servers, and a CDN that is distributed by design.
- Two or more load balancers (active/passive or managed multi-zone), with health checks.
- Several stateless app servers in different availability zones.
- Cache with a replica and automatic failover; if it is down, the app falls back to the database.
- Primary database with a standby replica that can be promoted automatically, plus daily backups.
- Queue deployed as a cluster; several workers; failed jobs are retried and sent to a dead-letter queue.