// ========================================================
// Bilingual Guide & Wudu Templates (বাংলা & English)
// ========================================================

const GUIDE_CONTENT_EN = `
<div class="guide-container">
    <header class="guide-header-card">
        <div class="guide-header-icon">📖</div>
        <div class="guide-header-text">
            <h2>Complete Prayer Guide & Guidelines</h2>
            <p>Authentic Sunnah Guidelines for 5 Daily Prayers, Essential Duas & Deeds</p>
        </div>
    </header>
    <!-- Card 1: Rakat Table -->
    <article class="guide-accordion-card open" id="guide-acc-rakat">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">📊</span><span class="acc-title">Rak'ah Table for 5 Daily Prayers & Jumu'ah</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="rakat-table-wrap">
                <table class="rakat-table">
                    <thead>
                        <tr><th>Waqt</th><th>Before Farz</th><th>Farz</th><th>After Farz</th><th>Witr & Nafl</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                        <tr class="waqt-clickable-row" data-waqt="fajr" title="View Fajr Details"><td><strong>🌅 Fajr</strong> <span class="row-info-hint">ℹ️</span></td><td><span class="rakat-pill sunnah">2 Sunnah</span></td><td><span class="rakat-pill fard">2 Farz</span></td><td>—</td><td>—</td><td><strong>4 Rak'ahs</strong></td></tr>
                        <tr class="waqt-clickable-row" data-waqt="dhuhr" title="View Dhuhr Details"><td><strong>☀️ Dhuhr</strong> <span class="row-info-hint">ℹ️</span></td><td><span class="rakat-pill sunnah">4 Sunnah</span></td><td><span class="rakat-pill fard">4 Farz</span></td><td><span class="rakat-pill sunnah">2 Sunnah</span></td><td><span class="rakat-pill nafl">2 Nafl</span></td><td><strong>12 Rak'ahs</strong></td></tr>
                        <tr class="waqt-clickable-row" data-waqt="jumuah" title="View Jumu'ah Details"><td><strong>🕌 Jumu'ah</strong> <span class="row-info-hint">ℹ️</span></td><td><span class="rakat-pill sunnah">4 Qablal</span></td><td><span class="rakat-pill fard">2 Farz</span></td><td><span class="rakat-pill sunnah">4 Ba'dal</span></td><td><span class="rakat-pill nafl">2 Sunnah + 2 Nafl</span></td><td><strong>14 Rak'ahs</strong></td></tr>
                        <tr class="waqt-clickable-row" data-waqt="asr" title="View Asr Details"><td><strong>🌤️ Asr</strong> <span class="row-info-hint">ℹ️</span></td><td><span class="rakat-pill sunnah-ghair">4 Sunnah</span></td><td><span class="rakat-pill fard">4 Farz</span></td><td>—</td><td>—</td><td><strong>8 Rak'ahs</strong></td></tr>
                        <tr class="waqt-clickable-row" data-waqt="maghrib" title="View Maghrib Details"><td><strong>🌆 Maghrib</strong> <span class="row-info-hint">ℹ️</span></td><td>—</td><td><span class="rakat-pill fard">3 Farz</span></td><td><span class="rakat-pill sunnah">2 Sunnah</span></td><td><span class="rakat-pill nafl">2 Nafl</span></td><td><strong>7 Rak'ahs</strong></td></tr>
                        <tr class="waqt-clickable-row" data-waqt="isha" title="View Isha Details"><td><strong>🌙 Isha</strong> <span class="row-info-hint">ℹ️</span></td><td><span class="rakat-pill sunnah-ghair">4 Sunnah</span></td><td><span class="rakat-pill fard">4 Farz</span></td><td><span class="rakat-pill sunnah">2 Sunnah</span></td><td><span class="rakat-pill nafl">2 Nafl</span> + <span class="rakat-pill wajib">3 Witr</span> + <span class="rakat-pill nafl">2 Nafl</span></td><td><strong>17 Rak'ahs</strong></td></tr>
                    </tbody>
                </table>
                <div class="rakat-legend">
                    <span class="legend-item"><span class="legend-dot fard"></span>Farz (Obligatory)</span>
                    <span class="legend-item"><span class="legend-dot sunnah"></span>Sunnah Mu'akkadah</span>
                    <span class="legend-item"><span class="legend-dot wajib"></span>Wajib (Witr)</span>
                    <span class="legend-item"><span class="legend-dot sunnah-ghair"></span>Sunnah Ghair Mu'akkadah</span>
                    <span class="legend-item"><span class="legend-dot nafl"></span>Nafl</span>
                </div>
                <p class="rakat-click-tip">💡 <em>Click on any prayer row to view virtues, niyyah and detailed rules</em></p>
            </div>
        </div>
    </article>
    <!-- Card 2: Step by Step Rules -->
    <article class="guide-accordion-card" id="guide-acc-steps">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">🚶‍♂️</span><span class="acc-title">Step-by-Step Complete Method of Prayer</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="namaz-steps-timeline">
                <div class="step-card"><span class="step-badge">1</span><div><strong>Niyyah & Takbir:</strong> Make intention in your heart, raise both hands to ears/shoulders saying "Allahu Akbar", and fold your hands. <span class="hadith-ref">(Bukhari: 736)</span></div></div>
                <div class="step-card"><span class="step-badge">2</span><div><strong>Thana & Recitation:</strong> Recite Thana, seek refuge with Allah, recite Bismillah, Surah Al-Fatihah, and another Surah or verses. <span class="hadith-ref">(Bukhari: 756)</span></div></div>
                <div class="step-card"><span class="step-badge">3</span><div><strong>Ruku & Tasbih:</strong> Bow down saying "Allahu Akbar", placing hands on knees, and say <em>"Subhana Rabbiyal Azeem"</em> at least 3 times. <span class="hadith-ref">(Abu Dawud: 869)</span></div></div>
                <div class="step-card"><span class="step-badge">4</span><div><strong>Qawmah (Standing):</strong> Rise up straight saying <em>"Sami' Allahu Liman Hamidah"</em> and recite <em>"Rabbana Lakal Hamd"</em>. <span class="hadith-ref">(Bukhari: 795)</span></div></div>
                <div class="step-card"><span class="step-badge">5</span><div><strong>Sujud & Tasbih:</strong> Prostrate saying "Allahu Akbar" on 7 bones and say <em>"Subhana Rabbiyal A'la"</em> 3 times. Sit up, then perform 2nd prostration. <span class="hadith-ref">(Muslim: 472)</span></div></div>
                <div class="step-card"><span class="step-badge">6</span><div><strong>Final Sitting (Tashahhud):</strong> In the final sitting, recite Tashahhud (Attahiyyat), Durood Ibrahim, and Dua Masura. <span class="hadith-ref">(Bukhari: 831)</span></div></div>
                <div class="step-card"><span class="step-badge">7</span><div><strong>Taslim (Salam):</strong> Conclude the prayer by turning your face to the right then left saying <em>"Assalamu Alaikum wa Rahmatullah"</em>. <span class="hadith-ref">(Abu Dawud: 996)</span></div></div>
            </div>
        </div>
    </article>
    <!-- Card 3: Essential Duas -->
    <article class="guide-accordion-card" id="guide-acc-duas">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">🤲</span><span class="acc-title">Essential Duas & Tasbih in Prayer</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="guide-dua-item">
                <h5>1. Thana (Opening Supplication) <span class="hadith-ref">(Tirmidhi: 243)</span></h5>
                <p class="arabic-text sm">سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلا إِلَهَ غَيْرُكَ</p>
                <p class="pron"><strong>Pronunciation:</strong> Subhanaka Allahumma wa bihamdika, wa tabarakasmuka, wa ta'ala jadduka, wa la ilaha ghairuk.</p>
                <p class="meaning"><strong>Translation:</strong> Glory be to You, O Allah, and all praise. Blessed is Your name, exalted is Your majesty, and there is no god but You.</p>
            </div>
            <div class="guide-dua-item">
                <h5>2. Tashahhud (Attahiyyat) <span class="hadith-ref">(Bukhari: 831)</span></h5>
                <p class="arabic-text sm">التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ السَّلامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ السَّلامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ أَشْهَدُ أَنْ لا إِلَهَ إِلا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ</p>
                <p class="pron"><strong>Pronunciation:</strong> Attahiyyatu lillahi was-salawatu wat-tayyibat. Assalamu 'alayka ayyuhan-Nabiyyu wa rahmatullahi wa barakatuh. Assalamu 'alayna wa 'ala 'ibadillahis-salihin. Ash-hadu alla ilaha illallah, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh.</p>
                <p class="meaning"><strong>Translation:</strong> All compliments, prayers and pure words are due to Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.</p>
            </div>
            <div class="guide-dua-item">
                <h5>3. Durood Ibrahim <span class="hadith-ref">(Bukhari: 3370)</span></h5>
                <p class="arabic-text sm">اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ</p>
                <p class="pron"><strong>Pronunciation:</strong> Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidum Majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidum Majid.</p>
                <p class="meaning"><strong>Translation:</strong> O Allah, send peace upon Muhammad and upon the family of Muhammad, as You sent peace upon Ibrahim and upon the family of Ibrahim. Indeed, You are Praiseworthy and Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.</p>
            </div>
            <div class="guide-dua-item">
                <h5>4. Dua Masura <span class="hadith-ref">(Bukhari: 834)</span></h5>
                <p class="arabic-text sm">اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا وَلا يَغْفِرُ الذُّنُوبَ إِلا أنتَ فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ وَارْحَمْنِي إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ</p>
                <p class="pron"><strong>Pronunciation:</strong> Allahumma inni zalamtu nafsi zulman kathira, wa la yaghfirudh-dhunuba illa Anta, faghfirli maghfiratan min 'indika warhamni, innaka Antal-Ghafurur-Rahim.</p>
                <p class="meaning"><strong>Translation:</strong> O Allah, I have wronged myself greatly, and none forgives sins except You, so grant me forgiveness from You and have mercy on me. Indeed, You are the Forgiving, the Merciful.</p>
            </div>
            <div class="guide-dua-item">
                <h5>5. Dua Qunoot (In Witr Prayer) <span class="hadith-ref">(Ibn Abi Shaybah: 6965)</span></h5>
                <p class="arabic-text sm">اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ وَنُثْنِي عَلَيْكَ الْخَيْرَ وَنَشْكُرُكَ وَلا نَكْفُرُكَ وَنَخْلَعُ وَنَتْرُكُ مَنْ يَفْجُرُكَ، اللَّهُمَّ إِيَّاكَ نَعْبُدُ وَلَكَ نُصَلِّي وَنَسْجُدُ وَإِلَيْكَ نَسْعَى وَنَحْفِدُ نَرْجُو رَحْمَتَكَ وَنَخْشَى عَذَابَكَ إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ</p>
                <p class="pron"><strong>Pronunciation:</strong> Allahumma inna nasta'inuka wa nastaghfiruka wa nu'minu bika wa natawakkalu 'alayka wa nuthni 'alaykal-khayr, wa nashkuruka wa la nakfuruka wa nakhla'u wa natruku may-yafjuruk. Allahumma iyyaka na'budu wa laka nusalli wa nasjudu wa ilayka nas'a wa nahfid, narju rahmataka wa nakhsha 'adhabak, inna 'adhabaka bil-kuffari mulhiq.</p>
                <p class="meaning"><strong>Translation:</strong> O Allah, we seek Your help and ask for Your forgiveness, and we believe in You and place our trust in You, and we praise You with all good. We thank You and do not disbelieve in You, and we reject and leave anyone who disobeys You. O Allah, You alone we worship, to You we pray and prostrate, and towards You we strive and hasten. We hope for Your mercy and fear Your punishment; indeed Your punishment encompasses the disbelievers.</p>
            </div>
        </div>
    </article>
    <!-- Card 4: Gender Differences -->
    <article class="guide-accordion-card" id="guide-acc-gender">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">👥</span><span class="acc-title">Guidelines on Postures for Men & Women</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="gender-diff-grid">
                <div class="gender-diff-box male">
                    <h4>👨 Men's Posture</h4>
                    <ul>
                        <li><strong>Takbir:</strong> Raise hands up to earlobes. <span class="hadith-ref">(Bukhari: 736)</span></li>
                        <li><strong>Folding Hands:</strong> Place hands below navel or upon the chest. <span class="hadith-ref">(Abu Dawud: 756)</span></li>
                        <li><strong>Ruku & Sujud:</strong> Keep elbows and arms away from sides and ground. <span class="hadith-ref">(Bukhari: 828)</span></li>
                        <li><strong>Sitting:</strong> Sit on left foot and keep right foot upright. <span class="hadith-ref">(Bukhari: 828)</span></li>
                    </ul>
                </div>
                <div class="gender-diff-box female">
                    <h4>🧕 Women's Posture</h4>
                    <ul>
                        <li><strong>Takbir:</strong> Raise hands up to shoulders. <span class="hadith-ref">(Musannaf Abdur Razzaq: 5066)</span></li>
                        <li><strong>Folding Hands:</strong> Place hands upon the chest. <span class="hadith-ref">(Ibn Abi Shaybah: 3959)</span></li>
                        <li><strong>Ruku & Sujud:</strong> Keep limbs close and compact towards the ground for modesty. <span class="hadith-ref">(Abu Dawud - Marasil: 87)</span></li>
                        <li><strong>Sitting:</strong> Sit with both feet resting to the right side (Tawarruk). <span class="hadith-ref">(Ibn Abi Shaybah: 2778)</span></li>
                    </ul>
                </div>
            </div>
            <p class="gender-note">📌 <em>Note: The foundational pillars of prayer are identical. These modesty-based distinctions in postures are recommended by classical jurists and scholars based on the Sunnah.</em></p>
        </div>
    </article>
</div>
`;

const WUDU_CONTENT_EN = `
<div class="guide-container">
    <header class="guide-header-card">
        <span class="guide-header-icon">💧</span>
        <div class="guide-header-text">
            <h2>Wudu & Purity Guide</h2>
            <p>Obligatory acts, complete Sunnah method, Duas & cautions according to Qur'an and Sunnah</p>
        </div>
    </header>
    <!-- Card 1: 4 Fard of Wudu -->
    <article class="guide-accordion-card open" id="wudu-acc-fard">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">✨</span><span class="acc-title">4 Obligatory Acts (Fard) of Wudu (Quranic Command)</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="namaz-steps-timeline">
                <div class="step-card"><span class="step-badge">1</span><div><strong>Washing the Face:</strong> Washing entire face once from hairline to below chin and from ear to ear is obligatory. <span class="hadith-ref">(Surah Al-Ma'idah: 6)</span></div></div>
                <div class="step-card"><span class="step-badge">2</span><div><strong>Washing Both Arms:</strong> Washing both arms including elbows once is obligatory. <span class="hadith-ref">(Surah Al-Ma'idah: 6)</span></div></div>
                <div class="step-card"><span class="step-badge">3</span><div><strong>Wiping the Head:</strong> Wiping at least one-fourth of the head with wet hands. <span class="hadith-ref">(Sahih Muslim: 274)</span></div></div>
                <div class="step-card"><span class="step-badge">4</span><div><strong>Washing Both Feet:</strong> Washing both feet including ankles once is obligatory. <span class="hadith-ref">(Surah Al-Ma'idah: 6)</span></div></div>
            </div>
            <p class="gender-note" style="margin-top: 12px;">📌 <em>Caution: If even a tiny spot on these 4 limbs remains dry, the Wudu is invalid and prayer is unacceptable.</em></p>
        </div>
    </article>
    <!-- Card 2: Step-by-Step Sunnah Method -->
    <article class="guide-accordion-card open" id="wudu-acc-steps">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">🚶‍♂️</span><span class="acc-title">Step-by-Step Complete Sunnah Method of Wudu</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="namaz-steps-timeline">
                <div class="step-card"><span class="step-badge">1</span><div><strong>Niyyah & Bismillah:</strong> Make intention for purification and begin with <em>"Bismillah"</em>. <span class="hadith-ref">(Abu Dawud: 101)</span></div></div>
                <div class="step-card"><span class="step-badge">2</span><div><strong>Hands up to Wrists:</strong> Wash both hands up to wrists 3 times and interlace fingers. <span class="hadith-ref">(Bukhari: 159)</span></div></div>
                <div class="step-card"><span class="step-badge">3</span><div><strong>Miswak & Rinsing:</strong> Clean teeth with Miswak and rinse mouth 3 times with right hand. <span class="hadith-ref">(Bukhari: 1934)</span></div></div>
                <div class="step-card"><span class="step-badge">4</span><div><strong>Sniffing Water into Nose:</strong> Sniff water into nostrils with right hand and blow out with left hand 3 times. <span class="hadith-ref">(Muslim: 237)</span></div></div>
                <div class="step-card"><span class="step-badge">5</span><div><strong>Washing the Face:</strong> Wash entire face 3 times from forehead to chin and ear to ear. <span class="hadith-ref">(Bukhari: 186)</span></div></div>
                <div class="step-card"><span class="step-badge">6</span><div><strong>Arms including Elbows:</strong> Wash right arm including elbow 3 times, then left arm 3 times. <span class="hadith-ref">(Bukhari: 185)</span></div></div>
                <div class="step-card"><span class="step-badge">7</span><div><strong>Wiping Head & Ears:</strong> Wipe entire head and ears once with wet hands. <span class="hadith-ref">(Abu Dawud: 118)</span></div></div>
                <div class="step-card"><span class="step-badge">8</span><div><strong>Washing Both Feet:</strong> Wash right foot then left foot including ankles 3 times, passing fingers between toes. <span class="hadith-ref">(Bukhari: 163)</span></div></div>
            </div>
        </div>
    </article>
    <!-- Card 3: Duas of Wudu -->
    <article class="guide-accordion-card" id="wudu-acc-duas">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">🤲</span><span class="acc-title">Masnoon Duas of Wudu & Virtues</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="guide-dua-item">
                <h5>1. Dua Before Starting Wudu <span class="hadith-ref">(Abu Dawud: 101)</span></h5>
                <p class="arabic-text sm">بِسْمِ اللَّهِ</p>
                <p class="pron"><strong>Pronunciation:</strong> Bismillah.</p>
                <p class="meaning"><strong>Translation:</strong> In the name of Allah.</p>
            </div>
            <div class="guide-dua-item">
                <h5>2. Dua After Completing Wudu (Kalima Shahadat) <span class="hadith-ref">(Sahih Muslim: 234)</span></h5>
                <p class="arabic-text sm">أَشْهَدُ أَنْ لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ</p>
                <p class="pron"><strong>Pronunciation:</strong> Ash-hadu alla ilaha illallahu wahdahu la sharika lahu, wa ash-hadu anna Muhammadan 'abduhu wa rasuluh.</p>
                <p class="meaning"><strong>Translation:</strong> I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and messenger.</p>
                <p class="waqt-hadith-box" style="margin-top: 8px;">✨ <em>Virtue: Whoever recites this after Wudu, all eight gates of Paradise will be opened for them to enter from whichever they wish. (Sahih Muslim: 234)</em></p>
            </div>
            <div class="guide-dua-item">
                <h5>3. Dua for Repentance <span class="hadith-ref">(Tirmidhi: 55)</span></h5>
                <p class="arabic-text sm">اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ</p>
                <p class="pron"><strong>Pronunciation:</strong> Allahummaj-'alni minat-tawwabina waj-'alni minal-mutatahhirin.</p>
                <p class="meaning"><strong>Translation:</strong> O Allah, make me among those who repent constantly and make me among those who purify themselves.</p>
            </div>
        </div>
    </article>
    <!-- Card 4: Wudu Nullifiers -->
    <article class="guide-accordion-card" id="wudu-acc-breakers">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">⚠️</span><span class="acc-title">Things that Invalidate Wudu (Nullifiers)</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="namaz-steps-timeline">
                <div class="step-card"><span class="step-badge">1</span><div><strong>Excretion of any substance:</strong> Discharge of urine, stool, gas, or any impurity from private passages. <span class="hadith-ref">(Bukhari: 135)</span></div></div>
                <div class="step-card"><span class="step-badge">2</span><div><strong>Flowing of blood or pus:</strong> Flow of blood, pus, or yellowish fluid from any part of the body. <span class="hadith-ref">(Daraqutni: 553)</span></div></div>
                <div class="step-card"><span class="step-badge">3</span><div><strong>Mouthful vomiting:</strong> Vomiting food, water or blood that fills the mouth. <span class="hadith-ref">(Tirmidhi: 87)</span></div></div>
                <div class="step-card"><span class="step-badge">4</span><div><strong>Sleeping while leaning or lying down:</strong> Sleeping in a posture such that if the support were removed one would fall. <span class="hadith-ref">(Abu Dawud: 203)</span></div></div>
                <div class="step-card"><span class="step-badge">5</span><div><strong>Loss of consciousness:</strong> Fainting, intoxication, madness, or deep sleep that impairs senses. <span class="hadith-ref">(Abu Dawud: 203)</span></div></div>
                <div class="step-card"><span class="step-badge">6</span><div><strong>Audible laughter during prayer:</strong> Laughing loudly in a prayer having Ruku and Sujud invalidates both Wudu and Salah. <span class="hadith-ref">(Daraqutni: 612)</span></div></div>
            </div>
        </div>
    </article>
    <!-- Card 5: Tayammum Rules -->
    <article class="guide-accordion-card" id="wudu-acc-tayammum">
        <button type="button" class="guide-accordion-header">
            <span class="acc-title-group"><span class="acc-icon">🏜️</span><span class="acc-title">Authentic Method of Tayammum (Dry Ablution)</span></span>
            <span class="acc-arrow">▼</span>
        </button>
        <div class="guide-accordion-body">
            <div class="namaz-steps-timeline">
                <div class="step-card"><span class="step-badge">1</span><div><strong>Intention:</strong> Intend purification and say <em>"Bismillah"</em>. <span class="hadith-ref">(Surah An-Nisa: 43)</span></div></div>
                <div class="step-card"><span class="step-badge">2</span><div><strong>Wiping the Face:</strong> Strike clean earth gently with both palms, blow dust off, and wipe entire face once. <span class="hadith-ref">(Bukhari: 338)</span></div></div>
                <div class="step-card"><span class="step-badge">3</span><div><strong>Wiping Both Arms:</strong> Strike clean earth again and wipe both arms including elbows. <span class="hadith-ref">(Daraqutni: 712)</span></div></div>
            </div>
            <p class="gender-note" style="margin-top: 12px;">📌 <em>Note: Tayammum is permitted when water is unavailable or if using water would cause harm due to illness.</em></p>
        </div>
    </article>
</div>
`;

let GUIDE_CONTENT_BN = null;
let WUDU_CONTENT_BN = null;

function renderGuideAndWuduContent(lang) {
    const isEn = lang === "en";
    const guidePanel = document.getElementById("panel-guide");
    const wuduPanel = document.getElementById("panel-wudu");

    if (guidePanel) {
        if (!GUIDE_CONTENT_BN) {
            GUIDE_CONTENT_BN = guidePanel.innerHTML;
        }
        guidePanel.innerHTML = isEn ? GUIDE_CONTENT_EN : GUIDE_CONTENT_BN;
    }

    if (wuduPanel) {
        if (!WUDU_CONTENT_BN) {
            WUDU_CONTENT_BN = wuduPanel.innerHTML;
        }
        wuduPanel.innerHTML = isEn ? WUDU_CONTENT_EN : WUDU_CONTENT_BN;
    }

    if (typeof initGuideFeatures === "function") {
        initGuideFeatures();
    }
}
