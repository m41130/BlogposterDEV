'use strict';

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  sanitized = sanitized.replace(/ on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return sanitized;
}

module.exports = { sanitizeHtml };
