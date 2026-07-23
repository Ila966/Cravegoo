const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

try {
  const filePath = path.join(__dirname, '../database_sheets/drivers.xlsx');
  console.log('File path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  if (fs.existsSync(filePath)) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Successfully read xlsx! Data count:', data.length);
    console.log('First row:', data[0]);
  }
} catch (err) {
  console.error('❌ Error reading Excel file:', err);
}
