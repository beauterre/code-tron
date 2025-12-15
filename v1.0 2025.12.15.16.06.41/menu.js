(() => {
  const menuData = [
    { label: 'File', items:[
		{label:'Open', act:'open'}, 
		{label:'Save', act:'save'}, 
		{label:'Save As', act:'save as'}, 
		{label:'Toggle Autosave', act:'autosave'}, 
		{label:'Open Folder as Workspace', act:'openfolder'}, 
		{label:'Close', act:'close'}, 
		{label:'Close All', act:'close all'}] },
    { label: 'Edit', items:[
		{label:'Cut', act:'cut', shortcut: 'x'},
		{label:'Copy', act:'copy', shortcut: 'c'},
		{label:'Paste', act:'paste', shortcut: 'v'},
		{label:'Undo', act:'undo', shortcut: 'z'},
		{label:'Redo', act:'redo', shortcut: 'y'},
		{label:'Select All', act:'select all', shortcut: 'a'},
		{label:'Format HTML', act:'format HTML'},
		{label:'Format JS', act:'format JS'},
		{label:'Format JSON', act:'format JSon'},
		{label:'Lint', act:'lint'}] },
    { label: 'Search', items:[
		{label:'Find', act:'find'},
		{label:'Find previous', act:'find prev'},
		{label:'Find next', act:'find next'},
		{label:'Replace', act:'replace'},
		{label:'Replace All', act:'replace all'}] },
    { label: 'View', items:[
		{label:'Size +', act:'zoomIn'},
		{label:'Size -', act:'zoomOut'},
		{label:'C64 feel (green)'},
		{label:'Purple Haze'},
		{label:'Toggle Project Panel', act:'project'}] },

    { label: 'Settings', items:[
		{label:'Preferences'}] },
    { label: 'Snippets', items:[
		{label:'HTML Boilerplate'},
		{label:'IFFE Boilerplate'}] }
  ];

  function initMenu() {
    const menubar = document.getElementById('menubar');
    menubar.innerHTML = '';
    menuData.forEach(menu=>{
      const menuDiv = document.createElement('div');
      menuDiv.className = 'menu';
      menuDiv.textContent = menu.label;
      if(menu.items && menu.items.length){
        const submenu = document.createElement('div');
        submenu.className = 'submenu';
        menu.items.forEach(item=>{
          const itemDiv = document.createElement('div');
          itemDiv.textContent = item.label;
          if(item.act) itemDiv.dataset.act = item.act;
          submenu.appendChild(itemDiv);
        });
        menuDiv.appendChild(submenu);
      }
      menubar.appendChild(menuDiv);
    });
  }

  function initMenuActions(){
    const menus = document.querySelectorAll('#menubar .menu');
    menus.forEach(menu=>{
      menu.addEventListener('click', (e)=>{
        const act = e.target.dataset.act;
        if(!act) return;

        if(act==='zoomIn'){ console.log('Zoom In'); }
        else if(act==='zoomOut'){ console.log('Zoom Out'); }
        else if(act==='open'){ console.log('Open file'); }
        else if(act==='save'){
          const { model } = window.EditorApp.model;
          const blob = new Blob([model.join('\n')],{type:'text/plain;charset=utf-8'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download='code.txt';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      });
    });
  }
// dit lijkt niet te werken, hmmm
document.addEventListener('DOMContentLoaded', () => {
	console.log("attempt update version");
  function pad(n){ return String(n).padStart(2,'0'); }
  const dt = new Date(document.lastModified);
  const formatted =
    dt.getFullYear() + '.' +
    pad(dt.getMonth()+1) + '.' +
    pad(dt.getDate()) + '.' +
    pad(dt.getHours()) + '.' +
    pad(dt.getMinutes()) + '.' +
    pad(dt.getSeconds());

  const verItem = document.createElement('div');
  verItem.textContent = 'v1.0 ' + formatted;
  verItem.style.cssText = 'margin-left:auto; padding:0 10px; font:12px monospace; color:#9bd9b0; align-self:center;';
  console.log("attempt update version");
  document.getElementById('datetime').appendChild(verItem);
});


  window.EditorApp = window.EditorApp || {};
window.EditorApp.menu = { menuData, initMenu, initMenuActions };
  window.addEventListener('DOMContentLoaded', ()=>{
    initMenu();
    initMenuActions();
  });

})();
