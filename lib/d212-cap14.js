/**
 * D212 Cap. I §2.1 — `cap14` (Foreign-source income) row builder.
 *
 * Mirrors the cap11 builder in lib/d212-cap11.js. Produces structured rows
 * that map 1:1 onto the `cap14` element defined in docs/anaf/d212-2025/D212.xsd
 * (BG-05000). The eventual D-7 XML emitter consumes the rows directly.
 *
 * Scope of this first pass (paired with gap D-7)
 * ----------------------------------------------
 * - US-source dividends (categ_venit = 2018) — Fidelity, Morgan Stanley,
 *   form 1042-S federal withholding. Foreign tax credit via str_credit_fiscal.
 * - US-source capital gains (categ_venit = 2012) — RSU/ESPP sale proceeds
 *   minus cost basis minus BIK already taxed as salary in RO.
 *
 * Per-country grouping (gap D-3) and multi-jurisdiction support are NOT yet
 * implemented — all foreign income is assumed `US` with `dubla_impunere=1`
 * (credit method, US-RO treaty). When D-3 lands, this module will accept
 * a list of country buckets instead of inferring from US-only fields.
 *
 * Schematron rule CD-D212-016 restricts str_categ_venit to a fixed list
 * (2001, 2003, 2006, 2009, 2010, 2011, 2012, 2015, 2016, 2017, 2018, 2019,
 *  2020, 2021, 2022, 2023, 2024, 2025, 2026). We use only 2012 and 2018.
 */

'use strict';

/**
 * Build cap14 rows from the computed `data` object returned by
 * `computeYearData`. Emits 0..2 rows in the current implementation.
 *
 * @param {object} data  Output of computeYearData(year).
 * @returns {Array<object>}
 */
function buildCap14Rows(data) {
  if (!data) return [];
  const rows = [];

  const exchangeRate = data.exchangeRate || 1;
  const dividendsRON = data.dividendsRON || 0;
  const divTaxRate = data.divTaxRate || 0;
  const capGainsTaxRate = data.capGainsTaxRate || 0;
  const usForeignTaxRON = data.usDivForeignTaxRON || 0;
  const usDivCreditRON = data.usDivCreditRON || 0;
  const capGainsSaleRON = (data.capitalGainsSaleUSD || 0) * exchangeRate;
  const capGainsCostRON = (data.capitalGainsCostUSD || 0) * exchangeRate;
  const salaryTaxedRON = data.salaryTaxedRON || 0;
  const usNetGainsRON = data.usNetGainsRON || 0;

  // Dividends row (categ_venit=2018) — only if there is dividend income.
  if (dividendsRON > 0 || usForeignTaxRON > 0) {
    const Rd1 = dividendsRON;
    const Rd3 = Rd1;
    const Rd7 = Rd3;
    const Rd8 = Rd7 * divTaxRate;
    const Rd9 = usForeignTaxRON;
    const Rd10 = Math.min(Rd8, Rd9);
    const Rd11 = Math.max(0, Rd8 - Rd10);
    rows.push({
      str_stat_realiz_v: 'US',
      den_stat: 'Statele Unite ale Americii',
      str_categ_venit: '2018',
      den_categ_venit: 'Dividende',
      dubla_impunere: '1',
      str_venit_brut: Math.round(Rd1),
      str_chelt_deduc: 0,
      str_venit_net_anual: Math.round(Rd3),
      str_pierdere_anuala: 0,
      str_pierdere_precedenta: 0,
      str_pierdere_compensata: 0,
      str_venit_recalculat: Math.round(Rd7),
      str_impozit_datorat_Ro: Math.round(Rd8),
      str_impozit_platit: Math.round(Rd9),
      str_credit_fiscal: Math.round(Rd10),
      str_dif_impozit_datorat: Math.round(Rd11),
    });
  }

  // Capital gains row (categ_venit=2012). Emitted when there are sale proceeds
  // or a positive taxable net. capGainsCost includes BIK that was already
  // taxed as salary in Romania (deductible per Cod fiscal art. 76 + § 7.4).
  if (capGainsSaleRON > 0 || usNetGainsRON > 0) {
    const Rd1 = capGainsSaleRON;
    const Rd2 = capGainsCostRON + salaryTaxedRON;
    const Rd3 = Math.max(0, Rd1 - Rd2);
    // For US capgains the RO resident typically owes no US tax (US-RO treaty
    // art. 13). We don't track US capgains withholding separately.
    const Rd9 = 0;
    const Rd7 = Rd3;
    const Rd8 = Rd7 * capGainsTaxRate;
    const Rd10 = Math.min(Rd8, Rd9);
    const Rd11 = Math.max(0, Rd8 - Rd10);
    rows.push({
      str_stat_realiz_v: 'US',
      den_stat: 'Statele Unite ale Americii',
      str_categ_venit: '2012',
      den_categ_venit: 'Câștiguri din transferul titlurilor de valoare',
      dubla_impunere: '1',
      str_venit_brut: Math.round(Rd1),
      str_chelt_deduc: Math.round(Rd2),
      str_venit_net_anual: Math.round(Rd3),
      str_pierdere_anuala: 0,
      str_pierdere_precedenta: 0,
      str_pierdere_compensata: 0,
      str_venit_recalculat: Math.round(Rd7),
      str_impozit_datorat_Ro: Math.round(Rd8),
      str_impozit_platit: Math.round(Rd9),
      str_credit_fiscal: Math.round(Rd10),
      str_dif_impozit_datorat: Math.round(Rd11),
    });
  }

  // Interest row (categ_venit=2010). Emitted for US-source interest reported
  // on 1042-S code 01. US typically withholds 0% under the IRC §871(h)
  // portfolio interest exemption, so the foreign tax credit is usually 0 and
  // the RO resident owes the full RO interest tax (10% in 2025, 16% from 2026).
  const usIntRON = data.usForeignInterestRON || 0;
  const usIntTaxRON = data.usForeignInterestTaxRON || 0;
  if (usIntRON > 0 || usIntTaxRON > 0) {
    const Rd1 = usIntRON;
    const Rd3 = Rd1;
    const Rd7 = Rd3;
    const Rd8 = data.usForeignInterestTaxDueRON || (Rd7 * (data.interestTaxRate || 0));
    const Rd9 = usIntTaxRON;
    const Rd10 = data.usForeignInterestCreditRON != null ? data.usForeignInterestCreditRON : Math.min(Rd8, Rd9);
    const Rd11 = data.usForeignInterestTaxToPayRON != null ? data.usForeignInterestTaxToPayRON : Math.max(0, Rd8 - Rd10);
    rows.push({
      str_stat_realiz_v: 'US',
      den_stat: 'Statele Unite ale Americii',
      str_categ_venit: '2010',
      den_categ_venit: 'Dobânzi',
      dubla_impunere: '1',
      str_venit_brut: Math.round(Rd1),
      str_chelt_deduc: 0,
      str_venit_net_anual: Math.round(Rd3),
      str_pierdere_anuala: 0,
      str_pierdere_precedenta: 0,
      str_pierdere_compensata: 0,
      str_venit_recalculat: Math.round(Rd7),
      str_impozit_datorat_Ro: Math.round(Rd8),
      str_impozit_platit: Math.round(Rd9),
      str_credit_fiscal: Math.round(Rd10),
      str_dif_impozit_datorat: Math.round(Rd11),
    });
  }

  return rows;
}

module.exports = { buildCap14Rows };
