# Database Schema (Schema) - Namaz Tracker

## 1. Overview
The database engine is **SQLite3**, utilizing Write-Ahead Logging (`WAL`) mode for high concurrency and resilience. The database file is located at `namaz_tracker.db`.

---

## 2. Table Definitions

### 2.1 `prayers_log`
Tracks daily prayer fulfillment, Sunnah status, and personal notes.
```sql
CREATE TABLE prayers_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,                     -- ISO format: 'YYYY-MM-DD'
    prayer_name TEXT NOT NULL,              -- 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'
    status TEXT DEFAULT 'pending',          -- 'pending', 'prayed', 'late', 'missed'
    is_sunnah INTEGER DEFAULT 0,            -- 0 = No, 1 = Yes
    notes TEXT,                             -- Optional user note
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, prayer_name)
);
```

### 2.2 `qaza_records`
Maintains running totals for lifetime missed and recovered prayers.
```sql
CREATE TABLE qaza_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prayer_name TEXT NOT NULL UNIQUE,       -- 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'
    total_missed INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `settings`
Key-value store for user configurations and preferences.
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,                   -- Setting key (e.g., 'city', 'language', 'theme')
    value TEXT                              -- Setting value
);
```

### 2.4 `quran_surahs`
Metadata for the 114 Surahs of the Holy Quran.
```sql
CREATE TABLE quran_surahs (
    surah_no INTEGER PRIMARY KEY,           -- Surah number (1-114)
    name_ar TEXT NOT NULL,                  -- Arabic name (e.g., 'الفاتحة')
    name_bn TEXT NOT NULL,                  -- Bengali name (e.g., 'আল-ফাতিহা')
    name_en TEXT NOT NULL,                  -- English name (e.g., 'Al-Fatihah')
    meaning_bn TEXT NOT NULL,               -- Bengali meaning
    total_ayah INTEGER NOT NULL,            -- Total number of Ayahs
    revelation_type TEXT NOT NULL           -- 'Meccan' or 'Medinan'
);
```

### 2.5 `quran_ayahs`
Full verses of the Quran with multiple translations and transliterations.
```sql
CREATE TABLE quran_ayahs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surah_no INTEGER NOT NULL,              -- Foreign key referencing quran_surahs(surah_no)
    ayah_no INTEGER NOT NULL,               -- Verse number within the Surah
    text_ar TEXT NOT NULL,                  -- Arabic Uthmani text
    translit_bn TEXT NOT NULL,              -- Bengali phonetic transliteration
    trans_bn TEXT NOT NULL,                 -- Bengali translation
    translit_en TEXT DEFAULT '',            -- English phonetic transliteration
    trans_en TEXT DEFAULT '',               -- English translation
    FOREIGN KEY(surah_no) REFERENCES quran_surahs(surah_no),
    UNIQUE(surah_no, ayah_no)
);
```

### 2.6 `quran_bookmarks`
Saved Ayahs bookmarked by the user.
```sql
CREATE TABLE quran_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surah_no INTEGER NOT NULL,
    ayah_no INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(surah_no, ayah_no)
);
```

### 2.7 `quran_last_read`
Stores the single most recent Quran reading checkpoint.
```sql
CREATE TABLE quran_last_read (
    id INTEGER PRIMARY KEY DEFAULT 1,       -- Single-row singleton (id = 1)
    surah_no INTEGER NOT NULL,
    ayah_no INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.8 `hadith_categories`
Topical categories for curated Hadiths.
```sql
CREATE TABLE hadith_categories (
    id TEXT PRIMARY KEY,                    -- e.g., 'faith', 'prayer', 'ramadan'
    name_bn TEXT NOT NULL,
    icon TEXT NOT NULL
);
```

### 2.9 `hadith_books`
Canonical and curated Hadith collections.
```sql
CREATE TABLE hadith_books (
    id TEXT PRIMARY KEY,                    -- e.g., 'bukhari', 'muslim'
    name_bn TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT DEFAULT ''
);
```

### 2.10 `hadiths`
Curated selection of essential Hadiths organized by topic.
```sql
CREATE TABLE hadiths (
    id INTEGER PRIMARY KEY,
    category_id TEXT NOT NULL,
    category_bn TEXT NOT NULL,
    book_id TEXT NOT NULL,
    book_name_bn TEXT NOT NULL,
    chapter_bn TEXT NOT NULL,
    narrator_bn TEXT NOT NULL,
    text_ar TEXT NOT NULL,
    translit_bn TEXT DEFAULT '',
    text_bn TEXT NOT NULL,
    grade_bn TEXT NOT NULL,
    reference_bn TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES hadith_categories(id),
    FOREIGN KEY(book_id) REFERENCES hadith_books(id)
);
```

### 2.11 `hadith_bookmarks`
Bookmarked Hadith IDs.
```sql
CREATE TABLE hadith_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hadith_id INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(hadith_id) REFERENCES hadiths(id)
);
```

### 2.12 `hadith_chapters`
Chapter catalog for full canonical Hadith books.
```sql
CREATE TABLE hadith_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    chapter_no INTEGER NOT NULL,
    name_bn TEXT NOT NULL,
    name_ar TEXT DEFAULT '',
    name_en TEXT DEFAULT '',
    total_hadith INTEGER DEFAULT 0,
    start_hadith INTEGER DEFAULT 0,
    end_hadith INTEGER DEFAULT 0,
    UNIQUE(book_id, chapter_no)
);
```

### 2.13 `hadith_full_collection`
Complete Hadith verses downloaded and cached from canonical sources.
```sql
CREATE TABLE hadith_full_collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    chapter_no INTEGER NOT NULL,
    hadith_no INTEGER NOT NULL,
    arabic_no INTEGER,
    text_ar TEXT DEFAULT '',
    translit_bn TEXT DEFAULT '',
    text_bn TEXT NOT NULL,
    grade_bn TEXT DEFAULT '',
    translit_en TEXT DEFAULT '',
    text_en TEXT DEFAULT '',
    UNIQUE(book_id, hadith_no)
);
```

### 2.14 `hadith_last_read`
Single-row pointer to the last read Hadith.
```sql
CREATE TABLE hadith_last_read (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    book_id TEXT NOT NULL,
    chapter_no INTEGER NOT NULL,
    hadith_no INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Data Portability / Backup JSON Schema
When exporting user data (`GET /api/backup/export`), the resulting JSON payload is formatted as:
```json
{
  "version": 2,
  "exported_at": "YYYY-MM-DDTHH:MM:SSZ",
  "prayers_log": [
    {
      "date": "2026-10-26",
      "prayer_name": "Fajr",
      "status": "prayed",
      "is_sunnah": 1,
      "notes": ""
    }
  ],
  "qaza_records": [
    {
      "prayer_name": "Fajr",
      "total_missed": 10,
      "completed": 2
    }
  ],
  "settings": {
    "city": "Dhaka",
    "language": "bn"
  },
  "quran_bookmarks": [
    { "surah_no": 1, "ayah_no": 1, "created_at": "..." }
  ],
  "quran_last_read": {
    "surah_no": 1,
    "ayah_no": 7,
    "updated_at": "..."
  },
  "hadith_bookmarks": [
    { "hadith_id": 5, "created_at": "..." }
  ],
  "hadith_last_read": {
    "book_id": "bukhari",
    "chapter_no": 1,
    "hadith_no": 1,
    "updated_at": "..."
  }
}
```
During restore, `POST /api/backup/import` parses this structure, validates presence of at least one valid key, strips untrusted fields, and executes within an atomic transaction.
