async function fetchAll(ids, fetchOne) {
  const results = await Promise.all(ids.map((id) => fetchOne(id)));
  return results.filter((r) => r !== null);
}

module.exports = { fetchAll };