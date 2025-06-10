'use strict';

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  let sanitized = html;
  let previous;
  const scriptRegex = /<script\b[^>]*>.*?<\s*\/\s*script\s*>/gis;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(scriptRegex, '');
  } while (sanitized !== previous);

  const handlerRegex = /\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(handlerRegex, '');
  } while (sanitized !== previous);

  return sanitized;
}

module.exports = { sanitizeHtml };
