# -*- coding: utf-8 -*-
"""
Arabic to Bengali and English Transliteration Engine
Converts Harakat-vocalized Arabic text into natural Bengali and English pronunciation.
"""

import re

# Standard whole phrases for perfect authentic pronunciation
SACRED_PHRASES_BN = {
    'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ': 'সাল্লাল্লাহু ‘আলাইহি ওয়া সাল্লাম',
    'صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ': 'সাল্লাল্লাহু ‘আলাইহি ওয়া সাল্লাম',
    'رَضِيَ اللَّهُ عَنْهُ': 'রাদিয়াল্লাহু ‘আনহু',
    'رَضِيَ اللهُ عَنْهُ': 'রাদিয়াল্লাহু ‘আনহু',
    'رَضِيَ اللَّهُ عَنْهَا': 'রাদিয়াল্লাহু ‘আনহা',
    'رَضِيَ اللهُ عَنْهَا': 'রাদিয়াল্লাহু ‘আনহা',
    'رَضِيَ اللَّهُ عَنْهُمْ': 'রাদিয়াল্লাহু ‘আনহুম',
    'رَضِيَ اللهُ عَنْهُمْ': 'রাদিয়াল্লাহু ‘আনহুম',
    'رَحِمَهُ اللَّهُ': 'রাহিমাহুল্লাহ',
    'رَحِمَهُ اللهُ': 'রাহিমাহুল্লাহ',
    'عَلَيْهِ السَّلَامُ': '‘আলাইহিস সালাম',
    'عَلَيْهِ السَّلاَمُ': '‘আলাইহিস সালাম',
    'عَلَيْهِ الصَّلَاةُ وَالسَّلَامُ': '‘আলাইহিস সালাতু ওয়াস সালাম',
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ': 'বিসমিল্লাহির রাহমানির রাহিম',
    'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ': 'বিসমিল্লাহির রাহমানির রাহিম',
    'أَرَأَيْتُمْ': 'আরাআইতুম',
    'سُبْحَانَ اللَّهِ': 'সুবহানাল্লাহ',
    'সُبْحَانَ اللهِ': 'সুবহানাল্লাহ',
    'الْحَمْدُ لِلَّهِ': 'আলহামদুলিল্লাহ',
    'الْحَمْدُ للهِ': 'আলহামদুলিল্লাহ',
    'لَا إِلَٰهَ إِلَّا اللَّهُ': 'লা ইলাহা ইল্লাল্লাহ',
    'لَا إِلَهَ إِلَّا اللهُ': 'লা ইলাহা ইল্লাল্লাহ',
    'اللَّهُ أَكْبَرُ': 'আল্লাহু আকবার',
    'اللهُ أَكْبَرُ': 'আল্লাহু আকবার',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ': 'লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ',
    'أَسْتَغْفِرُ اللَّهَ': 'আসতাগফিরুল্লাহ',
    'أَسْتَغْفِرُ اللهَ': 'আসতাগফিরুল্লাহ',
}

SACRED_PHRASES_EN = {
    'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ': "sallallahu 'alayhi wa sallam",
    'صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ': "sallallahu 'alayhi wa sallam",
    'رَضِيَ اللَّهُ عَنْهُ': "radiyallahu 'anhu",
    'رَضِيَ اللهُ عَنْهُ': "radiyallahu 'anhu",
    'رَضِيَ اللَّهُ عَنْهَا': "radiyallahu 'anha",
    'رَضِيَ اللهُ عَنْهَا': "radiyallahu 'anha",
    'رَضِيَ اللَّهُ عَنْهُمْ': "radiyallahu 'anhum",
    'رَضِيَ اللهُ عَنْهُمْ': "radiyallahu 'anhum",
    'رَحِمَهُ اللَّهُ': "rahimahullah",
    'رَحِمَهُ اللهُ': "rahimahullah",
    'عَلَيْهِ السَّلَامُ': "'alayhis-salam",
    'عَلَيْهِ السَّلاَمُ': "'alayhis-salam",
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ': "Bismillahir Rahmanir Rahim",
    'بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ': "Bismillahir Rahmanir Rahim",
    'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ': "Innamal a'malu bin-niyyat",
    'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ': "Innamal a'malu bin-niyyat",
    'أَرَأَيْتُمْ': "Ara'aytum",
    'سُبْحَانَ اللَّهِ': "SubhanAllah",
    'سُبْحَانَ اللهِ': "SubhanAllah",
    'الْحَمْدُ لِلَّهِ': "Alhamdulillah",
    'الْحَمْدُ للهِ': "Alhamdulillah",
    'لَا إِلَٰهَ إِلَّا اللَّهُ': "La ilaha illallah",
    'لَا إِلَهَ إِلَّا اللهُ': "La ilaha illallah",
    'اللَّهُ أَكْبَرُ': "Allahu Akbar",
    'اللهُ أَكْبَرُ': "Allahu Akbar"
}

CONSONANT_MAP_BN = {
    'ء': ('আ', '’'), 'آ': ('আ', 'আ'), 'أ': ('আ', 'আ'), 'إ': ('ই', 'ই'), 'ا': ('আ', ''),
    'ب': ('বা', 'ব'), 'ت': ('তা', 'ত'), 'ث': ('ছা', 'ছ'), 'ج': ('জা', 'জ'), 'ح': ('হা', 'হ'),
    'خ': ('খা', 'খ'), 'দ': ('দা', 'দ'), 'د': ('দা', 'দ'), 'ذ': ('যা', 'য'), 'র': ('রা', 'র'),
    'ر': ('রা', 'র'), 'ز': ('যা', 'য'), 'স': ('সা', 'স'), 'س': ('সা', 'স'), 'শ': ('শা', 'শ'),
    'ش': ('শা', 'শ'), 'ص': ('ছা', 'ছ'), 'ض': ('দ্বা', 'দ্ব'), 'ط': ('ত্বা', 'ত্ব'), 'ظ': ('যা', 'য'),
    'ع': ('‘আ', '‘'), 'غ': ('গা', 'গ'), 'ফ': ('ফা', 'ফ'), 'ف': ('ফা', 'ফ'), 'ق': ('ক্বা', 'ক্ব'),
    'ك': ('কা', 'ক'), 'ল': ('লা', 'ল'), 'ل': ('লা', 'ল'), 'ম': ('মা', 'ম'), 'م': ('মা', 'ম'),
    'ন': ('না', 'ন'), 'ن': ('না', 'ন'), 'হ': ('হা', 'হ'), 'ه': ('হা', 'হ'), 'و': ('ওয়া', 'ওয়'),
    'ي': ('ইয়া', 'ই'), 'ى': ('আ', 'া'), 'ة': ('তা', 'ত'), 'ئ': ('ই', 'ই'), 'ؤ': ('উ', 'উ'),
    '\u0671': ('আ', '')
}

CONSONANT_MAP_EN = {
    'ء': "'", 'آ': 'Aa', 'أ': 'A', 'إ': 'I', 'ا': '', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'দ': 'd', 'د': 'd', 'ذ': 'dh', 'র': 'r', 'ر': 'r', 'ز': 'z', 'س': 's',
    'শ': 'sh', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': "'", 'غ': 'gh', 'ফ': 'f', 'ف': 'f',
    'ق': 'q', 'ك': 'k', 'ল': 'l', 'ل': 'l', 'ম': 'm', 'م': 'm', 'ন': 'n', 'ن': 'n', 'হ': 'h', 'ه': 'h',
    'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 't', 'ئ': 'y', 'ؤ': 'w', '\u0671': ''
}


def transliterate_arabic_to_bangla(text: str) -> str:
    if not text:
        return ""

    processed = text
    for ar, bn in SACRED_PHRASES_BN.items():
        processed = processed.replace(ar, bn)

    def _convert_word_bn(w):
        if not w:
            return ""
        if any(0x0980 <= ord(c) <= 0x09FF for c in w):
            return w

        clean_w = re.sub(r'[\u064b-\u0652\u0670]', '', w)
        if clean_w in ('الله', 'اللَّه'):
            if w.endswith('ِ'): return 'আল্লাহি'
            if w.endswith('ُ'): return 'আল্লাহু'
            if w.endswith('َ'): return 'আল্লাহা'
            return 'আল্লাহ'
        if clean_w in ('لله', 'لِلَّه'):
            return 'লিল্লাহ' if not w.endswith('ِ') else 'লিল্লাহি'
        if clean_w == 'رسول':
            return 'রাসূল'
        if clean_w in ('الرسول', 'الرَّسُول'):
            return 'আর-রাসূল'
        if clean_w in ('النبي', 'النَّبِيّ'):
            return 'আন-নাবী'
        if clean_w in ('قال', 'قَالَ'):
            return 'ক্বালা'
        if clean_w in ('عن', 'عَنْ'):
            return '‘আন'

        res = []
        i = 0
        n = len(w)

        if (w.startswith('ال') or w.startswith('ٱل')) and n > 2:
            res.append('আল-')
            i = 2
            if i < n and w[i] == '\u0652':
                i += 1

        while i < n:
            ch = w[i]
            if ch in '،.؟!:;()[]{}""' or ch.isspace():
                punct_map = {'،': ',', '؟': '?'}
                res.append(punct_map.get(ch, ch))
                i += 1
                continue

            if ch not in CONSONANT_MAP_BN:
                i += 1
                continue

            full_c, root_c = CONSONANT_MAP_BN[ch]
            i += 1

            has_shaddah = False
            harakah = None
            while i < n and w[i] in '\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670':
                if w[i] == '\u0651':
                    has_shaddah = True
                else:
                    harakah = w[i]
                i += 1

            long_vowel = False
            if harakah == '\u064e' and i < n and w[i] in ('ا', 'ى'):
                long_vowel = True
                i += 1
            elif harakah == '\u0650' and i < n and w[i] == 'ي' and (i + 1 == n or w[i+1] not in '\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670'):
                long_vowel = True
                i += 1
            elif harakah == '\u064f' and i < n and w[i] == 'و' and (i + 1 == n or w[i+1] not in '\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670'):
                long_vowel = True
                i += 1

            if not res and ch in ('ا', 'أ', 'إ', 'آ', 'ء', '\u0671'):
                if harakah == '\u064e':
                    part = 'আ-' if long_vowel else 'আ'
                elif harakah == '\u0650':
                    part = 'ঈ' if long_vowel else 'ই'
                elif harakah == '\u064f':
                    part = 'ঊ' if long_vowel else 'উ'
                elif harakah == '\u064b':
                    part = 'আন'
                elif harakah == '\u064d':
                    part = 'ইন'
                elif harakah == '\u064c':
                    part = 'উন'
                else:
                    part = 'আ'
                harakah = None
            elif not res and not harakah and not has_shaddah:
                part = full_c
            else:
                part = root_c

            if has_shaddah:
                if ch == 'ي':
                    part = 'ইয়্য'
                elif ch == 'و':
                    part = 'ওয়্য'
                else:
                    part = part + '্' + root_c

            if harakah == '\u064e':
                part += 'া-' if long_vowel else 'া'
            elif harakah == '\u0650':
                part += 'ী' if long_vowel else 'ি'
            elif harakah == '\u064f':
                part += 'ূ' if long_vowel else 'ু'
            elif harakah == '\u064b':
                part += 'ান'
            elif harakah == '\u064d':
                part += 'িন'
            elif harakah == '\u064c':
                part += 'ুন'
            elif harakah == '\u0652':
                part += '্'
            elif harakah == '\u0670':
                part += 'া-'

            res.append(part)

        s = ''.join(res)
        s = re.sub(r'্+', '্', s)
        s = s.replace('ওয়্', 'ও')
        s = s.replace('অা', 'আ')
        s = s.replace('আা', 'আ')
        s = s.replace('াা', 'া')
        s = s.replace('্ ', ' ')
        return s

    words = processed.split()
    converted = [_convert_word_bn(w) for w in words]
    out = ' '.join(converted)
    return re.sub(r'\s+([,?.!])', r'\1', out)


def transliterate_arabic_to_english(text: str) -> str:
    """
    Takes Arabic text with diacritics and produces English Latin transliteration.
    """
    if not text:
        return ""

    processed = text
    for ar, en in SACRED_PHRASES_EN.items():
        processed = processed.replace(ar, en)

    def _convert_word_en(w):
        if not w:
            return ""
        if any(ord(c) < 128 and c.isalpha() for c in w):
            return w

        clean_w = re.sub(r'[\u064b-\u0652\u0670]', '', w)
        if clean_w in ('الله', 'اللَّه'):
            if w.endswith('ِ'): return 'Allahi'
            if w.endswith('ُ'): return 'Allahu'
            if w.endswith('َ'): return 'Allaha'
            return 'Allah'
        if clean_w in ('لله', 'لِلَّه'):
            return 'lillahi' if w.endswith('ِ') else 'lillah'
        if clean_w == 'رسول': return 'Rasul'
        if clean_w in ('الرسول', 'الرَّسُول'): return 'ar-Rasul'
        if clean_w in ('النبي', 'النَّبِيّ'): return 'an-Nabi'
        if clean_w in ('قال', 'قَالَ'): return 'qala'
        if clean_w in ('عن', 'عَنْ'): return "'an"
        if clean_w in ('بن', 'بْنُ', 'ابن', 'ابْنُ'): return 'ibn'

        res = []
        i = 0
        n = len(w)

        if (w.startswith('ال') or w.startswith('ٱل')) and n > 2:
            res.append('al-')
            i = 2
            if i < n and w[i] == '\u0652':
                i += 1

        while i < n:
            ch = w[i]
            if ch in '،.؟!:;()[]{}""':
                punct = {'،': ',', '؟': '?'}
                res.append(punct.get(ch, ch))
                i += 1
                continue

            if ch not in CONSONANT_MAP_EN:
                i += 1
                continue

            root_c = CONSONANT_MAP_EN[ch]
            i += 1

            has_shaddah = False
            harakah = None
            while i < n and w[i] in '\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670':
                if w[i] == '\u0651':
                    has_shaddah = True
                else:
                    harakah = w[i]
                i += 1

            long_vowel = False
            if harakah == '\u064e' and i < n and w[i] in ('ا', 'ى'):
                long_vowel = True
                i += 1
            elif harakah == '\u0650' and i < n and w[i] == 'ي':
                long_vowel = True
                i += 1
            elif harakah == '\u064f' and i < n and w[i] == 'و':
                long_vowel = True
                i += 1

            part = (root_c + root_c) if has_shaddah else root_c
            if harakah == '\u064e':
                part += 'aa' if long_vowel else 'a'
            elif harakah == '\u0650':
                part += 'ee' if long_vowel else 'i'
            elif harakah == '\u064f':
                part += 'oo' if long_vowel else 'u'
            elif harakah == '\u064b':
                part += 'an'
            elif harakah == '\u064d':
                part += 'in'
            elif harakah == '\u064c':
                part += 'un'
            elif harakah == '\u0670':
                part += 'a'

            res.append(part)

        return ''.join(res)

    words = processed.split()
    converted = [_convert_word_en(w) for w in words]
    out = ' '.join(converted)
    out = re.sub(r'\s+([,?.!])', r'\1', out)
    if out:
        out = out[0].upper() + out[1:]
    return out
