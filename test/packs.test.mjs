// why: the first Haiku round put freight containers on a family cargo bike and flour on a fish
// restaurant. These pin the pack rule Struq's MCP uses (sector word, then product launch, then
// halide) and the alt filter that keeps a pack's off-subject photos out of a site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitImages, packForBrief, wordMatches } from '../skills/struq/scripts/packs.mjs';

test('a sector word picks its pack, as whole words', () => {
  assert.equal(packForBrief('Zout, een visrestaurant in Amsterdam-Noord'), 'proof');
  assert.equal(packForBrief('Architectenbureau in Rotterdam: woningbouw en oude fabriekspanden'), 'datum');
  assert.equal(packForBrief('A small bakery in Utrecht'), 'proof');
  assert.equal(packForBrief('Logistiek: een distributiecentrum met magazijn'), 'transit');
});

test('vehicles never pull a brief to freight; a launch without a sector gets vitrine', () => {
  assert.equal(packForBrief('Lancering van een elektrische bakfiets voor gezinnen en bezorgers in Utrecht'), 'vitrine');
  assert.equal(packForBrief('We launch a new e-bike'), 'vitrine');
  assert.notEqual(packForBrief('De bakfiets voor bezorgers'), 'transit');
});

test('anything else falls back to halide', () => {
  assert.equal(packForBrief('Een website voor ons'), 'halide');
});

const proofImages = [
  { slot: 'hero', alt: 'Lege eetzaal met gedekte tafels voor aanvang', description: '' },
  { slot: 'hero', alt: 'Houten werkbank bestoven met meel en rustend deeg', description: '' },
  { slot: 'card', alt: 'Linnen schort met meelsporen hangend aan de deur', description: '' },
  { slot: 'detail', alt: 'Geblakerde broodkorst met fijne scheuren van dichtbij', description: '' },
  { slot: 'card', alt: 'Zwartgeblakerde ovengroenten op een handgemaakt bord', description: '' },
  { slot: 'detail', alt: 'Grove zeezoutkristallen op donker keramiek', description: '' },
];

test('a fish restaurant does not get the bakery photos of the proof pack', () => {
  const { keep, dropped } = fitImages('proof', 'Zout, een visrestaurant met vis en groente van het seizoen', proofImages);
  assert.deepEqual(keep.map((i) => i.alt).sort(), [proofImages[0].alt, proofImages[4].alt, proofImages[5].alt].sort());
  assert.equal(dropped.length, 3); // compounds count: meelsporen, broodkorst
});

test('a bakery keeps them, and brief words rank the best fit first', () => {
  const { keep } = fitImages('proof', 'Bakkerij met zuurdesembrood en meel uit de molen', proofImages);
  assert.equal(keep.length, proofImages.length);
  assert.equal(keep.filter((i) => i.slot === 'hero')[0].alt, proofImages[1].alt);
});

const vitrineImages = [
  { slot: 'hero', alt: 'Glad stenen object op een egaal verlopend studiodecor', description: 'Geschikt voor een webshop voor interieur.' },
  { slot: 'card', alt: 'Ongeglazuurde keramieken vaas op kalksteen', description: '' },
  { slot: 'card', alt: 'Stalen fietsframe tegen een betonnen wand in de stad', description: '' },
];

test('a pack the brief does not point at only keeps photos whose alt shares the brief', () => {
  const brief = 'Lancering van een elektrische bakfiets voor gezinnen in de stad Utrecht';
  const { keep, fit } = fitImages('vitrine', brief, vitrineImages);
  assert.deepEqual(keep.map((i) => i.alt), [vitrineImages[2].alt]); // the street and the frame, not the vase
  assert.equal(fit, 'partial');
  const none = fitImages('vitrine', 'Lancering van een elektrische bakfiets', vitrineImages.slice(0, 2));
  assert.equal(none.keep.length, 0);
  assert.equal(none.fit, 'none');
});

test('a sector pack keeps its photos as before', () => {
  const { fit } = fitImages('proof', 'Zout, een visrestaurant', proofImages);
  assert.equal(fit, 'full');
});

// why: a Haiku build for an architecture studio ended with one photo. "architectenstudio" did not
// read as architecture, so the brief got halide; with datum named by hand, 23 of its 24 photos were
// left out because their alts did not repeat a word of the brief. The fixture is datum's live alts.
const kadeBrief = 'Atelier Kade, een kleine architectenstudio in Utrecht (drie mensen) die woonhuizen en verbouwingen van oude panden ontwerpt';
const datumImages = JSON.parse(readFileSync(new URL('./fixtures/datum-pack.json', import.meta.url), 'utf8'));

test('Dutch and English compounds and inflections reach their sector', () => {
  for (const b of ['architectenstudio', 'architectenbureau', 'architectuurstudio', 'architect', 'Architects in Leeds']) assert.equal(packForBrief(b), 'datum', b);
  assert.equal(packForBrief(kadeBrief), 'datum');
  assert.equal(packForBrief('Een boetiekhotel in Gent'), 'portico');
  assert.equal(packForBrief('Een modelabel uit Amsterdam'), 'bolt');
  assert.equal(packForBrief('Een koffiebranderij in Gent'), 'proof');
  assert.equal(packForBrief('Een keramiekatelier'), 'vitrine');
});

test('short stems match only whole words, and a stem never matches a lookalike', () => {
  assert.equal(wordMatches('smart', 'art'), false);
  assert.equal(wordMatches('art', 'art'), true);
  assert.equal(wordMatches('modern', 'mode'), false);
  assert.equal(wordMatches('moderne', 'mode'), false);
  assert.equal(packForBrief('Een moderne website voor een smart home app'), 'halide');
});

test('the Duin brief still picks a hospitality or coast pack', () => {
  const pack = packForBrief('Bouw een website voor Duin, een boetiekhotel met twaalf kamers achter de duinen bij Bergen aan Zee.');
  assert.ok(['portico', 'brume'].includes(pack), pack);
});

test('the Kade brief keeps the datum photos', () => {
  const { keep, fit } = fitImages('datum', kadeBrief, datumImages);
  assert.equal(fit, 'full');
  assert.ok(keep.length >= 12, `kept ${keep.length}`);
});
