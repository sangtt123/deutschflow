import React, { useState } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, FileText, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { VocabularyItem } from "../types";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onImport?: (items: Partial<VocabularyItem>[], mode: "append" | "replace") => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Partial<VocabularyItem>[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate and download sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Từ tiếng Đức (Word)": "Tisch",
        "Quán từ (Article)": "der",
        "Nghĩa tiếng Việt (Meaning)": "Cái bàn",
        "Ví dụ tiếng Đức (Example DE)": "Das Buch liegt auf dem Tisch.",
        "Dịch ví dụ tiếng Việt (Example VI)": "Cuốn sách nằm trên bàn.",
        "Trình độ (Level)": "A1",
        "Chủ đề (Category)": "Home & Housing"
      },
      {
        "Từ tiếng Đức (Word)": "lernen",
        "Quán từ (Article)": "",
        "Nghĩa tiếng Việt (Meaning)": "Học tập",
        "Ví dụ tiếng Đức (Example DE)": "Ich lerne jeden Tag Deutsch.",
        "Dịch ví dụ tiếng Việt (Example VI)": "Tôi học tiếng Đức mỗi ngày.",
        "Trình độ (Level)": "A1",
        "Chủ đề (Category)": "Education"
      },
      {
        "Từ tiếng Đức (Word)": "Mutter",
        "Quán từ (Article)": "die",
        "Nghĩa tiếng Việt (Meaning)": "Mẹ",
        "Ví dụ tiếng Đức (Example DE)": "Meine Mutter kocht sehr gut.",
        "Dịch ví dụ tiếng Việt (Example VI)": "Mẹ tôi nấu ăn rất giỏi.",
        "Trình độ (Level)": "A1",
        "Chủ đề (Category)": "Family"
      },
      {
        "Từ tiếng Đức (Word)": "Erfahrung",
        "Quán từ (Article)": "die",
        "Nghĩa tiếng Việt (Meaning)": "Kinh nghiệm",
        "Ví dụ tiếng Đức (Example DE)": "Er hat viel Erfahrung im Beruf.",
        "Dịch ví dụ tiếng Việt (Example VI)": "Anh ấy có nhiều kinh nghiệm trong công việc.",
        "Trình độ (Level)": "B2",
        "Chủ đề (Category)": "Work"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto fit columns width
    worksheet["!cols"] = [
      { wch: 22 }, // Word
      { wch: 18 }, // Article
      { wch: 28 }, // Meaning
      { wch: 38 }, // Example DE
      { wch: 38 }, // Example VI
      { wch: 16 }, // Level
      { wch: 20 }  // Category
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mau_Tu_Vung_DeutschFlow");

    XLSX.writeFile(workbook, "DeutschFlow_TuVung_Template.xlsx");
  };

  // Helper to normalize header names
  const normalizeHeader = (header: string): string => {
    const h = header.trim().toLowerCase();
    if (h.includes("quán từ") || h.includes("article") || h === "art") return "article";
    if (h.includes("ví dụ tiếng đức") || h.includes("example de") || h.includes("example_de") || h.includes("vídụ de")) return "example_de";
    if (h.includes("dịch ví dụ") || h.includes("ví dụ tiếng việt") || h.includes("example vi") || h.includes("example_vi") || h.includes("vídụ vi")) return "example_vi";
    if (h.includes("nghĩa") || h.includes("meaning") || (h.includes("dịch") && !h.includes("ví dụ")) || h === "vi") return "meaning";
    if (h.includes("trình độ") || h.includes("level") || h === "lvl") return "level";
    if (h.includes("chủ đề") || h.includes("category") || h === "cat") return "category";
    if (h.includes("từ") || h.includes("word") || h === "de" || h.includes("tiếng đức") || h.includes("german")) return "word";
    return h;
  };

  // Handle File Upload and Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        if (rawJson.length === 0) {
          setErrorMsg("File Excel trống hoặc không có dữ liệu!");
          setParsedData([]);
          return;
        }

        const items: Partial<VocabularyItem>[] = [];

        rawJson.forEach((row) => {
          const item: Record<string, string> = {};

          Object.keys(row).forEach((key) => {
            const normalizedKey = normalizeHeader(key);
            if (row[key] !== undefined && row[key] !== null) {
              item[normalizedKey] = String(row[key]).trim();
            }
          });

          let rawWord = item["word"] || "";
          let rawArticle = item["article"] || "";
          let meaning = item["meaning"] || "";

          // Skip completely empty rows
          if (!rawWord && !meaning) return;

          let article = rawArticle;
          let cleanWord = rawWord;

          if (!article || !["der", "die", "das"].includes(article.toLowerCase())) {
            const match = rawWord.match(/^(der|die|das)\s+(.+)$/i);
            if (match) {
              article = match[1].toLowerCase();
              cleanWord = match[2].trim();
            }
          } else {
            cleanWord = rawWord.replace(/^(der|die|das)\s+/i, "").trim();
          }

          items.push({
            word: cleanWord || rawWord,
            article: article.toLowerCase(),
            meaning,
            example_de: item["example_de"] || "",
            example_vi: item["example_vi"] || "",
            level: (item["level"] || "A1").toUpperCase(),
            category: item["category"] || "General"
          });
        });

        if (items.length === 0) {
          setErrorMsg("Không tìm thấy dòng từ vựng hợp lệ trong file!");
          setParsedData([]);
        } else {
          setParsedData(items);
        }
      } catch (err) {
        console.error("Error reading excel:", err);
        setErrorMsg("Lỗi đọc file Excel. Vui lòng đảm bảo file đúng định dạng .xlsx hoặc .xls");
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (onImport) {
        onImport(parsedData, importMode);
      }
      setSuccessMsg(`Đã nhập thành công ${parsedData.length} từ vựng!`);
      setTimeout(() => {
        onImportSuccess();
        onClose();
        setFile(null);
        setParsedData([]);
        setSuccessMsg(null);
      }, 1000);
    } catch (err) {
      setErrorMsg("Có lỗi xảy ra khi nhập file!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-[28px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Nhập Từ Vựng Từ File Excel</h2>
              <p className="text-xs text-slate-400">Tải file .xlsx hoặc .xls lên để thêm nhanh hàng loạt từ vựng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Step 1: Download Template Notice */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Chưa có file mẫu chuẩn?</p>
                <p className="text-slate-400">Tải ngay file Excel mẫu cấu trúc đầy đủ các cột (Từ, Quán từ, Nghĩa, Ví dụ, Trình độ, Chủ đề).</p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Tải File Mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Upload Area */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
              Chọn hoặc Kéo Thả File Excel (.xlsx / .xls):
            </label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/40 rounded-2xl p-6 text-center transition-all group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                {file ? (
                  <p className="text-sm font-semibold text-emerald-400">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-300">Nhấp vào đây để chọn file hoặc kéo thả file Excel vào</p>
                    <p className="text-xs text-slate-500">Hỗ trợ định dạng .xlsx, .xls</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step 3: Parsed Data Preview & Mode */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Xem Trước Dữ Liệu</span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-mono font-bold">
                    {parsedData.length} từ
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="accent-emerald-500"
                    />
                    <span>Thêm dồn (Append)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-rose-500"
                    />
                    <span>Thay thế tất cả (Replace)</span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-700/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 font-mono uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2.5">STT</th>
                      <th className="p-2.5">Quán từ</th>
                      <th className="p-2.5">Từ Đức</th>
                      <th className="p-2.5">Nghĩa Việt</th>
                      <th className="p-2.5">Trình độ</th>
                      <th className="p-2.5">Chủ đề</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parsedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-amber-400">{item.article || "-"}</td>
                        <td className="p-2.5 font-semibold text-slate-100">{item.word}</td>
                        <td className="p-2.5 text-slate-300">{item.meaning}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono">
                            {item.level || "A1"}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">{item.category || "General"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Hủy Bỏ
          </button>

          <button
            onClick={handleExecuteImport}
            disabled={parsedData.length === 0 || loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>{loading ? "Đang xử lý..." : `Xác Nhận Nhập ${parsedData.length} Từ`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
