/**
 * Unit tests for lib/d212-xml-parser.js + lib/d212-duf-compare.js.
 *
 * Parser tests use the synthetic fixture at test/fixtures/d212-sample-anaf.xml
 * which contains no real PII (all values are round synthetic numbers; see the
 * fixture's header comment for the full disclaimer).
 *
 * Comparator tests build small in-memory payloads instead of files to keep
 * the cases tightly scoped.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseD212Xml, parseAttrs, extractElements } = require('../lib/d212-xml-parser');
const { compareDufVsLocal, classify } = require('../lib/d212-duf-compare');

const FIXTURE = path.join(__dirname, 'fixtures', 'd212-sample-anaf.xml');

// -------- low-level parser primitives --------

test('parseAttrs reads simple attributes including entity escapes', () => {
  const r = parseAttrs(' a="1" b="hello &amp; bye" c="x &quot;y&quot;"');
  assert.equal(r.a, '1');
  assert.equal(r.b, 'hello & bye');
  assert.equal(r.c, 'x "y"');
});

test('parseAttrs skips xmlns and xsi:schemaLocation', () => {
  const r = parseAttrs(' xmlns="ns" xmlns:xsi="x" xsi:schemaLocation="ns" a="ok"');
  assert.equal(r.a, 'ok');
  assert.equal(r.xmlns, undefined);
  assert.equal(r['xmlns:xsi'], undefined);
  assert.equal(r['xsi:schemaLocation'], undefined);
});

test('extractElements finds all self-closing instances', () => {
  const xml = '<root><x a="1"/><y/><x a="2" b="3"/></root>';
  const xs = extractElements(xml, 'x');
  assert.equal(xs.length, 2);
  assert.equal(xs[0].a, '1');
  assert.equal(xs[1].a, '2');
  assert.equal(xs[1].b, '3');
});

// -------- full document parse on the synthetic golden fixture --------

test('parseD212Xml on the golden fixture returns expected structure', () => {
  const xml = fs.readFileSync(FIXTURE, 'utf8');
  const r = parseD212Xml(xml);

  assert.equal(r.root.cif, '1800101220038');
  assert.equal(r.root.nume_c, 'POPESCU');
  assert.equal(r.root.prenume_c, 'ION');
  assert.equal(r.root.luna_r, 12);              // numeric coercion
  assert.equal(r.root.an_r, 2026);
  assert.equal(r.root.bifa121, 1);

  assert.ok(r.obligRealizat);
  assert.equal(r.obligRealizat.cass_ven_inv, 500000);
  assert.equal(r.obligRealizat.cass_baza, 97200);

  assert.equal(r.cap11.length, 1);
  assert.equal(r.cap11[0].categ_venit, '1016');  // PFA in the golden sample (kept as string id)
  assert.equal(r.cap11[0].venit_brut, 50000);

  assert.equal(r.cap14.length, 1);
  assert.equal(r.cap14[0].str_categ_venit, '2012');
  assert.equal(r.cap14[0].str_venit_net_anual, 0);

  assert.equal(r.raw.version, 'V-1.8.09 / 15.05.2026');
  assert.match(r.raw.generatedAt, /^\d{4}-\d{2}-\d{2}/);
});

test('parseD212Xml throws on empty / non-D212 input', () => {
  assert.throws(() => parseD212Xml(''), /empty/);
  assert.throws(() => parseD212Xml('<other/>'), /d212/i);
});

test('parseD212Xml is null-safe when oblig_realizat is absent', () => {
  const xml = `<?xml version="1.0"?><d212 xmlns="mfp:anaf:dgti:d212:declaratie:v11" cif="0" luna_r="12" an_r="2026"/>`;
  const r = parseD212Xml(xml);
  assert.equal(r.obligRealizat, null);
  assert.deepEqual(r.cap11, []);
  assert.deepEqual(r.cap14, []);
});

// -------- classifier --------

test('classify thresholds: match / near / mismatch / only-*', () => {
  assert.equal(classify(100, 100), 'match');
  assert.equal(classify(100, 100.5), 'match');                  // |delta| < 1
  assert.equal(classify(1000, 1050), 'near');                   // < 100 RON absolute
  assert.equal(classify(100000, 100500), 'near');               // < 1%
  assert.equal(classify(1000, 5000), 'mismatch');               // 4000 RON, > NEAR_ABS, > 1%
  assert.equal(classify(null, 100), 'only-local');
  assert.equal(classify(100, null), 'only-anaf');
  assert.equal(classify(null, null), 'match');                  // both absent = no row really
});

// -------- top-level comparator --------

test('compareDufVsLocal: identical inputs → headline=match', () => {
  const anaf = {
    obligRealizat: { cass_ven_inv: 100000, cass_baza: 97200, cass_datorat: 9720 },
    cap11: [{ categ_venit: '1012', venit_net_anual: 10000, impozit_retinut: 300 }],
    cap14: [{ str_stat_realiz_v: 'US', str_categ_venit: '2018', str_venit_net_anual: 5000 }],
  };
  const local = {
    obligRealizat: { cass_ven_inv: 100000, cass_baza: 97200, cass_datorat: 9720 },
    cap11Rows: [{ categ_venit: '1012', venit_net_anual: 10000, impozit_retinut: 300 }],
    cap14Rows: [{ str_stat_realiz_v: 'US', str_categ_venit: '2018', str_venit_net_anual: 5000 }],
  };
  const r = compareDufVsLocal(anaf, local);
  assert.equal(r.headline, 'match');
  assert.equal(r.totals.mismatchCount, 0);
  for (const row of r.rows) assert.equal(row.status, 'match');
});

test('compareDufVsLocal: ANAF has a cap11 row we lack → only-anaf flagged', () => {
  const anaf = {
    obligRealizat: { cass_ven_inv: 1000 },
    cap11: [{ categ_venit: '1012', venit_net_anual: 1000, impozit_retinut: 30 }],
    cap14: [],
  };
  const local = {
    obligRealizat: { cass_ven_inv: 0 },
    cap11Rows: [],
    cap14Rows: [],
  };
  const r = compareDufVsLocal(anaf, local);
  const cap11Row = r.rows.find((x) => x.section === 'cap11' && x.label.startsWith('Câștiguri RO'));
  assert.ok(cap11Row);
  assert.equal(cap11Row.status, 'only-anaf');
  // Headline lifted to 'mismatch' because cass_ven_inv 1000 vs 0 is a numeric mismatch too.
  assert.equal(r.headline, 'mismatch');
});

test('compareDufVsLocal: PFA codes (10xx, not 1012) from ANAF surface as only-anaf with friendly hint', () => {
  const anaf = {
    obligRealizat: null,
    cap11: [{ categ_venit: '1016', venit_net_anual: 27000 }],
    cap14: [],
  };
  const local = { cap11Rows: [], cap14Rows: [] };
  const r = compareDufVsLocal(anaf, local);
  const pfaRow = r.rows.find((x) => x.label.includes('1016'));
  assert.ok(pfaRow);
  assert.equal(pfaRow.status, 'only-anaf');
  assert.match(pfaRow.hint, /PFA/);
});

test('compareDufVsLocal: near-match within 100 RON → headline=partial', () => {
  const anaf = {
    obligRealizat: { cass_ven_inv: 5050 },
    cap11: [{ categ_venit: '1012', venit_net_anual: 5050, impozit_retinut: 150 }],
    cap14: [],
  };
  const local = {
    obligRealizat: { cass_ven_inv: 5000 },
    cap11Rows: [{ categ_venit: '1012', venit_net_anual: 5000, impozit_retinut: 150 }],
    cap14Rows: [],
  };
  const r = compareDufVsLocal(anaf, local);
  assert.equal(r.headline, 'partial');
  const cassRow = r.rows.find((x) => x.label.startsWith('Total venit din investiții'));
  assert.equal(cassRow.status, 'near');
});

test('compareDufVsLocal: divergent cap14 surfaces mismatch with signed delta', () => {
  const anaf = {
    cap14: [{ str_stat_realiz_v: 'US', str_categ_venit: '2012', str_venit_net_anual: 50000 }],
    cap11: [],
  };
  const local = {
    cap14Rows: [{ str_stat_realiz_v: 'US', str_categ_venit: '2012', str_venit_net_anual: 30000 }],
    cap11Rows: [],
  };
  const r = compareDufVsLocal(anaf, local);
  const row = r.rows.find((x) => x.section === 'cap14' && !x.label.includes('credit fiscal'));
  assert.equal(row.status, 'mismatch');
  assert.equal(row.delta, 20000);
  assert.equal(row.anaf, 50000);
  assert.equal(row.local, 30000);
});

test('compareDufVsLocal: local-only cap14 row (we calculated something ANAF lacks)', () => {
  const anaf = { cap14: [], cap11: [] };
  const local = {
    cap14Rows: [{ str_stat_realiz_v: 'US', str_categ_venit: '2018', str_venit_net_anual: 4500 }],
    cap11Rows: [],
  };
  const r = compareDufVsLocal(anaf, local);
  const row = r.rows.find((x) => x.section === 'cap14');
  assert.ok(row);
  assert.equal(row.status, 'only-local');
  assert.match(row.hint, /trebuie adăugată manual în DUF/);
});
