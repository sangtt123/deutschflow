import React, { useState, useEffect, useRef } from "react";
import {
  PenTool,
  Volume2,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Flame,
  ArrowRight,
  Filter,
  RefreshCw,
  Trophy,
  BookOpen,
  Eye,
  EyeOff
} from "lucide-react";
import { VocabularyItem } from "../types";

interface WritingTestTabProps {
  vocabularies: VocabularyItem[];
  onSpeak?: (text: string, lang?: string, wordInfo?: VocabularyItem, rate?: number) => void;
}

export const WritingTestTab: React.FC<WritingTestTabProps> = ({
  vocabularies,
  onSpeak
}) => {
  // Saved Filter & Options States (persisted in localStorage)
  const [testMode, setTestMode] = useState<"vi_de" | "de_vi">((): "vi_de" | "de_vi" => {
    return (localStorage.getItem("df_wt_mode") as "vi_de" | "de_vi") || "vi_de";
  });
  const [levelFilter, setLevelFilter] = useState(() => {
    return localStorage.getItem("df_wt_level") || "Tất cả";
  });
  const [catFilter, setCatFilter] = useState(() => {
    return localStorage.getItem("df_wt_cat") || "Tất cả";
  });
  const [onlyFavorites, setOnlyFavorites] = useState(() => {
    return localStorage.getItem("df_wt_fav") === "true";
  });
  const [isRandom, setIsRandom] = useState(() => {
    return localStorage.getItem("df_wt_rand") !== "false";
  });
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    return localStorage.getItem("df_wt_audio") !== "false";
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    return Number(localStorage.getItem("df_wt_rate")) || 0.7;
  });

  // Save settings on change
  useEffect(() => {
    localStorage.setItem("df_wt_mode", testMode);
    localStorage.setItem("df_wt_level", levelFilter);
    localStorage.setItem("df_wt_cat", catFilter);
    localStorage.setItem("df_wt_fav", String(onlyFavorites));
    localStorage.setItem("df_wt_rand", String(isRandom));
    localStorage.setItem("df_wt_audio", String(autoPlayAudio));
    localStorage.setItem("df_wt_rate", String(speechRate));
  }, [testMode, levelFilter, catFilter, onlyFavorites, isRandom, autoPlayAudio, speechRate]);

  // Test Queue & State
  const [testQueue, setTestQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showGermanText, setShowGermanText] = useState(false);

  // Score Tracking
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Cooldown delay (2s) after checking before next word can be triggered
  const [nextCooldown, setNextCooldown] = useState(0);
  const nextCooldownRef = useRef(nextCooldown);

  useEffect(() => {
    nextCooldownRef.current = nextCooldown;
  }, [nextCooldown]);

  useEffect(() => {
    if (nextCooldown > 0) {
      const timer = setTimeout(() => {
        setNextCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [nextCooldown]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic Categories from vocabulary list
  const dynamicCategories = Array.from(
    new Set(vocabularies.map((v) => v.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));

  // Voice playback helper
  const playAudio = (text: string, lang = "de-DE", item?: VocabularyItem, customRate?: number) => {
    const effectiveRate = customRate !== undefined ? customRate : speechRate;
    if (onSpeak) {
      onSpeak(text, lang, item, effectiveRate);
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = effectiveRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Helper to normalize input for lenient comparison
  const normalizeText = (str: any) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .trim()
      .toLowerCase()
      .replace(/^['"’`«»„“\s]+|['"’`«»„“\s]+$/g, "")
      .replace(/[.,!?;:]/g, "")
      .replace(/\s+/g, " ");
  };

  // Helper to remove Vietnamese accents for flexible matching
  const removeVietnameseAccents = (str: string) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // Flexible check for Vietnamese translation (DE -> VI)
  const checkVietnameseAnswer = (userInputStr: string, rawMeaning: string): boolean => {
    if (!userInputStr.trim() || !rawMeaning) return false;

    const normUser = normalizeText(userInputStr);
    const normUserNoAccent = normalizeText(removeVietnameseAccents(userInputStr));
    const normTarget = normalizeText(rawMeaning);
    const normTargetNoAccent = normalizeText(removeVietnameseAccents(rawMeaning));

    // Direct match with or without accents
    if (normUser === normTarget || normUserNoAccent === normTargetNoAccent) {
      return true;
    }

    // Split target meaning into variants by delimiters: , ; / | hoặc
    const variants = rawMeaning
      .split(/[,;\/\|]|\bhoặc\b/i)
      .map((s) => s.replace(/\([^)]*\)/g, "").trim())
      .filter(Boolean);

    for (const v of variants) {
      const normV = normalizeText(v);
      const normVNoAccent = normalizeText(removeVietnameseAccents(v));
      if (!normV) continue;

      if (normUser === normV || normUserNoAccent === normVNoAccent) {
        return true;
      }

      // Strip common Vietnamese noun prefixes
      const normVNoPrefix = normV.replace(/^(con|cái|sự|việc|người|cây|quả|trái|chiếc|bộ|toà|tòa|ngôi)\s+/i, "");
      const normVNoPrefixNoAccent = normalizeText(removeVietnameseAccents(normVNoPrefix));

      if (normUser === normVNoPrefix || normUserNoAccent === normVNoPrefixNoAccent) {
        return true;
      }
    }

    // Raw target without parentheses
    const targetNoParens = rawMeaning.replace(/\([^)]*\)/g, "").trim();
    if (
      normalizeText(targetNoParens) === normUser ||
      normalizeText(removeVietnameseAccents(targetNoParens)) === normUserNoAccent
    ) {
      return true;
    }

    return false;
  };

  // Load / Filter test vocabulary queue
  const handleLoadVocabulary = () => {
    let filtered = vocabularies.filter((v) => {
      if (levelFilter !== "Tất cả" && v.level !== levelFilter) return false;
      if (catFilter !== "Tất cả" && v.category !== catFilter) return false;
      if (onlyFavorites && !v.favorite) return false;
      return true;
    });

    if (filtered.length === 0) {
      setTestQueue([]);
      setIsCompleted(false);
      return;
    }

    if (isRandom) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }

    setTestQueue(filtered);
    setCurrentIndex(0);
    setUserInput("");
    setIsAnswered(false);
    setIsCorrect(null);
    setShowHint(false);
    setShowGermanText(false);
    setCorrectCount(0);
    setWrongCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIsCompleted(false);
    setNextCooldown(0);

    // Focus input field
    setTimeout(() => {
      inputRef.current?.focus();
      if (autoPlayAudio && filtered[0]) {
        const current = filtered[0];
        const audioText = current.article ? `${current.article} ${current.word}` : current.word;
        playAudio(audioText, "de-DE", current);
      }
    }, 100);
  };

  // Automatically update test queue when filters or vocabulary list change
  useEffect(() => {
    if (vocabularies.length > 0) {
      handleLoadVocabulary();
    }
  }, [vocabularies, levelFilter, catFilter, onlyFavorites, isRandom, testMode]);

  const currentItem = testQueue[currentIndex];

  // Insert Special Character
  const insertChar = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  // Check Answer Handler
  const handleCheck = () => {
    if (!currentItem || isAnswered) return;
    if (!userInput.trim()) return;

    let correct = false;

    if (testMode === "de_vi") {
      // Check Vietnamese translation
      correct = checkVietnameseAnswer(userInput, currentItem.meaning || "");
    } else {
      // Check German word
      const normalizedUser = normalizeText(userInput);
      const rawWord = currentItem.word || "";
      const rawArticle =
        currentItem.article && currentItem.article !== "null" && currentItem.article !== "none"
          ? currentItem.article
          : "";

      const normalizedWord = normalizeText(rawWord);
      const normalizedFull = normalizeText(`${rawArticle ? rawArticle + " " : ""}${rawWord}`);

      // Standard match
      correct =
        normalizedUser === normalizedWord ||
        (normalizedFull !== "" && normalizedUser === normalizedFull);

      // Special case for number 0 / "null" / "die Null"
      if (
        !correct &&
        (normalizedWord === "null" ||
          normalizedWord === "0" ||
          (currentItem.meaning && currentItem.meaning.toLowerCase().includes("số 0")))
      ) {
        if (
          normalizedUser === "null" ||
          normalizedUser === "0" ||
          normalizedUser === "die null" ||
          normalizedUser === "die 0"
        ) {
          correct = true;
        }
      }
    }

    setIsAnswered(true);
    setIsCorrect(correct);
    setNextCooldown(2);

    if (correct) {
      const newCorrect = correctCount + 1;
      const newStreak = streak + 1;
      setCorrectCount(newCorrect);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      setWrongCount((prev) => prev + 1);
      setStreak(0);
    }

    // Speak German pronunciation on check
    const fullGerman = currentItem.article ? `${currentItem.article} ${currentItem.word}` : currentItem.word;
    playAudio(fullGerman, "de-DE", currentItem);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Move to Next Word
  const handleNextWord = () => {
    if (nextCooldownRef.current > 0) return;

    if (currentIndex + 1 < testQueue.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setUserInput("");
      setIsAnswered(false);
      setIsCorrect(null);
      setShowHint(false);
      setShowGermanText(false);
      setNextCooldown(0);

      setTimeout(() => {
        inputRef.current?.focus();
        if (autoPlayAudio && testQueue[nextIdx]) {
          const next = testQueue[nextIdx];
          const audioText = next.article ? `${next.article} ${next.word}` : next.word;
          playAudio(audioText, "de-DE", next);
        }
      }, 50);
    } else {
      setIsCompleted(true);
    }
  };

  // Ref to track current item & answered state synchronously for hotkeys
  const currentItemRef = useRef(currentItem);
  const isAnsweredRef = useRef(isAnswered);

  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    isAnsweredRef.current = isAnswered;
  }, [isAnswered]);

  // Handle Keydown (Enter for check/next, Space for audio playback when empty or answered)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (!isAnsweredRef.current) {
        if (userInput.trim()) {
          handleCheck();
        }
      } else {
        if (nextCooldownRef.current === 0) {
          handleNextWord();
        }
      }
    } else if (e.code === "Space" || e.key === " ") {
      // Play audio on Space press if user hasn't typed text, or if answered
      if (!userInput.trim() || isAnsweredRef.current) {
        e.preventDefault();
        const curr = currentItemRef.current;
        if (curr) {
          const audioText = curr.article ? `${curr.article} ${curr.word}` : curr.word;
          playAudio(audioText, "de-DE", curr);
        }
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 sm:pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
              <PenTool className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Kiểm Tra Viết & Chính Tả
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            {testMode === "vi_de"
              ? "Luyện gõ từ vựng tiếng Đức từ nghĩa tiếng Việt, rèn luyện trí nhớ và phản xạ chính tả."
              : "Luyện gõ và nhận diện nghĩa tiếng Việt từ từ vựng tiếng Đức, kiểm tra khả năng đọc hiểu."}
          </p>
        </div>

        {/* Action Button: Load New Set */}
        <button
          onClick={handleLoadVocabulary}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 text-xs sm:text-sm active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Nạp Danh Sách Từ Vựng ({testQueue.length})
        </button>
      </div>

      {/* Mode Selector Switch */}
      <div className="bg-slate-900 border border-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 sm:px-3 flex items-center gap-2">
          <span>Chế độ kiểm tra:</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 flex-1 max-w-2xl">
          <button
            type="button"
            onClick={() => setTestMode("vi_de")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              testMode === "vi_de"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/40"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-slate-700/50"
            }`}
          >
            <span className="text-base">🇻🇳 ➔ 🇩🇪</span>
            <span>Tiếng Việt ➔ Tiếng Đức (Gõ tiếng Đức)</span>
          </button>

          <button
            type="button"
            onClick={() => setTestMode("de_vi")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              testMode === "de_vi"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/40"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-slate-700/50"
            }`}
          >
            <span className="text-base">🇩🇪 ➔ 🇻🇳</span>
            <span>Tiếng Đức ➔ Tiếng Việt (Gõ nghĩa TV)</span>
          </button>
        </div>
      </div>

      {/* Filter & Options Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span>Bộ Lọc Từ Vựng Tải Vào Quá Trình Luyện</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Level Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Trình độ</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Tất cả">Tất cả trình độ</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Chủ đề</label>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Tất cả">Tất cả chủ đề</option>
              {dynamicCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Favorites & Random Toggles */}
          <div className="flex flex-col justify-center gap-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => setOnlyFavorites(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>Chỉ từ Yêu thích (⭐)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRandom}
                onChange={(e) => setIsRandom(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>Xáo trộn ngẫu nhiên</span>
            </label>
          </div>

          {/* Audio Auto-play Toggle & Speed selector */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
              <input
                type="checkbox"
                checked={autoPlayAudio}
                onChange={(e) => setAutoPlayAudio(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Tự động đọc</span>
            </label>

            {/* Speed preset buttons */}
            <div className="bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 flex items-center justify-around gap-1">
              {[
                { label: "0.5x", val: 0.5 },
                { label: "0.7x", val: 0.7 },
                { label: "1.0x", val: 1.0 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSpeechRate(opt.val)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    speechRate === opt.val
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                  title={`Tốc độ đọc: ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Testing View */}
      {isCompleted ? (
        /* Completion Summary Card */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-6 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Đã Hoàn Thành Bài Kiểm Tra!</h2>
            <p className="text-slate-400 text-sm">
              Bạn đã vượt qua toàn bộ danh sách từ vựng trong chế độ{" "}
              <strong className="text-indigo-400">
                {testMode === "vi_de" ? "Việt ➔ Đức" : "Đức ➔ Việt"}
              </strong>.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Đúng</div>
              <div className="text-2xl font-bold text-emerald-400">{correctCount}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Sai</div>
              <div className="text-2xl font-bold text-rose-400">{wrongCount}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Chuỗi Cao Nhất</div>
              <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>{maxStreak}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={handleLoadVocabulary}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Luyện Tập Lại Bộ Này
            </button>
          </div>
        </div>
      ) : testQueue.length === 0 ? (
        /* Empty Queue Prompt */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-300">Không có từ vựng phù hợp</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Vui lòng thay đổi trình độ, chủ đề hoặc bỏ lọc "Chỉ từ Yêu thích", sau đó bấm nút{" "}
            <strong className="text-indigo-400">"Nạp Danh Sách Từ Vựng"</strong> để bắt đầu.
          </p>
          <button
            onClick={handleLoadVocabulary}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            Nạp Từ Vựng Ngay
          </button>
        </div>
      ) : currentItem ? (
        /* Active Word Test Card */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-6 relative overflow-hidden">
          {/* Top Info Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
            {/* Index Counter */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-slate-400">
              <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-200 border border-slate-700/60 font-mono text-[11px] sm:text-xs">
                Từ {currentIndex + 1} / {testQueue.length}
              </span>

              <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg border border-indigo-500/20 text-[11px] sm:text-xs">
                Level {currentItem.level || "A1"}
              </span>

              <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700/60 text-[11px] sm:text-xs">
                {currentItem.category || "General"}
              </span>

              <span className="bg-indigo-900/60 text-indigo-200 px-2 py-1 rounded-lg border border-indigo-500/30 font-bold text-[11px] sm:text-xs">
                {testMode === "vi_de" ? "🇻🇳 ➔ 🇩🇪 Việt ➔ Đức" : "🇩🇪 ➔ 🇻🇳 Đức ➔ Việt"}
              </span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold animate-bounce text-[11px] sm:text-xs">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Chuỗi {streak}!</span>
                </div>
              )}

              <div className="text-slate-400 text-[11px] sm:text-xs">
                Đúng: <span className="text-emerald-400 font-bold">{correctCount}</span> | Sai:{" "}
                <span className="text-rose-400 font-bold">{wrongCount}</span>
              </div>
            </div>
          </div>

          {/* Test Prompt Card Section */}
          <div className="text-center py-4 space-y-3">
            <div className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              {testMode === "vi_de"
                ? "Hãy viết từ tiếng Đức nghĩa là:"
                : "Hãy viết nghĩa tiếng Việt của từ tiếng Đức:"}
            </div>

            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-wide drop-shadow-sm">
              {testMode === "vi_de" ? (
                `"${currentItem.meaning}"`
              ) : (
                <span className="text-indigo-300">
                  {currentItem.article ? `${currentItem.article} ` : ""}
                  {currentItem.word}
                </span>
              )}
            </div>

            {/* Example sentence hint */}
            {testMode === "vi_de" && currentItem.example_vi && (
              <div className="text-sm text-slate-400 italic bg-slate-800/40 py-2 px-4 rounded-xl inline-block max-w-xl mx-auto border border-slate-800">
                Ví dụ: "{currentItem.example_vi}"
              </div>
            )}

            {testMode === "de_vi" && currentItem.example_de && (
              <div className="text-sm text-indigo-200/80 italic bg-slate-800/40 py-2 px-4 rounded-xl inline-block max-w-xl mx-auto border border-slate-800">
                Ví dụ DE: "{currentItem.example_de}"
              </div>
            )}

            {/* Answer Reveal & Audio Controls */}
            <div className="pt-2 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGermanText(!showGermanText)}
                  className="inline-flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3.5 py-1.5 rounded-xl transition-all font-medium active:scale-95 shadow-sm"
                >
                  {showGermanText ? (
                    <>
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <span>{testMode === "vi_de" ? "Che từ tiếng Đức" : "Che nghĩa tiếng Việt"}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span>{testMode === "vi_de" ? "Xem từ tiếng Đức" : "Xem nghĩa tiếng Việt"}</span>
                    </>
                  )}
                </button>

                {/* Audio Listen Buttons */}
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const fullGerman = currentItem.article
                        ? `${currentItem.article} ${currentItem.word}`
                        : currentItem.word;
                      playAudio(fullGerman, "de-DE", currentItem, speechRate);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 px-3 py-1.5 rounded-xl transition-all font-medium active:scale-95 shadow-sm"
                    title="Nghe phát âm tiếng Đức"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <span>Nghe ({speechRate}x)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const fullGerman = currentItem.article
                        ? `${currentItem.article} ${currentItem.word}`
                        : currentItem.word;
                      playAudio(fullGerman, "de-DE", currentItem, 0.5);
                    }}
                    className="inline-flex items-center gap-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-xl transition-all font-medium active:scale-95 shadow-sm"
                    title="Nghe ở tốc độ chậm (0.5x)"
                  >
                    <span>🐢 0.5x</span>
                  </button>
                </div>
              </div>

              {/* Displayed revealed text */}
              {showGermanText && (
                <div className="mt-2 bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 px-4 py-2 rounded-xl text-lg font-bold tracking-wide animate-fade-in shadow-inner">
                  {testMode === "vi_de" ? (
                    `${currentItem.article ? currentItem.article + " " : ""}${currentItem.word}`
                  ) : (
                    currentItem.meaning
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Special Characters Bar (Hidden on Mobile) */}
          <div className="hidden sm:flex flex-col items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">
              {testMode === "vi_de"
                ? "Ký tự & Dấu đặc biệt tiếng Đức:"
                : "Chèn nhanh ký tự tiếng Việt có dấu:"}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-2xl">
              {(testMode === "vi_de"
                ? [
                    "ä", "ö", "ü", "ß",
                    "Ä", "Ö", "Ü", "ẞ",
                    "é", "è", "ê", "É",
                    "„", "“", "»", "«",
                    "–", "€"
                  ]
                : ["â", "ă", "ê", "ô", "ơ", "ư", "đ", "á", "à", "ả", "ã", "ạ"]
              ).map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertChar(char)}
                  className="min-w-[36px] h-9 px-2 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 font-bold rounded-lg border border-slate-700 transition-all text-sm active:scale-90 shadow-sm"
                  title={`Thêm ký tự ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          {/* Input & Check Form */}
          <div className="space-y-3">
            {/* Input Label & Hint Toggle Bar */}
            <div className="flex items-center justify-between gap-2 px-1">
              <label className="text-xs font-semibold text-slate-400">
                {testMode === "vi_de" ? "Câu trả lời bằng tiếng Đức:" : "Câu trả lời bằng tiếng Việt:"}
              </label>

              {!isAnswered && (
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{showHint ? "Ẩn gợi ý" : "Xem gợi ý"}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                readOnly={isAnswered}
                placeholder={
                  testMode === "vi_de"
                    ? "Nhập từ tiếng Đức (nhấn Space để nghe, Enter để kiểm tra)..."
                    : "Nhập nghĩa tiếng Việt (gõ có dấu hoặc không dấu, Enter để kiểm tra)..."
                }
                className={`w-full bg-slate-950 border-2 text-base sm:text-lg font-medium px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl focus:outline-none transition-all ${
                  isAnswered
                    ? isCorrect
                      ? "border-emerald-500 text-emerald-300 bg-emerald-950/20"
                      : "border-rose-500 text-rose-300 bg-rose-950/20"
                    : "border-slate-700 text-slate-100 focus:border-indigo-500 shadow-inner"
                }`}
              />
            </div>

            {/* Hint Box */}
            {showHint && !isAnswered && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between animate-fade-in">
                {testMode === "vi_de" ? (
                  <span>
                    💡 Quán từ: <strong className="uppercase font-bold text-amber-200">{currentItem.article || "Không có quán từ"}</strong> • Chữ cái đầu: <strong className="font-bold text-amber-200">{currentItem.word.charAt(0)}</strong>
                  </span>
                ) : (
                  <span>
                    💡 Chủ đề: <strong className="font-bold text-amber-200">{currentItem.category || "Chung"}</strong> • Chữ cái đầu tiếng Việt: <strong className="font-bold text-amber-200">{(currentItem.meaning || "").charAt(0)}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Feedback Alert Box */}
            {isAnswered && (
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 ${
                      isCorrect ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {isCorrect ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="font-bold text-base">
                      {isCorrect ? "Chính xác! Rất tuyệt vời 🎉" : "Chưa chính xác!"}
                    </div>

                    <div className="text-sm mt-0.5">
                      {testMode === "vi_de" ? (
                        <>
                          Đáp án chuẩn tiếng Đức:{" "}
                          <span className="font-bold text-white underline decoration-indigo-400">
                            {currentItem.article ? `${currentItem.article} ` : ""}
                            {currentItem.word}
                          </span>
                        </>
                      ) : (
                        <>
                          Nghĩa chuẩn tiếng Việt:{" "}
                          <span className="font-bold text-white underline decoration-indigo-400">
                            {currentItem.meaning}
                          </span>
                        </>
                      )}
                    </div>

                    {testMode === "vi_de" && currentItem.example_de && (
                      <div className="text-xs text-slate-300 mt-1 italic">
                        Ví dụ DE: "{currentItem.example_de}"
                      </div>
                    )}

                    {testMode === "de_vi" && currentItem.example_vi && (
                      <div className="text-xs text-slate-300 mt-1 italic">
                        Ví dụ VI: "{currentItem.example_vi}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const fullGerman = currentItem.article
                        ? `${currentItem.article} ${currentItem.word}`
                        : currentItem.word;
                      playAudio(fullGerman, "de-DE", currentItem, speechRate);
                    }}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 transition-all font-medium"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    <span>Nghe lại ({speechRate}x)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const fullGerman = currentItem.article
                        ? `${currentItem.article} ${currentItem.word}`
                        : currentItem.word;
                      playAudio(fullGerman, "de-DE", currentItem, 0.5);
                    }}
                    className="flex items-center gap-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-2 rounded-xl transition-all font-medium"
                    title="Nghe rất chậm (0.5x)"
                  >
                    <span>🐢 0.5x</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Control Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleNextWord}
                className="w-full sm:w-auto h-11 sm:h-12 px-5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700/60 flex items-center justify-center text-xs sm:text-sm active:scale-95 transition-all"
              >
                Bỏ qua câu này
              </button>

              {!isAnswered ? (
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                  className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 transition-all"
                >
                  <span>Kiểm Tra</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextWord}
                  disabled={nextCooldown > 0}
                  className={`w-full sm:w-auto h-12 px-8 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 transition-all ${
                    nextCooldown > 0
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed shadow-none opacity-80"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                  }`}
                >
                  <span>
                    {nextCooldown > 0 ? `Từ Tiếp Theo (${nextCooldown}s)` : "Từ Tiếp Theo"}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

