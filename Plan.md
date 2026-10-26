# Project Plan & Roadmap (Plan) - Namaz Tracker

## 1. Project Current Status
- **Current Branch**: `main`
- **Working Tree**: Clean (all changes committed in `a163da1df654def18777f31ad9193d6c3343485d`).
- **Core Functionality**:
  - Daily prayer logging with active Waqt highlight & Sunnah tracker.
  - Qaza tracker with increment/decrement counters and lifetime estimator.
  - Ramadan fasting and deeds tracker.
  - Monthly consistency calendar and streak tracking.
  - Al-Quran reader with Bengali & English translations and bookmarking.
  - Hadith catalog and canonical book chapter caching.
  - Bilingual i18n support (Bengali & English).
  - PWA service worker with static asset caching.
  - JSON backup and restore with transaction validation.

---

## 2. Testable Acceptance Criteria
| ID | Area | Acceptance Criterion | Verification Command / Step |
|---|---|---|---|
| AC-1 | Core Server | Flask server boots up without error and responds to `GET /` and `GET /api/prayers/<today>`. | `python -c "import server; print('Server ready')"` and test GET endpoint |
| AC-2 | Database | SQLite WAL mode enabled, 14 tables verified, zero schema corruption. | Check PRAGMA journal_mode and table counts |
| AC-3 | Prayer Logging | `POST /api/prayers` persists `prayed`, `late`, `missed`, and `is_sunnah`. | Send test JSON POST and verify database row |
| AC-4 | Qaza Management | Decrementing a Qaza counter reduces remaining count and increases completed count. | Send POST to `/api/qaza` and verify delta |
| AC-5 | Localization | Toggling language swaps text strings between Bengali and English across all tabs. | Inspect `i18n.js` translation map coverage |
| AC-6 | Backup & Restore | Exported JSON payload re-imports cleanly, preserving all prayer logs without loss. | Test round-trip export -> import cycle |
| AC-7 | PWA & Offline | Service Worker installs, activates, and handles asset requests. | Validate `sw.js` syntax and static asset list |

---

## 3. Tasks

### Task 1: Comprehensive Unit & API Test Suite Setup (Completed)
- **Goal**: Add an automated pytest / unittest test suite covering all API endpoints in `server.py` and database operations in `db.py`.
- **Status**: [x] Completed (2026-10-26). 22 tests passing with 100% pass rate.
- **Scope**:
  - Created `tests/test_server.py` (10 tests) and `tests/test_db.py` (12 tests).
  - Test `/api/prayers` (GET, POST with validation).
  - Test `/api/qaza` (increment, decrement, invalid action handling).
  - Test `/api/backup/export` and `/api/backup/import` round-trip.
  - Test `/api/stats/monthly` and `/api/stats/monthly-detail`.
  - Added `pytest>=8.0.0` to `requirements.txt`.
- **Verification**: `python -m pytest tests -v` (22/22 passed) and `python -m unittest discover tests` (22/22 passed).

### Task 2: City & Prayer Time Auto-Geolocation (Completed)
- **Goal**: Allow users to optionally detect their city/location via browser GPS / IP geolocation in addition to the dropdown selection.
- **Status**: [x] Completed (2026-10-26).
- **Scope**:
  - Added "Auto Detect Location" button in the city modal with responsive glassmorphism styling and dark mode support.
  - Implemented `handleAutoDetectLocation()` using `navigator.geolocation` and BigDataCloud reverse geocode client API with fallback to nearest division coordinates.
  - Dynamic Aladhan API query using exact coordinates (`latitude` & `longitude`) and offline solar calculation fallback.
  - Added bilingual translations in `i18n.js` for auto-detection button, status messages, and feedback.
- **Verification**: Syntax check via `node --check` on JS files, all 22 tests passing via pytest and unittest.

### Task 3: Audio Adhan / Waqt Reminder Notifications
- **Goal**: Provide optional Web Audio or local browser notifications when a prayer Waqt starts.
- **Scope**:
  - Implement Web Notifications API permission check and toggle in settings.
  - Add audio chime or gentle Takbeer notification sound.
- **Verification**: Trigger notification with synthetic clock time and verify sound playback.

### Task 4: Ramadan Fasting History & Multi-Year Archive
- **Goal**: Persist Ramadan daily fasting logs across multiple years with yearly archive viewing.
- **Scope**:
  - Add `ramadan_log` table to `db.py`.
  - Update backup export/import to include `ramadan_log`.
- **Verification**: Log 30 days of fasting, export backup, import into clean database, verify retention.

---

## 4. Execution Workflow Rules
- **Permission**: Strictly follow current authorization (AUDIT ONLY / PLAN ONLY).
- **Implementation**: Proceed to execute Tasks only upon user approval.
- **Focus**: Execute one small, focused task at a time.
- **Testing**: Run test checks after any change before declaring completion.
