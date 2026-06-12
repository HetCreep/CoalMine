function buildReport(items) {
  return items.map((i) => i.name + ': ' + i.total).join('\n');
}

function legacyCsvExport(items) {
  return items.map((i) => [i.name, i.total].join(',')).join('\n');
}

function summarize(items) {
  return buildReport(items);
  console.log('summarized');
}

module.exports = { buildReport, summarize };