import React, { useState } from "react";
import { Music2, Sliders, Timer, Shuffle, Save, Plus, Clock, Check } from "lucide-react";
import { AppSettings, VocabularyItem } from "../types";

interface PlaylistTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  selectedLevel: string;
  setSelectedLevel: (lvl: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onSave: () => void;
  vocabularies?: VocabularyItem[];
}

export const PlaylistTab: React.FC<PlaylistTabProps> = ({
  settings,
  setSettings,
  selectedLevel,
  setSelectedLevel,
  selectedCategory,
  setSelectedCategory,
  onSave,
  vocabularies
}) => {
  const levels = ["Tất cả", "A1", "A2", "B1", "B2"];
  const vocabCategories = Array.from(
    new Set((vocabularies || []).map((v) => v.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
  const categories = ["Tất cả", ...vocabCategories];
  const playbackModes = [
    "German → Vietnamese",
    "Vietnamese → German",
    "German → Guess → Vietnamese → German",
    "German → Example → Vietnamese"
  ];

  // Custom Interval State
  const [intervalPresets, setIntervalPresets] = useState<number[]>([
    0.1, 0.5, 1, 2, 3, 5, 8, 10, 15, 30
  ]);
  const [showCustomInterval, setShowCustomInterval] = useState(false);
  const [customIntervalValue, setCustomIntervalValue] = useState("");
  const [customIntervalUnit, setCustomIntervalUnit] = useState<"seconds" | "minutes">("seconds");

  // Custom Delay State
  const [delayPresets, setDelayPresets] = useState<number[]>([
    1, 1.5, 2, 2.5, 3, 4, 5, 7, 10
  ]);
  const [showCustomDelay, setShowCustomDelay] = useState(false);
  const [customDelayValue, setCustomDelayValue] = useState("");

  // Ensure current settings values are present in preset lists
  const currentInterval = settings.interval_minutes;
  const allIntervals = Array.from(new Set([...intervalPresets, currentInterval])).sort((a, b) => a - b);

  const currentDelay = settings.delay_before_translation;
  const allDelays = Array.from(new Set([...delayPresets, currentDelay])).sort((a, b) => a - b);

  const formatIntervalLabel = (val: number) => {
    if (val === 0.1) return "Demo (Siêu nhanh 6 giây)";
    const seconds = Math.round(val * 60);
    if (seconds < 60) return `${seconds} giây`;
    if (val % 1 === 0) return `${val} phút`;
    return `${val} phút (${seconds} giây)`;
  };

  const handleAddCustomInterval = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customIntervalValue);
    if (isNaN(num) || num <= 0) return;

    const valInMinutes = customIntervalUnit === "seconds" ? num / 60 : num;
    const rounded = Math.round(valInMinutes * 1000) / 1000;

    if (!intervalPresets.includes(rounded)) {
      setIntervalPresets((prev) => [...prev, rounded]);
    }
    setSettings((prev) => {
      const next = { ...prev, interval_minutes: rounded };
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      }).catch(console.error);
      return next;
    });
    setCustomIntervalValue("");
    setShowCustomInterval(false);
  };

  const handleAddCustomDelay = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customDelayValue);
    if (isNaN(num) || num <= 0) return;

    const rounded = Math.round(num * 10) / 10;
    if (!delayPresets.includes(rounded)) {
      setDelayPresets((prev) => [...prev, rounded]);
    }
    setSettings((prev) => {
      const next = { ...prev, delay_before_translation: rounded };
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      }).catch(console.error);
      return next;
    });
    setCustomDelayValue("");
    setShowCustomDelay(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-light text-slate-400 flex items-center gap-2">
          <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
          <span>Cấu Hình <span className="text-white font-semibold">Playlist & Flow</span></span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tùy chỉnh danh mục bài học, chế độ đọc từ và tần suất tự động phát.
        </p>
      </div>

      {/* 1. Vocabulary Playlist Filter */}
      <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Sliders className="w-4 h-4" />
          <span>1. Bộ Lọc Từ Vựng (Playlist Filter)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Trình Độ (Level)</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            >
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Chủ Đề (Category)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Playback Mode */}
      <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Music2 className="w-4 h-4" />
          <span>2. Chế Độ Đọc (Learning Mode)</span>
        </h3>

        <div className="space-y-3">
          {playbackModes.map((mode) => (
            <label
              key={mode}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                settings.playback_mode === mode
                  ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300 font-semibold"
                  : "bg-slate-900/50 border-slate-700/60 text-slate-300 hover:bg-slate-900"
              }`}
            >
              <input
                type="radio"
                name="playback_mode"
                checked={settings.playback_mode === mode}
                onChange={() => {
                  setSettings((prev) => {
                    const next = { ...prev, playback_mode: mode };
                    fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(next)
                    }).catch(console.error);
                    return next;
                  });
                }}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
              />
              <span className="text-sm">{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Interval & Delay */}
      <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span>3. Khoảng Thời Gian (Flow Parameters)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interval Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase text-slate-400">
                Interval (Tự phát sau)
              </label>
              <button
                type="button"
                onClick={() => setShowCustomInterval(!showCustomInterval)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tùy chỉnh</span>
              </button>
            </div>

            <select
              value={settings.interval_minutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSettings((prev) => {
                  const next = { ...prev, interval_minutes: val };
                  fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(next)
                  }).catch(console.error);
                  return next;
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            >
              {allIntervals.map((val) => (
                <option key={val} value={val}>
                  {formatIntervalLabel(val)}
                </option>
              ))}
            </select>

            {/* Custom Interval Form */}
            {showCustomInterval && (
              <form onSubmit={handleAddCustomInterval} className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thêm thời gian tự phát mới:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder={customIntervalUnit === "seconds" ? "VD: 45" : "VD: 2.5"}
                    value={customIntervalValue}
                    onChange={(e) => setCustomIntervalValue(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <select
                    value={customIntervalUnit}
                    onChange={(e) => setCustomIntervalUnit(e.target.value as "seconds" | "minutes")}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="seconds">Giây</option>
                    <option value="minutes">Phút</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Delay Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase text-slate-400">
                Delay (Thời gian chờ đoán)
              </label>
              <button
                type="button"
                onClick={() => setShowCustomDelay(!showCustomDelay)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tùy chỉnh</span>
              </button>
            </div>

            <select
              value={settings.delay_before_translation}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSettings((prev) => {
                  const next = { ...prev, delay_before_translation: val };
                  fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(next)
                  }).catch(console.error);
                  return next;
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
            >
              {allDelays.map((val) => (
                <option key={val} value={val}>
                  {val} giây
                </option>
              ))}
            </select>

            {/* Custom Delay Form */}
            {showCustomDelay && (
              <form onSubmit={handleAddCustomDelay} className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thêm thời gian chờ đoán mới (Giây):</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    placeholder="VD: 3.5"
                    value={customDelayValue}
                    onChange={(e) => setCustomDelayValue(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <span className="text-xs text-slate-400 font-mono">Giây</span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 4. Smart Random Algorithm */}
      <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.random_mode}
            onChange={(e) => {
              const checked = e.target.checked;
              setSettings((prev) => {
                const next = { ...prev, random_mode: checked };
                fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(next)
                }).catch(console.error);
                return next;
              });
            }}
            className="w-5 h-5 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
          />
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <span>Bật Thuật Toán Smart Random</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Phát từ ngẫu nhiên thông minh, tự ghi nhớ 10 từ vừa phát để không bị trùng lặp quá gần nhau.
            </p>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
      >
        <Save className="w-5 h-5" />
        <span>LƯU CẤU HÌNH PLAYLIST</span>
      </button>
    </div>
  );
};


