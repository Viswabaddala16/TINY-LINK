// public/js/main.js
const tbody = document.querySelector("#linksTable tbody");
const searchInput = document.querySelector("#searchInput");
const statusBox = document.querySelector("#statusBox");
const createBtn = document.querySelector("#createBtn");
const formMessage = document.querySelector("#formMessage");
const emptyState = document.querySelector("#emptyState");
const tableInfo = document.querySelector("#tableInfo");

let allLinks = [];
let sortState = { key: null, dir: 1 };

/* --- helpers --- */
function showStatus(type, msg) {
  statusBox.className = `status ${type}`;
  statusBox.textContent = msg;
  statusBox.style.display = "block";
  setTimeout(() => (statusBox.style.display = "none"), type === "error" ? 4000 : 2000);
}

function showInlineMessage(msg) {
  formMessage.className = "form-error";
  formMessage.textContent = msg;
  setTimeout(() => {
    // keep message for 3.5s then clear
    if (formMessage.className === "form-error") formMessage.textContent = "";
  }, 3500);
}

function truncate(text, n = 50) {
  return text.length > n ? text.slice(0, n) + "..." : text;
}

/* --- fetch and render --- */
async function loadLinks() {
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  emptyState.style.display = "none";
  try {
    const res = await fetch("/api/links");
    allLinks = await res.json();

    if (!Array.isArray(allLinks) || allLinks.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      tableInfo.textContent = "";
      return;
    }

    tableInfo.textContent = `${allLinks.length} links`;
    renderTable(allLinks);
  } catch (err) {
    console.error("loadLinks error:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="muted">Failed to load links</td></tr>`;
  }
}

function renderTable(rows) {
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const shortUrl = `${location.origin}/${row.code}`;
    tbody.innerHTML += `
      <tr>
        <td class="mono">${row.code}</td>
        <td><span title="${row.url}">${truncate(row.url, 45)}</span></td>
        <td>${row.clicks}</td>
        <td>${new Date(row.created_at).toLocaleString()}</td>
        <td>${row.last_clicked ? new Date(row.last_clicked).toLocaleString() : "-"}</td>
        <td>
          <button class="btn copy-btn" data-url="${shortUrl}">Copy</button>
          <button class="btn" onclick="window.open('${shortUrl}','_blank')">Open</button>
          <button class="btn delete-btn" data-code="${row.code}">Delete</button>
        </td>
      </tr>
    `;
  });

  attachButtonHandlers();
}

/* --- search/filter --- */
searchInput?.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();
  const filtered = allLinks.filter(
    (l) => l.code.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

/* --- sorting --- */
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortState.key === key) sortState.dir *= -1;
    else { sortState.key = key; sortState.dir = 1; }

    const sorted = [...allLinks].sort((a, b) => {
      if (key === "code") {
        return a.code.localeCompare(b.code) * sortState.dir;
      } else if (key === "clicks") {
        return (a.clicks - b.clicks) * sortState.dir;
      }
      return 0;
    });
    renderTable(sorted);
    document.querySelectorAll(".sort-indicator").forEach(s => s.textContent = "");
    th.querySelector(".sort-indicator").textContent = sortState.dir === 1 ? "▲" : "▼";
  });
});

/* --- attach buttons --- */
function attachButtonHandlers() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.url);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch {
        showStatus("error", "Copy failed (clipboard unavailable).");
      }
    };
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm(`Delete ${btn.dataset.code}?`)) return;
      try {
        const res = await fetch(`/api/links/${btn.dataset.code}`, { method: "DELETE" });
        if (res.ok) {
          showStatus("success", "Deleted successfully");
          loadLinks();
        } else {
          const b = await res.json().catch(() => ({}));
          showStatus("error", b.error || "Delete failed");
        }
      } catch {
        showStatus("error", "Network error");
      }
    };
  });
}

/* --- create form: inline validation and submit state --- */
const form = document.querySelector("#createForm");
const urlInput = document.querySelector("#urlInput");
const codeInput = document.querySelector("#codeInput");

function clientValidate(url, code) {
  try {
    const u = new URL(url);
    if (!u.hostname || !u.hostname.includes(".")) return "Enter a valid URL (domain required)";
    if (!["http:", "https:"].includes(u.protocol)) return "URL must start with http:// or https://";
  } catch {
    return "Enter a valid URL";
  }

  if (code) {
    if (!/^[A-Za-z0-9]{6,8}$/.test(code)) {
      return "Custom code must be 6–8 alphanumeric characters";
    }
  }
  return null;
}

form.onsubmit = async (e) => {
  e.preventDefault();

  const url = urlInput.value.trim();
  const code = codeInput.value.trim();

  const err = clientValidate(url, code);
  if (err) {
    showInlineMessage(err);
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Creating...";
  showStatus("loading", "Creating link...");

  try {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, code: code || undefined })
    });

    createBtn.disabled = false;
    createBtn.textContent = "Create";

    if (res.status === 201) {
      showStatus("success", "Link created successfully");
      form.reset();
      loadLinks();
    } else if (res.status === 409) {
      const b = await res.json().catch(() => ({}));
      showInlineMessage(b.error || "Custom code already exists");
    } else if (res.status === 400) {
      const b = await res.json().catch(() => ({}));
      showInlineMessage(b.error || "Invalid input");
    } else {
      const b = await res.json().catch(() => ({}));
      showInlineMessage(b.error || "Create failed");
    }
  } catch (err) {
    createBtn.disabled = false;
    createBtn.textContent = "Create";
    showInlineMessage("Network error");
  }
};

/* --- initial load --- */
loadLinks();
