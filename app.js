const Catalog = window.DealHunterCatalog;

const yen = value => new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

class DealHunterApp {
  constructor(root = document) {
    this.root = root;
    this.state = {
      deals: [],
      providerStatuses: [],
      currentFilter: 'all',
      currentView: 'home',
      favorites: new Set(
        JSON.parse(localStorage.getItem('dealHunterFavorites') || '[]').map(String)
      ),
      loading: false,
      loadedAt: ''
    };

    this.nodes = {
      list: root.querySelector('#dealList'),
      sort: root.querySelector('#sortSelect'),
      dialog: root.querySelector('#detailDialog'),
      detail: root.querySelector('#detailContent'),
      dealCount: root.querySelector('#dealCount'),
      providerSummary: root.querySelector('#providerSummary'),
      providerStatuses: root.querySelector('#providerStatuses'),
      providerReload: root.querySelector('#providerReload')
    };
  }

  saveFavorites() {
    localStorage.setItem('dealHunterFavorites', JSON.stringify([...this.state.favorites]));
  }

  setLoading(loading) {
    this.state.loading = loading;
    if (this.nodes.providerReload) this.nodes.providerReload.disabled = loading;
    if (loading && !this.state.deals.length) {
      this.nodes.list.innerHTML = '<div class="loading-state"><span></span><strong>ショップ別データを統合しています…</strong></div>';
    }
  }

  sortDeals(items) {
    const result = [...items];
    const sort = this.nodes.sort.value;
    result.sort((left, right) => {
      if (sort === 'price') return left.currentPrice - right.currentPrice;
      if (sort === 'discount') return right.crossMarketDiscount - left.crossMarketDiscount;
      return right.score - left.score || right.confidence - left.confidence;
    });
    return result;
  }

  visibleDeals() {
    let items = this.state.currentFilter === 'all'
      ? [...this.state.deals]
      : this.state.deals.filter(deal => deal.category === this.state.currentFilter);

    if (this.state.currentView === 'favorite') {
      items = items.filter(deal => this.state.favorites.has(String(deal.id)));
    }

    return this.sortDeals(items);
  }

  renderProviderStatus() {
    const statuses = this.state.providerStatuses;
    const ready = statuses.filter(status => status.status === 'ready').length;
    const offers = statuses.reduce((sum, status) => sum + status.count, 0);

    if (this.nodes.providerSummary) {
      this.nodes.providerSummary.textContent = this.state.loading
        ? 'データソースを読み込み中'
        : `${ready}/${statuses.length}ソース接続・${offers}価格を比較`;
    }

    if (this.nodes.providerStatuses) {
      this.nodes.providerStatuses.innerHTML = statuses.length
        ? statuses.map(status => `<span class="provider-chip ${status.status}">
            <i aria-hidden="true"></i>${escapeHtml(status.label)}
            <small>${status.mode === 'sample' ? 'サンプル' : status.count + '件'}</small>
          </span>`).join('')
        : '<span class="provider-chip loading"><i></i>接続準備中</span>';
    }
  }

  renderMetrics() {
    if (this.nodes.dealCount) {
      this.nodes.dealCount.textContent = this.state.deals.filter(deal => deal.isDeal).length;
    }
  }

  renderItems(items, emptyMessage = '該当する商品はありません') {
    this.nodes.list.innerHTML = items.length
      ? items.map(deal => this.card(deal)).join('')
      : `<div class="empty">${emptyMessage}</div>`;

    this.nodes.list.querySelectorAll('.deal-card').forEach(element => {
      element.addEventListener('click', () => this.openDetail(element.dataset.id));
    });
  }

  render() {
    this.renderMetrics();
    this.renderProviderStatus();
    this.renderItems(
      this.visibleDeals(),
      this.state.currentView === 'favorite'
        ? 'お気に入りはまだありません。<br>商品をタップして追加できます。'
        : '該当する商品はありません'
    );
  }

  card(deal) {
    const hasBenefits = deal.points > 0 || deal.shipping > 0;
    const effectiveLabel = hasBenefits ? '実質' : '';

    return `<article class="deal-card" data-id="${escapeHtml(deal.id)}">
      <div class="product-icon">${deal.icon}</div>
      <div>
        <div class="store">${escapeHtml(deal.store)}・${escapeHtml(deal.category)}</div>
        <h3 class="product-name">${escapeHtml(deal.name)}</h3>
        <div class="price-row">
          <span class="price">${effectiveLabel}${yen(deal.currentPrice)}</span>
          <span class="market">中央値 ${yen(deal.marketMedian)}</span>
          <span class="discount">▼${Math.round(deal.crossMarketDiscount)}%</span>
        </div>
        <div class="source-count">${deal.sourceCount}サイト比較・判定精度 ${deal.confidence}%</div>
      </div>
      <div class="score">${deal.score}<small>${deal.grade}判定</small></div>
    </article>`;
  }

  offerRow(offer, index) {
    const benefits = [];
    if (offer.shipping) benefits.push(`送料 ${yen(offer.shipping)}`);
    if (offer.points) benefits.push(`${yen(offer.points)}相当還元`);
    const priceLabel = offer.effectivePrice !== offer.price
      ? `<small>${yen(offer.price)}${benefits.length ? `・${benefits.join('・')}` : ''}</small>`
      : '';

    return `<div class="comparison-row ${index === 0 ? 'best' : ''}">
      <span>${escapeHtml(offer.store)}${index === 0 ? '（実質最安）' : ''}${priceLabel}</span>
      <strong>${yen(offer.effectivePrice)}</strong>
    </div>`;
  }

  openDetail(id) {
    const deal = this.state.deals.find(item => String(item.id) === String(id));
    if (!deal) return;

    const favorite = this.state.favorites.has(String(deal.id));
    const reasons = deal.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('');

    this.nodes.detail.innerHTML = `<div class="detail-hero">
        <div class="detail-icon">${deal.icon}</div>
        <div>
          <div class="detail-score">DEAL SCORE ${deal.score}・${deal.grade}判定</div>
          <h2>${escapeHtml(deal.name)}</h2>
          <p>${escapeHtml(deal.model || deal.category)}・判定精度 ${deal.confidence}%</p>
        </div>
      </div>
      <div class="comparison">
        ${deal.offers.map((offer, index) => this.offerRow(offer, index)).join('')}
      </div>
      <div class="ai-note">
        <strong>${deal.isDeal ? '判定：有力な買い時' : '判定：価格をもう少し監視'}</strong>
        <ul>${reasons}</ul>
        <small>他サイト中央値 ${yen(deal.marketMedian)} ／ 過去${deal.historyDays}日平均 ${yen(deal.historyAverage)} ／ 過去最安 ${yen(deal.historyLow)}</small>
      </div>
      <button id="favoriteButton" class="chip active" style="width:100%;margin-top:16px">
        ${favorite ? '♥ お気に入り解除' : '♡ お気に入りに追加'}
      </button>`;

    this.nodes.dialog.showModal();
    this.root.querySelector('#favoriteButton').onclick = () => {
      const key = String(deal.id);
      if (favorite) this.state.favorites.delete(key);
      else this.state.favorites.add(key);
      this.saveFavorites();
      this.nodes.dialog.close();
      this.render();
    };
  }

  async loadCatalog({ fresh = false } = {}) {
    this.setLoading(true);
    this.renderProviderStatus();

    try {
      const result = await Catalog.load({ fresh });
      this.state.deals = [...result.products];
      this.state.providerStatuses = [...result.statuses];
      this.state.loadedAt = result.loadedAt;
      this.render();
    } catch (error) {
      console.error('Deal catalog could not be loaded:', error);
      this.state.providerStatuses = [];
      this.nodes.list.innerHTML = '<div class="empty">価格データを読み込めませんでした。<br>再読込をお試しください。</div>';
      if (this.nodes.providerSummary) this.nodes.providerSummary.textContent = 'データ取得エラー';
    } finally {
      this.setLoading(false);
      this.renderProviderStatus();
    }
  }

  bindFilters() {
    this.root.querySelectorAll('.chip[data-filter]').forEach(button => {
      button.addEventListener('click', () => {
        this.root.querySelectorAll('.chip[data-filter]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        this.state.currentFilter = button.dataset.filter;
        this.render();
      });
    });

    this.nodes.sort.addEventListener('change', () => this.render());
    this.root.querySelector('.dialog-close').addEventListener('click', () => this.nodes.dialog.close());
    this.nodes.providerReload?.addEventListener('click', () => this.loadCatalog({ fresh: true }));
  }

  bindNavigation() {
    this.root.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        this.root.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        this.state.currentView = button.dataset.view;

        if (this.state.currentView === 'search') {
          const query = prompt('商品名・型番を入力してください');
          if (query === null) {
            this.state.currentView = 'home';
            this.render();
            return;
          }
          const needle = query.trim().toLowerCase();
          const found = this.sortDeals(this.state.deals.filter(deal =>
            [deal.name, deal.model, deal.jan]
              .filter(Boolean)
              .some(value => String(value).toLowerCase().includes(needle))
          ));
          this.renderItems(found, '検索結果がありません');
          return;
        }

        this.render();
      });
    });
  }

  start() {
    this.bindFilters();
    this.bindNavigation();
    this.renderProviderStatus();
    this.loadCatalog();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    return this;
  }
}

window.DealHunterApp = new DealHunterApp().start();
