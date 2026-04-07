const fs = require('fs');
const path = require('path');

const en = require('./public/locales/en.json');
const ro = require('./public/locales/ro.json');
const html = fs.readFileSync('./public/index.html', 'utf8');
const appJs = fs.readFileSync('./public/js/app.js', 'utf8');

function resolve(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => o && o[k], obj);
}

// 1. Check data-i18n in HTML
const htmlRe = /data-i18n="([^"]+)"/g;
let m;
const htmlKeys = new Set();
while ((m = htmlRe.exec(html)) !== null) htmlKeys.add(m[1]);

console.log('=== HTML data-i18n attributes ===');
console.log('Count:', htmlKeys.size);
const htmlMissing = [];
for (const k of htmlKeys) {
  if (resolve(en, k) === undefined) htmlMissing.push(k + ' (missing in EN)');
  if (resolve(ro, k) === undefined) htmlMissing.push(k + ' (missing in RO)');
}
console.log('Missing:', htmlMissing.length ? htmlMissing : 'NONE');

// 2. Check I18n.t() calls in app.js
const tRe = /I18n\.t\(['"]([^'"]+)['"]/g;
const jsKeys = new Set();
while ((m = tRe.exec(appJs)) !== null) jsKeys.add(m[1]);

console.log('\n=== JS I18n.t() calls ===');
console.log('Count:', jsKeys.size);
const jsMissing = [];
for (const k of jsKeys) {
  if (resolve(en, k) === undefined) jsMissing.push(k + ' (missing in EN)');
  if (resolve(ro, k) === undefined) jsMissing.push(k + ' (missing in RO)');
}
console.log('Missing:', jsMissing.length ? jsMissing : 'NONE');

// 3. Check for empty values in either locale
function findEmpty(obj, prefix = '') {
  const empties = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      empties.push(...findEmpty(obj[k], p));
    } else if (typeof obj[k] === 'string' && obj[k].trim() === '') {
      empties.push(p);
    }
  }
  return empties;
}

console.log('\n=== Empty values ===');
const enEmpty = findEmpty(en);
const roEmpty = findEmpty(ro);
console.log('EN empty:', enEmpty.length ? enEmpty : 'NONE');
console.log('RO empty:', roEmpty.length ? roEmpty : 'NONE');

// 4. Check for untranslated values (same in EN and RO, excluding technical terms)
console.log('\n=== Potentially untranslated (same value in EN and RO) ===');
function flatPairs(obj, prefix = '') {
  const pairs = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      pairs.push(...flatPairs(obj[k], p));
    } else if (typeof obj[k] === 'string') {
      pairs.push([p, obj[k]]);
    }
  }
  return pairs;
}

const enPairs = flatPairs(en);
const same = [];
for (const [key, val] of enPairs) {
  const roVal = resolve(ro, key);
  if (roVal === val && val.length > 3) {
    same.push(key + ' => "' + val + '"');
  }
}
console.log(same.length ? same : 'NONE');
