# Product Requirements Document (PRD) - Namaz Tracker

## 1. Overview & Vision
**Namaz Tracker** (নামায ট্র্যাকার) is a comprehensive, privacy-first, bilingual (Bengali & English) Islamic web application and Progressive Web App (PWA). It empowers Muslims to track daily prayers (Fard and Sunnah), manage lifetime missed (Qaza) prayers, observe Ramadan fasting and rituals, access Quran with translations, explore authentic Hadith collections, and review prayer guides and monthly consistency analytics.

The application works completely offline as a PWA, storing personal tracking data locally in an SQLite database with full JSON import/export capability for zero data lock-in.

---

## 2. Target Audience
- Daily practicing Muslims seeking an intuitive tracker for their 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha).
- Users aiming to systematically calculate, track, and complete lifetime Qaza (missed) prayers.
- Bengali- and English-speaking users desiring Quran recitations, translations, authentic Hadith study, and prayer/wudu learning materials in a unified dashboard.
- Users who need offline-capable, responsive mobile and desktop access without mandatory account registration.

---

## 3. Core Features & Functional Requirements

### 3.1 Daily Prayer Tracking (`Today` Tab)
- **5 Daily Prayers**: Fajr, Dhuhr, Asr, Maghrib, Isha.
- **Prayer Statuses**:
  - `pending` (Default state)
  - `prayed` (Completed on time)
  - `late` (Completed after primary window)
  - `missed` (Not performed / queued for Qaza)
- **Sunnah Toggle**: Track whether accompanying Sunnah prayers were completed (`is_sunnah` boolean).
- **Personal Notes**: Optional notes per prayer entry.
- **Dynamic Waqt Highlighting**: Real-time identification and visual highlight of the currently active prayer window based on city prayer times.
- **Location & Calculation**: City selection (default Dhaka; supports dynamic calculation via Aladhan API with offline approximate time fallbacks).
- **Date Navigation**: Previous/Next day navigation buttons and calendar selector.

### 3.2 Qaza Management (`Qaza` Tab)
- Counter for each of the 5 prayers (`total_missed`, `completed`, `remaining`).
- Quick increment/decrement actions:
  - Add missed prayer (`+1`)
  - Mark completed prayer (`-1` remaining, `+1` completed)
- Lifetime Qaza estimate calculator (calculates missed prayers based on puberty age and years of non-observance).
- Progress percentage indicator per prayer and total aggregate progress.

### 3.3 Ramadan Tracker (`Ramadan` Tab)
- Sehri and Iftar countdown clocks and time display.
- Fasting status tracker (`fasted`, `missed`, `exempt`).
- Daily deeds checklist (Taraweeh, Quran recitation, Charity/Sadaqah, Dhikr).
- 30-day Ramadan calendar schedule with timings.

### 3.4 Consistency Analytics & Calendar (`Analytics` Tab)
- Monthly calendar grid visualizing daily prayer completion levels (color-coded dots / completion bar).
- Current streak and longest streak counter (consecutive days with all 5 prayers logged as prayed).
- Monthly breakdown statistics (total prayed, late, missed, Sunnah ratio).
- Monthly trend charts and distribution summaries.

### 3.5 Learning Guides (`Prayer Guide` & `Wudu` Tabs)
- Step-by-step prayer instructions (Fard, Sunnah, Witr, Janazah, Eid).
- Visual postures, Arabic text, Bengali transliteration, and translations.
- Wudu (ablution) steps, Fard/Sunnah components, and invalidating conditions.

### 3.6 Al-Quran Reader (`Quran` Tab)
- Surah index (all 114 Surahs with Arabic name, Bengali phonetic name, English name, Ayah count, and revelation type).
- Ayah-by-ayah reading interface with Arabic script, Bengali transliteration, Bengali translation, and English translation.
- Interactive bookmarking (toggle favorite/saved Ayahs).
- Last-read position tracking with quick resume button.

### 3.7 Hadith Collections (`Hadith` Tab)
- Daily Hadith showcase on the main dashboard.
- Topic/Category browsing (Faith, Prayer, Ramadan, Good Manners, etc.).
- Complete canonical Hadith books:
  - Sahih al-Bukhari
  - Sahih Muslim
  - Jami' at-Tirmidhi
  - Sunan Abi Dawud
  - Sunan an-Nasa'i
  - Sunan Ibn Majah
- Chapter-by-chapter reading with pagination, Arabic text, Bengali translation, English translation, and grade classification.
- Hadith bookmarking and last-read chapter/hadith tracker.

### 3.8 Bilingual Localization (i18n)
- Seamless one-click switching between Bengali (`bn`) and English (`en`).
- Fully localized UI strings, prayer names, statuses, notifications, navigation menus, and reading interfaces.

### 3.9 PWA & Offline Capability
- Installable web app via `manifest.json`.
- Service Worker (`sw.js`) caching static assets and providing network-first with cache-fallback for API requests.
- Full offline functionality for cached data.

### 3.10 Data Backup & Portability
- Export full user data (prayers log, Qaza records, bookmarks, settings, reading history) as a single JSON file.
- Safe import/restore mechanism with input validation and deduplication.

---

## 4. Non-Functional Requirements
- **Performance**: Initial page load < 1.5s; prayer status toggle response < 100ms.
- **Reliability**: SQLite WAL mode enabled to handle concurrent reads/writes without lock contention; 15-second busy timeout.
- **Resilience**: Automatic retry backoff for external Hadith and prayer time API calls; fallback to local approximations when offline.
- **Security & Privacy**: No personal identifiers collected; all prayer and spiritual records stored locally on user device or host database.
- **Responsive Design**: Mobile-first fluid layout adapting seamlessly across mobile phones (360px+), tablets, and desktops.

---

## 5. Acceptance Criteria
1. Changing date updates prayer list immediately and shows saved statuses accurately.
2. Clicking status (`prayed`, `late`, `missed`) persists to SQLite immediately without requiring page refresh.
3. Language toggle switches all visible UI elements instantly and persists preference in `localStorage`.
4. Qaza increment/decrement updates remaining counts accurately without race conditions.
5. Exported JSON backup file can be imported into a clean database, completely restoring prayer history and Qaza counts.
6. Offline mode successfully serves the cached app shell and read-only content when network is disconnected.
