(() => {
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

  // this is the multidimensional array that we render on the viewport canvas..
  let model = ["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "B",
               "C"
              ];
			  
			  // scroll testing!
			  
			  model = [""];// initially an empty page
  let cursor = { line:0, col:0, x:0,y:0 }; // y,x, weird, right??
  let selection = null;

  const PAIRS = {'(':')','[':']','{':'}','<':'>'};
  const CLOSERS = Object.values(PAIRS);

  function getCharAt(lineIdx, colIdx){
    if(lineIdx < 0 || lineIdx >= model.length) return null;
    const s = model[lineIdx];
    if(colIdx < 0 || colIdx >= s.length) return null;
    return s[colIdx];
  }

  function findMatchingBracket(lineIdx, colIdx){
    const ch = getCharAt(lineIdx, colIdx);
    if(!ch) return null;

    if(PAIRS[ch]){
      const open = ch, close = PAIRS[ch];
      let depth = 0;
      for(let i = lineIdx; i < model.length; i++){
        const str = model[i];
        let start = (i===lineIdx ? colIdx+1 : 0);
        for(let j = start; j < str.length; j++){
          const c = str[j];
          if(c === open) depth++;
          if(c === close){
            if(depth === 0) return {line:i, col:j};
            depth--;
          }
        }
      }
    } else if(CLOSERS.includes(ch)){
      let open = null;
      for(const k in PAIRS) if(PAIRS[k] === ch) open = k;
      if(!open) return null;
      let depth = 0;
      for(let i = lineIdx; i >= 0; i--){
        const str = model[i];
        let start = (i===lineIdx ? colIdx-1 : str.length-1);
        for(let j = start; j >= 0; j--){
          const c = str[j];
          if(c === ch) depth++;
          if(c === open){
            if(depth === 0) return {line:i, col:j};
            depth--;
          }
        }
      }
    }
    return null;
  }

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
  }

// Add this inside the model.js IIFE, after your editing primitives
function handleKey(e, render){
	console.log("model handleKey called")
    const c = cursor;
    const m = model;

    if(e.key === 'Tab'){
        e.preventDefault();
        insertTextAtCursor(' '.repeat(cfg.tabSize));
        render();
        return;
    }
    if(e.key === 'Enter'){
        e.preventDefault();
        newlineWithAutoIndent();
        render();
        return;
    }
    if(e.key === 'Backspace'){
        e.preventDefault();
        deleteBeforeCursor();
        render();
        return;
    }
    if(e.key === 'ArrowLeft'){
        e.preventDefault();
        if(c.col > 0) c.col--;
        else if(c.line > 0){
            c.line--;
            c.col = m[c.line].length;
        }
        render();
        return;
    }
    if(e.key === 'ArrowRight'){
        e.preventDefault();
        if(c.col < m[c.line].length) c.col++;
        else if(c.line < m.length - 1){
            c.line++;
            c.col = 0;
        }
        render();
        return;
    }
    if(e.key === 'ArrowUp'){
        e.preventDefault();
        c.line = Math.max(0, c.line - 1);
        c.col = Math.min(c.col, m[c.line].length);
        render();
        return;
    }
    if(e.key === 'ArrowDown'){
        e.preventDefault();
        c.line = Math.min(m.length - 1, c.line + 1);
        c.col = Math.min(c.col, m[c.line].length);
        render();
        return;
    }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
        e.preventDefault();
        if(window.EditorApp.download) window.EditorApp.download();
        return;
    }

    // allow other keys to be processed via input
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
  }

  // expose everything needed by viewport.js
  window.EditorApp = window.EditorApp || {};
  window.EditorApp.model = {
    cfg,
    model,
    cursor,
    selection,
    getCharAt,
    findMatchingBracket,
    clampCursor,
    insertTextAtCursor,
    deleteBeforeCursor,
    newlineWithAutoIndent,
	 handleKey  // <-- added
  };
})();
