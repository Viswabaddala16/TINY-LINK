// public/js/code.js
const lookupForm = document.querySelector("#lookupForm");
const lookupBtn = document.querySelector("#lookupBtn");
const lookupMessage = document.querySelector("#lookupMessage");
const statusBoxCode = document.querySelector("#statusBoxCode");
const resultBox = document.querySelector("#result");

function showStatusCode(type, msg) {
  statusBoxCode.className = `status ${type}`;
  statusBoxCode.textContent = msg;
  statusBoxCode.style.display = "block";
  setTimeout(() => (statusBoxCode.style.display = "none"), type === "error" ? 4000 : 2000);
}

lookupForm.onsubmit = async (e) => {
  e.preventDefault();
  const code = document.querySelector("#lookupCode").value.trim();
  if (!/^[A-Za-z0-9]{6,8}$/.test(code)) {
    lookupMessage.textContent = "Code must be 6–8 alphanumeric characters";
    return;
  }
  lookupMessage.textContent = "";
  lookupBtn.disabled = true;
  lookupBtn.textContent = "Looking...";

  try {
    const res = await fetch(`/api/links/${code}`);
    lookupBtn.disabled = false;
    lookupBtn.textContent = "Lookup";

    if (res.status === 404) {
      resultBox.innerHTML = `<p class="muted">Not found</p>`;
      return;
    }

    const data = await res.json();
    resultBox.innerHTML = `
      <p><strong>URL:</strong> <a href="${data.url}" target="_blank" rel="noopener">${data.url}</a></p>
      <p><strong>Clicks:</strong> ${data.clicks}</p>
      <p><strong>Created:</strong> ${new Date(data.created_at).toLocaleString()}</p>
      <p><strong>Last clicked:</strong> ${data.last_clicked ? new Date(data.last_clicked).toLocaleString() : "-"}</p>
      <div style="margin-top:12px;"><button class="btn" onclick="window.open('/${data.code}','_blank')">Open Redirect</button></div>
    `;
  } catch (err) {
    console.error("lookup error:", err);
    lookupBtn.disabled = false;
    lookupBtn.textContent = "Lookup";
    showStatusCode("error", "Network error");
  }
};
