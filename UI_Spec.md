# UI Specification (UI_Spec) - Namaz Tracker

## 1. Visual Language & Design Tokens

### 1.1 Color Palette
- **Primary Accent / Brand**: `#009688` (Teal Emerald)
- **Primary Hover / Glow**: `#00b4a4` / `rgba(0, 150, 136, 0.25)`
- **Secondary Accent**: `#6366F1` (Indigo / Quran Accent)
- **Status Colors**:
  - **Prayed / Success**: `#10B981` (Emerald Green)
  - **Late / Warning**: `#F59E0B` (Amber Orange)
  - **Missed / Danger**: `#EF4444` (Crimson Red)
  - **Pending / Neutral**: `#64748B` (Muted Slate)
- **Backgrounds**:
  - Dark Theme (Default): `#0B1120` to `#0F172A` deep space navy gradient
  - Light Theme: `#F8FAFC` to `#F1F5F9` subtle clean gray
- **Surfaces & Glassmorphism**:
  - Surface Glass: `rgba(30, 41, 59, 0.7)` backdrop-filter `blur(12px)`
  - Surface Border: `1px solid rgba(255, 255, 255, 0.08)`
  - High Elevation Glass: `rgba(30, 41, 59, 0.85)` with box-shadow `0 10px 25px -5px rgba(0, 0, 0, 0.3)`

### 1.2 Typography
- **Primary English UI**: `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Bengali Text & UI**: `'Noto Sans Bengali', sans-serif`
- **Arabic Quran & Hadith**: `'Amiri', 'Traditional Arabic', serif`
- **Type Scale**:
  - `Display / Banner`: 28px - 32px / font-weight: 800
  - `H1 / Section Titles`: 22px - 26px / font-weight: 700
  - `H2 / Card Headers`: 18px - 20px / font-weight: 600
  - `Body Regular`: 14px - 15px / line-height: 1.6
  - `Ayah Arabic`: 22px - 26px / line-height: 2.2
  - `Caption / Badge`: 11px - 12px / font-weight: 600

---

## 2. Layout & Responsive Breakpoints

| Breakpoint | Width Range | Layout Behavior |
|------------|-------------|-----------------|
| Mobile Small | < 480px | Single-column stack, sticky bottom tab bar / condensed top nav, compact prayer cards |
| Mobile Medium / Tablet | 480px - 768px | 2-column prayer cards, expanded header pills, scrollable tab navigation |
| Desktop | > 768px | Multi-column grid, persistent full-size navigation bar, side-by-side analytics widgets |

---

## 3. Core UI Components

### 3.1 Glass Navbar (`.glass-navbar`)
- **Left**: NT Badge logo with subtle gradient border, live app title.
- **Center**:
  - City indicator pill (interactive; triggers city modal with search).
  - Next Waqt pill with live countdown timer and clock icon.
- **Right**:
  - Language switch toggle pill (`🌐 English` / `🌐 বাংলা`).
  - Dark/Light mode toggle icon.
  - Backup & Restore buttons with responsive icons.
  - Date navigation pill (`<`, calendar date text, `>`).

### 3.2 Navigation Tab Bar (`.nav-tabs`)
- Horizontal pill-style tab buttons with icons:
  - `Today` (আজকের নামায)
  - `Qaza` (কাযা ট্র্যাকার)
  - `Ramadan` (রমজান)
  - `Analytics` (পরিসংখ্যান)
  - `Guide` (নামায শিক্ষা)
  - `Wudu` (ওযু)
  - `Quran` (আল কুরআন)
  - `Hadith` (হাদীস)
- Active state indicated with teal fill `#009688`, subtle glow, and `aria-selected="true"`.

### 3.3 Daily Prayer Card (`.prayer-card`)
- **Card Header**: Prayer icon, English/Bengali prayer name, Waqt timing range.
- **Active Waqt Indicator**: Pulsing badge "চলমান ওয়াক্ত" / "Active Waqt" with subtle border glow.
- **Status Button Group**:
  - Segmented buttons: `Prayed` / `Late` / `Missed`.
  - Color changes dynamically according to selected state.
- **Card Footer**:
  - Sunnah checkbox toggle ("সুন্নত আদায় করেছি").
  - Note icon button opening a compact inline note modal.

### 3.4 Qaza Tracker Cards
- Number badge showing unperformed count with large legible numerals.
- Action buttons: Quick `+1` (Add Missed), `-1` (Completed).
- Mini horizontal progress bar displaying completion percentage.

### 3.5 Quran & Hadith Reading Panels
- **Surah / Book Grid**: Search bar at top; cards display number, Arabic calligraphic title, meaning, and ayah/chapter count.
- **Reading View**:
  - Sticky sub-header with Surah/Chapter title, translation toggle, and back button.
  - Ayah Card: Clear Arabic Uthmani text followed by phonetic transliteration, Bengali translation, and English translation.
  - Floating action row per Ayah: Bookmark button, Audio recitation play button (where available), and Copy text button.

---

## 4. Accessibility & Interaction Feedback
- **WCAG Contrast**: All text elements maintain at least 4.5:1 contrast against surface backgrounds.
- **ARIA Attributes**: `role="tab"`, `aria-selected`, `aria-controls`, and `aria-label` applied on all interactive buttons.
- **Keyboard Navigation**: Focus outlines preserved with high-visibility teal focus rings (`focus-visible: 2px solid #009688`).
- **Haptic & Toast Notifications**: Toast banners appear at top right for non-blocking feedback (e.g., "নামায রেকর্ড সংরক্ষিত হয়েছে", "ব্যাকআপ সম্পন্ন").
