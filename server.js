import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import db from "./src/db.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------------------------
   URL Normalization (server-side)
--------------------------------------------------- */
function normalizeServerUrl(raw) {
  if (!raw) return null;

  const t = raw.trim();

  // Reject bare "http" or "https"
  if (/^https?:?$/i.test(t)) return null;

  // Already valid protocol
  if (/^https?:\/\//i.test(t)) return t;

  // Looks like domain.com or www.domain.com → add https://
  if (/^[^\s]+\.[^\s]+$/.test(t)) {
    return "https://" + t;
  }

  return null;
}

/* ---------------------------------------------------
   Validate URL After Normalization
--------------------------------------------------- */
function isValidUrlForServer(url, req) {
  try {
    const u = new URL(url);

    // Must be a real domain (contain a dot)
    if (!u.hostname || !u.hostname.includes(".")) return false;

    // Prevent shortening own domain (avoid redirect loops)
    const requestHost = req.headers.host?.split(":")[0];
    if (requestHost && u.hostname === requestHost) return false;

    // Only HTTP/HTTPS allowed
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------
   Code format: 6–8 alphanumeric characters
--------------------------------------------------- */
function validateCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

/* ---------------------------------------------------
   HEALTH CHECK (Required)
--------------------------------------------------- */
app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true, version: "1.0" });
});

/* ---------------------------------------------------
   CREATE LINK (POST /api/links)
--------------------------------------------------- */
app.post("/api/links", async (req, res) => {
  try {
    let { url, code } = req.body;

    // Normalize incoming URL
    const normalized = normalizeServerUrl(url);
    if (!normalized || !isValidUrlForServer(normalized, req)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    url = normalized;

    // Empty custom code → undefined
    if (code === "") code = undefined;

    if (code) {
      // Validate custom code
      if (!validateCode(code)) {
        return res.status(400).json({
          error: "Code must match [A-Za-z0-9]{6,8}",
        });
      }

      // Ensure code is unique
      const exists = await db.getByCode(code);
      if (exists) {
        return res.status(409).json({ error: "Code already exists" });
      }
    } else {
      // Auto-generate code (6 chars)
      code = nanoid(6);
    }

    // Save to DB
    const created = await db.createLink(code, url);
    return res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/links error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------------
   LIST ALL LINKS (GET /api/links)
--------------------------------------------------- */
app.get("/api/links", async (req, res) => {
  try {
    const links = await db.listAll();
    res.json(links);
  } catch (err) {
    console.error("GET /api/links error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------------
   GET STATS FOR 1 CODE (GET /api/links/:code)
--------------------------------------------------- */
app.get("/api/links/:code", async (req, res) => {
  try {
    const link = await db.getByCode(req.params.code);
    if (!link) return res.status(404).json({ error: "Not found" });
    res.json(link);
  } catch (err) {
    console.error("GET /api/links/:code error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------------------------------------
   DELETE LINK (DELETE /api/links/:code)
--------------------------------------------------- */
app.delete("/api/links/:code", async (req, res) => {
  try {
    await db.deleteByCode(req.params.code);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/links/:code error:", err);
    res.status(404).json({ error: "Not found" });
  }
});

/* ---------------------------------------------------
   STATS PAGE (GET /code/:code)
--------------------------------------------------- */
app.get("/code/:code", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "code.html"));
});

/* ---------------------------------------------------
   REDIRECT HANDLER (GET /:code)
--------------------------------------------------- */
app.get("/:code", async (req, res, next) => {
  const code = req.params.code;

  // Avoid collisions with internal routes
  if (code.startsWith("api") || code === "healthz" || code === "code") {
    return next();
  }

  try {
    const link = await db.getByCode(code);
    if (!link) return res.status(404).send("Not found");

    await db.incrementClick(code);

    return res.redirect(302, link.url);
  } catch (err) {
    console.error("REDIRECT error:", err);
    return res.status(500).send("Server error");
  }
});

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TinyLink running on port ${PORT}`);
});
