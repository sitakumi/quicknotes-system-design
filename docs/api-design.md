In Markdown, a table is written with | separators, and indenting lines by 4 spaces turns them into a code block (used here for JSON examples).
docs/api-design.md   (markdown)
# QuickNotes API Design
 
Base URL: `https://api.quicknotes.com/v1`
All requests and responses use JSON. Every request (except sign-up and
login) must include the header `Authorization: Bearer <token>` so the
server knows which user is making it. Users can only access their own notes.
 
## Endpoints
 
| Method | Path                | Description                         | Success |
|--------|---------------------|-------------------------------------|---------|
| POST   | /auth/signup        | Create an account                   | 201     |
| POST   | /auth/login         | Log in, returns a token             | 200     |
| GET    | /notes              | List my notes (newest first)        | 200     |
| GET    | /notes?search=&category=&page= | Filter, search and paginate | 200  |
| GET    | /notes/{id}         | Get one note                        | 200     |
| POST   | /notes              | Create a note                       | 201     |
| PATCH  | /notes/{id}         | Update a note's text/category/tags  | 200     |
| DELETE | /notes/{id}         | Delete a note                       | 204     |
 
## Example: create a note
 
Request: `POST /notes`
 
    {
      "text": "Revise HTTP status codes",
      "category": "study",
      "tags": ["exams"]
    }
 
Response: `201 Created`
 
    {
      "id": 42,
      "text": "Revise HTTP status codes",
      "category": "study",
      "tags": ["exams"],
      "createdAt": "2026-09-22T09:15:00Z",
      "updatedAt": "2026-09-22T09:15:00Z"
    }
 
## Example: list notes
 
Request: `GET /notes?category=study&page=1`
 
Response: `200 OK`
 
    {
      "data": [
        { "id": 42, "text": "Revise HTTP status codes",
          "category": "study", "tags": ["exams"],
          "createdAt": "2026-09-22T09:15:00Z" }
      ],
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
 
Lists are **paginated** (returned in pages of 20) so a user with
thousands of notes does not receive them all at once.
 
## Validation rules
 
- `text` is required and must be 1-200 characters.
- `category` must be one of `personal`, `work`, `study`.
- `tags` is optional: an array of up to 5 strings.
 
## Errors
 
Every error returns the same JSON shape:
 
    { "error": { "code": "VALIDATION_ERROR",
                 "message": "Text must be 1-200 characters." } }
 
| Status | When it happens                                   |
|--------|---------------------------------------------------|
| 400    | Invalid data (e.g. empty text, unknown category)  |
| 401    | Missing or invalid login token                    |
| 403    | Trying to access another user's note              |
| 404    | Note does not exist                               |
| 429    | Too many requests (limit: 100 per minute)         |
| 500    | Unexpected server error                           |
