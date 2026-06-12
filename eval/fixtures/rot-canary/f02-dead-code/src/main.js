const { slugify } = require('./util');

function makeUrl(title) {
  return '/posts/' + slugify(title);
}

module.exports = { makeUrl };