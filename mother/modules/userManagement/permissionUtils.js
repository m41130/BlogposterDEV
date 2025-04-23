/**
 * mother/modules/userManagement/permissionUtils.js
 *
 * Provides:
 *   - mergeAllPermissions(rolesArr)
 *   - deepMerge utility
 *
 * For handling the role permissions merging logic.
 */

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * mergeAllPermissions:
 *   merges multiple roles' permissions into a single object.
 *   If invalid JSON found => fallback perms + attempts DB fix.
 */
function mergeAllPermissions(motherEmitter, jwt, rolesArr, doneCallback) {
  console.log('[USER MGMT] mergeAllPermissions => Starting to merge. rolesArr:', rolesArr);

  const merged = {};
  if (!rolesArr || !rolesArr.length) {
    console.warn('[USER MGMT] mergeAllPermissions => No roles provided => meltdown meltdown but we continue.');
    return doneCallback(merged);
  }

  const invalidRoles = [];
  for (const role of rolesArr) {
    console.log(`[USER MGMT] mergeAllPermissions => Processing role with id: ${role.id}`);
    try {
      let perms;
      if (typeof role.permissions === 'string') {
        perms = JSON.parse(role.permissions || '{}');
      } else {
        perms = role.permissions || {};
      }
      deepMerge(merged, perms);
    } catch (ex) {
      console.warn('[USER MGMT] mergeAllPermissions => Invalid JSON in role => fallback perms. Role:', role.id);
      const fallback = { read: true, write: true };
      deepMerge(merged, fallback);
      invalidRoles.push({
        id: role.id,
        perms: fallback
      });
    }
  }

  if (!invalidRoles.length) {
    console.log('[USER MGMT] mergeAllPermissions => No invalid roles, returning merged perms:', merged);
    return doneCallback(merged);
  }

  // fix invalid roles in DB
  const caseLines = invalidRoles.map(r => {
    const jsonStr = JSON.stringify(r.perms);
    return `WHEN ${r.id} THEN '${jsonStr}'`;
  }).join('\n');

  const idList = invalidRoles.map(r => r.id).join(',');
  const rawSQL = `
    UPDATE "usermanagement"."roles"
    SET permissions = CASE id
      ${caseLines}
      ELSE permissions
    END
    WHERE id IN (${idList});
  `;

  console.warn('[USER MGMT] mergeAllPermissions => Attempting to fix invalid perms in DB =>', rawSQL);

  motherEmitter.emit('dbUpdate', {
    jwt,
    moduleName: 'userManagement',
    table: '__rawSQL__',
    data: { rawSQL }
  }, (updateErr) => {
    if (updateErr) {
      console.error('[USER MGMT] mergeAllPermissions => Could not fix roles =>', updateErr.message);
    }
    doneCallback(merged); // proceed either way
  });
}

module.exports = {
  mergeAllPermissions,
  deepMerge
};
