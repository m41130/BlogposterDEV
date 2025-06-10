'use strict';

const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

let purifyInstance;

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  if (!purifyInstance) {
    const window = new JSDOM('').window;
    purifyInstance = DOMPurify(window);
  }
  return purifyInstance.sanitize(html);
}

module.exports = { sanitizeHtml };
