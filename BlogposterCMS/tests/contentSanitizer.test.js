const assert = require('assert');
const { sanitizeHtml } = require('../mother/utils/contentSanitizer');

test('content sanitizer removes scripts and event handlers', () => {
  const dirty = '<div onclick="evil()"><script>alert(1)</script><script >x()</script >Hello</div>';
  const clean = sanitizeHtml(dirty);
  assert(!/<script/i.test(clean), 'script tag not removed');
  assert(!/onclick=/i.test(clean), 'event handler not removed');
});
