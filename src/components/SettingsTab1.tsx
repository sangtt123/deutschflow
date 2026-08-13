import React from "react";
import { Settings, Volume2, Mic, Save, BellRing, Gauge } from "lucide-react";
import { AppSettings } from "../types";

interface SettingsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void;
  onTestVoice: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  setSettings,
  onSave,
  onTestVoice
}) => {
  const deVoices = [
    { label: "Killian (Nam - Chuẩn DE)", value: "de-DE-KillianNeural" },
    { label: "Katja (Nữ - Chuẩn DE)", value: "de-DE-KatjaNeural" },
    { label: "Amala (Nữ - Áo)", value: "de-AT-AmalaNeural" },
    { label: "Conrad (Nam - Thụy Sĩ)", value: "de-CH-ConradNeural" }
  ];

  const viVoices = [
    { label: "Hoài My (Nữ - Miền Nam)", value: "vi-VN-HoaiMyNeural" },
    { label: "Nam Minh (Nam - Miền Bắc)", value: "vi-VN-NamMinhNeural" }
  ];

  const speedOptions = [
    { label: "🐢 0.5x (Siêu Chậm)", value: 0.5 },
    { label: "🐢 0.7x (Chậm - Dễ Nghe)", value: 0.7 },
    { label: "🐢 0.85x (Vừa Phải)", value: 0.85 },
    { label: "⚡ 1.0x (Chuẩn)", value: 1.0 },
    { label: "🚀 1.2x (Nhanh)", value: 1.2 }
  ];

  const currentSpeed = settings.speech_rate || 0.7;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-light text-slate-400 flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
          <span>Cài Đặt <span className="text-white font-semibold">Hệ Thống & Giọng Đọc</span></span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Cấu hình Edge-TTS giọng đọc chuẩn Microsoft Neural, tốc độ phát âm và âm lượng ứng dụng.
        </p>
      </div>

      {/* 1. Edge-TTS Voices */}
      <div className="bg-slate-800/50 rounded-[24px] border border-slate-700/50 p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Mic className="w-4 h-4" />
          <span>1. Giọng Đọc Microsoft Edge-TTS</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Giọng Đọc Tiếng Đức (German Voice)
            </label>
            <select
              value={settings.voice_de}
              onChange={(e) => {
                const newVoice = e.target.value;
                setSettings((prev) => {
                  const next = { ...prev, voice_de: newVoice };
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
              {deVoices.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Giọng Đọc Tiếng Việt (Vietnamese Voice)
            </label>
            <select
              value={settings.voice_vi}
              onChange={(e) => {
                const newVoice = e.target.value;
                setSettings((prev) => {
                  const next = { ...prev, voice_vi: newVoice };
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
              {viVoices.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* TTS Engine Source Preference */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2">
            <label className="block text-xs font-mono uppercase text-slate-400">
              Nguồn Âm Thanh Phát Âm (TTS Engine Source)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSettings((prev) => {
                    const next = { ...prev, prefer_cloud_tts: true };
                    fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(next)
                    }).catch(console.error);
                    return next;
                  });
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.prefer_cloud_tts !== false
                    ? "bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🎙️ Cloud Studio HD (Chuẩn Bản Xứ)</span>
                  {settings.prefer_cloud_tts !== false && <span className="text-emerald-400 text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono">Đang dùng</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Giọng chuẩn bản xứ phát âm rõ nét đồng bộ 100% trên cả Máy tính & Điện thoại (tránh giọng robot khô cứng của Windows/Mac).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettings((prev) => {
                    const next = { ...prev, prefer_cloud_tts: false };
                    fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(next)
                    }).catch(console.error);
                    return next;
                  });
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.prefer_cloud_tts === false
                    ? "bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>💻 Trình Duyện Mặc Định (Web Speech API)</span>
                  {settings.prefer_cloud_tts === false && <span className="text-indigo-400 text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded font-mono">Đang dùng</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Dùng giọng tổng hợp có sẵn cài trên hệ điều hành máy tính (phụ thuộc vào thiết bị).
                </p>
              </button>
            </div>
          </div>

          <button
            onClick={onTestVoice}
            className="w-full py-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>Thử Âm Thanh Giọng Đọc (Test Voice)</span>
          </button>
        </div>
      </div>

      {/* 2. Speech Rate (Tốc độ phát âm) */}
      <div className="bg-slate-800/50 rounded-[24px] border border-slate-700/50 p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          <span>2. Tốc Độ Phát Âm (Speech Speed / Nghe Chậm)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Điều chỉnh tốc độ giọng đọc cho tất cả các chế độ nghe. Chọn tốc độ chậm hơn (0.7x hoặc 0.5x) giúp bạn dễ nghe rõ từng âm tiết tiếng Đức hơn.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
          {speedOptions.map((opt) => {
            const isSelected = Math.abs(currentSpeed - opt.value) < 0.05;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSettings((prev) => {
                    const next = { ...prev, speech_rate: opt.value };
                    fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(next)
                    }).catch(console.error);
                    return next;
                  });
                }}
                className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                    : "bg-slate-900/80 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Volume Slider */}
      <div className="bg-slate-800/50 rounded-[24px] border border-slate-700/50 p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <span>3. Mức Âm Lượng (Volume)</span>
        </h3>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(e) => {
              const newVol = Number(e.target.value);
              setSettings((prev) => {
                const next = { ...prev, volume: newVol };
                fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(next)
                }).catch(console.error);
                return next;
              });
            }}
            className="flex-1 accent-indigo-500 bg-slate-900"
          />
          <span className="font-mono text-sm font-bold text-slate-200 w-12 text-right">
            {settings.volume}%
          </span>
        </div>
      </div>

      {/* 4. System Tray info */}
      <div className="bg-slate-800/50 rounded-[24px] border border-slate-700/50 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-100 text-sm">System Tray Background Mode</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Khi thu nhỏ ứng dụng, DeutschFlow sẽ tiếp tục phát âm thanh từ vựng tiếng Đức dưới khay hệ thống (System Tray) mà không làm gián đoạn công việc của bạn.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
      >
        <Save className="w-5 h-5" />
        <span>LƯU CÀI ĐẶT GIỌNG ĐỌC</span>
      </button>
    </div>
  );
};
