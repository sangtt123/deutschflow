import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Search, Star, Trash2, Edit3, X, Check, RefreshCw, Database, FileSpreadsheet, Volume2, Zap, CheckSquare, Square, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { VocabularyItem } from "../types";
import { ExcelImportModal } from "./ExcelImportModal";

interface VocabularyTabProps {
  vocabularies: VocabularyItem[];
  onAdd: (vocab: Partial<VocabularyItem>) => void;
  onEdit: (id: number, vocab: Partial<VocabularyItem>) => void;
  onDelete: (id: number) => void;
  onDeleteBatch?: (ids: number[]) => void;
  onToggleFavorite: (id: number) => void;
  onResetSeed?: () => void;
  onReload?: () => void;
  onImport?: (items: Partial<VocabularyItem>[], mode: "append" | "replace") => void;
  onSpeak?: (text: string, lang?: string, wordInfo?: VocabularyItem, rate?: number) => void;
}

export const VocabularyTab: React.FC<VocabularyTabProps> = ({
  vocabularies,
  onAdd,
  onEdit,
  onDelete,
  onDeleteBatch,
  onToggleFavorite,
  onResetSeed,
  onReload,
  onImport,
  onSpeak
}) => {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Tất cả");
  const [catFilter, setCatFilter] = useState("Tất cả");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);

  // Pagination State (Default 50 items/page to optimize performance)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Quick Delete & Multi-select State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quickDeleteMode, setQuickDeleteMode] = useState<boolean>(true);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<VocabularyItem | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);
  const [showResetSeedConfirm, setShowResetSeedConfirm] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; type?: "danger" | "success" } | null>(null);

  // Form State
  const [article, setArticle] = useState("");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [level, setLevel] = useState("A1");
  const [category, setCategory] = useState("Home & Housing");
  const [exampleDe, setExampleDe] = useState("");
  const [exampleVi, setExampleVi] = useState("");
  const [favorite, setFavorite] = useState(false);

  const dynamicCategories = Array.from(
    new Set(vocabularies.map((v) => v.category).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));

  const filtered = vocabularies.filter((v) => {
    if (levelFilter !== "Tất cả" && v.level !== levelFilter) return false;
    if (catFilter !== "Tất cả" && v.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.word.toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q) ||
        (v.example_de && v.example_de.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Reset page number when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, levelFilter, catFilter, pageSize]);

  // Pagination Calculations
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedFiltered = filtered.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const showToastMsg = (text: string, type: "danger" | "success" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = (item?: VocabularyItem) => {
    if (item) {
      setEditingItem(item);
      setArticle(item.article || "");
      setWord(item.word);
      setMeaning(item.meaning);
      setLevel(item.level);
      setCategory(item.category);
      setExampleDe(item.example_de || "");
      setExampleVi(item.example_vi || "");
      setFavorite(item.favorite);
    } else {
      setEditingItem(null);
      setArticle("");
      setWord("");
      setMeaning("");
      setLevel("A1");
      setCategory("Daily Life");
      setExampleDe("");
      setExampleVi("");
      setFavorite(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;

    const payload = {
      article,
      word,
      meaning,
      level,
      category,
      example_de: exampleDe,
      example_vi: exampleVi,
      favorite
    };

    if (editingItem) {
      onEdit(editingItem.id, payload);
      showToastMsg(`Đã cập nhật từ "${word}"`);
    } else {
      onAdd(payload);
      showToastMsg(`Đã thêm từ mới "${word}"`);
    }
    setIsModalOpen(false);
  };

  // Selection Logic
  const isAllPageSelected =
    paginatedFiltered.length > 0 && paginatedFiltered.every((v) => selectedIds.includes(v.id));

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.includes(v.id));

  const toggleSelectPage = () => {
    if (isAllPageSelected) {
      const pageIdSet = new Set(paginatedFiltered.map((v) => v.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedFiltered.map((v) => v.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filtered.map((v) => v.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...filtered.map((v) => v.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Delete Action Handlers
  const handleSingleDelete = (item: VocabularyItem) => {
    if (quickDeleteMode) {
      onDelete(item.id);
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      showToastMsg(`Đã xóa từ: ${item.article ? item.article + " " : ""}${item.word}`, "danger");
    } else {
      setDeleteConfirmItem(item);
    }
  };

  const confirmDeleteSingle = () => {
    if (deleteConfirmItem) {
      onDelete(deleteConfirmItem.id);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmItem.id));
      showToastMsg(`Đã xóa từ: ${deleteConfirmItem.word}`, "danger");
      setDeleteConfirmItem(null);
    }
  };

  const handleBatchDeleteExec = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (onDeleteBatch) {
      onDeleteBatch(selectedIds);
    } else {
      selectedIds.forEach((id) => onDelete(id));
    }
    showToastMsg(`Đã xóa thành công ${count} từ vựng!`, "danger");
    setSelectedIds([]);
    setShowBatchDeleteConfirm(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "danger"
              ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
              : "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
          }`}
        >
          {toast.type === "danger" ? <Trash2 className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-slate-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <span>
              Quản Lý <span className="text-white font-semibold">Từ Vựng ({totalItems.toLocaleString()})</span>
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Danh sách từ vựng tiếng Đức được lưu trữ trực tiếp trong hệ thống CSDL.
          </p>
        </div>

        {/* Action Buttons - Desktop / Tablet View */}
        <div className="hidden sm:flex sm:flex-wrap items-center gap-2.5">
          <button
            onClick={() => setQuickDeleteMode(!quickDeleteMode)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all h-10 ${
              quickDeleteMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title="Chế độ Xóa Nhanh: Bấm biểu tượng Thùng rác để xóa ngay lập tức mà không cần xác nhận lại"
          >
            <Zap className={`w-4 h-4 ${quickDeleteMode ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
            <span>{quickDeleteMode ? "Xóa Nhanh: BẬT" : "Xóa Nhanh: TẮT"}</span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl text-xs active:scale-[0.98] transition-all shadow-md shadow-emerald-950/20 h-10"
            title="Nhập nhanh từ vựng từ tệp Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Nhập File Excel</span>
          </button>

          {onResetSeed && (
            <button
              onClick={() => setShowResetSeedConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-semibold rounded-xl text-xs active:scale-[0.98] transition-all h-10"
              title="Khôi phục & nạp kho từ vựng mở rộng"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Nạp 1,000+ Từ Mở Rộng</span>
            </button>
          )}

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all text-xs h-10"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Từ Mới</span>
          </button>
        </div>

        {/* Action Buttons - Mobile Grid View */}
        <div className="grid grid-cols-2 gap-2 w-full sm:hidden">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md text-xs h-10 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Từ Mới</span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600/15 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs h-10 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Nhập Excel</span>
          </button>

          <button
            onClick={() => setQuickDeleteMode(!quickDeleteMode)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold h-10 active:scale-95 transition-all ${
              quickDeleteMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${quickDeleteMode ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
            <span>{quickDeleteMode ? "Xóa 1-Click" : "Xóa Nhanh"}</span>
          </button>

          {onResetSeed && (
            <button
              onClick={() => setShowResetSeedConfirm(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 text-indigo-300 border border-indigo-500/30 font-bold rounded-xl text-xs h-10 active:scale-95 transition-all"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Nạp 1,000+ Từ</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Batch Action Bar when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-300 text-sm">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-sm font-bold text-rose-200">Đã chọn {selectedIds.length} từ vựng</p>
              <p className="text-xs text-rose-300/80">Sẵn sàng thực hiện xóa hàng loạt nhanh chóng</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAllFilteredSelected && totalItems > paginatedFiltered.length && (
              <button
                onClick={toggleSelectAllFiltered}
                className="px-3.5 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded-xl text-xs font-semibold border border-indigo-500/40 transition-all"
              >
                Chọn Tất Cả {totalItems.toLocaleString()} Từ (Các Trang)
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
            >
              Bỏ Chọn Tất Cả
            </button>
            <button
              onClick={() => {
                if (quickDeleteMode) {
                  handleBatchDeleteExec();
                } else {
                  setShowBatchDeleteConfirm(true);
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Nhanh {selectedIds.length} Từ Đã Chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/50 p-4 border border-slate-700/50 rounded-[24px]">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Tìm từ vựng, nghĩa tiếng Việt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="Tất cả">Tất cả trình độ</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
        </div>

        <div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="Tất cả">Tất cả chủ đề</option>
            {dynamicCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vocabulary List Container - Mobile Cards + Desktop Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl sm:rounded-[24px] overflow-hidden shadow-xl">
        {/* Mobile View: Cards Layout */}
        <div className="block md:hidden p-3 space-y-3">
          {paginatedFiltered.map((v) => {
            const isSelected = selectedIds.includes(v.id);
            return (
              <div
                key={v.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-indigo-950/40 border-indigo-500/50 shadow-md"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleSelectOne(v.id)}
                      className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-700" />
                      )}
                    </button>

                    <div>
                      <div className="text-base font-bold text-white flex items-center gap-1.5">
                        {v.article && <span className="text-indigo-400 text-sm">{v.article}</span>}
                        <span>{v.word}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-300 mt-0.5">
                        {v.meaning}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {v.level}
                    </span>
                    {v.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60 max-w-[100px] truncate">
                        {v.category}
                      </span>
                    )}
                  </div>
                </div>

                {v.example_de && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400 italic">
                    “{v.example_de}”
                  </div>
                )}

                {/* Mobile Card Action Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const text = v.article ? `${v.article} ${v.word}` : v.word;
                        onSpeak?.(text, "de-DE", v);
                      }}
                      className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Nghe</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = v.article ? `${v.article} ${v.word}` : v.word;
                        onSpeak?.(text, "de-DE", v, 0.5);
                      }}
                      className="h-8 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-bold flex items-center gap-0.5 active:scale-95"
                      title="Nghe phát âm 0.5x"
                    >
                      <span>🐢 0.5x</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleFavorite(v.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        v.favorite ? "text-amber-400 bg-amber-400/10" : "text-slate-500 bg-slate-800/60"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${v.favorite ? "fill-current" : ""}`} />
                    </button>

                    <button
                      onClick={() => handleOpenModal(v)}
                      className="w-8 h-8 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleSingleDelete(v)}
                      className="w-8 h-8 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-500 italic text-xs">
              Không tìm thấy từ vựng nào phù hợp.
            </div>
          )}
        </div>

        {/* Desktop View: Full Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-mono uppercase tracking-wider text-indigo-400 border-b border-slate-700/50">
              <tr>
                <th className="p-4 w-12 text-center">
                  <button
                    onClick={toggleSelectPage}
                    className="text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center justify-center"
                    title={isAllPageSelected ? "Bỏ chọn tất cả từ trang này" : `Chọn tất cả ${paginatedFiltered.length} từ ở trang này`}
                  >
                    {isAllPageSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="p-4">Từ Tiếng Đức</th>
                <th className="p-4">Nghĩa Tiếng Việt</th>
                <th className="p-4">Trình Độ</th>
                <th className="p-4">Chủ Đề</th>
                <th className="p-4">Ví Dụ</th>
                <th className="p-4 text-center">Reviews</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedFiltered.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <tr
                    key={v.id}
                    className={`transition-colors ${
                      isSelected ? "bg-indigo-950/30" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleSelectOne(v.id)}
                        className="text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-700" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 font-bold text-slate-100">
                      <span className="text-indigo-400 mr-1.5">{v.article}</span>
                      <span>{v.word}</span>
                    </td>
                    <td className="p-4 font-medium text-slate-200">{v.meaning}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {v.level}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-400">{v.category}</td>
                    <td className="p-4 text-xs text-slate-400 italic max-w-xs truncate font-serif">
                      {v.example_de ? `“${v.example_de}”` : "-"}
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-slate-300">
                      {v.review_count || 0}
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          const text = v.article ? `${v.article} ${v.word}` : v.word;
                          onSpeak?.(text, "de-DE", v);
                        }}
                        title="Nghe phát âm chuẩn (Theo cài đặt)"
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                      </button>
                      <button
                        onClick={() => {
                          const text = v.article ? `${v.article} ${v.word}` : v.word;
                          onSpeak?.(text, "de-DE", v, 0.5);
                        }}
                        title="Nghe phát âm rất chậm (0.5x)"
                        className="px-2 py-1 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-0.5"
                      >
                        <span>🐢 0.5x</span>
                      </button>
                      <button
                        onClick={() => onToggleFavorite(v.id)}
                        title="Yêu thích"
                        className={`p-2 rounded-lg transition-colors ${
                          v.favorite ? "text-amber-400 hover:bg-amber-400/10" : "text-slate-500 hover:bg-slate-800"
                        }`}
                      >
                        <Star className={`w-4 h-4 ${v.favorite ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(v)}
                        title="Chỉnh sửa"
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSingleDelete(v)}
                        title={quickDeleteMode ? "Xóa ngay lập tức (1-click)" : "Xóa từ vựng"}
                        className="p-2 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                    Không tìm thấy từ vựng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="bg-slate-900/90 border-t border-slate-700/50 p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Hiển thị <strong className="text-indigo-300 font-bold">{startIndex + 1}</strong> - <strong className="text-indigo-300 font-bold">{endIndex}</strong> trong tổng số <strong className="text-white font-bold">{totalItems.toLocaleString()}</strong> từ vựng
              </span>

              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-700/70">
                <span className="text-slate-400">Tối đa:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                >
                  <option value={25}>25 từ / trang</option>
                  <option value={50}>50 từ / trang (Mặc định)</option>
                  <option value={100}>100 từ / trang</option>
                  <option value={200}>200 từ / trang</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Trang đầu tiên"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map((p, idx) => (
                    typeof p === "number" ? (
                      <button
                        key={idx}
                        onClick={() => handlePageChange(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          p === safeCurrentPage
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-slate-500 font-bold">
                        ...
                      </span>
                    )
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>

                {/* Jump to page */}
                {totalPages > 5 && (
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700/70">
                    <span className="text-slate-400">Đến trang:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={safeCurrentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handlePageChange(val);
                        }
                      }}
                      className="w-14 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 text-center text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-400">/ {totalPages}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Single Delete (when Quick Delete Mode is OFF) */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-100">Xác Nhận Xóa Từ Vựng</h3>
            </div>
            <p className="text-sm text-slate-300">
              Bạn có chắc chắn muốn xóa từ{" "}
              <strong className="text-rose-400">
                {deleteConfirmItem.article ? deleteConfirmItem.article + " " : ""}
                {deleteConfirmItem.word}
              </strong>{" "}
              ({deleteConfirmItem.meaning}) khỏi cơ sở dữ liệu không?
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteSingle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Batch Delete */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-100">Xác Nhận Xóa Hàng Loạt</h3>
            </div>
            <p className="text-sm text-slate-300">
              Bạn sắp xóa <strong className="text-rose-400">{selectedIds.length} từ vựng</strong> đã chọn.
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleBatchDeleteExec}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30"
              >
                Xóa {selectedIds.length} Từ Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Reset Seed */}
      {showResetSeedConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-indigo-400">
              <Database className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-100">Bổ Sung Bộ Từ Vựng Mở Rộng</h3>
            </div>
            <p className="text-sm text-slate-300">
              Thao tác này sẽ bổ sung các từ vựng mẫu (1,000+ từ chuẩn A1-B2) vào danh sách hiện tại của bạn. Các từ bạn đã import hoặc thêm vào sẽ <strong className="text-emerald-400">được giữ nguyên 100%</strong>.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setShowResetSeedConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowResetSeedConfirm(false);
                  if (onResetSeed) onResetSeed();
                  showToastMsg("Đã bổ sung thành công bộ từ vựng mở rộng!");
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30"
              >
                Đồng Ý Bổ Sung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-slate-100">
                {editingItem ? "Chỉnh Sửa Từ Vựng" : "Thêm Từ Vựng Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mạo Từ</label>
                  <select
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Rỗng</option>
                    <option value="der">der</option>
                    <option value="die">die</option>
                    <option value="das">das</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Từ Tiếng Đức (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Apfel..."
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nghĩa Tiếng Việt (*)
                </label>
                <input
                  type="text"
                  required
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Quả táo..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Trình Độ</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chủ Đề</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                  >
                    {Array.from(
                      new Set([...dynamicCategories, category].filter(Boolean))
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ví dụ Tiếng Đức
                </label>
                <input
                  type="text"
                  value={exampleDe}
                  onChange={(e) => setExampleDe(e.target.value)}
                  placeholder="Ich esse einen Apfel..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dịch ví dụ Tiếng Việt
                </label>
                <input
                  type="text"
                  value={exampleVi}
                  onChange={(e) => setExampleVi(e.target.value)}
                  placeholder="Tôi ăn một quả táo..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={favorite}
                    onChange={(e) => setFavorite(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded bg-slate-800 border-slate-700"
                  />
                  <span>Đánh dấu từ vựng Yêu Thích ⭐</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={onImport} // <-- THÊM DÒNG NÀY
        onImportSuccess={() => {
          showToastMsg("Nhập danh sách từ vựng thành công!");
        }}
      />
    </div>
  );
};
