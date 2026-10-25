import sqlite3
from contextlib import contextmanager
from typing import List, Dict, Optional, Tuple
from datetime import datetime

DB_NAME = "namaz_tracker.db"
PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_NAME, timeout=15.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout = 15000;")
        cursor.execute("PRAGMA synchronous = NORMAL;")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prayers_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                prayer_name TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                is_sunnah INTEGER DEFAULT 0,
                notes TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, prayer_name)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS qaza_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prayer_name TEXT NOT NULL UNIQUE,
                total_missed INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quran_surahs (
                surah_no INTEGER PRIMARY KEY,
                name_ar TEXT NOT NULL,
                name_bn TEXT NOT NULL,
                name_en TEXT NOT NULL,
                meaning_bn TEXT NOT NULL,
                total_ayah INTEGER NOT NULL,
                revelation_type TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quran_ayahs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                surah_no INTEGER NOT NULL,
                ayah_no INTEGER NOT NULL,
                text_ar TEXT NOT NULL,
                translit_bn TEXT NOT NULL,
                trans_bn TEXT NOT NULL,
                FOREIGN KEY(surah_no) REFERENCES quran_surahs(surah_no),
                UNIQUE(surah_no, ayah_no)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quran_bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                surah_no INTEGER NOT NULL,
                ayah_no INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(surah_no, ayah_no)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quran_last_read (
                id INTEGER PRIMARY KEY DEFAULT 1,
                surah_no INTEGER NOT NULL,
                ayah_no INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_categories (
                id TEXT PRIMARY KEY,
                name_bn TEXT NOT NULL,
                icon TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_books (
                id TEXT PRIMARY KEY,
                name_bn TEXT NOT NULL,
                name_ar TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadiths (
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
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hadith_id INTEGER NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(hadith_id) REFERENCES hadiths(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id TEXT NOT NULL,
                chapter_no INTEGER NOT NULL,
                name_bn TEXT NOT NULL,
                name_ar TEXT DEFAULT '',
                total_hadith INTEGER DEFAULT 0,
                start_hadith INTEGER DEFAULT 0,
                end_hadith INTEGER DEFAULT 0,
                UNIQUE(book_id, chapter_no)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_full_collection (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id TEXT NOT NULL,
                chapter_no INTEGER NOT NULL,
                hadith_no INTEGER NOT NULL,
                arabic_no INTEGER,
                text_ar TEXT DEFAULT '',
                translit_bn TEXT DEFAULT '',
                text_bn TEXT NOT NULL,
                grade_bn TEXT DEFAULT '',
                UNIQUE(book_id, hadith_no)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hadith_last_read (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                book_id TEXT NOT NULL,
                chapter_no INTEGER NOT NULL,
                hadith_no INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("SELECT COUNT(*) FROM hadiths")
        if cursor.fetchone()[0] == 0:
            try:
                from hadith_data import HADITH_CATEGORIES, HADITH_BOOKS, HADITHS
                for cat in HADITH_CATEGORIES:
                    cursor.execute(
                        "INSERT OR REPLACE INTO hadith_categories (id, name_bn, icon) VALUES (?, ?, ?)",
                        (cat["id"], cat["name_bn"], cat["icon"])
                    )
                for book in HADITH_BOOKS:
                    cursor.execute(
                        "INSERT OR REPLACE INTO hadith_books (id, name_bn, name_ar) VALUES (?, ?, ?)",
                        (book["id"], book["name_bn"], book["name_ar"])
                    )
                for h in HADITHS:
                    cursor.execute("""
                        INSERT OR REPLACE INTO hadiths (
                            id, category_id, category_bn, book_id, book_name_bn,
                            chapter_bn, narrator_bn, text_ar, text_bn, grade_bn, reference_bn
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        h["id"], h["category_id"], h["category_bn"], h["book_id"], h["book_name_bn"],
                        h["chapter_bn"], h["narrator_bn"], h["text_ar"], h["text_bn"], h["grade_bn"], h["reference_bn"]
                    ))
            except Exception as e:
                print(f"Error seeding hadiths: {e}")

        for prayer in PRAYER_NAMES:
            cursor.execute(
                "INSERT OR IGNORE INTO qaza_records (prayer_name, total_missed, completed) VALUES (?, 0, 0)",
                (prayer,)
            )

        conn.commit()


def get_prayers_for_date(date_str: str) -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM prayers_log WHERE date = ? ORDER BY id",
            (date_str,)
        )
        rows = cursor.fetchall()

        if not rows:
            for prayer in PRAYER_NAMES:
                cursor.execute(
                    """INSERT INTO prayers_log (date, prayer_name, status, is_sunnah, notes)
                       VALUES (?, ?, 'pending', 0, '')""",
                    (date_str, prayer)
                )
            conn.commit()
            cursor.execute(
                "SELECT * FROM prayers_log WHERE date = ? ORDER BY id",
                (date_str,)
            )
            rows = cursor.fetchall()

        return [dict(row) for row in rows]


def update_prayer_status(
    date_str: str,
    prayer_name: str,
    status: Optional[str] = None,
    is_sunnah: int = 0,
    notes: str = ""
) -> bool:
    valid_statuses = {"pending", "jamaah", "on_time", "late", "qaza", "missed"}
    if status is not None and status != 'keep' and status not in valid_statuses:
        raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")

    if prayer_name not in PRAYER_NAMES:
        raise ValueError(f"Invalid prayer name: {prayer_name}")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        if status is not None and status != 'keep':
            cursor.execute(
                """INSERT INTO prayers_log (date, prayer_name, status, is_sunnah, notes)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(date, prayer_name) DO UPDATE SET
                       status = excluded.status,
                       is_sunnah = excluded.is_sunnah,
                       notes = excluded.notes,
                       updated_at = CURRENT_TIMESTAMP""",
                (date_str, prayer_name, status, is_sunnah, notes)
            )
        else:
            cursor.execute(
                """INSERT INTO prayers_log (date, prayer_name, status, is_sunnah, notes)
                   VALUES (?, 'pending', ?, ?, ?)
                   ON CONFLICT(date, prayer_name) DO UPDATE SET
                       is_sunnah = excluded.is_sunnah,
                       notes = excluded.notes,
                       updated_at = CURRENT_TIMESTAMP""",
                (date_str, prayer_name, is_sunnah, notes)
            )
        conn.commit()
        return cursor.rowcount > 0


def get_qaza_summary() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM qaza_records ORDER BY id")
        return [dict(row) for row in cursor.fetchall()]


def update_qaza(prayer_name: str, action: str) -> bool:
    if prayer_name not in PRAYER_NAMES:
        raise ValueError(f"Invalid prayer name: {prayer_name}")

    valid_actions = {"missed", "completed", "reset"}
    if action not in valid_actions:
        raise ValueError(f"Invalid action: {action}. Must be one of {valid_actions}")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        if action == "missed":
            cursor.execute(
                """UPDATE qaza_records SET total_missed = total_missed + 1, updated_at = CURRENT_TIMESTAMP
                   WHERE prayer_name = ?""",
                (prayer_name,)
            )
        elif action == "completed":
            cursor.execute(
                """UPDATE qaza_records SET completed = completed + 1, updated_at = CURRENT_TIMESTAMP
                   WHERE prayer_name = ?""",
                (prayer_name,)
            )
        elif action == "reset":
            cursor.execute(
                """UPDATE qaza_records SET total_missed = 0, completed = 0, updated_at = CURRENT_TIMESTAMP
                   WHERE prayer_name = ?""",
                (prayer_name,)
            )

        conn.commit()
        return cursor.rowcount > 0


def get_setting(key: str) -> Optional[str]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else None


def set_setting(key: str, value: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO settings (key, value) VALUES (?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
            (key, value)
        )
        conn.commit()
        return cursor.rowcount > 0


def get_monthly_summary(year: int, month: int) -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        month_str = f"{year}-{month:02d}"
        cursor.execute("""
            SELECT 
                date,
                SUM(CASE WHEN status IN ('jamaah', 'on_time', 'late') THEN 1 ELSE 0 END) as total_prayed,
                COALESCE(SUM(CASE WHEN status = 'jamaah' THEN 1 ELSE 0 END), 0) as jamaah_count,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_count
            FROM prayers_log
            WHERE date LIKE ?
            GROUP BY date
            ORDER BY date
        """, (f"{month_str}%",))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_monthly_detailed_stats(year: int, month: int) -> Dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        month_str = f"{year}-{month:02d}"
        like_pattern = f"{month_str}%"

        cursor.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN status IN ('jamaah', 'on_time', 'late', 'qaza') THEN 1 ELSE 0 END), 0) as total_prayed,
                COALESCE(SUM(CASE WHEN status = 'jamaah' THEN 1 ELSE 0 END), 0) as jamaah_count,
                COALESCE(SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END), 0) as ontime_count,
                COALESCE(SUM(CASE WHEN status = 'qaza' THEN 1 ELSE 0 END), 0) as qaza_count,
                COALESCE(SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END), 0) as missed_count,
                COALESCE(SUM(CASE WHEN is_sunnah = 1 THEN 1 ELSE 0 END), 0) as sunnah_count
            FROM prayers_log
            WHERE date LIKE ?
        """, (like_pattern,))
        overview_row = cursor.fetchone()
        overview = dict(overview_row) if overview_row else {}
        for k in ["total_prayed", "jamaah_count", "ontime_count", "qaza_count", "missed_count", "sunnah_count"]:
            if overview.get(k) is None:
                overview[k] = 0

        by_prayer = {}
        for prayer in PRAYER_NAMES:
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE WHEN status = 'jamaah' THEN 1 ELSE 0 END), 0) as jamaah_count,
                    COALESCE(SUM(CASE WHEN status = 'on_time' THEN 1 ELSE 0 END), 0) as ontime_count,
                    COALESCE(SUM(CASE WHEN status = 'qaza' THEN 1 ELSE 0 END), 0) as qaza_count,
                    COALESCE(SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END), 0) as missed_count
                FROM prayers_log
                WHERE date LIKE ? AND prayer_name = ?
            """, (like_pattern, prayer))
            row = cursor.fetchone()
            by_prayer[prayer] = dict(row) if row else {
                "jamaah_count": 0, "ontime_count": 0, "qaza_count": 0, "missed_count": 0
            }

        return {"overview": overview, "by_prayer": by_prayer}


def get_streak_stats() -> Dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT date,
                SUM(CASE WHEN status IN ('jamaah', 'on_time', 'late') THEN 1 ELSE 0 END) as total_prayed
            FROM prayers_log
            GROUP BY date
            ORDER BY date DESC
        """)
        rows = cursor.fetchall()

    current_streak = 0
    max_streak = 0
    temp_streak = 0

    for row in rows:
        if row["total_prayed"] >= 4:
            temp_streak += 1
            max_streak = max(max_streak, temp_streak)
        else:
            if current_streak == 0:
                current_streak = temp_streak
            temp_streak = 0

    return {
        "current_streak": current_streak,
        "max_streak": max_streak
    }



def get_all_surahs() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quran_surahs ORDER BY surah_no ASC")
        return [dict(r) for r in cursor.fetchall()]


def get_surah_details(surah_no: int) -> Optional[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quran_surahs WHERE surah_no = ?", (surah_no,))
        surah = cursor.fetchone()
        if not surah:
            return None
        cursor.execute("SELECT * FROM quran_ayahs WHERE surah_no = ? ORDER BY ayah_no ASC", (surah_no,))
        ayahs = [dict(r) for r in cursor.fetchall()]
        return {"surah": dict(surah), "ayahs": ayahs}



def get_quran_bookmarks() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.surah_no, b.ayah_no, b.created_at,
                   s.name_bn, s.name_ar, s.name_en, a.translit_bn, a.translit_en, a.trans_bn, a.trans_en
            FROM quran_bookmarks b
            JOIN quran_surahs s ON b.surah_no = s.surah_no
            LEFT JOIN quran_ayahs a ON b.surah_no = a.surah_no AND b.ayah_no = a.ayah_no
            ORDER BY b.created_at DESC
        """)
        return [dict(r) for r in cursor.fetchall()]


def toggle_quran_bookmark(surah_no: int, ayah_no: int) -> Dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM quran_bookmarks WHERE surah_no = ? AND ayah_no = ?", (surah_no, ayah_no))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM quran_bookmarks WHERE id = ?", (existing["id"],))
            conn.commit()
            return {"bookmarked": False}
        else:
            cursor.execute("INSERT INTO quran_bookmarks (surah_no, ayah_no) VALUES (?, ?)", (surah_no, ayah_no))
            conn.commit()
            return {"bookmarked": True}



def get_quran_last_read() -> Optional[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT lr.surah_no, lr.ayah_no, lr.updated_at, s.name_bn, s.name_en, s.name_ar, s.total_ayah
            FROM quran_last_read lr
            JOIN quran_surahs s ON lr.surah_no = s.surah_no
            WHERE lr.id = 1
        """)
        row = cursor.fetchone()
        return dict(row) if row else None


def set_quran_last_read(surah_no: int, ayah_no: int) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO quran_last_read (id, surah_no, ayah_no, updated_at)
            VALUES (1, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET surah_no = excluded.surah_no,
                                          ayah_no = excluded.ayah_no,
                                          updated_at = CURRENT_TIMESTAMP
        """, (surah_no, ayah_no))
        conn.commit()
        return True





def get_hadith_categories() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.*, COUNT(h.id) as count
            FROM hadith_categories c
            LEFT JOIN hadiths h ON c.id = h.category_id
            GROUP BY c.id
            ORDER BY c.rowid ASC
        """)
        return [dict(r) for r in cursor.fetchall()]


def get_hadith_books() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.*, COUNT(h.id) as count
            FROM hadith_books b
            LEFT JOIN hadiths h ON b.id = h.book_id
            GROUP BY b.id
            ORDER BY b.rowid ASC
        """)
        return [dict(r) for r in cursor.fetchall()]


def get_all_hadiths(category: Optional[str] = None, book: Optional[str] = None, search: Optional[str] = None) -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT h.*, 
                   CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
            FROM hadiths h
            LEFT JOIN hadith_bookmarks b ON h.id = b.hadith_id
            WHERE 1=1
        """
        params = []
        if category and category != "all":
            query += " AND h.category_id = ?"
            params.append(category)
        if book and book != "all":
            query += " AND h.book_id = ?"
            params.append(book)
        if search and search.strip():
            term = f"%{search.strip()}%"
            query += " AND (h.text_bn LIKE ? OR h.text_ar LIKE ? OR h.text_en LIKE ? OR h.chapter_bn LIKE ? OR h.chapter_en LIKE ? OR h.narrator_bn LIKE ? OR h.narrator_en LIKE ? OR h.reference_bn LIKE ? OR h.reference_en LIKE ?)"
            params.extend([term, term, term, term, term, term, term, term, term])

        query += " ORDER BY h.id ASC"
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def get_daily_hadith() -> Optional[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM hadiths")
        total = cursor.fetchone()[0]
        if total == 0:
            return None
        day_of_year = datetime.now().timetuple().tm_yday
        offset = (day_of_year - 1) % total
        cursor.execute("""
            SELECT h.*, 
                   CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
            FROM hadiths h
            LEFT JOIN hadith_bookmarks b ON h.id = b.hadith_id
            ORDER BY h.id ASC
            LIMIT 1 OFFSET ?
        """, (offset,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_hadith_bookmarks() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT h.*, 1 AS is_bookmarked, b.created_at as bookmarked_at
            FROM hadith_bookmarks b
            JOIN hadiths h ON b.hadith_id = h.id
            ORDER BY b.created_at DESC
        """)
        return [dict(r) for r in cursor.fetchall()]


def get_full_hadith_books() -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.name_bn, b.name_ar, b.name_en,
                   (SELECT COUNT(*) FROM hadith_chapters c WHERE c.book_id = b.id) AS total_chapters,
                   (SELECT COUNT(*) FROM hadith_full_collection f WHERE f.book_id = b.id) AS cached_hadiths
            FROM hadith_books b
            ORDER BY CASE b.id
                WHEN 'bukhari' THEN 1
                WHEN 'muslim' THEN 2
                WHEN 'tirmidhi' THEN 3
                WHEN 'abu_dawood' THEN 4
                WHEN 'abudawud' THEN 4
                WHEN 'nasai' THEN 5
                WHEN 'ibn_majah' THEN 6
                WHEN 'ibnmajah' THEN 6
                WHEN 'malik' THEN 7
                ELSE 8
            END ASC
        """)
        return [dict(r) for r in cursor.fetchall()]


def get_hadith_chapters(book_id: str) -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM hadith_chapters
            WHERE book_id = ?
            ORDER BY chapter_no ASC
        """, (book_id,))
        return [dict(r) for r in cursor.fetchall()]


def save_hadith_chapters(book_id: str, chapters: List[Dict]) -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for c in chapters:
            cursor.execute("""
                INSERT OR REPLACE INTO hadith_chapters (
                    book_id, chapter_no, name_bn, name_ar, name_en, total_hadith, start_hadith, end_hadith
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                book_id,
                c.get("chapter_no", 0),
                c.get("name_bn", ""),
                c.get("name_ar", ""),
                c.get("name_en", ""),
                c.get("total_hadith", 0),
                c.get("start_hadith", 0),
                c.get("end_hadith", 0)
            ))
        conn.commit()


def get_hadith_chapter_items(book_id: str, chapter_no: int) -> List[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM hadith_full_collection
            WHERE book_id = ? AND chapter_no = ?
            ORDER BY hadith_no ASC
        """, (book_id, chapter_no))
        return [dict(r) for r in cursor.fetchall()]


def save_hadith_chapter_items(book_id: str, chapter_no: int, items: List[Dict]) -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for h in items:
            cursor.execute("""
                INSERT OR REPLACE INTO hadith_full_collection (
                    book_id, chapter_no, hadith_no, arabic_no, text_ar, translit_bn, translit_en, text_bn, text_en, grade_bn
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                book_id,
                chapter_no,
                h.get("hadith_no", 0),
                h.get("arabic_no"),
                h.get("text_ar", ""),
                h.get("translit_bn", ""),
                h.get("translit_en", ""),
                h.get("text_bn", ""),
                h.get("text_en", ""),
                h.get("grade_bn", "")
            ))
        conn.commit()


def get_hadith_last_read() -> Optional[Dict]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT lr.book_id, lr.chapter_no, lr.hadith_no, lr.updated_at,
                   b.name_bn AS book_name_bn,
                   b.name_en AS book_name_en,
                   c.name_bn AS chapter_name_bn,
                   c.name_en AS chapter_name_en
            FROM hadith_last_read lr
            LEFT JOIN hadith_books b ON lr.book_id = b.id
            LEFT JOIN hadith_chapters c ON (lr.book_id = c.book_id AND lr.chapter_no = c.chapter_no)
            WHERE lr.id = 1
        """)
        row = cursor.fetchone()
        return dict(row) if row else None


def set_hadith_last_read(book_id: str, chapter_no: int, hadith_no: int) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO hadith_last_read (id, book_id, chapter_no, hadith_no, updated_at)
            VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET book_id = excluded.book_id,
                                          chapter_no = excluded.chapter_no,
                                          hadith_no = excluded.hadith_no,
                                          updated_at = CURRENT_TIMESTAMP
        """, (book_id, chapter_no, hadith_no))
        conn.commit()
        return True


def toggle_hadith_bookmark(hadith_id: int) -> Dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM hadith_bookmarks WHERE hadith_id = ?", (hadith_id,))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM hadith_bookmarks WHERE id = ?", (existing["id"],))
            conn.commit()
            return {"bookmarked": False, "hadith_id": hadith_id}
        else:
            cursor.execute("INSERT INTO hadith_bookmarks (hadith_id) VALUES (?)", (hadith_id,))
            conn.commit()
            return {"bookmarked": True, "hadith_id": hadith_id}

def export_user_data() -> dict:
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        def fetch_table(table_name):
            cursor.execute(f"SELECT * FROM {table_name}")
            return [dict(row) for row in cursor.fetchall()]

        return {
            "version": 1,
            "exported_at": datetime.now().isoformat(),
            "prayers_log": fetch_table("prayers_log"),
            "qaza_records": fetch_table("qaza_records"),
            "settings": fetch_table("settings"),
            "quran_bookmarks": fetch_table("quran_bookmarks"),
            "quran_last_read": fetch_table("quran_last_read"),
            "hadith_bookmarks": fetch_table("hadith_bookmarks")
        }


def import_user_data(data: dict) -> bool:
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Restore prayers_log
            for row in data.get("prayers_log", []):
                cursor.execute("""
                    INSERT INTO prayers_log (date, prayer_name, status, is_sunnah, notes, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(date, prayer_name) DO UPDATE SET
                        status = excluded.status,
                        is_sunnah = excluded.is_sunnah,
                        notes = excluded.notes,
                        updated_at = excluded.updated_at
                """, (row['date'], row['prayer_name'], row['status'], row['is_sunnah'], row['notes'], row['updated_at']))

            # Restore qaza_records
            for row in data.get("qaza_records", []):
                cursor.execute("""
                    UPDATE qaza_records 
                    SET total_missed = ?, completed = ?, updated_at = ?
                    WHERE prayer_name = ?
                """, (row['total_missed'], row['completed'], row['updated_at'], row['prayer_name']))

            # Restore settings
            for row in data.get("settings", []):
                cursor.execute("""
                    INSERT INTO settings (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """, (row['key'], row['value']))

            # Restore quran_bookmarks
            for row in data.get("quran_bookmarks", []):
                cursor.execute("""
                    INSERT OR IGNORE INTO quran_bookmarks (surah_no, ayah_no, created_at)
                    VALUES (?, ?, ?)
                """, (row['surah_no'], row['ayah_no'], row['created_at']))

            # Restore quran_last_read
            for row in data.get("quran_last_read", []):
                cursor.execute("""
                    INSERT INTO quran_last_read (id, surah_no, ayah_no, updated_at)
                    VALUES (1, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET surah_no = excluded.surah_no,
                                                  ayah_no = excluded.ayah_no,
                                                  updated_at = excluded.updated_at
                """, (row['surah_no'], row['ayah_no'], row['updated_at']))

            # Restore hadith_bookmarks
            for row in data.get("hadith_bookmarks", []):
                cursor.execute("""
                    INSERT OR IGNORE INTO hadith_bookmarks (hadith_id, created_at)
                    VALUES (?, ?)
                """, (row['hadith_id'], row['created_at']))

            conn.commit()
            return True
    except Exception as e:
        print(f"Import failed: {e}")
        return False
