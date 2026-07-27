window.DealHunterCatalog = window.DealHunterCatalog || {};

(function initializeDealCatalog(namespace) {
  const Providers = window.DealHunterProviders;
  const Engine = window.DealHunterEngine;

  const asArray = value => (Array.isArray(value) ? value : []);
  const firstPositive = values => values.map(Number).find(value => Number.isFinite(value) && value > 0) || 0;

  const compareOffers = (left, right) =>
    left.effectivePrice - right.effectivePrice
    || left.price - right.price
    || left.store.localeCompare(right.store, 'ja');

  const groupOffers = offers => {
    const groups = new Map();
    asArray(offers).forEach(offer => {
      if (!groups.has(offer.productKey)) groups.set(offer.productKey, []);
      groups.get(offer.productKey).push(offer);
    });
    return groups;
  };

  function productFromOffers(productKey, offers) {
    const sortedOffers = [...offers].sort(compareOffers);
    const best = sortedOffers[0];
    const historyAverage = firstPositive(sortedOffers.map(offer => offer.historyAverage));
    const historyLow = firstPositive(sortedOffers.map(offer => offer.historyLow));
    const historyDays = Math.max(...sortedOffers.map(offer => Number(offer.historyDays) || 0), 0);

    return Engine.evaluate({
      id: best.productId,
      productKey,
      jan: best.jan,
      model: best.model,
      name: best.name,
      category: best.category,
      icon: best.icon,
      store: best.store,
      price: best.effectivePrice,
      stickerPrice: best.price,
      shipping: best.shipping,
      points: best.points,
      historyAverage,
      historyLow,
      historyDays,
      stores: sortedOffers.map(offer => [offer.store, offer.effectivePrice]),
      offers: sortedOffers,
      sourceModes: [...new Set(sortedOffers.map(offer => offer.providerMode))],
      fetchedAt: sortedOffers
        .map(offer => offer.fetchedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || new Date().toISOString()
    });
  }

  class DealCatalogService {
    constructor({ registry = Providers?.registry, engine = Engine } = {}) {
      if (!registry) throw new Error('Provider registry is unavailable');
      if (!engine?.evaluate) throw new Error('Deal scoring engine is unavailable');
      this.registry = registry;
      this.engine = engine;
    }

    async load(context = {}) {
      const result = await this.registry.loadAll(context);
      const products = [...groupOffers(result.offers).entries()]
        .map(([productKey, offers]) => productFromOffers(productKey, offers))
        .sort((left, right) => right.score - left.score || left.currentPrice - right.currentPrice);

      return Object.freeze({
        products: Object.freeze(products),
        offers: result.offers,
        statuses: result.statuses,
        loadedAt: result.loadedAt,
        providerCount: result.statuses.length,
        readyProviderCount: result.statuses.filter(status => status.status === 'ready').length,
        failedProviderCount: result.statuses.filter(status => status.status === 'error').length
      });
    }
  }

  const service = new DealCatalogService();

  Object.assign(namespace, {
    DealCatalogService,
    service,
    groupOffers,
    productFromOffers,
    load: context => service.load(context)
  });
})(window.DealHunterCatalog);
