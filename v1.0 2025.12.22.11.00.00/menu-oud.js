(() => {
  // ==== Menu data ====
  const menuData = [
    { label: 'File', items: [
        { label: 'Open', act: 'open' },
        { label: 'Save', act: 'save' }
      ]},
    { label: 'Edit', items: [
        { label: 'Cut' }, { label: 'Copy' }, { label: 'Paste' }, { label: 'Undo' },
        { label: 'Format HTML' }, { label: 'Format JS' }, { label: 'Format JSON' }, { label: 'Lint' }
      ]},
    { label: 'Search', items: [
        { label: 'Find' }, { label: 'Replace' }
      ]},
    { label: 'View', items: [
        { label: 'Size +', act: 'zoomIn' },
        { label: 'Size -', act: 'zoomOut' }
      ]},
    { label: 'Settings', items: [ { label: 'TBD' } ] },
    { label: 'Snippets', items: [ { label: 'TBD' } ] }
  ];

  // ==== Init menu in DOM ====
  function initMenu() {
    const menubar = document.getElementById('menubar');
    menubar.innerHTML = ''; // clear existing content

    menuData.forEach(menu => {
      const menuDiv = document.createElement('div');
      menuDiv.className = 'menu';
      menuDiv.textContent = menu.label;

      if(menu.items && menu.items.length){
        const submenu = document.createElement('div');
        submenu.className = 'submenu';

        menu.items.forEach(item => {
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

  // ==== Attach click handlers ====
  function initMenuActions() {
    const menus = document.querySelectorAll('#menubar .menu');
    menus.forEach(menu => {
      menu.addEventListener('click', (e) => {
        const act = e.target.dataset.act;
        if(!act) return;

        if(act === 'zoomIn'){ console.log('Zoom In'); }
        else if(act === 'zoomOut'){ console.log('Zoom Out'); }
        else if(act === 'open'){ console.log('Open file'); }
        else if(act === 'save'){ 
          const blob = new Blob([EditorApp.model.model.join('\n')], {type:'text/plain;charset=utf-8'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'code.txt';
          a.click();
          URL.revokeObjectURL(a.href);
        }
      });
    });
  }

  // ==== Expose menu functions ====
  window.EditorApp = window.EditorApp || {};
  window.EditorApp.menu = {
    initMenu,
    initMenuActions,
    data: menuData
  };

  // ==== Initialize ====
  window.addEventListener('DOMContentLoaded', () => {
    initMenu();
    initMenuActions();
  });
})();
