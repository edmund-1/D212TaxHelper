/**
 * XTB Romania report parsers.
 *
 * Parses two report types from XTB S.A. Varsovia Sucursala București:
 *   1. RAPORT DIVIDENDE SI DOBANZI — dividends + interest paid in the period
 *   2. FIŞĂ DE PORTOFOLIU — capital gains/losses per country and holding bucket
 *
 * Both parsers handle multi-row reports and per-row currency (RON / EUR / USD),
 * converting non-RON amounts to RON using BNR annual averages.
 */

const { toRON, parseNumber, detectCurrency } = require('../rates');

/**
 * Parse the XTB Dividends & Interest annual report.
 * Returns aggregated RON totals (backwards-compatible scalars) plus per-row
 * detail in dividendRows[] and interestRows[].
 */
function parseXtbDividends(text, year) {
  const result = {
    year,
    source: 'XTB Romania',
    dividends: { grossRON: 0, taxWithheldRON: 0, netRON: 0, category: '' },
    interest: { grossRON: 0, taxWithheldRON: 0, netRON: 0, payer: '' },
    dividendRows: [],
    interestRows: []
  };

  const splitIdx = text.search(/venit\s+anual\s+din\s+dob[aâ]nzi/i);
  const dividendsText = splitIdx >= 0 ? text.slice(0, splitIdx) : text;
  const interestText = splitIdx >= 0 ? text.slice(splitIdx) : '';

  const ROW_RE = /^\s*(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(.+)$/gm;

  for (const m of dividendsText.matchAll(ROW_RE)) {
    const gross = parseNumber(m[2]);
    const tax = parseNumber(m[3]);
    const net = parseNumber(m[4]);
    const desc = m[5].trim();
    if (!gross && !tax && !net) continue;
    if (!/Instrumente|dividende|actiun|acțiun/i.test(desc)) continue;
    const currency = detectCurrency(desc, text);
    const grossRON = toRON(gross, currency, year);
    const taxRON = toRON(tax, currency, year);
    const netRON = toRON(net, currency, year);
    result.dividendRows.push({ currency, gross, tax, net, grossRON, taxRON, netRON, category: desc });
    result.dividends.grossRON += grossRON;
    result.dividends.taxWithheldRON += taxRON;
    result.dividends.netRON += netRON;
    if (!result.dividends.category) result.dividends.category = desc;
  }

  for (const m of interestText.matchAll(ROW_RE)) {
    const gross = parseNumber(m[2]);
    const tax = parseNumber(m[3]);
    const net = parseNumber(m[4]);
    const payer = m[5].trim();
    if (!gross && !tax && !net) continue;
    if (!/XTB|S\.?A\.?|sucursala|sursa/i.test(payer)) continue;
    const currency = detectCurrency(payer, text);
    const grossRON = toRON(gross, currency, year);
    const taxRON = toRON(tax, currency, year);
    const netRON = toRON(net, currency, year);
    result.interestRows.push({ currency, gross, tax, net, grossRON, taxRON, netRON, payer });
    result.interest.grossRON += grossRON;
    result.interest.taxWithheldRON += taxRON;
    result.interest.netRON += netRON;
    if (!result.interest.payer) result.interest.payer = payer;
  }

  return result;
}

/**
 * Parse the XTB Portfolio Statement (Fișa de Portofoliu).
 * Captures all country rows, each with its own currency.
 * Country names are cleaned: "Instrumente cu detinere (OMI) din Statele Unite"
 * becomes "Statele Unite".
 */
function parseXtbPortfolio(text, year) {
  const result = {
    year,
    source: 'XTB Romania',
    longTerm: { gainRON: 0, lossRON: 0, taxWithheldRON: 0 },
    shortTerm: { gainRON: 0, lossRON: 0, taxWithheldRON: 0 },
    country: '',
    currency: 'RON',
    totalGainRON: 0,
    totalTaxWithheldRON: 0,
    countries: []
  };

  const rowRe = /([A-Za-zĂÂÎȘȚăâîșțţ][A-Za-zĂÂÎȘȚăâîșțţ\s().,\-]*?)\s+(RON|EUR|USD)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;

  for (const m of text.matchAll(rowRe)) {
    let country = m[1].replace(/\s+/g, ' ').trim();
    const currency = m[2];
    const longGain = parseNumber(m[3]);
    const longLoss = parseNumber(m[4]);
    const longTax = parseNumber(m[5]);
    const shortGain = parseNumber(m[6]);
    const shortLoss = parseNumber(m[7]);
    const shortTax = parseNumber(m[8]);

    if (/^(Câ?știg|Pierdere|Impozit|Moneda|Nr|Cod|RON|EUR|USD)/i.test(country)) continue;
    if (longGain === 0 && longLoss === 0 && longTax === 0 && shortGain === 0 && shortLoss === 0 && shortTax === 0) continue;

    country = country.replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim();
    const dinMatch = country.match(/\bdin\s+(.+)$/i);
    if (dinMatch) country = dinMatch[1].trim();

    result.countries.push({
      country,
      currency,
      longGain, longLoss, longTax,
      shortGain, shortLoss, shortTax,
      longGainRON: toRON(longGain, currency, year),
      longLossRON: toRON(longLoss, currency, year),
      longTaxRON: toRON(longTax, currency, year),
      shortGainRON: toRON(shortGain, currency, year),
      shortLossRON: toRON(shortLoss, currency, year),
      shortTaxRON: toRON(shortTax, currency, year),
    });
  }

  for (const c of result.countries) {
    result.longTerm.gainRON += c.longGainRON;
    result.longTerm.lossRON += c.longLossRON;
    result.longTerm.taxWithheldRON += c.longTaxRON;
    result.shortTerm.gainRON += c.shortGainRON;
    result.shortTerm.lossRON += c.shortLossRON;
    result.shortTerm.taxWithheldRON += c.shortTaxRON;
  }

  if (result.countries.length > 0) {
    result.country = result.countries[0].country;
    const currencies = new Set(result.countries.map(c => c.currency));
    result.currency = currencies.size === 1 ? [...currencies][0] : 'MIXED';
  }

  result.totalGainRON = result.longTerm.gainRON + result.shortTerm.gainRON - result.longTerm.lossRON - result.shortTerm.lossRON;
  result.totalTaxWithheldRON = result.longTerm.taxWithheldRON + result.shortTerm.taxWithheldRON;

  return result;
}

module.exports = {
  parseXtbDividends,
  parseXtbPortfolio,
};
