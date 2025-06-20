const { motherEmitter } = require('../mother/emitters/motherEmitter');
const EventEmitter = require('events');

function createEmitter() {
  const Cls = motherEmitter.constructor;
  return new Cls();
}

test('emits error when moduleName is missing', done => {
  const em = createEmitter();
  em.on('dummy', (p, cb) => cb(null, true));
  em.emit('dummy', { jwt: 't' }, err => {
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/moduleName/);
    done();
  });
});
