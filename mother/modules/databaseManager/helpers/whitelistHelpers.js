const whitelist = require('../config/tableWhitelist.json');

function isTableAllowed(moduleName, table) {
  const mod = whitelist[moduleName] || {};
  return Object.prototype.hasOwnProperty.call(mod, table);
}

function areColumnsAllowed(moduleName, table, columns) {
  const mod = whitelist[moduleName] || {};
  const allowed = mod[table];
  if (!allowed) return false;
  return columns.every(c => allowed.includes(c));
}

module.exports = { isTableAllowed, areColumnsAllowed };
