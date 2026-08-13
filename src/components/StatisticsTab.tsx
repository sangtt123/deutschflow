import React from "react";
import { BarChart2, BookOpen, Star, Repeat, Award } from "lucide-react";
import { VocabularyItem } from "../types";

interface StatisticsTabProps {
  vocabularies: VocabularyItem[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ vocabularies }) => {
  const total = vocabularies.length;
  const favorites = vocabularies.filter((v) => v.favorite).length;
  const total_reviews = vocabularies.reduce((acc, v) => acc + (v.review_count || 0), 0);

  const levels: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
  vocabularies.forEach((v) => {
    if (levels[v.level] !== undefined) levels[v.level]++;
  });

  const totalWords = total || 1;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-light text-slate-400 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
          <span>Thống Kê <span className="text-white font-semibold">Báo Cáo Tiến Độ</span></span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Tổng quan số lượng từ, lượt nghe và cấp độ học
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng Số Từ</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mt-4 font-mono">{total}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lượt Ôn Luyện</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Repeat className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white mt-4 font-mono">{total_reviews}</div>
        </div>

        <div className="bg-indigo-600 border border-indigo-500/40 rounded-[24px] p-6 relative overflow-hidden shadow-xl text-white">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Yêu Thích</span>
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Star className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="text-4xl font-extrabold mt-4 font-mono relative z-10">{favorites}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-[24px] p-6 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Award className="w-4 h-4" />
          <span>Phân Bổ Theo Trình Độ</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { level: "A1", name: "Trình độ A1", color: "bg-indigo-500" },
            { level: "A2", name: "Trình độ A2", color: "bg-indigo-400" },
            { level: "B1", name: "Trình độ B1", color: "bg-purple-500" },
            { level: "B2", name: "Trình độ B2", color: "bg-emerald-500" }
          ].map((lvl) => {
            const count = levels[lvl.level] || 0;
            const percent = Math.round((count / totalWords) * 100);
            return (
              <div key={lvl.level} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/40 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-200">{lvl.name}</span>
                  <span className="font-mono text-slate-200">{count} từ ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full ${lvl.color} rounded-full`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};