const EARLIEST_DATE = '2012-01-01';

function formatLongDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function validateStartDate(startDate, latestDate) {
  if (!startDate) {
    return { valid: false, error: 'Please select a start date.' };
  }

  if (startDate < EARLIEST_DATE) {
    return {
      valid: false,
      error: `Start date cannot be before ${formatLongDate(EARLIEST_DATE)}. Price data is not available for earlier dates.`,
    };
  }

  if (latestDate && startDate > latestDate) {
    return {
      valid: false,
      error: `Start date cannot be after ${latestDate}, the latest date in our price data.`,
    };
  }

  return { valid: true, error: null };
}

function emptyResult() {
  return {
    totalInvested: 0,
    totalBtc: 0,
    averageBuyPrice: 0,
    currentValue: 0,
    profitLoss: 0,
    profitLossPct: 0,
    chartData: [],
    latestPrice: 0,
  };
}

function calculateDCA(priceData, startDate, dailyAmount) {
  const days = priceData.filter((d) => d.date >= startDate);

  if (days.length === 0 || dailyAmount <= 0 || startDate < EARLIEST_DATE) {
    return emptyResult();
  }

  let totalInvested = 0;
  let totalBtc = 0;
  const chartData = [];

  for (const day of days) {
    totalInvested += dailyAmount;
    totalBtc += dailyAmount / day.close;
    chartData.push({
      date: day.date,
      invested: totalInvested,
      value: totalBtc * day.close,
    });
  }

  const latestPrice = days[days.length - 1].close;
  const currentValue = totalBtc * latestPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPct = totalInvested > 0 ? profitLoss / totalInvested : 0;
  const averageBuyPrice = totalBtc > 0 ? totalInvested / totalBtc : 0;

  return {
    totalInvested,
    totalBtc,
    averageBuyPrice,
    currentValue,
    profitLoss,
    profitLossPct,
    chartData,
    latestPrice,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDCA, EARLIEST_DATE, validateStartDate };
}

if (typeof window !== 'undefined') {
  window.calculateDCA = calculateDCA;
  window.EARLIEST_DATE = EARLIEST_DATE;
  window.validateStartDate = validateStartDate;
}
