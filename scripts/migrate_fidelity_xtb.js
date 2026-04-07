#!/usr/bin/env node
/**
 * Migration script: Rename Fidelity→US, XTB→Romania in locale files.
 * - Renames i18n keys (fidelity*→us*, xtb*→ro*)
 * - Updates display text values
 * - EN: "US" / "Romania"
 * - RO: "SUA" / "România"
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'public', 'locales');

// ── KEY RENAMES (dotted path → new key name) ──
const keyRenames = {
  // income section
  'income.fidelityDividends': 'usDividends',
  'income.xtbDividends': 'roDividends',
  'income.fidelityGains': 'usGains',
  'income.xtbGains': 'roGains',
  'income.xtbGainsLong': 'roGainsLong',
  'income.xtbGainsShort': 'roGainsShort',
  'income.fidelityTrades': 'usTrades',
  'income.xtbTrades': 'roTrades',
  'income.xtbTradesHint': 'roTradesHint',
  // taxes section
  'taxes.xtbNote': 'roNote',
  'taxes.dclXtbSection': 'dclRoSection',
  'taxes.earnFidelityGains': 'earnUsGains',
  'taxes.earnFidelityDiv': 'earnUsDiv',
  'taxes.earnXtbGainsLong': 'earnRoGainsLong',
  'taxes.earnXtbGainsShort': 'earnRoGainsShort',
  'taxes.earnXtbDiv': 'earnRoDiv',
  'taxes.paidFidelityDivUS': 'paidUsDivUS',
  'taxes.paidXtbCapGains': 'paidRoCapGains',
  'taxes.paidXtbDiv': 'paidRoDiv',
  'taxes.oweFidelityGains': 'oweUsGains',
  'taxes.oweFidelityDiv': 'oweUsDiv',
  'taxes.oweXtbCapGains': 'oweRoCapGains',
  'taxes.oweXtbDiv': 'oweRoDiv',
  // input section
  'input.fidelityDividends': 'usDividends',
  'input.xtbDividends': 'roDividends',
  'input.fidelityGains': 'usGains',
  'input.fidelityCost': 'usCost',
  'input.fidelityCostHint': 'usCostHint',
  'input.xtbGains': 'roGains',
  // misc section
  'misc.noXtbData': 'noRoData',
  'misc.xtbWithheld': 'roWithheld',
  'misc.xtbCassNote': 'roCassNote',
  // dcl section
  'dcl.sepCapitalGainsXTB': 'sepCapitalGainsRO',
  'dcl.withheldByXTB': 'withheldByRO',
  'dcl.sepDividendsXTB': 'sepDividendsRO',
  'dcl.divWithheldXTB': 'divWithheldRO',
  'dcl.sepInterestXTB': 'sepInterestRO',
  'dcl.fidelityCapGainsTax': 'usCapGainsTax',
  'dcl.fidelityDivTaxToPay': 'usDivTaxToPay',
  'dcl.xtbCapGainsTaxGross': 'roCapGainsTaxGross',
  'dcl.xtbFinalTaxNote': 'roFinalTaxNote',
  'dcl.xtbFinalTaxShort': 'roFinalTaxShort',
  'dcl.withheldByXTBArrow': 'withheldByROArrow',
  'dcl.toPayCapGainsXTB': 'toPayCapGainsRO',
  'dcl.xtbDivTaxGross': 'roDivTaxGross',
  'dcl.toPayDivXTB': 'toPayDivRO',
};

// ── VALUE REPLACEMENTS (EN) ──
const enValueReplacements = {
  // income
  'income.usDividends': 'US Dividends (Fidelity / Morgan Stanley)',
  'income.roDividends': 'Romania Dividends',
  'income.usGains': 'US Stock Sales (Fidelity / Morgan Stanley)',
  'income.roGains': 'Romania Stock Sales',
  'income.roGainsLong': 'Romania Stock Sales \u22651yr',
  'income.roGainsShort': 'Romania Stock Sales <1yr',
  'income.usTrades': 'US Stock Sales (Trade Confirmations)',
  'income.roTrades': 'Romania Stock Sales',
  'income.roTradesHint': 'Data from Romania broker portfolio imported in the Import Document tab.',
  // taxes
  'taxes.roNote': 'Starting 2025, stocks transferred to Romania broker. Romania broker withholds capital gains tax (1%/3%) but NOT CASS. CAS (pension 25%) does NOT apply for investment income. US dividends: US withholds 10% (RO-US treaty), Romania does not tax again but dividends count for CASS.',
  'taxes.dclForeignSection': 'Subsection I.2.1: Foreign Income (US - Fidelity / Morgan Stanley)',
  'taxes.dclRoSection': 'Romania Income - Only Interest (stocks & dividends: final tax, not declared)',
  'taxes.earnUsGains': 'US capital gains (stock sales via Fidelity / Morgan Stanley)',
  'taxes.earnUsDiv': 'US dividends (Fidelity / Morgan Stanley)',
  'taxes.earnRoGainsLong': 'Romania capital gains \u22651 year',
  'taxes.earnRoGainsShort': 'Romania capital gains <1 year',
  'taxes.earnRoDiv': 'Romania dividends (US stocks via Romania broker)',
  'taxes.earnInterest': 'Interest income (ANAF + Romania broker)',
  'taxes.paidUsDivUS': 'US dividend tax withheld (10% RO-US treaty)',
  'taxes.paidRoCapGains': 'Romania broker capital gains tax withheld (1%/3% - final tax)',
  'taxes.paidRoDiv': 'Romania broker dividend tax withheld at source',
  'taxes.oweUsGains': 'US capital gains tax (10%)',
  'taxes.oweUsDiv': 'US dividend tax (payable in Romania)',
  'taxes.oweRoCapGains': 'Romania broker capital gains tax',
  'taxes.oweRoDiv': 'Romania broker dividend tax',
  // input
  'input.subtitle': 'Enter amounts for the selected year. For 2025+, input dividends and stock sale proceeds from both US (Fidelity / Morgan Stanley) and Romania broker.',
  'input.usDividends': 'US Dividends (USD)',
  'input.roDividends': 'Romania Dividends (RON)',
  'input.usGains': 'US Stock Sales (USD)',
  'input.usCost': 'ESPP Purchase Cost (USD)',
  'input.usCostHint': 'Cost of ESPP shares purchased at preferential price. Stock awards (free) = 0.',
  'input.roGains': 'Romania Stock Sales (RON)',
  'input.roCapGainsRate': 'Capital Gains Tax Rate - Foreign / US (%)',
  'input.roCapGainsRateHint': '10% for 2025, 16% from 2026 (non-Romania brokers: Fidelity, Morgan Stanley)',
  'input.roCapGainsLongRateHint': '1% for 2025, 3% from 2026 (Romania broker, final tax)',
  'input.roCapGainsShortRateHint': '3% for 2025, 6% from 2026 (Romania broker, final tax)',
  // import
  'import.typeInvestment': 'US (Fidelity) - Investment Report (Yearly)',
  'import.typeTradeConfirmation': 'US (Fidelity) - Trade Confirmation (Sold Activity)',
  'import.typeXtbDividends': 'Romania (XTB) - Dividends & Interest Report',
  'import.typeXtbPortfolio': 'Romania (XTB) - Portfolio (Capital Gains)',
  'import.typeFidelityStatement': 'US (Fidelity) - Statement (Periodic Report)',
  // misc
  'misc.noRoData': 'No Romania broker data. Import Romania broker Portfolio and Dividends documents.',
  'misc.roWithheld': '(Romania broker withheld)',
  'misc.roCassNote': 'Romania broker does NOT withhold CASS. Declared via Declara\u021bia Unic\u0103 D212.',
  'misc.rateLabels': [
    'Dividend Tax ({rate})',
    'Capital Gains Tax - US (10%)',
    'Interest Income Tax (10%)',
    'CASS Health Contribution (10% - tiered)',
    'Romania Dividend Tax ({rate})',
    'Romania Stock Sales \u22651yr (1%)',
    'Romania Stock Sales <1yr (3%)'
  ],
  // dcl
  'dcl.sepCapitalGainsRO': 'CAPITAL GAINS (Romania)',
  'dcl.withheldByRO': 'Tax withheld at source by Romania broker',
  'dcl.sepDividendsRO': 'ROMANIA DIVIDENDS',
  'dcl.divWithheldRO': 'Tax withheld at source by Romania broker',
  'dcl.sepInterestRO': 'ROMANIA INTEREST',
  'dcl.usCapGainsTax': 'US capital gains tax (10%)',
  'dcl.usDivTaxToPay': 'US dividend tax (to pay)',
  'dcl.roCapGainsTaxGross': 'Romania capital gains tax (1%/3%)',
  'dcl.roFinalTaxNote': 'Tax 1%/3% is FINAL, withheld by broker. NOT declared in D212. Only counts toward CASS threshold.',
  'dcl.roFinalTaxShort': 'Final tax (not declared)',
  'dcl.withheldByROArrow': 'Withheld by Romania broker',
  'dcl.toPayCapGainsRO': 'To pay capital gains Romania',
  'dcl.roDivTaxGross': 'Romania dividend tax (gross {rate})',
  'dcl.toPayDivRO': 'To pay dividends Romania',
};

// ── VALUE REPLACEMENTS (RO) ──
const roValueReplacements = {
  // income
  'income.usDividends': 'Dividende SUA (Fidelity / Morgan Stanley)',
  'income.roDividends': 'Dividende România',
  'income.usGains': 'Vânzări Acțiuni SUA (Fidelity / Morgan Stanley)',
  'income.roGains': 'Vânzări Acțiuni România',
  'income.roGainsLong': 'Vânzări Acțiuni România \u22651an',
  'income.roGainsShort': 'Vânzări Acțiuni România <1an',
  'income.usTrades': 'Vânzări Acțiuni SUA (Confirmări Tranzacții)',
  'income.roTrades': 'Vânzări Acțiuni România',
  'income.roTradesHint': 'Date din Fișa de Portofoliu broker România importată în tab-ul Import Document.',
  // taxes
  'taxes.roNote': 'Începând cu 2025, acțiunile au fost transferate la brokerul din România. Brokerul din România reține impozitul pe câștiguri (1%/3%) dar NU reține CASS. CAS (pensie 25%) NU se aplică pentru venituri din investiții. Dividende SUA: SUA reține 10% la sursă (Convenția RO-SUA), România nu mai impozitează, dar dividendele intră la plafon CASS.',
  'taxes.dclForeignSection': 'Subsecțiunea I.2.1: Venituri din străinătate (SUA - Fidelity / Morgan Stanley)',
  'taxes.dclRoSection': 'Venituri România - Doar Dobânzi (acțiuni și dividende: impozit final, nu se declară)',
  'taxes.earnUsGains': 'Câștiguri capital SUA (vânzare acțiuni Fidelity / Morgan Stanley)',
  'taxes.earnUsDiv': 'Dividende SUA (Fidelity / Morgan Stanley)',
  'taxes.earnRoGainsLong': 'Câștiguri capital România \u22651 an',
  'taxes.earnRoGainsShort': 'Câștiguri capital România <1 an',
  'taxes.earnRoDiv': 'Dividende România (acțiuni SUA via broker România)',
  'taxes.earnInterest': 'Dobânzi (ANAF + broker România)',
  'taxes.paidUsDivUS': 'Impozit dividende reținut în SUA (10% tratat RO-SUA)',
  'taxes.paidRoCapGains': 'Impozit câștiguri reținut de broker România (1%/3% - impozit final)',
  'taxes.paidRoDiv': 'Impozit dividende reținut la sursă (broker România)',
  'taxes.oweUsGains': 'Impozit câștiguri capital SUA (10%)',
  'taxes.oweUsDiv': 'Impozit dividende SUA (de plată în România)',
  'taxes.oweRoCapGains': 'Impozit câștiguri capital broker România',
  'taxes.oweRoDiv': 'Impozit dividende broker România',
  // input
  'input.subtitle': 'Introduceți sumele pentru anul selectat. Pentru 2025+, introduceți dividendele și veniturile din vânzarea acțiunilor atât de la SUA (Fidelity / Morgan Stanley) cât și de la brokerul din România.',
  'input.usDividends': 'Dividende SUA (USD)',
  'input.roDividends': 'Dividende România (RON)',
  'input.usGains': 'Vânzări Acțiuni SUA (USD)',
  'input.usCost': 'Cost achiziție ESPP (USD)',
  'input.usCostHint': 'Costul acțiunilor ESPP cumpărate la preț preferențial. Pentru acțiuni gratuite (stock awards) = 0.',
  'input.roGains': 'Vânzări Acțiuni România (RON)',
  'input.roCapGainsRate': 'Cotă impozit câștiguri capital - Extern / SUA (%)',
  'input.roCapGainsRateHint': '10% pt 2025, 16% din 2026 (brokeri non-România: Fidelity, Morgan Stanley)',
  'input.roCapGainsLongRateHint': '1% pt 2025, 3% din 2026 (broker România, impozit final)',
  'input.roCapGainsShortRateHint': '3% pt 2025, 6% din 2026 (broker România, impozit final)',
  // import
  'import.typeInvestment': 'SUA (Fidelity) - Raport de Investiții (Anual)',
  'import.typeTradeConfirmation': 'SUA (Fidelity) - Confirmare Tranzacție (Activitate Vânzare)',
  'import.typeXtbDividends': 'România (XTB) - Raport Dividende și Dobânzi',
  'import.typeXtbPortfolio': 'România (XTB) - Fișă de Portofoliu (Câștiguri Capital)',
  'import.typeFidelityStatement': 'SUA (Fidelity) - Extras de Cont (Raport Periodic)',
  // misc
  'misc.noRoData': 'Nu există date broker România. Importați documentele Portfolio și Dividende de la brokerul din România.',
  'misc.roWithheld': '(reținut de brokerul din România)',
  'misc.roCassNote': 'Brokerul din România NU reține CASS. Se declară prin Declarația Unică D212.',
  'misc.rateLabels': [
    'Impozit Dividende ({rate})',
    'Impozit Câștiguri Capital - SUA (10%)',
    'Impozit Venituri din Dobânzi (10%)',
    'Contribuție CASS Sănătate (10% - paliere)',
    'Impozit Dividende România ({rate})',
    'Vânzări Acțiuni România \u22651an (1%)',
    'Vânzări Acțiuni România <1an (3%)'
  ],
  // dcl
  'dcl.sepCapitalGainsRO': 'CÂȘTIGURI DE CAPITAL (România)',
  'dcl.withheldByRO': 'Impozit reținut la sursă de brokerul din România',
  'dcl.sepDividendsRO': 'DIVIDENDE ROMÂNIA',
  'dcl.divWithheldRO': 'Impozit reținut la sursă de brokerul din România',
  'dcl.sepInterestRO': 'DOBÂNZI ROMÂNIA',
  'dcl.usCapGainsTax': 'Impozit câștiguri capital SUA (10%)',
  'dcl.usDivTaxToPay': 'Impozit dividende SUA (de plată)',
  'dcl.roCapGainsTaxGross': 'Impozit câștiguri România (1%/3%)',
  'dcl.roFinalTaxNote': 'Impozitul 1%/3% este FINAL, reținut de broker. NU se declară în D212. Intră doar la plafonul CASS.',
  'dcl.roFinalTaxShort': 'Impozit final (nu se declară)',
  'dcl.withheldByROArrow': 'Reținut de brokerul din România',
  'dcl.toPayCapGainsRO': 'De plată capital gains România',
  'dcl.roDivTaxGross': 'Impozit dividende România (brut {rate})',
  'dcl.toPayDivRO': 'De plată dividende România',
};

function renameKeys(obj, section) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${section}.${key}`;
    const newKeyName = keyRenames[fullKey];
    const outKey = newKeyName || key;
    result[outKey] = value;
  }
  return result;
}

function applyValueReplacements(obj, section, replacements) {
  const result = { ...obj };
  for (const [fullKey, newValue] of Object.entries(replacements)) {
    const [sec, key] = fullKey.split('.');
    if (sec === section && key in result) {
      result[key] = newValue;
    }
  }
  return result;
}

function processLocale(filePath, valueReplacements) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const section of Object.keys(data)) {
    if (typeof data[section] !== 'object' || Array.isArray(data[section])) continue;
    // First rename keys
    data[section] = renameKeys(data[section], section);
    // Then apply value replacements (using NEW key names)
    data[section] = applyValueReplacements(data[section], section, valueReplacements);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  Updated: ${filePath}`);
}

console.log('\n=== Locale Migration: Fidelity→US, XTB→Romania ===\n');
processLocale(path.join(localesDir, 'en.json'), enValueReplacements);
processLocale(path.join(localesDir, 'ro.json'), roValueReplacements);
console.log('\n  Done! Verify with: node check_i18n.js\n');
