(() => {
  // setup.
  // the big div that contains the canvas.
  const viewport = document.getElementById('viewport');
   // weird invisible thing, don't exactly know what it is supposed to do??
  const spacer = document.getElementById('scroll-spacer');
  // the actual canvas we edit on and its context..
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');

  const projectPanelWidth=200; // we need to get this from the layout or config js.

  // Hidden textarea to receive IME and real keyboard input reliably
  const hidden = document.createElement('textarea');
  hidden.className = 'invisibleInput';
  document.body.appendChild(hidden);

  // the cfg, we might get this from a layout or config js.

  const cfg = {
    fontSize: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size')) || 14,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-family') || 'monospace',
    lineHeight: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--line-height')) || 20,
    gutterWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter-width')) || 72,
    padding: 8,
    cursorBlink: 500,
    tabSize: 3, // 3 spaces tabs..
    bg: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
    textColor: getComputedStyle(document.documentElement).getPropertyValue('--soft').trim(),
    cursorInv: getComputedStyle(document.documentElement).getPropertyValue('--cursor-inv').trim(),
  };

  function measureCharWidth(font){
    ctx.font = font;
    const sample = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:\\"\'`<>?/| ';
    let max = 0;
    for(const ch of sample){
      max = Math.max(max, ctx.measureText(ch).width);
    }
    return Math.ceil(max);
  }

  function setupMetrics(){
    cfg.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
    ctx.font = cfg.font;
    cfg.charWidth = measureCharWidth(cfg.font);
    cfg.charsPerRow = Math.max(10, Math.floor((window.innerWidth - cfg.gutterWidth - cfg.padding*2)/cfg.charWidth));
    cfg.visibleRows = Math.max(3, Math.floor((window.innerHeight - cfg.padding*2)/cfg.lineHeight));
  }

  setupMetrics();

  window.addEventListener('resize', ()=>{
    setupMetrics(); 
    resizeCanvas(); 
    render();
  });

  function resizeCanvas(){
    canvas.width = Math.max(viewport.clientWidth, 300);
    canvas.height = Math.max(viewport.clientHeight, 200);
    canvas.style.left = viewport.scrollLeft + 'px';
    canvas.style.top = viewport.scrollTop + 'px';
    spacer.style.height = (EditorApp.model.model.length * cfg.lineHeight + cfg.padding*2) + 'px';
  }


  function clampCursor(){
    const cursor = EditorApp.model.cursor; // now also contains x,y..
    const model = EditorApp.model.model;
    if(cursor.line < 0) cursor.line = 0;
    if(cursor.line >= model.length) cursor.line = model.length-1;
    const l = model[cursor.line];
    if(cursor.col < 0) cursor.col = 0;
    if(cursor.col > l.length) cursor.col = l.length;
  }

  // ==== Coordinate mapping ====
  function letterToPixel(line,col){
    return {
      x: cfg.gutterWidth + cfg.padding + col * cfg.charWidth - viewport.scrollLeft,
      y: cfg.padding + line * cfg.lineHeight - viewport.scrollTop
    };
  }

  function pixelToLetter(x,y){
    const model = EditorApp.model.model;
    const line = Math.floor((y + viewport.scrollTop - cfg.padding)/cfg.lineHeight);
    const col  = Math.floor((x + viewport.scrollLeft - cfg.gutterWidth - cfg.padding)/cfg.charWidth);
    return {
      line: Math.max(0,Math.min(model.length-1,line)),
      col: Math.max(0,Math.min((model[line]||'').length,col))
    };
  }

  let blink = true;
  console.log("starting cursorblink with interval"+cfg.cursorBlink),
  setInterval(()=>{ blink = !blink; render(); console.log("cursor should blink now.")}, cfg.cursorBlink);

  function render()
  {
    const model = EditorApp.model.model;
    const cursor = EditorApp.model.cursor;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = cfg.font;
    ctx.textBaseline = 'top';

    const scrollY = viewport.scrollTop;
    const scrollX = viewport.scrollLeft;
    const startLine = Math.max(0, Math.floor(scrollY/cfg.lineHeight));
    const linesToDraw = Math.ceil(canvas.height / cfg.lineHeight)+1;

    // gutter
    ctx.fillStyle = '#07220e';
    ctx.fillRect(0,0,cfg.gutterWidth,canvas.height);

    for(let i=0;i<linesToDraw;i++){
      const li = startLine + i;
      const y = cfg.padding + i*cfg.lineHeight - (scrollY - startLine*cfg.lineHeight);

      // line background
      ctx.fillStyle = '#0f3f29';
      ctx.fillRect(0,y,cfg.gutterWidth,cfg.lineHeight);

      // line number
      ctx.fillStyle = '#9bd9b0';
      ctx.fillText(String(li+1).padStart(3,' '), 8, y+2);

      if(li >= model.length) continue;
      const text = model[li];
      let x = cfg.gutterWidth + cfg.padding - scrollX;

      for(let c=0;c<text.length;c++){
        const ch = text[c];
        ctx.font = cfg.font;
        ctx.fillStyle = cfg.textColor;
        ctx.fillText(ch, x, y+2);
        x += cfg.charWidth;
      }
	  // ==== Draw the Cursor in X Y ====
    // inverted cursor
    if(document.activeElement === canvas)
    {
      console.log("showing cursor at"+cursor.line, cursor.col);
      const underlying = EditorApp.model.getCharAt(cursor.line, cursor.col) || ' ';
      ctx.fillStyle = cfg.cursorInv;
      ctx.fillRect(curX, curY+1, cfg.charWidth, cfg.lineHeight-2);
      ctx.fillStyle = cfg.bg;
      ctx.fillText(underlying, curX, curY+2);
    }

	  // ==== Draw scrollbars ====
	  drawScrollBars();

    }
	function drawScrollBars()
	{
		ctx.save();

		// Scrollbar track style
		ctx.fillStyle = '#0f3f29';

		const vpWidth  = canvas.width;
		const vpHeight = canvas.height;

		const contentWidth  = Math.max(canvas.width, cfg.charWidth * model.reduce((max, line) => Math.max(max, line.length), 0) + cfg.gutterWidth + cfg.padding*2);
		const contentHeight = model.length * cfg.lineHeight + cfg.padding*2;

		const scrollSize = 20; // thickness

		// Horizontal scrollbar (bottom, leave bottom-right corner empty)
	const hTrackWidth = vpWidth - projectPanelWidth - scrollSize; // leave project panel + corner
		const hTrackHeight = scrollSize;
		const hTrackX = 0;
		const hTrackY = vpHeight - scrollSize;
		ctx.fillRect(hTrackX, hTrackY, hTrackWidth, hTrackHeight);

		const hThumbWidth = Math.max(20, (vpWidth / contentWidth) * hTrackWidth);
		const hThumbX = (viewport.scrollLeft / (contentWidth - vpWidth)) * (hTrackWidth - hThumbWidth);
		ctx.fillStyle = '#9bd9b0';
		ctx.fillRect(hThumbX, hTrackY, hThumbWidth, hTrackHeight);

		// Vertical scrollbar (right, leave bottom-right corner empty)
		ctx.fillStyle = '#0f3f29';
		const vTrackWidth = scrollSize;
		const vTrackX = vpWidth - scrollSize- projectPanelWidth;
		const vTrackY = viewport.offsetTop; // start below menubar
		const vTrackHeight = vpHeight/2 - scrollSize*5; // leave space for horizontal scrollbar		ctx.fillRect(vTrackX, vTrackY, vTrackWidth, vTrackHeight);

		const vThumbHeight = Math.max(20, (vpHeight / contentHeight) * vTrackHeight);
		const vThumbY = (viewport.scrollTop / (contentHeight - vpHeight)) * (vTrackHeight - vThumbHeight);
		ctx.fillStyle = '#9bd9b0';
		ctx.fillRect(vTrackX, vThumbY, vTrackWidth, vThumbHeight);

		ctx.restore();
	}

    clampCursor();

    const curX = cfg.gutterWidth + cfg.padding + cursor.col*cfg.charWidth - scrollX;
    const curY = cfg.padding + (cursor.line - startLine)*cfg.lineHeight - (scrollY - startLine*cfg.lineHeight);

    // matching bracket highlight
    const match = EditorApp.model.findMatchingBracket(cursor.line, cursor.col) || null;
    if(match){
      const mx = cfg.gutterWidth + cfg.padding + match.col*cfg.charWidth - scrollX;
      const my = cfg.padding + (match.line - startLine)*cfg.lineHeight - (scrollY - startLine*cfg.lineHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(curX-2, curY+1, cfg.charWidth+4, cfg.lineHeight-2);
      ctx.fillRect(mx-2, my+1, cfg.charWidth+4, cfg.lineHeight-2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(mx-2,my+1,cfg.charWidth+4,cfg.lineHeight-2);
    }

  }

  function focusHidden(){ hidden.focus(); }

  canvas.addEventListener('mousedown', (e)=>{
    focusHidden();
    const rect = canvas.getBoundingClientRect();
    const p = pixelToLetter(e.clientX-rect.left, e.clientY-rect.top);
    EditorApp.model.cursor.line = p.line;
    EditorApp.model.cursor.col = p.col;
    render();
  });

  hidden.addEventListener('input',(e)=>{
    const val = hidden.value; hidden.value='';
    if(val.length>0) EditorApp.model.insertTextAtCursor(val);
  });

  
//  hidden.addEventListener('keydown', (e)=>{
//    if(EditorApp.model.handleKey) EditorApp.model.handleKey(e, render);
//  });

hidden.addEventListener('keydown', (e) => {
  if (e.isComposing) return;

  switch (e.key) {

    case 'Tab':
      e.preventDefault();
      EditorApp.model.insertTextAtCursor(' '.repeat(cfg.tabSize));
      break;

    case 'Enter':
      e.preventDefault();
      newlineWithAutoIndent();
      break;

    case 'Backspace':
      e.preventDefault();
      EditorApp.model.deleteBeforeCursor();
      break;

    case 'Delete':
      e.preventDefault();
      EditorApp.model.deleteAfterCursor();
      break;

    case 'ArrowLeft':
      e.preventDefault();
      if (cursor.col > 0) {
        cursor.col--;
      } else if (cursor.line > 0) {
        cursor.line--;
        cursor.col = model[cursor.line].length;
      }
      break;

    case 'ArrowRight':
      e.preventDefault();
      if (cursor.col < model[cursor.line].length) {
        cursor.col++;
      } else if (cursor.line < model.length - 1) {
        cursor.line++;
        cursor.col = 0;
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      cursor.line = Math.max(0, cursor.line - 1);
      cursor.col = Math.min(cursor.col, model[cursor.line].length);
      break;

    case 'ArrowDown':
      e.preventDefault();
      cursor.line = Math.min(model.length - 1, cursor.line + 1);
      cursor.col = Math.min(cursor.col, model[cursor.line].length);
      break;

    default:
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        download();
      }
      // everything else flows to input
      return;
  }

  render();
});



  canvas.addEventListener('focus', ()=>{ focusHidden(); });
  canvas.addEventListener('blur', ()=>{ /* nothing */ });

  setTimeout(()=>{ resizeCanvas(); render(); canvas.focus(); focusHidden(); },50);

  window.EditorApp.viewport = { render, resizeCanvas, focusHidden };
})();
