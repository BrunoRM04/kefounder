import assert from 'node:assert/strict';
import { test } from 'node:test';
import { personCompat, projectCompat } from '../server/compat.js';

const person = (changes = {}) => ({
  goal: 'join_project', roles: ['developer'], skills: ['React', 'Node.js'],
  interests: ['Fintech'], languages: ['Español'], availability: 'h10_20',
  compensation: 'equity', work_mode: 'remote', city: 'Montevideo', country: 'Uruguay',
  ...changes
});
const project = (changes = {}) => ({
  name: 'Equipo real', status: 'published', moderation: 'ok',
  rolesNeeded: [{ role: 'cto', dedication: 'h10_20', compensation: 'equity' }],
  dedication: 'h10_20', compensation: 'equity', work_mode: 'remote',
  city: 'Montevideo', country: 'Uruguay', industry: 'Fintech', stack: ['React'],
  ...changes
});
const factor = (result, key) => result.breakdown.find((item) => item.key === key)?.value;

test('la compatibilidad no inventa un porcentaje ni coincidencias cuando faltan datos', () => {
  const empty = person({ goal: '', roles: [], skills: [], interests: [], languages: [], availability: '', compensation: '', work_mode: '', city: '', country: '' });
  const result = personCompat(empty, empty);
  assert.equal(result.score, null);
  assert.equal(result.coverage, 0);
  assert.deepEqual(result.reasons, []);
  assert.ok(result.breakdown.every((entry) => entry.value === null));
});

test('el cálculo entre personas cambia con sus datos y solo explica coincidencias reales', () => {
  const founder = person({ goal: 'find_talent', roles: ['founder'], skills: ['Ventas B2B'] });
  const suitable = person();
  const unsuitable = person({ goal: 'find_talent', roles: ['founder'], availability: 'fulltime', compensation: 'paid', work_mode: 'onsite', city: 'Buenos Aires', country: 'Argentina', interests: ['Gaming'], languages: ['Inglés'] });
  const matching = personCompat(founder, suitable, [project()]);
  const conflicting = personCompat(founder, unsuitable, [project()]);
  assert.ok(matching.score > conflicting.score);
  assert.ok(matching.reasons.some((reason) => reason.includes('Equipo real busca CTO')));
  assert.ok(!conflicting.reasons.some((reason) => reason.includes('Equipo real busca CTO')));
  assert.equal(factor(personCompat(founder, suitable, []), 'needs'), null);
  assert.equal(factor(personCompat(founder, suitable, [project({ moderation: 'hidden' })]), 'needs'), null);
});

test('el proyecto usa los requisitos persistidos por rol y refleja sus cambios', () => {
  const candidate = person();
  const matching = projectCompat(candidate, project());
  const differentTerms = projectCompat(candidate, project({
    rolesNeeded: [{ role: 'cto', dedication: 'fulltime', compensation: 'paid' }]
  }));
  assert.equal(factor(matching, 'availability'), 100);
  assert.equal(factor(matching, 'compensation'), 100);
  assert.ok(factor(differentTerms, 'availability') < factor(matching, 'availability'));
  assert.ok(factor(differentTerms, 'compensation') < factor(matching, 'compensation'));
  assert.ok(differentTerms.score < matching.score);
  const absent = projectCompat(candidate, project({ stack: [], industry: '', work_mode: '' }));
  assert.equal(factor(absent, 'skills'), null);
  assert.equal(factor(absent, 'interests'), null);
  assert.equal(factor(absent, 'location'), null);
  const unknownCity = projectCompat(person({ work_mode: 'onsite', city: '' }), project({ work_mode: 'onsite' }));
  assert.equal(factor(unknownCity, 'location'), null, 'sin ciudad no se presupone cercanía presencial');
});
