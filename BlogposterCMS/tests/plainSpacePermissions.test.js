const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const EventEmitter = require('events');

function onceWrap(cb) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    if (typeof cb === 'function') cb(...args);
  };
}

function loadService() {
  const base = path.resolve(__dirname, '../mother/modules/plainSpace');
  const code = fs.readFileSync(path.join(base, 'plainSpaceService.js'), 'utf8');
  function customRequire(name) {
    if (name === 'dotenv') return { config: () => {} };
    if (name === '../../emitters/motherEmitter') {
      return { onceCallback: onceWrap };
    }
    if (name.startsWith('./') || name.startsWith('../')) {
      return require(path.join(base, name));
    }
    return require(name);
  }
  const sandbox = { module: {}, exports: {}, require: customRequire, console };
  vm.runInNewContext(code, sandbox, { filename: 'plainSpaceService.js' });
  return sandbox.module.exports;
}

test('widget instance events respect permissions', async () => {
  const { registerPlainSpaceEvents } = loadService();
  const em = new EventEmitter();
  registerPlainSpaceEvents(em);

  let updates = 0;
  let selects = 0;

  em.on('dbUpdate', (payload, cb) => { updates++; cb(null, { ok: true }); });
  em.on('dbSelect', (payload, cb) => { selects++; cb(null, [{ content: 'x' }]); });

  const okJWT = { permissions: { plainspace: { widgetInstance: true } } };

  await new Promise((res, rej) => {
    em.emit('saveWidgetInstance', { jwt: 't', instanceId: '1', content: 'c', decodedJWT: okJWT }, err => err ? rej(err) : res());
  });
  assert.strictEqual(updates, 1);

  await new Promise(resolve => {
    em.emit('saveWidgetInstance', { jwt: 't', instanceId: '1', content: 'c', decodedJWT: {} }, err => { assert(err); resolve(); });
  });
  assert.strictEqual(updates, 1);

  await new Promise((res, rej) => {
    em.emit('getWidgetInstance', { jwt: 't', instanceId: '1', decodedJWT: okJWT }, (err, data) => err ? rej(err) : res(data));
  });
  assert.strictEqual(selects, 1);

  await new Promise(resolve => {
    em.emit('getWidgetInstance', { jwt: 't', instanceId: '1', decodedJWT: {} }, err => { assert(err); resolve(); });
  });
  assert.strictEqual(selects, 1);
});
