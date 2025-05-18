const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadSetupFunction() {
  const base = path.resolve(__dirname, '../mother/modules/pagesManager');
  const code = fs.readFileSync(path.join(base, 'index.js'), 'utf8');
  function customRequire(name) {
    if (name === 'dotenv') return { config: () => {} };
    if (name.startsWith('./') || name.startsWith('../')) {
      if (name === './pagesService' || name === './config/defaultWidgets') {
        return {};
      }
      if (name === '../../emitters/motherEmitter') {
        return { onceCallback: cb => {
          let called = false;
          return (...args) => {
            if (called) return;
            called = true;
            if (typeof cb === 'function') cb(...args);
          };
        } };
      }
      return require(path.join(base, name));
    }
    return require(name);
  }
  const sandbox = {
    module: {},
    exports: {},
    require: customRequire,
    console,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(code, sandbox, { filename: 'pagesManager/index.js' });
  return sandbox.setupPagesManagerEvents;
}

async function testUpdatePage() {
  const setup = loadSetupFunction();
  const emitter = new EventEmitter();
  let captured = null;
  emitter.on('dbUpdate', (payload, cb) => {
    captured = payload;
    cb(null, { ok: true });
  });
  setup(emitter);

  const payload = {
    jwt: 't',
    moduleName: 'pagesManager',
    moduleType: 'core',
    pageId: 1,
    slug: 'test',
    status: 'draft',
    translations: [],
    seoImage: '',
    parent_id: null,
    is_content: false,
    title: 'Hello',
    meta: { desc: 'a' }
  };

  await new Promise((resolve, reject) => {
    emitter.emit('updatePage', payload, (err, res) => {
      if (err) reject(err); else resolve(res);
    });
  });

  assert.strictEqual(captured.data.params.title, 'Hello');
  assert.deepStrictEqual(captured.data.params.meta, { desc: 'a' });

  captured = null;
  await new Promise((resolve, reject) => {
    emitter.emit('updatePage', { jwt: 't', moduleName: 'pagesManager', moduleType: 'core', pageId: 2 }, (err, res) => {
      if (err) reject(err); else resolve(res);
    });
  });

  assert.strictEqual(captured.data.params.title, '');
  assert.strictEqual(captured.data.params.meta, null);
}

(async () => {
  try {
    await testUpdatePage();
    console.log('updatePage tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
