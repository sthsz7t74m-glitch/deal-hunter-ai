const deals = [
  {id:1,name:'Nintendo Switch 2 Proコントローラー',category:'ゲーム',icon:'🎮',store:'Amazon',price:5980,market:7980,score:96,discount:25,history:18,stores:[['Amazon',5980],['Yahoo!',7480],['楽天市場',7980],['価格.com相場',7650]]},
  {id:2,name:'SONY ワイヤレスイヤホン WF-1000XM5',category:'家電',icon:'🎧',store:'楽天市場',price:25800,market:33400,score:94,discount:23,history:17,stores:[['楽天市場',25800],['Amazon',29980],['Yahoo!',30800],['価格.com相場',30240]]},
  {id:3,name:'Samsung microSD 512GB',category:'家電',icon:'💾',store:'Yahoo!',price:4280,market:6290,score:91,discount:32,history:21,stores:[['Yahoo!',4280],['Amazon',5180],['楽天市場',5480],['価格.com相場',5290]]},
  {id:4,name:'ポケットモンスター フィギュアセット',category:'ホビー',icon:'🧸',store:'楽天市場',price:3680,market:5280,score:89,discount:30,history:26,stores:[['楽天市場',3680],['Yahoo!',4590],['Amazon',4980],['価格.com相場',4720]]},
  {id:5,name:'Anker 10000mAh モバイルバッテリー',category:'家電',icon:'🔋',store:'Amazon',price:3990,market:5490,score:87,discount:27,history:13,stores:[['Amazon',3990],['楽天市場',4680],['Yahoo!',4780],['価格.com相場',4590]]},
  {id:6,name:'PlayStation 5 ゲームソフト 新作',category:'ゲーム',icon:'🕹️',store:'Yahoo!',price:5980,market:7920,score:84,discount:24,history:15,stores:[['Yahoo!',5980],['Amazon',6980],['楽天市場',7180],['価格.com相場',6820]]}
];

let currentFilter = 'all';
let favorites = new Set(JSON.parse(localStorage.getItem('dealHunterFavorites') || '[]'));
const list = document.querySelector('#dealList');
const sortSelect = document.querySelector('#sortSelect');
const dialog = document.querySelector('#detailDialog');
const detailContent = document.querySelector('#detailContent');
const yen = value => new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(value);

function render(){
  let items = currentFilter === 'all' ? [...deals] : deals.filter(d=>d.category===currentFilter);
  const sort = sortSelect.value;
  items.sort((a,b)=> sort==='price' ? a.price-b.price : sort==='discount' ? b.discount-a.discount : b.score-a.score);
  list.innerHTML = items.length ? items.map(card).join('') : '<div class="empty">該当する商品はありません</div>';
  list.querySelectorAll('.deal-card').forEach(el=>el.addEventListener('click',()=>openDetail(Number(el.dataset.id))));
}

function card(d){
  return `<article class="deal-card" data-id="${d.id}">
    <div class="product-icon">${d.icon}</div>
    <div>
      <div class="store">${d.store}・${d.category}</div>
      <h3 class="product-name">${d.name}</h3>
      <div class="price-row"><span class="price">${yen(d.price)}</span><span class="market">${yen(d.market)}</span><span class="discount">▼${d.discount}%</span></div>
    </div>
    <div class="score">${d.score}<small>AI</small></div>
  </article>`;
}

function openDetail(id){
  const d = deals.find(x=>x.id===id);
  const isFavorite = favorites.has(id);
  detailContent.innerHTML = `<div class="detail-hero">
      <div class="detail-icon">${d.icon}</div>
      <div><div class="detail-score">AI SCORE ${d.score}</div><h2>${d.name}</h2><p>${d.category}</p></div>
    </div>
    <div class="comparison">${d.stores.map((s,i)=>`<div class="comparison-row ${i===0?'best':''}"><span>${s[0]}${i===0?'（最安）':''}</span><strong>${yen(s[1])}</strong></div>`).join('')}</div>
    <div class="ai-note"><strong>AI判定：今が買い時</strong><br>他サイト相場より${d.discount}%安く、過去30日平均より${d.history}%安い価格です。</div>
    <button id="favoriteButton" class="chip active" style="width:100%;margin-top:16px">${isFavorite?'♥ お気に入り解除':'♡ お気に入りに追加'}</button>`;
  dialog.showModal();
  document.querySelector('#favoriteButton').onclick=()=>{isFavorite?favorites.delete(id):favorites.add(id);localStorage.setItem('dealHunterFavorites',JSON.stringify([...favorites]));dialog.close()};
}

document.querySelectorAll('.chip[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.chip[data-filter]').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');currentFilter=btn.dataset.filter;render();
}));
sortSelect.addEventListener('change',render);
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());

document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const view=btn.dataset.view;
  if(view==='favorite'){
    const saved=deals.filter(d=>favorites.has(d.id));
    list.innerHTML=saved.length?saved.map(card).join(''):'<div class="empty">お気に入りはまだありません。<br>商品をタップして追加できます。</div>';
    list.querySelectorAll('.deal-card').forEach(el=>el.addEventListener('click',()=>openDetail(Number(el.dataset.id))));
  } else if(view==='search'){
    const q=prompt('商品名・型番を入力してください');
    if(q!==null){const found=deals.filter(d=>d.name.toLowerCase().includes(q.toLowerCase()));list.innerHTML=found.length?found.map(card).join(''):'<div class="empty">検索結果がありません</div>';list.querySelectorAll('.deal-card').forEach(el=>el.addEventListener('click',()=>openDetail(Number(el.dataset.id))))}
  } else {render()}
}));

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
