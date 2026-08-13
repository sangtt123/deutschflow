import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import { getExpandedVocabularies } from "./server/vocabularies.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// In-Memory / JSON File Database Persistence for Web Preview
const DATA_FILE = path.join(__dirname, "data_web.json");

interface VocabularyItem {
  id: number;
  word: string;
  article: string;
  meaning: string;
  example_de: string;
  example_vi: string;
  level: string;
  category: string;
  favorite: boolean;
  review_count: number;
  created_at: string;
}

interface AppSettings {
  interval_minutes: number;
  delay_before_translation: number;
  voice_de: string;
  voice_vi: string;
  volume: number;
  speech_rate?: number;
  random_mode: boolean;
  playback_mode: string;
  prefer_cloud_tts?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  interval_minutes: 3,
  delay_before_translation: 3,
  voice_de: "de-DE-KillianNeural",
  voice_vi: "vi-VN-HoaiMyNeural",
  volume: 80,
  speech_rate: 0.75,
  random_mode: true,
  playback_mode: "German → Vietnamese",
  prefer_cloud_tts: true
};

const rawSeedList = getExpandedVocabularies();
const INITIAL_VOCABULARY: VocabularyItem[] = rawSeedList.map((item, index) => ({
  id: index + 1,
  word: item.word,
  article: item.article,
  meaning: item.meaning,
  example_de: item.example_de,
  example_vi: item.example_vi,
  level: item.level,
  category: item.category,
  favorite: index % 5 === 0,
  review_count: Math.floor(Math.random() * 10),
  created_at: "2026-08-01"
}));

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.vocabularies)) {
        parsed.vocabularies = INITIAL_VOCABULARY;
        saveData(parsed);
      }
      return parsed;
    } catch (e) {
      console.error("Error reading web data:", e);
    }
  }
  const initial = { vocabularies: INITIAL_VOCABULARY, settings: DEFAULT_SETTINGS, recent_ids: [] as number[] };
  saveData(initial);
  return initial;
}

function saveData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing web data:", e);
  }
}

// REST API Endpoints
app.get("/api/vocabulary", (req, res) => {
  const { level, category, search } = req.query;
  const db = loadData();
  let list: VocabularyItem[] = db.vocabularies;

  if (level && level !== "Tất cả") {
    list = list.filter(v => v.level === level);
  }
  if (category && category !== "Tất cả") {
    list = list.filter(v => v.category === category);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    list = list.filter(v => 
      v.word.toLowerCase().includes(q) ||
      v.meaning.toLowerCase().includes(q) ||
      v.example_de.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post("/api/vocabulary", (req, res) => {
  const db = loadData();
  const newItem: VocabularyItem = {
    id: Date.now(),
    word: req.body.word || "",
    article: req.body.article || "",
    meaning: req.body.meaning || "",
    example_de: req.body.example_de || "",
    example_vi: req.body.example_vi || "",
    level: req.body.level || "A1",
    category: req.body.category || "Daily Life",
    favorite: !!req.body.favorite,
    review_count: 0,
    created_at: new Date().toISOString().split("T")[0]
  };
  db.vocabularies.unshift(newItem);
  saveData(db);
  res.json(newItem);
});

app.put("/api/vocabulary/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadData();
  const index = db.vocabularies.findIndex((v: VocabularyItem) => v.id === id);
  if (index !== -1) {
    db.vocabularies[index] = { ...db.vocabularies[index], ...req.body, id };
    saveData(db);
    res.json(db.vocabularies[index]);
  } else {
    res.status(404).json({ error: "Vocabulary not found" });
  }
});

app.delete("/api/vocabulary/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadData();
  db.vocabularies = db.vocabularies.filter((v: VocabularyItem) => v.id !== id);
  saveData(db);
  res.json({ success: true, id });
});

app.post("/api/vocabulary/delete-batch", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "ids must be an array" });
  }
  const idSet = new Set(ids.map(Number));
  const db = loadData();
  const initialLength = db.vocabularies.length;
  db.vocabularies = db.vocabularies.filter((v: VocabularyItem) => !idSet.has(v.id));
  saveData(db);
  res.json({ success: true, deletedCount: initialLength - db.vocabularies.length });
});

app.post("/api/vocabulary/:id/favorite", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadData();
  const item = db.vocabularies.find((v: VocabularyItem) => v.id === id);
  if (item) {
    item.favorite = !item.favorite;
    saveData(db);
    res.json(item);
  } else {
    res.status(404).json({ error: "Vocabulary not found" });
  }
});

app.post("/api/vocabulary/:id/review", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadData();
  const item = db.vocabularies.find((v: VocabularyItem) => v.id === id);
  if (item) {
    item.review_count = (item.review_count || 0) + 1;
    saveData(db);
    res.json(item);
  } else {
    res.status(404).json({ error: "Vocabulary not found" });
  }
});

// Smart Random Selection Endpoint
app.get("/api/vocabulary/smart-random", (req, res) => {
  const { level, category } = req.query;
  const db = loadData();
  let list: VocabularyItem[] = db.vocabularies;

  if (level && level !== "Tất cả") {
    list = list.filter(v => v.level === level);
  }
  if (category && category !== "Tất cả") {
    list = list.filter(v => v.category === category);
  }

  if (list.length === 0) {
    return res.status(404).json({ error: "No vocabulary matches filter" });
  }

  // Filter out recent IDs
  let available = list.filter(v => !db.recent_ids.includes(v.id));
  if (available.length === 0) {
    db.recent_ids = [];
    available = list;
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  db.recent_ids.push(selected.id);
  if (db.recent_ids.length > 10) db.recent_ids.shift();

  // Increment review count
  selected.review_count = (selected.review_count || 0) + 1;
  saveData(db);

  res.json(selected);
});

// Settings API
app.get("/api/settings", (req, res) => {
  const db = loadData();
  res.json(db.settings);
});

app.post("/api/settings", (req, res) => {
  const db = loadData();
  db.settings = { ...db.settings, ...req.body };
  saveData(db);
  res.json(db.settings);
});

// High Quality Cloud Audio TTS Proxy Endpoint (for native German and Vietnamese pronunciation)
app.get("/api/tts", async (req, res) => {
  const { text, lang } = req.query;
  if (!text || typeof text !== "string") {
    return res.status(400).send("Text parameter is required");
  }

  const langCode = (typeof lang === "string" ? lang : "de").split("-")[0].toLowerCase();
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return res.status(500).send("TTS Upstream Service Error");
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("TTS Proxy error:", err);
    res.status(500).send("Error generating TTS audio");
  }
});

// Reset / Re-seed Vocabulary Database Endpoint (Safely Merges by default)
app.post("/api/vocabulary/reset-seed", (req, res) => {
  const { mode } = req.body || {};
  const db = loadData();

  if (mode === "reset") {
    // Hard reset back to factory initial seed only
    db.vocabularies = [...INITIAL_VOCABULARY];
    saveData(db);
    return res.json({ status: "success", mode: "reset", count: INITIAL_VOCABULARY.length, vocabularies: INITIAL_VOCABULARY });
  }

  // Default mode: Safely MERGE missing seed items into existing vocabularies without deleting imported items
  const existingKeys = new Set(
    db.vocabularies.map((v: VocabularyItem) => `${(v.article || "").toLowerCase().trim()} ${(v.word || "").toLowerCase().trim()}`)
  );

  let maxId = db.vocabularies.reduce((max: number, v: VocabularyItem) => Math.max(max, v.id || 0), 0);
  let addedCount = 0;

  INITIAL_VOCABULARY.forEach((seed) => {
    const key = `${(seed.article || "").toLowerCase().trim()} ${(seed.word || "").toLowerCase().trim()}`;
    if (!existingKeys.has(key)) {
      maxId++;
      existingKeys.add(key);
      addedCount++;
      db.vocabularies.push({
        ...seed,
        id: maxId
      });
    }
  });

  saveData(db);
  res.json({
    status: "success",
    mode: "merge",
    added_count: addedCount,
    total: db.vocabularies.length,
    vocabularies: db.vocabularies
  });
});

// Bulk Import Vocabulary Endpoint (from Excel / CSV)
app.post("/api/vocabulary/import", (req, res) => {
  try {
    const { items, mode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const db = loadData();
    const nowStr = new Date().toISOString().split("T")[0];
    let maxId = db.vocabularies.reduce((max: number, v: VocabularyItem) => Math.max(max, v.id || 0), 0);

    const formattedItems: VocabularyItem[] = items.map((item: any) => {
      maxId++;
      return {
        id: maxId,
        word: String(item.word || "").trim(),
        article: String(item.article || "").trim(),
        meaning: String(item.meaning || "").trim(),
        example_de: String(item.example_de || "").trim(),
        example_vi: String(item.example_vi || "").trim(),
        level: String(item.level || "A1").trim(),
        category: String(item.category || "General").trim(),
        favorite: false,
        review_count: 0,
        created_at: nowStr
      };
    });

    if (mode === "replace") {
      db.vocabularies = formattedItems;
    } else {
      // Append at beginning
      db.vocabularies = [...formattedItems, ...db.vocabularies];
    }

    saveData(db);
    res.json({ status: "success", added_count: formattedItems.length, total: db.vocabularies.length });
  } catch (err: any) {
    console.error("Error importing vocabulary:", err);
    res.status(500).json({ error: err?.message || "Internal server error during import" });
  }
});

// Statistics API
app.get("/api/statistics", (req, res) => {
  const db = loadData();
  const list: VocabularyItem[] = db.vocabularies;
  const total = list.length;
  const favorites = list.filter(v => v.favorite).length;
  const total_reviews = list.reduce((acc, v) => acc + (v.review_count || 0), 0);

  const levels: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
  list.forEach(v => {
    if (levels[v.level] !== undefined) levels[v.level]++;
  });

  res.json({ total, favorites, total_reviews, levels });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
