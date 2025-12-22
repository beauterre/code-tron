(() => {
 // the cfg
  window.EditorApp = window.EditorApp || {};
window.EditorApp.cfg = 
{
    fontSize: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size')) || 14,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-family') || 'monospace',
    lineHeight: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--line-height')) || 20,
    gutterWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter-width')) || 72,
    padding: 8,
	charWidth:10,
	charHeight:25,
    cursorBlink: 500,
    tabSize: 3, // 3 spaces tabs..
    bg: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
    textColor: getComputedStyle(document.documentElement).getPropertyValue('--soft').trim(),
    cursorInv: getComputedStyle(document.documentElement).getPropertyValue('--cursor-inv').trim(),
  };
  window.EditorApp.layout = 
	{
		projectPanelWidth: 200,
		scrollSize: 15,
		hintHeight: 150
	};

})();
