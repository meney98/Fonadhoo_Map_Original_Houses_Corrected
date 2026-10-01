
const v=document.getElementById('viewport'), stage=document.getElementById('stage');
const search=document.getElementById('search'), results=document.getElementById('results');
const hits=document.getElementById('hits'), card=document.getElementById('card'), houseName=document.getElementById('houseName');
let s=0.08,x=0,y=0,pointers=new Map(),lastDist=0,lastMid=null,dragStart=null,selected=null,selectedBlock=null;
const editableBlocks={};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function fit(){
  const sw=14400,sh=11883, vw=v.clientWidth,vh=v.clientHeight;
  s=Math.min(vw/sw,vh/sh)*0.96; x=(vw-sw*s)/2; y=(vh-sh*s)/2; draw();
}
function draw(){stage.style.transform=`translate(${x}px,${y}px) scale(${s})`}
function zoomAt(cx,cy,newS){
  newS=clamp(newS,0.035,2.2);
  const mx=(cx-x)/s,my=(cy-y)/s;
  x=cx-mx*newS;y=cy-my*newS;s=newS;draw();
}
function focusLabel(d){
  // Zoom much closer to the selected house label/block.
  const target=1.45;
  s=target;
  x=v.clientWidth/2-d.x*s;
  y=v.clientHeight/2-d.y*s;
  draw();
  selectLabel(d);
}
function clearBlockSelection(){ if(selectedBlock){selectedBlock.classList.remove('block-selected'); selectedBlock=null;} }
function currentHouseName(d){ return d.currentName || d.name; }
function houseInfoFor(d){ return (window.HOUSE_INFO||{})[d.infoKey || d.name] || (window.HOUSE_INFO||{})[d.name] || {}; }
function selectLabel(d){
  clearBlockSelection();
  if(selected) selected.classList.remove('selected');
  selected=document.querySelector(`[data-i="${d.i}"]`);
  if(selected) selected.classList.add('selected');
  houseName.textContent=currentHouseName(d);
  const info=houseInfoFor(d);
  const vals=[
    info.houseNumber||"—",
    info.area||zoneKeyForHouse(d)||"—",
    info.feederNumber||"—",
    info.distributionBox||"—",
    info.breakerNumber||"—",
    info.meterNumber||"—"
  ];
  document.getElementById("blockId").textContent="—";
  const spans=[...card.querySelectorAll(".row .muted")].slice(1);
  spans.forEach((el,i)=>el.textContent=vals[i]||"—");
  card.style.display='block';
}
const labels=(window.HOUSE_LABELS||[]).map((d,i)=>({...d,i,currentName:d.name}));
function applyHouseEdits(){
  const info=window.HOUSE_INFO||{};
  // houses.json supports either the original key with a houseName field, or a renamed key in the same original order.
  const entries=Object.entries(info);
  labels.forEach((d,i)=>{
    // Stable mapping: a map label may only read the house record with the same permanent key.
    // Never fall back to the same array position: missing/extra records would make one house
    // borrow another house's name/details (for example Vinares/Jumbo Palace).
    const row=info[d.name] || null;
    d.infoKey=d.name;
    d.currentName=String((row && (row.displayName || row.houseName)) || d.name).trim();
    const b=hits.querySelector(`[data-i=\"${d.i}\"]`);
    if(b) b.title=d.currentName;
  });
}
window.addEventListener('house-info-loaded',applyHouseEdits);
const NO_LEGACY_HIT = new Set(['Ila','Violet Rose','Violet Villa','Herosheema','Nagazaki']);
for(const d of labels){
  // These original lots are handled only by their physical SVG block.
  // Disable legacy PDF-label hit boxes so an old label (especially Ila) cannot steal the tap.
  if(NO_LEGACY_HIT.has(d.name)) continue;
  const b=document.createElement('button'); b.type='button'; b.className='hit'; b.dataset.i=d.i; b.title=currentHouseName(d);
  const padX=Math.max(35,(d.x1-d.x0)*.55), padY=32;
  b.style.left=(d.x0-padX)+'px'; b.style.top=(d.y0-padY)+'px';
  b.style.width=(d.x1-d.x0+padX*2)+'px'; b.style.height=(d.y1-d.y0+padY*2)+'px';
  b.addEventListener('click',e=>{e.stopPropagation();selectLabel(d)});
  hits.appendChild(b);
}
function namedBlocks(){
  const infoMap=window.BLOCK_INFO||{};
  return Object.entries(infoMap).map(([id,info])=>({id,info:info||{},el:editableBlocks[id]})).filter(b=>(b.info.houseName||'').trim());
}
function focusBlock(b){
  if(!b || !b.el) return;
  let bb; try{bb=b.el.getBBox();}catch(e){return;}
  const target=1.45;
  s=target;
  x=v.clientWidth/2-(bb.x+bb.width/2)*s;
  y=v.clientHeight/2-(bb.y+bb.height/2)*s;
  draw();
  b.el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
}
search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase(); results.innerHTML='';
  if(!q){results.style.display='none';return}
  const houseFound=labels.filter(d=>currentHouseName(d).toLowerCase().includes(q)).slice(0,30);
  const blockFound=namedBlocks().filter(b=>(b.info.houseName||'').trim().toLowerCase().includes(q)).slice(0,30);
  for(const d of houseFound){const b=document.createElement('button');b.type='button';b.className='result';b.textContent=currentHouseName(d);
    b.addEventListener('click',()=>{search.value=currentHouseName(d);results.style.display='none';focusLabel(d)});results.appendChild(b)}
  for(const item of blockFound){const b=document.createElement('button');b.type='button';b.className='result';b.textContent=(item.info.houseName||'').trim();
    b.addEventListener('click',()=>{search.value=(item.info.houseName||'').trim();results.style.display='none';focusBlock(item)});results.appendChild(b)}
  results.style.display=(houseFound.length||blockFound.length)?'block':'none';
});
search.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const q=search.value.trim().toLowerCase();
    const d=labels.find(z=>currentHouseName(z).toLowerCase()===q)||labels.find(z=>currentHouseName(z).toLowerCase().includes(q));
    if(d){results.style.display='none';focusLabel(d);return;}
    const b=namedBlocks().find(z=>(z.info.houseName||'').trim().toLowerCase()===q)||namedBlocks().find(z=>(z.info.houseName||'').trim().toLowerCase().includes(q));
    if(b){results.style.display='none';focusBlock(b);}
  }
});
document.getElementById('reset').addEventListener('click',()=>{card.style.display='none';search.value='';results.style.display='none';if(selected)selected.classList.remove('selected');selected=null;clearBlockSelection();fit()});
document.getElementById('close').addEventListener('click',()=>{card.style.display='none';if(selected)selected.classList.remove('selected');selected=null;clearBlockSelection()});
v.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,s*(e.deltaY<0?1.18:.84))},{passive:false});
v.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});v.setPointerCapture(e.pointerId);dragStart={x:e.clientX,y:e.clientY,ox:x,oy:y};});
v.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const ps=[...pointers.values()];
  if(ps.length===1 && dragStart){x=dragStart.ox+(ps[0].x-dragStart.x);y=dragStart.oy+(ps[0].y-dragStart.y);draw()}
  if(ps.length===2){
    const dx=ps[0].x-ps[1].x,dy=ps[0].y-ps[1].y,dist=Math.hypot(dx,dy),mid={x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2};
    if(lastDist>0){zoomAt(mid.x,mid.y,s*(dist/lastDist)); if(lastMid){x+=mid.x-lastMid.x;y+=mid.y-lastMid.y;draw()}}
    lastDist=dist;lastMid=mid;dragStart=null;
  }
});
function end(e){pointers.delete(e.pointerId);if(pointers.size<2){lastDist=0;lastMid=null}if(pointers.size===1){const p=[...pointers.values()][0];dragStart={x:p.x,y:p.y,ox:x,oy:y}}else if(!pointers.size)dragStart=null}
v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);
window.addEventListener('resize',fit);fit();


// Load the original PDF-derived vector map inline, then make house-sized vector blocks clickable.
const svgHost=document.getElementById('svgHost');
fetch('map.svg',{cache:'no-store'}).then(r=>r.text()).then(txt=>{
  svgHost.innerHTML=txt;
  const svg=svgHost.querySelector('svg');
  if(!svg) return;
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.setAttribute('width','14400'); svg.setAttribute('height','11883');

  let blockNo=0;
  const blockElements={};
  const labelLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
  labelLayer.setAttribute('id','editable-block-labels');
  labelLayer.style.pointerEvents='none';

  function refreshEditableBlockLabels(){
    // Rebuild the editable-name layer. For every named block, first paint an
    // exact copy of the lot itself over the PDF-derived artwork. Because the
    // copy uses the lot's real path (not a rectangle), it cleanly covers any
    // old house-name glyphs inside the lot without covering nearby roads or
    // neighbouring blocks. Then draw only the name from blocks.json.
    labelLayer.replaceChildren();
    const infoMap=window.BLOCK_INFO||{};

    for(const [id,el] of Object.entries(blockElements)){
      const name=(infoMap[id]?.houseName||'').trim();
      if(!name) continue;
      let bb; try{bb=el.getBBox();}catch(e){continue;}

      const cover=el.cloneNode(false);
      cover.removeAttribute('id');
      cover.removeAttribute('data-block-id');
      cover.classList.remove('editable-block','block-selected');
      cover.style.pointerEvents='none';
      cover.setAttribute('aria-hidden','true');
      labelLayer.appendChild(cover);

      const text=document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('x',bb.x+bb.width/2);
      text.setAttribute('y',bb.y+bb.height/2);
      text.setAttribute('text-anchor','middle');
      text.setAttribute('dominant-baseline','middle');
      text.setAttribute('font-family','Arial, sans-serif');
      text.setAttribute('font-size',Math.max(5,Math.min(10,Math.min(bb.width,bb.height)*0.16)));
      text.setAttribute('fill','#111');
      text.setAttribute('data-block-label',id);
      text.textContent=name;
      labelLayer.appendChild(text);
    }
  }

  window.refreshEditableBlockLabels=refreshEditableBlockLabels;
  window.addEventListener('block-info-loaded',refreshEditableBlockLabels);
  for(const el of svg.querySelectorAll('path')){
    let bb;
    try{ bb=el.getBBox(); }catch(e){ continue; }
    // House/lot-sized closed or filled vector shapes; excludes tiny text glyphs and huge roads/zones.
    const fill=getComputedStyle(el).fill;
    const painted=fill && fill!=='none' && fill!=='rgba(0, 0, 0, 0)';
    if(!painted || bb.width<20 || bb.height<20 || bb.width>300 || bb.height>300 || bb.width*bb.height<700) continue;
    blockNo++;
    const id='BLOCK-'+String(blockNo).padStart(4,'0');
    el.classList.add('editable-block');
    el.dataset.blockId=id;
    blockElements[id]=el; editableBlocks[id]=el;
    el.style.pointerEvents='visiblePainted';
    el.addEventListener('click',ev=>{
      ev.stopPropagation();
      if(selected) selected.classList.remove('selected'); selected=null;
      clearBlockSelection();
      selectedBlock=el;
      el.classList.add('block-selected');
      const info=(window.BLOCK_INFO||{})[id]||{};
      document.getElementById('blockId').textContent=id;
      houseName.textContent=(info.houseName||'').trim()||'Empty / unnamed block';
      const vals=[info.houseNumber||'—',info.area||zoneKeyForBlock(id,info)||'—',info.feederNumber||'—',info.distributionBox||'—',info.breakerNumber||'—',info.meterNumber||'—'];
      const spans=[...card.querySelectorAll('.row .muted')].slice(1);
      spans.forEach((node,i)=>node.textContent=vals[i]||'—');
      card.style.display='block';
    });
  }

  // ORIGINAL HOUSE BLOCKS: preserve these genuine lots by stable block ID.
  // Do not use guessed coordinates: those can bind a name to a neighbouring/empty lot.
  const originalHouseBlockMap={
    'BLOCK-1925':{name:'Violet Rose',area:'SS02',feederNumber:''},
    'BLOCK-2316':{name:'Violet Villa',area:'SS02',feederNumber:''},
    'BLOCK-2010':{name:'Nagazaki',area:'SS02',feederNumber:'A'},
    'BLOCK-2004':{name:'Herosheema',area:'SS02',feederNumber:'A'}
  };

  for(const [id,spec] of Object.entries(originalHouseBlockMap)){
    const el=blockElements[id];
    if(!el) continue;
    const old=(window.BLOCK_INFO||{})[id]||{};
    (window.BLOCK_INFO||{})[id]={...old,houseName:spec.name,area:old.area||spec.area,feederNumber:old.feederNumber||spec.feederNumber};
    el.dataset.originalHouse=spec.name;
  }

  // Remove legacy PDF-label hit buttons that fall inside these four physical lots.
  // This prevents labels such as iLaa/Ila from stealing a tap from Violet Rose/Violet Villa.
  for(const [id,el] of Object.entries(blockElements)){
    if(!originalHouseBlockMap[id]) continue;
    let bb; try{bb=el.getBBox();}catch(e){continue;}
    for(const d of labels){
      if(d.x>=bb.x && d.x<=bb.x+bb.width && d.y>=bb.y && d.y<=bb.y+bb.height){
        const hit=hits.querySelector(`[data-i="${d.i}"]`);
        if(hit) hit.remove();
      }
    }
  }

  svg.appendChild(labelLayer);
  function hideOriginalRenamedLabelGlyphs(){
    // The PDF-derived SVG has the original house names drawn as vector paths.
    // When a house is renamed in houses.json, hide only the small vector glyphs
    // inside that original label's bounding box so the old and new names do not overlap.
    const renamed=labels.filter(d=>currentHouseName(d)!==d.name);
    if(!renamed.length) return;
    for(const el of svg.querySelectorAll('path')){
      let bb; try{bb=el.getBBox();}catch(e){continue;}
      // Ignore normal lot/road shapes. Text glyphs are small.
      if(bb.width>80 || bb.height>25) continue;
      for(const d of renamed){
        const padX=3, padY=3;
        const inside = bb.x >= d.x0-padX && bb.y >= d.y0-padY &&
          bb.x+bb.width <= d.x1+padX && bb.y+bb.height <= d.y1+padY;
        if(inside){ el.style.display='none'; break; }
      }
    }
  }
  function refreshNamedHouseLabels(){
    // Cover the PDF's original vector house name with the lot's own fill color,
    // then draw the editable name from houses.json on top.
    let layer=svg.querySelector('#renamed-house-labels');
    if(!layer){
      layer=document.createElementNS('http://www.w3.org/2000/svg','g');
      layer.id='renamed-house-labels';
      layer.style.pointerEvents='none';
      svg.appendChild(layer);
    }
    layer.replaceChildren();

    const paintedPaths=[...svg.querySelectorAll('path')].filter(el=>{
      let bb; try{bb=el.getBBox();}catch(e){return false;}
      const fill=getComputedStyle(el).fill;
      return fill && fill!=='none' && fill!=='rgba(0, 0, 0, 0)' && bb.width>20 && bb.height>20;
    });

    function lotFillAt(d){
      const pt=svg.createSVGPoint(); pt.x=d.x; pt.y=d.y;
      let best=null, bestArea=Infinity;
      for(const el of paintedPaths){
        let bb; try{bb=el.getBBox();}catch(e){continue;}
        if(d.x<bb.x || d.x>bb.x+bb.width || d.y<bb.y || d.y>bb.y+bb.height) continue;
        let inside=false;
        try{ inside=typeof el.isPointInFill==='function' ? el.isPointInFill(pt) : true; }catch(e){ inside=true; }
        if(!inside) continue;
        const area=bb.width*bb.height;
        if(area<bestArea){best=el;bestArea=area;}
      }
      return best ? getComputedStyle(best).fill : '#a7f3a1';
    }

    labels.forEach(d=>{
      if(currentHouseName(d)===d.name) return;
      const padX=5, padY=4;
      const cover=document.createElementNS('http://www.w3.org/2000/svg','rect');
      cover.setAttribute('x',d.x0-padX);
      cover.setAttribute('y',d.y0-padY);
      cover.setAttribute('width',(d.x1-d.x0)+padX*2);
      cover.setAttribute('height',(d.y1-d.y0)+padY*2);
      cover.setAttribute('rx','2');
      cover.setAttribute('fill',lotFillAt(d));
      layer.appendChild(cover);

      const t=document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x',d.x); t.setAttribute('y',d.y);
      t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','middle');
      t.setAttribute('font-family','Arial, sans-serif'); t.setAttribute('font-size','8'); t.setAttribute('fill','#111');
      t.textContent=currentHouseName(d);
      layer.appendChild(t);
    });
  }
  window.refreshNamedHouseLabels=refreshNamedHouseLabels;
  window.addEventListener('house-info-loaded',()=>{applyHouseEdits();refreshNamedHouseLabels();});
  applyHouseEdits(); hideOriginalRenamedLabelGlyphs(); refreshNamedHouseLabels();
  refreshEditableBlockLabels();
  window.detectedBlockCount=blockNo;
}).catch(()=>{});


// ===== 8 EDITABLE ZONES =====
const zonesHost=document.getElementById('zones');
let activeZoneKey=null;
let zoneLayer=null;

function normalizeZoneName(v){
  return String(v||'').trim().toLowerCase()
    .replace(/[()\[\]{}]/g,'')
    .replace(/\s+/g,' ');
}
function getZoneInfo(){return window.ZONE_INFO||{};}

function zoneKeyForName(name){
  const q=normalizeZoneName(name);
  if(!q) return "";
  for(const [key,z] of Object.entries(getZoneInfo())){
    const items=(z && Array.isArray(z.houses)) ? z.houses : [];
    if(items.some(item=>normalizeZoneName(item)===q)) return key;
  }
  return "";
}

function zoneKeyForHouse(d){
  return zoneKeyForName(d.name) || zoneKeyForName(currentHouseName(d));
}

function zoneKeyForBlock(id,info){
  return zoneKeyForName(id) || zoneKeyForName(info && info.houseName);
}

function clearZoneHighlight(){
  activeZoneKey=null;
  if(zoneLayer) zoneLayer.replaceChildren();
  if(zonesHost) [...zonesHost.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));
}

function findZoneHouseCandidates(name){
  const q=normalizeZoneName(name);
  if(!q) return [];
  const out=[];

  // Stable BLOCK IDs are always unambiguous.
  if(q.startsWith('block-')){
    const id=q.toUpperCase();
    if(editableBlocks[id]) return [{type:'block',value:id,el:editableBlocks[id]}];
  }

  // Collect ALL exact editable-block name matches instead of silently taking the first.
  for(const b of namedBlocks()){
    if(normalizeZoneName(b.info.houseName)===q && b.el) out.push({type:'block',value:b.id,el:b.el});
  }

  // Collect ALL exact PDF-label matches. This matters for duplicate names such as "Mosque".
  for(const d of labels){
    if(normalizeZoneName(currentHouseName(d))===q || normalizeZoneName(d.name)===q){
      const el=lotElementForHouse(d);
      if(el) out.push({type:'house',value:d,el});
    }
  }

  // Remove duplicate candidates that point to the same SVG lot.
  return out.filter((c,i,a)=>a.findIndex(x=>x.el===c.el)===i);
}

function candidateBounds(c){
  if(!c || !c.el) return null;
  try{
    const bb=c.el.getBBox();
    return {x0:bb.x,y0:bb.y,x1:bb.x+bb.width,y1:bb.y+bb.height,cx:bb.x+bb.width/2,cy:bb.y+bb.height/2};
  }catch(e){return null;}
}

function automaticZoneItems(key){
  const q=normalizeZoneName(key);
  const out=[];
  // blocks.json: assigning Area / SS automatically puts the block in that zone.
  for(const [id,info] of Object.entries(window.BLOCK_INFO||{})){
    if(normalizeZoneName(info && info.area)===q) out.push(id);
  }
  // houses.json: assigning Area / SS automatically puts the house in that zone.
  for(const d of labels){
    const info=houseInfoFor(d);
    if(normalizeZoneName(info && info.area)===q) out.push(currentHouseName(d));
  }
  return out;
}

function ensureZoneLayer(){
  const svg=svgHost && svgHost.querySelector('svg');
  if(!svg) return null;
  if(!zoneLayer){
    zoneLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
    zoneLayer.id='zone-highlight-layer';
    zoneLayer.style.pointerEvents='none';
    svg.appendChild(zoneLayer);
  }
  return zoneLayer;
}

function addZoneOutlineForElement(el, bounds){
  if(!el || !zoneLayer) return;
  let bb; try{bb=el.getBBox();}catch(e){return;}
  const clone=el.cloneNode(false);
  clone.removeAttribute('id'); clone.removeAttribute('class'); clone.removeAttribute('style');
  clone.setAttribute('fill','none'); clone.setAttribute('stroke','#e00000');
  clone.setAttribute('stroke-width','10'); clone.setAttribute('vector-effect','non-scaling-stroke');
  clone.setAttribute('opacity','1'); clone.style.pointerEvents='none';
  zoneLayer.appendChild(clone);
  bounds.push({x0:bb.x,y0:bb.y,x1:bb.x+bb.width,y1:bb.y+bb.height});
}

function lotElementForHouse(d){
  const svg=svgHost && svgHost.querySelector('svg'); if(!svg) return null;
  const pt=svg.createSVGPoint(); pt.x=d.x; pt.y=d.y;
  let best=null,bestArea=Infinity;
  for(const el of svg.querySelectorAll('path.editable-block')){
    let bb; try{bb=el.getBBox();}catch(e){continue;}
    if(d.x<bb.x||d.x>bb.x+bb.width||d.y<bb.y||d.y>bb.y+bb.height) continue;
    let inside=true; try{if(typeof el.isPointInFill==='function') inside=el.isPointInFill(pt);}catch(e){}
    if(!inside) continue;
    const area=bb.width*bb.height; if(area<bestArea){best=el;bestArea=area;}
  }
  if(best) return best;

  // PDF labels can sit slightly outside the lot polygon.
  let nearest=null, nearestDist=Infinity;
  for(const el of svg.querySelectorAll('path.editable-block')){
    let bb; try{bb=el.getBBox();}catch(e){continue;}
    const cx=bb.x+bb.width/2, cy=bb.y+bb.height/2;
    const dist=Math.hypot(d.x-cx,d.y-cy);
    if(dist<nearestDist){nearest=el;nearestDist=dist;}
  }
  return nearestDist<=140 ? nearest : null;
}

function zoomToZone(bounds){
  if(!bounds.length) return;
  const minX=Math.min(...bounds.map(b=>b.x0)), minY=Math.min(...bounds.map(b=>b.y0));
  const maxX=Math.max(...bounds.map(b=>b.x1)), maxY=Math.max(...bounds.map(b=>b.y1));
  const w=Math.max(1,maxX-minX), h=Math.max(1,maxY-minY), pad=0.82;
  s=clamp(Math.min(v.clientWidth/w,v.clientHeight/h)*pad,0.035,1.45);
  x=v.clientWidth/2-((minX+maxX)/2)*s; y=v.clientHeight/2-((minY+maxY)/2)*s; draw();
}

function activateZone(key,button){
  const layer=ensureZoneLayer(); if(!layer) return;
  if(activeZoneKey===key){clearZoneHighlight();return;}
  clearZoneHighlight(); activeZoneKey=key; button.classList.add('active');
  const zone=getZoneInfo()[key]||{};
  const manual=Array.isArray(zone.houses)?zone.houses:[];
  const items=[...new Set([...manual,...automaticZoneItems(key)])];
  const bounds=[];
  const ambiguous=[];

  // First draw only unambiguous matches. Their positions define the zone cluster.
  for(const name of items){
    const candidates=findZoneHouseCandidates(name);
    if(candidates.length===1){
      addZoneOutlineForElement(candidates[0].el,bounds);
    }else if(candidates.length>1){
      ambiguous.push(candidates);
    }
  }

  // Then resolve duplicate names (for example "Mosque") to the lot nearest this zone's cluster.
  if(bounds.length){
    const cx=bounds.reduce((a,b)=>a+(b.x0+b.x1)/2,0)/bounds.length;
    const cy=bounds.reduce((a,b)=>a+(b.y0+b.y1)/2,0)/bounds.length;
    for(const candidates of ambiguous){
      let best=null,bestDist=Infinity;
      for(const c of candidates){
        const bb=candidateBounds(c); if(!bb) continue;
        const dist=Math.hypot(bb.cx-cx,bb.cy-cy);
        if(dist<bestDist){best=c;bestDist=dist;}
      }
      if(best) addZoneOutlineForElement(best.el,bounds);
    }
  }
  zoomToZone(bounds);
}

function bindPermanentZoneButtons(){
  if(!zonesHost) return;
  const info=getZoneInfo();
  for(const b of zonesHost.querySelectorAll('button[data-zone]')){
    const key=b.dataset.zone;
    const zone=info[key]||{};
    b.title=zone.label||key;
    if(!b.dataset.bound){
      b.addEventListener('click',e=>{e.stopPropagation();activateZone(key,b)});
      b.dataset.bound='1';
    }
  }
}
window.addEventListener('zone-info-loaded',bindPermanentZoneButtons);
bindPermanentZoneButtons();
