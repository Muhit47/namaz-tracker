import os
import tempfile
import unittest
import sqlite3
from datetime import date, timedelta
import db


class TestDatabaseOperations(unittest.TestCase):
    def setUp(self):
        # Create a fresh isolated temporary database for each test
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_path = self.temp_file.name
        self.temp_file.close()

        self.orig_db_name = db.DB_NAME
        db.DB_NAME = self.temp_db_path
        db.init_db()

    def tearDown(self):
        db.DB_NAME = self.orig_db_name
        # Cleanup temporary database files (including WAL/SHM)
        try:
            if os.path.exists(self.temp_db_path):
                os.remove(self.temp_db_path)
            for ext in ("-wal", "-shm"):
                wal_path = self.temp_db_path + ext
                if os.path.exists(wal_path):
                    os.remove(wal_path)
        except OSError:
            pass

    def test_init_db_creates_required_tables(self):
        """Verify that init_db creates all expected SQLite tables."""
        with db.get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row["name"] for row in cursor.fetchall()}

        expected_tables = {
            "prayers_log",
            "qaza_records",
            "settings",
            "quran_surahs",
            "quran_ayahs",
            "quran_bookmarks",
            "quran_last_read",
            "hadith_categories",
            "hadith_books",
            "hadiths",
            "hadith_bookmarks",
            "hadith_chapters",
            "hadith_full_collection",
            "hadith_last_read"
        }
        for table in expected_tables:
            self.assertIn(table, tables, f"Expected table '{table}' to be created")

    def test_get_prayers_for_date_defaults(self):
        """Verify defaults returned for unrecorded date (5 prayers with 'pending' status)."""
        test_date = "2026-10-26"
        prayers = db.get_prayers_for_date(test_date)
        self.assertEqual(len(prayers), 5)
        prayer_names = [p["prayer_name"] for p in prayers]
        self.assertEqual(prayer_names, ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"])
        for p in prayers:
            self.assertEqual(p["status"], "pending")
            self.assertEqual(p["is_sunnah"], 0)
            self.assertEqual(p["notes"], "")

    def test_update_prayer_status(self):
        """Verify updating status, is_sunnah flag, and notes for a prayer."""
        test_date = "2026-10-26"
        db.update_prayer_status(test_date, "Fajr", "on_time", 1, "Completed on time")

        prayers = db.get_prayers_for_date(test_date)
        fajr = next(p for p in prayers if p["prayer_name"] == "Fajr")
        self.assertEqual(fajr["status"], "on_time")
        self.assertEqual(fajr["is_sunnah"], 1)
        self.assertEqual(fajr["notes"], "Completed on time")

        # Test updating to late and modifying notes
        db.update_prayer_status(test_date, "Dhuhr", "late", 0, "Prayed late")
        prayers = db.get_prayers_for_date(test_date)
        dhuhr = next(p for p in prayers if p["prayer_name"] == "Dhuhr")
        self.assertEqual(dhuhr["status"], "late")
        self.assertEqual(dhuhr["is_sunnah"], 0)
        self.assertEqual(dhuhr["notes"], "Prayed late")

        # Invalid status should raise ValueError
        with self.assertRaises(ValueError):
            db.update_prayer_status(test_date, "Asr", "invalid_status", 0, "")

    def test_qaza_summary_and_update(self):
        """Verify qaza record incrementing (missed), decrementing (completed), and reset."""
        qaza = db.get_qaza_summary()
        self.assertEqual(len(qaza), 5)
        fajr_initial = next(q for q in qaza if q["prayer_name"] == "Fajr")
        self.assertEqual(fajr_initial["total_missed"], 0)
        self.assertEqual(fajr_initial["completed"], 0)

        # Mark prayer as missed
        db.update_qaza("Fajr", "missed")
        db.update_qaza("Fajr", "missed")
        qaza_after_missed = db.get_qaza_summary()
        fajr_missed = next(q for q in qaza_after_missed if q["prayer_name"] == "Fajr")
        self.assertEqual(fajr_missed["total_missed"], 2)
        self.assertEqual(fajr_missed["completed"], 0)

        # Mark prayer as completed
        db.update_qaza("Fajr", "completed")
        qaza_after_completed = db.get_qaza_summary()
        fajr_completed = next(q for q in qaza_after_completed if q["prayer_name"] == "Fajr")
        self.assertEqual(fajr_completed["total_missed"], 2)
        self.assertEqual(fajr_completed["completed"], 1)

        # Reset
        db.update_qaza("Fajr", "reset")
        qaza_after_reset = db.get_qaza_summary()
        fajr_reset = next(q for q in qaza_after_reset if q["prayer_name"] == "Fajr")
        self.assertEqual(fajr_reset["total_missed"], 0)
        self.assertEqual(fajr_reset["completed"], 0)

        # Invalid action should raise ValueError
        with self.assertRaises(ValueError):
            db.update_qaza("Fajr", "unknown_action")

    def test_settings_get_and_set(self):
        """Verify setting and retrieving key-value pairs."""
        self.assertIsNone(db.get_setting("non_existent_key"))

        db.set_setting("theme", "dark")
        self.assertEqual(db.get_setting("theme"), "dark")

        # Overwrite setting
        db.set_setting("theme", "light")
        self.assertEqual(db.get_setting("theme"), "light")

    def test_monthly_summary(self):
        """Verify monthly summary counts across multiple days."""
        # Log a prayer on Oct 1 and Oct 2
        db.update_prayer_status("2026-10-01", "Fajr", "on_time", 1, "")
        db.update_prayer_status("2026-10-01", "Dhuhr", "jamaah", 0, "")
        db.update_prayer_status("2026-10-02", "Asr", "missed", 0, "")

        summary = db.get_monthly_summary(2026, 10)
        self.assertEqual(len(summary), 2)

        day_1 = next(d for d in summary if d["date"] == "2026-10-01")
        self.assertEqual(day_1["total_prayed"], 2)
        self.assertEqual(day_1["jamaah_count"], 1)
        self.assertEqual(day_1["missed_count"], 0)

        day_2 = next(d for d in summary if d["date"] == "2026-10-02")
        self.assertEqual(day_2["total_prayed"], 0)
        self.assertEqual(day_2["missed_count"], 1)

    def test_monthly_detailed_stats(self):
        """Verify calculation of detailed statistics including totals and breakdown."""
        db.update_prayer_status("2026-10-05", "Fajr", "jamaah", 1, "")
        db.update_prayer_status("2026-10-05", "Dhuhr", "on_time", 1, "")
        db.update_prayer_status("2026-10-05", "Asr", "missed", 0, "")

        stats = db.get_monthly_detailed_stats(2026, 10)
        self.assertIn("overview", stats)
        self.assertIn("by_prayer", stats)

        overview = stats["overview"]
        self.assertEqual(overview["total_prayed"], 2)
        self.assertEqual(overview["jamaah_count"], 1)
        self.assertEqual(overview["ontime_count"], 1)
        self.assertEqual(overview["missed_count"], 1)
        self.assertEqual(overview["sunnah_count"], 2)

        by_prayer = stats["by_prayer"]
        self.assertEqual(by_prayer["Fajr"]["jamaah_count"], 1)
        self.assertEqual(by_prayer["Dhuhr"]["ontime_count"], 1)
        self.assertEqual(by_prayer["Asr"]["missed_count"], 1)

    def test_streak_stats(self):
        """Verify streak calculation for consecutive qualifying prayer days."""
        today = date.today()
        # Seed 3 consecutive days where all 5 prayers were completed on time
        for days_ago in (2, 1, 0):
            d_str = (today - timedelta(days=days_ago)).isoformat()
            for prayer in db.PRAYER_NAMES:
                db.update_prayer_status(d_str, prayer, "on_time", 0, "")

        streak = db.get_streak_stats()
        self.assertEqual(streak["current_streak"], 3)
        self.assertEqual(streak["max_streak"], 3)

    def test_quran_surahs_and_bookmarks(self):
        """Verify Quran Surahs retrieval, bookmark toggling, and last read tracking."""
        # Seed a test Surah in temporary DB so bookmark joins succeed
        with db.get_db_connection() as conn:
            conn.execute("""
                INSERT INTO quran_surahs (surah_no, name_ar, name_bn, name_en, meaning_bn, total_ayah, revelation_type)
                VALUES (1, 'الفاتحة', 'আল-ফাতিহা', 'Al-Fatihah', 'সূচনা', 7, 'Meccan')
            """)
            conn.commit()

        surahs = db.get_all_surahs()
        self.assertEqual(len(surahs), 1)
        self.assertEqual(surahs[0]["surah_no"], 1)

        # Bookmarks toggle
        res1 = db.toggle_quran_bookmark(1, 1)
        self.assertTrue(res1["bookmarked"])
        bookmarks = db.get_quran_bookmarks()
        self.assertTrue(any(b["surah_no"] == 1 and b["ayah_no"] == 1 for b in bookmarks))

        res2 = db.toggle_quran_bookmark(1, 1)
        self.assertFalse(res2["bookmarked"])

        # Last read position
        db.set_quran_last_read(1, 7)
        last_read = db.get_quran_last_read()
        self.assertIsNotNone(last_read)
        self.assertEqual(last_read["surah_no"], 1)
        self.assertEqual(last_read["ayah_no"], 7)

    def test_hadith_categories_and_bookmarks(self):
        """Verify Hadith categories, daily hadith, bookmarking, and chapter caching."""
        cats = db.get_hadith_categories()
        self.assertIsInstance(cats, list)

        books = db.get_hadith_books()
        self.assertIsInstance(books, list)

        full_books = db.get_full_hadith_books()
        self.assertIsInstance(full_books, list)

        # Save and get chapters
        test_chapters = [
            {"chapter_no": 1, "name_bn": "ওহীর সূচনা", "name_ar": "بدء الوحي", "name_en": "Revelation", "total_hadith": 7}
        ]
        db.save_hadith_chapters("bukhari", test_chapters)
        retrieved_chapters = db.get_hadith_chapters("bukhari")
        self.assertEqual(len(retrieved_chapters), 1)
        self.assertEqual(retrieved_chapters[0]["name_bn"], "ওহীর সূচনা")

        # Save and get chapter items
        test_items = [
            {
                "hadith_no": 1,
                "arabic_no": 1,
                "text_ar": "إنما الأعمال بالنيات",
                "translit_bn": "ইন্নামাল আ'মালু বিন নিয়্যাত",
                "text_bn": "কাজের ফলাফল নিয়তের উপর নির্ভরশীল",
                "grade_bn": "সহীহ",
                "translit_en": "Innamal a'malu bin niyyat",
                "text_en": "Actions are judged by intentions"
            }
        ]
        db.save_hadith_chapter_items("bukhari", 1, test_items)
        items = db.get_hadith_chapter_items("bukhari", 1)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["hadith_no"], 1)

        # Last read hadith
        db.set_hadith_last_read("bukhari", 1, 1)
        last_hadith = db.get_hadith_last_read()
        self.assertIsNotNone(last_hadith)
        self.assertEqual(last_hadith["book_id"], "bukhari")

    def test_export_and_import_user_data(self):
        """Verify full round-trip export and atomic import of user tracking data."""
        # 1. Populate some data
        db.update_prayer_status("2026-10-26", "Fajr", "on_time", 1, "Export test note")
        db.update_qaza("Fajr", "missed")
        db.set_setting("export_test_key", "test_val")
        db.toggle_quran_bookmark(1, 1)
        db.set_quran_last_read(1, 7)

        # 2. Export
        export_data = db.export_user_data()
        self.assertIn("prayers_log", export_data)
        self.assertIn("qaza_records", export_data)
        self.assertIn("settings", export_data)
        self.assertTrue(len(export_data["prayers_log"]) > 0)

        # 3. Modify current DB to prove restore overwrites / updates
        db.update_prayer_status("2026-10-26", "Fajr", "missed", 0, "")
        db.set_setting("export_test_key", "overwritten")

        # 4. Import
        success = db.import_user_data(export_data)
        self.assertTrue(success)

        # 5. Verify restored state
        prayers = db.get_prayers_for_date("2026-10-26")
        fajr = next(p for p in prayers if p["prayer_name"] == "Fajr")
        self.assertEqual(fajr["status"], "on_time")
        self.assertEqual(fajr["is_sunnah"], 1)
        self.assertEqual(fajr["notes"], "Export test note")
        self.assertEqual(db.get_setting("export_test_key"), "test_val")

    def test_import_invalid_user_data(self):
        """Verify import rejection on invalid data format."""
        self.assertFalse(db.import_user_data("not a dictionary"))
        self.assertFalse(db.import_user_data({"prayers_log": "invalid_not_a_list"}))
        self.assertFalse(db.import_user_data({"prayers_log": [{"bad_schema": True}]}))


if __name__ == "__main__":
    unittest.main()
