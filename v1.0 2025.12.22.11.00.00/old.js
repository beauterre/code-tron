
(() => {
  // ==== Configuration ====
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

  // ==== DOM ====
  const viewport = document.getElementById('viewport');
  const spacer = document.getElementById('scroll-spacer');
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');

  // Hidden textarea to receive IME and real keyboard input reliably
  const hidden = document.createElement('textarea');
  hidden.className = 'invisibleInput';
  document.body.appendChild(hidden);

  // ==== Model ====
  let model = ["function helloWorld() {","  console.log('hello');","}",""];
  let cursor = {line:0,col:0};
  let selection = null; // not yet used

  // Measure a fixed character width by measuring a sample set and using the max
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
  window.addEventListener('resize',()=>{setupMetrics(); resizeCanvas(); render();});

  // ==== Canvas & Scrolling ====
  function resizeCanvas(){
    viewport.style.height=

    canvas.width = Math.max(viewport.clientWidth, 300);
    canvas.height = Math.max(viewport.clientHeight, 200);
    canvas.style.left = viewport.scrollLeft + 'px';
    canvas.style.top = viewport.scrollTop + 'px';
    // ensure spacer matches total content height
    spacer.style.height = (model.length * cfg.lineHeight + cfg.padding*2) + 'px';
  }

  viewport.addEventListener('scroll', ()=>{
    // canvas is fixed on top of spacer
    canvas.style.left = viewport.scrollLeft + 'px';
    canvas.style.top = viewport.scrollTop + 'px';
    render();
  });

  // ==== Editing primitives ====
  function clampCursor(){
    if(cursor.line < 0) cursor.line = 0;
    if(cursor.line >= model.length) cursor.line = model.length-1;
    const l = model[cursor.line];
    if(cursor.col < 0) cursor.col = 0;
    if(cursor.col > l.length) cursor.col = l.length;
  }

  function insertTextAtCursor(str){
    const line = model[cursor.line];
    const before = line.slice(0,cursor.col);
    const after = line.slice(cursor.col);
    const parts = str.split('\n');
    if(parts.length === 1){
      model[cursor.line] = before + str + after;
      cursor.col += str.length;
    } else {
      model[cursor.line] = before + parts[0];
      const insert = parts.slice(1);
      for(let i=0;i<insert.length;i++){
        model.splice(cursor.line+1+i,0,insert[i]);
      }
      cursor.line += insert.length;
      cursor.col = insert[insert.length-1].length;
    }
    resizeCanvas(); render();
  }

  function deleteBeforeCursor(){
    if(cursor.col>0){
      const line = model[cursor.line];
      model[cursor.line] = line.slice(0,cursor.col-1) + line.slice(cursor.col);
      cursor.col--;
    } else if(cursor.line>0){
      const prev = model[cursor.line-1];
      const cur = model.splice(cursor.line,1)[0];
      cursor.line--;
      cursor.col = prev.length;
      model[cursor.line] = prev + cur;
    }
    resizeCanvas(); render();
  }

  function newlineWithAutoIndent(){
    const cur = model[cursor.line];
    const before = cur.slice(0,cursor.col);
    const indent = (before.match(/^\s*/)||[''])[0] || '';
    const rest = cur.slice(cursor.col);
    model[cursor.line] = before;
    model.splice(cursor.line+1,0, indent + rest);
    cursor.line++;
    cursor.col = indent.length;
    resizeCanvas(); render();
  }

  // ==== Bracket matching (basic) ====
  const PAIRS = {'(':')','[':']','{':'}','<':'>'};
  const CLOSERS = Object.values(PAIRS);

  function findMatchingBracket(lineIdx, colIdx){
    const ch = getCharAt(lineIdx,colIdx);
    if(!ch) return null;
    if(PAIRS[ch]){
      // forward search
      const open = ch; const close = PAIRS[ch];
      let depth = 0;
      for(let i=lineIdx;i<model.length;i++){
        const str = model[i];
        let start = (i===lineIdx?colIdx+1:0);
        for(let j=start;j<str.length;j++){
          const c = str[j];
          if(c===open) depth++;
          if(c===close){
            if(depth===0) return {line:i,col:j};
            depth--;
          }
        }
      }
    } else if(CLOSERS.includes(ch)){
      // backward search
      let open = null;
      for(const k in PAIRS) if(PAIRS[k]===ch) open = k;
      if(!open) return null;
      let depth = 0;
      for(let i=lineIdx;i>=0;i--){
        const str = model[i];
        let start = (i===lineIdx?colIdx-1:str.length-1);
        for(let j=start;j>=0;j--){
          const c = str[j];
          if(c===ch) depth++;
          if(c===open){
            if(depth===0) return {line:i,col:j};
            depth--;
          }
        }
      }
    }
    return null;
  }

  function getCharAt(lineIdx,colIdx){
    if(lineIdx<0 || lineIdx>=model.length) return null;
    const s = model[lineIdx];
    if(colIdx<0 || colIdx>=s.length) return null;
    return s[colIdx];
  }

  // ==== Coordinate mapping ====
  function letterToPixel(line,col){
    return {
      x: cfg.gutterWidth + cfg.padding + col * cfg.charWidth - viewport.scrollLeft,
      y: cfg.padding + line * cfg.lineHeight - viewport.scrollTop
    };
  }
  function pixelToLetter(x,y){
    const line = Math.floor((y + viewport.scrollTop - cfg.padding)/cfg.lineHeight);
    const col  = Math.floor((x + viewport.scrollLeft - cfg.gutterWidth - cfg.padding)/cfg.charWidth);
    return {
      line: Math.max(0,Math.min(model.length-1,line)),
      col: Math.max(0,Math.min((model[line]||'').length,col))
    };
  }

  // ==== Rendering ====
  let blink = true;
  setInterval(()=>{ blink = !blink; render(); }, cfg.cursorBlink);
  // it is not blinking it seems??

  function render(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // background
    ctx.fillStyle = cfg.bg; ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.font = cfg.font;
    ctx.textBaseline = 'top';

    // compute top-left of visible area in model coordinates
    const scrollY = viewport.scrollTop;
    const scrollX = viewport.scrollLeft;
    const firstLine = Math.floor((scrollY - cfg.padding)/cfg.lineHeight);
    const top = cfg.padding - (scrollY - Math.max(0,firstLine*cfg.lineHeight));
    const startLine = Math.max(0, Math.floor(scrollY/cfg.lineHeight));
    const linesToDraw = Math.ceil(canvas.height / cfg.lineHeight)+1;

    // gutter
    ctx.fillStyle = '#07220e';
    ctx.fillRect(0,0,cfg.gutterWidth,canvas.height);

    // draw visible lines
    ctx.fillStyle = cfg.textColor;
    const visibleStart = Math.max(0, startLine);
    for(let i=0;i<linesToDraw;i++){
      const li = visibleStart + i;
      const y = cfg.padding + i*cfg.lineHeight - (scrollY - visibleStart*cfg.lineHeight);
      // line background for even rows subtle
      // draw line number
      ctx.fillStyle = '#0f3f29';
      ctx.fillRect(0,y,cfg.gutterWidth,cfg.lineHeight);
      ctx.fillStyle = '#9bd9b0';
      ctx.fillText(String(li+1).padStart(3,' '), 8, y+2);

      if(li >= model.length) continue;
      const text = model[li];

      // draw characters one by one to allow free font + fixed grid
      let x = cfg.gutterWidth + cfg.padding - scrollX;
      for(let c=0;c<text.length;c++){
        const ch = text[c];
        // simple syntax discrimination by char class -> we avoid color changes; use font weight change
        // choose a font style for keywords/symbols
        ctx.font = cfg.font; // could change weight here
        ctx.fillStyle = cfg.textColor;
        ctx.fillText(ch, x, y+2);
        x += cfg.charWidth;
      }

      // if line is empty, ensure cursor area can be seen
      // draw invisible placeholder optional
    }

    // cursor position on screen
    clampCursor();
    const curY = cfg.padding + (cursor.line - visibleStart)*cfg.lineHeight - (scrollY - visibleStart*cfg.lineHeight);
    const curX = cfg.gutterWidth + cfg.padding + cursor.col*cfg.charWidth - scrollX;

    // draw matching brackets if present
    const nearby = getCharAt(cursor.line, Math.max(0,cursor.col-1));
    const match = (nearby ? findMatchingBracket(cursor.line, cursor.col-1) : null) || findMatchingBracket(cursor.line,cursor.col);
    if(match){
      const mx = cfg.gutterWidth + cfg.padding + match.col*cfg.charWidth - scrollX;
      const my = cfg.padding + (match.line - visibleStart)*cfg.lineHeight - (scrollY - visibleStart*cfg.lineHeight);
      // highlight both
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(curX-2, curY+1, cfg.charWidth+4, cfg.lineHeight-2);
      ctx.fillRect(mx-2, my+1, cfg.charWidth+4, cfg.lineHeight-2);
      // draw subtle outline
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(mx-2,my+1,cfg.charWidth+4,cfg.lineHeight-2);
    }

    // draw inverted block cursor
    if(document.activeElement === canvas && 1){
      // read underlying char
      const underlying = getCharAt(cursor.line, cursor.col) || ' ';
      // draw block
      ctx.fillStyle = cfg.cursorInv;
      ctx.fillRect(curX, curY+1, cfg.charWidth, cfg.lineHeight-2);
      // draw char inverted (dark on light) by drawing it again with bg color
      ctx.fillStyle = cfg.bg;
      ctx.fillText(underlying, curX, curY+2);
    }
  }

  // ==== Input handling ====
  function focusHidden(){ hidden.focus(); }

  canvas.addEventListener('mousedown', (e)=>{
    focusHidden();
    const rect = canvas.getBoundingClientRect();
    const p = pixelToLetter(e.clientX-rect.left,e.clientY-rect.top);
    cursor.line = p.line;
    cursor.col = p.col;
    render();
  });

  // keyboard via hidden textarea for better IME support
  hidden.addEventListener('keydown', (e)=>{
    if(e.key === 'Tab'){
      e.preventDefault();
      insertTextAtCursor(' '.repeat(cfg.tabSize));
      return;
    }
    if(e.key === 'Enter'){
      e.preventDefault(); newlineWithAutoIndent(); return;
    }
    if(e.key === 'Backspace'){
      e.preventDefault(); deleteBeforeCursor(); return;
    }
    if(e.key === 'ArrowLeft'){
      e.preventDefault(); if(cursor.col>0) cursor.col--; else if(cursor.line>0){ cursor.line--; cursor.col = model[cursor.line].length;} render(); return;
    }
    if(e.key === 'ArrowRight'){
      e.preventDefault(); if(cursor.col < model[cursor.line].length) cursor.col++; else if(cursor.line < model.length-1){ cursor.line++; cursor.col=0;} render(); return;
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault(); cursor.line = Math.max(0,cursor.line-1); cursor.col = Math.min(cursor.col, model[cursor.line].length); render(); return;
    }
    if(e.key === 'ArrowDown'){
      e.preventDefault(); cursor.line = Math.min(model.length-1,cursor.line+1); cursor.col = Math.min(cursor.col, model[cursor.line].length); render(); return;
    }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){
      e.preventDefault(); download(); return;
    }

    // allow other keys to be processed in input event
  });

  hidden.addEventListener('input',(e)=>{
    const val = hidden.value;
    hidden.value = '';
    if(val.length>0){ insertTextAtCursor(val); }
  });

  // clicking canvas focuses textarea
  canvas.addEventListener('focus',()=>{ focusHidden(); });
  canvas.addEventListener('blur',()=>{ /* nothing */ });

  // direct focus on load
  setTimeout(()=>{ resizeCanvas(); render(); canvas.focus(); focusHidden(); }, 50);

  // helper: download content as file
  function download(){
    const blob = new Blob([model.join('\n')],{type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'code.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

// get maketime of editor file
  function pad(n){ return String(n).padStart(2,'0'); }

// get maketime of editor file
	const dt = new Date(document.lastModified);

	const formatted =
	  dt.getFullYear() + '.' +
	  pad(dt.getMonth()+1) + '.' +
	  pad(dt.getDate()) + '.' +
	  pad(dt.getHours()) + '.' +
	  pad(dt.getMinutes()) + '.' +
	  pad(dt.getSeconds());

	document.getElementById('datetime').textContent = formatted;
		
  // initial measurement
  resizeCanvas(); 
  render();

  // expose for debugging in console
  window.__editor = { model, cursor, render, insertTextAtCursor };

})();