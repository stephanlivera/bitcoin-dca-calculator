# Bitcoin DCA Calculator

! (dcascreenshot.png)

A single-page web app that simulates dollar-cost averaging (DCA) into Bitcoin using historical daily closing prices. Pick a start date and daily investment amount, and the calculator shows how your portfolio would have performed over time.

## Features

- Dark, card-based UI built with [Tailwind CSS](https://tailwindcss.com/)
- Configurable start date and daily investment (USD)
- Summary cards: total invested, total BTC, current value, profit/loss (with percentage)
- Portfolio growth chart (portfolio value vs. total invested) powered by [Chart.js](https://www.chartjs.org/)
- Historical price data from `btc_daily.csv` (2012–present)

## Project files


| File                    | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `index.html`            | The DCA calculator (HTML, CSS, and JavaScript)              |
| `btc_daily.csv`         | Daily BTC/USD closing prices (`Date`, `Close`)              |
| `dca.js`                | Core DCA calculation logic                                  |
| `dca.test.js`           | Jest unit tests for `dca.js`                                |
| `update.js`             | Script to append missing days from the CoinGecko API        |
| `btcusd_1-min_data.csv` | Original 1-minute source data (used to build the daily CSV) |


## Requirements

- A modern web browser
- [Node.js](https://nodejs.org/) 18+ (for `update.js` and tests)

## Run the calculator locally

The calculator loads `btc_daily.csv` over HTTP, so you need a local web server. Opening `index.html` directly in the browser (`file://`) will not work.

From the project folder:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

Other local servers work too, for example:

```bash
npx serve .
```

## Update price data

To fetch the latest daily Bitcoin prices and append any missing days to `btc_daily.csv`:

```bash
node update.js
```

The script:

1. Reads the most recent date in `btc_daily.csv`
2. Fetches new daily prices from the free [CoinGecko API](https://www.coingecko.com/en/api)
3. Appends missing rows in `YYYY-MM-DD` format with the closing price
4. Prints a message if the CSV is already up to date

Example output when new data is added:

```
Last date in CSV:      2026-05-19
Latest available date: 2026-05-21
Fetching 2026-05-20 → 2026-05-21 from CoinGecko…
Added 2 day(s):
  2026-05-20  $76808.81
  2026-05-21  $77459.94
```

**Keep data current:** the GitHub Actions workflow updates prices daily; you can also run `node update.js` locally anytime if needed. CoinGecko publishes each completed UTC day shortly after midnight UTC; if you run the script too early in the day, yesterday’s price may not be available yet.

If you hit CoinGecko rate limits, wait a minute and run the script again.

### Automated updates (GitHub Actions)

A workflow in `[.github/workflows/update-btc-prices.yml](.github/workflows/update-btc-prices.yml)` runs `node update.js` **once per day** at 12:00 UTC and commits any changes to `btc_daily.csv`. If the CSV is already current, the workflow finishes without a commit. You can also trigger it manually from the **Actions** tab → **Update BTC daily prices** → **Run workflow**.

For pushes to work, enable **Settings → Actions → General → Workflow permissions → Read and write permissions**.

## Testing

The project includes Jest unit tests for the core DCA calculation logic in `dca.js` (see `dca.test.js`). These tests validate the mathematical accuracy of dollar-cost averaging calculations, including total invested, average buy price, and edge cases such as zero investment amounts.

Run the test suite:

```bash
npm test
```

To re-run tests automatically when you save a file:

```bash
npm run test:watch
```

## How the calculation works

For each day from your chosen start date through the last date in the CSV:

1. Invest the daily USD amount at that day’s closing price
2. Accumulate total BTC purchased
3. Value the portfolio using the latest closing price in the dataset

The chart plots portfolio value and cumulative amount invested over time.

## Data notes

- **Original daily data** was derived from `btcusd_1-min_data.csv` by taking the closing price at the last timestamp of each UTC day.
- **Updates via `update.js`** use CoinGecko daily prices. Values may differ slightly from the original minute-based closes for the same date.
- Results are for simulation and education only — not financial advice.

## License

Use and modify as you like for personal or educational purposes.