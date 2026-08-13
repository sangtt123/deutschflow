const fs = require('fs');
const XLSX = require('xlsx');

// Tên file JSON nguồn và tên file Excel xuất ra
const jsonFile = 'data_web.json';
const outputFile = 'DeutschFlow_TuVung_2000_A1-B1_Sach_Nghia_Viet_RaSoat_Updated.xlsx';

if (!fs.existsSync(jsonFile)) {
  console.error(`❌ Không tìm thấy file ${jsonFile} ở thư mục gốc!`);
  process.exit(1);
}

const rawData = fs.readFileSync(jsonFile, 'utf-8');
const data = JSON.parse(rawData);
const vocabList = data.vocabularies || [];

// Ánh xạ các trường dữ liệu sang tiêu đề cột Excel
const excelRows = vocabList.map(item => ({
  'Từ tiếng Đức (Word)': item.word || '',
  'Quán từ (Article)': item.article || '',
  'Nghĩa tiếng Việt (Meaning)': item.meaning || '',
  'Ví dụ tiếng Đức (Example DE)': item.example_de || '',
  'Dịch ví dụ tiếng Việt (Example VI)': item.example_vi || '',
  'Trình độ (Level)': item.level || 'A1',
  'Chủ đề (Category)': item.category || 'General'
}));

// Tạo Sheet và Workbook
const worksheet = XLSX.utils.json_to_sheet(excelRows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Tu_Vung_DeutschFlow');

// Xuất file Excel
XLSX.writeFile(workbook, outputFile);

console.log(`\n🎉 THÀNH CÔNG! ĐÃ CẬP NHẬT ${excelRows.length} TỪ VỰNG RA FILE EXCEL: ${outputFile}`);