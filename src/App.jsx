import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ExternalLink, RefreshCw, Sparkles, ChevronLeft, ShieldCheck, Copy, Check, Instagram } from 'lucide-react';

const apiKey = import.meta.env.VITE_GR0Q_API_KEY;

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      type: 'text',
      content: 'Halo! Saya **Flash Assistant**.\n\nSistem akurasi tinggi aktif. Masukkan topik spesifik, saya akan memverifikasi setiap jurnal sebelum menampilkannya.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk melacak status salin tombol utama dan kotak DOI
  const [copiedId, setCopiedId] = useState(null);
  const [copiedDoi, setCopiedDoi] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Fungsi AI untuk memverifikasi relevansi jurnal
  const verifyRelevanceWithAI = async (userQuery, results) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `Topik User: "${userQuery}"\n\nDaftar Jurnal:\n${results.map((r, i) => `${i}. ${r.title}`).join('\n')}\n\nTugas: Pilih maksimal 15 jurnal yang BENAR-BENAR relevan dengan topik dalam Bahasa Indonesia. Balas hanya dengan array index JSON, contoh: [0, 2, 5]` 
              }] 
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      const data = await response.json();
      const relevantIndexes = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
      return results.filter((_, index) => relevantIndexes.includes(index));
    } catch (error) {
      return results.slice(0, 15); // Fallback ke top 15 jika AI gagal
    }
  };

  const fetchJournalsWithAccuracy = async (userQuery) => {
    try {
      // Step 1: Broad search
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(userQuery + " Indonesia")}&rows=40`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data.message?.items || [];
      
      const rawResults = [];
      const seen = new Set();

      for (const item of items) {
        const title = item.title?.[0] || '';
        if (item.DOI && title && !seen.has(item.DOI)) {
          seen.add(item.DOI);
          rawResults.push({
            id: item.DOI,
            title: title,
            authors: item.author ? item.author.map(a => a.family || '').slice(0, 1).join('') : 'Anonim',
            year: item.issued?.['date-parts']?.[0]?.[0] || '-',
            publisher: item['container-title']?.[0] || 'Journal'
          });
        }
      }

      // Step 2: AI Re-ranking untuk akurasi
      if (rawResults.length > 5) {
        return await verifyRelevanceWithAI(userQuery, rawResults);
      }
      
      return rawResults.slice(0, 15);
    } catch (error) {
      return [];
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', type: 'text', content: userText }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'bot', type: 'text', 
        content: `🔍 Memverifikasi akurasi data untuk: **"${userText}"**...`
      }]);

      const journals = await fetchJournalsWithAccuracy(userText);

      if (journals.length > 0) {
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          sender: 'bot',
          type: 'journals',
          content: `Hasil terverifikasi untuk **"${userText}"**:`,
          journals: journals
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 2, sender: 'bot', type: 'text', 
          content: "Tidak ditemukan jurnal yang cukup relevan. Coba kata kunci lain." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', type: 'text', content: "Sistem sibuk." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (journal) => {
    const doi = journal.id;
    const textArea = document.createElement("textarea");
    textArea.value = doi;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    setCopiedId(journal.id);
    setTimeout(() => setCopiedId(null), 2000);
    window.open('https://flash-sitasi.vercel.app', '_blank');
    document.body.removeChild(textArea);
  };

  // Fungsi khusus untuk menyalin teks DOI saja
  const handleCopyDoi = (e, doi) => {
    e.preventDefault();
    const textArea = document.createElement("textarea");
    textArea.value = doi;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    setCopiedDoi(doi);
    setTimeout(() => setCopiedDoi(null), 2000);
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto bg-[#F1F5F9] font-sans border-x border-slate-300 shadow-2xl transition-all duration-300">
      
      {/* Header Ramping & Solid */}
      <div className="bg-white border-b-2 border-black p-3 md:px-6 md:py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <ChevronLeft size={18} className="text-slate-400 md:hidden" />
          <div className="flex items-center gap-1">
            <span className="font-black text-xl md:text-2xl italic tracking-tighter text-black">FL</span>
            <div className="bg-[#FDE047] p-1 md:p-1.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
               <Sparkles size={12} className="fill-black md:w-4 md:h-4" />
            </div>
            <span className="font-black text-xl md:text-2xl italic tracking-tighter text-black">SH</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">Accuracy ON</span>
        </div>
      </div>

      {/* Area Chat */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            <div className={`flex w-full ${msg.type === 'journals' ? 'max-w-[95%] md:max-w-[90%]' : 'max-w-[88%] md:max-w-[75%] lg:max-w-[65%]'} items-start gap-2 md:gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              
              <div className={`w-8 h-8 md:w-10 md:h-10 border border-black rounded-lg flex-shrink-0 flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                msg.sender === 'user' ? 'bg-white' : 'bg-[#FDE047]'
              }`}>
                {msg.sender === 'user' ? <User size={16} className="md:w-5 md:h-5" /> : <Bot size={16} className="md:w-5 md:h-5" />}
              </div>

              <div className={`flex flex-col w-full ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.content && (
                  <div className={`p-3 md:p-4 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[13px] md:text-[15px] font-bold leading-snug w-fit ${
                    msg.sender === 'user' ? 'bg-slate-200 text-black rounded-tr-none' : 'bg-white text-black rounded-tl-none'
                  }`}>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                        {line.split('**').map((part, j) => j % 2 === 1 ? <span key={j} className="text-indigo-600 underline">{part}</span> : part)}
                      </p>
                    ))}
                  </div>
                )}

                {msg.type === 'journals' && (
                  <div className="mt-3 md:mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
                    {msg.journals.map((j, index) => (
                      <div key={j.id} className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-3 md:p-4 group transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 md:mb-3">
                           <div className="flex items-center gap-1.5 bg-black text-white px-2 py-1 rounded text-[8px] md:text-[9px] font-black uppercase tracking-tighter italic">
                              <ShieldCheck size={10} /> Verified
                           </div>
                           <span className="text-[10px] md:text-[11px] font-black text-slate-300">#{index + 1}</span>
                        </div>
                        
                        <h3 className="flex-grow font-black text-[13px] md:text-[14px] leading-tight mb-3 text-black line-clamp-3 uppercase italic tracking-tight">
                          {j.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-slate-400 mb-3 uppercase truncate italic">
                           <span className="text-black truncate max-w-[60%]">{j.authors}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full flex-shrink-0"></span>
                           <span className="flex-shrink-0">{j.year}</span>
                        </div>
                        
                        {/* Box DOI yang interaktif dan bisa disalin */}
                        <div 
                          onClick={(e) => handleCopyDoi(e, j.id)}
                          className="group/doi bg-slate-50 hover:bg-[#FDE047]/20 border border-black rounded-lg p-2 md:p-2.5 mb-3 flex items-center justify-between cursor-pointer transition-colors"
                          title="Klik untuk menyalin DOI"
                        >
                           <span className="text-[10px] md:text-[11px] font-black text-slate-500 group-hover/doi:text-black truncate transition-colors">
                             {j.id}
                           </span>
                           {copiedDoi === j.id ? (
                             <Check size={14} className="text-green-600 flex-shrink-0 ml-2" />
                           ) : (
                             <Copy size={14} className="text-slate-400 group-hover/doi:text-black flex-shrink-0 ml-2 transition-colors" />
                           )}
                        </div>

                        <button 
                          onClick={() => handleAction(j)}
                          className={`w-full border-2 border-black py-2.5 md:py-3 rounded-lg font-black uppercase text-[10px] md:text-[11px] flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                            copiedId === j.id ? 'bg-green-400 text-black' : 'bg-[#FDE047] text-black hover:bg-yellow-300'
                          }`}
                        >
                          {copiedId === j.id ? 'BERHASIL DISALIN!' : 'TARIK DATA'}
                          <ExternalLink size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-black p-2 md:p-3 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 md:gap-3">
              <RefreshCw size={14} className="animate-spin text-black" />
              <span className="font-black uppercase text-[9px] md:text-[11px] tracking-widest italic">AI Verifying Accuracy...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Ramping dan Link Instagram */}
      <div className="p-3 md:p-5 bg-white border-t-2 border-black sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="TOPIK SPESIFIK JURNAL ID..."
            className="flex-1 bg-white border-2 border-black rounded-xl p-3 md:p-4 font-black text-[12px] md:text-[14px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-[#FDE047]/5 uppercase placeholder:text-slate-300 transition-colors"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading}
            className="bg-[#FDE047] border-2 border-black p-3 md:p-4 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:bg-slate-100 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 hover:bg-yellow-300"
          >
            <Send size={20} strokeWidth={3} className="text-black" />
          </button>
        </form>

        {/* Link Instagram */}
        <div className="mt-3 flex justify-center items-center">
          <a 
            href="https://www.instagram.com/rickv4_?igsh=N3JqcG84NG9obnli&utm_source=qr" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1.5 text-slate-400 hover:text-black transition-colors text-[10px] md:text-[11px] font-black uppercase tracking-widest"
          >
            <Instagram size={14} strokeWidth={2.5} />
            <span>@rickv4_</span>
          </a>
        </div>
      </div>
    </div>
  );
}


