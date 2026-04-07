const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse-new');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');

const PDF_SOURCES = {
  declaratie_2023: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\de depus la ANAF\\Spatariu Edmund - Calcul declaratie unica 2023.pdf",
  declaratie_2024: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\de depus la ANAF\\2024\\Spatariu Edmund_Calcul declaratie unica 2024.pdf",
  investment_2023: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\2023 Year End Investment Report.pdf",
  investment_2024: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\2025\\2024 YEAR-END INVESTMENT REPORT.pdf",
  adeverinta_2023: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\2025\\2023_Adeverinte_Venit.pdf",
  adeverinta_2024: "C:\\Users\\edspatar\\OneDrive - Microsoft\\Financiar\\Soter\\2025\\2024_Adeverinte_Venit.pdf"
};

const EXCEL_SOURCE = "C:\\Dev\\Personal\\ANAF\\Stock Award Document - 2025.xlsx";

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

function extractExcelData(filePath) {
  const workbook = XLSX.readFile(filePath);
  const result = {};
  for (const sheetName of workbook.SheetNames) {
    result[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
  return result;
}

// Parse Romanian tax declaration (Declaratie Unica)
function parseDeclaratie(text, year) {
  const result = {
    year,
    rawText: text,
    dividends: { grossUSD: 0, grossRON: 0, foreignTaxUSD: 0, foreignTaxRON: 0, taxDueRON: 0, creditRON: 0, toPayRON: 0 },
    capitalGains: { saleUSD: 0, saleRON: 0, costUSD: 0, costRON: 0, salaryDeductionRON: 0, taxableRON: 0, foreignTaxRON: 0, taxDueRON: 0 },
    cass: { extrasalaryIncome: 0, baseRON: 0, cassRON: 0 },
    totalTax: 0,
    cassContribution: 0,
    exchangeRate: 0,
    paymentDeadline: ''
  };

  // Exchange rate
  const rateMatch = text.match(/Curs de schimb.*?(\d+[.,]\d+)/);
  if (rateMatch) result.exchangeRate = parseNumber(rateMatch[1]);

  // Capital gains - sale value
  const saleMatch = text.match(/Valoare la vanzare\s+([\d.,]+)\s+([\d.,]+)/);
  if (saleMatch) {
    result.capitalGains.saleUSD = parseNumber(saleMatch[1]);
    result.capitalGains.saleRON = parseNumber(saleMatch[2]);
  }

  // Capital gains - cost basis
  const costMatch = text.match(/Valoare la achizitie\s+([\d.,]+)\s+([\d.,]+)/);
  if (costMatch) {
    result.capitalGains.costUSD = parseNumber(costMatch[1]);
    result.capitalGains.costRON = parseNumber(costMatch[2]);
  }

  // Salary deduction
  const salaryDeductMatch = text.match(/Venit impozitat deja ca salariu.*?(\d[\d.,]*)/);
  if (salaryDeductMatch) result.capitalGains.salaryDeductionRON = parseNumber(salaryDeductMatch[1]);

  // Taxable capital gains
  const taxableMatch = text.match(/Venit impozabil\s+([\d.,]+)/);
  if (taxableMatch) result.capitalGains.taxableRON = parseNumber(taxableMatch[1]);

  // Capital gains tax
  const cgTaxMatch = text.match(/Impozit pe venit datorat in Romania \(10%\)\s+([\d.,]+)/);
  if (cgTaxMatch) result.capitalGains.taxDueRON = parseNumber(cgTaxMatch[1]);

  // Dividends
  const divBrutMatch = text.match(/Dividende.*\nVenit brut\s+([\d.,]+)\s+([\d.,]+)/);
  if (divBrutMatch) {
    result.dividends.grossUSD = parseNumber(divBrutMatch[1]);
    result.dividends.grossRON = parseNumber(divBrutMatch[2]);
  }

  const divForeignTax = text.match(/Dividende[\s\S]*?Impozit platit in strainatate\s+([\d.,]+)\s+([\d.,]+)/);
  if (divForeignTax) {
    result.dividends.foreignTaxUSD = parseNumber(divForeignTax[1]);
    result.dividends.foreignTaxRON = parseNumber(divForeignTax[2]);
  }

  const divTaxDue = text.match(/Impozit datorat in Romania \(8%\)\s+([\d.,]+)/);
  if (divTaxDue) result.dividends.taxDueRON = parseNumber(divTaxDue[1]);

  // CASS
  const cassMatch = text.match(/CASS datorata.*?(\d[\d.,]*)\s*$/m);
  if (cassMatch) result.cassContribution = parseNumber(cassMatch[1]);

  // Venit extrasalarial
  const extraMatch = text.match(/Venit extrasalarial.*\n([\d.,]+)/);
  if (extraMatch) result.cass.extrasalaryIncome = parseNumber(extraMatch[1]);

  // Total obligations
  const totalMatch = text.match(/Impozit pe venit datorat.*?(\d[\d.,]+)\s*$/m);
  if (totalMatch) result.totalTax = parseNumber(totalMatch[1]);

  // Payment deadline (e.g., "27 mai 2024")
  const deadlineMatch = text.match(/Termen de plata.*\n.*?(\d+\s+\w+\s+\d{4})/);
  if (deadlineMatch) result.paymentDeadline = deadlineMatch[1];

  return result;
}

// Parse investment report (Fidelity year-end)
function parseInvestment(text, year) {
  const result = {
    year,
    rawText: text,
    accountValue: 0,
    changeFromStart: 0,
    beginningValue: 0,
    dividends: { total: 0, ordinary: 0 },
    taxesWithheld: 0,
    holdings: [],
    totalDividends: 0,
    totalGains: 0,
    netGains: 0
  };

  // Account value
  const acctMatch = text.match(/Ending Account Value.*?\$([\d.,]+)/);
  if (acctMatch) result.accountValue = parseNumber(acctMatch[1]);

  // Beginning value
  const beginMatch = text.match(/Beginning Account Value.*?\$([\d.,]+)/);
  if (beginMatch) result.beginningValue = parseNumber(beginMatch[1]);

  // Change
  const changeMatch = text.match(/Change Since January 1.*?\$?([\d.,]+)/);
  if (changeMatch) result.changeFromStart = parseNumber(changeMatch[1]);

  // Dividends total (from Income Summary)
  const divTotalMatch = text.match(/Dividends\s+([\d.,]+)/);
  if (divTotalMatch) result.dividends.total = parseNumber(divTotalMatch[1]);
  result.totalDividends = result.dividends.total;

  // Taxes withheld
  const taxWithheld = text.match(/Taxes Withheld\s+-?([\d.,]+)/);
  if (taxWithheld) result.taxesWithheld = parseNumber(taxWithheld[1]);

  // Holdings - MSFT
  const msftMatch = text.match(/MICROSOFT CORP \(MSFT\)\s+([\d.]+)\s+\$([\d.,]+)\s+\$([\d.,]+)\s+\$([\d.,]+)\s+\$?([-\d.,]+)\s+\$([\d.,]+)/);
  if (msftMatch) {
    result.holdings.push({
      name: 'MICROSOFT CORP (MSFT)',
      quantity: parseFloat(msftMatch[1]),
      pricePerUnit: parseNumber(msftMatch[2]),
      marketValue: parseNumber(msftMatch[3]),
      costBasis: parseNumber(msftMatch[4]),
      unrealizedGainLoss: parseNumber(msftMatch[5]),
      incomeEarned: parseNumber(msftMatch[6])
    });
  }

  // Total holdings
  const totalHoldingsMatch = text.match(/Total Holdings\s+\$([\d.,]+)\s+\$([\d.,]+)\s+\$([-\d.,]+)\s+\$([\d.,]+)/);
  if (totalHoldingsMatch) {
    result.totalMarketValue = parseNumber(totalHoldingsMatch[1]);
    result.totalCostBasis = parseNumber(totalHoldingsMatch[2]);
    result.netGains = parseNumber(totalHoldingsMatch[3]);
    result.totalDividends = parseNumber(totalHoldingsMatch[4]);
  }

  return result;
}

// Parse income certificate (Adeverinta Venit)
function parseAdeverinta(text, year) {
  const result = {
    year,
    rawText: text,
    interestIncome: 0,
    interestTax: 0,
    gamblingIncome: 0,
    gamblingTax: 0,
    salaryIncome: 0,
    salaryTax: 0,
    dividendIncome: 0,
    dividendTax: 0,
    entries: []
  };

  // Parse entries from the table structure
  // Each entry has: type, realized/estimated, taxableIncome, tax, grossIncome
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Look for "Venituri din dobanzi" entries
    if (/Venituri din\s*\n?dobanzi/i.test(line) || /dobanzi/.test(line)) {
      // Try to find nearby numbers
      const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
      const nums = context.match(/(\d[\d.,]*)\s+(\d[\d.,]*)/);
      if (nums) {
        // For "Realizat X Y" pattern, X is taxable, Y is tax
        const allNums = context.match(/\d[\d.]*/g);
        if (allNums && allNums.length >= 2) {
          // Find the pattern: Realizat <taxable> <tax> ... <gross>
          for (let j = 0; j < allNums.length - 1; j++) {
            if (parseFloat(allNums[j]) > 0 && parseFloat(allNums[j]) < 10000) {
              result.interestIncome = parseNumber(allNums[j]);
              result.interestTax = parseNumber(allNums[j + 1]);
              break;
            }
          }
        }
      }
    }

    // Look for gambling income
    if (/jocuri de noroc/i.test(line)) {
      const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
      const nums = context.match(/Realizat\s+(\d[\d.,]*)\s+(\d[\d.,]*)/);
      if (nums) {
        result.gamblingIncome = parseNumber(nums[1]);
        result.gamblingTax = parseNumber(nums[2]);
      }
    }

    // Look for salary income
    if (/Venituri salariale/i.test(line)) {
      const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
      const nums = context.match(/Realizat\s+(\d[\d.,]*)\s+(\d[\d.,]*)/);
      if (nums) {
        const income = parseNumber(nums[1]);
        const tax = parseNumber(nums[2]);
        if (income > result.salaryIncome) {
          result.salaryIncome = income;
          result.salaryTax = tax;
        }
      }
    }

    i++;
  }

  // Direct pattern matching for the specific format
  // "Realizat 342 34" for interest
  const interestPattern = text.match(/Realizat\s+(\d+)\s+(\d+)[\s\S]*?dobanzi/);
  if (interestPattern) {
    result.interestIncome = parseNumber(interestPattern[1]);
    result.interestTax = parseNumber(interestPattern[2]);
  }

  // Alternative: look for "dobanzi" then backtrack numbers
  const dobLines = text.split('\n');
  for (let j = 0; j < dobLines.length; j++) {
    if (/dobanzi/.test(dobLines[j])) {
      // Look 1-2 lines before for "Realizat X Y"
      for (let k = Math.max(0, j - 4); k <= j; k++) {
        const m = dobLines[k].match(/Realizat\s+(\d+)\s+(\d+)/);
        if (m) {
          result.interestIncome = parseNumber(m[1]);
          result.interestTax = parseNumber(m[2]);
        }
      }
      // Also look for the gross amount (usually on same line or after)
      const grossMatch = dobLines[j].match(/(\d+)\s*$/);
      if (grossMatch) {
        const g = parseNumber(grossMatch[1]);
        if (g >= result.interestIncome) {
          result.entries.push({
            type: 'dobanzi',
            taxableIncome: result.interestIncome,
            tax: result.interestTax,
            grossIncome: g
          });
        }
      }
    }
  }

  return result;
}

function parseNumber(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/,/g, ''));
}

async function main() {
  console.log('=== Financial Data Extraction ===\n');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const metadata = {
    extractedAt: new Date().toISOString(),
    sources: {}
  };

  // Extract all PDFs
  for (const [key, filePath] of Object.entries(PDF_SOURCES)) {
    console.log(`Extracting: ${key}...`);
    try {
      const text = await extractPdfText(filePath);
      // Save raw text
      fs.writeFileSync(path.join(DATA_DIR, `${key}_raw.txt`), text, 'utf8');
      metadata.sources[key] = { path: filePath, status: 'ok', chars: text.length };
      console.log(`  -> ${text.length} characters extracted`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
      metadata.sources[key] = { path: filePath, status: 'error', error: err.message };
    }
  }

  // Extract Excel data
  console.log('\nExtracting Excel: Stock Award Document...');
  try {
    const excelData = extractExcelData(EXCEL_SOURCE);
    fs.writeFileSync(path.join(DATA_DIR, 'stock_awards.json'), JSON.stringify(excelData, null, 2), 'utf8');
    metadata.sources['stock_awards'] = { path: EXCEL_SOURCE, status: 'ok', sheets: Object.keys(excelData) };
    console.log(`  -> Sheets: ${Object.keys(excelData).join(', ')}`);

    // Extract stock_withholding totals
    let totalWithholding = 0;
    for (const sheetName of Object.keys(excelData)) {
      for (const row of excelData[sheetName]) {
        if (row.stock_withholding !== undefined && row.stock_withholding !== null) {
          const val = parseFloat(row.stock_withholding);
          if (!isNaN(val)) totalWithholding += val;
        }
      }
    }
    metadata.totalStockWithholding = totalWithholding;
    console.log(`  -> Total stock_withholding: ${totalWithholding}`);
  } catch (err) {
    console.error(`  -> ERROR: ${err.message}`);
    metadata.sources['stock_awards'] = { path: EXCEL_SOURCE, status: 'error', error: err.message };
  }

  // Parse extracted data
  console.log('\nParsing extracted data...');
  const parsedData = { years: {} };

  for (const year of [2023, 2024]) {
    const yearData = { year, declaratie: null, investment: null, adeverinta: null };

    // Parse declaration
    const declFile = path.join(DATA_DIR, `declaratie_${year}_raw.txt`);
    if (fs.existsSync(declFile)) {
      yearData.declaratie = parseDeclaratie(fs.readFileSync(declFile, 'utf8'), year);
      delete yearData.declaratie.rawText; // Don't store raw text in parsed JSON
    }

    // Parse investment report
    const invFile = path.join(DATA_DIR, `investment_${year}_raw.txt`);
    if (fs.existsSync(invFile)) {
      yearData.investment = parseInvestment(fs.readFileSync(invFile, 'utf8'), year);
      delete yearData.investment.rawText;
    }

    // Parse income certificate
    const advFile = path.join(DATA_DIR, `adeverinta_${year}_raw.txt`);
    if (fs.existsSync(advFile)) {
      yearData.adeverinta = parseAdeverinta(fs.readFileSync(advFile, 'utf8'), year);
      delete yearData.adeverinta.rawText;
    }

    parsedData.years[year] = yearData;
  }

  // Add 2025 placeholder
  parsedData.years[2025] = {
    year: 2025,
    declaratie: null,
    investment: null,
    adeverinta: null,
    isPlaceholder: true,
    notes: 'User needs to input 2025 data manually (dividends, stock sales from Fidelity and XTB)'
  };

  fs.writeFileSync(path.join(DATA_DIR, 'parsed_data.json'), JSON.stringify(parsedData, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'pdf_metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  console.log('\n=== Extraction Complete ===');
  console.log(`Files saved to: ${DATA_DIR}`);
}

main().catch(console.error);
