window.featherIcons = {
  home:        '/assets/icons/home.svg',               
  setHome:     '/assets/icons/home.svg', 
  edit:        '/assets/icons/edit-2.svg',             
  draft:       '/assets/icons/file-text.svg',              
  published:   '/assets/icons/check-circle.svg',       
  delete:      '/assets/icons/trash-2.svg',
  editSlug:    '/assets/icons/edit-3.svg',
  pencil:      '/assets/icons/pencil-gradient.svg'
};

window.featherIcon = function(name, extraClass = '') {
  return `<img class="icon ${extraClass}" src="${window.featherIcons[name]}" alt="${name}" />`;
};
