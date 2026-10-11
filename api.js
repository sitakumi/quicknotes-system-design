// QuickNotes API client (practice backend: JSONPlaceholder)
const API_URL = "https://jsonplaceholder.typicode.com/posts?_limit=10";

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("notes-list");

// ---- API ----
async function fetchNotes() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Server responded with status " + response.status);
  }
  return response.json();
}

// ---- UI helpers ----
function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

function renderNotes(notes) {
  listEl.innerHTML = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No notes yet. Nothing to show.";
    listEl.appendChild(empty);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note";

    const title = document.createElement("h2");
    title.textContent = note.title;   // textContent: safe against injected HTML

    const body = document.createElement("p");
    body.textContent = note.body;

    item.append(title, body);
    listEl.appendChild(item);
  });
}

// ---- Main flow ----
async function handleLoadNotes() {
  loadBtn.disabled = true;
  listEl.innerHTML = "";
  setStatus("Loading notes...", "loading");

  try {
    const notes = await fetchNotes();
    renderNotes(notes);
    if (notes.length === 0) {
      setStatus("The server has no notes right now.", "");
    } else {
      setStatus("Loaded " + notes.length + " notes from the server.", "success");
    }
  } catch (err) {
    console.error("Failed to load notes:", err);
    setStatus("Sorry, we couldn't load your notes. Please check your connection and try again.", "error");
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", handleLoadNotes);