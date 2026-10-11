// =====================================================
// QuickNotes - Project 2 API Client (Solution)
// Practice API: JSONPlaceholder ("posts" are our notes)
// =====================================================
 
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;
 
// ---------- 1. Elements ----------
const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const list = document.querySelector("#notes-list");
const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
 
// ---------- 2. State ----------
let notes = [];
 
// ---------- 3. Reusable request helper ----------
// Sends a request, throws on HTTP errors, and returns the status + data.
async function request(url, options = {}) {
  const response = await fetch(url, options);
 
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
 
  // 204 No Content has no body, so there is nothing to parse
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data: data };
}
 
// ---------- 4. API functions (one per endpoint) ----------
async function getNotes() {
  const result = await request(`${API_URL}?_limit=10`);
  return result.data;
}
 
async function createNote(title, body) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title, body: body, userId: 1 }),
  });
}
 
async function deleteNoteOnServer(id) {
  return request(`API_U RL/{id}`, { method: "DELETE" });
}
 
// ---------- 5. UI helpers ----------
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = `status status-${type}`;
}
 
function createNoteElement(note) {
  const li = document.createElement("li");
  li.classList.add("note");
 
  const title = document.createElement("h3");
  title.textContent = note.title;
 
  const body = document.createElement("p");
  body.textContent = note.body || "(no details)";
 
  const del = document.createElement("button");
  del.type = "button";
  del.classList.add("delete-btn");
  del.textContent = "Delete";
  del.addEventListener("click", () => handleDelete(note, del));
 
  li.append(title, body, del);
  return li;
}
 
function render() {
  list.innerHTML = "";
 
  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("empty");
    empty.textContent = "No notes to show. Load notes or create one.";
    list.appendChild(empty);
    return;
  }
 
  notes.forEach((note) => list.appendChild(createNoteElement(note)));
}
 
function validateTitle(title) {
  if (title === "") return "Please enter a title.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }
  return "";
}
 
// ---------- 6. Handlers ----------
async function handleLoad() {
  setStatus("Loading notes...", "info");
  loadBtn.disabled = true;
 
  try {
    notes = await getNotes();
    render();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not load notes. Check your connection.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}
 
async function handleCreate(event) {
  event.preventDefault();
 
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const error = validateTitle(title);
 
  if (error) {
    setStatus(error, "error");
    titleInput.focus();
    return;
  }
 
  setStatus("Saving note...", "info");
  submitBtn.disabled = true;
 
  try {
    const result = await createNote(title, body);
    const created = result.data;
 
    // JSONPlaceholder does not really save new notes and always returns
    // id 101. We keep the server's id for display, but mark the note as
    // "local" and give it a unique localId so each one can be deleted.
    const note = { ...created, localId: Date.now(), isLocal: true };
 
    notes.unshift(note);
    render();
    setStatus(
      `Note created (status ${result.status}, id ${created.id}).`,
      "success"
    );
    form.reset();
  } catch (error) {
    console.error(error);
    setStatus("Could not create the note. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}
 
async function handleDelete(note, button) {
  button.disabled = true;
  setStatus("Deleting note...", "info");
 
  try {
    // Notes created while the page is open were never really stored by the
    // practice API, so there is nothing to delete on the server.
    // A real API would store them, and we would always send DELETE.
    if (!note.isLocal) {
      await deleteNoteOnServer(note.id);
    }
 
    notes = notes.filter((n) =>
      note.isLocal ? n.localId !== note.localId : n.id !== note.id
    );
    render();
    setStatus("Note deleted.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Could not delete the note. Please try again.", "error");
    button.disabled = false; // let the user try again
  }
}
 
// ---------- 7. Wire up events and first render ----------
loadBtn.addEventListener("click", handleLoad);
form.addEventListener("submit", handleCreate);
render();