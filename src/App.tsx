import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { HomeTab } from "./components/HomeTab";
import { PlaylistTab } from "./components/PlaylistTab";
import { VocabularyTab } from "./components/VocabularyTab";
import { WritingTestTab } from "./components/WritingTestTab";
import { SettingsTab } from "./components/SettingsTab";
import { StatisticsTab } from "./components/StatisticsTab";
import { VocabularyItem, AppSettings } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    interval_minutes: 3,
    delay_before_translation: 3,
    voice_de: "de-DE-KillianNeural",
    voice_vi: "vi-VN-HoaiMyNeural",
    volume: 80,
    speech_rate: 0.75,
    random_mode: true,
    playback_mode: "German → Vietnamese"
  });

  const [selectedLevel, setSelectedLevel] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");

  // Playback Control State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyItem | null>(null);
  const [statusText, setStatusText] = useState("SẴN SÀNG");
  const [statusColor, setStatusColor] = useState("text-sky-400");
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  // Keep settingsRef updated with latest settings state
  const settingsRef = useRef<AppSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load initial vocabulary and settings from server
  const loadVocabularies = () => {
    fetch("/api/vocabulary")
      .then((res) => res.json())
      .then((data) => setVocabularies(data))
      .catch((err) => console.error("Error loading vocabs:", err));
  };

  const loadSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error("Error loading settings:", err));
  };

  useEffect(() => {
    loadVocabularies();
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "home") {
      loadSettings();
    }
  }, [activeTab]);

  // Audio & Execution Refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSequenceRunningRef = useRef<boolean>(false);

  // Multi-Engine TTS Audio Player (Web Speech API + High Quality Cloud TTS Proxy)
  const speakText = (
    text: string,
    lang: string,
    wordInfo?: VocabularyItem,
    customRate?: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!text || !text.trim()) {
        resolve();
        return;
      }

      const currentSettings = settingsRef.current;
      const langCode = lang.split("-")[0].toLowerCase(); // 'vi' or 'de'
      const targetVoice = langCode === "de" ? currentSettings.voice_de : currentSettings.voice_vi;
      const effectiveRate = customRate !== undefined ? customRate : (currentSettings.speech_rate || 0.75);

      // Dynamically calculate estimated speech duration based on text length and speed
      // Average speech rate is ~10-12 characters per second at 1.0x. Slower at 0.75x.
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

      // Safety timeout: If browser speech API stalls, auto-resolve so app loop never freezes
      safetyTimer = setTimeout(() => {
        console.warn(`[speakText] Safety timeout auto-resolved after ${maxTimeoutMs}ms for text: "${text.substring(0, 30)}..."`);
        safeResolve();
      }, maxTimeoutMs);

      // Update MediaSession API for mobile lockscreen & Notification Center
      if ("mediaSession" in navigator && wordInfo) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `${wordInfo.article ? wordInfo.article + " " : ""}${wordInfo.word} — ${wordInfo.meaning}`,
            artist: "DeutschFlow • Luyện Nghe Tiếng Đức Auto",
            album: `Trình độ ${wordInfo.level || "A1"} • ${wordInfo.category || "General"}`,
            artwork: [
              { src: "https://images.unsplash.com/photo-1527866512907-a35a62a0f6c5?w=500&auto=format&fit=crop&q=80", sizes: "500x500", type: "image/jpeg" }
            ]
          });

          navigator.mediaSession.setActionHandler("play", () => {
            setIsPlaying(true);
            setIsPaused(false);
          });
          navigator.mediaSession.setActionHandler("pause", () => {
            setIsPaused(true);
            if (currentAudioRef.current) currentAudioRef.current.pause();
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
          });
          navigator.mediaSession.setActionHandler("nexttrack", () => {
            playSequence();
          });
        } catch (e) {
          console.debug("MediaSession setup error:", e);
        }
      }

      // Check if browser has an authentic native voice for the requested language (desktop/unlocked tab)
      // Note: On mobile background, SpeechSynthesis is suspended by OS, so Cloud TTS Proxy handles background.
      if ("speechSynthesis" in window && !document.hidden) {
        const voices = window.speechSynthesis.getVoices();

        const match = voices.find((v) => {
          const vName = v.name.toLowerCase();
          const vLang = v.lang.toLowerCase();
          if (targetVoice && (vName.includes(targetVoice.toLowerCase()) || targetVoice.toLowerCase().includes(vName))) {
            return true;
          }
          if (langCode === "vi") {
            return vLang.startsWith("vi") || vName.includes("viet");
          }
          if (langCode === "de") {
            return vLang.startsWith("de") || vName.includes("german") || vName.includes("deutsch");
          }
          return vLang.startsWith(langCode);
        });

        if (match) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = match;
          utterance.lang = match.lang || lang;
          utterance.volume = currentSettings.volume / 100;
          utterance.rate = effectiveRate;

          utterance.onend = () => {
            safeResolve();
          };
          utterance.onerror = (e) => {
            console.warn("SpeechSynthesis utterance error, falling back to server TTS:", e);
            playServerTTS(text, lang, targetVoice, safeResolve, effectiveRate);
          };

          window.speechSynthesis.speak(utterance);
          return;
        }
      }

      // Fallback & Mobile Background Audio Stream (HTML5 Audio plays continuously even with screen locked)
      playServerTTS(text, lang, targetVoice, safeResolve, effectiveRate);
    });
  };

  const playServerTTS = (
    text: string,
    lang: string,
    voice: string,
    onComplete: () => void,
    rate?: number
  ) => {
    try {
      // Safely stop any active previous audio element before playing new phrase
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
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
        if (!completed) {
          completed = true;
          onComplete();
        }
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch((err) => {
        console.warn("Server TTS play error:", err);
        finish();
      });
    } catch {
      onComplete();
    }
  };

  const playSequence = async () => {
    // Lock guard: Prevent overlapping calls if previous sequence is still reading long sentences
    if (isSequenceRunningRef.current) {
      console.log("A playback sequence is already running. Skipping concurrent trigger.");
      return;
    }
    isSequenceRunningRef.current = true;

    try {
      const currentSettings = settingsRef.current;
      // 1. Get next smart random word from backend
      const res = await fetch(`/api/vocabulary/smart-random?level=${encodeURIComponent(selectedLevel)}&category=${encodeURIComponent(selectedCategory)}`);
      if (!res.ok) {
        setStatusText("KHÔNG CÓ TỪ PHÙ HỢP BỘ LỌC");
        setStatusColor("text-rose-400");
        return;
      }

      const word: VocabularyItem = await res.json();
      setCurrentWord(word);

      const germanText = `${word.article ? word.article + " " : ""}${word.word}`;
      const vietnameseText = word.meaning;

      // Minimum buffer pause (ms) after speech finishes before taking next step
      const POST_SPEECH_GAP_MS = 600;

      if (currentSettings.playback_mode === "Vietnamese → German") {
        // Mode Vietnamese -> German
        setStatusText(`🔊 ĐANG ĐỌC TIẾNG VIỆT: '${vietnameseText}'`);
        setStatusColor("text-sky-400");
        await speakText(vietnameseText, "vi-VN", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));

        if (currentSettings.delay_before_translation > 0) {
          setStatusText(`⏳ CHỜ ĐOÁN TIẾNG ĐỨC (${currentSettings.delay_before_translation}s)...`);
          setStatusColor("text-amber-400");
          await new Promise((r) => setTimeout(r, currentSettings.delay_before_translation * 1000));
        }

        setStatusText(`🔊 ĐANG ĐỌC TIẾNG ĐỨC: '${germanText}'`);
        setStatusColor("text-emerald-400");
        await speakText(germanText, "de-DE", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
      } else {
        // Standard Modes (German -> ...)
        // Read German Word
        setStatusText(`🔊 ĐANG ĐỌC TIẾNG ĐỨC: '${germanText}'`);
        setStatusColor("text-emerald-400");
        await speakText(germanText, "de-DE", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));

        // Wait Delay before translation
        if (currentSettings.delay_before_translation > 0) {
          setStatusText(`⏳ CHỜ ĐOÁN BẢN DỊCH (${currentSettings.delay_before_translation}s)...`);
          setStatusColor("text-amber-400");
          await new Promise((r) => setTimeout(r, currentSettings.delay_before_translation * 1000));
        }

        // Read Example if Mode 3
        if (currentSettings.playback_mode === "German → Example → Vietnamese" && word.example_de) {
          setStatusText(`🔊 ĐỌC VÍ DỤ TIẾNG ĐỨC: '${word.example_de}'`);
          setStatusColor("text-sky-400");
          await speakText(word.example_de, "de-DE", word);
          await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
        }

        // Read Vietnamese Translation
        setStatusText(`🔊 ĐANG ĐỌC TIẾNG VIỆT: '${vietnameseText}'`);
        setStatusColor("text-sky-400");
        await speakText(vietnameseText, "vi-VN", word);
        await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));

        // Repeat German if Mode 2 (Guess mode)
        if (currentSettings.playback_mode === "German → Guess → Vietnamese → German") {
          if (currentSettings.delay_before_translation > 0) {
            await new Promise((r) => setTimeout(r, currentSettings.delay_before_translation * 1000));
          }
          setStatusText(`🔊 NHẮC LẠI TIẾNG ĐỨC: '${germanText}'`);
          setStatusColor("text-emerald-400");
          await speakText(germanText, "de-DE", word);
          await new Promise((r) => setTimeout(r, POST_SPEECH_GAP_MS));
        }
      }

      // Complete cycle and set countdown to next cycle
      setStatusText("⏳ ĐÃ HOÀN THÀNH. CHỜ CHU KỲ TIẾP THEO...");
      setStatusColor("text-indigo-400");

      const intervalSec = Math.round(currentSettings.interval_minutes * 60);
      setCountdown(intervalSec);

    } catch (e) {
      console.error("Error during playback sequence:", e);
    } finally {
      isSequenceRunningRef.current = false;
    }
  };

  // Start Interval Scheduler
  const handleStart = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const latest = await res.json();
        setSettings(latest);
        settingsRef.current = latest;
      }
    } catch (e) {
      console.error("Error refreshing settings on start:", e);
    }
    setIsPlaying(true);
    setIsPaused(false);
    playSequence();
  };

  const handlePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setStatusText("ĐÃ TIẾP TỤC BẮT ĐẦU");
      setStatusColor("text-emerald-400");
    } else {
      setIsPaused(true);
      isSequenceRunningRef.current = false;
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setStatusText("ĐÃ TẠM DỪNG (PAUSED)");
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
    setStatusText("ĐÃ DỪNG HOÀN TOÀN");
    setStatusColor("text-rose-400");
  };

  // Timer loop for interval triggers
  useEffect(() => {
    if (isPlaying && !isPaused) {
      const intervalMs = Math.max(5000, settings.interval_minutes * 60 * 1000);
      timerRef.current = setInterval(() => {
        // Only trigger sequence if previous sequence isn't currently running
        if (!isSequenceRunningRef.current) {
          playSequence();
        }
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

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      alert("Đã lưu cài đặt hệ thống thành công!");
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  // Vocab CRUD Handlers
  const handleAddVocab = async (vocab: Partial<VocabularyItem>) => {
    const res = await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vocab)
    });
    if (res.ok) loadVocabularies();
  };

  const handleEditVocab = async (id: number, vocab: Partial<VocabularyItem>) => {
    const res = await fetch(`/api/vocabulary/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vocab)
    });
    if (res.ok) loadVocabularies();
  };

  const handleDeleteVocab = async (id: number) => {
    // Optimistic state update for instant UI feedback without blocking browser confirm alerts
    setVocabularies((prev) => prev.filter((v) => v.id !== id));
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (!res.ok) {
        loadVocabularies();
      }
    } catch (e) {
      console.error("Error deleting vocabulary:", e);
      loadVocabularies();
    }
  };

  const handleDeleteBatchVocab = async (ids: number[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setVocabularies((prev) => prev.filter((v) => !idSet.has(v.id)));
    try {
      const res = await fetch("/api/vocabulary/delete-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        loadVocabularies();
      }
    } catch (e) {
      console.error("Error deleting batch vocabulary:", e);
      loadVocabularies();
    }
  };

  const handleToggleFavorite = async (id: number) => {
    const res = await fetch(`/api/vocabulary/${id}/favorite`, { method: "POST" });
    if (res.ok) loadVocabularies();
  };

  const handleResetSeed = async () => {
    try {
      const res = await fetch("/api/vocabulary/reset-seed", { method: "POST" });
      if (res.ok) {
        loadVocabularies();
      }
    } catch (e) {
      console.error("Error resetting seed:", e);
    }
  };

  const handleTestVoice = async () => {
    await speakText("Guten Tag! Willkommen bei DeutschFlow.", "de-DE");
    await new Promise((r) => setTimeout(r, 800));
    await speakText("Xin chào! Giọng đọc tiếng Việt tự nhiên đã được kích hoạt.", "vi-VN");
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
            onSave={handleSaveSettings}
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
            onReload={loadVocabularies}
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
            onSave={handleSaveSettings}
            onTestVoice={handleTestVoice}
          />
        )}

        {activeTab === "statistics" && <StatisticsTab />}
      </main>
    </div>
  );
}
