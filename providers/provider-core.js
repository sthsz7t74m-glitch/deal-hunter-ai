window.DealHunterProviders = window.DealHunterProviders || {};

(function initializeProviderCore(namespace) {
  const asArray = value => (Array.isArray(value) ? value : []);
  const text = value => String(value ?? '').trim();
  const positiveNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const productKeyFrom = offer => text(
    offer.productKey
      || offer.jan
      || offer.model
      || offer.sku
      || offer.productId
      || offer.name
  ).toLowerCase();

  function normalizeOffer(offer, provider) {
    const productKey = productKeyFrom(offer);
    const price = positiveNumber(offer.price);
    if (!productKey || !price) return null;

    return Object.freeze({
      providerId: provider.id,
      providerLabel: provider.label,
      providerMode: provider.mode,
      referenceOnly: Boolean(offer.referenceOnly ?? provider.referenceOnly),
      offerId: text(offer.offerId || `${provider.id}:${productKey}`),
      productKey,
      productId: offer.productId ?? productKey,
      jan: text(offer.jan),
      model: text(offer.model),
      sku: text(offer.sku),
      name: text(offer.name || productKey),
      category: text(offer.category || 'その他'),
      icon: text(offer.icon || '🛍️'),
      store: text(offer.store || provider.label),
      price,
      shipping: Math.max(0, Number(offer.shipping) || 0),
      points: Math.max(0, Number(offer.points) || 0),
      effectivePrice: Math.max(1, price + (Number(offer.shipping) || 0) - (Number(offer.points) || 0)),
      url: text(offer.url),
      image: text(offer.image),
      historyAverage: positiveNumber(offer.historyAverage),
      historyLow: positiveNumber(offer.historyLow),
      historyDays: Math.max(0, Number(offer.historyDays) || 0),
      fetchedAt: offer.fetchedAt || new Date().toISOString(),
      metadata: Object.freeze({ ...(offer.metadata || {}) })
    });
  }

  class DealProvider {
    constructor({
      id,
      label,
      mode = 'sample',
      enabled = true,
      referenceOnly = false,
      load
    }) {
      this.id = text(id);
      this.label = text(label || id);
      this.mode = text(mode || 'sample');
      this.enabled = enabled !== false;
      this.referenceOnly = Boolean(referenceOnly);
      this.loader = load;

      if (!this.id) throw new Error('Provider id is required');
      if (typeof this.loader !== 'function') throw new Error(`Provider ${this.id} requires a load function`);
    }

    async load(context = {}) {
      if (!this.enabled) return [];
      const offers = await this.loader(context);
      return asArray(offers)
        .map(offer => normalizeOffer(offer, this))
        .filter(Boolean);
    }
  }

  class ProviderRegistry {
    constructor() {
      this.providers = new Map();
    }

    register(provider, { replace = true } = {}) {
      const instance = provider instanceof DealProvider ? provider : new DealProvider(provider);
      if (!replace && this.providers.has(instance.id)) return this.providers.get(instance.id);
      this.providers.set(instance.id, instance);
      return instance;
    }

    get(id) {
      return this.providers.get(text(id)) || null;
    }

    list({ enabledOnly = false } = {}) {
      const providers = [...this.providers.values()];
      return enabledOnly ? providers.filter(provider => provider.enabled) : providers;
    }

    async loadAll(context = {}) {
      const providers = this.list({ enabledOnly: true });
      const settled = await Promise.allSettled(
        providers.map(provider => provider.load(context))
      );

      const offers = [];
      const statuses = settled.map((result, index) => {
        const provider = providers[index];
        if (result.status === 'fulfilled') {
          offers.push(...result.value);
          return Object.freeze({
            id: provider.id,
            label: provider.label,
            mode: provider.mode,
            referenceOnly: provider.referenceOnly,
            status: 'ready',
            count: result.value.length,
            error: ''
          });
        }

        return Object.freeze({
          id: provider.id,
          label: provider.label,
          mode: provider.mode,
          referenceOnly: provider.referenceOnly,
          status: 'error',
          count: 0,
          error: result.reason?.message || String(result.reason || 'Provider error')
        });
      });

      return Object.freeze({
        offers: Object.freeze(offers),
        statuses: Object.freeze(statuses),
        loadedAt: new Date().toISOString()
      });
    }
  }

  const registry = new ProviderRegistry();

  Object.assign(namespace, {
    DealProvider,
    ProviderRegistry,
    registry,
    normalizeOffer,
    productKeyFrom,
    register: (...args) => registry.register(...args),
    get: id => registry.get(id),
    list: options => registry.list(options),
    loadAll: context => registry.loadAll(context)
  });
})(window.DealHunterProviders);
