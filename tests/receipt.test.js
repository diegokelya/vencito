// Mismos casos que PurchaseReceiptTests (iOS/Android): tickets de Argentina, Día, Walmart, Target, TJ Maxx y Mercadona.
const test = require('node:test'), assert = require('node:assert/strict');
const R = require('../app/receipt.js');
const names = r => r.items.map(i => i.name), qtys = r => r.items.map(i => i.qty);

test('ticket común: cantidad en una línea aparte, fecha y precio con IVA', () => {
  const r = R.parse(['YAN GUOZHONG', 'CUIT Nro.: 20-95801271-4', 'Fecha 27/06/2026 Hora 20:25:05', 'SANTA JULIA CH*750ML (21) 8000,00', 'SPRITE ZERO 1*1.75LT (21) 4000,00',
    'NATURA KETCHUP*250GR (21) 2000,00', 'CANUELAS HARINA *1 (10,50) 1000,00', 'ALMACEN (21) 1000,00', '2 x 2200,00', 'ALMACEN (21) 4400,00', 'LAY*S CLASICAS *85GR (21) 3500,00',
    'SERENISIMA CRE*200ML (21) 3100,00', '3 x 700,00', 'MINI ROCKLETS *10GrA (21) 2100,00', 'PANCETA 42*1KG (21) 3780,00', 'Subtotal 32880,00', 'TOTAL 32880,00', 'Efectivo 32880,00', 'IVA 21%:5532.89 IVA 10.5%: 95.02']);
  assert.equal(r.items.length, 10);
  assert.deepEqual(qtys(r), [1, 1, 1, 1, 1, 2, 1, 1, 3, 1]);
  assert.equal(r.date, '2026-06-27');
});

test('Día: cantidad arriba, código de barras abajo; la ley y el ahorro no son productos', () => {
  const r = R.parse(['DIA ARGENTINA SA', 'CUIT:30-68584975-1', 'Cant./Precio Unit.', 'Descripcion (%IVA) [%BI ] IMPORTE', '1,00 X 4800,00', 'DLCE MEMBRI ESNAOLA (21,00) 4800,00', '7791451080040',
    '2,00 X 3890,00', 'MANTECA SIN SAL (21,00) 7780,00', '8480017290649', '4,00 X 2610,00', 'ATUN LOM A DIA 170GR (21,00) 10440,00', '8480017558138', 'SUBTOTAL: 23020,00', 'TOTAL $ 23020.00',
    'CONSUMIDOR (LEY 27.743) 0,00', 'IVA CONTENIDO 3995,21', 'AHORRO CLUBDIA 3520,00', 'TOT AHORRO 3520,00']);
  assert.deepEqual(qtys(r), [1, 2, 4]);
  assert.deepEqual(r.items.map(i => i.barcode), ['7791451080040', '8480017290649', '8480017558138']);
  const merged = R.parse(['1,00 X 4800,00 DLCE MEMBRI ESNAOLA (21,00) 4800,00', '2,00 X 3890,00 MANTECA SIN SAL (21,00) 7780,00']);
  assert.deepEqual(qtys(merged), [1, 2]);
});

test('precio separado del nombre (foto inclinada)', () => {
  assert.equal(R.parse(['SANTA JULIA CH*750ML (21)', '8000,00', 'SPRITE ZERO 1*1.75LT (21)', '4000,00']).items.length, 2);
});

test('Walmart México: código al principio, cantidad y total abajo, peso y descuentos', () => {
  const r = R.parse(['Walmart', 'NUEVA WAL MART DE MEXICO S DE RL DE CV', 'REGIMEN FISCAL - 601', '7501101525513 BACHOCO HV', '2 X $96.00 $ 192.00T', '7501791658911 BOLSA VERD $ 28.00A',
    '7506495017378 GREATVALUE', '2 X $20.00 $ 40.00A', '7506339323474 SALVO 1.2L', '2 X $82.00 $ 164.00A', 'Multiahorro 2X$110 $ -54.00', '021136010480 TOPOCH MIN $ 28.00A',
    '501 MELON CHINO', '1.840 KGS X $ 35.50/KG $ 65.32T', '3006097966 FRIJOLES R', '2 X $45.00 $ 90.00T']);
  assert.equal(r.items.length, 7);
  assert.deepEqual(qtys(r), [2, 1, 2, 2, 1, 1, 2]);
  assert.equal(r.items.find(i => i.name.startsWith('Melon')).weight, 1.84);
});

test('Walmart EE. UU.: importe con espacio, pesables, repetidos y renglón anulado', () => {
  const us = R.parse(['Thank you! ID # 7PBJB8178CQJ', 'ST# 03534 OP# 006165 TE# 02 TR# 03395', 'LAYS 002840019963 F 2 68 N', 'LAYS 002840019963 F 2 68 N', 'ORG BANANAS 000000094011KF',
    '2.42 lb @ 1 lb /0.68 1 65 N', 'EQ FIBER 068113129773 9 34 X', 'GV SOY VAN 007874221116 F 2 36 O', 'GV SOY VAN 007874221116 F 2 36 O', 'MILK 007874235188 2 06 O',
    '100 CRANBRY 003120020311 F 5 28 N', 'SUBTOTAL 59 67', 'TAX 1 7 375 % 1 38', 'TOTAL 61 05', 'DEBIT TEND 61 05', 'CHANGE DUE 100 00', '# ITEMS SOLD 17']);
  assert.deepEqual(names(us), ['Lays', 'Org Bananas', 'Eq Fiber', 'Gv Soy Van', 'Milk', '100 Cranbry']);
  assert.deepEqual(qtys(us), [2, 1, 1, 2, 1, 1]);
  const v = R.parse(['PCF MAGNET 773418239790 6.48 X', 'TWIX MN 040000607410 F 5.97 X', 'TWIX MN 040000607410 F 5.97 X', '** VOIDED ENTRY **', 'TWIX MN 040000607410 F',
    'NECKLACE 887746690080 19.94 X', 'PCF MAGNET 773418239790 6.48 X', '92535-1635 049845250120 106.00 X', 'SUBTOTAL 189.82', 'TAX1 7.0000 % 13.29', 'TOTAL 203.11', 'MCARD TEND 203.11', 'CHANGE DUE 0.00']);
  assert.deepEqual(names(v), ['Pcf Magnet', 'Twix Mn', 'Necklace', '92535-1635']);
  assert.deepEqual(qtys(v), [2, 1, 1, 1]);
  assert.equal(v.items.find(i => i.name === 'Twix Mn').barcode, '040000607410');
});

test('Target y TJ Maxx', () => {
  const t = R.parse(['GROCERY', '271100144 COKE CLASSIC TFP $5.49', 'Bottle Deposit Fee $0.30', '271650761 STARBUCKS NF $8.49', '216340033 GG SIDE NF $4.89', 'SUBTOTAL $54.31',
    'T = NY TAX 8.87500 on $5.49 $0.49', 'TOTAL $54.80', '*0976 MASTERCARD CHARGE $54.80']);
  assert.deepEqual(names(t), ['Coke Classic', 'Starbucks', 'Gg Side']);
  const tj = R.parse(['REGULAR SALE', "20 - MEN'S FURNISHI 264917 $9.99 N", "20 - MEN'S FURNISHI 243240 $9.99 N", 'Subtotal $19.98', 'NY 8.875% Sales Tax $0.00', 'Total $19.98', 'MASTERCARD $19.98', 'Change $0.00']);
  assert.equal(tj.items.length, 2); assert.ok(tj.items.every(i => !i.food));
});

test('Mercadona: cantidad, nombre y precios; pesables en dos renglones', () => {
  const r = R.parse(['MERCADONA, S.A. A-46103834', '09/08/2025 14:43 OP: 750629', 'Descripción P. Unit Importe', '3 FONT NATURA 8L 0,92 2,76', '1 GELLY 0% SABORES 1,00', '1 24 HUEVOS FRESCOS 4,75',
    '3 ARROZ LARGO 1,35 4,05', '2 PAN CENTENO 51 % 1,47 2,94', '1 COLG. TRIPLE ACCION 1,95', '1 SANDIA BAJA SEMILLAS', '7,625 kg 0,55 €/kg 4,19', '1 BANANA', '0,644 kg 1,40 €/kg 0,90',
    'TOTAL (€) 122,05', 'TARJETA BANCARIA 122,05', '4% 34,83 1,39', 'TOTAL 110,60 11,45']);
  assert.deepEqual(names(r), ['Font Natura 8l', 'Gelly 0% Sabores', '24 Huevos Frescos', 'Arroz Largo', 'Pan Centeno 51 %', 'Colg Triple Accion', 'Sandia Baja Semillas', 'Banana']);
  assert.deepEqual(qtys(r), [3, 1, 1, 3, 2, 1, 1, 1]);
  assert.equal(r.items.find(i => i.name.startsWith('Sandia')).weight, 7.625);
  assert.equal(r.items.find(i => i.name.startsWith('Colg')).food, false);
  assert.equal(r.date, '2025-08-09'); assert.equal(r.store, 'Mercadona');
});

test('GTIN, nombres y estimaciones', () => {
  assert.ok(R.isValidGtin('040000607410')); assert.ok(!R.isValidGtin('040000607411'));
  assert.equal(R.cleanName('P.HIGIENICO DOBLE LAT'), 'Papel Higienico Doble');
  const sug = n => (/leche|queso|yogur/i.test(n) ? 'lacteos' : '');
  const e = R.estimate(R.makeItem('LECHE ENTERA LARGA VIDA TTB 1 LT', 1, sug));
  assert.deepEqual(e, { days: 120, place: 'Alacena' });
  assert.deepEqual(R.estimate(R.makeItem('QUESO RALLADO 40 GR', 1, sug)), { days: 60, place: 'Heladera' });
});
