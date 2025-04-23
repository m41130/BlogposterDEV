const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, 'integrationsRegistry.json');
const integrationsDir = path.join(__dirname, 'integrations');

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function saveRegistry(registry) {
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

async function loadIntegrations() {
  // Dynamisch alle .js Dateien im integrations/ Ordner laden
  const files = fs.readdirSync(integrationsDir).filter(f => f.endsWith('.js'));
  const registry = loadRegistry();

  const loaded = {};

  for (const file of files) {
    const fullPath = path.join(integrationsDir, file);
    const integrationModule = require(fullPath);
    const name = integrationModule.integrationName || file.replace('.js', '');

    // Falls in registry noch kein Eintrag => standard
    if (!registry[name]) {
      registry[name] = { active: false, config: {} };
    }
    
    loaded[name] = {
      name,
      active: registry[name].active,
      config: registry[name].config,
      module: integrationModule
    };
  }

  // Save registry in case we found new integrations
  saveRegistry(registry);

  return loaded;
}

module.exports = {
  loadRegistry,
  saveRegistry,
  loadIntegrations
};
