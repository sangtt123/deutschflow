import React, { useEffect, useState } from "react";
import { BarChart2, BookOpen, Star, Repeat, Award } from "lucide-react";

export const StatisticsTab: React.FC = () => {
  const [stats, setStats] = useState<{
    total: number;
    favorites: number;
    total_reviews: number;
    levels: Record<string, number>;
  }>({
    total: 0,
    favorites: 0,
    total_reviews: 0,
    levels: { A1: 0, A2: 0, B1: 0, B2: 0 }
  });

  useEffect(() => {
    fetch("/api/statistics")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Error fetching stats:", err));
  }, []);

  const totalWords = stats.total || 1;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-light text-slate-400 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
          <span>Thống Kê <span className="text-white font-semibold">Báo Cáo Tiến Độ</span></span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Tổng quan số liệu từ vựng, lượt nghe tự động và phân bố theo trình độ tiếng Đức.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng Số Từ Vựng</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mt-4 font-mono">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-2">Từ vựng khả dụng trong CSDL</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lượt Nghe Tự Động</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mt-4 font-mono">{stats.total_reviews}</div>
          <div className="text-xs text-slate-500 mt-2">Tổng số chu kỳ phát âm thanh đã hoàn thành</div>
        </div>

        <div className="bg-indigo-600 border border-indigo-500/40 rounded-[24px] p-6 relative overflow-hidden shadow-xl text-white">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Từ Vựng Yêu Thích</span>
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Star className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="text-4xl font-extrabold mt-4 font-mono relative z-10">{stats.favorites}</div>
          <div className="text-xs opacity-70 mt-2 relative z-10">Được đánh dấu ưu tiên ôn tập</div>
          <div className="absolute -bottom-4 -right-4 opacity-15 transform rotate-12 pointer-events-none">
            <div className="w-28 h-28 border-8 border-white rounded-full" />
          </div>
        </div>
      </div>

      {/* Levels Breakdown */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Award className="w-4 h-4" />
          <span>Phân Bố Từ Vựng Theo Trình Độ (Levels)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { level: "A1", name: "Cấp độ Sơ Cấp A1", color: "bg-indigo-500", text: "text-indigo-300" },
            { level: "A2", name: "Cấp độ Sơ Cấp A2", color: "bg-indigo-400", text: "text-indigo-200" },
            { level: "B1", name: "Cấp độ Trung Cấp B1", color: "bg-purple-500", text: "text-purple-300" },
            { level: "B2", name: "Cấp độ Trung Cấp B2", color: "bg-emerald-500", text: "text-emerald-300" }
          ].map((lvl) => {
            const count = stats.levels[lvl.level] || 0;
            const percent = Math.round((count / totalWords) * 100);
            return (
              <div key={lvl.level} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/40 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className={lvl.text}>{lvl.name}</span>
                  <span className="font-mono text-slate-200">{count} từ ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${lvl.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
