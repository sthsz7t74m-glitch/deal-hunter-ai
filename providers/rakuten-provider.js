window.DealHunterRakutenProvider = window.DealHunterRakutenProvider || {};

(function registerRakutenProvider(namespace) {
  const Providers = window.DealHunterProviders;
  const Sample = window.DealHunterSampleData;
  if (!Providers?.register) throw new Error('Deal provider registry is unavailable');

  const CACHE_KEY = 'deal-hunter:rakuten-feed:v1';
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const FETCH_TIMEOUT = 5500;
  const FEED_URLS = Object.freeze([
    'https://raw.githubusercontent.com/sthsz7t74m-glitch/deal-hunter-ai/deal-data/rakuten-offers.json',
    'https://cdn.jsdelivr.net/gh/sthsz7t74m-glitch/deal-hunter-ai@deal-data/rakuten-offers.json'
  ]);

  const asArray = value => (Array.isArray(value) ? value : []);

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved?.feed || typeof saved.savedAt !== 'number') return null;
      if (Date.now() - saved.savedAt > CACHE_MAX_AGE) return null;
      return saved.feed;
    } catch {
      return null;
    }
  }

  function writeCache(feed) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        feed
      }));
    } catch {
      // The live feed still works even if private browsing blocks storage.
    }
  }

  function validateFeed(payload) {
    if (!payload || payload.provider !== 'rakuten') {
      throw new Error('Rakuten feed format is invalid');
    }
    if (!payload.configured) {
      throw new Error('Rakuten feed is not configured');
    }
    if (!asArray(payload.offers).length) {
      throw new Error('Rakuten feed does not contain offers');
    }
    return payload;
  }

  async function fetchFeedUrl(url, fresh) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const requestUrl = new URL(url);
    requestUrl.searchParams.set(
      'v',
      String(fresh ? Date.now() : Math.floor(Date.now() / (15 * 60 * 1000)))
    );

    try {
      const response = await fetch(requestUrl, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Rakuten feed HTTP ${response.status}`);
      return validateFeed(await response.json());
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Rakuten feed timeout');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFeed({ fresh = false } = {}) {
    return Promise.any(FEED_URLS.map(url => fetchFeedUrl(url, fresh)));
  }

  function sampleOffers(reason = '') {
    const source = Sample?.OFFER_TABLE?.rakuten;
    if (!source || typeof Sample?.createOffers !== 'function') return [];
    return Sample.createOffers(source).map(offer => ({
      ...offer,
      metadata: {
        ...(offer.metadata || {}),
        liveFallback: true,
        fallbackReason: reason
      }
    }));
  }

  let provider;
  provider = Providers.register({
    id: 'rakuten',
    label: '楽天市場',
    mode: 'sample',
    async load(context = {}) {
      try {
        const feed = await fetchFeed(context);
        provider.mode = 'live';
        writeCache(feed);
        return feed.offers.map(offer => ({
          ...offer,
          fetchedAt: offer.fetchedAt || feed.updatedAt,
          metadata: {
            ...(offer.metadata || {}),
            feedUpdatedAt: feed.updatedAt,
            feedSource: 'deal-data'
          }
        }));
      } catch (networkError) {
        const cached = readCache();
        if (cached && asArray(cached.offers).length) {
          provider.mode = 'cached';
          return cached.offers.map(offer => ({
            ...offer,
            metadata: {
              ...(offer.metadata || {}),
              cachedFeed: true,
              fallbackReason: networkError.message
            }
          }));
        }

        provider.mode = 'sample';
        return sampleOffers(networkError.message);
      }
    }
  });

  Object.assign(namespace, {
    provider,
    CACHE_KEY,
    CACHE_MAX_AGE,
    FEED_URLS,
    fetchFeed,
    readCache,
    writeCache
  });
})(window.DealHunterRakutenProvider);
