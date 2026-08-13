import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { HomeTab } from "./components/HomeTab";
import { PlaylistTab } from "./components/PlaylistTab";
import { VocabularyTab } from "./components/VocabularyTab";
import { WritingTestTab } from "./components/WritingTestTab";
import { SettingsTab } from "./components/SettingsTab";
import { StatisticsTab } from "./components/StatisticsTab";
import { VocabularyItem, AppSettings } from "./types";
import { getExpandedVocabularies } from "../server/vocabularies";

const DEFAULT_SETTINGS: AppSettings = {
  interval_minutes: 3,
  delay_before_translation: 3,
  voice_de: "de-DE-KillianNeural",
  voice_vi: "vi-VN-HoaiMyNeural",
  volume: 80,
  speech_rate: 0.75,
  random_mode: true,
  playback_mode: "German   Vietnamese"
};

// Hàm gán tên Chủ đề cố định vĩnh viễn dựa trên ID từ vựng (tối đa 20 từ / chủ đề)
const applyFixedCategories = (items: VocabularyItem[], chunkSize = 20): VocabularyItem[] => {
  if (!items || items.length === 0) return [];

  // 1. Sắp xếp theo ID tăng dần để thứ tự phân chia LUÔN CỐ ĐỊNH 100%
  const sortedItems = [...items].sort((a, b) => a.id - b.id);

  // 2. Gom nhóm theo tên Chủ đề gốc (loại bỏ đuôi "- Chủ đề X" nếu có)
  const grouped: Record<string, VocabularyItem[]> = {};

  sortedItems.forEach((item) => {
    const baseCategory = (item.category || "General")
      .replace(/\s*-\s*Chủ đề\s*\d+/gi, "")
      .trim();

    if (!grouped[baseCategory]) {
      grouped[baseCategory] = [];
    }
    grouped[baseCategory].push({ ...item, category: baseCategory });
  });

  // 3. Phân chia tối đa 20 từ / chủ đề nhỏ
  const fixedResult: VocabularyItem[] = [];

  Object.entries(grouped).forEach(([baseCat, catItems]) => {
    if (catItems.length <= chunkSize) {
      fixedResult.push(...catItems);
    } else {
      for (let i = 0; i < catItems.length; i += chunkSize) {
        const partIndex = Math.floor(i / chunkSize) + 1;
        const chunk = catItems.slice(i, i + chunkSize);
        const fixedCategoryName = `${baseCat} - Chủ đề ${partIndex}`;

        chunk.forEach((item) => {
          fixedResult.push({ ...item, category: fixedCategoryName });
        });
      }
    }
  });

  return fixedResult;
};

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  
  // Load và chuẩn hóa cố định danh sách từ vựng từ LocalStorage hoặc Seed list
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>(() => {
    const saved = localStorage.getItem("df_vocabularies");
    let initialList: VocabularyItem[] = [];

    if (saved) {
      try { 
        initialList = JSON.parse(saved); 
      } catch (e) {}
    }

    if (initialList.length === 0) {
      const rawSeedList = getExpandedVocabularies();
      initialList = rawSeedList.map((item, index) => ({
        id: index + 1,
        word: item.word,
        article: item.article,
        meaning: item.meaning,
        example_de: item.example_de,
        example_vi: item.example_vi,
        level: item.level,
        category: item.category,
        favorite: index % 5 === 0,
        review_count: 0,
        created_at: new Date().toISOString().split("T")[0]
      }));
    }

    return applyFixedCategories(initialList, 20);
  });

  // Load Settings từ LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("df_settings");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  const [selectedLevel, setSelectedLevel] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");

  // Tự động lưu những thay đổi vào LocalStorage
  useEffect(() => {
    localStorage.setItem("df_vocabularies", JSON.stringify(vocabularies));
  }, [vocabularies]);

  useEffect(() => {
    localStorage.setItem("df_settings", JSON.stringify(settings));
  }, [settings]);

  // Playback Control State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyItem | null>(null);
  const [statusText, setStatusText] = useState("SẴN SÀNG");
  const [statusColor, setStatusColor] = useState("text-sky-400");
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const recentIdsRef = useRef<number[]>([]);
  const settingsRef = useRef<AppSettings>(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSequenceRunningRef = useRef<boolean>(false);

  // Audio Player Engine
  const speakText = (
    text: string,
    lang: string,
    wordInfo?: VocabularyItem,
    customRate?: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!text || !text.trim()) { resolve(); return; }
      const currentSettings = settingsRef.current;
      const langCode = lang.split("-")[0].toLowerCase();
      const targetVoice = langCode === "de" ? currentSettings.voice_de : currentSettings.voice_vi;
      const effectiveRate = customRate !== undefined ? customRate : (currentSettings.speech_rate || 0.75);

      const estimatedSeconds = Math.max(2.5, (text.length / 8) * (1 / Math.max(0.4, effectiveRate)));
      const maxTimeoutMs = Math.min(35000, Math.round(estimatedSeconds * 1000) + 3000);
      let resolved = false;
      let safetyTimer: any = null;

      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          if (safetyTimer) clearTimeout(safetyTimer);
          resolve();
        }
      };

      safetyTimer = setTimeout(() => safeResolve(), maxTimeoutMs);

      if ("speechSynthesis" in window && !document.hidden) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => {
          const vName = v.name.toLowerCase();
          const vLang = v.lang.toLowerCase();
          if (targetVoice && (vName.includes(targetVoice.toLowerCase()) || targetVoice.toLowerCase().includes(vName))) return true;
          if (langCode === "vi") return vLang.startsWith("vi") || vName.includes("viet");
          if (langCode === "de") return vLang.startsWith("de") || vName.includes("german") || vName.includes("deutsch");
          return vLang.startsWith(langCode);
        });

        if (match) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = match;
          utterance.lang = match.lang || lang;
          utterance.volume = currentSettings.volume / 100;
          utterance.rate = effectiveRate;
          utterance.onend = () => safeResolve();
          utterance.onerror = () => playServerTTS(text, lang, targetVoice, safeResolve, effectiveRate);
          window.speechSynthesis.speak(utterance);
          return;
        }
      }

      playServerTTS(text, lang, targetVoice, safeResolve, effectiveRate);
    });
  };

  const playServerTTS = (text: string, lang: string, voice: string, onComplete: () => void, rate?: number) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}&voice=${encodeURIComponent(voice || "")}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.volume = settingsRef.current.volume / 100;
      const effectiveRate = rate !== undefined ? rate : (settingsRef.current.speech_rate || 0.75);
      audio.defaultPlaybackRate = effectiveRate;
      audio.playbackRate = effectiveRate;

      let completed = false;
      const finish = () => {
        if (!completed) { completed = true; onComplete(); }
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => finish());
    } catch {
      onComplete();
    }
  };

  // Local Smart Random Selection
  const getSmartRandomWord = (): VocabularyItem | null => {
    let list = vocabularies;
    if (selectedLevel && selectedLevel !== "Tất cả") list = list.filter(v => v.level === selectedLevel);
    if (selectedCategory && selectedCategory !== "Tất cả") list = list.filter(v => v.category === selectedCategory);
    if (list.length === 0) return null;

    let available = list.filter(v => !recentIdsRef.current.includes(v.id));
    if (available.length === 0) {
      recentIdsRef.current = [];
      available = list;
    }
    const selected = available[Math.floor(Math.random() * available.length)];
    recentIdsRef.current.push(selected.id);
    if (recentIdsRef.current.length > 10) recentIdsRef.current.shift();

    // Tăng số lần review
    setVocabularies(prev => prev.map(v => v.id === selected.id ? { ...v, review_count: (v.review_count || 0) + 1 } : v));
    return selected;
  };

  const playSequence = async () => {
    if (isSequenceRunningRef.current) return;
    isSequenceRunningRef.current = true;

    try {
      const currentSettings = settingsRef.current;
      const word = getSmartRandomWord();
      if (!word) {
        setStatusText("KHÔNG CÓ TỪ SẮP XẾP");
        setStatusColor("text-rose-400");
        return;
      }

      setCurrentWord(word);
      const germanText = `${word.article ? word.article + " " : ""}${word.word}`;
      const vietnameseText = word.meaning;
      const POST_SPEECH_GAP_MS = 600;

      if (currentSettings.playback_mode === "Vietnamese   German") {
        setStatusText(`ĐANG ĐỌC TIẾNG VIỆT: '${vietnameseText}'`);
        setStatusColor("text-sky-400");
        await speakText(vietnameseText, "vi-VN", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));

        if (currentSettings.delay_before_translation > 0) {
          setStatusText(`CHỜ SANG TIẾNG ĐỨC (${currentSettings.delay_before_translation}s)...`);
          setStatusColor("text-amber-400");
          await new Promise((r) => setTimeout(r, currentSettings.delay_before_translation * 1000));
        }

        setStatusText(`ĐANG ĐỌC TIẾNG ĐỨC: '${germanText}'`);
        setStatusColor("text-emerald-400");
        await speakText(germanText, "de-DE", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
      } else {
        setStatusText(`ĐANG ĐỌC TIẾNG ĐỨC: '${germanText}'`);
        setStatusColor("text-emerald-400");
        await speakText(germanText, "de-DE", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));

        if (currentSettings.delay_before_translation > 0) {
          setStatusText(`CHỜ (${currentSettings.delay_before_translation}s)...`);
          setStatusColor("text-amber-400");
          await new Promise((r) => setTimeout(r, currentSettings.delay_before_translation * 1000));
        }

        if (currentSettings.playback_mode === "German   Example   Vietnamese" && word.example_de) {
          setStatusText(`ĐỌC VÍ DỤ: '${word.example_de}'`);
          setStatusColor("text-sky-400");
          await speakText(word.example_de, "de-DE", word);
          await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
        }

        setStatusText(`ĐANG ĐỌC TIẾNG VIỆT: '${vietnameseText}'`);
        setStatusColor("text-sky-400");
        await speakText(vietnameseText, "vi-VN", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
      }

      setStatusText("HOÀN THÀNH. CHỜ CHU KỲ TIẾP THEO...");
      setStatusColor("text-indigo-400");
      setCountdown(Math.round(currentSettings.interval_minutes * 60));
    } catch (e) {
      console.error("Error during playback sequence:", e);
    } finally {
      isSequenceRunningRef.current = false;
    }
  };

  const handleStart = () => {
    setIsPlaying(true);
    setIsPaused(false);
    playSequence();
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setStatusText("ĐANG CHẠY");
      setStatusColor("text-emerald-400");
    } else {
      setIsPaused(true);
      isSequenceRunningRef.current = false;
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setStatusText("TẠM DỪNG");
      setStatusColor("text-amber-400");
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    isSequenceRunningRef.current = false;
    if (currentAudioRef.current) currentAudioRef.current.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    setStatusText("ĐÃ DỪNG");
    setStatusColor("text-rose-400");
  };

  useEffect(() => {
    if (isPlaying && !isPaused) {
      const intervalMs = Math.max(5000, settings.interval_minutes * 60 * 1000);
      timerRef.current = setInterval(() => {
        if (!isSequenceRunningRef.current) playSequence();
      }, intervalMs);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [isPlaying, isPaused, settings, selectedLevel, selectedCategory]);

  // Local CRUD Handlers
  const handleAddVocab = (vocab: Partial<VocabularyItem>) => {
    const newItem: VocabularyItem = {
      id: Date.now(),
      word: vocab.word || "",
      article: vocab.article || "",
      meaning: vocab.meaning || "",
      example_de: vocab.example_de || "",
      example_vi: vocab.example_vi || "",
      level: vocab.level || "A1",
      category: vocab.category || "General",
      favorite: !!vocab.favorite,
      review_count: 0,
      created_at: new Date().toISOString().split("T")[0]
    };
    setVocabularies(prev => applyFixedCategories([...prev, newItem], 20));
  };

  const handleEditVocab = (id: number, vocab: Partial<VocabularyItem>) => {
    setVocabularies(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...vocab } : v);
      return applyFixedCategories(updated, 20);
    });
  };

  const handleDeleteVocab = (id: number) => {
    setVocabularies(prev => applyFixedCategories(prev.filter(v => v.id !== id), 20));
  };

  const handleDeleteBatchVocab = (ids: number[]) => {
    const idSet = new Set(ids);
    setVocabularies(prev => applyFixedCategories(prev.filter(v => !idSet.has(v.id)), 20));
  };

  const handleToggleFavorite = (id: number) => {
    setVocabularies(prev => prev.map(v => v.id === id ? { ...v, favorite: !v.favorite } : v));
  };

  const handleResetSeed = () => {
    const rawSeedList = getExpandedVocabularies();
    const existingKeys = new Set(vocabularies.map(v => `${(v.article || "").toLowerCase().trim()} ${(v.word || "").toLowerCase().trim()}`));
    let maxId = vocabularies.reduce((max, v) => Math.max(max, v.id || 0), 0);
    const newItems: VocabularyItem[] = [];

    rawSeedList.forEach(seed => {
      const key = `${(seed.article || "").toLowerCase().trim()} ${(seed.word || "").toLowerCase().trim()}`;
      if (!existingKeys.has(key)) {
        maxId++;
        newItems.push({ ...seed, id: maxId, favorite: false, review_count: 0, created_at: new Date().toISOString().split("T")[0] });
      }
    });

    setVocabularies(prev => applyFixedCategories([...prev, ...newItems], 20));
  };

  const handleImportVocab = (items: Partial<VocabularyItem>[], mode: "append" | "replace") => {
    let maxId = mode === "replace" ? 0 : vocabularies.reduce((max, v) => Math.max(max, v.id || 0), 0);
    const nowStr = new Date().toISOString().split("T")[0];
    const formatted: VocabularyItem[] = items.map(item => {
      maxId++;
      return {
        id: maxId,
        word: String(item.word || "").trim(),
        article: String(item.article || "").trim(),
        meaning: String(item.meaning || "").trim(),
        example_de: String(item.example_de || "").trim(),
        example_vi: String(item.example_vi || "").trim(),
        level: String(item.level || "A1").trim(),
        category: String(item.category || "General").trim(),
        favorite: false,
        review_count: 0,
        created_at: nowStr
      };
    });

    setVocabularies(prev => {
      const combined = mode === "replace" ? formatted : [...prev, ...formatted];
      return applyFixedCategories(combined, 20);
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPlaying={isPlaying && !isPaused}
        activeWord={currentWord?.word}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {activeTab === "home" && (
          <HomeTab
            settings={settings}
            currentWord={currentWord}
            statusText={statusText}
            statusColor={statusColor}
            isPlaying={isPlaying}
            isPaused={isPaused}
            onStart={handleStart}
            onPause={handlePause}
            onStop={handleStop}
            countdown={countdown}
            onSpeak={(text, lang, wordInfo, rate) => speakText(text, lang, wordInfo, rate)}
          />
        )}
        {activeTab === "playlist" && (
          <PlaylistTab
            settings={settings}
            setSettings={setSettings}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onSave={() => alert("Đã lưu cấu hình Playlist!")}
            vocabularies={vocabularies}
          />
        )}
        {activeTab === "vocabulary" && (
          <VocabularyTab
            vocabularies={vocabularies}
            onAdd={handleAddVocab}
            onEdit={handleEditVocab}
            onDelete={handleDeleteVocab}
            onDeleteBatch={handleDeleteBatchVocab}
            onToggleFavorite={handleToggleFavorite}
            onResetSeed={handleResetSeed}
            onImport={handleImportVocab}
            onSpeak={(text, lang, wordInfo, rate) => speakText(text, lang, wordInfo, rate)}
          />
        )}
        {activeTab === "writing" && (
          <WritingTestTab
            vocabularies={vocabularies}
            onSpeak={(text, lang, wordInfo, rate) => speakText(text, lang, wordInfo, rate)}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            settings={settings}
            setSettings={setSettings}
            onSave={() => alert("Đã lưu cài đặt!")}
            onTestVoice={() => speakText("Guten Tag! Willkommen bei DeutschFlow.", "de-DE")}
          />
        )}
        {activeTab === "statistics" && <StatisticsTab vocabularies={vocabularies} />}
      </main>
    </div>
  );
}