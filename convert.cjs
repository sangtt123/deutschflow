const fs = require('fs');
const XLSX = require('xlsx');

// Tên file Excel của bạn ở thư mục gốc
const excelFileName = 'DeutschFlow_TuVung_2000_A1-B1_Sach_Nghia_Viet_RaSoat_Updated.xlsx';

if (!fs.existsSync(excelFileName)) {
  console.error(`❌ Không tìm thấy file ${excelFileName} ở thư mục gốc!`);
  process.exit(1);
}

const workbook = XLSX.readFile(excelFileName);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

const catMap = {
  'Giao tiếp': 'Communication',
  'Công việc': 'Work',
  'Quan hệ': 'Family',
  'Nhà ở': 'Home',
  'Gia đình': 'Family',
  'Ngôn ngữ': 'Education',
  'Học tập': 'Education'
};

// 1. Gom nhóm từ vựng theo Chủ đề gốc
const grouped = {};
rawJson.forEach((row) => {
  let word = String(row['Từ tiếng Đức (Word)'] || "").trim();
  let article = String(row['Quán từ (Article)'] || "").trim();
  let meaning = String(row['Nghĩa tiếng Việt (Meaning)'] || "").trim();
  let example_de = String(row['Ví dụ tiếng Đức (Example DE)'] || "").trim();
  let example_vi = String(row['Dịch ví dụ tiếng Việt (Example VI)'] || "").trim();
  let level = String(row['Trình độ (Level)'] || "A1").trim();
  let category = String(row['Chủ đề (Category)'] || "General").trim();

  if (!word && !meaning) return;

  if (catMap[category]) {
    category = catMap[category];
  }

  if (!grouped[category]) {
    grouped[category] = [];
  }
  grouped[category].push({ word, article, meaning, example_de, example_vi, level, category });
});

// 2. Chia nhỏ chủ đề: tối đa 20 từ / chủ đề
const chunkSize = 20;
const vocabList = [];

Object.keys(grouped).forEach((catName) => {
  const items = grouped[catName];
  if (items.length <= chunkSize) {
    items.forEach(item => {
      item.category = catName;
      vocabList.push(item);
    });
  } else {
    items.forEach((item, idx) => {
      const partNum = Math.floor(idx / chunkSize) + 1;
      item.category = `${catName} - Chủ đề ${partNum}`;
      vocabList.push(item);
    });
  }
});

// 3. Ghi đè vào file server/vocabularies.ts
const tsContent = `export interface SeedVocabulary {
  word: string;
  article: string;
  meaning: string;
  example_de: string;
  example_vi: string;
  level: string;
  category: string;
}

export const SEED_VOCABULARIES: SeedVocabulary[] = ${JSON.stringify(vocabList, null, 2)};

export function getExpandedVocabularies(): SeedVocabulary[] {
  return SEED_VOCABULARIES;
}
`;

fs.writeFileSync('server/vocabularies.ts', tsContent, 'utf-8');
console.log(`\n THÀNH CÔNG! ĐÃ CHUYỂN ĐỔI ${vocabList.length} TỪ VỰNG VÀO SERVER/VOCABULARIES.TS`);