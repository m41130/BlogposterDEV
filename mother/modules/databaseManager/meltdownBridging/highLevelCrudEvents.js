/**
 * mother/modules/databaseManager/meltdownBridging/highLevelCrudEvents.js
 *
 * Registers meltdown events for dbInsert, dbSelect, dbUpdate, dbDelete.
 * Either calls out to a remote microservice via HTTP, or uses local meltdown bridging.
 */
require('dotenv').config();
const axios = require('axios');
const { onceCallback } = require('../../../emitters/motherEmitter');

// NEW: Notification Emitter for typed notifications
const notificationEmitter = require('../../../emitters/notificationEmitter');

function registerHighLevelCrudEvents(motherEmitter) {
  // 1) dbInsert
  motherEmitter.on('dbInsert', Object.assign((payload, originalCb) => {
    const callback = onceCallback(originalCb);
    const { moduleName, table, data } = payload || {};

    try {
      if (!moduleName || !table || !data) {
        throw new Error('dbInsert => missing moduleName, table, or data.');
      }

      const remoteUrl = getRemoteUrlForModule(moduleName);
      if (remoteUrl) {
        return remoteDbInsert(remoteUrl, moduleName, table, data, callback);
      }
      localDbInsert(motherEmitter, payload, callback);
    } catch (error) {
      notificationEmitter.notify({
        moduleName: moduleName || 'databaseManager',
        notificationType: 'system',
        priority: 'critical',
        message: `dbInsert error => ${error.message}`
      });
      motherEmitter.emit('deactivateModule', { moduleName, reason: error.message });
      callback(error);
    }
  }, { moduleName: 'databaseManager' }));

  // 2) dbSelect
  motherEmitter.on('dbSelect', Object.assign((payload, originalCb) => {
    const callback = onceCallback(originalCb);
    const { moduleName, table } = payload || {};

    try {
      if (!moduleName || !table) {
        throw new Error('dbSelect => missing moduleName or table.');
      }

      const remoteUrl = getRemoteUrlForModule(moduleName);
      if (remoteUrl) {
        console.debug(`[dbSelect] Remote URL detected for module: ${moduleName}, URL: ${remoteUrl}`);
        console.debug(`[dbSelect] Payload:`, JSON.stringify(payload, null, 2));
        return remoteDbSelect(remoteUrl, moduleName, table, payload.where || {}, callback);
      }

      console.debug(`[dbSelect] No remote URL detected. Using localDbSelect.`);
      console.debug(`[dbSelect] Payload:`, JSON.stringify(payload, null, 2));
      localDbSelect(motherEmitter, payload, callback);
    } catch (error) {
      console.error(`[dbSelect] Error occurred: ${error.message}`);
      console.error(`[dbSelect] Stack trace:`, error.stack);
      console.error(`[dbSelect] Payload:`, JSON.stringify(payload, null, 2));

      notificationEmitter.notify({
        moduleName: moduleName || 'databaseManager',
        notificationType: 'system',
        priority: 'critical',
        message: `dbSelect error => ${error.message}`
      });

      motherEmitter.emit('deactivateModule', { moduleName, reason: error.message });
      callback(error);
    }
  }, { moduleName: 'databaseManager' }));

  // 3) dbUpdate
  motherEmitter.on('dbUpdate', Object.assign((payload, originalCb) => {
    const callback = onceCallback(originalCb);
    const { moduleName, table, data } = payload || {};

    try {
      if (!moduleName || !table || !data) {
        throw new Error('dbUpdate => missing moduleName, table, or data.');
      }

      const remoteUrl = getRemoteUrlForModule(moduleName);
      if (remoteUrl) {
        return remoteDbUpdate(remoteUrl, moduleName, table, payload.where || {}, data, callback);
      }
      localDbUpdate(motherEmitter, payload, callback);
    } catch (error) {
      notificationEmitter.notify({
        moduleName: moduleName || 'databaseManager',
        notificationType: 'system',
        priority: 'critical',
        message: `dbUpdate error => ${error.message}`
      });
      motherEmitter.emit('deactivateModule', { moduleName, reason: error.message });
      callback(error);
    }
  }, { moduleName: 'databaseManager' }));

  // 4) dbDelete
  motherEmitter.on('dbDelete', Object.assign((payload, originalCb) => {
    const callback = onceCallback(originalCb);
    const { moduleName, table, where } = payload || {};

    try {
      if (!moduleName || !table || !where) {
        throw new Error('dbDelete => missing moduleName, table, or where.');
      }

      const remoteUrl = getRemoteUrlForModule(moduleName);
      if (remoteUrl) {
        return remoteDbDelete(remoteUrl, moduleName, table, where, callback);
      }
      localDbDelete(motherEmitter, payload, callback);
    } catch (error) {
      notificationEmitter.notify({
        moduleName: moduleName || 'databaseManager',
        notificationType: 'system',
        priority: 'critical',
        message: `dbDelete error => ${error.message}`
      });
      motherEmitter.emit('deactivateModule', { moduleName, reason: error.message });
      callback(error);
    }
  }, { moduleName: 'databaseManager' }));
}

/* ------------------------------------------------------------------
   Remote bridging calls
   ------------------------------------------------------------------ */
function getRemoteUrlForModule(moduleName) {
  const key = 'REMOTE_URL_' + moduleName;
  return process.env[key] || null;
}

async function remoteDbInsert(baseUrl, moduleName, table, data, callback) {
  try {
    const resp = await axios.post(`${baseUrl}/dbInsert`, { moduleName, table, data });
    callback(null, resp.data);
  } catch (err) {
    callback(err);
  }
}
async function remoteDbSelect(baseUrl, moduleName, table, where, callback) {
  try {
    const resp = await axios.post(`${baseUrl}/dbSelect`, { moduleName, table, where });
    callback(null, resp.data);
  } catch (err) {
    callback(err);
  }
}
async function remoteDbUpdate(baseUrl, moduleName, table, where, data, callback) {
  try {
    const resp = await axios.post(`${baseUrl}/dbUpdate`, { moduleName, table, where, data });
    callback(null, resp.data);
  } catch (err) {
    callback(err);
  }
}
async function remoteDbDelete(baseUrl, moduleName, table, where, callback) {
  try {
    const resp = await axios.post(`${baseUrl}/dbDelete`, { moduleName, table, where });
    callback(null, resp.data);
  } catch (err) {
    callback(err);
  }
}

/* ------------------------------------------------------------------
   Local meltdown bridging
   ------------------------------------------------------------------ */
function localDbInsert(motherEmitter, payload, callback) {
  const { jwt, moduleName, table, data, where } = payload;
  if (table === '__rawSQL__') {
    if (!data.rawSQL) {
      return callback(new Error('[localDbInsert] Missing data.rawSQL for "__rawSQL__"'));
    }
    motherEmitter.emit(
      'performDbOperation',
      {
        jwt,
        moduleName,
        operation: data.rawSQL,
        params: extractParamsIfNeeded(data, where)
      },
      callback
    );
    return;
  }

  // The "normal" insert approach
  const columns = Object.keys(data);
  if (!columns.length) {
    return callback(new Error('[localDbInsert] No columns in data.'));
  }
  const placeholders = columns.map((_, i) => `$${i+1}`);
  const values = Object.values(data);

  const sql = `
    INSERT INTO "${moduleName.toLowerCase()}"."${table}"
    (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *;
  `;
  motherEmitter.emit(
    'performDbOperation',
    { jwt, moduleName, operation: sql, params: values },
    (err, result) => {
      if (err) return callback(err);
      callback(null, result?.rows || []);
    }
  );
}

function localDbSelect(motherEmitter, payload, callback) {
  const { jwt, moduleName, table, where, data } = payload;
  if (table === '__rawSQL__') {
    const rawSQL = data?.rawSQL || where?.rawSQL;
    if (!rawSQL) {
      return callback(new Error('[localDbSelect] Missing rawSQL for "__rawSQL__" approach.'));
    }
    motherEmitter.emit(
      'performDbOperation',
      {
        jwt,
        moduleName,
        operation: rawSQL,
        params: extractParamsIfNeeded(data, where)
      },
      (err, result) => {
        if (err) return callback(err);
        callback(null, result?.rows || result || []);
      }
    );
    return;
  }

  // Normal SELECT approach
  let whereClause = '';
  let values = [];
  if (where && Object.keys(where).length > 0) {
    const keys = Object.keys(where);
    const conditions = keys.map((col, i) => `"${col}" = $${i+1}`);
    whereClause = 'WHERE ' + conditions.join(' AND ');
    values = Object.values(where);
  }

  const sql = `
    SELECT *
    FROM "${moduleName.toLowerCase()}"."${table}"
    ${whereClause}
    ORDER BY id DESC
  `;
  motherEmitter.emit(
    'performDbOperation',
    { jwt, moduleName, operation: sql, params: values },
    (err, result) => {
      if (err) return callback(err);
      callback(null, result?.rows || []);
    }
  );
}

function localDbUpdate(motherEmitter, payload, callback) {
  const { jwt, moduleName, table, data, where } = payload;
  if (table === '__rawSQL__') {
    if (!data.rawSQL) {
      return callback(new Error('[localDbUpdate] Missing data.rawSQL for "__rawSQL__"'));
    }
    motherEmitter.emit(
      'performDbOperation',
      {
        jwt,
        moduleName,
        operation: data.rawSQL,
        params: extractParamsIfNeeded(data, where)
      },
      callback
    );
    return;
  }

  // Normal UPDATE approach
  const setKeys = Object.keys(data || {});
  if (!setKeys.length) {
    return callback(new Error('[localDbUpdate] No update data provided.'));
  }
  const setClauses = setKeys.map((col, i) => `"${col}" = $${i+1}`);
  const setValues = Object.values(data);

  const whereKeys = Object.keys(where || {});
  if (!whereKeys.length) {
    return callback(new Error('[localDbUpdate] Missing WHERE condition => too dangerous.'));
  }
  const whereClauses = whereKeys.map((col, i) => `"${col}" = $${i + setKeys.length + 1}`);
  const whereValues = Object.values(where);

  const allValues = [...setValues, ...whereValues];

  const sql = `
    UPDATE "${moduleName.toLowerCase()}"."${table}"
    SET ${setClauses.join(', ')}
    WHERE ${whereClauses.join(' AND ')}
    RETURNING *;
  `;

  motherEmitter.emit(
    'performDbOperation',
    { jwt, moduleName, operation: sql, params: allValues },
    (err, result) => {
      if (err) return callback(err);
      callback(null, result?.rows || []);
    }
  );
}

function localDbDelete(motherEmitter, payload, callback) {
  const { jwt, moduleName, table, where, data } = payload;
  const rawSQL = where?.rawSQL || data?.rawSQL;
  if (table === '__rawSQL__' && rawSQL) {
    motherEmitter.emit(
      'performDbOperation',
      {
        jwt,
        moduleName,
        operation: rawSQL,
        params: extractParamsIfNeeded(data, where)
      },
      callback
    );
    return;
  }

  const whereKeys = Object.keys(where || {});
  if (!whereKeys.length) {
    return callback(new Error('[localDbDelete] Empty WHERE => refusing to delete everything.'));
  }
  const whereClauses = whereKeys.map((col, i) => `"${col}" = $${i+1}`);
  const whereValues = Object.values(where);

  const sql = `
    DELETE FROM "${moduleName.toLowerCase()}"."${table}"
    WHERE ${whereClauses.join(' AND ')}
    RETURNING *;
  `;

  motherEmitter.emit(
    'performDbOperation',
    { jwt, moduleName, operation: sql, params: whereValues },
    (err, result) => {
      if (err) return callback(err);
      callback(null, result?.rows || []);
    }
  );
}

function extractParamsIfNeeded(dataObj, whereObj) {
    if (dataObj.params !== undefined) {
     return Array.isArray(dataObj.params) ? dataObj.params
                                         : [ dataObj.params ];
    } 
    const numericKeys = Object.keys(dataObj)
                              .filter(k => /^\d+$/.test(k))
                              .sort((a,b) => a-b);
    if (numericKeys.length) {
      return numericKeys.map(k => dataObj[k]);
    }
  
    return [ dataObj ];

  
}

module.exports = {
  registerHighLevelCrudEvents
};
