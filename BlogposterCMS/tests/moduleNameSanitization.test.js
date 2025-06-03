const assert = require('assert');
const { sanitizeModuleName } = require('../mother/utils/moduleUtils');

function testValid() {
  assert.doesNotThrow(() => sanitizeModuleName('example_module-1'));
}

function testInvalid() {
  assert.throws(() => sanitizeModuleName('../evil'), /Invalid module name/);
  assert.throws(() => sanitizeModuleName('bad/name'), /Invalid module name/);
}

(async () => {
  try {
    testValid();
    testInvalid();
    console.log('module name sanitization tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
