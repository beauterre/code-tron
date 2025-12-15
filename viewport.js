(() => {
  const viewport = document.getElementById('viewport');
  const spacer = document.getElementById('scroll-spacer');
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');

  // Hidden textarea to receive IME and real keyboard input reliably
  const hidden = document.createElement('textarea');
  hidden.className = 'invisibleInput';
  document.body.appendChild(hidden);

  const cfg = {
    fontSize: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size')) || 14,
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-family') || 'monospace',
    lineHeight: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--line-height')) || 20,
    gutterWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter-width')) || 72,
    padding: 8,
    cursorBlink: 500,
    tabSize: 2,
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

  viewport.addEventListener('scroll', ()=>{
    canvas.style.left = viewport.scrollLeft + 'px';
    canvas.style.top = viewport.scrollTop + 'px';
    render();
  });

  function clampCursor(){
    const cursor = EditorApp.model.cursor;
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
  setInterval(()=>{ blink = !blink; render(); }, cfg.cursorBlink);

  function render(){
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

    // inverted cursor
    if(document.activeElement === canvas){
      const underlying = EditorApp.model.getCharAt(cursor.line, cursor.col) || ' ';
      ctx.fillStyle = cfg.cursorInv;
      ctx.fillRect(curX, curY+1, cfg.charWidth, cfg.lineHeight-2);
      ctx.fillStyle = cfg.bg;
      ctx.fillText(underlying, curX, curY+2);
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

  hidden.addEventListener('keydown', (e)=>{
    if(EditorApp.model.handleKey) EditorApp.model.handleKey(e, render);
  });

  canvas.addEventListener('focus', ()=>{ focusHidden(); });
  canvas.addEventListener('blur', ()=>{ /* nothing */ });

  setTimeout(()=>{ resizeCanvas(); render(); canvas.focus(); focusHidden(); },50);

  window.EditorApp.viewport = { render, resizeCanvas, focusHidden };
})();
