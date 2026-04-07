#!/usr/bin/env node
/**
 * Migration script: Rename variables in app.js
 * fidelity* → us*, xtb* → ro*
 */
const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '..', 'public', 'js', 'app.js');
let code = fs.readFileSync(appFile, 'utf8');

// ── FUNCTION & VARIABLE RENAMES ──
const replacements = [
  // Function name
  ['renderXtbTradesTable', 'renderRoTradesTable'],

  // DOM element IDs (used in getElementById)
  ["'xtb-trades-tbody'", "'ro-trades-tbody'"],
  ["'xtb-trades-tfoot'", "'ro-trades-tfoot'"],
  ["'input-fidelity-dividends'", "'input-us-dividends'"],
  ["'input-xtb-dividends'", "'input-ro-dividends'"],
  ["'input-fidelity-gains'", "'input-us-gains'"],
  ["'input-fidelity-cost'", "'input-us-cost'"],
  ["'input-xtb-gains'", "'input-ro-gains'"],
  ["'dcl-xtb-tbody'", "'dcl-ro-tbody'"],

  // i18n key references
  ["'income.fidelityDividends'", "'income.usDividends'"],
  ["'income.xtbDividends'", "'income.roDividends'"],
  ["'income.fidelityGains'", "'income.usGains'"],
  ["'income.xtbGains'", "'income.roGains'"],
  ["'income.xtbGainsLong'", "'income.roGainsLong'"],
  ["'income.xtbGainsShort'", "'income.roGainsShort'"],
  ["'income.fidelityTrades'", "'income.usTrades'"],
  ["'income.xtbTrades'", "'income.roTrades'"],
  ["'income.xtbTradesHint'", "'income.roTradesHint'"],
  ["'taxes.xtbNote'", "'taxes.roNote'"],
  ["'taxes.dclXtbSection'", "'taxes.dclRoSection'"],
  ["'taxes.earnFidelityGains'", "'taxes.earnUsGains'"],
  ["'taxes.earnFidelityDiv'", "'taxes.earnUsDiv'"],
  ["'taxes.earnXtbGainsLong'", "'taxes.earnRoGainsLong'"],
  ["'taxes.earnXtbGainsShort'", "'taxes.earnRoGainsShort'"],
  ["'taxes.earnXtbDiv'", "'taxes.earnRoDiv'"],
  ["'taxes.paidFidelityDivUS'", "'taxes.paidUsDivUS'"],
  ["'taxes.paidXtbCapGains'", "'taxes.paidRoCapGains'"],
  ["'taxes.paidXtbDiv'", "'taxes.paidRoDiv'"],
  ["'taxes.oweFidelityGains'", "'taxes.oweUsGains'"],
  ["'taxes.oweFidelityDiv'", "'taxes.oweUsDiv'"],
  ["'taxes.oweXtbCapGains'", "'taxes.oweRoCapGains'"],
  ["'taxes.oweXtbDiv'", "'taxes.oweRoDiv'"],
  ["'input.fidelityDividends'", "'input.usDividends'"],
  ["'input.xtbDividends'", "'input.roDividends'"],
  ["'input.fidelityGains'", "'input.usGains'"],
  ["'input.fidelityCost'", "'input.usCost'"],
  ["'input.fidelityCostHint'", "'input.usCostHint'"],
  ["'input.xtbGains'", "'input.roGains'"],
  ["'misc.noXtbData'", "'misc.noRoData'"],
  ["'misc.xtbWithheld'", "'misc.roWithheld'"],
  ["'misc.xtbCassNote'", "'misc.roCassNote'"],
  ["'dcl.sepCapitalGainsXTB'", "'dcl.sepCapitalGainsRO'"],
  ["'dcl.withheldByXTB'", "'dcl.withheldByRO'"],
  ["'dcl.sepDividendsXTB'", "'dcl.sepDividendsRO'"],
  ["'dcl.divWithheldXTB'", "'dcl.divWithheldRO'"],
  ["'dcl.sepInterestXTB'", "'dcl.sepInterestRO'"],
  ["'dcl.fidelityCapGainsTax'", "'dcl.usCapGainsTax'"],
  ["'dcl.fidelityDivTaxToPay'", "'dcl.usDivTaxToPay'"],
  ["'dcl.xtbCapGainsTaxGross'", "'dcl.roCapGainsTaxGross'"],
  ["'dcl.xtbFinalTaxNote'", "'dcl.roFinalTaxNote'"],
  ["'dcl.xtbFinalTaxShort'", "'dcl.roFinalTaxShort'"],
  ["'dcl.withheldByXTBArrow'", "'dcl.withheldByROArrow'"],
  ["'dcl.toPayCapGainsXTB'", "'dcl.toPayCapGainsRO'"],
  ["'dcl.xtbDivTaxGross'", "'dcl.roDivTaxGross'"],
  ["'dcl.toPayDivXTB'", "'dcl.toPayDivRO'"],

  // Internal variable names in computeYearData
  ['let fidelityCassTax', 'let usCassTax'],
  ['let fidelityTotalPaid', 'let usTotalPaid'],
  ['fidelityCassTax ||', 'usCassTax ||'],
  ['fidelityCassTax:', 'usCassTax:'],

  // Return object property renames
  ['fidelityTotalPaid: fidelityTotalPaid', 'usTotalPaid: usTotalPaid'],
  ['fidelityDivToPayRON:', 'usDivToPayRON:'],
  ['fidelityDivCreditRON:', 'usDivCreditRON:'],
  ['fidelityDivForeignTaxRON: fd.dividends?.foreignTaxRON ?? fidelityForeignTaxRON', 'usDivForeignTaxRON: fd.dividends?.foreignTaxRON ?? usForeignTaxRON'],
  ['fidelityDivForeignTaxUSD: fd.dividends?.foreignTaxUSD ?? fidelityForeignTaxUSD', 'usDivForeignTaxUSD: fd.dividends?.foreignTaxUSD ?? usForeignTaxUSD'],

  // Local variables
  ['const fidelityForeignTaxUSD', 'const usForeignTaxUSD'],
  ['const fidelityForeignTaxRON', 'const usForeignTaxRON'],
  ['fidelityForeignTaxUSD * rate', 'usForeignTaxUSD * rate'],
  ['const fidelityDivTax', 'const usDivTax'],
  ['const fidelityDivNetRON', 'const usDivNetRON'],
  ['fidelityDivNetRON)', 'usDivNetRON)'],

  // xtb variables → ro
  ['dividendsRON_xtb', 'dividendsRON_ro'],
  ['capitalGainsRON_xtb', 'capitalGainsRON_ro'],
  ['xtbLongTermGainRON', 'roLongTermGainRON'],
  ['xtbShortTermGainRON', 'roShortTermGainRON'],
  ['xtbDivTaxWithheld', 'roDivTaxWithheld'],
  ['xtbInterestRON', 'roInterestRON'],
  ['xtbPortTaxWithheld', 'roPortTaxWithheld'],
  ['xtbDivTaxDue', 'roDivTaxDue'],
  ['xtbDivTaxNet', 'roDivTaxNet'],
  ['xtbCapitalGainsTax', 'roCapitalGainsTax'],
  ['xtbGainsTaxNet', 'roGainsTaxNet'],
  ['xtbDivNetRON', 'roDivNetRON'],
  ['defaultXtbLong', 'defaultRoLong'],
  ['defaultXtbShort', 'defaultRoShort'],
  ['xtbLongRate', 'roLongRate'],
  ['xtbShortRate', 'roShortRate'],
  ['xtbLongTax', 'roLongTax'],
  ['xtbShortTax', 'roShortTax'],
  ['xtbDivTaxDue', 'roDivTaxDue'],
  ['xtbDivGross', 'roDivGross'],
  ['xtbInterest', 'roInterest'],
  ['xtbLong', 'roLong'],
  ['xtbShort', 'roShort'],
  ['xtbCapTaxWithheld', 'roCapTaxWithheld'],
  ['xtbInterestTax', 'roInterestTax'],

  // fidelity variables in renderTaxTable and renderDeclaratieHelper
  ['fidelityDivRON', 'usDivRON'],
  ['fidelityGainsRON', 'usGainsRON'],
  ['fidelityGainsTax', 'usGainsTax'],
  ['fidelityDivTax', 'usDivTax'],
  ['fidelityForeignTaxRON', 'usForeignTaxRON'],

  // Data access from computed result
  ['data.fidelityDivToPayRON', 'data.usDivToPayRON'],
  ['data.fidelityDivCreditRON', 'data.usDivCreditRON'],
  ['data.fidelityDivForeignTaxRON', 'data.usDivForeignTaxRON'],
  ['data.fidelityDivForeignTaxUSD', 'data.usDivForeignTaxUSD'],
  ['data.fidelityTotalPaid', 'data.usTotalPaid'],
  ['data.xtbDivTaxWithheld', 'data.roDivTaxWithheld'],
  ['data.xtbPortTaxWithheld', 'data.roPortTaxWithheld'],
  ['data.xtbInterestRON', 'data.roInterestRON'],
  ['data.xtbLongTermGainRON', 'data.roLongTermGainRON'],
  ['data.xtbShortTermGainRON', 'data.roShortTermGainRON'],
  ['data.dividendsRON_xtb', 'data.dividendsRON_ro'],
  ['data.capitalGainsRON_xtb', 'data.capitalGainsRON_ro'],

  // Hardcoded text in interest label
  ["I18n.t('income.interestIncome') + ' (XTB)'", "I18n.t('income.interestIncome') + ' (Romania)'"],

  // Comments
  ['// XTB data from imported reports', '// Romania broker data from imported reports'],
  ['// XTB data', '// Romania broker data'],
  ['// XTB dividends:', '// Romania dividends:'],
  ['// XTB capital gains:', '// Romania capital gains:'],
  ['// Fidelity US dividends:', '// US dividends:'],
  ['// Fidelity dividends:', '// US dividends:'],
  ['// Fidelity capital gains', '// US capital gains'],
  ['// From trade confirmations (Fidelity sold activity)', '// From trade confirmations (US sold activity)'],
  ['// From fidelityData > declaratie', '// From US broker data > declaratie'],
  ['// Tax from declaration or fidelityData', '// Tax from declaration or US broker data'],
  ['// Add XTB interest', '// Add Romania broker interest'],
  ['// Section 1.2.1: Foreign income (Fidelity - USA)', '// Section 1.2.1: Foreign income (US - Fidelity / Morgan Stanley)'],
  ['// XTB section', '// Romania section'],
  ['// Update fidelity dividends', '// Update US dividends'],
  ['// GET /api/trades - Get all Fidelity', '// GET /api/trades - Get all US'],

  // Form data submit payload keys
  ['fidelityDividends: document', 'usDividends: document'],
  ['xtbDividends: document', 'roDividends: document'],
  ['fidelityGains: document', 'usGains: document'],
  ['fidelityCost: document', 'usCost: document'],
  ['xtbGains: document', 'roGains: document'],
];

// Apply manual overrides backward compat patch
// Replace the old manual overrides block with new one that checks both old and new keys
const oldManualBlock = `    // Manual overrides
    if (yd.fidelityCost !== undefined && yd.fidelityCost !== '') {
      capitalGainsCostUSD = parseFloat(yd.fidelityCost) || 0;
    }
    if (yd.fidelityDividends !== undefined && yd.fidelityDividends !== '') {
      dividendsUSD = parseFloat(yd.fidelityDividends) || 0;
      dividendsRON = dividendsUSD * rate;
    }
    if (yd.xtbDividends !== undefined && yd.xtbDividends !== '') dividendsRON_xtb = parseFloat(yd.xtbDividends) || 0;
    if (yd.fidelityGains !== undefined && yd.fidelityGains !== '') {
      const gainsUSD = parseFloat(yd.fidelityGains) || 0;
      capitalGainsTaxableRON = (gainsUSD - capitalGainsCostUSD) * rate;
    }
    if (yd.xtbGains !== undefined && yd.xtbGains !== '') capitalGainsRON_xtb = parseFloat(yd.xtbGains) || 0;`;

const newManualBlock = `    // Manual overrides (backward compat: check new key first, then old)
    const _usCost = yd.usCost ?? yd.fidelityCost;
    if (_usCost !== undefined && _usCost !== '') {
      capitalGainsCostUSD = parseFloat(_usCost) || 0;
    }
    const _usDiv = yd.usDividends ?? yd.fidelityDividends;
    if (_usDiv !== undefined && _usDiv !== '') {
      dividendsUSD = parseFloat(_usDiv) || 0;
      dividendsRON = dividendsUSD * rate;
    }
    const _roDiv = yd.roDividends ?? yd.xtbDividends;
    if (_roDiv !== undefined && _roDiv !== '') dividendsRON_ro = parseFloat(_roDiv) || 0;
    const _usGains = yd.usGains ?? yd.fidelityGains;
    if (_usGains !== undefined && _usGains !== '') {
      const gainsUSD = parseFloat(_usGains) || 0;
      capitalGainsTaxableRON = (gainsUSD - capitalGainsCostUSD) * rate;
    }
    const _roGains = yd.roGains ?? yd.xtbGains;
    if (_roGains !== undefined && _roGains !== '') capitalGainsRON_ro = parseFloat(_roGains) || 0;`;

code = code.replace(oldManualBlock, newManualBlock);

// Apply populateForm backward compat
const oldPopulate = `    document.getElementById('input-fidelity-dividends').value = yd.fidelityDividends || '';
    document.getElementById('input-xtb-dividends').value = yd.xtbDividends || '';
    document.getElementById('input-fidelity-gains').value = yd.fidelityGains || '';
    document.getElementById('input-fidelity-cost').value = yd.fidelityCost || '';
    document.getElementById('input-xtb-gains').value = yd.xtbGains || '';`;

const newPopulate = `    document.getElementById('input-us-dividends').value = yd.usDividends ?? yd.fidelityDividends ?? '';
    document.getElementById('input-ro-dividends').value = yd.roDividends ?? yd.xtbDividends ?? '';
    document.getElementById('input-us-gains').value = yd.usGains ?? yd.fidelityGains ?? '';
    document.getElementById('input-us-cost').value = yd.usCost ?? yd.fidelityCost ?? '';
    document.getElementById('input-ro-gains').value = yd.roGains ?? yd.xtbGains ?? '';`;

code = code.replace(oldPopulate, newPopulate);

// Apply simple string replacements
let count = 0;
for (const [from, to] of replacements) {
  const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = code.match(regex);
  if (matches) {
    count += matches.length;
    code = code.replace(regex, to);
  }
}

fs.writeFileSync(appFile, code, 'utf8');
console.log(`  Updated app.js: ${count} replacements applied`);
