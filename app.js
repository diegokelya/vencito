const demo=JSON.parse(document.querySelector('#demo-data').textContent);
const recipes=demo.recipes;
const assetBase=new URL('assets/',document.currentScript.src);
const dialog=document.querySelector('#recipe-dialog');
document.querySelectorAll('[data-recipe]').forEach(button=>button.addEventListener('click',()=>{const r=recipes[button.dataset.recipe];document.querySelector('#dialog-title').textContent=r.title;document.querySelector('#dialog-image').src=new URL(`${r.image}.webp`,assetBase).href;document.querySelector('#dialog-image').alt=r.title;document.querySelector('#dialog-meta').textContent=r.meta;document.querySelector('#dialog-kcal').textContent=`≈${r.kcal} kcal ${demo.portion}`;dialog.showModal();}));
dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const lists=demo.lists;
const selected=lists.map(()=>new Set());let current=0;
function updateStatus(){const n=lists[current].length-selected[current].size;document.querySelector('.shopping-status').textContent=n===0?demo.done:`${n} ${demo.pending}`;}
function renderList(){const container=document.querySelector('#shopping-items');container.replaceChildren();lists[current].forEach(([name,amount],i)=>{const label=document.createElement('label'),input=document.createElement('input'),b=document.createElement('b'),span=document.createElement('span');input.type='checkbox';input.checked=selected[current].has(i);b.textContent=name;span.textContent=amount;input.addEventListener('change',()=>{input.checked?selected[current].add(i):selected[current].delete(i);updateStatus();});label.append(input,b,span);container.append(label);});updateStatus();}
document.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{current=Number(button.dataset.day);document.querySelectorAll('[data-day]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderList();}));renderList();

/* Botones de descarga según el dispositivo: en Android el botón del encabezado lleva a Google Play en vez de al App Store. */
(function () {
  try {
    if (!/android/i.test(navigator.userAgent)) return;
    var play = document.querySelector('a.playstore');
    if (!play) return;
    document.querySelectorAll('a.button[href*="apps.apple.com"]').forEach(function (a) {
      a.setAttribute('href', play.getAttribute('href'));
      a.textContent = 'Google Play';
    });
  } catch (e) {}
})();
(function(){var n=document.querySelectorAll('.expiry b[data-days]');if(!n.length)return;var t=new Date();t.setHours(12,0,0,0);n.forEach(function(b){var d=new Date(t);d.setDate(d.getDate()+Number(b.dataset.days));b.textContent=('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2);});})();
