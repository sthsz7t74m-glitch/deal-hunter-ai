const rawDeals = [
  {
    id: 1,
    name: 'Nintendo Switch 2 Proコントローラー',
    category: 'ゲーム',
    icon: '🎮',
    store: 'Amazon',
    price: 5980,
    historyAverage: 7350,
    historyLow: 6180,
    historyDays: 30,
    stores: [['Amazon', 5980], ['Yahoo!', 7480], ['楽天市場', 7980], ['価格.com相場', 7650]]
  },
  {
    id: 2,
    name: 'SONY ワイヤレスイヤホン WF-1000XM5',
    category: '家電',
    icon: '🎧',
    store: '楽天市場',
    price: 25800,
    historyAverage: 31100,
    historyLow: 26980,
    historyDays: 45,
    stores: [['楽天市場', 25800], ['Amazon', 29980], ['Yahoo!', 30800], ['価格.com相場', 30240]]
  },
  {
    id: 3,
    name: 'Samsung microSD 512GB',
    category: '家電',
    icon: '💾',
    store: 'Yahoo!',
    price: 4280,
    historyAverage: 5600,
    historyLow: 4480,
    historyDays: 60,
    stores: [['Yahoo!', 4280], ['Amazon', 5180], ['楽天市場', 5480], ['価格.com相場', 5290]]
  },
  {
    id: 4,
    name: 'ポケットモンスター フィギュアセット',
    category: 'ホビー',
    icon: '🧸',
    store: '楽天市場',
    price: 3680,
    historyAverage: 4980,
    historyLow: 3890,
    historyDays: 30,
    stores: [['楽天市場', 3680], ['Yahoo!', 4590], ['Amazon', 4980], ['価格.com相場', 4720]]
  },
  {
    id: 5,
    name: 'Anker 10000mAh モバイルバッテリー',
    category: '家電',
    icon: '🔋',
    store: 'Amazon',
    price: 3990,
    historyAverage: 4750,
    historyLow: 3980,
    historyDays: 30,
    stores: [['Amazon', 3990], ['楽天市場', 4680], ['Yahoo!', 4780], ['価格.com相場', 4590]]
  },
  {
    id: 6,
    name: 'PlayStation 5 ゲームソフト 新作',
    category: 'ゲーム',
    icon: '🕹️',
    store: 'Yahoo!',
    price: 5980,
    historyAverage: 7080,
    historyLow: 6280,
    historyDays: 30,
    stores: [['Yahoo!', 5980], ['Amazon', 6980], ['楽天市場', 7180], ['価格.com相場', 6820]]
  }
];

const deals = window.DealHunterEngine.evaluateAll(rawDeals);
let currentFilter = 'all';
let currentView = 'home';
let favorites = new Set(JSON.parse(localStorage.getItem('dealHunterFavorites') || '[]'));

const list = document.querySelector('#dealList');
const sortSelect = document.querySelector('#sortSelect');
const dialog = document.querySelector('#detailDialog');
const detailContent = document.querySelector('#detailContent');
const dealCount = document.querySelector('#dealCount');

const yen = value => new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0
}).format(value);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

function sorted(items) {
  const result = [...items];
  const sort = sortSelect.value;
  result.sort((left, right) => {
    if (sort === 'price') return left.currentPrice - right.currentPrice;
    if (sort === 'discount') return right.crossMarketDiscount - left.crossMarketDiscount;
    return right.score - left.score;
  });
  return result;
}

function visibleDeals() {
  let items = currentFilter === 'all'
    ? [...deals]
    : deals.filter(deal => deal.category === currentFilter);

  if (currentView === 'favorite') {
    items = items.filter(deal => favorites.has(deal.id));
  }

  return sorted(items);
}

function renderItems(items, emptyMessage = '該当する商品はありません') {
  list.innerHTML = items.length
    ? items.map(card).join('')
    : `<div class="empty">${emptyMessage}</div>`;

  list.querySelectorAll('.deal-card').forEach(element => {
    element.addEventListener('click', () => openDetail(Number(element.dataset.id)));
  });
}

function render() {
  renderItems(
    visibleDeals(),
    currentView === 'favorite'
      ? 'お気に入りはまだありません。<br>商品をタップして追加できます。'
      : '該当する商品はありません'
  );
}

function card(deal) {
  return `<article class="deal-card" data-id="${deal.id}">
    <div class="product-icon">${deal.icon}</div>
    <div>
      <div class="store">${escapeHtml(deal.store)}・${escapeHtml(deal.category)}</div>
      <h3 class="product-name">${escapeHtml(deal.name)}</h3>
      <div class="price-row">
        <span class="price">${yen(deal.currentPrice)}</span>
        <span class="market">中央値 ${yen(deal.marketMedian)}</span>
        <span class="discount">▼${Math.round(deal.crossMarketDiscount)}%</span>
      </div>
    </div>
    <div class="score">${deal.score}<small>${deal.grade}判定</small></div>
  </article>`;
}

function openDetail(id) {
  const deal = deals.find(item => item.id === id);
  if (!deal) return;

  const isFavorite = favorites.has(id);
  const stores = [...deal.stores].sort((left, right) => left[1] - right[1]);
  const reasons = deal.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('');

  detailContent.innerHTML = `<div class="detail-hero">
      <div class="detail-icon">${deal.icon}</div>
      <div>
        <div class="detail-score">DEAL SCORE ${deal.score}・${deal.grade}判定</div>
        <h2>${escapeHtml(deal.name)}</h2>
        <p>${escapeHtml(deal.category)}・判定精度 ${deal.confidence}%</p>
      </div>
    </div>
    <div class="comparison">
      ${stores.map(([store, price], index) => `<div class="comparison-row ${index === 0 ? 'best' : ''}">
        <span>${escapeHtml(store)}${index === 0 ? '（最安）' : ''}</span>
        <strong>${yen(price)}</strong>
      </div>`).join('')}
    </div>
    <div class="ai-note">
      <strong>${deal.isDeal ? '判定：有力な買い時' : '判定：価格をもう少し監視'}</strong>
      <ul>${reasons}</ul>
      <small>他サイト中央値 ${yen(deal.marketMedian)} ／ 過去${deal.historyDays}日平均 ${yen(deal.historyAverage)} ／ 過去最安 ${yen(deal.historyLow)}</small>
    </div>
    <button id="favoriteButton" class="chip active" style="width:100%;margin-top:16px">
      ${isFavorite ? '♥ お気に入り解除' : '♡ お気に入りに追加'}
    </button>`;

  dialog.showModal();
  document.querySelector('#favoriteButton').onclick = () => {
    if (isFavorite) favorites.delete(id);
    else favorites.add(id);
    localStorage.setItem('dealHunterFavorites', JSON.stringify([...favorites]));
    dialog.close();
    render();
  };
}

document.querySelectorAll('.chip[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-filter]').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    render();
  });
});

sortSelect.addEventListener('change', render);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    currentView = button.dataset.view;

    if (currentView === 'search') {
      const query = prompt('商品名・型番を入力してください');
      if (query === null) {
        currentView = 'home';
        render();
        return;
      }
      const needle = query.trim().toLowerCase();
      const found = sorted(deals.filter(deal => deal.name.toLowerCase().includes(needle)));
      renderItems(found, '検索結果がありません');
      return;
    }

    render();
  });
});

dealCount.textContent = deals.filter(deal => deal.isDeal).length;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
