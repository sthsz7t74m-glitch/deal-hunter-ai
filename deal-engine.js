window.DealHunterEngine = window.DealHunterEngine || {};

(function initializeDealHunterEngine(namespace) {
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
  const round = (value, digits = 1) => {
    const factor = 10 ** digits;
    return Math.round((Number(value) || 0) * factor) / factor;
  };

  const median = values => {
    const sorted = values
      .map(Number)
      .filter(Number.isFinite)
      .filter(value => value > 0)
      .sort((left, right) => left - right);

    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  const percentBelow = (reference, current) => {
    if (!Number.isFinite(reference) || reference <= 0) return 0;
    return ((reference - current) / reference) * 100;
  };

  const gradeFor = score => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  function evaluate(product) {
    const currentPrice = Number(product.price) || 0;
    const stores = Array.isArray(product.stores) ? product.stores : [];
    const comparisonPrices = stores
      .filter(([store]) => String(store) !== String(product.store))
      .map(([, price]) => Number(price));

    const marketMedian = median(comparisonPrices) || Number(product.market) || currentPrice;
    const historyAverage = Number(product.historyAverage) || marketMedian;
    const historyLow = Number(product.historyLow) || currentPrice;
    const historyDays = Math.max(0, Number(product.historyDays) || 0);
    const sourceCount = new Set(stores.map(([store]) => String(store))).size;

    const crossMarketDiscount = percentBelow(marketMedian, currentPrice);
    const historicalDiscount = percentBelow(historyAverage, currentPrice);
    const historicalLowGap = percentBelow(historyLow, currentPrice);

    const coverageBonus = Math.min(sourceCount, 4) * 2.5;
    const lowPriceBonus = Math.max(0, historicalLowGap) * 0.8;
    const rawScore = crossMarketDiscount * 2.1
      + historicalDiscount * 1.5
      + lowPriceBonus
      + coverageBonus;
    const score = Math.round(clamp(rawScore));
    const confidence = Math.round(clamp(
      42 + sourceCount * 9 + Math.min(historyDays, 60) * 0.45,
      0,
      99
    ));

    const reasons = [];
    if (crossMarketDiscount > 0) {
      reasons.push(`他サイト中央値より${Math.round(crossMarketDiscount)}%安い`);
    }
    if (historicalDiscount > 0) {
      reasons.push(`過去${historyDays || 30}日平均より${Math.round(historicalDiscount)}%安い`);
    }
    if (historicalLowGap > 0) {
      reasons.push(`過去最安値を${Math.round(historicalLowGap)}%更新`);
    } else if (Math.abs(historicalLowGap) <= 3) {
      reasons.push('過去最安値に近い価格');
    }
    if (!reasons.length) reasons.push('相場との差はまだ小さめ');

    return Object.freeze({
      ...product,
      currentPrice,
      marketMedian: Math.round(marketMedian),
      historyAverage: Math.round(historyAverage),
      historyLow: Math.round(historyLow),
      sourceCount,
      crossMarketDiscount: round(crossMarketDiscount),
      historicalDiscount: round(historicalDiscount),
      historicalLowGap: round(historicalLowGap),
      score,
      grade: gradeFor(score),
      confidence,
      isDeal: score >= 65 && crossMarketDiscount >= 10,
      reasons
    });
  }

  const evaluateAll = products => (Array.isArray(products) ? products : []).map(evaluate);

  Object.assign(namespace, {
    clamp,
    round,
    median,
    percentBelow,
    gradeFor,
    evaluate,
    evaluateAll
  });
})(window.DealHunterEngine);
