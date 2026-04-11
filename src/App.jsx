import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Building,
  MapPin,
  Tags,
  Settings,
  ChevronDown,
  Check,
  Copy,
  Trash2,
  Moon,
  Sun,
  Flame,
  Download,
  Loader2,
  Info,
  ChevronRight,
  Award,
  FileText,
} from "lucide-react";

// ====================================================================
// ⚠️ PENGATURAN KHUSUS UNTUK VS CODE LOKAL (WAJIB UBAH 2 BARIS INI) ⚠️
// ====================================================================

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

// ====================================================================

// --- Constants ---
const JENJANG_OPT = ["D3", "D4", "S1", "S2", "S3"];
const METODE_OPT = [
  "Kualitatif",
  "Kuantitatif",
  "Mixed Method",
  "Studi Kasus",
  "Eksperimen",
  "R&D",
  "Literature Review",
];
const KOMPLEKSITAS_OPT = ["Sederhana", "Menengah", "Kompleks / Lanjut"];

export default function App() {
  const [theme, setTheme] = useState("light");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [generatedTopik, setGeneratedTopik] = useState([]);
  const [isLoadingTopik, setIsLoadingTopik] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  const [formData, setFormData] = useState({
    prodi: "",
    topik: "",
    jenjang: "S1",
    metode: "Kualitatif",
    lokasi: "",
    objek: "",
    tahun: new Date().getFullYear(),
    kataKunci: [],
    kompleksitas: "Menengah",
    dosenKillerMode: false,
    showAdvanced: false,
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddTag = (tag) => {
    if (tag && !formData.kataKunci.includes(tag)) {
      setFormData((prev) => ({ ...prev, kataKunci: [...prev.kataKunci, tag] }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      kataKunci: prev.kataKunci.filter((t) => t !== tagToRemove),
    }));
  };

  const generateTopik = async () => {
    if (!formData.prodi) {
      alert("Isi Program Studi dulu");
      return;
    }

    setIsLoadingTopik(true);

    const prompt = `
Anda adalah asisten akademik.

Tugas:
Buatkan 5 IDE TOPIK PENELITIAN (BUKAN JUDUL).

Prodi: ${formData.prodi}

ATURAN WAJIB:
- Output berupa TOPIK, bukan judul
- Panjang maksimal 2–5 kata
- Tidak boleh seperti kalimat panjang
- Tidak boleh seperti judul skripsi
- Tidak boleh menggunakan tanda ":"
- Tidak boleh mengandung kata seperti:
  "pengaruh", "analisis", "model", "evaluasi"
- Harus berupa frasa singkat

Contoh BENAR:
- Sertifikasi halal
- UMKM kuliner
- AI dalam pendidikan
- Sistem informasi desa

Contoh SALAH:
- Analisis pengaruh sertifikasi halal terhadap UMKM
- Model implementasi AI dalam pendidikan

OUTPUT:
HANYA JSON ARRAY

[
  { "topik": "..." }
]
`;

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        },
      );
      const data = await response.json();

      let text = data.choices[0].message.content;

      text = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(text);

      setGeneratedTopik(parsed);
    } catch (err) {
      console.error(err);
      alert("Gagal generate topik");
    } finally {
      setIsLoadingTopik(false);
    }
  };

  // --- Integrasi AI ---
  const generateTitles = async (e) => {
    if (e) e.preventDefault();
    if (!formData.topik || !formData.prodi) {
      alert("Mohon isi minimal 'Program Studi' dan 'Topik Utama'.");
      return;
    }

    setIsGenerating(true);
    setResults([]);

    // Auto-scroll ke bawah di HP
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        window.scrollTo({
          top: document.getElementById("result-section").offsetTop - 20,
          behavior: "smooth",
        });
      }, 100);
    }

    const prompt = `
Anda adalah Profesor Pembimbing Akademik kelas elit dengan standar jurnal internasional (Scopus Q1), sangat kritis, perfeksionis, dan anti terhadap judul lemah.

TUGAS:
Hasilkan 5 judul skripsi/tesis yang:
- Memiliki kekuatan akademik tinggi
- Spesifik, tajam, dan tidak generik
- Layak langsung di-ACC tanpa revisi besar
- Mengandung variabel yang jelas dan terukur
- Memiliki potensi kontribusi ilmiah nyata

DATA:
- Jenjang: ${formData.jenjang}
- Prodi: ${formData.prodi}
- Topik: ${formData.topik}
- Metode: ${formData.metode}
- Lokasi: ${formData.lokasi || "-"}
- Objek: ${formData.objek || "-"}
- Tahun (hanya konteks): ${formData.tahun}
- Kata kunci: ${formData.kataKunci.length > 0 ? formData.kataKunci.join(", ") : "-"}
- Kompleksitas: ${formData.kompleksitas}
- Mode killer: ${formData.dosenKillerMode ? "AKTIF" : "NONAKTIF"}

PROSES BERPIKIR (WAJIB DIKUTI, TAPI JANGAN DITAMPILKAN):
1. Identifikasi variabel utama (X, Y, jika perlu Z)
2. Tentukan hubungan ilmiah antar variabel
3. Pilih pendekatan akademik paling kuat
4. Susun judul dengan struktur formal & tegas
5. Evaluasi apakah judul layak di-ACC dosen killer

ATURAN SUPER KETAT (TIDAK BOLEH DILANGGAR):
- Judul HARUS langsung inti penelitian (NO basa-basi)
- DILARANG TOTAL menggunakan tanda ":" 
- DILARANG gaya naratif / storytelling
- DILARANG frasa lemah seperti:
  "Peran", "Tantangan", "Implikasi", "Upaya", "Kajian terhadap"
- WAJIB struktur akademik kuat, contoh:
  "Pengaruh X terhadap Y"
  "Analisis X terhadap Y"
  "Model X dalam Y"
  "Evaluasi X terhadap Y"
- WAJIB ada objek atau konteks jelas
- JANGAN mencantumkan tahun dalam judul
- Gunakan bahasa ilmiah formal (bukan bahasa promosi atau opini)

VALIDASI INTERNAL:
Jika judul:
- Mengandung ":" → SALAH
- Terlalu umum → SALAH
- Tidak jelas variabel → SALAH
- Terasa seperti AI → SALAH

Jika SALAH → perbaiki sebelum output

SCORING:
- 90–100 → sangat kuat, hampir pasti ACC
- 80–89 → kuat tapi masih bisa dipertajam
- <80 → jangan tampilkan

FORMAT OUTPUT (WAJIB):
- HANYA JSON ARRAY
- TANPA markdown
- TANPA teks tambahan
- HARUS VALID JSON

[
  {
    "judul": "Judul yang sangat kuat...",
    "skor": 95,
    "alasan_skor": "Analisis akademik kenapa judul ini kuat dan layak ACC",
    "metode_saran": "Metode paling cocok untuk mengeksekusi penelitian ini"
  }
]
`;

    try {
      let attempt = 0;
      let data = null;
      const delays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

      // Pembersihan API Key dari spasi/enter yang tidak sengaja terbawa dari file .env
      const cleanKey = apiKey ? apiKey.trim() : "";

      while (attempt < 5) {
        try {
          const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cleanKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `
Kamu adalah AI akademik.
WAJIB hanya mengembalikan JSON VALID.
Tanpa markdown.
Tanpa tanda \`\`\`.
Tanpa penjelasan tambahan.

Judul harus:
- tanpa tanda ":"
- tanpa gaya naratif
- langsung akademik
- tanpa tahun
`,
                  },
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Detail Error API:", errorData);
            throw new Error(`API Error: ${response.status}`);
          }
          data = await response.json();
          break; // Sukses, keluar dari loop retry
        } catch (err) {
          if (attempt >= 4) throw err;
          await new Promise((r) => setTimeout(r, delays[attempt]));
          attempt++;
        }
      }

      if (data && data.choices && data.choices[0]) {
        let textResponse = data.choices[0].message.content;
        console.log("RAW AI:", textResponse);

        try {
          // Bersihkan formatting markdown jika AI masih mengirimkannya
          if (textResponse.startsWith("```json")) {
            textResponse = textResponse.replace(/```json\n?|```/g, "").trim();
          }

          const parsedResults = JSON.parse(textResponse);
          setResults(parsedResults);

          setHistory((prev) => [
            {
              id: Date.now(),
              date: new Date().toLocaleString(),
              topik: formData.topik,
              results: parsedResults,
            },
            ...prev,
          ]);
        } catch (parseError) {
          console.error("Parse JSON error", parseError);
          alert(
            "Gagal memformat hasil dari AI. AI tidak mengembalikan format JSON yang valid.",
          );
        }
      }
    } catch (error) {
      console.error("Proses fetch gagal:", error);
      alert(
        "Gagal menghubungi AI. Pastikan API Key valid dan model sesuai (gemini-1.5-flash-latest). Cek Console (F12) untuk detail error.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const exportToDoc = (judulItem) => {
    const content = `JUDUL SKRIPSI\n\nJudul: ${judulItem.judul}\nSkor Potensi ACC: ${judulItem.skor}/100\n\nAlasan:\n${judulItem.alasan_skor}\n\nSaran Metode:\n${judulItem.metode_saran}\n\n-- Dibuat oleh SkripsiGen AI --`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Draft_Judul_Skripsi.txt";
    link.click();
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans antialiased ${theme === "dark" ? "bg-[#0A0A0A] text-zinc-100" : "bg-[#FAFAFA] text-zinc-900"}`}
    >
      {/* --- Navbar --- */}
      <nav
        className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${theme === "dark" ? "bg-[#0A0A0A]/80 border-zinc-800/50" : "bg-white/80 border-zinc-200"}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg ${theme === "dark" ? "bg-zinc-800 text-zinc-100" : "bg-zinc-900 text-white"}`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight">
              SkripsiGen AI
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div
              className={`flex p-0.5 rounded-md ${theme === "dark" ? "bg-zinc-900/50 border border-zinc-800" : "bg-zinc-100 border border-zinc-200/50"}`}
            >
              <button
                onClick={() => setActiveTab("generator")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${activeTab === "generator" ? (theme === "dark" ? "bg-zinc-800 text-white shadow-sm" : "bg-white text-zinc-900 shadow-sm") : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"}`}
              >
                Generator
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all flex items-center gap-1.5 ${activeTab === "history" ? (theme === "dark" ? "bg-zinc-800 text-white shadow-sm" : "bg-white text-zinc-900 shadow-sm") : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"}`}
              >
                Riwayat{" "}
                {history.length > 0 && (
                  <span className="opacity-50">({history.length})</span>
                )}
              </button>
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-1.5 rounded-md transition-colors ${theme === "dark" ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"}`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {activeTab === "generator" ? (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
            {/* LEFT: FORM PANEL */}
            <div
              className={`w-full lg:w-[420px] shrink-0 p-5 sm:p-6 rounded-2xl border transition-colors duration-300 ${theme === "dark" ? "bg-[#111111] border-zinc-800/80 shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)]" : "bg-white border-zinc-200/80 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]"}`}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold tracking-tight mb-1">
                  Parameter Konfigurasi
                </h2>
                <p
                  className={`text-xs ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Tentukan spesifikasi penelitian Anda.
                </p>
              </div>

              <form onSubmit={generateTitles} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      className={`text-[11px] font-medium uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Jenjang
                    </label>
                    <select
                      name="jenjang"
                      value={formData.jenjang}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      {JENJANG_OPT.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className={`text-[11px] font-medium uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Metode
                    </label>
                    <select
                      name="metode"
                      value={formData.metode}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      {METODE_OPT.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Program Studi <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="prodi"
                    value={formData.prodi}
                    onChange={handleInputChange}
                    placeholder="Contoh: Sistem Informasi"
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={generateTopik}
                    className="mt-2 w-full text-xs py-2 rounded-lg bg-blue-600 text-white"
                  >
                    {isLoadingTopik ? "Loading..." : "Generate Topik Otomatis"}
                  </button>
                  {generatedTopik.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {generatedTopik.map((item, i) => (
                        <div
                          key={i}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              topik: item.topik,
                            }))
                          }
                          className="p-2 text-sm border rounded cursor-pointer hover:bg-gray-100"
                        >
                          {item.topik}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    Topik Utama <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    name="topik"
                    value={formData.topik}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Contoh: Penerapan AI dalam pendidikan..."
                    className="form-input resize-none py-2.5"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        showAdvanced: !prev.showAdvanced,
                      }))
                    }
                    className={`flex items-center justify-between w-full p-3 rounded-xl border text-sm font-medium transition-all ${theme === "dark" ? "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/80 text-zinc-300" : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700"}`}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 opacity-70" /> Konfigurasi
                      Lanjutan
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${formData.showAdvanced ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                <div
                  className={`space-y-4 overflow-hidden transition-all duration-300 ${formData.showAdvanced ? "max-h-[500px] opacity-100 pt-2" : "max-h-0 opacity-0"}`}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label
                        className={`text-[11px] font-medium uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                      >
                        Lokasi
                      </label>
                      <input
                        name="lokasi"
                        value={formData.lokasi}
                        onChange={handleInputChange}
                        placeholder="Opsional"
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        className={`text-[11px] font-medium uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                      >
                        Objek
                      </label>
                      <input
                        name="objek"
                        value={formData.objek}
                        onChange={handleInputChange}
                        placeholder="Opsional"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Kata Kunci{" "}
                      <span className="normal-case opacity-50">(Enter)</span>
                    </label>
                    <TagInput
                      tags={formData.kataKunci}
                      onAdd={handleAddTag}
                      onRemove={handleRemoveTag}
                      theme={theme}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className={`text-[11px] font-medium uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                    >
                      Kompleksitas
                    </label>
                    <select
                      name="kompleksitas"
                      value={formData.kompleksitas}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      {KOMPLEKSITAS_OPT.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${formData.dosenKillerMode ? (theme === "dark" ? "border-red-900/50 bg-red-950/20" : "border-red-200 bg-red-50") : theme === "dark" ? "border-zinc-800 bg-zinc-900/30" : "border-zinc-200 bg-zinc-50"}`}
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        name="dosenKillerMode"
                        checked={formData.dosenKillerMode}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div
                        className={`block w-9 h-5 rounded-full transition-colors duration-300 ${formData.dosenKillerMode ? "bg-red-500" : theme === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`}
                      ></div>
                      <div
                        className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${formData.dosenKillerMode ? "translate-x-4" : ""}`}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        Mode "Dosen Killer"
                        {formData.dosenKillerMode && (
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                        )}
                      </div>
                      <div
                        className={`text-[11px] mt-1 leading-relaxed ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                      >
                        AI akan membuat judul yang sangat teoretis, kritis, dan
                        menghindari topik pasaran.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex justify-center items-center gap-2 group ${
                      isGenerating
                        ? "opacity-70 cursor-not-allowed bg-zinc-400 text-white dark:bg-zinc-800"
                        : theme === "dark"
                          ? "bg-white text-black hover:bg-zinc-200 active:scale-[0.98]"
                          : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sedang
                        Berpikir...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Generate Judul
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT: OUTPUT PANEL */}
            <div id="result-section" className="flex-1 w-full min-h-[400px]">
              {isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4 animate-pulse">
                    <div
                      className={`h-6 w-40 rounded ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`}
                    ></div>
                    <div
                      className={`h-6 w-20 rounded-full ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`}
                    ></div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`p-5 rounded-2xl border animate-pulse ${theme === "dark" ? "border-zinc-800 bg-[#111111]" : "border-zinc-200 bg-white"}`}
                    >
                      <div
                        className={`h-5 w-full max-w-[80%] rounded mb-3 ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"}`}
                      ></div>
                      <div
                        className={`h-4 w-full rounded mb-2 ${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100"}`}
                      ></div>
                      <div
                        className={`h-4 w-2/3 rounded ${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100"}`}
                      ></div>
                    </div>
                  ))}
                </div>
              )}

              {!isGenerating && results.length === 0 && (
                <div
                  className={`h-full min-h-[300px] lg:min-h-[500px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed text-center ${theme === "dark" ? "border-zinc-800 bg-[#111111]/50" : "border-zinc-300 bg-zinc-50/50"}`}
                >
                  <div
                    className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-zinc-900 text-zinc-700" : "bg-zinc-100 text-zinc-300"}`}
                  >
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3
                    className={`text-base font-medium mb-1 ${theme === "dark" ? "text-zinc-300" : "text-zinc-700"}`}
                  >
                    Belum Ada Hasil
                  </h3>
                  <p
                    className={`text-sm max-w-[280px] ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}
                  >
                    Isi parameter di samping dan klik generate untuk melihat ide
                    judul skripsi.
                  </p>
                </div>
              )}

              {!isGenerating && results.length > 0 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-semibold tracking-tight">
                      Rekomendasi Judul AI
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${theme === "dark" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
                    >
                      {results.length} Ditemukan
                    </span>
                  </div>

                  <div className="space-y-4">
                    {results.map((item, idx) => (
                      <ResultCard
                        key={idx}
                        item={item}
                        index={idx}
                        theme={theme}
                        onCopy={() => copyToClipboard(item.judul)}
                        onExport={() => exportToDoc(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* HISTORY TAB */
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight mb-1">
                  Riwayat Pencarian
                </h2>
                <p
                  className={`text-sm ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Kumpulan ide judul yang pernah Anda buat.
                </p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${theme === "dark" ? "text-red-400 hover:bg-red-950/30" : "text-red-600 hover:bg-red-50"}`}
                >
                  <Trash2 className="w-4 h-4" /> Hapus Semua
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div
                className={`text-center py-20 text-sm ${theme === "dark" ? "text-zinc-600" : "text-zinc-400"}`}
              >
                Belum ada riwayat pencarian.
              </div>
            ) : (
              <div className="space-y-8">
                {history.map((hist, i) => (
                  <div
                    key={i}
                    className={`relative pl-5 sm:pl-6 border-l ${theme === "dark" ? "border-zinc-800" : "border-zinc-200"}`}
                  >
                    <div
                      className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ${theme === "dark" ? "bg-zinc-600 ring-[#0A0A0A]" : "bg-zinc-400 ring-[#FAFAFA]"}`}
                    ></div>
                    <div className="mb-4">
                      <div
                        className={`text-xs font-medium mb-1 ${theme === "dark" ? "text-zinc-500" : "text-zinc-400"}`}
                      >
                        {hist.date}
                      </div>
                      <div className="text-sm font-medium">
                        Topik: {hist.topik}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {hist.results.map((res, j) => (
                        <div
                          key={j}
                          className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between gap-3 ${theme === "dark" ? "bg-[#111111] border-zinc-800" : "bg-white border-zinc-200"}`}
                        >
                          <p className="text-sm font-medium leading-snug line-clamp-3">
                            {res.judul}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${theme === "dark" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}
                            >
                              Skor: {res.skor}
                            </span>
                            <button
                              onClick={() => copyToClipboard(res.judul)}
                              className={`p-1.5 rounded-md transition-colors ${theme === "dark" ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}
                              title="Copy Judul"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 4px; }
        .dark ::-webkit-scrollbar-thumb { background: #3f3f46; }
        ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .dark ::-webkit-scrollbar-thumb:hover { background: #52525b; }

        .form-input, .form-select {
          width: 100%; padding: 8px 12px; font-size: 0.875rem;
          line-height: 1.25rem; border-radius: 0.5rem; outline: none;
          transition: all 0.2s ease; appearance: none;
        }
        
        .form-input, .form-select {
          background-color: #ffffff; border: 1px solid #e4e4e7; color: #18181b;
        }
        .form-input::placeholder { color: #a1a1aa; }
        .form-input:focus, .form-select:focus { border-color: #18181b; box-shadow: 0 0 0 1px #18181b; }

        .dark .form-input, .dark .form-select {
          background-color: #18181b; border: 1px solid #27272a; color: #f4f4f5;
        }
        .dark .form-input::placeholder { color: #52525b; }
        .dark .form-input:focus, .dark .form-select:focus { border-color: #f4f4f5; box-shadow: 0 0 0 1px #f4f4f5; }

        .form-select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center; background-repeat: no-repeat;
          background-size: 1.5em 1.5em; padding-right: 2.5rem;
        }
      `,
        }}
      />
    </div>
  );
}

function TagInput({ tags, onAdd, onRemove, theme }) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim().replace(",", "");
      if (val) {
        onAdd(val);
        setInput("");
      }
    }
  };

  return (
    <div
      className={`p-1.5 flex flex-wrap gap-1.5 items-center rounded-lg border transition-all min-h-[40px] focus-within:ring-1 ${theme === "dark" ? "bg-zinc-900 border-zinc-800 focus-within:ring-white focus-within:border-white" : "bg-white border-zinc-200 focus-within:ring-black focus-within:border-black"}`}
    >
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${theme === "dark" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="opacity-60 hover:opacity-100 p-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Ketik & Enter" : ""}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-sm px-1"
      />
    </div>
  );
}

function ResultCard({ item, index, theme, onCopy, onExport }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreBadge = (score) => {
    if (score >= 90)
      return {
        bg: theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50",
        text: theme === "dark" ? "text-emerald-400" : "text-emerald-600",
        icon: <Award className="w-3.5 h-3.5" />,
      };
    if (score >= 75)
      return {
        bg: theme === "dark" ? "bg-blue-500/10" : "bg-blue-50",
        text: theme === "dark" ? "text-blue-400" : "text-blue-600",
        icon: <Award className="w-3.5 h-3.5" />,
      };
    return {
      bg: theme === "dark" ? "bg-amber-500/10" : "bg-amber-50",
      text: theme === "dark" ? "text-amber-400" : "text-amber-600",
      icon: <Award className="w-3.5 h-3.5" />,
    };
  };

  const scoreStyle = getScoreBadge(item.skor);

  return (
    <div
      className={`group p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${theme === "dark" ? "bg-[#111111] border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md"}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <h4 className="text-[17px] sm:text-lg font-semibold leading-snug flex-1">
          {item.judul}
        </h4>
        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold self-start ${scoreStyle.bg} ${scoreStyle.text}`}
        >
          {scoreStyle.icon}
          <span>Skor: {item.skor}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div
          className={`p-4 rounded-xl text-sm ${theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50"}`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info
              className={`w-3.5 h-3.5 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
            />
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
            >
              Analisis
            </span>
          </div>
          <p
            className={`leading-relaxed ${theme === "dark" ? "text-zinc-300" : "text-zinc-700"}`}
          >
            {item.alasan_skor}
          </p>
        </div>

        {item.metode_saran && (
          <div
            className={`p-4 rounded-xl text-sm ${theme === "dark" ? "bg-zinc-900/50" : "bg-zinc-50"}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Settings
                className={`w-3.5 h-3.5 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
              >
                Saran Eksekusi
              </span>
            </div>
            <p
              className={`leading-relaxed ${theme === "dark" ? "text-zinc-300" : "text-zinc-700"}`}
            >
              {item.metode_saran}
            </p>
          </div>
        )}
      </div>

      <div
        className={`flex items-center gap-2 pt-4 border-t ${theme === "dark" ? "border-zinc-800" : "border-zinc-100"}`}
      >
        <button
          onClick={handleCopy}
          className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${copied ? "bg-green-500/10 text-green-600 dark:text-green-400" : theme === "dark" ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Tersalin" : "Salin Judul"}
        </button>
        <button
          onClick={onExport}
          className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border text-xs font-medium rounded-lg transition-colors ${theme === "dark" ? "border-zinc-800 hover:bg-zinc-800/50 text-zinc-400" : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"}`}
        >
          <Download className="w-3.5 h-3.5" /> Simpan (.txt)
        </button>
      </div>
    </div>
  );
}
