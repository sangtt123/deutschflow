import React from "react";
import { Play, Pause, Square, Award, Volume2, RotateCcw } from "lucide-react";
import { VocabularyItem, AppSettings } from "../types";

interface HomeTabProps {
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  currentWord: VocabularyItem | null;
  statusText: string;
  statusColor: string;
  isPlaying: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  countdown: number;
  onSpeak?: (text: string, lang?: string, wordInfo?: VocabularyItem, rate?: number) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  settings,
  setSettings,
  currentWord,
  statusText,
  statusColor,
  isPlaying,
  isPaused,
  onStart,
  onPause,
  onStop,
  countdown,
  onSpeak
}) => {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-slate-400">
            Wilkommen zurück, <span className="text-white font-semibold">Learner</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isPlaying
              ? "The automated background speech engine is active."
              : "Press Start to begin hands-free German playback."}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-800/40 border border-slate-700/40 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl">
          <div className="flex flex-col items-end">
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${isPlaying ? (isPaused ? "text-amber-400" : "text-emerald-400") : "text-slate-500"}`}>
              {isPlaying ? (isPaused ? "Status: Paused" : "Status: Active") : "Status: Standby"}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">
              {isPlaying ? `Next word in ${countdown}s` : "Interval: " + settings.interval_minutes + "m"}
            </span>
          </div>
          <div
            className={`w-3 h-3 rounded-full transition-all ${
              isPlaying
                ? isPaused
                  ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                  : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse"
                : "bg-slate-600"
            }`}
          />
        </div>
      </header>

      {/* ACTIVE SESSION CARD */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-10 border border-slate-700/50 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden min-h-[340px] md:min-h-[420px]">
        {/* Background Watermark */}
        <div className="absolute top-2 right-2 sm:top-0 sm:right-0 p-3 sm:p-8 opacity-5 sm:opacity-10 font-black text-5xl sm:text-9xl text-white select-none pointer-events-none overflow-hidden max-w-[30%] text-right leading-none">
          {currentWord?.level || "DE"}
        </div>

        {/* Audio Wave Indicator */}
        {isPlaying && !isPaused && (
          <div className="absolute top-3 left-3 sm:top-8 sm:left-8 flex items-center gap-1.5 h-6 z-10">
            <div className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_100ms]" style={{ height: "60%" }} />
            <div className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_300ms]" style={{ height: "100%" }} />
            <div className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_200ms]" style={{ height: "40%" }} />
            <div className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_400ms]" style={{ height: "80%" }} />
          </div>
        )}

        {/* Category Pill */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
            <Award className="w-3.5 h-3.5" />
            {currentWord ? `${currentWord.level} • ${currentWord.category}` : "Ready to Learn"}
          </span>
        </div>

        {/* German Word */}
        <div className="space-y-3 max-w-3xl">
          <p className="text-indigo-400 text-xs font-mono tracking-[0.3em] uppercase">Now Learning</p>
          <h3 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
            {currentWord ? (
              <span>
                {currentWord.article && <span className="text-indigo-400 font-semibold mr-3">{currentWord.article}</span>}
                {currentWord.word}
              </span>
            ) : (
              "DeutschFlow"
            )}
          </h3>
          <p className="text-2xl text-slate-400 italic font-serif">
            {currentWord ? currentWord.meaning : "Sẵn sàng học tiếng Đức thụ động qua tai nghe"}
          </p>
        </div>

        {/* Manual Re-listen Buttons (Normal & Super Slow) */}
        {currentWord && (
          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={() => {
                const fullText = currentWord.article
                  ? `${currentWord.article} ${currentWord.word}`
                  : currentWord.word;
                onSpeak?.(fullText, "de-DE", currentWord);
              }}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Nghe ({settings.speech_rate || 0.75}x)</span>
            </button>

            <button
              onClick={() => {
                const fullText = currentWord.article
                  ? `${currentWord.article} ${currentWord.word}`
                  : currentWord.word;
                onSpeak?.(fullText, "de-DE", currentWord, 0.5);
              }}
              className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>🐢 Nghe rất chậm (0.5x)</span>
            </button>
          </div>
        )}

        {/* Circular Action Control Buttons */}
        <div className="mt-10 flex items-center justify-center gap-6">
          {/* PAUSE / RESUME CIRCLE */}
          <button
            onClick={onPause}
            disabled={!isPlaying}
            title={isPaused ? "Resume" : "Pause"}
            className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
              !isPlaying
                ? "border-slate-800 text-slate-700 cursor-not-allowed"
                : isPaused
                ? "border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          </button>

          {/* MAIN START / RESTART BUTTON */}
          <button
            onClick={onStart}
            disabled={isPlaying && !isPaused}
            title="Start playback"
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 ${
              isPlaying && !isPaused
                ? "bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/25"
            }`}
          >
            <Play className="w-8 h-8 fill-current translate-x-0.5" />
          </button>

          {/* STOP BUTTON */}
          <button
            onClick={onStop}
            disabled={!isPlaying && !isPaused}
            title="Stop playback"
            className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
              !isPlaying && !isPaused
                ? "border-slate-800 text-slate-700 cursor-not-allowed"
                : "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
            }`}
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* MOBILE LOCK SCREEN FEATURE BANNER */}
        <div className="mt-8 px-4 py-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center gap-3 text-left max-w-lg">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl flex-shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-indigo-200">📱 Hỗ trợ nghe khi TẮT MÀN HÌNH điện thoại</p>
            <p className="text-slate-400 mt-0.5">
              Hệ thống tích hợp HTML5 Audio & Media Session. Bạn chỉ cần nhấn <span className="text-indigo-300 font-semibold">Start</span>, sau đó tắt màn hình điện thoại hoặc khóa máy, âm thanh từ vựng tiếng Đức sẽ tiếp tục tự động phát và hiển thị widget trên màn hình khóa.
            </p>
          </div>
        </div>
      </section>

      {/* PARAMETERS & STATUS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Active Mode</span>
          <p className="text-sm font-bold text-slate-200 mt-2">{settings.playback_mode}</p>
          <p className="text-xs text-slate-500 mt-1">Configured in Playlist</p>
        </div>

        <div className="bg-slate-800/50 rounded-[24px] p-6 border border-slate-700/50 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Timing Parameters</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">Interval:</span>
            <span className="text-sm font-mono font-bold text-indigo-400">{settings.interval_minutes}m</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Delay:</span>
            <span className="text-sm font-mono font-bold text-indigo-400">{settings.delay_before_translation}s</span>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[24px] p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-xl shadow-indigo-600/10">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Status Banner</h4>
            <p className="text-sm font-bold text-white line-clamp-2">{statusText}</p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-20 transform rotate-12 pointer-events-none">
            <div className="w-28 h-28 border-8 border-white rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

