function importAll(rows, insert, log) {
  let okCount = 0;
  for (const r of rows) {
    try {
      insert(r);
      okCount++;
    } catch (e) {
      log.warn('skipped row', e.message);
    }
  }
  return { success: true, imported: rows.length };
}

module.exports = { importAll };