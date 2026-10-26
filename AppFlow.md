# Application Flow (AppFlow) - Namaz Tracker

## 1. High-Level Architecture & Screen Map

```
                  ┌────────────────────────────────────────┐
                  │           App Shell & Header           │
                  │ [Logo] [City Pill] [Next Waqt] [Theme] │
                  │ [i18n BN/EN] [Backup/Restore] [Date]   │
                  └──────────────────┬─────────────────────┘
                                     │
    ┌──────────┬──────────┬──────────┼──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼          ▼          ▼
[Today]     [Qaza]    [Ramadan] [Analytics]  [Guide]    [Wudu]    [Quran]   [Hadith]
 Prayers,    Missed     Sehri/     Monthly    Prayer     Wudu      Surahs,    Books,
 Active      Counter,   Iftar      Calendar,  Rules,    Steps,     Ayahs,    Chapters,
 Waqt,       Estimator  Tracker    Streak     Postures  Sunnahs  Bookmarks  Bookmarks
 Notes
```

---

## 2. User Journey Flows

### 2.1 Daily Prayer Logging Flow
1. **App Launch**:
   - Service worker serves cached app shell if offline.
   - Frontend requests prayer times for current city and fetches today's prayer logs from `GET /api/prayers/<YYYY-MM-DD>?active=<ActiveWaqt>`.
   - UI renders 5 prayer cards: Fajr, Dhuhr, Asr, Maghrib, Isha.
   - Currently active prayer card is highlighted with `active-waqt-glow` and animated badge.
2. **Marking a Prayer**:
   - User taps status button: `Prayed` (সবুজ / Green), `Late` (কমলা / Amber), or `Missed` (লাল / Red).
   - Frontend optimistically updates card UI.
   - `POST /api/prayers` is sent with `{ date, prayer_name, status, is_sunnah, notes }`.
   - On success, streak indicator and today's summary badge recalculate.
   - User can toggle Sunnah checkbox or add a note via the note icon modal.
3. **Navigating Dates**:
   - User clicks `Previous Day` (`<`) or `Next Day` (`>`) or opens the date picker dropdown.
   - Active date updates; UI fetches `/api/prayers/<selected_date>`.
   - If selected date is not today, the active waqt highlight is disabled.

### 2.2 Qaza Tracking & Recovery Flow
1. **Viewing Missed Counts**:
   - User switches to `Qaza` tab.
   - App loads aggregate summary from `GET /api/qaza`.
   - Displays individual cards for Fajr, Dhuhr, Asr, Maghrib, Isha with missed count, completed count, and remaining progress bar.
2. **Logging Completed Qaza**:
   - User taps `-1` on any prayer card when a missed prayer is fulfilled.
   - Sends `POST /api/qaza` with `{ prayer_name, action: "decrement" }`.
   - Backend decreases `total_missed`, increments `completed`, and returns updated state.
3. **Qaza Estimator Modal**:
   - User clicks "Calculate Lifetime Qaza" button.
   - Inputs age of puberty (e.g., 14) and years/months of unperformed prayers.
   - Modal calculates total missed prayers (5 × 365 × years) and offers a one-click button to update baseline Qaza records.

### 2.3 Quran Reading & Navigation Flow
1. **Surah Selection**:
   - User selects `Quran` tab.
   - App fetches Surah list from `GET /api/quran/surahs`.
   - Surahs displayed with numbers, Arabic title, transliteration, English name, and Ayah count.
   - "Resume Last Read" banner displays if a prior bookmark exists (`GET /api/quran/last-read`).
2. **Ayah Reader**:
   - Clicking a Surah loads Ayahs from `GET /api/quran/surah/<surah_no>`.
   - Shows Bismillah header (except Surah At-Tawbah).
   - Each Ayah presents:
     - Arabic Uthmani text.
     - Bengali pronunciation (transliteration) & English transliteration.
     - Bengali & English translations.
     - Bookmark toggle button.
     - Copy Ayah button.
3. **Bookmarking & Position**:
   - Clicking bookmark icon calls `POST /api/quran/bookmarks` and saves position via `POST /api/quran/last-read`.

### 2.4 Hadith Library & Chapter Reader Flow
1. **Catalog View**:
   - User opens `Hadith` tab.
   - Top section displays Daily Hadith (`GET /api/hadith/daily`).
   - Category selector filters curated hadiths by theme (`Faith`, `Salah`, `Etiquette`).
   - Full Books list allows choosing canonical collections (Bukhari, Muslim, Tirmidhi, Abu Dawood, Nasai, Ibn Majah).
2. **Book & Chapter Hierarchy**:
   - Selecting a book requests `GET /api/hadith/book/<book_id>/chapters`.
   - If chapters are not yet in local DB, backend fetches from external API, caches them, and returns them.
   - Selecting a chapter requests `GET /api/hadith/book/<book_id>/chapter/<chapter_no>`.
   - Displays Hadiths with Arabic text, English/Bengali translation, narrator attribution, and authenticity grade.

### 2.5 Data Backup & Restore Flow
1. **Export**:
   - User clicks `Backup` button in header.
   - App triggers `GET /api/backup/export`.
   - Browser downloads JSON file: `namaz_tracker_backup_YYYY-MM-DD.json`.
2. **Import / Restore**:
   - User clicks `Restore` button and selects a backup `.json` file.
   - App validates JSON structure on frontend, then posts payload to `POST /api/backup/import`.
   - Backend performs transaction validation, updates DB tables, and returns `{ success: true }`.
   - UI alerts success and reloads today's data.

---

## 3. Offline & PWA Sync State Machine

```
              ┌────────────────────────┐
              │      Page Initialized   │
              └───────────┬────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    [Online Mode]                [Offline Mode]
    • Fetch dynamic API          • Service Worker serves cache
    • Fetch prayer times         • Local approximate Waqt times
    • Sync pending actions       • SQLite local reads (desktop/host)
```
