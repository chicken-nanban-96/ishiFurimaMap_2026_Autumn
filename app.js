// Reusable map app: logic is independent of shop and coordinate JSON.
function startApp(SHOPS,MAP_DATA){
'use strict';
const DATA=SHOPS.shops;
document.title=SHOPS.title+' | 訪問順';
document.querySelector('h1').textContent='💎 '+SHOPS.title;
document.getElementById('eventSubtitle').textContent=SHOPS.subtitle;
document.querySelectorAll('[data-day]').forEach(btn=>{btn.textContent=SHOPS.dates[btn.dataset.day]?.label||btn.dataset.day});
document.getElementById('venueNotice').textContent=MAP_DATA.notes||'';
for(const [d,id] of [['fri','officialFriLink'],['sat','officialSatLink']]){
 const a=document.getElementById(id);if(a&&SHOPS.officialListUrls?.[d])a.href=SHOPS.officialListUrls[d];
}
const $=id=>document.getElementById(id);
let day='sat',floor=4,tab='map',current=null,saved={};
const storageKey='ishifurima-memory:'+SHOPS.eventId;
try{
 const own=localStorage.getItem(storageKey);
 if(own!==null){saved=JSON.parse(own)||{};}
 else if(SHOPS.eventId==='asakusa-ishifurima-2026-11'){
  // One-time migration from the single-HTML versions on the SAME origin.
  saved=JSON.parse(localStorage.getItem('asakusa-ishi-v3')||'{}')||{};
  localStorage.setItem(storageKey,JSON.stringify(saved));
 }
}catch(e){console.warn('個人記録の読み込みに失敗',e)}

const COUNT={4:{A:82,B:24,C:20,D:20,E:20,F:20,G:20,H:24,I:16},5:{J:82,K:24,L:20,M:20,N:20,O:20,P:20,Q:24,R:20}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const natural=s=>String(s??'').toLowerCase().normalize('NFKC').replace(/[\sー－\-~〜～・]/g,'');
function codes(booth){let s=String(booth).normalize('NFKC').replace(/〜/g,'～').replace(/~/g,'～');let m=s.match(/^([A-Z]+)-?(.*)$/),prefix=m?m[1]:'飲食',t=m?m[2]:s;let a=t.includes('～')?(()=>{let [x,y]=t.split('～').map(Number);return Array.from({length:Math.max(0,Math.min(100,y-x+1))},(_,i)=>x+i)})():[...t.matchAll(/\d+/g)].map(x=>+x[0]);return a.map(n=>prefix+'-'+String(n).padStart(2,'0'))}
const all=()=>DATA[day];const floorsellers=()=>all().filter(s=>s.floor===floor);const key=s=>`${day}|${s.floor}|${s.booth}|${s.name}`;const state=s=>saved[key(s)]||(saved[key(s)]={fav:false,visited:false,memo:'',visitOrder:null});
function visitNumber(s){const st=state(s),n=Number(st.visitOrder);return st.fav&&Number.isInteger(n)&&n>=1&&n<=999?n:null}
function sortByVisitOrder(a,b){return (visitNumber(a)??100000)-(visitNumber(b)??100000)||a.floor-b.floor||a.booth.localeCompare(b.booth,'ja')}
function refreshDetailActions(st){
 $('favorite').textContent=st.fav?'★ お気に入り済':'☆ お気に入り';
 $('favorite').classList.toggle('on',!!st.fav);
 $('visited').textContent=st.visited?'✓ 訪問済み':'□ 訪問前';
 // v19: Visit order is always editable for an existing seller, even before favorite registration.
 $('visitOrder').disabled=!current;
 $('visitOrder').placeholder=current?'例：1':'出展情報未登録';
 $('visitError').hidden=true;
}
function addVisitOrderBadges(){
 // Draw ONE badge for each shop, even if its booth spans multiple numbered squares.
 const svg=$('map').querySelector('svg.layoutSVG');if(!svg)return;
 const ns='http://www.w3.org/2000/svg';
 for(const s of floorsellers()){
  const n=visitNumber(s);if(!n)continue;
  const firstCode=codes(s.booth).find(c=>svg.querySelector('g.boothSVG[data-code="'+c+'"]'));
  if(!firstCode)continue;
  const tile=svg.querySelector('g.boothSVG[data-code="'+firstCode+'"] rect');
  if(!tile)continue;
  const x=Number(tile.getAttribute('x')),y=Number(tile.getAttribute('y')),
        w=Number(tile.getAttribute('width')),h=Number(tile.getAttribute('height'));
  // Outside the booth wherever possible, so its original number remains readable.
  let cx=x+w+5,cy=y-2;
  if(x>=svg.viewBox.baseVal.width*.8)cx=x-5;
  if(y<50)cy=y+h+5;
  if(y>svg.viewBox.baseVal.height*.8)cy=y-3;
  const g=document.createElementNS(ns,'g');g.setAttribute('class','orderBadge');g.setAttribute('aria-label',`訪問順 ${n}: ${s.name}`);
  const r=n>=100?10.2:n>=10?9:8;
  const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);circle.setAttribute('r',r);
  const label=document.createElementNS(ns,'text');label.setAttribute('x',cx);label.setAttribute('y',cy+3.1);label.setAttribute('text-anchor','middle');label.setAttribute('font-size',n>=100?'8':n>=10?'9':'10');label.textContent=String(n);
  g.append(circle,label);svg.appendChild(g);
 }
}
function find(code){return floorsellers().find(s=>codes(s.booth).includes(code))}
function saveState(){try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch(e){alert('このブラウザではメモの保存ができないみたい')}}
function match(s){let raw=$('query').value,q=natural(raw);if(!q)return true;const m=/^([a-zA-Z]+)[-－ ]*0*(\d{1,2})$/.exec(raw.trim());const nq=m?(m[1]+String(Number(m[2])).padStart(2,'0')).toLowerCase():q;const hay=natural(s.name+' '+s.booth+' '+s.category+' '+codes(s.booth).join(' ')+' '+(state(s).memo||''));return hay.includes(q)||hay.includes(nq)}
// ---- 位置・色・区画番号は map.json に定義。JSに座標を書かない。 ----
function renderMapTile(b){
 const seller=find(b.code),q=natural($('query').value),hit=seller&&q&&match(seller),st=seller?state(seller):null;
 const classList=['boothSVG',b.color||'cyanTile',seller?'':'unknownSVG',hit?'hitSVG':'',st?.fav?'favSVG':'',st?.visited?'visitedSVG':''].filter(Boolean).join(' ');
 const title=esc(seller?seller.name:b.code);
 return `<g class="${classList}" data-code="${esc(b.code)}" role="button" tabindex="0" aria-label="${esc(b.code+(seller?' '+seller.name:''))}" title="${title}">`+
 `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="0.7"/>`+
 `<text x="${b.textX}" y="${b.textY}" text-anchor="middle" font-size="${b.fontSize}" font-weight="750">${esc(b.label)}</text></g>`;
}
function renderLayout(layoutId){
 const m=MAP_DATA.layouts[layoutId];
 if(!m) return '<div class="notice">この日・階の配置データがありません。</div>';
 const svg=`<svg class="layoutSVG" viewBox="${esc(m.viewBox)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(m.description)}">`+
 m.background.join('')+m.booths.map(renderMapTile).join('')+m.foreground.join('')+'</svg>';
 let note=layoutId==='hall5_fri'?'金曜5階の位置は暫定だよ。':`ブースを押すとお店の詳細を表示するよ。`;
 return `<div class="mapZoom">${svg}</div><div class="exactInfo">${note}</div>`;
}
function fourth(){return renderLayout('hall4')}
function fifth(){return renderLayout(MAP_DATA.days[day]?.[String(floor)]||'')}
// Map zoom uses a fixed, stable SVG viewBox. No booth coordinates are changed.
const MIN_MAP_SCALE=0.45, MAX_MAP_SCALE=3.5;
let mapScale=1, lastMapId='';
const clampScale=n=>Math.max(MIN_MAP_SCALE,Math.min(MAX_MAP_SCALE,n));
function zoomPane(){return $('map').querySelector('.mapZoom')}
function zoomSize(pane){return Math.max(560,pane.clientWidth||360)}
function zoomLabel(){
 $('zoomLabel').textContent=Math.round(mapScale*100)+'%';
 $('zoomOut').disabled=mapScale<=MIN_MAP_SCALE+.001;
 $('zoomIn').disabled=mapScale>=MAX_MAP_SCALE-.001;
}
// anchor position is measured from top-left inside the viewport.
function applyMapZoom(scale, anchor=null, startAtTop=false){
 const pane=zoomPane(),svg=pane?.querySelector('svg.layoutSVG');
 if(!svg)return;
 const before=svg.getBoundingClientRect();
 const anchorX=anchor?.x??pane.clientWidth/2;
 const anchorY=anchor?.y??Math.min(pane.clientHeight/2,230);
 const pointX=(pane.scrollLeft+anchorX)/Math.max(before.width,1);
 const pointY=(pane.scrollTop+anchorY)/Math.max(before.height,1);
 mapScale=clampScale(scale);
 svg.style.minWidth='0';
 svg.style.maxWidth='none';
 svg.style.width=Math.round(zoomSize(pane)*mapScale)+'px';
 const after=svg.getBoundingClientRect();
 if(startAtTop){pane.scrollLeft=0;pane.scrollTop=0}
 else {
  pane.scrollLeft=Math.max(0,pointX*after.width-anchorX);
  pane.scrollTop=Math.max(0,pointY*after.height-anchorY);
 }
 zoomLabel();
}
function initializeMapZoom(){
 const pane=zoomPane(),svg=pane?.querySelector('svg.layoutSVG');
 if(!pane||!svg)return;
 const identity=day+'-'+floor;
 // Keep magnification but don't resume a different floor at an unrelated scroll position.
 const same=identity===lastMapId;
 const previous=window.__mapScroll||{left:0,top:0};
 svg.style.minWidth='0';svg.style.maxWidth='none';
 svg.style.width=Math.round(zoomSize(pane)*mapScale)+'px';
 if(same){pane.scrollLeft=previous.left;pane.scrollTop=previous.top}
 else{pane.scrollLeft=0;pane.scrollTop=0}
 lastMapId=identity;
 zoomLabel();
 // Two-finger pinch keeps the point between the fingers under them while scaling.
 let pinch=null;
 const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 pane.addEventListener('touchstart',e=>{
  if(e.touches.length!==2){pinch=null;return}
  const box=pane.getBoundingClientRect();
  pinch={distance:Math.max(distance(e.touches[0],e.touches[1]),1),scale:mapScale,
   x:(e.touches[0].clientX+e.touches[1].clientX)/2-box.left,
   y:(e.touches[0].clientY+e.touches[1].clientY)/2-box.top};
 },{passive:true});
 pane.addEventListener('touchmove',e=>{
  if(!pinch||e.touches.length!==2)return;
  e.preventDefault();
  const box=pane.getBoundingClientRect();
  const x=(e.touches[0].clientX+e.touches[1].clientX)/2-box.left;
  const y=(e.touches[0].clientY+e.touches[1].clientY)/2-box.top;
  applyMapZoom(pinch.scale*distance(e.touches[0],e.touches[1])/pinch.distance,{x,y});
 },{passive:false});
 pane.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
 pane.addEventListener('touchcancel',()=>{pinch=null},{passive:true});
 pane.addEventListener('scroll',()=>{window.__mapScroll={left:pane.scrollLeft,top:pane.scrollTop}},{passive:true});
}
$('zoomIn').onclick=()=>applyMapZoom(mapScale+.25);
$('zoomOut').onclick=()=>applyMapZoom(mapScale-.25);
$('zoomReset').onclick=()=>applyMapZoom(1,null,true);
$('zoomFit').onclick=()=>{
 const pane=zoomPane(); if(pane)applyMapZoom(pane.clientWidth/zoomSize(pane),null,true);
};
function render(){
 const people=floorsellers(),res=people.filter(s=>match(s)&&(tab!=='fav'||state(s).fav));
 if(tab==='fav')res.sort(sortByVisitOrder);
 const planned=people.filter(s=>visitNumber(s)).length;
 $('stats').textContent=`${SHOPS.dates[day]?.label||day}・${floor}階　該当 ${res.length}店（登録 ${people.length}店）／訪問順登録 ${planned}店`;
 $('maparea').classList.toggle('hidden',tab!=='map');
 $('mapLegend').classList.toggle('hidden',tab!=='map');
 $('officialarea').classList.toggle('hidden',tab!=='official');
 $('listarea').classList.toggle('hidden',tab==='map'||tab==='official');
 if(tab==='map'){
  const oldPane=zoomPane();
  window.__mapScroll=oldPane?{left:oldPane.scrollLeft,top:oldPane.scrollTop}:{left:0,top:0};
  $('map').innerHTML=floor===4?fourth():fifth();
  addVisitOrderBadges();
  initializeMapZoom();
 }
 if(tab==='official'){
  let i=(day==='fri'?0:2)+(floor===4?0:1);
  $('officialtitle').textContent=`${SHOPS.dates[day]?.label||day}・${floor}階　公式図`;
  $('officialimg').style.setProperty('--left',`-${i*100}%`);
  $('officialimg').src='https://takama.ne.jp/isi_fleamarket/202611_ALL.png';
 }
 if(tab==='list'||tab==='fav'){
  $('entries').innerHTML=res.length?res.map(s=>{
   const n=visitNumber(s);
   return `<button class="entry" data-name="${esc(s.name)}" data-booth="${esc(s.booth)}"><span style="display:flex;align-items:center">${n?`<span class="listBadge" aria-label="訪問順 ${n}">${n}</span>`:''}<span><b>${state(s).fav?'★ ':''}${esc(s.name)}</b><small>${esc(s.category)}${tab==='fav'&&!n?' ・ 訪問順未設定':''}</small></span></span><span class="code">${floor}F ${esc(s.booth)}</span></button>`;
  }).join(''):'<div class="nohits">該当するお店がないよ。日付・階を確認してね。</div>';
 }
}
function change(d,f,t){day=d;floor=f;tab=t;document.querySelectorAll('[data-day]').forEach(e=>e.classList.toggle('on',e.dataset.day===day));document.querySelectorAll('[data-floor]').forEach(e=>e.classList.toggle('on',+e.dataset.floor===floor));document.querySelectorAll('[data-tab]').forEach(e=>e.classList.toggle('on',e.dataset.tab===tab));render()}
function show(s,code){
 current=s||null;
 $('detailTitle').textContent=s?s.name:'出展情報未登録';
 $('location').textContent=s?`${s.floor}階　${s.booth}`:`${floor}階 ${code}`;
 $('category').textContent=s?s.category:'対応する出展者が登録されていない番号です';
 $('detailExtra').textContent=code?`選択した番号：${code}`:'';
 $('memo').disabled=!s;$('favorite').disabled=!s;$('visited').disabled=!s;$('save').disabled=!s;
 let st=s?state(s):{fav:false,visited:false,memo:'',visitOrder:null};
 $('memo').value=st.memo||'';
 $('visitOrder').value=s?(visitNumber(s)||''):'';
 if(!s)$('visitOrder').value='';
 refreshDetailActions(st);
 $('modal').classList.add('show');
}
function close(){$('modal').classList.remove('show');current=null}
document.querySelectorAll('[data-day]').forEach(e=>e.onclick=()=>change(e.dataset.day,floor,tab));document.querySelectorAll('[data-floor]').forEach(e=>e.onclick=()=>change(day,+e.dataset.floor,tab));document.querySelectorAll('[data-tab]').forEach(e=>e.onclick=()=>change(day,floor,e.dataset.tab));$('query').oninput=()=>{let q=natural($('query').value);if(q){let hit=all().find(s=>match(s));if(hit && hit.floor!==floor){change(day,hit.floor,tab);return}}render()};$('clear').onclick=()=>{$('query').value='';render()};$('map').onclick=e=>{const b=e.target.closest('[data-code]');if(b)show(find(b.dataset.code),b.dataset.code)};$('map').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g[data-code]')){e.preventDefault();const b=e.target;show(find(b.dataset.code),b.dataset.code)}};$('entries').onclick=e=>{const b=e.target.closest('button[data-name]');if(b)show(all().find(s=>s.name===b.dataset.name&&s.booth===b.dataset.booth))};$('favorite').onclick=()=>{
 if(!current)return;
 const st=state(current);st.fav=!st.fav;
 if(!st.fav){st.visitOrder=null;$('visitOrder').value='';}
 saveState();refreshDetailActions(st);render();
};
$('visited').onclick=()=>{
 if(!current)return;
 const st=state(current);st.visited=!st.visited;
 saveState();refreshDetailActions(st);render();
};
$('save').onclick=()=>{
 if(!current)return;
 const st=state(current), raw=$('visitOrder').value.trim();
 let newOrder=null;
 if(raw!==''){
  const num=Number(raw);
  if(!/^[0-9]+$/.test(raw)||!Number.isInteger(num)||num<1||num>999){
   $('visitError').textContent='訪問順には1〜999の整数を入れてね。';$('visitError').hidden=false;$('visitOrder').focus();return;
  }
  const conflict=all().find(s=>key(s)!==key(current)&&state(s).fav&&visitNumber(s)===num);
  if(conflict){
   $('visitError').textContent=`${num}番は「${conflict.name}」（${conflict.floor}F）で使用中だよ。別の番号にしてね。`;
   $('visitError').hidden=false;$('visitOrder').focus();return;
  }
  newOrder=num;
 }
 if(newOrder!==null) st.fav=true; // Saving an order automatically adds to favorites.
 st.memo=$('memo').value;st.visitOrder=newOrder;
 saveState();render();close();
};
$('visitOrder').oninput=()=>{$('visitError').hidden=true};
$('cancel').onclick=close;$('close').onclick=close;
$('modal').onclick=e=>{if(e.target===$('modal'))close()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
$('officialimg').onerror=()=>{$('officialerror').style.display='block'};change('sat',4,'map');

// File export/import only: static GitHub Pages cannot write private JSON back to GitHub.
function updateBackupStatus(message){$('backupStatus').textContent=message}
$('memoryExport').onclick=()=>{
 const records=JSON.parse(JSON.stringify(saved));
 const data={format:'ishi-fleamarket-memory',version:1,eventId:SHOPS.eventId,exportedAt:new Date().toISOString(),records};
 const json=JSON.stringify(data,null,2);
 const blob=new Blob([json],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=`memory-${SHOPS.eventId}.json`;
 document.body.appendChild(a);a.click();a.remove();
 // Keep object URL available briefly for Safari's download flow.
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 updateBackupStatus('バックアップを書き出したよ。iPhoneの「ファイル」などに保管してね。');
};
$('memoryImport').onclick=()=>{$('memoryFile').click()};
$('memoryFile').onchange=async()=>{
 const file=$('memoryFile').files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data.format!=='ishi-fleamarket-memory'||data.version!==1||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('対応していないバックアップ形式だよ');
  if(data.eventId!==SHOPS.eventId)throw Error('別の開催回のバックアップだよ。開催回が一致するファイルを選んでね。');
  if(!confirm('バックアップを読み込むよ。同じお店の記録はバックアップの内容で上書きしていい？'))return;
  saved={...saved,...data.records};saveState();render();
  updateBackupStatus('記録を読み込んだよ。お気に入りや訪問順を確認してね。');
 }catch(e){alert('読み込みできなかったよ：'+e.message)}
 finally{$('memoryFile').value=''}
};

}
async function bootstrap(){
 const fatal=document.getElementById('fatalError');
 try{
  const [shopResp,mapResp]=await Promise.all([fetch('./shops.json',{cache:'no-cache'}),fetch('./map.json',{cache:'no-cache'})]);
  if(!shopResp.ok||!mapResp.ok)throw Error('JSONファイルを取得できなかったよ。GitHubに5ファイル全部あるか確認してね。');
  const [shops,map]=await Promise.all([shopResp.json(),mapResp.json()]);
  if(!shops.shops||!map.layouts||!map.days)throw Error('店舗またはマップJSONの形式が違うよ。');
  startApp(shops,map);
 }catch(e){
  console.error(e);
  fatal.style.display='block';fatal.textContent='マップを読み込めませんでした。\n'+e.message+'\n\nGitHub PagesのURLから開いてね。iPhoneの「ファイル」アプリから直接開くとJSONを読み込めない場合があります。';
 }
}
bootstrap();
