const assert = require('assert');
const { sanitizeCookieName, sanitizeCookiePath, sanitizeCookieDomain } = require('../mother/utils/cookieUtils');

function testNames() {
  assert.doesNotThrow(() => sanitizeCookieName('session_id'));
  assert.throws(() => sanitizeCookieName('bad;name'), /Invalid cookie name/);
}

function testPaths() {
  assert.doesNotThrow(() => sanitizeCookiePath('/valid/path'));
  assert.throws(() => sanitizeCookiePath('..'), /Invalid cookie path/);
}

function testDomains() {
  assert.doesNotThrow(() => sanitizeCookieDomain('example.com'));
  assert.throws(() => sanitizeCookieDomain('bad_domain!'), /Invalid cookie domain/);
}

(async () => {
  try {
    testNames();
    testPaths();
    testDomains();
    console.log('cookie sanitization tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
