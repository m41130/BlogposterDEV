const fs = require('fs');
const path = require('path');

function pgTables() {
  const file = path.join(__dirname, '../mother/modules/databaseManager/placeholders/postgresPlaceholders.js');
  const code = fs.readFileSync(file, 'utf8');
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+([^\s(]+)/gi;
  const tables = new Set();
  let m;
  while ((m = tableRegex.exec(code)) !== null) {
    let name = m[1].replace(/["`]/g, '');
    if (name.includes('.')) {
      const [schema, table] = name.split('.');
      name = schema === 'plainspace' ? `${schema}_${table}` : table;
    }
    tables.add(name);
  }
  return Array.from(tables).sort();
}

function mongoCollections() {
  const file = path.join(__dirname, '../mother/modules/databaseManager/placeholders/mongoPlaceholders.js');
  const code = fs.readFileSync(file, 'utf8');
  const direct = /createCollection\(['"]([^'"\)]+)['"]\)/gi;
  const variable = /const\s+collectionName\s*=\s*['"]([^'"]+)['"]/gi;
  const cols = new Set();
  let m;
  while ((m = direct.exec(code)) !== null) cols.add(m[1]);
  while ((m = variable.exec(code)) !== null) cols.add(m[1]);
  cols.delete('widgetmanager_widgets'); // collection only used in Mongo
  return Array.from(cols).sort();
}

test('Mongo collections match Postgres tables across modules', () => {
  expect(mongoCollections()).toEqual(pgTables());
});
