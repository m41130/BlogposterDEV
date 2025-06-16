/**
 * mother/modules/moduleLoader/moduleInstallerService.js
 *
 * 1) Saves an uploaded ZIP
 * 2) Extracts it into /modules/{modName}
 * 3) Check for moduleInfo.json
 * 4) Insert or update module_registry
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const {
  insertModuleRegistryEntry,
  updateModuleLastError
} = require('./moduleRegistryService');

async function installModuleFromZip(motherEmitter, jwt, uploadedZipBuffer, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1) Save ZIP to temp
      const tempDir = path.resolve(__dirname, '../../../temp_uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempZipPath = path.join(tempDir, `moduleUpload_${Date.now()}.zip`);
      fs.writeFileSync(tempZipPath, uploadedZipBuffer);

      // 2) Extract
      const zip = new AdmZip(tempZipPath);
      const extractedTemp = path.join(tempDir, `unzipped_${Date.now()}`);
      fs.mkdirSync(extractedTemp, { recursive: true });
      zip.extractAllTo(extractedTemp, true);

      // 2.1) find moduleInfo.json
      const { foundModuleDir, moduleInfo } = findModuleInfo(extractedTemp);
      if (!foundModuleDir || !moduleInfo) {
        throw new Error('No moduleInfo.json found in the uploaded ZIP.');
      }
      if (!moduleInfo.moduleName) {
        throw new Error('moduleInfo.json missing "moduleName" field.');
      }
      if (!moduleInfo.version) {
        throw new Error('moduleInfo.json missing "version" field.');
      }
      if (!moduleInfo.developer) {
        throw new Error('moduleInfo.json missing "developer" field.');
      }
      if (!moduleInfo.description) {
        throw new Error('moduleInfo.json missing "description" field.');
      }

      // 3) Move to final /modules folder
      const finalModuleFolder = path.resolve(__dirname, `../../../modules/${moduleInfo.moduleName}`);
      if (fs.existsSync(finalModuleFolder)) {
        if (!options.allowOverwrite) {
          throw new Error(`Module folder '${moduleInfo.moduleName}' already exists. Overwrite not allowed.`);
        }
        fs.rmSync(finalModuleFolder, { recursive: true, force: true });
      }

      fs.renameSync(foundModuleDir, finalModuleFolder);

      // 4) Insert or update module_registry
      await insertModuleRegistryEntry(motherEmitter, jwt, moduleInfo.moduleName, true, null, moduleInfo)
        .catch(err => {
          throw new Error(`DB Insert Registry failed: ${err.message}`);
        });

      if (options.notifyAdmin) {
        // You can also use notificationEmitter.notify(...) if you want
        motherEmitter.emit('log', {
          level: 'info',
          message: `Module ${moduleInfo.moduleName} installed.`
        });
      }

      // Clean up temp
      fs.unlinkSync(tempZipPath);
      fs.rmSync(extractedTemp, { recursive: true, force: true });

      resolve({ success: true, moduleName: moduleInfo.moduleName });
    } catch (err) {
      console.error('[MODULE INSTALLER] Error installing from ZIP =>', err.message);
      await updateModuleLastError(motherEmitter, jwt, '(unknown)', err.message).catch(() => {});
      reject(err);
    }
  });
}

function findModuleInfo(extractedDir) {
  const stack = [extractedDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const files = fs.readdirSync(current);

    for (const fileName of files) {
      const fullPath = path.join(current, fileName);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        stack.push(fullPath);
      } else if (fileName === 'moduleInfo.json') {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { foundModuleDir: current, moduleInfo: parsed };
      }
    }
  }
  return { foundModuleDir: null, moduleInfo: null };
}

module.exports = {
  installModuleFromZip
};
