import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const applicationId = process.env.RAKUTEN_APPLICATION_ID || '';
const accessKey = process.env.RAKUTEN_ACCESS_KEY || '';
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '';
const watchlistPath = process.env.DEAL_WATCHLIST || 'data/watchlist.json';
const outputPath = process.env.RAKUTEN_OUTPUT || 'data/rakuten-offers.json';
const existingPath = process.env.RAKUTEN_EXISTING_FILE || '';

const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
const asArray = value => (Array.isArray(value) ? value : []);
const text = value => String(value ?? '').trim();
const positiveNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const normalizeText = value => text(value)
  .normalize('NFKC')
  .toLocaleLowerCase('ja')
  .replace(/[\s\-‐‑‒–—―_./・,，:：()（）\[\]【】]/g, '');

const imageUrl = value => {
  const first = asArray(value)[0];
  if (typeof first === 'string') return first;
  return text(first?.imageUrl || first?.url);
};

async function readJson(file, fallback) {
  if (!file) return fallback;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function candidateScore(item, product) {
  const name = normalizeText(item.itemName);
  if (!name) return Number.NEGATIVE_INFINITY;

  const excluded = asArray(product.exclude).some(term => name.includes(normalizeText(term)));
  if (excluded) return Number.NEGATIVE_INFINITY;

  const mustAll = asArray(product.mustIncludeAll).map(normalizeText).filter(Boolean);
  if (mustAll.length && !mustAll.every(term => name.includes(term))) {
    return Number.NEGATIVE_INFINITY;
  }

  const mustAny = asArray(product.mustIncludeAny).map(normalizeText).filter(Boolean);
  if (mustAny.length && !mustAny.some(term => name.includes(term))) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  const model = normalizeText(product.model);
  if (model && name.includes(model)) score += 220;

  mustAll.forEach(term => {
    if (name.includes(term)) score += 60;
  });
  mustAny.forEach(term => {
    if (name.includes(term)) score += 90;
  });

  const queryTerms = text(product.query)
    .split(/[\s　]+/)
    .map(normalizeText)
    .filter(term => term.length >= 2);
  queryTerms.forEach(term => {
    if (name.includes(term)) score += 16;
  });

  score += Math.min(20, Math.log10(Math.max(1, Number(item.reviewCount) || 0) + 1) * 6);
  score += Math.min(10, Number(item.reviewAverage) || 0);
  return score;
}

function historyFor(product, price, previousOffer, nowIso) {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const previousHistory = asArray(previousOffer?.history)
    .filter(entry => positiveNumber(entry?.price))
    .filter(entry => {
      const timestamp = new Date(entry.at).getTime();
      return Number.isNaN(timestamp) || timestamp >= ninetyDaysAgo;
    });

  const last = previousHistory.at(-1);
  if (!last || Number(last.price) !== price || text(last.at).slice(0, 10) !== nowIso.slice(0, 10)) {
    previousHistory.push({ at: nowIso, price });
  }

  const history = previousHistory.slice(-180);
  const observedPrices = history.map(entry => Number(entry.price)).filter(Number.isFinite);
  const observedAverage = observedPrices.length
    ? observedPrices.reduce((sum, value) => sum + value, 0) / observedPrices.length
    : 0;
  const observedLow = observedPrices.length ? Math.min(...observedPrices) : 0;
  const firstAt = history[0]?.at ? new Date(history[0].at).getTime() : Date.now();
  const observedDays = Math.max(1, Math.ceil((Date.now() - firstAt) / (24 * 60 * 60 * 1000)));

  return {
    history,
    historyAverage: Math.round(
      history.length >= 3
        ? observedAverage
        : positiveNumber(product.seedHistoryAverage) || observedAverage || price
    ),
    historyLow: Math.round(
      history.length >= 3
        ? observedLow
        : positiveNumber(product.seedHistoryLow) || observedLow || price
    ),
    historyDays: Math.max(
      history.length >= 3 ? observedDays : 0,
      Number(product.seedHistoryDays) || 0
    )
  };
}

async function searchRakuten(product) {
  const parameters = new URLSearchParams({
    applicationId,
    format: 'json',
    formatVersion: '2',
    keyword: product.query,
    hits: '30',
    sort: '+itemPrice',
    availability: '1',
    imageFlag: '1',
    postageFlag: '1',
    elements: [
      'itemName',
      'itemCode',
      'itemPrice',
      'itemUrl',
      'affiliateUrl',
      'mediumImageUrls',
      'shopName',
      'shopCode',
      'postageFlag',
      'pointRate',
      'reviewCount',
      'reviewAverage'
    ].join(',')
  });
  if (affiliateId) parameters.set('affiliateId', affiliateId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_ENDPOINT}?${parameters}`, {
      headers: {
        Accept: 'application/json',
        accessKey
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error_description || `Rakuten API HTTP ${response.status}`);
    }

    const candidates = asArray(payload.items)
      .map(item => ({ item, score: candidateScore(item, product) }))
      .filter(candidate => Number.isFinite(candidate.score))
      .sort((left, right) =>
        right.score - left.score
        || positiveNumber(left.item.itemPrice) - positiveNumber(right.item.itemPrice)
      );

    const winner = candidates[0];
    if (!winner || winner.score < 35) return null;
    return { ...winner.item, matchScore: Math.round(winner.score) };
  } finally {
    clearTimeout(timer);
  }
}

if (!applicationId || !accessKey) {
  throw new Error('RAKUTEN_APPLICATION_ID and RAKUTEN_ACCESS_KEY are required');
}

const watchlist = await readJson(watchlistPath, { products: [] });
const existing = await readJson(existingPath, { offers: [] });
const previousByKey = new Map(asArray(existing.offers).map(offer => [offer.productKey, offer]));
const nowIso = new Date().toISOString();
const offers = [];
const results = [];

for (const product of asArray(watchlist.products).filter(item => item.liveEnabled !== false)) {
  try {
    const item = await searchRakuten(product);
    if (!item) {
      const previous = previousByKey.get(product.productKey);
      if (previous) {
        offers.push({
          ...previous,
          fetchedAt: previous.fetchedAt || nowIso,
          metadata: {
            ...(previous.metadata || {}),
            stale: true,
            staleReason: 'no matching item in latest search'
          }
        });
      }
      results.push({ productKey: product.productKey, status: previous ? 'stale' : 'not-found' });
      await wait(350);
      continue;
    }

    const price = positiveNumber(item.itemPrice);
    const previous = previousByKey.get(product.productKey);
    const history = historyFor(product, price, previous, nowIso);

    offers.push({
      productKey: product.productKey,
      productId: product.productId,
      jan: product.jan || '',
      model: product.model || '',
      name: product.name,
      category: product.category,
      icon: product.icon,
      store: '楽天市場',
      price,
      shipping: 0,
      points: 0,
      url: item.affiliateUrl || item.itemUrl || '',
      image: imageUrl(item.mediumImageUrls),
      historyAverage: history.historyAverage,
      historyLow: history.historyLow,
      historyDays: history.historyDays,
      history: history.history,
      fetchedAt: nowIso,
      metadata: {
        live: true,
        source: 'Rakuten Ichiba Item Search API 2026-07-01',
        query: product.query,
        listingName: item.itemName || '',
        itemCode: item.itemCode || '',
        shopName: item.shopName || '',
        shopCode: item.shopCode || '',
        postageIncluded: Number(item.postageFlag) === 0,
        pointRate: Number(item.pointRate) || 1,
        reviewCount: Number(item.reviewCount) || 0,
        reviewAverage: Number(item.reviewAverage) || 0,
        matchScore: item.matchScore,
        historySamples: history.history.length,
        historySeeded: history.history.length < 3
      }
    });
    results.push({ productKey: product.productKey, status: 'ready', price, matchScore: item.matchScore });
  } catch (error) {
    const previous = previousByKey.get(product.productKey);
    if (previous) {
      offers.push({
        ...previous,
        metadata: {
          ...(previous.metadata || {}),
          stale: true,
          staleReason: error.message
        }
      });
    }
    results.push({ productKey: product.productKey, status: previous ? 'stale' : 'error', error: error.message });
  }

  await wait(350);
}

const output = {
  schemaVersion: 1,
  provider: 'rakuten',
  configured: true,
  updatedAt: nowIso,
  offerCount: offers.length,
  offers,
  results
};

await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Generated ${offers.length} Rakuten offers at ${outputPath}`);
