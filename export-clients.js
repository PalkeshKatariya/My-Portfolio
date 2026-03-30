const db = require('./database');
const fs = require('fs');

db.all('SELECT * FROM clients ORDER BY created_at DESC', (err, rows) => {
  if (err) {
    console.error('Error fetching clients:', err);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No client inquiries found.');
    process.exit(0);
  }

  // Display in console
  console.log('📧 CLIENT INQUIRIES\n');
  console.table(rows);

  // Export to JSON file
  const exportData = {
    exportDate: new Date().toISOString(),
    totalInquiries: rows.length,
    inquiries: rows
  };

  fs.writeFileSync('client-data.json', JSON.stringify(exportData, null, 2));
  console.log('\n✅ Data exported to client-data.json');

  // Export to CSV
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]).join(',');
    const csvData = rows.map(row =>
      Object.values(row).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n');

    fs.writeFileSync('client-data.csv', headers + '\n' + csvData);
    console.log('✅ Data exported to client-data.csv');
  }

  process.exit(0);
});