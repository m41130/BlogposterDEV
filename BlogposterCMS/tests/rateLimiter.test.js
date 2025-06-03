const assert = require('assert');
const fs = require('fs');
const path = require('path');

function testMiddlewareUsage() {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert(
    appJs.includes("app.post('/api/meltdown', apiLimiter"),
    'Missing apiLimiter on /api/meltdown route'
  );
  assert(
    appJs.includes("app.post('/admin/api/login', loginLimiter"),
    'Missing loginLimiter on /admin/api/login route'
  );
}

(async () => {
  try {
    testMiddlewareUsage();
    console.log('rate limiter tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
