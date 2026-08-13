import React, { useState } from "react";
import { Headphones, Music2, BookOpen, PenTool, Settings, BarChart2, Volume2, Menu, X } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPlaying: boolean;
  activeWord?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isPlaying,
  activeWord
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", num: "01", icon: Headphones },
    { id: "playlist", label: "Playlist", num: "02", icon: Music2 },
    { id: "vocabulary", label: "Vocabulary", num: "03", icon: BookOpen },
    { id: "writing", label: "Kiểm tra viết", num: "04", icon: PenTool },
    { id: "statistics", label: "Statistics", num: "05", icon: BarChart2 },
    { id: "settings", label: "Settings", num: "06", icon: Settings }
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* ================= MOBILE HEADER BAR (md:hidden) ================= */}
      <header className="md:hidden sticky top-0 z-40 bg-[#1E293B] border-b border-slate-700/50 px-4 py-3 flex items-center justify-between select-none">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-md shadow-indigo-500/20">
            D
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">DeutschFlow</h1>
            <p className="text-[10px] text-indigo-400 font-medium">Hands-Free German</p>
          </div>
        </div>

        {/* Active Badge / Audio status & Hamburger toggle */}
        <div className="flex items-center gap-2">
          {isPlaying && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{activeWord || "Audio"}</span>
            </div>
          )}

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="w-6 h-6 text-indigo-400" /> : <Menu className="w-6 h-6 text-slate-200" />}
          </button>
        </div>
      </header>

      {/* ================= MOBILE MENU DRAWER OVERLAY ================= */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative z-50 bg-[#1E293B] border-b border-slate-700/50 px-4 py-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Menu Điều Hướng
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${isActive ? "text-indigo-400" : "opacity-40"}`}>
                        {item.num}.
                      </span>
                      <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                      <span className="font-medium text-base">{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Learning Track Card */}
            <div className="pt-2 border-t border-slate-700/40">
              <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 font-semibold">Learning Track</p>
                <p className="text-xs font-bold text-slate-200">German Hands-Free Auto Playback</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DESKTOP SIDEBAR (md:flex) ================= */}
      <aside className="hidden md:flex w-64 bg-[#1E293B] border-r border-slate-700/50 flex-col h-full select-none flex-shrink-0">
        {/* Brand Header */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20">
              D
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">DeutschFlow</h1>
              <p className="text-xs text-indigo-400 font-medium tracking-wide">Hands-Free German</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
              >
                <span className={`text-xs font-semibold ${isActive ? "text-indigo-400" : "opacity-40"}`}>
                  {item.num}.
                </span>
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Audio Status Card */}
        {isPlaying && (
          <div className="mx-6 mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Audio Active</div>
              <div className="text-xs text-slate-200 truncate font-mono">{activeWord || "Playing..."}</div>
            </div>
          </div>
        )}

        {/* Bottom Level Indicator Card */}
        <div className="p-6 pt-2">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">Learning Track</p>
            <p className="text-sm font-bold text-slate-200">German Hands-Free</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-indigo-500 w-3/4 h-full rounded-full" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

