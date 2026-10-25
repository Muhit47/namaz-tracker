import json
import urllib.request
from typing import Dict, List, Optional
import db
from transliteration import transliterate_arabic_to_bangla, transliterate_arabic_to_english

BOOK_CONFIG = {
    "bukhari": {
        "ben": "ben-bukhari",
        "ara": "ara-bukhari",
        "eng": "eng-bukhari",
        "name_bn": "সহীহ বুখারী",
        "name_en": "Sahih al-Bukhari",
        "name_ar": "صحيح البخاري",
        "total_hadith": 7563
    },
    "muslim": {
        "ben": "ben-muslim",
        "ara": "ara-muslim",
        "eng": "eng-muslim",
        "name_bn": "সহীহ মুসলিম",
        "name_en": "Sahih Muslim",
        "name_ar": "صحيح مسلم",
        "total_hadith": 7500
    },
    "tirmidhi": {
        "ben": "ben-tirmidhi",
        "ara": "ara-tirmidhi",
        "eng": "eng-tirmidhi",
        "name_bn": "জামে আত-তিরমিযী",
        "name_en": "Jami' at-Tirmidhi",
        "name_ar": "جامع الترمذي",
        "total_hadith": 3956
    },
    "abu_dawood": {
        "ben": "ben-abudawud",
        "ara": "ara-abudawud",
        "eng": "eng-abudawud",
        "name_bn": "সুনানে আবু দাউদ",
        "name_en": "Sunan Abi Dawud",
        "name_ar": "سنن أبي داود",
        "total_hadith": 5274
    },
    "nasai": {
        "ben": "ben-nasai",
        "ara": "ara-nasai",
        "eng": "eng-nasai",
        "name_bn": "সুনানে আন-নাসায়ী",
        "name_en": "Sunan an-Nasa'i",
        "name_ar": "سنن النسائي",
        "total_hadith": 5758
    },
    "ibn_majah": {
        "ben": "ben-ibnmajah",
        "ara": "ara-ibnmajah",
        "eng": "eng-ibnmajah",
        "name_bn": "সুনানে ইবনে মাজাহ",
        "name_en": "Sunan Ibn Majah",
        "name_ar": "سنن ابن ماجه",
        "total_hadith": 4341
    },
    "malik": {
        "ben": "ben-malik",
        "ara": "ara-malik",
        "eng": "eng-malik",
        "name_bn": "মুয়াত্তা মালিক",
        "name_en": "Muwatta Malik",
        "name_ar": "موطأ مالك",
        "total_hadith": 1858
    }
}

# Common Bengali chapter names mapping for high-frequency chapters
CHAPTER_NAMES_BN = {
    "Revelation": "ওহী বা প্রত্যাদেশ",
    "Belief": "ঈমান (বিশ্বাস)",
    "Knowledge": "ইলম বা জ্ঞান",
    "Ablutions (Wudu')": "ওজু ও পবিত্রতা",
    "Bathing (Ghusl)": "গোসল",
    "Menstrual Periods": "ঋতুস্রাব (হায়িজ)",
    "Rubbing hands and feet with dust (Tayammum)": "তায়াম্মুম",
    "Prayers (Salat)": "নামায (সালাত)",
    "Times of the Prayers": "নামাযের ওয়াক্তসমূহ",
    "Call to Prayers (Adhaan)": "আযান ও ইকামত",
    "Friday Prayer": "জুমার নামায",
    "Fear Prayer": "ভয়ের নামায (সালাতুল খাওফ)",
    "The Two Festivals (Eids)": "দুই ঈদের নামায",
    "Witr Prayer": "বিতর নামায",
    "Invoking Allah for Rain (Istisqaa)": "বৃষ্টির জন্য প্রার্থনা (ইস্তিসকা)",
    "Eclipses": "সূর্যগ্রহণ ও চন্দ্রগ্রহণের নামায (কুসুফ)",
    "Prostration During Recital of Qur'an": "তিলাওয়াতে সিজদা",
    "Shortening the Prayers": "মুসাফিরের নামায কসর করা",
    "Prayer at Night (Tahajjud)": "তাহাজ্জুদ ও রাতের নামায",
    "Virtues of Prayer at Masjid Shukr": "মসজিদে নামাযের ফজিলত",
    "Actions while Praying": "নামাযরত অবস্থায় করণীয় ও বর্জনীয়",
    "Funerals (Al-Janaa'iz)": "জানাযার বিধিবিধান",
    "Obligatory Charity Tax (Zakat)": "যাকাত",
    "Hajj (Pilgrimage)": "হজ্জ",
    "Fasting": "রোজা বা সিয়াম",
    "Tarawih": "তারাবীহর নামায",
    "Sales and Trade": "ক্রয়-বিক্রয় ও ব্যবসা-বাণিজ্য",
    "Distribution of Water": "পানি বণ্টন ও সেচ",
    "Loans, Payment of Loans, Freezing of Property, Bankruptcy": "ঋণ ও দেনা পরিশোধ",
    "Lost Things Picked up by Someone (Luqatah)": "কুড়িয়ে পাওয়া বস্তু",
    "Oppressions": "জুলুম ও অন্যায়ের পরিণাম",
    "Partnership": "অংশীদারিত্ব (শিরকাত)",
    "Mortgaging": "বন্ধক রাখা",
    "Manumission of Slaves": "দাস মুক্তি",
    "Gifts": "উপহার ও হাদিয়া",
    "Witnesses": "সাক্ষ্য ও সাক্ষীর শর্ত",
    "Peacemaking": "আপোষ-মীমাংসা",
    "Conditions": "শর্তাবলী ও চুক্তি",
    "Wills and Testaments (Wasaayaa)": "ওসিয়তনামা",
    "Fighting for the Cause of Allah (Jihaad)": "জিহাদ ও আল্লাহর পথে প্রচেষ্টা",
    "The Book of Jihad and Expeditions": "জিহাদ ও সামরিক অভিযান",
    "Prophets": "নবী-রাসূলগণের বিবরণ",
    "Virtues and Merits of the Companions": "সাহাবায়ে কেরামের মর্যাদা",
    "Merits of the Helpers in Madinah (Ansaar)": "আনসারগণের মর্যাদা",
    "Military Expeditions led by the Prophet (pbuh) (Al-Maghaazi)": "মাগাযী (রাসূল ﷺ এর যুদ্ধাভিযান)",
    "Prophetic Commentary on the Qur'an (Tafseer)": "কুরআনের তাফসীর",
    "Virtues of the Qur'an": "কুরআনের ফজিলত",
    "Wedlock, Marriage (Nikaah)": "বিবাহ (নিকাহ)",
    "Divorce": "তালাক",
    "Supporting the Family": "পরিবারের ভরণপোষণ",
    "Food, Meals": "খাবার ও আহারের আদব",
    "Sacrifice on Occasion of Birth (`Aqiqa)": "আকিকা",
    "Hunting, Slaughtering": "শিকার ও পশু জবেহ",
    "Al-Adha Festival Sacrifice (Adaahi)": "কোরবানী",
    "Drinks": "পানীয় দ্রব্য ও বিধিবিধান",
    "Patients": "রোগী ও অসুস্থদের সেবা",
    "Medicine": "চিকিৎসা ও ঔষধ",
    "Dress": "পোশাক-পরিচ্ছদ",
    "Good Manners and Form (Al-Adab)": "উত্তম চরিত্র ও শিষ্টাচার (আদব)",
    "Asking Permission": "অনুমতি প্রার্থনা ও সালাম",
    "Invocations": "দুআ ও মোনাজাত",
    "To make the Heart Tender (Ar-Riqaq)": "অন্তর গলানোর উপদেশ (রিকাক)",
    "Divine Will (Al-Qadar)": "তাকদীর বা ভাগ্য",
    "Oaths and Vows": "শপথ ও মানত",
    "Expiation for Unfulfilled Oaths": "কাফফারা",
    "Inheritance Laws (Al-Faraa'id)": "উত্তরাধিকার আইন (ফারায়েজ)",
    "Punishments (Al-Hudood)": "দণ্ডবিধি (হুদূদ)",
    "Blood Money (Ad-Diyat)": "রক্তপণ (দিয়াত)",
    "Apostates": "মুরতাদের বিধান",
    "Saying Something under Compulsion (Ikrah)": "বাধ্যবাধকতায় বলা কথা",
    "Tricks": "কৌশল ও হীলাহ",
    "Interpretation of Dreams": "স্বপ্নের ব্যাখ্যা",
    "Afflictions and the End of the World": "ফিতনা ও কিয়ামতের আলামত",
    "Judgments (Ahkaam)": "বিচার ও বিচারকের ফয়সালা",
    "Wishes": "আকাঙ্ক্ষা ও বাসনা",
    "Holding Fast to the Qur'an and Sunnah": "কুরআন ও সুন্নাহকে আঁকড়ে ধরা",
    "Oneness, Uniqueness of Allah (Tawheed)": "তাওহীদ (আল্লাহর একত্ববাদ)"
}

def get_chapter_title_bn(name_en: str) -> str:
    cleaned = name_en.strip()
    if cleaned in CHAPTER_NAMES_BN:
        return f"{CHAPTER_NAMES_BN[cleaned]} ({cleaned})"
    for k, v in CHAPTER_NAMES_BN.items():
        if k.lower() in cleaned.lower():
            return f"{v} ({cleaned})"
    return cleaned or "সাধারণ অধ্যায়"


def fetch_and_cache_chapters(book_id: str) -> List[Dict]:
    cfg = BOOK_CONFIG.get(book_id)
    if not cfg:
        return []
    
    ben_edition = cfg["ben"]
    url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{ben_edition}.min.json"
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    stream = urllib.request.urlopen(req, timeout=15)
    buffer = b""
    sections = {}
    section_details = {}
    
    for _ in range(60):
        chunk = stream.read(65536)
        if not chunk:
            break
        buffer += chunk
        idx = buffer.find(b'"hadiths":')
        if idx != -1:
            meta_str = buffer[:idx].rstrip(b", \r\n\t") + b"}"
            data = json.loads(meta_str.decode("utf-8", errors="ignore"))
            sections = data.get("metadata", {}).get("sections", {})
            section_details = data.get("metadata", {}).get("section_details", {})
            break
    stream.close()

    chapters_to_save = []
    for sec_no_str, sec_name in sections.items():
        try:
            sec_no = int(sec_no_str)
        except ValueError:
            continue
        if sec_no == 0:
            continue
        
        detail = section_details.get(sec_no_str, {})
        start_h = detail.get("hadithnumber_first", 0)
        end_h = detail.get("hadithnumber_last", 0)
        total_h = max(0, end_h - start_h + 1) if (end_h >= start_h and start_h > 0) else 0
        name_bn = get_chapter_title_bn(sec_name)
        
        chapters_to_save.append({
            "chapter_no": sec_no,
            "name_bn": name_bn,
            "name_ar": "",
            "total_hadith": total_h,
            "start_hadith": start_h,
            "end_hadith": end_h
        })
    
    if chapters_to_save:
        db.save_hadith_chapters(book_id, chapters_to_save)
    
    return db.get_hadith_chapters(book_id)


def fetch_and_cache_chapter_items(book_id: str, chapter_no: int) -> List[Dict]:
    cfg = BOOK_CONFIG.get(book_id)
    if not cfg:
        return []
    
    ben_edition = cfg["ben"]
    ara_edition = cfg["ara"]
    eng_edition = cfg.get("eng", f"eng-{book_id}")
    
    ben_url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{ben_edition}/sections/{chapter_no}.json"
    ara_url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{ara_edition}/sections/{chapter_no}.json"
    eng_url = f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{eng_edition}/sections/{chapter_no}.json"
    
    # 1. Fetch Bengali Hadiths
    try:
        req = urllib.request.Request(ben_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        ben_data = json.loads(res.read().decode("utf-8"))
        ben_hadiths = ben_data.get("hadiths", [])
    except Exception as e:
        print(f"Error fetching Bengali hadiths: {e}")
        ben_hadiths = []

    # 2. Fetch Arabic Hadiths
    ara_map = {}
    try:
        req = urllib.request.Request(ara_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        ara_data = json.loads(res.read().decode("utf-8"))
        for h in ara_data.get("hadiths", []):
            h_no = h.get("hadithnumber")
            if h_no is not None:
                ara_map[h_no] = h.get("text", "")
    except Exception as e:
        print(f"Error fetching Arabic hadiths: {e}")

    # 3. Fetch English Hadiths
    eng_map = {}
    try:
        req = urllib.request.Request(eng_url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=15)
        eng_data = json.loads(res.read().decode("utf-8"))
        for h in eng_data.get("hadiths", []):
            h_no = h.get("hadithnumber")
            if h_no is not None:
                eng_map[h_no] = h.get("text", "")
    except Exception as e:
        print(f"Error fetching English hadiths: {e}")

    items_to_save = []
    for h in ben_hadiths:
        h_no = h.get("hadithnumber", 0)
        ar_no = h.get("arabicnumber", h_no)
        text_bn = h.get("text", "").strip()
        text_ar = ara_map.get(h_no, "")
        text_en = eng_map.get(h_no, "").strip()
        
        grades = h.get("grades", [])
        grade_str = ""
        if grades:
            grade_str = ", ".join(f"{g.get('name', '')}: {g.get('grade', '')}" for g in grades if g.get("grade"))
        
        translit_bn = transliterate_arabic_to_bangla(text_ar) if text_ar else ""
        translit_en = transliterate_arabic_to_english(text_ar) if text_ar else ""
        items_to_save.append({
            "hadith_no": h_no,
            "arabic_no": ar_no,
            "text_ar": text_ar,
            "translit_bn": translit_bn,
            "translit_en": translit_en,
            "text_bn": text_bn,
            "text_en": text_en,
            "grade_bn": grade_str
        })

    if items_to_save:
        db.save_hadith_chapter_items(book_id, chapter_no, items_to_save)

    return db.get_hadith_chapter_items(book_id, chapter_no)
