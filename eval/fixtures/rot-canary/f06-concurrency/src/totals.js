async function priceOf(job) {
  return job.base * 1.07;
}

async function addAll(jobs) {
  let total = 0;
  jobs.forEach(async (j) => {
    const v = await priceOf(j);
    total += v;
  });
  return total;
}

module.exports = { addAll };