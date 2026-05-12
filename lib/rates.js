/**
 * BNR exchange rates and currency helpers.
 *
 * Single source of truth for the BNR annual-average exchange rates used
 * across the app for converting EUR/USD amounts to RON in capital gains,
 * dividend and interest calculations.
 *
 * Source: https://www.bnr.ro/1975-cursul-de-schimb-serii-statistice
 */

const BNR_EXCHANGE_RATES = {
  2019: { usdRon: 4.2379, eurRon: 4.7452, source: 'BNR' },
  2020: { usdRon: 4.2440, eurRon: 4.8371, source: 'BNR' },
  2021: { usdRon: 4.1604, eurRon: 4.9204, source: 'BNR' },
  2022: { usdRon: 4.6885, eurRon: 4.9315, source: 'BNR' },
  2023: { usdRon: 4.5743, eurRon: 4.9465, source: 'BNR' },
  2024: { usdRon: 4.5984, eurRon: 4.9746, source: 'BNR' },
  2025: { usdRon: 4.4705, eurRon: 5.0415, source: 'BNR' },
};

/**
 * Convert an amount in the given currency code to RON using BNR annual averages.
 * - Falsy amounts return 0.
 * - RON (or unknown currencies) return the amount as-is.
 * - For unknown years, leaves the amount unchanged; callers should warn.
 */
function toRON(amount, currency, year) {
  const cur = String(currency || 'RON').toUpperCase();
  if (!amount) return amount || 0;
  if (cur === 'RON') return amount;
  const rates = BNR_EXCHANGE_RATES[year];
  if (!rates) return amount;
  if (cur === 'EUR') return amount * rates.eurRon;
  if (cur === 'USD') return amount * rates.usdRon;
  return amount;
}

/**
 * Parse a numeric string.
 * Compatible with US-style thousand separators (e.g. "1,234.56" → 1234.56).
 * Returns NaN for non-numeric input (callers typically use `value || 0`).
 */
function parseNumber(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/,/g, ''));
}

/**
 * Detect the currency of an XTB report row.
 * XTB Romania reports default to RON (column header says "în RON"), but rows
 * occasionally carry their own "(în EUR)" / "USD" hint in the description.
 *
 * Note: we avoid `\bîn` because `î` is not a word character in JS regex without
 * the /u flag, which would cause valid Romanian phrases like "în EUR" to be
 * skipped. We use a non-word lookbehind on a space or start-of-text instead.
 */
function detectCurrency(rowText, fullText) {
  const t = String(rowText || '');
  if (/\bEUR\b/i.test(t)) return 'EUR';
  if (/\bUSD\b/i.test(t)) return 'USD';
  if (/\bRON\b/i.test(t)) return 'RON';
  // Fall back to whatever the document header says ("în EUR" / "în USD").
  if (fullText && /(?:^|\s)în\s+EUR\b/i.test(fullText) && !/(?:^|\s)în\s+RON\b/i.test(fullText)) return 'EUR';
  if (fullText && /(?:^|\s)în\s+USD\b/i.test(fullText) && !/(?:^|\s)în\s+RON\b/i.test(fullText)) return 'USD';
  return 'RON';
}

module.exports = {
  BNR_EXCHANGE_RATES,
  toRON,
  parseNumber,
  detectCurrency,
};
