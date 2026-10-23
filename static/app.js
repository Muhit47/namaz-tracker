
// State
function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let currentDate = getLocalDateString();
let amalnamahMonth = currentDate.slice(0, 7); // e.g., '2026-10'
let prayerTimings = {
    Fajr: "05:04",
    Dhuhr: "12:05",
    Asr: "16:08",
    Maghrib: "17:52",
    Isha: "19:08"
};
let activeNotePrayer = null;
const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

// Helpers
const toBN = (n) => String(n).split("").map(d => bnDigits[d] ?? d).join("");

function format12Hour(timeStr) {
    if (!timeStr || timeStr === "--:--") return "--:--";
    if (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM")) {
        return timeStr;
    }
    const clean = timeStr.trim().split(" ")[0];
    const parts = clean.split(":");
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = String(h).padStart(2, "0");
    return `${hStr}:${m} ${ampm}`;
}

function getWaqtTimeRange(prayerName, timings) {
    if (!timings) return "--:--";
    const ranges = {
        "Fajr": { start: timings.Fajr, end: timings.Sunrise },
        "Dhuhr": { start: timings.Dhuhr, end: timings.Asr },
        "Asr": { start: timings.Asr, end: timings.Sunset || timings.Maghrib },
        "Maghrib": { start: timings.Maghrib, end: timings.Isha },
        "Isha": { start: timings.Isha, end: timings.Imsak || timings.Fajr }
    };
    const r = ranges[prayerName];
    if (!r || !r.start) return "--:--";
    const sStr = format12Hour(r.start);
    const eStr = r.end ? format12Hour(r.end) : "";
    return eStr ? `${sStr} - ${eStr}` : sStr;
}

// DOM Elements
const dateDisplay = document.getElementById("current-date-display");
const dateTextDisplay = document.getElementById("date-text-display");
const dateTrigger = document.getElementById("date-trigger");
const prayerGrid = document.getElementById("prayer-grid");
const progressRing = document.getElementById("progress-ring");
const progressPercent = document.getElementById("progress-percent");
const progressText = document.getElementById("progress-text");
const nextPrayerBanner = document.getElementById("next-prayer-banner");

function syncDateDisplays() {
    const d = new Date(currentDate + "T00:00:00");
    const fullFormatted = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    const shortFormatted = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' });
    if (dateTextDisplay) dateTextDisplay.textContent = fullFormatted;
    if (dateDisplay) dateDisplay.textContent = `আজকের ওয়াক্তসমূহ • ${shortFormatted}`;
}


// Init
async function init() {
    const savedCityBn = localStorage.getItem("user_city_bn");
    const savedCity = localStorage.getItem("user_city");
    if (savedCityBn || savedCity) {
        const cityEl = document.getElementById("city-indicator");
        if (cityEl) cityEl.textContent = `📍 ${savedCityBn || savedCity}`;
    }
    syncDateDisplays();
    
    // Render prayers and start countdown immediately
    renderPrayers();
    loadAmalnamah();
    loadCalendar();
    startCountdown();
    loadDailyHadithWidget();
    
    // Wire up Roza toggle button
    const rozaToggleBtn = document.getElementById('roza-toggle-btn');
    if (rozaToggleBtn) {
        rozaToggleBtn.onclick = () => {
            rozaToggleBtn.classList.toggle('active');
            const isActive = rozaToggleBtn.classList.contains('active');
            localStorage.setItem('roza_' + currentDate, isActive);
        };
    }
    
    // Wire up Dua modal
    const openDuaBtn = document.getElementById('open-dua-btn');
    const duaModal = document.getElementById('dua-modal');
    const closeDuaBtn = document.getElementById('close-dua-modal');
    const okDuaBtn = document.getElementById('ok-dua-modal');
    const duaModalBackdrop = document.getElementById('dua-modal-backdrop');
    
    if (openDuaBtn && duaModal) {
        openDuaBtn.onclick = () => {
            duaModal.showModal();
        };
    }
    if (closeDuaBtn && duaModal) {
        closeDuaBtn.onclick = () => {
            duaModal.close();
        };
    }
    if (okDuaBtn && duaModal) {
        okDuaBtn.onclick = () => {
            duaModal.close();
        };
    }
    if (duaModalBackdrop && duaModal) {
        duaModalBackdrop.onclick = () => {
            duaModal.close();
        };
    }
    
    // Wire up Notes modal
    const notesModal = document.getElementById('notes-modal');
    const closeNotesBtn = document.getElementById('close-notes');
    const cancelNotesBtn = document.getElementById('cancel-notes');
    const saveNotesBtn = document.getElementById('save-notes');
    const notesBackdrop = notesModal ? notesModal.querySelector('.modal-backdrop') : null;

    const closeNotes = () => { if (notesModal) notesModal.close(); };
    if (closeNotesBtn) closeNotesBtn.onclick = closeNotes;
    if (cancelNotesBtn) cancelNotesBtn.onclick = closeNotes;
    if (notesBackdrop) notesBackdrop.onclick = closeNotes;

    if (saveNotesBtn) {
        saveNotesBtn.onclick = async () => {
            if (!activeNotePrayer) return;
            const input = document.getElementById('notes-input');
            const noteText = input ? input.value : '';
            await api('/prayers', {
                method: 'POST',
                body: JSON.stringify({ date: currentDate, prayer_name: activeNotePrayer, notes: noteText })
            });
            closeNotes();
            renderPrayers();
        };
    }
    
    // Fetch live timings in background
    fetchPrayerTimes().then(() => {
        renderPrayers();
    });

    // Backup & Restore listeners
    const exportBtn = document.getElementById('export-backup-btn');
    const importBtn = document.getElementById('import-backup-btn');
    const importInput = document.getElementById('backup-file-input');

    if (exportBtn) {
        exportBtn.onclick = async () => {
            const res = await fetch('/api/backup/export');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `namaz_tracker_backup_${currentDate}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert("ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!");
        };
    }

    if (importBtn) {
        importBtn.onclick = () => importInput.click();
    }

    if (importInput) {
        importInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (confirm("আপনি কি নিশ্চিত এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান? এটি বর্তমান ডেটা আপডেট করবে।")) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        const res = await fetch('/api/backup/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert("ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!");
                            renderPrayers();
                            loadAmalnamah();
                            loadCalendar();
                        } else {
                            alert("ব্যাকআপ রিস্টোর করতে ব্যর্থ: " + (result.error || 'Unknown error'));
                        }
                    } catch (err) {
                        alert("ফাইলটি সঠিক ফরম্যাটে নেই।");
                    }
                };
                reader.readAsText(file);
            }
            importInput.value = '';
        };
    }
}

// APIs
async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    return res.json();
}

const bdCities = new Set([
    "dhaka", "chittagong", "rajshahi", "barisal", "barishal", "khulna", "sylhet", "rangpur", "mymensingh",
    "gazipur", "narayanganj", "tangail", "kishoreganj", "manikganj", "munshiganj", "narsingdi",
    "faridpur", "gopalganj", "madaripur", "rajbari", "shariatpur",
    "cox's bazar", "comilla", "feni", "brahmanbaria", "rangamati", "noakhali", "chandpur",
    "lakshmipur", "khagrachhari", "bandarban",
    "bogura", "pabna", "sirajganj", "naogaon", "natore", "chapainawabganj", "joypurhat",
    "patuakhali", "bhola", "pirojpur", "barguna", "jhalokati",
    "jashore", "kushtia", "satkhira", "bagerhat", "jhenaidah", "chuadanga", "magura", "meherpur", "narail",
    "moulvibazar", "habiganj", "sunamganj",
    "dinajpur", "gaibandha", "kurigram", "lalmonirhat", "nilphamari", "panchagarh", "thakurgaon",
    "jamalpur", "netrokona", "sherpur"
]);

const cityCoordinates = {
    "dhaka": { lat: 23.8103, lng: 90.4125 },
    "chittagong": { lat: 22.3569, lng: 91.7832 },
    "rajshahi": { lat: 24.3636, lng: 88.6241 },
    "khulna": { lat: 22.8456, lng: 89.5403 },
    "barishal": { lat: 22.7010, lng: 90.3535 },
    "sylhet": { lat: 24.8949, lng: 91.8687 },
    "rangpur": { lat: 25.7439, lng: 89.2752 },
    "mymensingh": { lat: 24.7471, lng: 90.4203 },
    "mecca": { lat: 21.3891, lng: 39.8579 },
    "madinah": { lat: 24.5247, lng: 39.5692 },
    "london": { lat: 51.5074, lng: -0.1278 },
    "new york": { lat: 40.7128, lng: -74.0060 }
};

function calculateOfflinePrayerTimes(dateStr, lat, lng, timezone = 6) {
    const date = new Date(dateStr);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    const rad = Math.PI / 180;
    
    // Simplistic Solar Declination: decl = 23.45 * sin(360/365 * (dayOfYear + 284))
    const declination = 23.45 * Math.sin(360 / 365 * (dayOfYear + 284) * rad);
    const equationOfTime = -7.655 * Math.sin(0.9856 * dayOfYear * rad) - 9.873 * Math.sin(1.9713 * dayOfYear * rad);
    
    const timeMidday = 12 - (lng / 15) - (equationOfTime / 60);
    const cosHourAngle = (Math.sin(-0.8333 * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) / (Math.cos(lat * rad) * Math.cos(declination * rad));
    const hourAngleSunset = Math.acos(cosHourAngle) / rad / 15;
    
    const sunset = timeMidday + hourAngleSunset;
    const sunrise = timeMidday - hourAngleSunset;
    
    // Fajr (18 degrees below horizon)
    const cosFajr = (Math.sin(-18 * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) / (Math.cos(lat * rad) * Math.cos(declination * rad));
    const fajr = timeMidday - (Math.acos(cosFajr) / rad / 15);
    
    // Isha (18 degrees below horizon)
    const isha = timeMidday + (Math.acos(cosFajr) / rad / 15);
    
    // Asr (Hanafi, shadow length = 2)
    const cosAsr = (Math.sin(Math.atan(1 / (2 + Math.tan((lat - declination) * rad)))) - Math.sin(lat * rad) * Math.sin(declination * rad)) / (Math.cos(lat * rad) * Math.cos(declination * rad));
    const asr = timeMidday + (Math.acos(cosAsr) / rad / 15);
    
    const toHHMM = (h) => {
        const totalMinutes = Math.round(h * 60);
        const hh = Math.floor(totalMinutes / 60) % 24;
        const mm = totalMinutes % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    return {
        Fajr: toHHMM(fajr),
        Sunrise: toHHMM(sunrise),
        Dhuhr: toHHMM(timeMidday),
        Asr: toHHMM(asr),
        Sunset: toHHMM(sunset),
        Maghrib: toHHMM(sunset + 0.05), // + 3 mins margin
        Isha: toHHMM(isha),
        Imsak: toHHMM(fajr - 0.25)
    };
}

function getFallbackHijriDate(dateStr) {
    try {
        const d = new Date(dateStr + "T12:00:00");
        const formatter = new Intl.DateTimeFormat('bn-BD-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        return formatter.format(d).replace(/যুগ/g, 'হিজরি');
    } catch (e) {
        return "";
    }
}

async function fetchPrayerTimes() {
    const userCity = localStorage.getItem("user_city") || "Dhaka";
    const cacheKey = `times_${userCity}_${currentDate}`;
    const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                prayerTimings = JSON.parse(cached);
                if (!localStorage.getItem(`hijri_${currentDate}`)) {
                    const fb = getFallbackHijriDate(currentDate);
                    if (fb) localStorage.setItem(`hijri_${currentDate}`, fb);
                }
                // Update display element immediately when loaded from cache
                const hijriDate = localStorage.getItem(`hijri_${currentDate}`);
                const hijriDisplay = document.getElementById('hijri-date-display');
                if (hijriDisplay && hijriDate) {
                    hijriDisplay.textContent = hijriDate;
                }
                return;
            } catch(e) {}
        }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let url;
        if (bdCities.has(userCity.toLowerCase())) {
            url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(userCity)}&country=Bangladesh&method=1`;
        } else {
            url = `https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(userCity)}`;
        }
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data && data.data && data.data.timings) {
            prayerTimings = data.data.timings;
            localStorage.setItem(cacheKey, JSON.stringify(prayerTimings));
            
            // Cache full Bengali Hijri date
            if (data.data.date && data.data.date.hijri) {
                const h = data.data.date.hijri;
                const hijriMonthsBn = [
                    "মুহররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি",
                    "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান",
                    "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"
                ];
                const monthNum = parseInt(h.month.number, 10);
                const mName = hijriMonthsBn[monthNum - 1] || h.month.en;
                const fullHijri = `${toBN(h.day)} ${mName}, ${toBN(h.year)} হিজরি`;
                localStorage.setItem(`hijri_${currentDate}`, fullHijri);
                const hijriDisplay = document.getElementById('hijri-date-display');
                if (hijriDisplay) hijriDisplay.textContent = fullHijri;
            }
        }
    } catch (e) {
        console.warn("API fetch failed, calculating offline timings:", e);
        const cityKey = userCity.toLowerCase();
        const coords = cityCoordinates[cityKey] || cityCoordinates["dhaka"];
        const offlineTimings = calculateOfflinePrayerTimes(currentDate, coords.lat, coords.lng);
        prayerTimings = offlineTimings;
        localStorage.setItem(cacheKey, JSON.stringify(prayerTimings));
    }
}

// Renderers
async function renderPrayers() {
    const prayers = await api(`/prayers/${currentDate}`);
    prayerGrid.innerHTML = "";
    
    const isFriday = new Date(currentDate + "T00:00:00").getDay() === 5;
    const names = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const arNames = ["الفجر", isFriday ? "الجمعة" : "الظهر", "العصر", "المغرب", "العشاء"];
    const bnNames = ["ফজর", isFriday ? "জুমু'আ" : "যোহর", "আসর", "মাগরিব", "এশা"];

    prayers.forEach((p, i) => {
        const card = document.createElement("div");
        card.className = `prayer-card ${p.is_active ? "current-waqt" : ""}`;
        card.innerHTML = `
            <div class="prayer-card-header">
                <div class="prayer-title-group">
                    <span class="arabic-name">${arNames[i]}</span>
                    <span class="bangla-name">${bnNames[i]}</span>
                </div>
                <div class="waqt-time-badge">${getWaqtTimeRange(names[i], prayerTimings)}</div>
            </div>
            <div class="status-pills">
                <button class="status-pill-btn ${p.status==='jamaah'?'active':''}" data-status="jamaah" data-prayer="${p.prayer_name}">জামাতে</button>
                <button class="status-pill-btn ${p.status==='on_time'?'active':''}" data-status="on_time" data-prayer="${p.prayer_name}">ওয়াক্তমতো</button>
                <button class="status-pill-btn ${p.status==='qaza'?'active':''}" data-status="qaza" data-prayer="${p.prayer_name}">কাযা</button>
                <button class="status-pill-btn ${p.status==='missed'?'active':''}" data-status="missed" data-prayer="${p.prayer_name}">মিসড</button>
            </div>
            <div class="prayer-card-footer">
                <div style="display:flex; align-items:center; gap:8px;">
                    <label class="sunnah-switch"><input type="checkbox" class="sunnah-checkbox" data-prayer="${p.prayer_name}" ${p.is_sunnah ? 'checked' : ''}> সুন্নাহ</label>
                    ${isFriday && p.prayer_name === "Dhuhr" ? `<button type="button" class="jumuah-deeds-btn" id="open-jumuah-deeds-btn">📖 আমল</button>` : ''}
                </div>
                <button class="icon-btn sm note-btn ${p.notes && p.notes.trim() ? 'has-note' : ''}" data-prayer="${p.prayer_name}" data-bn="${bnNames[i]}" title="নোট লিখুন">📝</button>
            </div>
        `;
        prayerGrid.appendChild(card);
    });

    // Event Handlers (status)
    document.querySelectorAll(".status-pill-btn").forEach(btn => btn.onclick = async (e) => {
        const { status, prayer } = e.target.dataset;
        await api("/prayers", { method: "POST", body: JSON.stringify({ date: currentDate, prayer_name: prayer, status }) });
        renderPrayers();
        loadAmalnamah();
    });

    // Sunnah switch handler
    document.querySelectorAll(".sunnah-checkbox").forEach(cb => cb.onchange = async (e) => {
        const prayer = e.target.dataset.prayer;
        const is_sunnah = e.target.checked ? 1 : 0;
        await api("/prayers", { method: "POST", body: JSON.stringify({ date: currentDate, prayer_name: prayer, is_sunnah }) });
        loadAmalnamah();
    });

    // Notes button handler
    document.querySelectorAll(".note-btn").forEach(btn => btn.onclick = (e) => {
        const prayer = e.currentTarget.dataset.prayer;
        const bn = e.currentTarget.dataset.bn;
        activeNotePrayer = prayer;
        const modal = document.getElementById("notes-modal");
        const nameEl = document.getElementById("modal-prayer-name");
        const inputEl = document.getElementById("notes-input");
        const currentPrayer = prayers.find(x => x.prayer_name === prayer);
        
        if (nameEl) nameEl.textContent = ` — ${bn}`;
        if (inputEl) inputEl.value = (currentPrayer && currentPrayer.notes) ? currentPrayer.notes : "";
        if (modal) modal.showModal();
    });

    // Jumuah Deeds button handler
    const jumuahBtn = document.getElementById("open-jumuah-deeds-btn");
    if (jumuahBtn) {
        jumuahBtn.onclick = () => {
            loadJumuahChecklist();
            const modal = document.getElementById("jumuah-modal");
            if (modal) modal.showModal();
        };
    }

    updateProgress(prayers);
    updateRamadanCard();
}

function updateProgress(prayers) {
    const completed = prayers.filter(p => ["jamaah", "on_time", "late"].includes(p.status)).length;
    if (progressRing) progressRing.style.strokeDashoffset = 339.29 - (completed / 5) * 339.29;
    if (progressPercent) progressPercent.textContent = toBN(completed * 20) + "%";
    if (progressText) progressText.textContent = `${toBN(completed)}/৫ ওয়াক্ত`;
    
    const encEl = document.getElementById("progress-encouragement");
    if (encEl) {
        if (completed === 5) {
            encEl.textContent = "মাশাআল্লাহ! আজকের সব ওয়াক্ত নামাজ আদায় সম্পন্ন হয়েছে 🎉";
            encEl.style.color = "#059669";
        } else if (completed >= 3) {
            encEl.textContent = "আলহামদুলিল্লাহ! বাকি ওয়াক্তগুলোও সময়মতো আদায় করুন ✨";
            encEl.style.color = "#047857";
        } else if (completed > 0) {
            encEl.textContent = "খুব ভালো শুরু! পরবর্তী ওয়াক্তের প্রস্তুতি নিন 🤲";
            encEl.style.color = "#334155";
        } else {
            encEl.textContent = "দৈনিক ৫ ওয়াক্ত নামায সময়মতো আদায় করুন 🤲";
            encEl.style.color = "#64748B";
        }
    }
}

// Ramadan Card Functions
function updateRamadanCard() {
    // Update Sehri and Iftar times (always visible for daily Tahajjud/Nafal fasting)
    const sehriTime = prayerTimings.Imsak || prayerTimings.Fajr;
    const iftarTime = prayerTimings.Maghrib;
    
    const sehriVal = document.getElementById('sehri-time-val');
    const iftarVal = document.getElementById('iftar-time-val');
    
    if (sehriVal) sehriVal.textContent = format12Hour(sehriTime) || '--:--';
    if (iftarVal) iftarVal.textContent = format12Hour(iftarTime) || '--:--';
    
    // Update Roza button state
    const rozaToggleBtn = document.getElementById('roza-toggle-btn');
    const rozaCheckbox = document.getElementById('roza-checkbox');
    const rozaBtnText = document.getElementById('roza-btn-text');
    
    const isRozaActive = localStorage.getItem('roza_' + currentDate) === 'true';
    if (rozaToggleBtn) {
        if (isRozaActive) {
            rozaToggleBtn.classList.add('active');
        } else {
            rozaToggleBtn.classList.remove('active');
        }
    }
    
    // Update Hijri date from cache or browser native fallback
    let cachedHijri = localStorage.getItem(`hijri_${currentDate}`);
    if (!cachedHijri) {
        cachedHijri = getFallbackHijriDate(currentDate);
        localStorage.setItem(`hijri_${currentDate}`, cachedHijri);
    }
    const hijriDisplay = document.getElementById('hijri-date-display');
    if (hijriDisplay) {
        hijriDisplay.textContent = cachedHijri;
    }
    
    // Detect if current month is Ramadan
    const isRamadan = cachedHijri && cachedHijri.includes("রমজান");
    
    const ramadanTitle = document.getElementById('ramadan-title');
    const ramadanCountdownText = document.getElementById('ramadan-countdown-text');
    
    if (isRamadan) {
        // Currently in Ramadan - show live Iftar/Sehri countdown
        if (ramadanTitle) ramadanTitle.textContent = "মাহে রমজান ও রোজা";
        if (rozaBtnText) rozaBtnText.textContent = "আজকের রোজা রাখা হয়েছে";
        // updateRamadanCountdown() handles the live countdown
    } else {
        // Not Ramadan - show upcoming Ramadan info
        if (ramadanTitle) ramadanTitle.textContent = "আসন্ন মাহে রমজান ১৪৪৮ হিজরি";
        if (rozaBtnText) rozaBtnText.textContent = "আজকের নফল রোজা রাখা হয়েছে";
        
        // Calculate days until next Ramadan (1st Ramadan 1448)
        const daysUntilRamadan = calculateDaysUntilNextRamadan();
        if (ramadanCountdownText) {
            ramadanCountdownText.textContent = `রমজান শুরু হতে বাকি: আনুমানিক ${toBN(daysUntilRamadan)} দিন`;
        }
    }
}

function calculateDaysUntilNextRamadan() {
    // Ramadan 1448 starts approximately March 10, 2024 (1st Ramadan 1445 was March 11, 2024)
    // 1446: ~Feb 28, 2025 | 1447: ~Feb 17, 2026 | 1448: ~Feb 7, 2027 | 1449: ~Jan 27, 2028
    // Using approximate Gregorian dates for upcoming Ramadans
    const ramadanStartDates = [
        new Date(2025, 1, 28),  // 1446 - Feb 28, 2025
        new Date(2026, 1, 17),  // 1447 - Feb 17, 2026
        new Date(2027, 1, 7),   // 1448 - Feb 7, 2027
        new Date(2028, 0, 27),  // 1449 - Jan 27, 2028
    ];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const ramadanStart of ramadanStartDates) {
        const diff = ramadanStart - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days >= 0) return days;
    }
    
    // Fallback: calculate from next year
    const nextYear = today.getFullYear() + 1;
    const approxStart = new Date(nextYear, 1, 15); // Mid-February approximation
    return Math.ceil((approxStart - today) / (1000 * 60 * 60 * 24));
}

function updateRamadanCountdown() {
    const countdownText = document.getElementById('ramadan-countdown-text');
    if (!countdownText) return;
    
    // Check if currently in Ramadan
    let cachedHijri = localStorage.getItem(`hijri_${currentDate}`);
    if (!cachedHijri) {
        cachedHijri = getFallbackHijriDate(currentDate);
    }
    const isRamadan = cachedHijri && cachedHijri.includes("রমজান");
    
    // If not Ramadan, the static "days until Ramadan" message is already set by updateRamadanCard()
    if (!isRamadan) return;
    
    if (!prayerTimings || !prayerTimings.Maghrib) {
        countdownText.textContent = 'ইফতারের বাকি: --:--:--';
        return;
    }
    
    const now = new Date();
    const iftarTimeStr = prayerTimings.Maghrib.trim().split(' ')[0];
    const [ifH, ifM] = iftarTimeStr.split(':').map(Number);
    
    // Today's Iftar time
    const iftarToday = new Date();
    iftarToday.setHours(ifH, ifM, 0, 0);
    
    // Sehri time (Imsak or Fajr) for today
    const sehriTimeStr = (prayerTimings.Imsak || prayerTimings.Fajr).trim().split(' ')[0];
    const [sehH, sehM] = sehriTimeStr.split(':').map(Number);
    
    // Today's Sehri time
    const sehriToday = new Date();
    sehriToday.setHours(sehH, sehM, 0, 0);

    // Tomorrow's Sehri time
    const sehriTomorrow = new Date(sehriToday);
    sehriTomorrow.setDate(sehriTomorrow.getDate() + 1);
    
    let timeLeft, label;
    if (now < iftarToday) {
        // Before Iftar: countdown to Iftar
        timeLeft = iftarToday - now;
        label = 'ইফতারের বাকি';
    } else {
        // After Iftar: countdown to tomorrow's Sehri
        timeLeft = sehriTomorrow - now;
        label = 'সেহরি শেষ হতে বাকি';
    }
    
    if (timeLeft <= 0) {
        // If time left is zero or negative, show zero
        countdownText.textContent = `${label}: ০০:০০:০০`;
        return;
    }
    
    const h = Math.floor(timeLeft / 3600000);
    const m = Math.floor((timeLeft % 3600000) / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    
    const hStr = toBN(String(h).padStart(2, '0'));
    const mStr = toBN(String(m).padStart(2, '0'));
    const sStr = toBN(String(s).padStart(2, '0'));
    
    countdownText.textContent = `${label}: ${hStr}:${mStr}:${sStr}`;
}

// Tabs
document.querySelectorAll(".tab-btn").forEach(tab => tab.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
        p.classList.remove("active");
        p.hidden = true;
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    const panel = document.getElementById(`panel-${tab.dataset.tab}`);
    if (panel) {
        panel.classList.add("active");
        panel.hidden = false;
    }
    if (tab.dataset.tab === 'today') renderPrayers();
    if (tab.dataset.tab === 'qaza') loadAmalnamah();
    if (tab.dataset.tab === 'analytics') loadCalendar();
    if (tab.dataset.tab === 'ramadan') updateRamadanCard();
    if (tab.dataset.tab === 'quran') initQuran();
    if (tab.dataset.tab === 'hadith') initHadith();
});

// Date Navigation
function updateDate(delta) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    currentDate = `${y}-${m}-${day}`;
    syncDateDisplays();
    renderPrayers();
}

const prevBtn = document.getElementById("prev-day");
const nextBtn = document.getElementById("next-day");
if (prevBtn) prevBtn.onclick = () => updateDate(-1);
if (nextBtn) nextBtn.onclick = () => updateDate(1);

const bnMonths = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];
const enMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

let calViewYear = 2026;
let calViewMonth = 9;

const customCalendarPopover = document.getElementById("custom-calendar-popover");
const calPrevMonthBtn = document.getElementById("cal-prev-month");
const calNextMonthBtn = document.getElementById("cal-next-month");
const calTodayBtn = document.getElementById("cal-today-btn");
const calCloseBtn = document.getElementById("cal-close-btn");

function renderCustomCalendar() {
    const monthBnEl = document.getElementById("cal-popover-month-bn");
    const monthEnEl = document.getElementById("cal-popover-month-en");
    const daysGrid = document.getElementById("cal-popover-days");
    if (!daysGrid) return;
    
    if (monthBnEl) monthBnEl.textContent = `${bnMonths[calViewMonth]} ${toBN(calViewYear)}`;
    if (monthEnEl) monthEnEl.textContent = `${enMonths[calViewMonth]} ${calViewYear}`;
    
    daysGrid.innerHTML = "";
    
    const firstDay = new Date(calViewYear, calViewMonth, 1);
    const startDayIndex = (firstDay.getDay() + 1) % 7; // Saturday = 0, Friday = 6
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calViewYear, calViewMonth, 0).getDate();
    const todayStr = getLocalDateString();
    
    // Previous month padding
    for (let i = startDayIndex - 1; i >= 0; i--) {
        const dNum = prevMonthDays - i;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cal-day-cell other-month";
        cell.innerHTML = `<span>${toBN(dNum)}</span>`;
        cell.tabIndex = -1;
        daysGrid.appendChild(cell);
    }
    
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = dStr === currentDate;
        const isToday = dStr === todayStr;
        
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`;
        cell.innerHTML = `
            <span class="cal-day-num-bn">${toBN(d)}</span>
            <span class="cal-day-num-en">${d}</span>
        `;
        
        cell.onclick = (e) => {
            e.stopPropagation();
            currentDate = dStr;
            syncDateDisplays();
            renderPrayers();
            loadCalendar();
            closeCustomCalendar();
        };
        
        daysGrid.appendChild(cell);
    }
    
    // Next month padding to fill grid
    const totalCells = startDayIndex + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cal-day-cell other-month";
        cell.innerHTML = `<span>${toBN(d)}</span>`;
        cell.tabIndex = -1;
        daysGrid.appendChild(cell);
    }
}

function openCustomCalendar() {
    if (!customCalendarPopover) return;
    const [y, m] = currentDate.split("-").map(Number);
    calViewYear = y;
    calViewMonth = m - 1;
    renderCustomCalendar();
    customCalendarPopover.hidden = false;
    if (dateTrigger) dateTrigger.classList.add("active");
}

function closeCustomCalendar() {
    if (!customCalendarPopover) return;
    customCalendarPopover.hidden = true;
    if (dateTrigger) dateTrigger.classList.remove("active");
}

function toggleCustomCalendar() {
    if (!customCalendarPopover) return;
    if (customCalendarPopover.hidden) {
        openCustomCalendar();
    } else {
        closeCustomCalendar();
    }
}

if (dateTrigger) {
    dateTrigger.onclick = (e) => {
        e.stopPropagation();
        toggleCustomCalendar();
    };
}

if (calPrevMonthBtn) {
    calPrevMonthBtn.onclick = (e) => {
        e.stopPropagation();
        calViewMonth--;
        if (calViewMonth < 0) {
            calViewMonth = 11;
            calViewYear--;
        }
        renderCustomCalendar();
    };
}

if (calNextMonthBtn) {
    calNextMonthBtn.onclick = (e) => {
        e.stopPropagation();
        calViewMonth++;
        if (calViewMonth > 11) {
            calViewMonth = 0;
            calViewYear++;
        }
        renderCustomCalendar();
    };
}

if (calTodayBtn) {
    calTodayBtn.onclick = (e) => {
        e.stopPropagation();
        currentDate = getLocalDateString();
        const [y, m] = currentDate.split("-").map(Number);
        calViewYear = y;
        calViewMonth = m - 1;
        syncDateDisplays();
        renderPrayers();
        loadCalendar();
        closeCustomCalendar();
    };
}

if (calCloseBtn) {
    calCloseBtn.onclick = (e) => {
        e.stopPropagation();
        closeCustomCalendar();
    };
}

// Click outside to dismiss calendar popover
document.addEventListener("click", (e) => {
    if (customCalendarPopover && !customCalendarPopover.hidden) {
        if (!customCalendarPopover.contains(e.target) && !dateTrigger.contains(e.target)) {
            closeCustomCalendar();
        }
    }
});

// Amalnamah Month Navigation
const amalPrevBtn = document.getElementById("amal-prev-month");
const amalNextBtn = document.getElementById("amal-next-month");

function shiftAmalMonth(delta) {
    const [y, m] = amalnamahMonth.split("-").map(Number);
    let newMonth = m + delta;
    let newYear = y;
    if (newMonth < 1) {
        newMonth = 12;
        newYear--;
    } else if (newMonth > 12) {
        newMonth = 1;
        newYear++;
    }
    amalnamahMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    loadAmalnamah();
}

if (amalPrevBtn) {
    amalPrevBtn.onclick = (e) => {
        e.stopPropagation();
        shiftAmalMonth(-1);
    };
}

if (amalNextBtn) {
    amalNextBtn.onclick = (e) => {
        e.stopPropagation();
        shiftAmalMonth(1);
    };
}

// City Modal Logic
const changeCityBtn = document.getElementById("change-city-btn");
const cityModal = document.getElementById("city-modal");
const closeCityBtn = document.getElementById("close-city-modal");
const cancelCityBtn = document.getElementById("cancel-city-modal");
const saveCityBtn = document.getElementById("save-city-modal");
const customCityInput = document.getElementById("custom-city-input");
const cityPillBtns = document.querySelectorAll(".city-pill-btn");
const districtSelect = document.getElementById("district-select");
const countrySelect = document.getElementById("country-select");
const cityBackdrop = document.getElementById("city-modal-backdrop");

let selectedCityEn = localStorage.getItem("user_city") || "Dhaka";
let selectedCityBn = localStorage.getItem("user_city_bn") || "ঢাকা (Dhaka)";

function openCityModal() {
    if (!cityModal) return;
    if (customCityInput) customCityInput.value = "";
    
    // Sync division pills
    let pillMatched = false;
    cityPillBtns.forEach(btn => {
        const isMatch = btn.dataset.city.toLowerCase() === selectedCityEn.toLowerCase();
        btn.classList.toggle("active", isMatch);
        if (isMatch) pillMatched = true;
    });
    
    // Sync 64 district select
    if (districtSelect) {
        let optMatched = false;
        for (let opt of districtSelect.options) {
            if (opt.value && opt.value.toLowerCase() === selectedCityEn.toLowerCase()) {
                districtSelect.value = opt.value;
                optMatched = true;
                break;
            }
        }
        if (!optMatched) {
            districtSelect.value = "";
        }
    }
    
    // Sync country select (other countries)
    if (countrySelect) {
        let countryMatched = false;
        for (let opt of countrySelect.options) {
            if (opt.value && opt.value.toLowerCase() === selectedCityEn.toLowerCase()) {
                countrySelect.value = opt.value;
                countryMatched = true;
                break;
            }
        }
        if (!countryMatched) {
            countrySelect.value = "";
        }
    }
    
    cityModal.showModal();
}

function closeCityModal() {
    if (cityModal) cityModal.close();
}

if (changeCityBtn) changeCityBtn.onclick = openCityModal;
if (closeCityBtn) closeCityBtn.onclick = closeCityModal;
if (cancelCityBtn) cancelCityBtn.onclick = closeCityModal;
if (cityBackdrop) cityBackdrop.onclick = closeCityModal;

// Division pill click handler
cityPillBtns.forEach(btn => {
    btn.onclick = () => {
        cityPillBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedCityEn = btn.dataset.city;
        selectedCityBn = `${btn.dataset.bn} (${btn.dataset.city})`;
        if (customCityInput) customCityInput.value = "";
        if (districtSelect) districtSelect.value = btn.dataset.city;
        if (countrySelect) countrySelect.value = "";
    };
});

// 64 District dropdown handler
if (districtSelect) {
    districtSelect.onchange = () => {
        const selectedOpt = districtSelect.selectedOptions[0];
        if (selectedOpt && selectedOpt.value) {
            selectedCityEn = selectedOpt.value;
            const bnName = selectedOpt.dataset.bn || selectedOpt.text;
            selectedCityBn = `${bnName} (${selectedOpt.value})`;
            if (customCityInput) customCityInput.value = "";
            if (countrySelect) countrySelect.value = "";
            
            // Highlight division pill if it matches one of the 8 divisions
            cityPillBtns.forEach(b => {
                b.classList.toggle("active", b.dataset.city.toLowerCase() === selectedCityEn.toLowerCase());
            });
        }
    };
}

// Other country dropdown handler
if (countrySelect) {
    countrySelect.onchange = () => {
        const selectedOpt = countrySelect.selectedOptions[0];
        if (selectedOpt && selectedOpt.value) {
            selectedCityEn = selectedOpt.value;
            const bnName = selectedOpt.dataset.bn || selectedOpt.text;
            selectedCityBn = `${bnName} (${selectedOpt.value})`;
            if (customCityInput) customCityInput.value = "";
            if (districtSelect) districtSelect.value = "";
            cityPillBtns.forEach(b => b.classList.remove("active"));
        }
    };
}

if (customCityInput) {
    customCityInput.oninput = () => {
        if (customCityInput.value.trim()) {
            cityPillBtns.forEach(b => b.classList.remove("active"));
            if (districtSelect) districtSelect.value = "";
            if (countrySelect) countrySelect.value = "";
        }
    };
}

if (saveCityBtn) {
    saveCityBtn.onclick = () => {
        const custom = customCityInput ? customCityInput.value.trim() : "";
        if (custom) {
            selectedCityEn = custom;
            selectedCityBn = custom;
        }
        
        localStorage.setItem("user_city", selectedCityEn);
        localStorage.setItem("user_city_bn", selectedCityBn);
        
        const cityEl = document.getElementById("city-indicator");
        if (cityEl) cityEl.textContent = `📍 ${selectedCityBn}`;
        
        closeCityModal();
        fetchPrayerTimes().then(() => renderPrayers());
    };
}

// Countdown
function startCountdown() {
    setInterval(() => {
        const now = new Date();
        const names = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        const bnNames = ["ফজর", "যোহর", "আসর", "মাগরিব", "এশা"];
        
        if (!prayerTimings) {
            nextPrayerBanner.innerHTML = "নামাজের সময় আসছে...";
            updateRamadanCountdown();
            return;
        }
        
        let nextPrayer = null;
        for (let i = 0; i < names.length; i++) {
            if (!prayerTimings[names[i]]) continue;
            const timeRaw = prayerTimings[names[i]].trim().split(" ")[0];
            const [h, m] = timeRaw.split(":").map(Number);
            const prayerTime = new Date();
            prayerTime.setHours(h, m, 0);
            if (prayerTime > now) { nextPrayer = { name: bnNames[i], time: prayerTime }; break; }
        }
        
        if (!nextPrayer) {
            const fajrTimeRaw = prayerTimings.Fajr.trim().split(" ")[0];
            const [fh, fm] = fajrTimeRaw.split(":").map(Number);
            const tomorrowFajr = new Date();
            tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
            tomorrowFajr.setHours(fh, fm, 0);
            nextPrayer = { name: "ফজর", time: tomorrowFajr };
        }
        
        if (nextPrayer) {
            const diff = nextPrayer.time - now;
            const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
            nextPrayerBanner.innerHTML = `পরবর্তী ওয়াক্ত: ${nextPrayer.name}  বাকি: ${[h, m, s].map(v => toBN(String(v).padStart(2, '0'))).join(':')}`;
        }
        
        // Update Ramadan countdown
        updateRamadanCountdown();
    }, 1000);
}

async function loadAmalnamah() {
    const data = await api(`/stats/monthly-detail?month=${amalnamahMonth}`);
    if (!data) return;

    // Format month title in Bengali
    const [yearStr, monthStr] = amalnamahMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const monthTitle = `${bnMonths[month - 1]} ${toBN(year)}`;
    document.getElementById("amal-month-title").textContent = monthTitle;

    const overview = data.overview || {};
    const byPrayer = data.by_prayer || {};

    // Update 5 Overview Stat Cards with Bengali numbers
    document.getElementById("amal-stat-total").textContent = toBN(overview.total_prayed || 0);
    document.getElementById("amal-stat-jamaah").textContent = toBN(overview.jamaah_count || 0);
    document.getElementById("amal-stat-ontime").textContent = toBN(overview.ontime_count || 0);
    document.getElementById("amal-stat-qaza").textContent = toBN(overview.qaza_count || 0);
    document.getElementById("amal-stat-missed").textContent = toBN(overview.missed_count || 0);

    // Calculate completion rate based on elapsed days * 5
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    let elapsedDays;
    if (isCurrentMonth) {
        elapsedDays = now.getDate();
    } else {
        elapsedDays = new Date(year, month, 0).getDate();
    }
    const totalPossible = elapsedDays * 5;
    const totalPrayed = overview.total_prayed || 0;
    const rate = totalPossible > 0 ? Math.round((totalPrayed / totalPossible) * 100) : 0;
    document.getElementById("amal-stat-total-rate").textContent = `${toBN(rate)}% আদায়ের হার`;

    // Populate #amal-waqt-grid with 5 Waqt Cards
    const waqtGrid = document.getElementById("amal-waqt-grid");
    if (!waqtGrid) return;

    const names = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const arNames = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
    const bnNames = ["ফজর", "যোহর", "আসর", "মাগরিব", "এশা"];

    waqtGrid.innerHTML = names.map((name, i) => {
        const stats = byPrayer[name] || {};
        const jamaah = stats.jamaah_count || 0;
        const ontime = stats.ontime_count || 0;
        const qaza = stats.qaza_count || 0;
        const missed = stats.missed_count || 0;

        return `
            <article class="bento-card waqt-detail-card">
                <header class="waqt-card-header">
                    <div class="waqt-name-group">
                        <span class="arabic-name">${arNames[i]}</span>
                        <span class="bangla-name">${bnNames[i]}</span>
                    </div>
                </header>
                <div class="waqt-stats">
                    <div class="waqt-stat-pill">
                        <span class="pill-label">জামাতে</span>
                        <span class="pill-value">${toBN(jamaah)}</span>
                    </div>
                    <div class="waqt-stat-pill">
                        <span class="pill-label">ওয়াক্তমতো</span>
                        <span class="pill-value">${toBN(ontime)}</span>
                    </div>
                    <div class="waqt-stat-pill">
                        <span class="pill-label">কাযা</span>
                        <span class="pill-value">${toBN(qaza)}</span>
                    </div>
                    <div class="waqt-stat-pill">
                        <span class="pill-label">মিসড</span>
                        <span class="pill-value">${toBN(missed)}</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

// Calendar
async function loadCalendar() {
    const [y, m] = currentDate.split("-");
    const data = await api(`/stats/monthly?year=${y}&month=${parseInt(m)}`);
    const daysInMonth = new Date(y, m, 0).getDate();
    
    document.getElementById("calendar-days").innerHTML = Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
        const dateStr = `${y}-${m}-${String(day).padStart(2, '0')}`;
        const dayData = data.days?.find(d => d.date === dateStr);
        const count = dayData?.total_prayed || 0;
        const badge = count === 5 ? 'full' : count >= 3 ? 'partial' : count > 0 ? 'low' : 'none';
        
        return `<div class="day-tile ${dateStr === currentDate ? 'selected' : ''}" onclick="currentDate='${dateStr}'; renderPrayers(); loadCalendar();">
            <span>${toBN(day)}</span>
            <div class="badge-dot badge-${badge}"></div>
        </div>`;
    }).join("");
    
    document.getElementById("stat-max-streak").textContent = `${toBN(data.streak?.max || 0)} দিন`;
    const streakEl = document.getElementById("streak-count-text");
    if (streakEl) {
        streakEl.textContent = `${toBN(data.streak?.current ?? data.streak?.max ?? 0)} দিন স্ট্রিক`;
    }
}

  // Run initialization immediately on load
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

// Hijri Calendar State & Helper
let hijriRefDate = new Date();

function getHijriParts(date) {
    try {
        const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const parts = f.formatToParts(date);
        return {
            day: parseInt(parts.find(p => p.type === 'day').value, 10),
            month: parseInt(parts.find(p => p.type === 'month').value, 10),
            year: parseInt(parts.find(p => p.type === 'year').value, 10)
        };
    } catch(e) {
        return { day: 1, month: 1, year: 1448 };
    }
}

const hijriMonthsBn = ["", "মহররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"];
const hijriMonthsAr = ["", "المحرّم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة"];
const gregMonthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const specialIslamicEvents = {
    "1-1": "হিজরি নববর্ষ (পবিত্র ১লা মহররম)",
    "1-9": "তসুয়া (আশুরার পূর্বের নফল রোজা)",
    "1-10": "পবিত্র আশুরা (সুন্নাহ নফল রোজা)",
    "3-12": "ঈদে মিলাদুন্নবী (সা.)",
    "7-27": "পবিত্র শবে মেরাজ",
    "8-15": "পবিত্র শবে বরাত",
    "9-1": "পবিত্র মাহে রমজান শুরু (১ম রোজা)",
    "9-17": "ঐতিহাসিক বদর দিবস (১৭ই রমজান)",
    "9-27": "সম্ভাব্য লাইলাতুল কদর",
    "10-1": "পবিত্র ঈদুল ফিতর",
    "12-9": "ইয়াওমে আরাফা (আরাফার রোজা)",
    "12-10": "পবিত্র ঈদুল আযহা (কুরবানী)"
};

function renderHijriCalendar() {
    const grid = document.getElementById("hijri-modal-days-grid");
    const titleEl = document.getElementById("hijri-modal-title");
    const subEl = document.getElementById("hijri-modal-subtitle");
    const infoText = document.getElementById("hijri-info-text");
    if (!grid || !titleEl) return;

    const cur = getHijriParts(hijriRefDate);
    const hMonth = cur.month;
    const hYear = cur.year;

    titleEl.textContent = `${hijriMonthsBn[hMonth]} ${toBN(hYear)} হিজরি`;
    if (subEl) subEl.textContent = `${hijriMonthsAr[hMonth] || ''}`;

    const start = new Date(hijriRefDate);
    start.setDate(start.getDate() - (cur.day - 1));

    grid.innerHTML = "";
    const startPad = (start.getDay() + 1) % 7;
    for (let p = 0; p < startPad; p++) {
        const empty = document.createElement("div");
        empty.className = "hijri-day-cell other-month";
        grid.appendChild(empty);
    }

    const todayStr = getLocalDateString();
    let d = new Date(start);
    while (getHijriParts(d).month === hMonth) {
        const hp = getHijriParts(d);
        const cellDate = new Date(d);
        const yStr = cellDate.getFullYear();
        const mStr = String(cellDate.getMonth() + 1).padStart(2, '0');
        const dStr = String(cellDate.getDate()).padStart(2, '0');
        const dateIso = `${yStr}-${mStr}-${dStr}`;

        const isToday = dateIso === todayStr;
        const isAyyam = hp.day === 13 || hp.day === 14 || hp.day === 15;
        const eventDesc = specialIslamicEvents[`${hMonth}-${hp.day}`] || null;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = `hijri-day-cell ${isToday ? 'today' : ''} ${isAyyam ? 'ayyam-al-bid' : ''} ${eventDesc ? 'has-event' : ''}`;
        cell.innerHTML = `
            <span class="hijri-day-num">${toBN(hp.day)}</span>
            <span class="hijri-greg-num">${cellDate.getDate()} ${gregMonthsShort[cellDate.getMonth()]}</span>
        `;

        cell.onclick = () => {
            grid.querySelectorAll('.hijri-day-cell.selected').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            let desc = `${toBN(hp.day)} ${hijriMonthsBn[hMonth]} • ${toBN(cellDate.getDate())} ${gregMonthsShort[cellDate.getMonth()]}`;
            if (eventDesc) {
                desc += ` | 🌟 ${eventDesc}`;
            } else if (isAyyam) {
                desc += ` | 🌙 আইয়ামে বিজ (সুন্নাহ নফল রোজা)`;
            } else if (cellDate.getDay() === 1 || cellDate.getDay() === 4) {
                desc += ` | ✨ সপ্তাহের সুন্নাহ রোজা`;
            }
            if (infoText) infoText.textContent = desc;
        };

        grid.appendChild(cell);
        d.setDate(d.getDate() + 1);
    }
}

// Hijri Modal Event Wiring
const hijriModal = document.getElementById("hijri-calendar-modal");
const openHijriBtn = document.getElementById("open-hijri-cal-btn");
const closeHijriBtn = document.getElementById("close-hijri-modal");
const closeHijriFooterBtn = document.getElementById("hijri-modal-close-btn");
const hijriBackdrop = document.getElementById("hijri-modal-backdrop");
const hijriPrevBtn = document.getElementById("hijri-prev-month");
const hijriNextBtn = document.getElementById("hijri-next-month");
const hijriTodayBtn = document.getElementById("hijri-today-jump-btn");

if (openHijriBtn && hijriModal) {
    openHijriBtn.onclick = () => {
        hijriRefDate = new Date();
        renderHijriCalendar();
        hijriModal.showModal();
    };
}

const closeHijri = () => { if (hijriModal) hijriModal.close(); };
if (closeHijriBtn) closeHijriBtn.onclick = closeHijri;
if (closeHijriFooterBtn) closeHijriFooterBtn.onclick = closeHijri;
if (hijriBackdrop) hijriBackdrop.onclick = closeHijri;

if (hijriPrevBtn) {
    hijriPrevBtn.onclick = () => {
        const cur = getHijriParts(hijriRefDate);
        const start = new Date(hijriRefDate);
        start.setDate(start.getDate() - (cur.day - 1) - 15);
        hijriRefDate = start;
        renderHijriCalendar();
    };
}

if (hijriNextBtn) {
    hijriNextBtn.onclick = () => {
        const cur = getHijriParts(hijriRefDate);
        const start = new Date(hijriRefDate);
        start.setDate(start.getDate() - (cur.day - 1) + 32);
        hijriRefDate = start;
        renderHijriCalendar();
    };
}

// WAQT DETAILS DATA & MODAL HANDLER
const WAQT_DETAILS_DATA = {
    fajr: {
        title: "ফজর নামাজ", icon: "🌅", rakat: "৪ রাকাত (২ সুন্নাত + ২ ফরজ)",
        hadith: "ফজরের দুই রাকাত (সুন্নাত) দুনিয়া ও তার মাঝে যা কিছু আছে তার চেয়েও উত্তম। (সহিহ মুসলিম: ৭২৫)",
        niyyah: "মনে মনে সংকল্প: 'আমি আল্লাহর সন্তুষ্টির উদ্দেশ্যে আজকের ফজরের ২ রাকাত সুন্নাত/ফরজ নামাজ কিবলামুখী হয়ে আদায় করছি।' অন্তরের দৃঢ় সংকল্পই নিয়ত।",
        rules: "১. প্রথমে ২ রাকাত সুন্নতে মুয়াক্কাদা পড়ুন (এটি কখনো ত্যাগ করা উচিত নয়)। ২. এরপর ২ রাকাত ফরজ নামাজ আদায় করুন। ফজরের ফরজ নামাজে সরবে (উচ্চস্বরে) কিরাত পড়া সুন্নাত।"
    },
    dhuhr: {
        title: "যোহর নামাজ", icon: "☀️", rakat: "১২ রাকাত (৪ সুন্নাত + ৪ ফরজ + ২ সুন্নাত + ২ নফল)",
        hadith: "যে ব্যক্তি নিয়মিত যোহরের পূর্বে ৪ রাকাত ও পরে ২ রাকাত পড়বে, আল্লাহ তার জন্য জান্নাতে একটি প্রাসাদ নির্মাণ করবেন। (সুনানে তিরমিজি: ৪১৪)",
        niyyah: "সংকল্প: 'আল্লাহর সন্তুষ্টির উদ্দেশ্যে আজকের যোহরের ৪ রাকাত সুন্নাত/ফরজ নামাজ আদায় করছি।' মুখে বাংলায় সংকল্প করাই যথেষ্ট।",
        rules: "১. ফরজের পূর্বে ৪ রাকাত সুন্নতে মুয়াক্কাদা। ২. ৪ রাকাত ফরজ (নীরব কিরাত)। ৩. ফরজের পর ২ রাকাত সুন্নতে মুয়াক্কাদা। ৪. এরপর ২ রাকাত ঐচ্ছিক নফল নামাজ।"
    },
    asr: {
        title: "আসর নামাজ", icon: "🌤️", rakat: "৮ রাকাত (৪ সুন্নাত + ৪ ফরজ)",
        hadith: "যে ব্যক্তি আসরের পূর্বে ৪ রাকাত (সুন্নাত) আদায় করে, আল্লাহ তার ওপর রহমত বর্ষণ করুন। (সুনানে তিরমিজি: ৪৩০)",
        niyyah: "সংকল্প: 'আল্লাহর সন্তুষ্টির উদ্দেশ্যে আসরের ৪ রাকাত সুন্নাত/ফরজ নামাজ আদায় করছি।' মনে মনে সংকল্প করাই যথেষ্ট।",
        rules: "১. ফরজের পূর্বে ৪ রাকাত সুন্নতে গায়রে মুয়াক্কাদা (ঐচ্ছিক কিন্তু প্রভূত সওয়াবপূর্ণ)। ২. এরপর ৪ রাকাত ফরজ নামাজ (নীরব কিরাত)। আসরের পর সূর্যাস্ত পর্যন্ত কোনো নফল নামাজ পড়া নিষেধ।"
    },
    maghrib: {
        title: "মাগরিব নামাজ", icon: "🌆", rakat: "৭ রাকাত (৩ ফরজ + ২ সুন্নাত + ২ নফল)",
        hadith: "তোমরা সূর্যাস্তের সাথে সাথেই বিলম্ব না করে মাগরিবের নামাজ আদায় করো। (সহিহ বুখারি: ৫৫৩)",
        niyyah: "সংকল্প: 'মাগরিবের ৩ রাকাত ফরজ/সুন্নাত নামাজ আদায় করছি।' মাগরিবের ওয়াক্ত সীমিত, তাই দ্রুত আদায় করা উত্তম।",
        rules: "১. ওয়াক্ত হওয়ামাত্রই ৩ রাকাত ফরজ নামাজ (প্রথম ২ রাকাতে সরবে কিরাত)। ২. ফরজের পর ২ রাকাত সুন্নতে মুয়াক্কাদা। ৩. এরপর ২ রাকাত নফল।"
    },
    isha: {
        title: "এশা নামাজ", icon: "🌙", rakat: "১৭ রাকাত (৪ সুন্নাত + ৪ ফরজ + ২ সুন্নাত + ২ নফল + ৩ বিতর + ২ নফল)",
        hadith: "যে ব্যক্তি জামাতের সাথে এশার নামাজ আদায় করল, সে যেন অর্ধরাত পর্যন্ত নামাজ পড়ল। (সহিহ মুসলিম: ৬৫৬)",
        niyyah: "সংকল্প: 'এশার ৪ রাকাত ফরজ/সুন্নাত/বিতর নামাজ আদায় করছি।' বিতর নামাজ আদায় করা ওয়াজিব।",
        rules: "১. ফরজের পূর্বে ৪ রাকাত সুন্নাত। ২. ৪ রাকাত ফরজ (সরবে কিরাত)। ৩. ২ রাকাত সুন্নতে মুয়াক্কাদা। ৪. ২ রাকাত নফল। ৫. ৩ রাকাত বিতর (৩য় রাকাতে তাকবীর দিয়ে দোয়ায়ে কুনুত পড়া)। ৬. এরপর ২ রাকাত নফল।"
    }
};

function initWaqtDetailsModal() {
    const modal = document.getElementById("waqt-detail-modal");
    if (!modal) return;
    const iconEl = document.getElementById("waqt-modal-icon");
    const titleEl = document.getElementById("waqt-modal-title");
    const rakatEl = document.getElementById("waqt-modal-rakat");
    const bodyEl = document.getElementById("waqt-modal-body");
    const closeBtn = document.getElementById("close-waqt-modal");
    const backdrop = document.getElementById("waqt-modal-backdrop");

    const closeModal = () => modal.close();
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    document.querySelectorAll(".waqt-clickable-row").forEach(row => {
        row.onclick = () => {
            const d = WAQT_DETAILS_DATA[row.getAttribute("data-waqt")];
            if (!d) return;
            if (iconEl) iconEl.textContent = d.icon;
            if (titleEl) titleEl.textContent = d.title;
            if (rakatEl) rakatEl.textContent = d.rakat;
            if (bodyEl) {
                bodyEl.innerHTML = 
                    '<div class="waqt-detail-sec"><h4>✨ গুরুত্ব ও ফজিলত</h4><p class="waqt-hadith-box">' + d.hadith + '</p></div>' +
                    '<div class="waqt-detail-sec"><h4>🤲 নিয়ত ও মানসিক সংকল্প</h4><p>' + d.niyyah + '</p></div>' +
                    '<div class="waqt-detail-sec"><h4>📋 রাকাতসমূহ পড়ার নিয়ম</h4><p>' + d.rules + '</p></div>';
            }
            modal.showModal();
        };
    });
}

function initGuideFeatures() {
    document.querySelectorAll(".guide-accordion-header").forEach(btn => {
        btn.onclick = () => {
            const card = btn.closest(".guide-accordion-card");
            if (card) card.classList.toggle("open");
        };
    });
    initWaqtDetailsModal();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGuideFeatures);
} else {
    initGuideFeatures();
}





// ==========================================================================
// AL-QUR'AN LOGIC & CONTROLLER
// ==========================================================================
let quranSurahs = [];
let quranBookmarks = new Set();
let currentSurahNo = 1;
let quranInitialized = false;

async function initQuran() {
    if (!quranInitialized) {
        setupQuranEventListeners();
        quranInitialized = true;
    }
    await loadQuranBookmarks();
    await loadQuranLastRead();
    if (quranSurahs.length === 0) {
        try {
            quranSurahs = await api('/quran/surahs');
            renderSurahsGrid(quranSurahs);
        } catch (e) {
            console.error("Failed to load surahs", e);
        }
    }
}

function renderSurahsGrid(surahs) {
    const grid = document.getElementById("quran-surahs-grid");
    if (!grid) return;
    if (!surahs.length) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#94A3B8;">কোনো সূরা পাওয়া যায়নি</div>';
        return;
    }
    grid.innerHTML = surahs.map(s => `
        <div class="surah-card" onclick="openSurah(${s.surah_no})">
            <div class="surah-num-badge">${toBN(s.surah_no)}</div>
            <div class="surah-info">
                <div class="surah-title-row">
                    <span class="surah-title-bn">${s.name_bn}</span>
                    <span class="surah-title-ar">${s.name_ar}</span>
                </div>
                <div class="surah-meaning">${s.meaning_bn} • ${s.name_en}</div>
                <div class="surah-meta-row">
                    <span class="surah-tag ${s.revelation_type === 'মাক্কী' ? 'makki' : 'madani'}">${s.revelation_type}</span>
                    <span class="surah-ayah-count">${toBN(s.total_ayah)} আয়াত</span>
                </div>
            </div>
        </div>
    `).join("");
}

function setupQuranEventListeners() {
    const searchInput = document.getElementById("quran-search-input");
    const clearBtn = document.getElementById("quran-search-clear");
    const chips = document.querySelectorAll(".quran-chip");
    const backBtn = document.getElementById("quran-back-btn");
    const bmBtn = document.getElementById("quran-open-bookmarks-btn");
    const closeBmBtn = document.getElementById("close-quran-bm-modal");
    const okBmBtn = document.getElementById("ok-quran-bm-modal");
    const bmBackdrop = document.getElementById("quran-bm-backdrop");
    const bmModal = document.getElementById("quran-bookmarks-modal");
    const prevSurahBtn = document.getElementById("quran-reader-prev-surah");
    const nextSurahBtn = document.getElementById("quran-reader-next-surah");
    const resumeBtn = document.getElementById("quran-resume-btn");

    if (searchInput) {
        searchInput.oninput = (e) => {
            const q = e.target.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = q ? "block" : "none";
            filterQuranSurahs();
        };
    }
    if (clearBtn) {
        clearBtn.onclick = () => {
            searchInput.value = "";
            clearBtn.style.display = "none";
            filterQuranSurahs();
        };
    }
    chips.forEach(chip => {
        chip.onclick = () => {
            chips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filterQuranSurahs();
        };
    });

    if (backBtn) backBtn.onclick = closeSurahReader;
    if (prevSurahBtn) prevSurahBtn.onclick = () => { if (currentSurahNo > 1) openSurah(currentSurahNo - 1); };
    if (nextSurahBtn) nextSurahBtn.onclick = () => { if (currentSurahNo < 114) openSurah(currentSurahNo + 1); };
    if (resumeBtn) resumeBtn.onclick = () => {
        const lastRead = JSON.parse(localStorage.getItem("quran_last_read") || "{}");
        if (lastRead.surah_no) openSurah(lastRead.surah_no, lastRead.ayah_no);
    };

    const closeBm = () => { if (bmModal) bmModal.close(); };
    if (bmBtn) bmBtn.onclick = openBookmarksModal;
    if (closeBmBtn) closeBmBtn.onclick = closeBm;
    if (okBmBtn) okBmBtn.onclick = closeBm;
    if (bmBackdrop) bmBackdrop.onclick = closeBm;
}

function bnToEn(str) {
    const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(str).replace(/[০-৯]/g, d => bn.indexOf(d));
}

function filterQuranSurahs() {
    const rawQ = (document.getElementById("quran-search-input")?.value || "").trim().toLowerCase();
    const qEn = bnToEn(rawQ);
    const activeChip = document.querySelector(".quran-chip.active");
    const filter = activeChip ? activeChip.dataset.filter : "all";

    const filtered = quranSurahs.filter(s => {
        const matchesFilter = (filter === "all" || s.revelation_type === filter);
        const matchesSearch = !rawQ ||
            s.name_bn.toLowerCase().includes(rawQ) ||
            s.name_en.toLowerCase().includes(rawQ) ||
            s.name_ar.includes(rawQ) ||
            s.meaning_bn.toLowerCase().includes(rawQ) ||
            String(s.surah_no) === rawQ ||
            String(s.surah_no) === qEn;
        return matchesFilter && matchesSearch;
    });
    renderSurahsGrid(filtered);
}

async function openSurah(surahNo, targetAyah = null) {
    currentSurahNo = surahNo;
    const grid = document.getElementById("quran-surahs-grid");
    const reader = document.getElementById("quran-reader-container");
    const headerCard = document.querySelector(".quran-header-card");
    const bismillah = document.getElementById("quran-bismillah");
    const ayahsList = document.getElementById("quran-ayahs-list");
    const titleEl = document.getElementById("quran-reader-title");
    const metaEl = document.getElementById("quran-reader-meta");

    if (grid) grid.style.display = "none";
    if (headerCard) headerCard.style.display = "none";
    if (reader) reader.style.display = "block";
    if (ayahsList) ayahsList.innerHTML = '<div style="text-align:center; padding:40px; color:#64748B;">সূরা লোড হচ্ছে...</div>';

    if (bismillah) bismillah.style.display = (surahNo === 1 || surahNo === 9) ? "none" : "block";

    const prevSurahBtn = document.getElementById("quran-reader-prev-surah");
    const nextSurahBtn = document.getElementById("quran-reader-next-surah");
    if (prevSurahBtn) {
        prevSurahBtn.disabled = (surahNo <= 1);
        prevSurahBtn.style.opacity = (surahNo <= 1) ? "0.35" : "1";
        prevSurahBtn.style.cursor = (surahNo <= 1) ? "not-allowed" : "pointer";
    }
    if (nextSurahBtn) {
        nextSurahBtn.disabled = (surahNo >= 114);
        nextSurahBtn.style.opacity = (surahNo >= 114) ? "0.35" : "1";
        nextSurahBtn.style.cursor = (surahNo >= 114) ? "not-allowed" : "pointer";
    }

    try {
        const data = await api(`/quran/surah/${surahNo}`);
        const surah = data.surah;
        const ayahs = data.ayahs;

        if (titleEl) titleEl.textContent = `${toBN(surah.surah_no)}. সূরা ${surah.name_bn} (${surah.name_ar})`;
        if (metaEl) metaEl.textContent = `${surah.revelation_type} • ${toBN(surah.total_ayah)}টি আয়াত • ${surah.meaning_bn}`;

        saveQuranLastRead(surah.surah_no, targetAyah || 1, surah.name_bn);

        ayahsList.innerHTML = ayahs.map(a => {
            const isBm = quranBookmarks.has(`${a.surah_no}:${a.ayah_no}`);
            return `
                <div class="ayah-card" id="ayah-${a.surah_no}-${a.ayah_no}">
                    <div class="ayah-header">
                        <span class="ayah-badge">${toBN(a.ayah_no)}</span>
                        <div class="ayah-actions">
                            <button type="button" class="ayah-btn ${isBm ? 'bookmarked' : ''}" onclick="toggleBookmarkBtn(${a.surah_no}, ${a.ayah_no}, this)" title="বুকমার্ক">
                                <span>${isBm ? '★' : '☆'}</span>
                            </button>
                            <button type="button" class="ayah-btn" onclick="copyAyahText('${encodeURIComponent(a.text_ar)}', '${encodeURIComponent(a.translit_bn || '')}', '${encodeURIComponent(a.trans_bn)}')" title="কপি করুন">
                                📋
                            </button>
                        </div>
                    </div>
                    <div class="ayah-arabic">${a.text_ar}</div>
                    ${a.translit_bn ? `<div class="ayah-pronunciation"><strong>উচ্চারণ:</strong> ${a.translit_bn}</div>` : ''}
                    <div class="ayah-translation"><strong>অর্থ:</strong> ${a.trans_bn}</div>
                </div>
            `;
        }).join("");

        if (targetAyah) {
            setTimeout(() => {
                const el = document.getElementById(`ayah-${surahNo}-${targetAyah}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlight');
                }
            }, 200);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        if (ayahsList) ayahsList.innerHTML = '<div style="text-align:center; padding:40px; color:#EF4444;">সূরা লোড করতে সমস্যা হয়েছে</div>';
    }
}

function closeSurahReader() {
    const grid = document.getElementById("quran-surahs-grid");
    const reader = document.getElementById("quran-reader-container");
    const headerCard = document.querySelector(".quran-header-card");
    if (reader) reader.style.display = "none";
    if (grid) grid.style.display = "grid";
    if (headerCard) headerCard.style.display = "block";
    loadQuranLastRead();
}

async function loadQuranBookmarks() {
    try {
        const bookmarks = await api('/quran/bookmarks');
        quranBookmarks = new Set(bookmarks.map(b => `${b.surah_no}:${b.ayah_no}`));
        const countBadge = document.getElementById("quran-bookmark-count");
        if (countBadge) countBadge.textContent = toBN(bookmarks.length);
    } catch (e) {}
}

async function toggleBookmarkBtn(surahNo, ayahNo, btn) {
    try {
        const res = await api('/quran/bookmarks', {
            method: 'POST',
            body: JSON.stringify({ surah_no: surahNo, ayah_no: ayahNo })
        });
        const key = `${surahNo}:${ayahNo}`;
        if (res.bookmarked) {
            quranBookmarks.add(key);
            btn.classList.add("bookmarked");
            btn.innerHTML = '<span>★</span>';
        } else {
            quranBookmarks.delete(key);
            btn.classList.remove("bookmarked");
            btn.innerHTML = '<span>☆</span>';
        }
        const countBadge = document.getElementById("quran-bookmark-count");
        if (countBadge) countBadge.textContent = toBN(quranBookmarks.size);
    } catch (e) {}
}

async function openBookmarksModal() {
    const modal = document.getElementById("quran-bookmarks-modal");
    const listEl = document.getElementById("quran-bookmarks-list");
    if (!modal || !listEl) return;

    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#64748B;">লোড হচ্ছে...</div>';
    modal.showModal();

    try {
        const bookmarks = await api('/quran/bookmarks');
        if (!bookmarks.length) {
            listEl.innerHTML = '<div class="quran-bm-empty">কোনো সংরক্ষিত বুকমার্ক নেই</div>';
            return;
        }
        listEl.innerHTML = bookmarks.map(b => `
            <div class="quran-bm-item" onclick="openSurahFromBm(${b.surah_no}, ${b.ayah_no})">
                <div class="quran-bm-item-info">
                    <strong>সূরা ${b.name_bn} • আয়াত ${toBN(b.ayah_no)}</strong>
                    <span>${(b.trans_bn || '').substring(0, 60)}...</span>
                </div>
                <span style="font-size: 0.8rem; color: #059669; font-weight: 700;">পড়ুন →</span>
            </div>
        `).join("");
    } catch (e) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#EF4444;">বুকমার্ক লোড করতে সমস্যা হয়েছে</div>';
    }
}

function openSurahFromBm(surahNo, ayahNo) {
    const modal = document.getElementById("quran-bookmarks-modal");
    if (modal) modal.close();
    openSurah(surahNo, ayahNo);
}

async function loadQuranLastRead() {
    const banner = document.getElementById("quran-last-read-card");
    const titleEl = document.getElementById("quran-last-read-title");
    try {
        const lr = await api('/quran/last-read');
        if (lr && lr.surah_no) {
            localStorage.setItem("quran_last_read", JSON.stringify(lr));
            if (banner) banner.style.display = "flex";
            if (titleEl) titleEl.textContent = `সূরা ${lr.name_bn} (আয়াত ${toBN(lr.ayah_no)})`;
        } else {
            if (banner) banner.style.display = "none";
        }
    } catch (e) {}
}

async function saveQuranLastRead(surahNo, ayahNo, nameBn) {
    try {
        await api('/quran/last-read', {
            method: 'POST',
            body: JSON.stringify({ surah_no: surahNo, ayah_no: ayahNo })
        });
        localStorage.setItem("quran_last_read", JSON.stringify({ surah_no: surahNo, ayah_no: ayahNo, name_bn: nameBn }));
    } catch (e) {}
}

function copyAyahText(encAr, encTranslit, encBn) {
    const ar = decodeURIComponent(encAr);
    const translit = encTranslit ? decodeURIComponent(encTranslit) : '';
    const bn = decodeURIComponent(encBn);
    let text = `${ar}\n`;
    if (translit) {
        text += `\nউচ্চারণ: ${translit}\n`;
    }
    text += `\nঅর্থ: ${bn}`;
    navigator.clipboard.writeText(text).then(() => {
        alert("আয়াত, উচ্চারণ ও অর্থ কপি হয়েছে!");
    }).catch(() => {});
}


// ========================================================
// HADITH SHARIF (হাদীস শরীফ) MODULE
// ========================================================

let hadithsList = [];
let hadithCategoriesList = [];
let hadithBooksList = [];
let hadithBookmarksSet = new Set();
let currentHadithCategory = 'all';
let currentHadithBook = 'all';
let hadithSearchTerm = '';
let hadithModuleInitialized = false;

async function initHadith() {
    if (!hadithModuleInitialized) {
        setupHadithEventListeners();
        await loadHadithCategoriesAndBooks();
        hadithModuleInitialized = true;
    }
    await loadHadithBookmarksCount();
    await fetchAndRenderHadiths();
}

function setupHadithEventListeners() {
    const searchInput = document.getElementById("hadith-search-input");
    const searchClear = document.getElementById("hadith-search-clear");
    const openBmBtn = document.getElementById("hadith-open-bookmarks-btn");
    const closeBmBtn = document.getElementById("close-hadith-bm-modal");
    const okBmBtn = document.getElementById("ok-hadith-bm-modal");
    const bmBackdrop = document.getElementById("hadith-bm-backdrop");
    const bmModal = document.getElementById("hadith-bookmarks-modal");

    if (searchInput) {
        let debounceTimer;
        searchInput.oninput = (e) => {
            hadithSearchTerm = e.target.value.trim();
            if (searchClear) searchClear.style.display = hadithSearchTerm ? "block" : "none";
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAndRenderHadiths();
            }, 250);
        };
    }

    if (searchClear) {
        searchClear.onclick = () => {
            if (searchInput) searchInput.value = "";
            hadithSearchTerm = "";
            searchClear.style.display = "none";
            fetchAndRenderHadiths();
        };
    }

    if (openBmBtn && bmModal) {
        openBmBtn.onclick = () => {
            loadAndShowHadithBookmarksModal();
            bmModal.showModal();
        };
    }

    const closeBm = () => { if (bmModal) bmModal.close(); };
    if (closeBmBtn) closeBmBtn.onclick = closeBm;
    if (okBmBtn) okBmBtn.onclick = closeBm;
    if (bmBackdrop) bmBackdrop.onclick = closeBm;
}

async function loadHadithCategoriesAndBooks() {
    try {
        const [cats, books] = await Promise.all([
            api('/hadith/categories'),
            api('/hadith/books')
        ]);
        hadithCategoriesList = cats || [];
        hadithBooksList = books || [];

        // Render Category Chips
        const catContainer = document.getElementById("hadith-category-chips");
        if (catContainer) {
            let html = `<button type="button" class="hadith-chip active" data-category="all">সব বিষয়</button>`;
            hadithCategoriesList.forEach(c => {
                html += `<button type="button" class="hadith-chip" data-category="${c.id}">${c.icon} ${c.name_bn} (${toBN(c.count)})</button>`;
            });
            catContainer.innerHTML = html;

            catContainer.querySelectorAll(".hadith-chip").forEach(chip => {
                chip.onclick = () => {
                    catContainer.querySelectorAll(".hadith-chip").forEach(btn => btn.classList.remove("active"));
                    chip.classList.add("active");
                    currentHadithCategory = chip.dataset.category;
                    fetchAndRenderHadiths();
                };
            });
        }

        // Render Book Chips
        const bookContainer = document.getElementById("hadith-book-chips");
        if (bookContainer) {
            let html = `<button type="button" class="hadith-sub-chip active" data-book="all">সকল গ্রন্থ</button>`;
            hadithBooksList.forEach(b => {
                html += `<button type="button" class="hadith-sub-chip" data-book="${b.id}">${b.name_bn} (${toBN(b.count)})</button>`;
            });
            bookContainer.innerHTML = html;

            bookContainer.querySelectorAll(".hadith-sub-chip").forEach(chip => {
                chip.onclick = () => {
                    bookContainer.querySelectorAll(".hadith-sub-chip").forEach(btn => btn.classList.remove("active"));
                    chip.classList.add("active");
                    currentHadithBook = chip.dataset.book;
                    fetchAndRenderHadiths();
                };
            });
        }
    } catch (e) {
        console.error("Failed to load hadith categories/books:", e);
    }
}

async function loadHadithBookmarksCount() {
    try {
        const bms = await api('/hadith/bookmarks');
        hadithBookmarksSet = new Set((bms || []).map(b => b.id));
        const badge = document.getElementById("hadith-bookmark-count");
        if (badge) badge.textContent = toBN(hadithBookmarksSet.size);
    } catch (e) {
        console.error("Failed to load hadith bookmarks count:", e);
    }
}

async function fetchAndRenderHadiths() {
    const container = document.getElementById("hadith-cards-container");
    const countEl = document.getElementById("hadith-results-count");
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 30px; color:#64748B;">হাদীস লোড হচ্ছে...</div>`;

    let url = `/hadith/all?category=${encodeURIComponent(currentHadithCategory)}&book=${encodeURIComponent(currentHadithBook)}`;
    if (hadithSearchTerm) {
        url += `&search=${encodeURIComponent(hadithSearchTerm)}`;
    }

    try {
        hadithsList = await api(url);
        if (countEl) {
            countEl.textContent = `মোট ${toBN(hadithsList.length)}টি হাদীস প্রদর্শিত হচ্ছে`;
        }

        if (!hadithsList || hadithsList.length === 0) {
            container.innerHTML = `
                <div class="hadith-empty-state">
                    <div class="hadith-empty-icon">🔍</div>
                    <div class="hadith-empty-title">কোনো হাদীস পাওয়া যায়নি</div>
                    <div class="hadith-empty-desc">অনুসন্ধান বা ফিল্টারের ধরন পরিবর্তন করে আবার চেষ্টা করুন।</div>
                </div>
            `;
            return;
        }

        let html = "";
        hadithsList.forEach(h => {
            const isBookmarked = hadithBookmarksSet.has(h.id);
            html += `
                <article class="hadith-card" id="hadith-card-${h.id}">
                    <header class="hadith-card-header">
                        <div class="hadith-pills-wrap">
                            <span class="hadith-num-tag">#${toBN(h.id)}</span>
                            <span class="hadith-category-tag">${h.category_bn}</span>
                            <span class="hadith-book-tag">${h.book_name_bn}</span>
                            <span class="hadith-grade-tag">${h.grade_bn}</span>
                        </div>
                        <div class="hadith-actions-top">
                            <button type="button" class="hadith-star-btn ${isBookmarked ? 'bookmarked' : ''}" 
                                    id="hadith-star-${h.id}" 
                                    onclick="handleToggleHadithBookmark(${h.id})" 
                                    title="${isBookmarked ? 'বুকমার্ক সরান' : 'বুকমার্ক করুন'}"
                                    aria-label="বুকমার্ক">
                                <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                            </button>
                        </div>
                    </header>
                    <h3 class="hadith-chapter-title">${h.chapter_bn}</h3>
                    <div class="hadith-narrator-text">${h.narrator_bn}</div>
                    <p class="hadith-card-arabic">${h.text_ar}</p>
                    <p class="hadith-card-bangla">${h.text_bn}</p>
                    <footer class="hadith-card-footer">
                        <span class="hadith-card-ref">📖 ${h.reference_bn}</span>
                        <button type="button" class="hadith-icon-action-btn" id="copy-btn-${h.id}" onclick="copyHadithCard(${h.id})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            <span>কপি করুন</span>
                        </button>
                    </footer>
                </article>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Failed to render hadiths:", e);
        container.innerHTML = `<div style="text-align:center; padding: 20px; color:#EF4444;">হাদীস লোড করার সময় সমস্যা হয়েছে।</div>`;
    }
}

async function handleToggleHadithBookmark(hadithId) {
    try {
        const res = await api('/hadith/bookmarks', {
            method: 'POST',
            body: JSON.stringify({ hadith_id: hadithId })
        });
        if (res.bookmarked) {
            hadithBookmarksSet.add(hadithId);
        } else {
            hadithBookmarksSet.delete(hadithId);
        }

        // Update badge
        const badge = document.getElementById("hadith-bookmark-count");
        if (badge) badge.textContent = toBN(hadithBookmarksSet.size);

        // Update star button
        const starBtn = document.getElementById(`hadith-star-${hadithId}`);
        if (starBtn) {
            starBtn.classList.toggle("bookmarked", res.bookmarked);
            const svg = starBtn.querySelector("svg");
            if (svg) svg.setAttribute("fill", res.bookmarked ? "currentColor" : "none");
            starBtn.title = res.bookmarked ? "বুকমার্ক সরান" : "বুকমার্ক করুন";
        }
    } catch (e) {
        console.error("Failed to toggle bookmark:", e);
    }
}

function copyHadithCard(hadithId) {
    const h = hadithsList.find(x => x.id === hadithId);
    if (!h) return;
    const text = `[হাদীস শরীফ • ${h.book_name_bn} | ${h.reference_bn}]
বিষয়: ${h.chapter_bn}
বর্ণনাকারী: ${h.narrator_bn}

${h.text_ar}

অনুবাদ: ${h.text_bn}`;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(`copy-btn-${hadithId}`);
        if (btn) {
            btn.classList.add("copied");
            const span = btn.querySelector("span");
            if (span) span.textContent = "কপি হয়েছে! ✓";
            setTimeout(() => {
                btn.classList.remove("copied");
                if (span) span.textContent = "কপি করুন";
            }, 2000);
        }
    }).catch(err => {
        alert("কপি করা যায়নি!");
    });
}

async function loadAndShowHadithBookmarksModal() {
    const listEl = document.getElementById("hadith-bookmarks-list");
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align:center; padding: 20px; color:#64748B;">বুকমার্কসমূহ লোড হচ্ছে...</div>`;

    try {
        const bms = await api('/hadith/bookmarks');
        if (!bms || bms.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #64748B;">
                    <span style="font-size: 2rem;">⭐</span>
                    <p style="margin-top: 8px; font-weight: 600;">এখনো কোনো হাদীস বুকমার্ক করা হয়নি।</p>
                    <p style="font-size: 0.82rem;">পছন্দের হাদীসের ওপর থাকা স্টার চিহ্নে ক্লিক করে বুকমার্ক করুন।</p>
                </div>
            `;
            return;
        }

        let html = "";
        bms.forEach(b => {
            html += `
                <div class="hadith-bm-item">
                    <div class="hadith-bm-item-top">
                        <span class="hadith-bm-item-ref">${b.book_name_bn} • ${b.reference_bn}</span>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeHadithBookmarkFromModal(${b.id})" style="padding: 2px 8px; font-size: 0.72rem; border-radius: 6px;">মুছে ফেলুন</button>
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #0F172A;">${b.chapter_bn}</div>
                    <p class="hadith-bm-item-text">${b.text_bn.slice(0, 120)}...</p>
                </div>
            `;
        });
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<div style="text-align:center; padding: 15px; color:#EF4444;">বুকমার্ক লোড করতে ব্যর্থ হয়েছে।</div>`;
    }
}

async function removeHadithBookmarkFromModal(hadithId) {
    await handleToggleHadithBookmark(hadithId);
    loadAndShowHadithBookmarksModal();
}

// Daily Hadith Widget for Today's Tab
let currentDailyHadith = null;
async function loadDailyHadithWidget() {
    try {
        const h = await api('/hadith/daily');
        if (!h || !h.id) return;
        currentDailyHadith = h;

        const bookEl = document.getElementById("widget-hadith-book");
        const arEl = document.getElementById("widget-hadith-ar");
        const bnEl = document.getElementById("widget-hadith-bn");
        const refEl = document.getElementById("widget-hadith-ref");
        const viewAllBtn = document.getElementById("widget-view-all-hadith-btn");
        const copyBtn = document.getElementById("widget-hadith-copy-btn");

        if (bookEl) bookEl.textContent = h.book_name_bn;
        if (arEl) arEl.textContent = h.text_ar;
        if (bnEl) bnEl.textContent = h.text_bn;
        if (refEl) refEl.textContent = `📖 ${h.reference_bn}`;

        if (viewAllBtn) {
            viewAllBtn.onclick = () => {
                const hadithTab = document.getElementById("tab-hadith");
                if (hadithTab) hadithTab.click();
            };
        }

        if (copyBtn) {
            copyBtn.onclick = () => {
                if (!currentDailyHadith) return;
                const text = `[আজকের নির্বাচিত হাদীস • ${currentDailyHadith.book_name_bn} | ${currentDailyHadith.reference_bn}]
বর্ণনাকারী: ${currentDailyHadith.narrator_bn}

${currentDailyHadith.text_ar}

অনুবাদ: ${currentDailyHadith.text_bn}`;
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.classList.add("copied");
                    const label = copyBtn.querySelector(".copy-text-label");
                    if (label) label.textContent = "কপি হয়েছে! ✓";
                    setTimeout(() => {
                        copyBtn.classList.remove("copied");
                        if (label) label.textContent = "কপি করুন";
                    }, 2000);
                });
            };
        }
    } catch (e) {
        console.error("Failed to load daily hadith widget:", e);
    }
}

// Auto-hide scrollbar: visible on swipe/scroll, hidden when idle
(function initScrollbarAutoHide() {
    let scrollTimeout;
    const handleScroll = (e) => {
        const target = e.target === document || e.target === document.documentElement || e.target === document.body 
            ? document.documentElement 
            : e.target;
        if (target && target.classList) {
            target.classList.add("is-scrolling");
        }
        document.documentElement.classList.add("is-scrolling");
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (target && target.classList) {
                target.classList.remove("is-scrolling");
            }
            document.querySelectorAll(".is-scrolling").forEach(el => el.classList.remove("is-scrolling"));
            document.documentElement.classList.remove("is-scrolling");
        }, 800);
    };
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
})();
