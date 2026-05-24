#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'btc_daily.csv');
const COINGECKO_BASE =
  'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range';

function formatDateUTC(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateUTC(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function addDays(dateStr, days) {
  const date = parseDateUTC(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateUTC(date);
}

function latestAvailableDate() {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const latest = new Date(todayUtc);
  latest.setUTCDate(latest.getUTCDate() - 1);

  // CoinGecko publishes the last completed UTC day at 00:35 UTC.
  const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (minutesUtc < 35) {
    latest.setUTCDate(latest.getUTCDate() - 1);
  }

  return formatDateUTC(latest);
}

function readLastDate() {
  const content = fs.readFileSync(CSV_PATH, 'utf8').trim();
  if (!content) {
    throw new Error(`${CSV_PATH} is empty`);
  }

  const lines = content.split('\n');
  if (lines.length < 2) {
    throw new Error(`${CSV_PATH} has no data rows`);
  }

  const header = lines[0].trim();
  if (header !== 'Date,Close') {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const lastLine = lines[lines.length - 1].trim();
  const [date] = lastLine.split(',');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date in last CSV row: ${lastLine}`);
  }

  return date;
}

function formatPrice(price) {
  return Number(price.toFixed(2)).toString();
}

function pricesToDailyRows(prices) {
  const byDay = new Map();

  for (const [timestampMs, price] of prices) {
    const day = formatDateUTC(new Date(timestampMs));
    byDay.set(day, price);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, close: formatPrice(price) }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDailyPrices(fromDate, toDate) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    from: fromDate,
    to: toDate,
    interval: 'daily',
  });

  const url = `${COINGECKO_BASE}?${params}`;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) {
      if (attempt === maxAttempts) {
        throw new Error(
          'CoinGecko API rate limit exceeded. Wait a minute and try again.'
        );
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : attempt * 20000;
      console.log(
        `Rate limited by CoinGecko. Retrying in ${Math.round(waitMs / 1000)}s…`
      );
      await sleep(waitMs);
      continue;
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.prices)) {
      throw new Error('Unexpected CoinGecko API response');
    }

    return data.prices;
  }

  throw new Error('Failed to fetch prices from CoinGecko');
}

function appendRows(rows) {
  if (rows.length === 0) {
    return;
  }

  let content = fs.readFileSync(CSV_PATH, 'utf8');
  if (!content.endsWith('\n')) {
    content += '\n';
  }

  const newLines = rows.map(({ date, close }) => `${date},${close}`).join('\n');
  fs.writeFileSync(CSV_PATH, `${content}${newLines}\n`, 'utf8');
}

async function main() {
  const lastDate = readLastDate();
  const latestAvailable = latestAvailableDate();
  const nextDate = addDays(lastDate, 1);

  console.log(`Last date in CSV:      ${lastDate}`);
  console.log(`Latest available date: ${latestAvailable}`);

  if (nextDate > latestAvailable) {
    console.log('CSV is already up to date.');
    return;
  }

  console.log(`Fetching ${nextDate} → ${latestAvailable} from CoinGecko…`);

  const prices = await fetchDailyPrices(nextDate, latestAvailable);
  const rows = pricesToDailyRows(prices).filter((row) => row.date >= nextDate);

  if (rows.length === 0) {
    console.log('No new daily prices returned. CSV is already up to date.');
    return;
  }

  appendRows(rows);

  console.log(`Added ${rows.length} day(s):`);
  for (const row of rows) {
    console.log(`  ${row.date}  $${row.close}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
