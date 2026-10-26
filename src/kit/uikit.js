// Player + element renderer.
// IMPORTANT: UIKit must stay fully self-contained (no imports, no outer references).
// The prototype exporter embeds UIKit.toString() into a standalone HTML file.
export function UIKit(){
  var CSS = ''
  + '.uk-el{position:absolute;box-sizing:border-box}'
  + '.uk-shape{position:absolute;inset:0}'
  + '.uk-lbl{position:absolute;inset:0;display:flex;line-height:1.15;white-space:pre-wrap;overflow:hidden;font-family:"IBM Plex Sans",system-ui,sans-serif;box-sizing:border-box}'
  + '.uk-vp{position:absolute;inset:0;overflow:hidden;background:#000;outline:none}'
  + '.uk-stage{position:absolute;left:50%;top:50%;transform-origin:50% 50%;overflow:hidden}'
  + '.uk-layer{position:absolute;inset:0}'
  + '.uk-dim{position:absolute;inset:0}'
  + '.uk-focusable,.uk-clickable{cursor:pointer}'
  + '.uk-focusable{transition:transform .08s ease,filter .08s ease}'
  + '.uk-focus{outline:4px solid #e0703a;outline-offset:4px;filter:brightness(1.18);z-index:2}'
  + '.uk-press{transform:scale(.96);filter:brightness(1.35)}'
  + '.uk-bump{animation:ukbump .18s}'
  + '@keyframes ukbump{25%{translate:-5px 0}75%{translate:5px 0}}'
  + '.uk-hud{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px 14px;flex-wrap:wrap;align-items:center;padding:8px 12px;background:rgba(14,9,6,.8);color:#ecdccb;font:12px/1.3 "IBM Plex Sans",system-ui,sans-serif;z-index:5}'
  + '.uk-hud .uk-cr{color:#9aa2b2;margin-right:auto}.uk-hud .uk-cr b{color:#fff;font-weight:600}'
  + '.uk-hud kbd{font:600 11px "JetBrains Mono",ui-monospace,monospace;background:#e0703a;color:#1d0e05;border-radius:3px;padding:1px 5px;margin-right:4px}'
  + '.uk-hud button{background:transparent;border:1px solid #444b58;color:#d8dce4;border-radius:4px;padding:2px 8px;font:inherit;cursor:pointer}'
  + '.uk-end{position:absolute;inset:0;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;background:rgba(0,0,0,.82);color:#fff;font:600 28px "Chakra Petch",system-ui,sans-serif;letter-spacing:.06em;z-index:4}'
  + '.uk-end button{font:600 14px "IBM Plex Sans",system-ui,sans-serif;background:#e0703a;color:#1d0e05;border:0;border-radius:6px;padding:8px 16px;cursor:pointer;letter-spacing:0}'
  + '.uk-hudtoggle{position:absolute;right:10px;top:10px;z-index:6;background:rgba(8,9,12,.7);color:#d8dce4;border:1px solid #444b58;border-radius:5px;font:12px "IBM Plex Sans",system-ui,sans-serif;padding:3px 9px;cursor:pointer}';

  var CLIP = {
    diamond:'polygon(50% 0,100% 50%,50% 100%,0 50%)',
    hex:'polygon(22% 0,78% 0,100% 50%,78% 100%,22% 100%,0 50%)',
    cut:'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))'
  };
  function radius(shape){ return shape==='round'?'10px':shape==='pill'?'999px':shape==='circle'?'50%':'0'; }
  var KL = {Escape:'Esc',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backspace:'Bksp',Delete:'Del',PageUp:'PgUp',PageDown:'PgDn'};
  function keyLabel(k){ if(!k) return ''; return k.split('+').map(function(p){return KL[p]||p;}).join('+'); }
  function normKey(e){
    var k=e.key; if(['Control','Shift','Alt','Meta','Dead','Unidentified'].indexOf(k)>=0) return null;
    var base = k===' '?'Space':(k.length===1?k.toUpperCase():k);
    var m=[]; if(e.ctrlKey||e.metaKey) m.push('Ctrl'); if(e.altKey) m.push('Alt');
    if(e.shiftKey && k.length>1) m.push('Shift');
    m.push(base); return m.join('+');
  }
  function renderEl(el){
    var d=document.createElement('div'); d.className='uk-el'; d.dataset.id=el.id;
    d.style.left=el.x+'px'; d.style.top=el.y+'px'; d.style.width=el.w+'px'; d.style.height=el.h+'px';
    var sh=document.createElement('div'); sh.className='uk-shape';
    var sw=+el.sw||0, stroke=el.stroke||'transparent', bg=el.fill||'transparent', clip=CLIP[el.shape];
    if(clip){
      sh.style.clipPath=clip; sh.style.background = sw? stroke : bg;
      if(sw){ var f=document.createElement('div'); f.style.cssText='position:absolute;inset:'+sw+'px;clip-path:'+clip+';background:'+bg; sh.appendChild(f); }
    } else {
      var r=radius(el.shape); sh.style.borderRadius=r; d.style.borderRadius=r;
      sh.style.background=bg; if(sw) sh.style.border=sw+'px solid '+stroke;
    }
    d.appendChild(sh);
    if(el.label){
      var lb=document.createElement('div'); lb.className='uk-lbl'; lb.textContent=el.label;
      var al=el.align||'center';
      lb.style.color=el.ink||'#fff'; lb.style.fontSize=(el.fs||16)+'px'; lb.style.fontWeight=el.bold?700:500;
      lb.style.justifyContent= al==='center'?'center':'flex-start';
      lb.style.alignItems= al==='top-left'?'flex-start':'center';
      lb.style.textAlign= al==='center'?'center':'left';
      lb.style.padding= al==='center'?'0 10px':'12px 16px';
      d.appendChild(lb);
    }
    return d;
  }

  function createPlayer(root, P, opts){
    opts=opts||{};
    var byId=function(id){ for(var i=0;i<P.screens.length;i++) if(P.screens[i].id===id) return P.screens[i]; return null; };
    var stack=[], focus={}, ended=false, hudOn=opts.hud!==false, pressing=false;
    var vp=document.createElement('div'); vp.className='uk-vp'; vp.tabIndex=0;
    var stage=document.createElement('div'); stage.className='uk-stage';
    stage.style.width=P.canvas.w+'px'; stage.style.height=P.canvas.h+'px';
    vp.appendChild(stage);
    var hud=document.createElement('div'); hud.className='uk-hud';
    var tog=document.createElement('button'); tog.className='uk-hudtoggle'; tog.textContent='Hints';
    tog.onclick=function(){ hudOn=!hudOn; hud.style.display=hudOn?'':'none'; layout(); vp.focus(); };
    vp.appendChild(hud); vp.appendChild(tog);
    root.appendChild(vp);
    var scale=1;
    function layout(){
      var r=vp.getBoundingClientRect(); var hh=hudOn?hud.offsetHeight:0;
      scale=Math.min(r.width/P.canvas.w,(r.height-hh)/P.canvas.h); if(!(scale>0)) scale=1;
      stage.style.top='calc(50% - '+(hh/2)+'px)';
      stage.style.transform='translate(-50%,-50%) scale('+scale+')';
    }
    var ro=new ResizeObserver(layout); ro.observe(vp);
    function baseIdx(){ for(var i=stack.length-1;i>=0;i--){ var s=byId(stack[i]); if(s&&s.kind!=='overlay') return i; } return 0; }
    function top(){ return byId(stack[stack.length-1]); }
    function focusables(s){ return s.elements.filter(function(e){return e.focusable;}); }
    function defFocus(s){
      var f=focusables(s); if(!f.length) return null;
      if(s.defaultFocus && f.some(function(e){return e.id===s.defaultFocus;})) return s.defaultFocus;
      return f.slice().sort(function(a,b){return (a.y-b.y)||(a.x-b.x);})[0].id;
    }
    function hasAction(el){ return el.action && el.action.type && el.action.type!=='none'; }
    function render(){
      stage.innerHTML='';
      var b=baseIdx(), n=stack.length;
      for(var i=b;i<n;i++){
        var s=byId(stack[i]); if(!s) continue;
        var isTop=i===n-1;
        var layer=document.createElement('div'); layer.className='uk-layer';
        if(s.kind==='overlay'){ var dm=document.createElement('div'); dm.className='uk-dim'; dm.style.background='rgba(0,0,0,'+(s.dim==null?0.55:s.dim)+')'; layer.appendChild(dm); }
        else layer.style.background=s.bg||'#111';
        s.elements.forEach(function(el){
          var d=renderEl(el);
          if(isTop){
            if(el.focusable){ d.classList.add('uk-focusable'); if(focus[n-1]===el.id) d.classList.add('uk-focus');
              d.addEventListener('pointerenter',function(){ if(focus[stack.length-1]!==el.id){ focus[stack.length-1]=el.id; markFocus(); } }); }
            if(el.focusable||hasAction(el)){ if(!el.focusable) d.classList.add('uk-clickable'); d.addEventListener('click',function(){ activate(el); vp.focus(); }); }
          }
          layer.appendChild(d);
        });
        stage.appendChild(layer);
      }
      if(ended){
        var en=document.createElement('div'); en.className='uk-end'; en.textContent='PREVIEW ENDED';
        var rb=document.createElement('button'); rb.textContent='Restart (Enter)'; rb.onclick=function(){restart();}; en.appendChild(rb);
        stage.appendChild(en);
      }
      renderHud(); emit();
    }
    function markFocus(){
      var i=stack.length-1, id=focus[i];
      var layers=stage.querySelectorAll('.uk-layer'); var L=layers[layers.length-1]; if(!L) return;
      L.querySelectorAll('.uk-focusable').forEach(function(n){ n.classList.toggle('uk-focus', n.dataset.id===id); });
      emit();
    }
    function hints(){
      var s=top(); if(!s) return [];
      var out=[], seen={};
      function add(k,label){ if(!k||seen[k]) return; seen[k]=1; out.push({key:k,label:label}); }
      s.elements.forEach(function(el){ if(el.key&&hasAction(el)) add(el.key, el.label||'Button'); });
      (s.keybinds||[]).forEach(function(kb){ add(kb.key, describe(kb.action)); });
      var base=byId(stack[baseIdx()]);
      (P.globals||[]).forEach(function(g){ if(!g.only||!g.only.length||(base&&g.only.indexOf(base.id)>=0)) add(g.key, (g.toggle&&g.action&&g.action.target===s.id?'Close ':'')+describe(g.action)); });
      if(focusables(s).length>1) out.push({key:'↑↓←→',label:'Move'});
      if(focusables(s).length) out.push({key:'Enter',label:'Select'});
      return out;
    }
    function describe(a){ if(!a) return ''; if(a.type==='back') return 'Back'; if(a.type==='quit') return 'Quit'; if(a.type==='goto'){ var t=byId(a.target); return t?t.name:'?'; } return ''; }
    function renderHud(){
      hud.innerHTML='';
      var cr=document.createElement('span'); cr.className='uk-cr';
      var names=stack.slice(baseIdx()).map(function(id){var s=byId(id);return s?s.name:'?';});
      cr.innerHTML=''; names.forEach(function(nm,ix){ if(ix){cr.appendChild(document.createTextNode(' › '));} var b=document.createElement(ix===names.length-1?'b':'span'); b.textContent=nm; cr.appendChild(b); });
      hud.appendChild(cr);
      hints().forEach(function(h){ var sp=document.createElement('span'); var kb=document.createElement('kbd'); kb.textContent=keyLabel(h.key); sp.appendChild(kb); sp.appendChild(document.createTextNode(h.label)); hud.appendChild(sp); });
      hud.style.display=hudOn?'':'none';
      requestAnimationFrame(layout);
    }
    function emit(){ if(opts.onChange){ var s=top(); var f=s?s.elements.find(function(e){return e.id===focus[stack.length-1];}):null; opts.onChange({stack:stack.slice(), top:s, focused:f||null, ended:ended}); } }
    function activate(el){
      if(pressing) return;
      var node=stage.querySelector('.uk-layer:last-child .uk-el[data-id="'+el.id+'"]');
      if(el.focusable){ focus[stack.length-1]=el.id; markFocus(); }
      if(!hasAction(el)){ if(node){ node.classList.remove('uk-bump'); void node.offsetWidth; node.classList.add('uk-bump'); } return; }
      pressing=true; if(node) node.classList.add('uk-press');
      setTimeout(function(){ pressing=false; run(el.action,{}); },110);
    }
    function run(a,o){
      o=o||{}; if(!a||!a.type||a.type==='none') return;
      if(a.type==='back'){ if(stack.length>1){ stack.pop(); trim(); render(); } return; }
      if(a.type==='quit'){ ended=true; render(); return; }
      if(a.type==='goto'){
        var t=byId(a.target); if(!t) return;
        var topId=stack[stack.length-1];
        if(topId===t.id){ if(o.toggle&&stack.length>1){ stack.pop(); trim(); render(); } return; }
        var at=stack.lastIndexOf(t.id);
        if(at>=0){ stack=stack.slice(0,at+1); trim(); render(); return; }
        if(o.global && t.kind==='overlay' && top().kind==='overlay' && stack.length>1) stack.pop();
        if(t.kind!=='overlay'){ /* full screens keep history for Back */ }
        stack.push(t.id); trim(); focus[stack.length-1]=defFocus(t); render();
      }
    }
    function trim(){ for(var k in focus){ if(+k>=stack.length) delete focus[k]; } }
    function move(dir){
      var s=top(), i=stack.length-1, list=focusables(s);
      var cur=list.find(function(x){return x.id===focus[i];});
      if(!cur){ focus[i]=defFocus(s); markFocus(); return; }
      if(cur.nav&&cur.nav[dir]){ var t=list.find(function(x){return x.id===cur.nav[dir];}); if(t){ focus[i]=t.id; markFocus(); return; } }
      var cx=cur.x+cur.w/2, cy=cur.y+cur.h/2, best=null, bs=Infinity;
      list.forEach(function(o){ if(o===cur) return;
        var dx=o.x+o.w/2-cx, dy=o.y+o.h/2-cy, p, q;
        if(dir==='right'){p=dx;q=dy;} else if(dir==='left'){p=-dx;q=dy;} else if(dir==='down'){p=dy;q=dx;} else {p=-dy;q=dx;}
        if(p<=1) return; var sc=p+Math.abs(q)*2.2; if(sc<bs){bs=sc;best=o;} });
      if(best){ focus[i]=best.id; markFocus(); }
      else { var node=stage.querySelector('.uk-layer:last-child .uk-el[data-id="'+cur.id+'"]'); if(node){ node.classList.remove('uk-bump'); void node.offsetWidth; node.classList.add('uk-bump'); } }
    }
    function onKey(e){
      if(opts.isActive && !opts.isActive()) return;
      var tg=e.target; if(tg&&tg.tagName&&/INPUT|TEXTAREA|SELECT/.test(tg.tagName)) return;
      if(ended){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); restart(); } return; }
      var k=normKey(e); if(!k) return;
      var s=top(); if(!s) return;
      var i=stack.length-1;
      var el=s.elements.find(function(x){return x.key===k && hasAction(x);});
      if(el){ e.preventDefault(); activate(el); return; }
      var kb=(s.keybinds||[]).find(function(x){return x.key===k;});
      if(kb){ e.preventDefault(); run(kb.action,{toggle:kb.toggle}); return; }
      var base=byId(stack[baseIdx()]);
      var g=(P.globals||[]).find(function(x){return x.key===k && (!x.only||!x.only.length||(base&&x.only.indexOf(base.id)>=0));});
      if(g){ e.preventDefault(); run(g.action,{toggle:g.toggle,global:true}); return; }
      var dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',W:'up',S:'down',A:'left',D:'right'}[k];
      if(dir){ e.preventDefault(); move(dir); return; }
      if(k==='Enter'||k==='Space'){ var f=s.elements.find(function(x){return x.id===focus[i];}); if(f){ e.preventDefault(); activate(f); } }
    }
    function restart(from){
      var st=byId(from)||byId(P.start)||P.screens[0]; if(!st) return;
      stack=[st.id]; focus={0:defFocus(st)}; ended=false; render(); try{vp.focus({preventScroll:true});}catch(err){}
    }
    window.addEventListener('keydown',onKey);
    restart(opts.from);
    return {
      restart:restart,
      destroy:function(){ window.removeEventListener('keydown',onKey); ro.disconnect(); root.innerHTML=''; },
      focus:function(){ try{vp.focus({preventScroll:true});}catch(err){} }
    };
  }
  return {CSS:CSS, renderEl:renderEl, createPlayer:createPlayer, keyLabel:keyLabel, normKey:normKey, CLIP:CLIP};
}
