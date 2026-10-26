import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify, send_from_directory
from db import (
    init_db,
    get_prayers_for_date,
    update_prayer_status,
    get_qaza_summary,
    update_qaza,
    get_setting,
    set_setting,
    get_monthly_summary,
    get_monthly_detailed_stats,
    get_streak_stats,
    get_all_surahs,
    get_surah_details,
    get_quran_bookmarks,
    toggle_quran_bookmark,
    get_quran_last_read,
    set_quran_last_read,
    export_user_data,
    import_user_data,
    get_hadith_categories,
    get_hadith_books,
    get_all_hadiths,
    get_daily_hadith,
    get_hadith_bookmarks,
    toggle_hadith_bookmark,
    get_full_hadith_books,
    get_hadith_chapters,
    get_hadith_chapter_items,
    get_hadith_last_read,
    set_hadith_last_read
)
from hadith_service import fetch_and_cache_chapters, fetch_and_cache_chapter_items
import os
from datetime import datetime, date

app = Flask(__name__, static_folder="static")

init_db()


@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/<path:filename>")
def serve_root_static(filename):
    static_path = os.path.join("static", filename)
    if os.path.isfile(static_path):
        return send_from_directory("static", filename)
    return jsonify({"error": "Not found"}), 404


def get_approximate_active_waqt(time_str: str) -> str:
    """Return active prayer name using fallback approximate times:
    Fajr: 04:00-06:30, Dhuhr: 12:00-15:00, Asr: 15:00-17:30,
    Maghrib: 17:30-19:30, Isha: 19:30-04:00.
    """
    if "04:00" <= time_str < "06:30":
        return "Fajr"
    elif "12:00" <= time_str < "15:00":
        return "Dhuhr"
    elif "15:00" <= time_str < "17:30":
        return "Asr"
    elif "17:30" <= time_str < "19:30":
        return "Maghrib"
    elif time_str >= "19:30" or time_str < "04:00":
        return "Isha"
    return ""


@app.route("/api/prayers/<date_str>")
def get_prayers(date_str):
    try:
        prayers = get_prayers_for_date(date_str)
        is_today = (date_str == date.today().isoformat())
        active_waqt = get_approximate_active_waqt(datetime.now().strftime("%H:%M")) if is_today else None

        for p in prayers:
            p["is_active"] = bool(is_today and p.get("prayer_name") == active_waqt)

        return jsonify(prayers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/prayers", methods=["POST"])
def update_prayer():
    try:
        data = request.get_json() or {}
        date_str = data.get("date")
        prayer_name = data.get("prayer_name")

        if not all([date_str, prayer_name]):
            return jsonify({"error": "Missing required fields"}), 400

        from db import get_prayers_for_date, update_prayer_status
        prayers = get_prayers_for_date(date_str)
        curr = next((p for p in prayers if p['prayer_name'] == prayer_name), None)

        status = data.get("status") if "status" in data and data["status"] else (curr['status'] if curr else 'pending')
        is_sunnah = data.get("is_sunnah") if "is_sunnah" in data else (curr['is_sunnah'] if curr else 0)
        notes = data.get("notes") if "notes" in data else (curr['notes'] if curr else "")

        update_prayer_status(date_str, prayer_name, status, is_sunnah, notes)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/qaza")
def get_qaza():
    try:
        qaza = get_qaza_summary()
        return jsonify(qaza)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/qaza", methods=["POST"])
def update_qaza_record():
    try:
        data = request.get_json()
        prayer_name = data.get("prayer_name")
        action = data.get("action")

        if not all([prayer_name, action]):
            return jsonify({"error": "Missing required fields"}), 400

        update_qaza(prayer_name, action)
        return jsonify({"success": True})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/settings/<key>")
def get_setting_route(key):
    try:
        value = get_setting(key)
        return jsonify({"key": key, "value": value})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/settings", methods=["POST"])
def set_setting_route():
    try:
        data = request.get_json()
        key = data.get("key")
        value = data.get("value")

        if not key or value is None:
            return jsonify({"error": "Missing required fields"}), 400

        set_setting(key, value)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats/monthly")
def get_monthly_stats():
    try:
        year = int(request.args.get("year", 0))
        month = int(request.args.get("month", 0))

        if not year or not month:
            from datetime import datetime
            now = datetime.now()
            year = now.year
            month = now.month

        monthly = get_monthly_summary(year, month)
        streak = get_streak_stats()

        return jsonify({
            "year": year,
            "month": month,
            "days": monthly,
            "streak": streak
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats/monthly-detail")
def get_monthly_detailed_stats_route():
    try:
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            from datetime import datetime
            now = datetime.now()
            year = now.year
            month = now.month

        stats = get_monthly_detailed_stats(year, month)
        return jsonify({"year": year, "month": month, **stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/quran/surahs")
def get_quran_surahs_route():
    try:
        return jsonify(get_all_surahs())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/quran/surah/<int:surah_no>")
def get_quran_surah_route(surah_no):
    try:
        data = get_surah_details(surah_no)
        if not data:
            return jsonify({"error": "Surah not found"}), 404
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/quran/bookmarks", methods=["GET", "POST"])
def quran_bookmarks_route():
    try:
        if request.method == "POST":
            req = request.get_json() or {}
            res = toggle_quran_bookmark(int(req["surah_no"]), int(req["ayah_no"]))
            return jsonify(res)
        return jsonify(get_quran_bookmarks())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/quran/last-read", methods=["GET", "POST"])
def quran_last_read_route():
    try:
        if request.method == "POST":
            req = request.get_json() or {}
            set_quran_last_read(int(req["surah_no"]), int(req["ayah_no"]))
            return jsonify({"success": True})
        return jsonify(get_quran_last_read() or {})
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/api/hadith/all")
def get_hadiths_route():
    try:
        category = request.args.get("category")
        book = request.args.get("book")
        search = request.args.get("search")
        return jsonify(get_all_hadiths(category=category, book=book, search=search))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/categories")
def get_hadith_categories_route():
    try:
        return jsonify(get_hadith_categories())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/books")
def get_hadith_books_route():
    try:
        return jsonify(get_hadith_books())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/daily")
def get_hadith_daily_route():
    try:
        return jsonify(get_daily_hadith() or {})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/bookmarks", methods=["GET", "POST"])
def hadith_bookmarks_route():
    try:
        if request.method == "POST":
            req = request.get_json() or {}
            hadith_id = int(req.get("hadith_id", 0))
            if not hadith_id:
                return jsonify({"error": "hadith_id required"}), 400
            res = toggle_hadith_bookmark(hadith_id)
            return jsonify(res)
        return jsonify(get_hadith_bookmarks())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/hadith/full-books")
def get_full_hadith_books_route():
    try:
        return jsonify(get_full_hadith_books())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/book/<book_id>/chapters")
def get_hadith_chapters_route(book_id):
    try:
        chapters = get_hadith_chapters(book_id)
        if not chapters:
            chapters = fetch_and_cache_chapters(book_id)
        return jsonify(chapters)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/book/<book_id>/chapter/<int:chapter_no>")
def get_hadith_chapter_route(book_id, chapter_no):
    try:
        items = get_hadith_chapter_items(book_id, chapter_no)
        if not items or (items and (not items[0].get("text_en") or not items[0].get("translit_en"))):
            items = fetch_and_cache_chapter_items(book_id, chapter_no)
        return jsonify({"book_id": book_id, "chapter_no": chapter_no, "hadiths": items})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/hadith/last-read", methods=["GET", "POST"])
def hadith_last_read_route():
    try:
        if request.method == "POST":
            req = request.get_json() or {}
            book_id = req.get("book_id", "")
            chapter_no = int(req.get("chapter_no", 1))
            hadith_no = int(req.get("hadith_no", 1))
            set_hadith_last_read(book_id, chapter_no, hadith_no)
            return jsonify({"success": True})
        return jsonify(get_hadith_last_read() or {})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/backup/export")
def export_backup():
    try:
        return jsonify(export_user_data())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/backup/import", methods=["POST"])
def import_backup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        data.pop('local_settings', None)
        if import_user_data(data):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to import data"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1")
    print(f"🚀 Namaz Tracker Server is running at http://localhost:{port}")
    app.run(debug=debug, host=os.environ.get("HOST", "0.0.0.0"), port=port)