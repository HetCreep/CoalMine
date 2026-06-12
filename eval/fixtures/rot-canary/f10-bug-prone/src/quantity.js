const cart = {};

function setQuantity(raw) {
  const qty = parseInt(raw, 10);
  if (qty == null || qty < 0) {
    throw new Error('invalid quantity');
  }
  cart.qty = qty;
  return cart.qty;
}

module.exports = { setQuantity };