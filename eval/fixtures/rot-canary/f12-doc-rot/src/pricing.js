// Returns the average of all item prices.
function averagePrice(items) {
  return items.reduce((s, i) => s + i.price, 0);
}

module.exports = { averagePrice };