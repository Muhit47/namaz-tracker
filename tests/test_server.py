import os
import tempfile
import unittest
import json
from datetime import date

# 1. Disable background downloading and redirect DB before importing server
import hadith_service
hadith_service.download_all_hadiths_background = lambda: None

import db
import server


class TestServerAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.app.config["TESTING"] = True

    def setUp(self):
        # Create an isolated temporary database for each test
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db_path = self.temp_file.name
        self.temp_file.close()

        self.orig_db_name = db.DB_NAME
        db.DB_NAME = self.temp_db_path
        db.init_db()

        self.client = server.app.test_client()

    def tearDown(self):
        db.DB_NAME = self.orig_db_name
        try:
            if os.path.exists(self.temp_db_path):
                os.remove(self.temp_db_path)
            for ext in ("-wal", "-shm"):
                wal_path = self.temp_db_path + ext
                if os.path.exists(wal_path):
                    os.remove(wal_path)
        except OSError:
            pass

    def test_root_and_static_routes(self):
        """Verify root route returns HTML and static fallback behavior."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.content_type)

        # Valid static file
        manifest_res = self.client.get("/manifest.json")
        self.assertEqual(manifest_res.status_code, 200)

        # Non-existent static file
        missing_res = self.client.get("/non_existent_file_xyz123.unknown")
        self.assertEqual(missing_res.status_code, 404)

    def test_get_prayers_endpoint(self):
        """Verify GET /api/prayers/<date_str> returns 5 daily prayers."""
        today_str = date.today().isoformat()
        res = self.client.get(f"/api/prayers/{today_str}?active=Fajr")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 5)

        fajr = next(p for p in data if p["prayer_name"] == "Fajr")
        self.assertTrue(fajr.get("is_active"))

    def test_post_prayers_endpoint(self):
        """Verify POST /api/prayers updates prayer status."""
        payload = {
            "date": "2026-10-26",
            "prayer_name": "Fajr",
            "status": "on_time",
            "is_sunnah": 1,
            "notes": "Prayed Fajr on time"
        }
        res = self.client.post("/api/prayers", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.get_json().get("success"))

        # Verify update persisted
        get_res = self.client.get("/api/prayers/2026-10-26")
        data = get_res.get_json()
        fajr = next(p for p in data if p["prayer_name"] == "Fajr")
        self.assertEqual(fajr["status"], "on_time")
        self.assertEqual(fajr["is_sunnah"], 1)
        self.assertEqual(fajr["notes"], "Prayed Fajr on time")

    def test_post_prayers_missing_fields(self):
        """Verify POST /api/prayers returns 400 on missing required fields."""
        res = self.client.post("/api/prayers", json={"date": "2026-10-26"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_qaza_endpoints(self):
        """Verify GET and POST /api/qaza endpoints."""
        # GET initial summary
        res = self.client.get("/api/qaza")
        self.assertEqual(res.status_code, 200)
        qaza_data = res.get_json()
        self.assertEqual(len(qaza_data), 5)

        # POST update missed count
        post_res = self.client.post("/api/qaza", json={"prayer_name": "Fajr", "action": "missed"})
        self.assertEqual(post_res.status_code, 200)
        self.assertTrue(post_res.get_json().get("success"))

        # Verify updated count
        res_after = self.client.get("/api/qaza")
        fajr = next(q for q in res_after.get_json() if q["prayer_name"] == "Fajr")
        self.assertEqual(fajr["total_missed"], 1)

        # Invalid action should return 400
        bad_action_res = self.client.post("/api/qaza", json={"prayer_name": "Fajr", "action": "invalid"})
        self.assertEqual(bad_action_res.status_code, 400)

        # Missing fields should return 400
        missing_res = self.client.post("/api/qaza", json={"prayer_name": "Fajr"})
        self.assertEqual(missing_res.status_code, 400)

    def test_settings_endpoints(self):
        """Verify GET and POST /api/settings endpoints."""
        # Save setting
        post_res = self.client.post("/api/settings", json={"key": "city", "value": "Sylhet"})
        self.assertEqual(post_res.status_code, 200)
        self.assertTrue(post_res.get_json().get("success"))

        # Retrieve setting
        get_res = self.client.get("/api/settings/city")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.get_json()["value"], "Sylhet")

        # Missing payload fields
        bad_res = self.client.post("/api/settings", json={})
        self.assertEqual(bad_res.status_code, 400)

    def test_stats_endpoints(self):
        """Verify monthly stats and detailed monthly stats endpoints."""
        # Monthly overview
        res1 = self.client.get("/api/stats/monthly?year=2026&month=10")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.get_json()
        self.assertIn("days", data1)
        self.assertIn("streak", data1)

        # Monthly detail
        res2 = self.client.get("/api/stats/monthly-detail?month=2026-10")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertIn("overview", data2)
        self.assertIn("by_prayer", data2)

    def test_quran_endpoints(self):
        """Verify Quran Surahs, bookmarks, and last-read endpoints."""
        # Seed a test Surah so JOIN quran_surahs succeeds
        with db.get_db_connection() as conn:
            conn.execute("""
                INSERT INTO quran_surahs (surah_no, name_ar, name_bn, name_en, meaning_bn, total_ayah, revelation_type)
                VALUES (1, 'الفاتحة', 'আল-ফাতিহা', 'Al-Fatihah', 'সূচনা', 7, 'Meccan')
            """)
            conn.commit()

        # Surahs list
        surahs_res = self.client.get("/api/quran/surahs")
        self.assertEqual(surahs_res.status_code, 200)
        self.assertEqual(len(surahs_res.get_json()), 1)

        # Surah detail (not found)
        not_found_res = self.client.get("/api/quran/surah/999")
        self.assertEqual(not_found_res.status_code, 404)

        # Quran bookmarks POST & GET
        bm_res = self.client.post("/api/quran/bookmarks", json={"surah_no": 1, "ayah_no": 1})
        self.assertEqual(bm_res.status_code, 200)
        self.assertTrue(bm_res.get_json()["bookmarked"])

        # Quran last-read POST & GET
        lr_post = self.client.post("/api/quran/last-read", json={"surah_no": 1, "ayah_no": 5})
        self.assertEqual(lr_post.status_code, 200)

        lr_get = self.client.get("/api/quran/last-read")
        self.assertEqual(lr_get.status_code, 200)
        self.assertEqual(lr_get.get_json()["surah_no"], 1)
        self.assertEqual(lr_get.get_json()["ayah_no"], 5)

    def test_hadith_endpoints(self):
        """Verify Hadith categories, books, bookmarks, and last-read endpoints."""
        # Categories & books
        self.assertEqual(self.client.get("/api/hadith/categories").status_code, 200)
        self.assertEqual(self.client.get("/api/hadith/books").status_code, 200)
        self.assertEqual(self.client.get("/api/hadith/full-books").status_code, 200)
        self.assertEqual(self.client.get("/api/hadith/daily").status_code, 200)
        self.assertEqual(self.client.get("/api/hadith/all").status_code, 200)

        # Hadith bookmarks
        bm_bad = self.client.post("/api/hadith/bookmarks", json={})
        self.assertEqual(bm_bad.status_code, 400)

        # Hadith last-read POST & GET
        lr_post = self.client.post("/api/hadith/last-read", json={
            "book_id": "bukhari",
            "chapter_no": 1,
            "hadith_no": 1
        })
        self.assertEqual(lr_post.status_code, 200)

        lr_get = self.client.get("/api/hadith/last-read")
        self.assertEqual(lr_get.status_code, 200)
        self.assertEqual(lr_get.get_json()["book_id"], "bukhari")

    def test_backup_endpoints(self):
        """Verify GET /api/backup/export and POST /api/backup/import endpoints."""
        # Export
        export_res = self.client.get("/api/backup/export")
        self.assertEqual(export_res.status_code, 200)
        backup_data = export_res.get_json()
        self.assertIn("prayers_log", backup_data)
        self.assertIn("qaza_records", backup_data)

        # Import valid backup
        import_res = self.client.post("/api/backup/import", json=backup_data)
        self.assertEqual(import_res.status_code, 200)
        self.assertTrue(import_res.get_json().get("success"))

        # Import invalid structure (unrecognizable keys)
        bad_res = self.client.post("/api/backup/import", json={"unrecognized": True})
        self.assertEqual(bad_res.status_code, 400)

        # Import malformed prayers_log
        bad_log_res = self.client.post("/api/backup/import", json={"prayers_log": "not_a_list"})
        self.assertEqual(bad_log_res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
