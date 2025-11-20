# TinyLink — Minimal URL Shortener

TinyLink is a small URL shortener built with:
- Node.js + Express (ES modules)
- Prisma ORM
- PostgreSQL (Neon recommended)
- Plain HTML, CSS and vanilla JavaScript (responsive UI)

Features:
- Create short links (auto-generated or custom 6–8 alphanumeric codes)
- Validation & normalization (auto-prepend `https://` for domain-like inputs)
- Tracks `clicks`, `created_at`, `last_clicked`
- List, search, sort, copy-to-clipboard, open, delete
- Prevents shortening the same host (to avoid redirect loops)
- `/healthz` endpoint for health checks

---

## Repository layout (Minimal JS structure)

.
├─ package.json
├─ server.js
├─ prisma/
│ └─ schema.prisma
├─ src/
│ └─ db.js
├─ public/
│ ├─ index.html
│ ├─ code.html
│ ├─ js/
│ │ ├─ main.js
│ │ └─ code.js
│ └─ css/
│ └─ styles.css
└─ .env.example


---

## Quick local run (development)

> Tested on Node 18+. Use the version your environment supports.

1. Clone the repo (or work from folder):

```bash
git clone <your-repo-url> tinylink
cd tinylink
![Uploading image.png…]()
