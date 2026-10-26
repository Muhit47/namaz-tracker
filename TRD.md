# Technical Requirements Document (TRD) - Namaz Tracker

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client (Browser / PWA)               │
│  Vanilla JavaScript (ES6+), CSS3 Variables, HTML5      │
│  Service Worker (sw.js) & Web App Manifest             │
│  localStorage (i18n, UI settings, cached prayer times) │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON REST
┌───────────────────────────▼────────────────────────────┐
│                    Flask Backend (server.py)           │
│  Python 3.10+, Flask >= 3.0.0                          │
│  REST API Routes (/api/prayers, /api/qaza, etc.)       │
│  External Hadith Service & Transliteration Engine      │
└───────────────────────────┬────────────────────────────┘
                            │ Native SQLite3 Driver
┌───────────────────────────▼────────────────────────────┐
│                 SQLite Database (namaz_tracker.db)     │
│  PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000;   │
│  14 relational tables (prayers_log, qaza_records, etc.)│
└────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack & Dependencies

### 2.1 Backend
- **Language**: Python 3.10+
- **Web Framework**: Flask >= 3.0.0
- **Database**: SQLite3 (Standard library `sqlite3`)
- **HTTP Client**: Standard library `urllib.request` (zero external HTTP dependencies like `requests`)
- **JSON Handling**: Standard library `json`

### 2.2 Frontend
- **Framework**: Zero-framework Vanilla JavaScript (modular architecture across `app.js`, `i18n.js`, `guide_content.js`).
- **Styling**: Vanilla CSS3 using custom properties (CSS variables), Flexbox, CSS Grid, and Glassmorphism effects (`backdrop-filter`).
- **PWA**: Service Worker caching strategy (`Cache-First` for static assets, `Network-First` with cache fallback for GET API calls).
- **Fonts**: Self-hosted / Google Fonts CDN (`Plus Jakarta Sans`, `Noto Sans Bengali`, `Amiri`).

---

## 3. Database Architecture & Concurrency
- **File**: `namaz_tracker.db`
- **Concurrency Mode**:
  - `PRAGMA journal_mode=WAL;` (Write-Ahead Logging enables non-blocking concurrent readers during write transactions).
  - `PRAGMA busy_timeout = 15000;` (15-second busy timeout prevents lock collisions).
  - `PRAGMA synchronous = NORMAL;` (Ensures durability while boosting write throughput).
- **Connection Lifecycle**: Python context manager `get_db_connection()` ensures connections close cleanly and row factories return dictionary-like records.

---

## 4. API Endpoints Specification

### 4.1 Prayers Log
- `GET /api/prayers/<date_str>?active=<active_waqt>`
  - Returns array of 5 prayers with status, is_sunnah, notes, is_active flag.
- `POST /api/prayers`
  - Body: `{ date: "YYYY-MM-DD", prayer_name: "Fajr", status: "prayed", is_sunnah: 1, notes: "" }`
  - Upserts `prayers_log` record.

### 4.2 Qaza Tracking
- `GET /api/qaza`
  - Returns list of 5 prayers with `total_missed`, `completed`, and `remaining`.
- `POST /api/qaza`
  - Body: `{ prayer_name: "Fajr", action: "increment" | "decrement" }`
  - Safely modifies missed or completed counters.

### 4.3 Analytics & Streaks
- `GET /api/stats/monthly?year=YYYY&month=MM`
  - Returns daily summary counts and current streak stats.
- `GET /api/stats/monthly-detail?month=YYYY-MM`
  - Detailed completion metrics, Sunnah ratio, and performance breakdown.

### 4.4 Quran
- `GET /api/quran/surahs`
  - List of 114 Surahs with metadata.
- `GET /api/quran/surah/<int:surah_no>`
  - Surah detail with all Ayahs (Arabic text, transliteration, Bengali/English translations).
- `GET /api/quran/bookmarks` & `POST /api/quran/bookmarks`
  - List or toggle bookmark for `{ surah_no, ayah_no }`.
- `GET /api/quran/last-read` & `POST /api/quran/last-read`
  - Get or update last read position.

### 4.5 Hadith
- `GET /api/hadith/daily`
  - Today's featured Hadith.
- `GET /api/hadith/categories` & `GET /api/hadith/books`
  - Hadith taxonomy.
- `GET /api/hadith/all?category=&book=&search=`
  - Curated Hadith list with optional filters.
- `GET /api/hadith/full-books`
  - Metadata for the 6 canonical collections.
- `GET /api/hadith/book/<book_id>/chapters`
  - Chapters for a book (cached locally in SQLite; fetched from external source if empty).
- `GET /api/hadith/book/<book_id>/chapter/<int:chapter_no>`
  - Hadiths in a chapter with Arabic, Bengali, English, and transliterations.
- `GET /api/hadith/bookmarks` & `POST /api/hadith/bookmarks`
  - List or toggle bookmark by `hadith_id`.
- `GET /api/hadith/last-read` & `POST /api/hadith/last-read`
  - Get or update last read book, chapter, and hadith number.

### 4.6 Backup & Settings
- `GET /api/backup/export`
  - Dumps user tracking tables into a structured JSON file.
- `POST /api/backup/import`
  - Validates and restores user tracking tables within an atomic SQLite transaction.
- `GET /api/settings/<key>` & `POST /api/settings`
  - Key-value configuration store.

---

## 5. Resilience & Error Handling
- **Retry Logic**: External API requests in `hadith_service.py` employ exponential backoff (3 attempts with 1.5^attempt intervals).
- **Fallback Approximations**: When prayer time external APIs fail or are offline, `get_approximate_active_waqt()` provides fallback times for Dhaka/subcontinent region.
- **Input Sanitization**: Backup imports explicitly strip untrusted fields, validate table structures, and abort cleanly on corrupted payloads.
- **Charset Encoding**: Server enforces explicit UTF-8 stdout/stderr streams to prevent Windows console Unicode crashes (`sys.stdout.reconfigure(encoding='utf-8')`).

---

## 6. Security & Performance Considerations
- **No Remote Credential Storage**: Eliminates user authentication vectors by keeping data client-owned.
- **Cache Invalidation**: `add_no_cache_headers` ensures dynamic API endpoints (`/api/*`) are never cached improperly by browser proxies.
- **Lightweight Footprint**: Server memory usage < 35 MB; complete database size ~ 17 MB (including full Quran text and seeded Hadith collection).
