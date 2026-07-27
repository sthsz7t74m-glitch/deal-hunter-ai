window.DealHunterSampleData = window.DealHunterSampleData || {};

(function registerSampleProviders(namespace) {
  const Providers = window.DealHunterProviders;
  if (!Providers?.register) throw new Error('Deal provider registry is unavailable');

  const PRODUCTS = Object.freeze({
    'switch-2-pro-controller': {
      productId: 1,
      name: 'Nintendo Switch 2 Proコントローラー',
      model: 'BEE-A-FSSKA',
      category: 'ゲーム',
      icon: '🎮',
      historyAverage: 7350,
      historyLow: 6180,
      historyDays: 30
    },
    'sony-wf-1000xm5': {
      productId: 2,
      name: 'SONY ワイヤレスイヤホン WF-1000XM5',
      model: 'WF-1000XM5',
      category: '家電',
      icon: '🎧',
      historyAverage: 31100,
      historyLow: 26980,
      historyDays: 45
    },
    'samsung-microsd-512gb': {
      productId: 3,
      name: 'Samsung microSD 512GB',
      model: 'MB-MC512KA',
      category: '家電',
      icon: '💾',
      historyAverage: 5600,
      historyLow: 4480,
      historyDays: 60
    },
    'pokemon-figure-set': {
      productId: 4,
      name: 'ポケットモンスター フィギュアセット',
      model: 'PKM-FIG-SET',
      category: 'ホビー',
      icon: '🧸',
      historyAverage: 4980,
      historyLow: 3890,
      historyDays: 30
    },
    'anker-powercore-10000': {
      productId: 5,
      name: 'Anker 10000mAh モバイルバッテリー',
      model: 'A1259',
      category: '家電',
      icon: '🔋',
      historyAverage: 4750,
      historyLow: 3980,
      historyDays: 30
    },
    'ps5-new-game': {
      productId: 6,
      name: 'PlayStation 5 ゲームソフト 新作',
      model: 'PS5-GAME-NEW',
      category: 'ゲーム',
      icon: '🕹️',
      historyAverage: 7080,
      historyLow: 6280,
      historyDays: 30
    }
  });

  const OFFER_TABLE = Object.freeze({
    amazon: {
      label: 'Amazon',
      offers: {
        'switch-2-pro-controller': { price: 5980 },
        'sony-wf-1000xm5': { price: 29980 },
        'samsung-microsd-512gb': { price: 5180 },
        'pokemon-figure-set': { price: 4980 },
        'anker-powercore-10000': { price: 3990 },
        'ps5-new-game': { price: 6980 }
      }
    },
    rakuten: {
      label: '楽天市場',
      offers: {
        'switch-2-pro-controller': { price: 7980, points: 320 },
        'sony-wf-1000xm5': { price: 25800, points: 520 },
        'samsung-microsd-512gb': { price: 5480, points: 110 },
        'pokemon-figure-set': { price: 3680, points: 75 },
        'anker-powercore-10000': { price: 4680, points: 94 },
        'ps5-new-game': { price: 7180, points: 145 }
      }
    },
    yahoo: {
      label: 'Yahoo!',
      offers: {
        'switch-2-pro-controller': { price: 7480, points: 150 },
        'sony-wf-1000xm5': { price: 30800, points: 620 },
        'samsung-microsd-512gb': { price: 4280, points: 86 },
        'pokemon-figure-set': { price: 4590, points: 92 },
        'anker-powercore-10000': { price: 4780, points: 96 },
        'ps5-new-game': { price: 5980, points: 120 }
      }
    },
    kakaku: {
      label: '価格.com相場',
      referenceOnly: true,
      offers: {
        'switch-2-pro-controller': { price: 7650 },
        'sony-wf-1000xm5': { price: 30240 },
        'samsung-microsd-512gb': { price: 5290 },
        'pokemon-figure-set': { price: 4720 },
        'anker-powercore-10000': { price: 4590 },
        'ps5-new-game': { price: 6820 }
      }
    }
  });

  const createOffers = provider => Object.entries(provider.offers).map(([productKey, offer]) => ({
    productKey,
    ...PRODUCTS[productKey],
    ...offer,
    store: provider.label,
    offerId: `${provider.label}:${productKey}`,
    url: '',
    metadata: {
      sample: true,
      stickerPrice: offer.price,
      effectivePrice: offer.price + (offer.shipping || 0) - (offer.points || 0)
    }
  }));

  Object.entries(OFFER_TABLE).forEach(([id, provider]) => {
    Providers.register({
      id,
      label: provider.label,
      mode: 'sample',
      referenceOnly: provider.referenceOnly,
      async load() {
        return createOffers(provider);
      }
    });
  });

  Object.assign(namespace, {
    PRODUCTS,
    OFFER_TABLE,
    createOffers
  });
})(window.DealHunterSampleData);
