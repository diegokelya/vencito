// Mismos casos que DateTextParserTests (iOS/Android), con "hoy" fijo.
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../app/dateparser.js'), TODAY = '2026-10-23';
const date = t => { const r = P.parse(t, TODAY); return r && r.date; };
const conf = t => P.parse(t, TODAY).confidence;

test('formatos con prefijo de vencimiento (confianza alta)', () => {
  [['VTO: 14/02/27', '2027-02-14'], ['VTO 25/08/26', '2026-08-25'], ['EXP 2026-08-25', '2026-08-25'], ['CONSUMIR ANTES DEL 25 AGO 2026', '2026-08-25'],
    ['Best before: 12 JUN 2027', '2027-06-12'], ['RNPA 02-523412 VTO 3/4/28', '2028-04-03'], ['Consumir preferentemente antes del 25 de agosto de 2026', '2026-08-25']]
    .forEach(([t, e]) => { assert.equal(date(t), e, t); assert.equal(conf(t), 'alta', t); });
});
test('mes y año usa el último día del mes', () => { assert.equal(date('VTO: 08/2027'), '2027-08-31'); assert.equal(conf('VTO: 08/2027'), 'media'); });
test('el vencimiento gana a la elaboración, en cualquier orden', () => {
  ['ELAB 01/03/26 VTO 01/03/27', 'VTO 01/03/27 ELAB 01/03/26'].forEach(t => assert.equal(date(t), '2027-03-01', t));
});
test('prefijo en la línea anterior', () => { assert.equal(date('VENCE\n12.05.27'), '2027-05-12'); assert.equal(conf('VENCE\n12.05.27'), 'alta'); });
test('un 7 leído como 1 (puntos) se propone como 7, con confianza baja', () => {
  assert.equal(date('Consumir antes del\n23-11-21'), '2027-11-23'); assert.equal(conf('Consumir antes del\n23-11-21'), 'baja');
  assert.equal(date('VTO 23-11-31'), '2031-11-23'); assert.equal(date('VTO 10-08-26'), '2026-08-10'); assert.equal(date('VTO 23-11-23'), '2023-11-23');
});
test('la letra O por cero', () => assert.equal(date('L 2503\n12/O5/2027'), '2027-05-12'));
test('textos sin fecha válida', () => { ["MAYONESA HELLMANN'S 475g", '30/02/2027', '', 'VTO 12/05/1999'].forEach(t => assert.equal(date(t), null, t)); });
test('mes y año de 2 dígitos solo con prefijo', () => {
  [['VTO:04/27', '2027-04-30'], ['VTO 04/27', '2027-04-30'], ['VENC: 11-26', '2026-11-30']].forEach(([t, e]) => { assert.equal(date(t), e, t); assert.equal(conf(t), 'media', t); });
  assert.equal(date('04/27'), null); assert.equal(date('LOTE 04/27'), null); assert.equal(date('VTO 14/02/27'), '2027-02-14');
});
test('otros formatos impresos', () => {
  [['VTO 14 02 27', '2027-02-14'], ['CAD: 14 02 2027', '2027-02-14'], ['EXP 02 2027', '2027-02-28'], ['VTO 02 27', '2027-02-28'], ['VTO 140227', '2027-02-14'],
    ['MHD 14022027', '2027-02-14'], ['VENC 20270214', '2027-02-14'], ['EXP 2027-02', '2027-02-28'], ['EXP 2027/02', '2027-02-28'], ['EXP 27-02-14', '2027-02-14'],
    ['EXP 02/14/2027', '2027-02-14'], ['BEST BY 02/14/27', '2027-02-14'], ['EXP FEB 14 2027', '2027-02-14'], ['BEST BEFORE FEB 14, 2027', '2027-02-14'],
    ['EXP SEP 28 2027', '2027-09-28'], ['VTO l4/02/27', '2027-02-14'], ['VTO\n140227', '2027-02-14'], ['VTO 03/04/2027', '2027-04-03']]
    .forEach(([t, e]) => assert.equal(date(t), e, t));
});
test('números que no son un vencimiento', () => {
  ['LOTE 250326', 'COD 123456', 'EAN 7791234567890', 'PESO NETO 14 02 27', 'LOTE 12 05 27', 'EXP 2027-13'].forEach(t => assert.equal(date(t), null, t));
  ['L 301230 VTO 14/02/27', 'VTO 14/02/27 LOTE 301230'].forEach(t => assert.equal(date(t), '2027-02-14', t)); assert.equal(date('PROD 140227 VTO 140228'), '2028-02-14');
});
