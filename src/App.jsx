import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Settings, 
  Save, 
  Download, 
  Bold, 
  Italic, 
  GraduationCap,
  Menu,
  X,
  BookOpen,
  Sparkles,
  Layout,
  Layers,
  StickyNote,
  CheckCircle2,
  Wand2,
  ChevronDown,
  FileDown,
  Printer,
  FileSearch,
  AlertCircle,
  Copy,
  Check,
  FileEdit,
  UploadCloud,
  Key,
  Scale
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';

// --- Inisialisasi Firebase ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'skripsiai-default-app';

// --- Utilitas: Fetch dengan Exponential Backoff & Real Error Catcher ---
const fetchWithRetry = async (url, options, timeoutMs = 240000) => {
  const delays = [2000, 5000, 8000]; 
  for (let i = 0; i < delays.length; i++) {
    const userSignal = options.signal;
    
    if (userSignal && userSignal.aborted) {
      throw new Error("USER_CANCEL");
    }

    const timeoutController = new AbortController();
    const id = setTimeout(() => timeoutController.abort(), timeoutMs);
    
    const abortHandler = () => timeoutController.abort();
    if (userSignal) userSignal.addEventListener('abort', abortHandler);

    try {
      const response = await fetch(url, { ...options, signal: timeoutController.signal });
      clearTimeout(id);
      if (userSignal) userSignal.removeEventListener('abort', abortHandler);
      
      if (!response.ok) {
        let errorDetail = `Status: ${response.status}`;
        try {
           const errorData = await response.json();
           if (errorData.error && errorData.error.message) {
             errorDetail = errorData.error.message;
           }
        } catch(e) {}
        throw new Error(errorDetail);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(id);
      if (userSignal) userSignal.removeEventListener('abort', abortHandler);
      
      if (userSignal && userSignal.aborted) {
         throw new Error("USER_CANCEL");
      }
      
      if (i === delays.length - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0); 
  const [showExportModal, setShowExportModal] = useState(false); 
  const [showInfoModal, setShowInfoModal] = useState(true); 
  const [activeTab, setActiveTab] = useState('form'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [apiError, setApiError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [copiedBab, setCopiedBab] = useState(null); 
  
  // --- State API Key ---
  const apikey = import.meta.env.VITE_GR0Q_API_KEY;

  // --- State Revisi ---
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState('bab1');
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [revisionFile, setRevisionFile] = useState(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    judul: '',
    nama: '',
    nim: '',
    universitas: 'STIH Jenderal Sudirman',
    prodi: 'Ilmu Hukum', 
    tahun: new Date().getFullYear().toString(),
    metode: 'Yuridis Normatif',
    rumusanMasalah: '',
  });

  const [content, setContent] = useState({
    cover: '',
    bab1: '',
    bab2: '',
    bab3: '',
    bab4: '',
    bab5: '',
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1000) {
        setCanvasScale((width - 40) / 850);
      } else {
        setCanvasScale(1);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadingMessages = [
    "Mengekstrak isu hukum...",
    "Merumuskan research gap...",
    "Mengkonstruksi pisau analisis teoritik...",
    "Mengekstrapolasi temuan dengan teori...",
    "Menyusun argumentasi akademik...",
    "Menarik kesimpulan doktrinal...",
    "Menerapkan format penulisan skripsi...",
    "Menyelaraskan bahasa baku hukum...",
    "Menyempurnakan hasil akhir..."
  ];

  useEffect(() => {
    let interval;
    if (isGenerating) {
      setLoadingTextIndex(0);
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, loadingMessages.length]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', 'current');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.formData) setFormData(data.formData);
        if (data.content) setContent(prev => ({ ...prev, ...data.content }));
      }
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  const saveDraft = async (updatedContent) => {
    if (!user) return;
    setSaveStatus('Menyimpan...');
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', 'current');
      await setDoc(docRef, { formData, content: updatedContent, lastUpdated: new Date().toISOString() }, { merge: true });
      setSaveStatus('Tersimpan');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error("Save Error:", err);
      setSaveStatus('Gagal menyimpan');
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files[0]) setRevisionFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files && e.target.files[0]) setRevisionFile(e.target.files[0]); };

  const getParagraphRules = (targetBab) => {
    switch(targetBab) {
      case 'bab1': 
        return 'ATURAN PARAGRAF MUTLAK: Khusus sub-bab 1.1 Latar Belakang -> WAJIB buat TEPAT 15 PARAGRAF. SETIAP paragraf harus dibatasi 4-5 kalimat saja agar tidak menggumpal. Untuk sub-bab 1.2, 1.3, 1.4 gunakan 3-6 paragraf.';
      case 'bab2': 
        return 'ATURAN PARAGRAF MUTLAK BAB 2: Anda WAJIB membuat TEPAT 4 SUB-BAB (yaitu 2.1, 2.2, 2.3, dan 2.4). UNTUK SETIAP SUB-BAB, Anda WAJIB menulis TEPAT 8 PARAGRAF. Di dalam SETIAP paragraf, WAJIB berisi tepat 6 sampai 7 kalimat. Pastikan naskah tuntas dan tidak terpotong di akhir!';
      case 'bab3': 
        return 'ATURAN PARAGRAF KHUSUS BAB 3: Khusus sub-bab 3.3 (Lokasi) WAJIB terdiri dari TEPAT 4 PARAGRAF, setiap paragraf 5-6 kalimat. Sub-bab 3.4 (Pengumpulan Data) WAJIB 5 paragraf pengantar + penjabaran sumber primer/sekunder + 5 paragraf teknik pengambilan data, di mana tiap paragrafnya wajib berisi 5-6 kalimat. Sub-bab lain proporsional.';
      case 'bab4': 
        return 'ATURAN PARAGRAF MUTLAK BAB 4: Anda WAJIB membuat TEPAT 4 SUB-BAB (yaitu 4.1, 4.2, 4.3, dan 4.4). UNTUK SETIAP SUB-BAB hasil dan pembahasan, Anda WAJIB menulis TEPAT 8 PARAGRAF. Di dalam SETIAP paragraf, WAJIB berisi tepat 6 sampai 7 kalimat. Pastikan naskah tuntas dan tidak terpotong di akhir!';
      case 'bab5': 
        return 'ATURAN PARAGRAF KHUSUS BAB 5: Total keseluruhan sub-bab 5.1 (Kesimpulan) WAJIB TEPAT 8 PARAGRAF. Di dalam 8 paragraf itu, padukan format pengantar dan list penomoran. Setiap paragraf wajib 7-8 kalimat.';
      default: 
        return 'Aturan Paragraf: 3-6 paragraf per sub-bab.';
    }
  };

  const executeAICall = async (promptData, systemData) => {
    const isCustomKey = apiKeyInput.trim() !== '';
    const modelName = isCustomKey ? 'gemini-1.5-flash' : 'gemini-2.5-flash-preview-09-2025';
    const apiKey = isCustomKey ? apiKeyInput.trim() : '';

    abortControllerRef.current = new AbortController();

    const result = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortControllerRef.current.signal, 
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: promptData }] }],
        systemInstruction: { parts: [{ text: systemData }] },
        generationConfig: {
          maxOutputTokens: 8192, 
          temperature: 0.7
        }
      })
    }, 240000);
    
    let text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim() === '') {
      throw new Error("AI gagal men-generate teks. Respons kosong diterima.");
    }
    return text.replace(/```html|```/gi, '').trim();
  };

  const handleAIError = (e) => {
    if (abortControllerRef.current?.signal?.aborted || e.message === "USER_CANCEL") return; 
    console.error("Error generating content:", e);
    
    if (e.name === 'AbortError' || e.message.includes('timeout') || e.message.includes('Failed to fetch')) {
      setApiError("Timeout Koneksi: Sistem batas waktu memutus proses karena naskah terlalu panjang. Silakan coba klik 'Generate/Revisi' sekali lagi.");
    } else if (e.message.includes('429') || e.message.includes('quota')) {
      setApiError("Server AI sedang sibuk memproses banyak permintaan. Mohon tunggu 30 detik lalu coba lagi.");
    } else {
      setApiError(`Gagal memproses naskah: ${e.message}.`);
    }
  };

  // --- GENERATOR LOGIC ---
  const generateAI = async (target) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setApiError(null);

    const penalaran = formData.metode === 'Yuridis Normatif' 
      ? 'DEDUKTIF (beranjak dari norma, asas, doktrin, atau aturan hukum positif ke pemecahan masalah/isu hukum konkrit)' 
      : 'INDUKTIF/CAMPURAN (mengkaji bekerjanya hukum di masyarakat secara empiris/sosiologis, lalu ditarik maknanya dalam konteks teori hukum)';
    
    const paragraphRule = getParagraphRules(target);

    let specificPrompt = "";
    
    switch(target) {
      case 'bab1': 
        specificPrompt = `Tulis BAB I – Pendahuluan Skripsi Ilmu Hukum. Struktur:\n<h1>BAB I PENDAHULUAN</h1>\n<h2>1.1 Latar Belakang</h2>: Uraikan isu hukum (legal issue) atau urgensi dari judul "${formData.judul}" menggunakan penalaran hukum ${penalaran}. WAJIB memasukkan "RESEARCH GAP" (kesenjangan antara teori/aturan/das sollen dengan praktik/das sein, atau kekosongan hukum/norma) secara eksplisit dan mendalam sebagai landasan mengapa penelitian ini harus dilakukan.\n<h2>1.2 Rumusan Masalah</h2>: "${formData.rumusanMasalah}".\n<h2>1.3 Tujuan Penelitian</h2>: Harus sinkron dengan rumusan masalah.\n<h2>1.4 Kontribusi Penelitian</h2>: a) Teoritis (bagi pengembangan ilmu hukum), b) Praktis (bagi pembuat undang-undang/penegak hukum/masyarakat).`; 
        break;
      
      case 'bab2': 
        specificPrompt = `Tulis BAB II – Tinjauan Pustaka Skripsi Ilmu Hukum. Struktur:\n<h1>BAB II TINJAUAN PUSTAKA</h1>\nINSTRUKSI MUTLAK: BAB ini WAJIB berisi kajian kepustakaan dan landasan teoretik yang relevan dengan judul "${formData.judul}". Di dalamnya WAJIB diuraikan tentang konsep-konsep maupun uraian tentang dasar hukum (peraturan perundang-undangan) yang digunakan.\n\nPENTING: Konstruksikan teori, konsep, dan dasar hukum ini sedemikian rupa agar nantinya berfungsi mutlak sebagai pisau analisis untuk membahas, menganalisis, dan mengkonfirmasi (ekstrapolasi) hasil/temuan data di BAB IV.\n\nBagi BAB ini ke dalam TEPAT 4 sub-bab (2.1, 2.2, 2.3, dan 2.4). PERINGATAN: Tulis LENGKAP 8 paragraf untuk SETIAP sub-bab tanpa memotong naskah.`; 
        break;
      
      case 'bab3': 
        const bab3Structure = formData.metode === 'Yuridis Normatif'
          ? `3.1 Pendekatan Penelitian (Sebutkan bahwa ini bersifat Yuridis Normatif, dan dikaji berdasarkan salah satu/beberapa dari: Aturan Hukum, Konsep/Teori Hukum, Sejarah Hukum, Perbandingan Hukum, atau Politik Hukum)\n3.2 Sifat Penelitian (Sebutkan bersifat Eksploratoris / Eksplanatif-evaluatif)\n3.3 Lokasi Penelitian (Sebutkan bahwa sifatnya fakultatif/kepustakaan, jika ada instansi terkait sebutkan seperlunya)\n3.4 Metode Pengumpulan Data (Fokus pada studi dokumen/kepustakaan yang terdiri dari bahan hukum primer, sekunder, tersier)\n3.5 Model Analisis Data (Analisis kualitatif/deduktif terhadap bahan hukum).`
          : `3.1 Pendekatan Penelitian (Sebutkan bahwa ini bersifat Yuridis Empirik/Sosiologis, dan dikaji berdasarkan: Sosiologi Hukum, Antropologi Hukum, Psikologi Hukum, atau Politik Hukum)\n3.2 Sifat Penelitian (Sebutkan bersifat Eksploratoris / Deskriptif analitis / Eksplanatoris)\n3.3 Lokasi Penelitian (WAJIB diuraikan lokasi spesifik masyarakat/instansi tempat pengambilan data empiris)\n3.4 Metode Pengumpulan Data (Fokus pada data primer lapangan seperti wawancara, kuesioner, observasi, dilengkapi data sekunder)\n3.5 Model Analisis Data (Analisis kualitatif/induktif atas temuan lapangan).`;
        
        specificPrompt = `Tulis BAB III – Metode Penelitian Hukum. Struktur:\n<h1>BAB III METODE PENELITIAN</h1>\nPenelitian ini menggunakan jenis penelitian ${formData.metode}. Anda WAJIB membagi dan menjelaskan struktur berikut persis urutannya (dari 3.1 sampai 3.5):\n${bab3Structure}`; 
        break;
      
      case 'bab4': 
        const bab4Extra = formData.metode === 'Yuridis Normatif'
          ? "Sisipkan 5-8 kutipan rujukan hukum/doktrin sebagai pisau bedah analisis. WAJIB buat minimal 2 Tabel (misal: tabel inventarisasi aturan, atau rekapitulasi konsep hukum)."
          : "Sisipkan 5-8 kutipan wawancara naratif langsung dengan informan simulasi. WAJIB buat minimal 2 Tabel (misal: tabel rekapitulasi temuan lapangan).";

        specificPrompt = `Tulis BAB IV – Hasil Penelitian dan Pembahasan. Struktur:\n<h1>BAB IV HASIL PENELITIAN DAN PEMBAHASAN</h1>\nMetode Penelitian: ${formData.metode}.\n\nINSTRUKSI MUTLAK (SESUAI PEDOMAN BUKU PANDUAN): Hasil/temuan penelitian simulasi yang Anda buat untuk menjawab masalah "${formData.rumusanMasalah}" WAJIB dianalisis, dibahas, dan dikonfirmasikan (diekstrapolasikan) secara mendalam dengan teori, konsep, dan dasar hukum. Hubungkan (ekstrapolasikan) argumen Anda dengan landasan teoretik seolah merujuk pada tinjauan pustaka di BAB II sebelumnya. Pembahasan tanpa ekstrapolasi kajian teoritik dilarang keras, karena mengurangi bobot penelitian!\n\nBagi BAB ini ke dalam TEPAT 4 Sub-Bab (yaitu 4.1, 4.2, 4.3, dan 4.4) agar pembahasan hasil dan analisis teoritiknya mengalir secara natural dan saling berkesinambungan.\n\nINSTRUKSI KHUSUS TAMBAHAN: ${bab4Extra} (Gunakan murni tag HTML <table>).`; 
        break;
      
      case 'bab5': 
        specificPrompt = `Tulis BAB V – Penutup Skripsi Ilmu Hukum. Struktur:\n<h1>BAB V PENUTUP</h1>\n<h2>5.1 Kesimpulan</h2>: Buat penomoran <ol> yang jumlah poinnya SAMA PERSIS dengan jumlah poin di "${formData.rumusanMasalah}". Jawab isu hukum tersebut secara konklusif dan argumentatif.\n<h2>5.2 Saran</h2>: Susun paragraf narasi spesifik (saran perbaikan regulasi, masukan bagi penegak hukum, atau untuk masyarakat).`; 
        break;
    }

    const allowedTags = target === 'bab4' ? 'h1, h2, p, table, thead, tbody, tr, th, td, ul, li, ol, strong, em, br' : 'h1, h2, p, ul, li, ol, strong, em, br'; 
    const systemInstruction = `Anda adalah Dosen Pembimbing Senior Ilmu Hukum. Tulis naskah skripsi Fakultas Hukum Indonesia yang sangat formal, rigid, dan menggunakan terminologi hukum yang tepat (rechtsterminologie).
    Format keluaran WAJIB menggunakan HTML bersih (${allowedTags}). JANGAN gunakan markdown \`\`\`html.
    
    SANGAT PENTING - ATURAN PANJANG NASKAH YANG WAJIB DITURUTI:
    ${paragraphRule}
    
    Pastikan naskah sangat panjang, mendalam, argumentatif, dan terlihat seperti hasil riset Sarjana Hukum (S.H.) yang serius.`;

    try {
      const text = await executeAICall(specificPrompt, systemInstruction);
      const newContent = { ...content, [target]: text };
      setContent(newContent);
      await saveDraft(newContent);
      setActiveTab('editor');
      setTimeout(() => document.getElementById(`section-${target}`)?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (e) {
      handleAIError(e);
    } finally {
      if (!abortControllerRef.current?.signal?.aborted) setIsGenerating(false);
    }
  };

  // --- Fungsi Revisi AI ---
  const handleRevisiAI = async () => {
    if (!revisionPrompt && !revisionFile) {
      setApiError("Mohon masukkan instruksi prompt revisi atau unggah file referensi.");
      return;
    }
    
    setShowRevisionModal(false);
    setIsGenerating(true);
    setApiError(null);

    let fileContentStr = "";
    if (revisionFile) {
      try {
        fileContentStr = await revisionFile.text();
      } catch (error) {
        fileContentStr = `[File terlampir: ${revisionFile.name}. Harap perhatikan konteks dari nama file ini jika relevan]`;
      }
    }

    const currentDraft = content[revisionTarget] || "(Naskah bab ini masih kosong. Tolong buatkan dari awal sesuai instruksi revisi ini.)";
    const allowedTags = revisionTarget === 'bab4' ? 'h1, h2, p, table, thead, tbody, tr, th, td, ul, li, ol, strong, em, br, b, i' : 'h1, h2, p, ul, li, ol, strong, em, br, b, i';
    const paragraphRule = getParagraphRules(revisionTarget);

    const systemInstruction = `Anda adalah Dosen Pembimbing Senior Ilmu Hukum yang sedang MEREVISI naskah skripsi mahasiswa bimbingan Anda.
    Format keluaran WAJIB menggunakan HTML bersih (${allowedTags}). JANGAN gunakan markdown \`\`\`html.
    
    SANGAT PENTING - ATURAN PANJANG NASKAH:
    ${paragraphRule}
    
    Anda DILARANG KERAS menyingkat atau memotong naskah. Hasil revisi WAJIB mematuhi aturan jumlah paragraf dan kalimat di atas, meskipun Anda melakukan perubahan. Jika naskah saat ini terlalu pendek, Anda WAJIB memperpanjang dan mengembangkannya dengan teori/argumen hukum hingga memenuhi syarat tersebut!`;

    const specificPrompt = `Target Revisi: ${revisionTarget.toUpperCase()} dari Skripsi Hukum berjudul "${formData.judul}".
    
INSTRUKSI REVISI DARI MAHASISWA:
"${revisionPrompt}"

${fileContentStr ? `\nREFERENSI/FILE TAMBAHAN:\n---\n${fileContentStr}\n---\n` : ''}

DRAFT NASKAH SAAT INI (Yang Perlu Direvisi):
---
${currentDraft}
---

TUGAS ANDA:
1. Tulis ulang draft naskah di atas dengan MENERAPKAN instruksi revisi dari mahasiswa secara menyeluruh, perbaiki logika hukumnya jika perlu.
2. PASTIKAN hasil revisi Anda KEMBALI MENGGUNAKAN ATURAN JUMLAH PARAGRAF yang ditetapkan di instruksi sistem. Jangan sampai memendek!
3. LANGSUNG BERIKAN HASIL BERUPA KODE HTML. Jangan tambahkan teks pengantar atau penutup apapun karena sistem hanya dapat merender struktur tag HTML murni.`;

    try {
      const text = await executeAICall(specificPrompt, systemInstruction);
      const newContent = { ...content, [revisionTarget]: text };
      setContent(newContent);
      await saveDraft(newContent);
      setActiveTab('editor');
      setTimeout(() => document.getElementById(`section-${revisionTarget}`)?.scrollIntoView({ behavior: 'smooth' }), 500);
      
      setRevisionPrompt('');
      setRevisionFile(null);
    } catch (e) {
      handleAIError(e);
    } finally {
      if (!abortControllerRef.current?.signal?.aborted) setIsGenerating(false);
    }
  };

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsGenerating(false);
    setApiError(null);
  };

  const handleCopyChapter = (babId) => {
    const rawHtml = content[babId] || `<h1 style="text-align: center;">BAB ${babId.replace('bab', '')}</h1><p>(Konten kosong)</p>`;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    const cleanHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: black; background: white;">${tempDiv.innerHTML}</body></html>`;
    const plainText = tempDiv.innerText;

    const copyListener = (e) => {
      e.preventDefault();
      e.clipboardData.setData('text/html', cleanHtml);
      e.clipboardData.setData('text/plain', plainText);
    };

    const dummy = document.createElement('span');
    dummy.textContent = 'copy-trigger';
    dummy.style.position = 'absolute';
    dummy.style.opacity = '0';
    document.body.appendChild(dummy);
    
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(dummy);
    selection.removeAllRanges();
    selection.addRange(range);

    document.addEventListener('copy', copyListener);
    try {
      document.execCommand('copy');
      setCopiedBab(babId);
      setTimeout(() => setCopiedBab(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
      setApiError("Browser tidak mendukung salin otomatis. Silakan block teks manual lalu salin.");
    } finally {
      document.removeEventListener('copy', copyListener);
      selection.removeAllRanges();
      document.body.removeChild(dummy);
    }
  };

  const handleExportWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${formData.judul || 'Skripsi'}</title><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><style>@page WordSection1 { size: 8.27in 11.69in; margin: 1.575in 1.181in 1.181in 1.378in; mso-header-margin: 0.5in; mso-footer-margin: 0.5in; mso-paper-source: 0; } div.WordSection1 { page: WordSection1; } body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: black; } h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 24pt; } h2 { text-align: left; font-size: 12pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; } p { text-indent: 1.25cm; margin-bottom: 12pt; text-align: justify; } table { width: 100%; border-collapse: collapse; margin: 24pt 0; } th, td { border: 1px solid black; padding: 8pt; text-align: left; vertical-align: top; } th { background-color: #f2f2f2; font-weight: bold; text-align: center; } ul, ol { padding-left: 2cm; margin-bottom: 12pt; text-align: justify; } li { margin-bottom: 6pt; text-align: justify;}</style></head><body><div class="WordSection1">`;
    const coverHtml = `<div style="text-align: center; text-transform: uppercase; margin-top: 50pt;"><h1 style="font-size: 16pt; margin-bottom: 100pt;">${formData.judul || "JUDUL SKRIPSI ANDA"}</h1><p style="font-weight: bold; font-size: 14pt; letter-spacing: 4pt; margin-bottom: 100pt; text-align: center;">SKRIPSI</p><p style="font-size: 12pt; font-weight: bold; margin-bottom: 20pt; text-align: center;">Oleh:</p><p style="font-weight: bold; font-size: 14pt; text-decoration: underline; margin-bottom: 20pt; text-align: center;">${formData.nama || "NAMA MAHASISWA"}</p><p style="font-size: 12pt; margin-bottom: 100pt; text-align: center;">NIM: ${formData.nim || "NOMOR INDUK"}</p><p style="font-weight: bold; font-size: 14pt; margin-bottom: 10pt; text-align: center;">${formData.universitas || "NAMA INSTITUSI"}</p><p style="font-weight: bold; font-size: 14pt; text-align: center;">${formData.tahun}</p></div><br clear="all" style="mso-special-character:line-break;page-break-before:always" />`;
    const chaptersHtml = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].map((bab, i) => { let babContent = content[bab] || `<h1 style="text-align: center;">BAB ${['I','II','III','IV','V'][i]}</h1><p style="text-align: center; color: #999;">(Konten bab belum di-generate)</p>`; return `<div>${babContent}</div>` + (i < 4 ? '<br clear="all" style="mso-special-character:line-break;page-break-before:always" />' : ''); }).join('');
    const footer = `</div></body></html>`;
    const fullHtml = header + coverHtml + chaptersHtml + footer;
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formData.judul ? formData.judul.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : 'Draft_Skripsi_Hukum'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const handlePrintBrowser = () => {
    setShowExportModal(false);
    setTimeout(() => { window.print(); }, 300);
  };

  const isFormValid = formData.judul.trim() !== '' && formData.rumusanMasalah.trim() !== '' && formData.prodi.trim() !== '';

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] font-sans text-[#0F172A] overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .thesis-page { width: 210mm; min-height: 297mm; padding: 4cm 3cm 3cm 3.5cm; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0,0,0,0.05); font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; margin: 0 auto; position: relative; border-radius: 4px; }
        .thesis-page h1 { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin-bottom: 3rem; color: black; display: block; }
        .thesis-page h2 { text-align: left; font-weight: bold; font-size: 12pt; margin: 1.8rem 0 1rem 0; color: black; display: block; }
        .thesis-page p { text-indent: 1.25cm; margin-bottom: 1.2rem; text-align: justify; color: #111; display: block; }
        .thesis-page ul, .thesis-page ol { padding-left: 2cm; margin-bottom: 1.2rem; color: #111; text-align: justify; }
        .thesis-page li { margin-bottom: 0.5rem; text-align: justify; }
        .thesis-page [contenteditable]:empty:before { content: attr(placeholder); color: #ccc; font-style: italic; display: block; text-align: center; margin-top: 2rem; }
        .thesis-page table { width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 11pt; color: black; }
        .thesis-page th, .thesis-page td { border: 1px solid black; padding: 10px; text-align: left; vertical-align: top; }
        .thesis-page th { background-color: #f8fafc; font-weight: bold; text-align: center; }
        .thesis-page tr:nth-child(even) { background-color: #fcfcfc; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes progress-linear { 0% { width: 0%; } 100% { width: 95%; } }
        .animate-progress-linear { animation: progress-linear 60s linear forwards; }
        @media print {
          body { background: white; }
          header, aside, .no-print, .floating-action-bar, .modal-overlay, .error-banner, .blur-backdrop { display: none !important; }
          main { overflow: visible !important; }
          #pdf-workspace { transform: none !important; margin: 0 !important; padding: 0 !important; width: 100%; }
          .thesis-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; page-break-after: always; }
          @page { margin: 4cm 3cm 3cm 3.5cm; }
        }
      `}</style>

      {apiError && (
        <div className="error-banner bg-rose-500 text-white px-4 py-3.5 flex items-start sm:items-center justify-between gap-3 text-sm z-[100] relative shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-full shrink-0"><AlertCircle size={20} /></div>
            <span className="font-medium leading-snug tracking-wide">{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="shrink-0 hover:bg-rose-600 rounded-full p-1.5 transition-colors"><X size={16}/></button>
        </div>
      )}

      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#EAEAEA] flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-sm"><Scale size={18} /></div>
          <h1 className="font-bold text-sm tracking-tight text-[#0F172A]">Skripsi AI Hukum</h1>
        </div>

        <nav className="hidden md:flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
           <button onClick={() => setActiveTab('form')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'form' ? 'bg-white text-black shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>Konfigurasi</button>
           <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'editor' ? 'bg-white text-black shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>Editor & Print</button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setShowRevisionModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
            <FileEdit size={14}/> <span className="hidden sm:inline">Revisi</span>
          </button>

          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold text-white bg-black hover:bg-gray-800 transition-all shadow-sm">
            <Download size={14}/> <span className="hidden sm:inline">Ekspor</span>
          </button>
          
          <button className="p-2 lg:hidden text-[#64748B] hover:text-black hover:bg-gray-100 rounded-md transition-all" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </header>

      {isSidebarOpen && <div className="blur-backdrop fixed inset-0 bg-black/30 backdrop-blur-sm z-[40] lg:hidden animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`fixed inset-y-0 left-0 z-[50] w-72 bg-white border-r border-[#EAEAEA] transition-transform duration-300 flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-64 ${activeTab === 'editor' ? 'lg:flex' : 'lg:hidden'}`}>
          <div className="p-4 h-full flex flex-col pt-6 lg:pt-4">
            <div className="flex flex-col gap-1 px-2 pb-5 mb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Save size={16} className="text-indigo-600" /><h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Status Draft</h3></div>
                <button className="lg:hidden text-gray-400 hover:text-red-500" onClick={() => setIsSidebarOpen(false)}><X size={18}/></button>
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
               {[
                 { id: 'cover', label: 'Halaman Sampul', icon: <FileText size={16}/> },
                 { id: 'bab1', label: 'Bab I: Pendahuluan', icon: <FileSearch size={16}/> },
                 { id: 'bab2', label: 'Bab II: Pustaka', icon: <BookOpen size={16}/> },
                 { id: 'bab3', label: 'Bab III: Metodologi', icon: <Layout size={16}/> },
                 { id: 'bab4', label: 'Bab IV: Hasil Penelitian', icon: <Sparkles size={16}/> },
                 { id: 'bab5', label: 'Bab V: Penutup', icon: <StickyNote size={16}/> }
               ].map((item) => {
                 const isFilled = content[item.id] && content[item.id].trim() !== '';
                 return (
                   <button key={item.id} onClick={() => { setActiveTab('editor'); setTimeout(() => { document.getElementById(`section-${item.id}`)?.scrollIntoView({ behavior: 'smooth' }); }, 100); setIsSidebarOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] rounded-xl transition-all group">
                     <div className="flex items-center gap-3"><span className={`${isFilled ? 'text-indigo-500' : 'text-[#CBD5E1]'} group-hover:text-[#0F172A] transition-colors`}>{item.icon}</span>{item.label}</div>
                     {isFilled ? <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"><CheckCircle2 size={12}/> OK</div> : <div className="text-[10px] font-medium text-[#94A3B8] bg-[#F1F5F9] px-2 py-1 rounded-md border border-[#E2E8F0]">-</div>}
                   </button>
                 );
               })}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {activeTab === 'form' ? (
            <div className="max-w-5xl mx-auto p-6 md:p-10 pb-32 animate-in fade-in duration-500 flex flex-col min-h-full">
               <div className="mb-10 text-center">
                 <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] mb-3">Persiapan Skripsi</h2>
                 <p className="text-[#64748B] max-w-xl mx-auto text-sm">Lengkapi detail penelitian Anda di bawah ini. Generator AI akan menyusun skripsi dengan pedoman penulisan Ilmu Hukum.</p>
               </div>

               <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-sm p-1 mb-8">
                 <div className="bg-[#FAFAFA] rounded-[20px] p-6 md:p-10 border border-[#F1F5F9]">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">1</div>
                       <h3 className="text-lg font-bold text-[#0F172A]">Informasi Dasar & Metodologi</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#64748B]">Judul Skripsi</label>
                          <textarea className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium resize-none shadow-sm" rows={3} placeholder="Contoh: Tinjauan Yuridis Terhadap Tindak Pidana..." value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#64748B]">Nama Mahasiswa</label>
                            <input placeholder="Nama Lengkap" className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#64748B]">NIM</label>
                            <input placeholder="Nomor Induk" className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm" value={formData.nim} onChange={e => setFormData({...formData, nim: e.target.value})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#64748B]">Universitas</label>
                            <input placeholder="Nama Institusi" className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm" value={formData.universitas} onChange={e => setFormData({...formData, universitas: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#64748B]">Program Studi</label>
                            <input placeholder="Cth: Ilmu Hukum" className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm" value={formData.prodi} onChange={e => setFormData({...formData, prodi: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#64748B]">Metode Penelitian (Ilmu Hukum)</label>
                          <div className="relative">
                            <select className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm appearance-none cursor-pointer font-semibold text-indigo-900" value={formData.metode} onChange={e => setFormData({...formData, metode: e.target.value})}>
                              <option value="Yuridis Normatif">Yuridis Normatif (Kepustakaan)</option>
                              <option value="Yuridis Empiris">Yuridis Empiris / Sosiologis (Lapangan)</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"/>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="space-y-1.5 h-full flex flex-col">
                          <label className="text-xs font-semibold text-[#64748B] flex justify-between">Rumusan Masalah <span className="text-[#94A3B8] font-normal">*Wajib diisi</span></label>
                          <textarea placeholder="1. Bagaimana pengaturan hukum mengenai... &#10;2. Bagaimana penegakan hukum dalam kasus..." className="w-full flex-1 px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none text-sm leading-relaxed shadow-sm min-h-[180px]" value={formData.rumusanMasalah} onChange={e => setFormData({...formData, rumusanMasalah: e.target.value})} />
                        </div>
                      </div>
                    </div>
                 </div>
               </div>

               <div className="bg-indigo-50/40 rounded-[20px] p-6 md:p-8 border border-indigo-100 mb-12 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                     <h3 className="text-lg font-bold text-indigo-900">Kunci API Gemini <span className="text-sm font-normal text-indigo-700/70">(Wajib Jika Akses dari HP/Vercel)</span></h3>
                  </div>
                  <p className="text-xs text-indigo-800/80 mb-4 ml-11 max-w-3xl leading-relaxed">
                    Karena Anda menjalankan aplikasi ini di luar environment Canvas, Anda membutuhkan kunci API dari Google. Silakan dapatkan gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-bold underline hover:text-indigo-600 transition-colors">Google AI Studio</a>, lalu tempelkan kodenya di bawah.
                  </p>
                  <div className="ml-11 relative">
                    <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                    <input 
                      type="password" 
                      placeholder="Paste API Key Anda di sini (Contoh: AIzaSyBw...)" 
                      className="w-full pl-11 pr-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium shadow-sm"
                      value={apiKeyInput}
                      onChange={e => {
                          setApiKeyInput(e.target.value);
                          if (typeof window !== 'undefined') localStorage.setItem('gemini_api_key', e.target.value);
                      }}
                    />
                  </div>
               </div>

               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-sm font-bold border border-[#E2E8F0]">3</div>
                     <h3 className="text-lg font-bold text-[#0F172A]">Generator Konten AI</h3>
                     {!isFormValid && <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 hidden sm:inline-block">Isi Judul & Masalah dahulu</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                     {[
                       { id: 'bab1', title: 'Bab I', label: 'Pendahuluan', sub: 'Research Gap & Masalah', icon: <FileSearch size={18}/> },
                       { id: 'bab2', title: 'Bab II', label: 'Tinjauan Pustaka', sub: 'Kajian & Dasar Hukum', icon: <BookOpen size={18}/> },
                       { id: 'bab3', title: 'Bab III', label: 'Metode Penelitian', sub: `Penulisan ${formData.metode}`, icon: <Layout size={18}/> },
                       { id: 'bab4', title: 'Bab IV', label: 'Hasil Penelitian', sub: 'Ekstrapolasi & Pembahasan', icon: <Sparkles size={18}/> },
                       { id: 'bab5', title: 'Bab V', label: 'Penutup', sub: 'Kesimpulan Doktrinal', icon: <StickyNote size={18}/> }
                     ].map((b) => (
                       <button key={b.id} onClick={() => generateAI(b.id)} disabled={!isFormValid || isGenerating} className="group relative bg-white border border-[#EAEAEA] p-5 rounded-2xl text-left hover:border-black hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[#EAEAEA] disabled:hover:shadow-none flex flex-col h-full">
                         <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-[#F8FAFC] rounded-lg text-[#64748B] group-hover:text-black group-hover:bg-[#F1F5F9] transition-colors">{b.icon}</div>
                            {content[b.id] ? <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"><CheckCircle2 size={12}/> Selesai</div> : <Wand2 size={14} className="text-[#CBD5E1] group-hover:text-black opacity-0 group-hover:opacity-100 transition-opacity" />}
                         </div>
                         <div className="mt-auto">
                           <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{b.title}</span>
                           <h4 className="font-bold text-sm text-[#0F172A] mt-1 mb-1">{b.label}</h4>
                           <p className="text-xs text-[#64748B] line-clamp-1">{b.sub}</p>
                         </div>
                       </button>
                     ))}
                  </div>
               </div>

               {/* --- Footer Peringatan Jual Beli --- */}
               <div className="mt-16 text-center border-t border-slate-200 pt-6">
                 <p className="text-xs text-slate-500 font-medium">
                   Skripsi AI Hukum © {new Date().getFullYear()} • 
                   <span className="text-rose-600 font-bold ml-1 tracking-wide">GRATIS & DILARANG KERAS DIPERJUALBELIKAN!</span>
                 </p>
                 <p className="text-[11px] text-slate-400 mt-1 max-w-lg mx-auto">
                   Aplikasi ini ditujukan murni sebagai alat bantu edukasi. Komersialisasi dalam bentuk apapun sangat dilarang.
                 </p>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center bg-[#F1F5F9] min-h-full py-12 relative">
               <div className="floating-action-bar fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-black/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 animate-in slide-in-from-bottom-8">
                  <div className="flex items-center gap-1 px-2 border-r border-white/20">
                    <button onClick={() => document.execCommand('bold')} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors" title="Bold"><Bold size={16}/></button>
                    <button onClick={() => document.execCommand('italic')} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors" title="Italic"><Italic size={16}/></button>
                  </div>
                  <button onClick={() => saveDraft(content)} className="text-xs font-semibold text-white flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-colors relative">
                    <Save size={14}/> Simpan
                    {saveStatus && <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded">{saveStatus}</span>}
                  </button>
                  <button onClick={() => setActiveTab('form')} className="text-xs font-semibold text-black bg-white flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full transition-colors ml-1">
                    <Settings size={14}/> Edit Form
                  </button>
               </div>

               <div id="pdf-workspace" className="origin-top transition-transform pb-40" style={{ transform: `scale(${canvasScale})` }}>
                  <section id="section-cover" className="thesis-page mb-16 animate-in fade-in duration-700">
                     <div className="flex flex-col h-full items-center text-center uppercase">
                       <h1 className="leading-relaxed mt-20 font-bold text-2xl px-12">{formData.judul || "JUDUL SKRIPSI ANDA"}</h1>
                       <div className="font-bold my-20 text-lg tracking-[0.4em]">SKRIPSI</div>
                       <div className="mt-auto space-y-6">
                         <div className="text-sm font-bold tracking-[0.2em]">Oleh:</div>
                         <div className="font-bold underline underline-offset-[16px] text-xl tracking-wider">{formData.nama || "NAMA MAHASISWA"}</div>
                         <div className="text-lg">NIM: {formData.nim || "NOMOR INDUK"}</div>
                       </div>
                       <div className="mt-40 font-bold space-y-2">
                         <div className="text-lg">{formData.universitas || "NAMA INSTITUSI"}</div>
                         <div className="text-xl">{formData.tahun}</div>
                       </div>
                     </div>
                  </section>

                  {['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].map((bab, i) => (
                    <section key={bab} id={`section-${bab}`} className="thesis-page mb-16 relative group">
                       {content[bab] && (
                         <button onClick={() => handleCopyChapter(bab)} title="Salin Bab Ini" className="no-print absolute top-8 right-8 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all z-20 opacity-30 group-hover:opacity-100 transform scale-95 group-hover:scale-100">
                           {copiedBab === bab ? (<><Check size={16} className="text-emerald-500" /><span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">Tersalin</span></>) : (<><Copy size={16} /><span className="text-[11px] font-bold tracking-wide uppercase">Salin Bersih</span></>)}
                         </button>
                       )}
                       <div id={`content-${bab}`} contentEditable suppressContentEditableWarning className="outline-none min-h-full" onBlur={(e) => { const newC = { ...content, [bab]: e.target.innerHTML }; setContent(newC); saveDraft(newC); }} dangerouslySetInnerHTML={{ __html: content[bab] || `<h1 class="text-center">BAB ${['I','II','III','IV','V'][i]}</h1>` }} placeholder={`Konten Bab ${i+1} belum di-generate. Silakan kembali ke konfigurasi.`} />
                    </section>
                  ))}
               </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODAL REVISI --- */}
      {showRevisionModal && (
        <div className="modal-overlay fixed inset-0 z-[600] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 border-b border-[#EAEAEA] flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FileEdit size={20}/></div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-[16px]">Revisi Naskah AI</h3>
                  <p className="text-[11px] font-medium text-[#64748B] mt-0.5">Perbaiki bab spesifik dengan instruksi baru</p>
                </div>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="p-2 bg-white rounded-full text-[#64748B] hover:text-black hover:bg-slate-100 transition-all"><X size={16}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B]">Target Bab yang Direvisi</label>
                <div className="relative">
                  <select className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer" value={revisionTarget} onChange={e => setRevisionTarget(e.target.value)}>
                    <option value="bab1">Bab I - Pendahuluan</option>
                    <option value="bab2">Bab II - Tinjauan Pustaka</option>
                    <option value="bab3">Bab III - Metodologi</option>
                    <option value="bab4">Bab IV - Hasil & Pembahasan</option>
                    <option value="bab5">Bab V - Penutup</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"/>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] flex justify-between items-center">
                  <span>Prompt Instruksi <span className="text-rose-500">*</span></span>
                </label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm leading-relaxed" 
                  rows={4} 
                  placeholder="Misal: Tolong tambahkan referensi doktrin hukum pidana di Latar Belakang ini, dan perluas paragraf tentang asas hukumnya..."
                  value={revisionPrompt} 
                  onChange={e => setRevisionPrompt(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B]">
                  File Referensi Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${revisionFile ? 'border-indigo-500 bg-indigo-50' : 'border-[#CBD5E1] hover:border-indigo-400 hover:bg-slate-50'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input type="file" accept=".txt,.html,.htm" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  
                  {revisionFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600"><FileText size={24}/></div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900">{revisionFile.name}</p>
                        <p className="text-[11px] text-indigo-600/70 mt-0.5">{(revisionFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setRevisionFile(null); }} className="mt-2 text-[11px] font-semibold text-rose-500 hover:text-rose-700 bg-white px-3 py-1 rounded-full border border-rose-100">Hapus File</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#64748B]">
                      <UploadCloud size={28} className="text-[#94A3B8] mb-1"/>
                      <p className="text-sm font-medium"><span className="text-indigo-600 font-semibold">Klik untuk upload</span> atau drag & drop</p>
                      <p className="text-[11px]">Format didukung: .txt (Teks polos)</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
            
            <div className="p-5 border-t border-[#EAEAEA] bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowRevisionModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={handleRevisiAI} disabled={!revisionPrompt && !revisionFile} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2">
                <Wand2 size={14}/> Mulai Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Loading Modal --- */}
      {isGenerating && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/30 backdrop-blur-[4px] animate-in fade-in duration-200 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-7 w-full max-w-[320px] flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="relative w-12 h-12 mb-5">
              <div className="absolute inset-0 border-[2px] border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-[2px] border-indigo-600 rounded-full border-t-transparent border-r-transparent animate-[spin_1s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]"></div>
              <div className="absolute inset-0 flex items-center justify-center"><Scale size={16} className="text-indigo-600 animate-pulse" /></div>
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 tracking-tight mb-1">Menyusun Skripsi</h3>
            <div className="h-5 overflow-hidden w-full mb-5"><span key={loadingTextIndex} className="text-xs font-medium text-slate-500 animate-in slide-in-from-bottom-2 fade-in duration-300 block">{loadingMessages[loadingTextIndex]}</span></div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full animate-progress-linear" style={{animationDuration: '240s'}}></div></div>
            <button onClick={handleCancelGenerate} className="w-full py-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-200 hover:border-rose-200 shadow-sm"><X size={14} /> Batalkan Proses</button>
          </div>
        </div>
      )}

      {/* --- Export Modal --- */}
      {showExportModal && (
        <div className="modal-overlay fixed inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="px-6 py-5 border-b border-[#EAEAEA] flex justify-between items-center bg-[#F8FAFC]">
                 <div><h3 className="font-bold text-[#0F172A] text-lg">Pilih Format Ekspor</h3><p className="text-xs font-medium text-[#64748B] mt-1">Unduh hasil generator AI</p></div>
                 <button onClick={() => setShowExportModal(false)} className="p-2 bg-white rounded-full text-[#64748B] hover:text-black border border-[#EAEAEA] shadow-sm transition-all"><X size={16}/></button>
              </div>
              <div className="p-6 space-y-4">
                 <button onClick={handleExportWord} className="w-full text-left p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex gap-4 group">
                    <div className="w-12 h-12 shrink-0 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform"><FileDown size={24}/></div>
                    <div><h4 className="font-bold text-indigo-900 text-sm">Download MS Word (.doc)</h4><p className="text-xs text-indigo-700/70 mt-1 leading-relaxed"><strong className="text-indigo-800">Direkomendasikan!</strong> Format margin standar sudah diatur.</p></div>
                 </button>
                 <button onClick={handlePrintBrowser} className="w-full text-left p-4 rounded-2xl border border-[#EAEAEA] bg-white hover:bg-[#F8FAFC] transition-all flex gap-4 group">
                    <div className="w-12 h-12 shrink-0 bg-[#F1F5F9] rounded-xl flex items-center justify-center text-[#64748B] group-hover:text-black transition-colors"><Printer size={22}/></div>
                    <div><h4 className="font-bold text-[#0F172A] text-sm">Cetak PDF (Bawaan HP)</h4><p className="text-xs text-[#64748B] mt-1 leading-relaxed">Pilih "Save as PDF" di layar print berikutnya.</p></div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Info Modal (Dengan Peringatan Keras) --- */}
      {showInfoModal && (
        <div className="modal-overlay fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[380px] rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] relative overflow-hidden animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-all z-20"><X size={16} /></button>
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
              <div className="p-6 pt-8 text-center relative z-10">
                 <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-[16px] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300"><Scale size={28} className="text-white" /></div>
                 
                 <h3 className="text-[20px] font-bold text-slate-800 tracking-tight mb-2">Pemberitahuan Penting</h3>
                 <p className="text-slate-500 text-[13px] leading-relaxed mb-4">Tools ini dikalibrasi khusus mengikuti Buku Pedoman Skripsi Fakultas Hukum, khususnya <strong className="text-indigo-600 font-semibold">STIH Jenderal Sudirman Lumajang</strong>.</p>
                 
                 <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mb-6 text-left">
                   <div className="flex gap-2.5 items-start">
                     <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                     <p className="text-[12px] text-rose-700 font-medium leading-relaxed">
                       <strong className="block text-rose-800 mb-0.5 tracking-wide text-[13px]">DILARANG DIPERJUALBELIKAN!</strong>
                       Aplikasi ini murni fasilitas edukasi. Siapapun <strong className="text-rose-800">Dilarang Keras</strong> mengkomersilkan atau menjual alat ini kepada pihak manapun.
                     </p>
                   </div>
                 </div>

                 <button onClick={() => setShowInfoModal(false)} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-[14px] transition-all text-[13px]">Tutup & Lanjutkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;


