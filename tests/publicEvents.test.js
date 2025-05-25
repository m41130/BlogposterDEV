const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const EventEmitter = require('events');
process.env.AUTH_MODULE_INTERNAL_SECRET = 'testsecret';

function loadSettingsListeners(em) {
  const base = path.resolve(__dirname, '../mother/modules/settingsManager');
  const code = fs.readFileSync(path.join(base, 'index.js'), 'utf8');
  function customRequire(name) {
    if (name === 'dotenv') return { config: () => {} };
    if (name === 'bcryptjs') return { hash: async (p)=>'h', compare: async ()=>true };
    if (name === '../../emitters/motherEmitter') {
      return { onceCallback: cb => { let c=false; return (...a)=>{ if(c) return; c=true; if(typeof cb==='function') cb(...a); }; } };
    }
    if (name === './settingsService') {
      return { ensuresettingsManagerDatabase: async () => {}, ensureSettingsSchemaAndTables: async () => {} };
    }
    if (name.startsWith('./') || name.startsWith('../')) {
      return require(path.join(base, name));
    }
    return require(name);
  }
  const sandbox = { module:{}, exports:{}, require: customRequire, console, process, setTimeout, clearTimeout };
  vm.runInNewContext(code, sandbox, { filename: 'settingsManager/index.js' });
  sandbox.setupSettingsListeners(em);
}

function loadUserCrud(em) {
  const base = path.resolve(__dirname, '../mother/modules/userManagement');
  const code = fs.readFileSync(path.join(base, 'userCrudEvents.js'), 'utf8');
  function customRequire(name) {
    if (name === 'dotenv') return { config: () => {} };
    if (name === 'bcryptjs') return { hash: async (p)=>'h', compare: async ()=>true };
    if (name === '../../emitters/motherEmitter') {
      return { onceCallback: cb => { let c=false; return (...a)=>{ if(c) return; c=true; if(typeof cb==='function') cb(...a); }; } };
    }
    if (name.startsWith('./') || name.startsWith('../')) {
      return require(path.join(base, name));
    }
    return require(name);
  }
  const sandbox = { module:{}, exports:{}, require: customRequire, console, process, setTimeout, clearTimeout };
  vm.runInNewContext(code, sandbox, { filename: 'userCrudEvents.js' });
  sandbox.module.exports.setupUserCrudEvents(em);
}

async function testPublicSetting() {
  const em = new EventEmitter();
  loadSettingsListeners(em);
  em.on('dbSelect', (p, cb) => cb(null, [{ value: 'false' }]));
  const val = await new Promise((res, rej) => {
    em.emit('getPublicSetting', { jwt:'t', moduleName:'settingsManager', moduleType:'core', key:'FIRST_INSTALL_DONE' }, (e,v)=>e?rej(e):res(v));
  });
  assert.strictEqual(val, 'false');
  await new Promise(r => {
    em.emit('getPublicSetting', { jwt:'t', moduleName:'settingsManager', moduleType:'core', key:'SECRET' }, err => { assert(err); r(); });
  });
}

async function testPublicRegister() {
  const em = new EventEmitter();
  loadUserCrud(em);
  em.on('issueModuleToken', (p, cb) => cb(null, 'hight'));
  em.on('dbInsert', (p, cb) => { cb(null, [{ id: 1 }]); });
  em.on('dbSelect', (p, cb) => { cb(null, [{ id: 10, role_name:'standard' }]); });
  em.on('assignRoleToUser', (p, cb) => cb(null, true));
  const res = await new Promise((res, rej) => {
    em.emit('publicRegister', {
      jwt:'pub', moduleName:'userManagement', moduleType:'core',
      username:'u', password:'p', role:'standard', decodedJWT:{ isPublic:true }
    }, (e,d)=>e?rej(e):res(d));
  });
  assert(res);
}

(async () => {
  try {
    await testPublicSetting();
    await testPublicRegister();
    console.log('public event tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
