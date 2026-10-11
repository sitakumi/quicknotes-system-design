# QuickNotes

QuickNotes is a small notes application. This project has two parts: a vanilla JavaScript client that talks to a REST API (the JSONPlaceholder fake API) with GET, POST and DELETE, and a set of design documents describing how the real QuickNotes backend would be designed and scaled to 1 million users.

The client shows loading, success, error and empty states, validates input (a title is required, max 100 characters), disables buttons while a request is running, and renders user text with `textContent` only.

## How to run the API client

1. Clone or download this folder.
2. Open `index.html` in a browser (no build step or server needed; an internet connection is required).
3. Click **Load notes** to fetch 10 notes, use the form to add a note, and click **Delete** on a note to remove it.

Note: JSONPlaceholder accepts POST and DELETE requests but does not save them, so created notes are kept in the page only until it is reloaded.

## Documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to build one reusable `request()` function that checks `response.ok` and throws, so every caller handles errors the same way with `try / catch / finally`.
- Why user text must go in with `textContent` and why input needs validation before it is sent.
- How REST design works: resources as nouns, correct HTTP methods and status codes (201, 204, 400, 401, 403, 404, 500), and consistent error bodies.
- How to model one-to-many and many-to-many relationships with a join table, and why an index such as `(user_id, created_at)` matches the main query.
- How to estimate load (reads/s, writes/s, storage) and how caches, replicas, queues and load balancers remove bottlenecks and single points of failure, each with trade-offs.