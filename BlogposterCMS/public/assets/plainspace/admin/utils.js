// public/assets/plainspace/admin/utils.js
async function fetchPartial(partialName, partialType = 'headers') {
    const response = await fetch(`/assets/partials/${partialType}/${partialName}.html`);
    if (!response.ok) {
      throw new Error(`Partial "${partialName}" (${partialType}) not found.`);
    }
    return await response.text();
  }
  