/**
 * mother/modules/userManagement/index.js
 *
 * The main entry point for userManagement module:
 *   1) Ensures the DB or schema is created
 *   2) Ensures the default roles
 *   3) Hooks up meltdown event listeners for user CRUD, roles, login, etc.
 */

const {
  ensureUserManagementDatabase,
  ensureUserManagementSchemaAndTables,
  ensureDefaultRoles,
  ensureDefaultPermissions,
  ensureFirstUserIsAdmin
} = require('./userInitService');

const { setupUserCrudEvents } = require('./userCrudEvents');
const { setupRoleCrudEvents } = require('./roleCrudEvents');
const { setupLoginEvents }    = require('./loginEvents');
const { setupPermissionCrudEvents } = require('./permissionCrudEvents');

async function initialize({ motherEmitter, app, dbConfig, isCore, jwt }) {
  console.log('[USER MANAGEMENT] Initializing user management module...');

  if (!isCore) {
    console.error('[USER MANAGEMENT] Must be loaded as a core module. meltdown meltdown.');
    return;
  }
  if (!jwt) {
    console.error('[USER MANAGEMENT] No JWT provided => cannot proceed. meltdown meltdown.');
    return;
  }

  try {
    // A) Ensure DB or schema
    await ensureUserManagementDatabase(motherEmitter, jwt);
    // B) Ensure user tables exist
    await ensureUserManagementSchemaAndTables(motherEmitter, jwt);
    // C) Create default roles (admin, standard) if missing
    await ensureDefaultRoles(motherEmitter, jwt);
    // D) Ensure default permissions for system to work
    await ensureDefaultPermissions(motherEmitter, jwt);

    await ensureFirstUserIsAdmin(motherEmitter, jwt);

    // D) Now set up meltdown event listeners
    setupUserCrudEvents(motherEmitter);
    setupRoleCrudEvents(motherEmitter);
    setupPermissionCrudEvents(motherEmitter);
    setupLoginEvents(motherEmitter);
    
    console.log('[USER MANAGEMENT] Module initialized successfully. meltdown meltdown avoided!');
  } catch (err) {
    console.error('[USER MANAGEMENT] Error during initialization:', err.message);
  }
}

module.exports = { initialize };
