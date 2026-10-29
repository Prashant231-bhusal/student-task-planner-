/* =========================================================
   Smart Student Task Planner - script.js
   Plain JavaScript, tasks saved in localStorage.
   ========================================================= */

const STORAGE_KEY = "smartStudentTasks";

// ---------- Supabase (online database) ----------
// The publishable key is safe to use in browser code.
const SUPABASE_URL = "https://fwlqaowkcssajymclofn.supabase.co";
const SUPABASE_KEY = "sb_publishable_vmxkwiQIjPKi4ORRRYjnyQ_8n7s4UkN";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let online = false; // becomes true when Supabase loads successfully

// Convert between the app's task format and the database row format
function toRow(t) {
  return { id: t.id, title: t.title, subject: t.subject, type: t.type, due_date: t.dueDate, priority: t.priority, notes: t.notes, completed: t.completed };
}
function fromRow(r) {
  return { id: Number(r.id), title: r.title, subject: r.subject, type: r.type, dueDate: r.due_date, priority: r.priority, notes: r.notes || "", completed: r.completed };
}

// Save one task (new or edited) to Supabase
async function dbSave(task) {
  if (!online) return;
  const { error } = await db.from("tasks").upsert(toRow(task));
  if (error) showToast("Could not save online: " + error.message);
}

// Delete one task from Supabase
async function dbDelete(id) {
  if (!online) return;
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) showToast("Could not delete online: " + error.message);
}

// ---------- Study tips ----------
const tips = [
  "Use the Pomodoro technique: 25 minutes of focus, then a 5-minute break.",
  "Teach a topic to a friend — explaining it is the best way to learn it.",
  "Start with the hardest task while your mind is fresh.",
  "Review your notes within 24 hours to remember them much better.",
  "Put your phone in another room while studying.",
  "Break big projects into small steps with their own deadlines.",
  "Sleep well before exams — your brain stores memories while you sleep.",
  "Practise with past exam papers to know what to expect."
];
let tipIndex = Math.floor(Math.random() * tips.length);

// ---------- App state ----------
let tasks = [];
let currentFilter = "all";

// ---------- Helper functions ----------

// Today's date as "YYYY-MM-DD" (local time)
function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Date N days from today as "YYYY-MM-DD"
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// A task is overdue if it is not completed and its due date has passed
function isOverdue(task) {
  return !task.completed && task.dueDate < todayStr();
}

// Format "2026-10-29" as "29 Oct 2026"
function formatDate(str) {
  return new Date(str + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

// Prevent HTML injection when displaying user text
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Show a small popup message at the bottom
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---------- localStorage ----------
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

async function loadTasks() {
  // 1. Try to load tasks from Supabase
  if (db) {
    const { data, error } = await db.from("tasks").select("*");
    if (!error) {
      online = true;
      if (data.length > 0 || localStorage.getItem(STORAGE_KEY) !== null) {
        tasks = data.map(fromRow);
        saveTasks();
        return;
      }
    } else {
      console.warn("Supabase unavailable, using browser storage:", error.message);
      showToast("Offline mode: saving in this browser only");
    }
  }
  // 2. Fallback / first launch: browser storage + sample tasks
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) {
    tasks = JSON.parse(saved);
  } else {
    // First launch: add sample tasks for demonstration
    tasks = [
      { id: Date.now() + 1, title: "DBMS Assignment 2", subject: "Database Systems", type: "Assignment", dueDate: daysFromToday(2), priority: "High", notes: "ER diagram + normalization", completed: false },
      { id: Date.now() + 2, title: "Calculus Mid-Term", subject: "Mathematics", type: "Exam", dueDate: daysFromToday(6), priority: "High", notes: "Chapters 1–4", completed: false },
      { id: Date.now() + 3, title: "Physics Lab Report", subject: "Physics", type: "Homework", dueDate: daysFromToday(-1), priority: "Medium", notes: "", completed: false },
      { id: Date.now() + 4, title: "Web Dev Mini Project", subject: "Web Technologies", type: "Project", dueDate: daysFromToday(12), priority: "Medium", notes: "Build a task planner", completed: false },
      { id: Date.now() + 5, title: "Read Chapter 5", subject: "English Literature", type: "Other", dueDate: daysFromToday(-3), priority: "Low", notes: "", completed: true }
    ];
    saveTasks();
    if (online) await db.from("tasks").insert(tasks.map(toRow));
  }
}

// ---------- Dashboard statistics & progress ----------
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(isOverdue).length;
  const pending = total - completed;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statCompleted").textContent = completed;
  document.getElementById("statOverdue").textContent = overdue;

  // Completion Percentage = (Completed Tasks / Total Tasks) × 100
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressPercent").textContent = percent + "%";

  let message;
  if (total === 0) message = "Add your first task to get started! 🚀";
  else if (percent === 100) message = "Amazing! All tasks done! 🎉";
  else if (percent >= 75) message = "Almost there! You're doing brilliantly! 🌟";
  else if (percent >= 50) message = "Great job! Keep going! 💪";
  else if (percent >= 25) message = "Good start! Stay consistent! 📚";
  else message = "Every step counts. Let's begin! ✨";
  document.getElementById("motivation").textContent = message;
}

// ---------- Render task list ----------
function renderTasks() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const sortBy = document.getElementById("sort").value;
  const priorityRank = { High: 1, Medium: 2, Low: 3 };

  // 1. Search
  let list = tasks.filter(t =>
    t.title.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query)
  );

  // 2. Filter
  if (currentFilter === "pending") list = list.filter(t => !t.completed);
  if (currentFilter === "completed") list = list.filter(t => t.completed);
  if (currentFilter === "overdue") list = list.filter(isOverdue);
  if (currentFilter === "high") list = list.filter(t => t.priority === "High");

  // 3. Sort
  list.sort((a, b) => {
    if (sortBy === "dateAsc") return a.dueDate.localeCompare(b.dueDate);
    if (sortBy === "dateDesc") return b.dueDate.localeCompare(a.dueDate);
    return priorityRank[a.priority] - priorityRank[b.priority] || a.dueDate.localeCompare(b.dueDate);
  });

  const container = document.getElementById("taskList");
  if (list.length === 0) {
    container.innerHTML = `<div class="empty">📭 No tasks found.</div>`;
    return;
  }

  container.innerHTML = list.map(task => {
    const overdue = isOverdue(task);
    let status = `<span class="tag status-pending">Pending</span>`;
    if (task.completed) status = `<span class="tag status-done">Completed</span>`;
    else if (overdue) status = `<span class="tag status-overdue">Overdue</span>`;

    return `
      <div class="task p-${task.priority} ${overdue ? "is-overdue" : ""} ${task.completed ? "is-done" : ""}">
        <div>
          <div class="task-title">${escapeHTML(task.title)}</div>
          <div class="meta">
            <span class="tag">📖 ${escapeHTML(task.subject)}</span>
            <span class="tag type">${task.type}</span>
            <span class="tag">📅 ${formatDate(task.dueDate)}</span>
            <span class="tag ${task.priority}">${task.priority} Priority</span>
            ${status}
          </div>
          ${task.notes ? `<p class="notes">📝 ${escapeHTML(task.notes)}</p>` : ""}
        </div>
        <div class="actions">
          <button class="icon-btn" title="${task.completed ? "Mark as pending" : "Mark as completed"}" onclick="toggleComplete(${task.id})">${task.completed ? "↩️" : "✔️"}</button>
          <button class="icon-btn" title="Edit task" onclick="editTask(${task.id})">✏️</button>
          <button class="icon-btn" title="Delete task" onclick="deleteTask(${task.id})">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

// Refresh everything on screen
function refresh() {
  updateStats();
  renderTasks();
}

// ---------- Task actions ----------
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  task.completed = !task.completed;
  saveTasks();
  dbSave(task);
  refresh();
  showToast(task.completed ? "Task completed! Well done 🎉" : "Task marked as pending");
}

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  dbDelete(id);
  refresh();
  showToast("Task deleted 🗑️");
}

// Fill the form with the task so the user can edit it
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  document.getElementById("taskId").value = task.id;
  document.getElementById("title").value = task.title;
  document.getElementById("subject").value = task.subject;
  document.getElementById("type").value = task.type;
  document.getElementById("priority").value = task.priority;
  document.getElementById("dueDate").value = task.dueDate;
  document.getElementById("notes").value = task.notes;
  document.getElementById("formTitle").textContent = "✏️ Edit Task";
  document.getElementById("submitBtn").textContent = "Save Changes";
  document.getElementById("cancelEdit").classList.remove("hidden");
  document.getElementById("taskForm").scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  document.getElementById("taskForm").reset();
  document.getElementById("taskId").value = "";
  document.getElementById("priority").value = "Medium";
  document.getElementById("formTitle").textContent = "➕ Add New Task";
  document.getElementById("submitBtn").textContent = "Add Task";
  document.getElementById("cancelEdit").classList.add("hidden");
  clearErrors();
}

// ---------- Form validation ----------
function setError(inputId, errorId, message) {
  document.getElementById(inputId).classList.add("invalid");
  document.getElementById(errorId).textContent = message;
}

function clearErrors() {
  ["title", "subject", "dueDate"].forEach(id => document.getElementById(id).classList.remove("invalid"));
  ["errTitle", "errSubject", "errDate"].forEach(id => (document.getElementById(id).textContent = ""));
}

function handleSubmit(event) {
  event.preventDefault();
  clearErrors();

  const title = document.getElementById("title").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const dueDate = document.getElementById("dueDate").value;
  let valid = true;

  if (!title) { setError("title", "errTitle", "Please enter a task title."); valid = false; }
  if (!subject) { setError("subject", "errSubject", "Please enter a subject name."); valid = false; }
  if (!dueDate) { setError("dueDate", "errDate", "Please choose a due date."); valid = false; }
  if (!valid) { showToast("Please fill in all required fields ⚠️"); return; }

  const data = {
    title,
    subject,
    type: document.getElementById("type").value,
    priority: document.getElementById("priority").value,
    dueDate,
    notes: document.getElementById("notes").value.trim()
  };

  const editId = Number(document.getElementById("taskId").value);
  if (editId) {
    // Update existing task
    const task = tasks.find(t => t.id === editId);
    Object.assign(task, data);
    dbSave(task);
    showToast("Task updated successfully ✏️");
  } else {
    // Add new task
    const newTask = { id: Date.now(), completed: false, ...data };
    tasks.push(newTask);
    dbSave(newTask);
    showToast("Task added successfully! 🎉");
  }

  saveTasks();
  resetForm();
  refresh();
}

// ---------- Study tip ----------
function showNewTip() {
  let next;
  do { next = Math.floor(Math.random() * tips.length); } while (next === tipIndex);
  tipIndex = next;
  document.getElementById("tipText").textContent = tips[tipIndex];
}

// ---------- Start the app ----------
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  document.getElementById("tipText").textContent = tips[tipIndex];

  document.getElementById("taskForm").addEventListener("submit", handleSubmit);
  document.getElementById("cancelEdit").addEventListener("click", resetForm);
  document.getElementById("search").addEventListener("input", renderTasks);
  document.getElementById("sort").addEventListener("change", renderTasks);
  document.getElementById("newTipBtn").addEventListener("click", showNewTip);

  // Filter buttons
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.dataset.filter;
      renderTasks();
    });
  });

  await loadTasks();
  refresh();
});
