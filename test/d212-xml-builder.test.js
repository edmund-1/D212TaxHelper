/**
 * Unit tests for lib/d212-xml-builder.js — D212 XML emission.
 *
 * The golden assertions are deliberately structural (presence of attributes,
 * correct values) rather than byte-equal — the builder reserves the right
 * to reformat whitespace between releases.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildD212Xml, xmlEsc } = require('../lib/d212-xml-builder');

test('throws when year is missing or not integer', () => {
  assert.throws(() => buildD212Xml({}), /year/);
  assert.throws(() => buildD212Xml({ year: '2025' }), /year/);
  assert.throws(() => buildD212Xml({ year: 2025.5 }), /year/);
});

test('empty payload → minimal valid skeleton with both bifa flags = 0', () => {
  const xml = buildD212Xml({ year: 2025 });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<d212 xmlns="mfp:anaf:dgti:d212:declaratie:v11"/);
  assert.match(xml, /\san_r="2026"/);                       // year + 1
  assert.match(xml, /\sbifa111="0"/);
  assert.match(xml, /\sbifa121="0"/);
  assert.match(xml, /\sd_rec="0"/);
  assert.match(xml, /<\/d212>/);
  assert.doesNotMatch(xml, /<cap11/);
  assert.doesNotMatch(xml, /<cap14/);
});

test('with cap11Rows → bifa111=1 and cap11 element emitted with all attrs', () => {
  const cap11Rows = [{
    categ_venit: '1012',
    den_venit: 'Câștiguri din transferul titlurilor de valoare',
    venit_brut: 15000,
    chelt_deduc: 0,
    venit_net_anual: 15000,
    pierdere: 0,
    pierdere_precedenta: 0,
    pierdere_compensata: 0,
    venit_recalculat: 15000,
    impozit11: 250,
    impozit_retinut: 250,
  }];
  const xml = buildD212Xml({ year: 2025, cap11Rows });
  assert.match(xml, /\sbifa111="1"/);
  assert.match(xml, /<cap11[^/]+categ_venit="1012"/);
  assert.match(xml, /\svenit_brut="15000"/);
  assert.match(xml, /\simpozit11="250"/);
  assert.match(xml, /\simpozit_retinut="250"/);
});

test('with cap14Rows → bifa121=1 and multi-row emission', () => {
  const cap14Rows = [
    {
      str_stat_realiz_v: 'US', den_stat: 'SUA', str_categ_venit: '2018', den_categ_venit: 'Dividende',
      dubla_impunere: '1', str_venit_brut: 4500, str_chelt_deduc: 0, str_venit_net_anual: 4500,
      str_pierdere_anuala: 0, str_pierdere_precedenta: 0, str_pierdere_compensata: 0,
      str_venit_recalculat: 4500, str_impozit_datorat_Ro: 450, str_impozit_platit: 675,
      str_credit_fiscal: 450, str_dif_impozit_datorat: 0,
    },
    {
      str_stat_realiz_v: 'US', den_stat: 'SUA', str_categ_venit: '2012', den_categ_venit: 'Capgains',
      dubla_impunere: '1', str_venit_brut: 45000, str_chelt_deduc: 29000, str_venit_net_anual: 16000,
      str_pierdere_anuala: 0, str_pierdere_precedenta: 0, str_pierdere_compensata: 0,
      str_venit_recalculat: 16000, str_impozit_datorat_Ro: 1600, str_impozit_platit: 0,
      str_credit_fiscal: 0, str_dif_impozit_datorat: 1600,
    },
  ];
  const xml = buildD212Xml({ year: 2025, cap14Rows });
  assert.match(xml, /\sbifa121="1"/);
  // Both rows present
  assert.match(xml, /<cap14[^/]+str_categ_venit="2018"/);
  assert.match(xml, /<cap14[^/]+str_categ_venit="2012"/);
  // Counts: exactly 2 cap14 self-closing tags
  const cap14Count = (xml.match(/<cap14 /g) || []).length;
  assert.equal(cap14Count, 2);
});

test('placeholder personal data + TODO comment when personalData omitted', () => {
  const xml = buildD212Xml({ year: 2025 });
  assert.match(xml, /\snume_c="NUME"/);
  assert.match(xml, /\sprenume_c="PRENUME"/);
  assert.match(xml, /\scif="0000000000000"/);
  assert.match(xml, /TODO INAINTE DE IMPORT/);
});

test('personalData → no TODO comment + values used + totalPlata_A computed', () => {
  // CNP "1900101220033" has digits sum 1+9+0+0+1+0+1+2+2+0+0+3+3 = 22
  const xml = buildD212Xml({
    year: 2025,
    personalData: {
      nume_c: 'Popescu', prenume_c: 'Ion', cif: '1900101220033', nerezident: 0,
      cont_bancar: 'RO49AAAA1B31007593840000',
    },
  });
  assert.doesNotMatch(xml, /TODO INAINTE DE IMPORT/);
  assert.match(xml, /\snume_c="Popescu"/);
  assert.match(xml, /\sprenume_c="Ion"/);
  assert.match(xml, /\scif="1900101220033"/);
  assert.match(xml, /\stotalPlata_A="22"/);
  assert.match(xml, /\scont_bancar="RO49AAAA1B31007593840000"/);
});

test('xmlEsc handles entity-relevant characters', () => {
  assert.equal(xmlEsc('A&B'), 'A&amp;B');
  assert.equal(xmlEsc('<tag>'), '&lt;tag&gt;');
  assert.equal(xmlEsc('"q"'), '&quot;q&quot;');
  assert.equal(xmlEsc(null), '');
  assert.equal(xmlEsc(undefined), '');
});

test('special chars in den_venit / den_stat are properly escaped', () => {
  const xml = buildD212Xml({
    year: 2025,
    cap14Rows: [{
      str_stat_realiz_v: 'US', den_stat: 'A & B "Co"', str_categ_venit: '2018',
      den_categ_venit: 'Dividende', dubla_impunere: '1',
      str_venit_brut: 100, str_chelt_deduc: 0, str_venit_net_anual: 100,
      str_pierdere_anuala: 0, str_pierdere_precedenta: 0, str_pierdere_compensata: 0,
      str_venit_recalculat: 100, str_impozit_datorat_Ro: 10, str_impozit_platit: 0,
      str_credit_fiscal: 0, str_dif_impozit_datorat: 10,
    }],
  });
  assert.match(xml, /A &amp; B &quot;Co&quot;/);
  assert.doesNotMatch(xml, /A & B "Co"/);
});

test('luna_r is current month padded to 2 digits', () => {
  const xml = buildD212Xml({ year: 2025 });
  assert.match(xml, /\sluna_r="\d{2}"/);
});
