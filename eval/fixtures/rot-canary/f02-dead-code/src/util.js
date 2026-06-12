function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { slugify, titleCase };