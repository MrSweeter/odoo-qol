import { Runtime } from '../utils/browser.js';
import { getLocalCache, setLocalCache } from './local.js';

/**
 * Caches the result of a function call for a specified amount of time.
 * If the cached result exists and hasn't expired, it is returned;
 * otherwise, the function is executed and the result is cached.
 *
 * @async
 * @function cache
 * @param {number} cachingTime - The amount of time (in minutes) to cache the result. If 0 or less, the result will not be cached.
 * @param {Function} call - The asynchronous function to call if there is no cached data.
 * @param {string} callID - A unique identifier for the cached data.
 * @param {...any} params - Additional parameters passed to both the `readCacheCall` and `saveCacheCall` functions.
 * @returns {Promise<{fromCache: boolean, data: any}>} - An object containing two properties:
 *          - `fromCache` (boolean): Whether the data was retrieved from the cache.
 *          - `data` (any): The cached data or the result of the function call.
 */
export async function cache(cachingTime, call, callID, ...params) {
    let data = undefined;
    let fromCache = true;
    if (cachingTime > 0) {
        data = await readCacheCall(callID, ...params);
    }
    if (!data) {
        data = await call();
        fromCache = false;

        if (cachingTime > 0) await saveCacheCall(cachingTime, callID, data, ...params);
    }
    return { fromCache, data };
}

export async function checkHostsExpiration() {
    let cache = await getLocalCache();
    cache = await _checkHostsExpiration(cache, Date.now());
    if (cache.changed) setLocalCache(cache.cache);
}

export async function clearHost(host) {
    const cache = await getLocalCache();
    delete cache[host];
    await setLocalCache(cache);
}

function getHost() {
    if (typeof window === 'undefined' || window.location.host === Runtime.id) return `joorney://${Runtime.id}`;
    return window.location.host;
}

// Clear host if last change is 12h hours old
async function _checkHostsExpiration(cache, now) {
    let hasChange = false;
    for (const [k, v] of Object.entries(cache)) {
        if (now - (v.lastChange ?? 0) > 12 * 60 * 60 * 1000) {
            delete cache[k];
            hasChange = true;
        }
    }
    return { changed: hasChange, cache: cache };
}

async function saveCacheCall(expireAfterMinute, call, result, ...params) {
    const hash = btoa(JSON.stringify(params));
    const host = getHost();

    let cache = await getLocalCache();

    const now = Date.now();

    cache[host] ??= {};
    cache[host][call] ??= {};
    cache[host][call][hash] = {
        date: now,
        dateStr: new Date(now).toISOString(),
        expireAfterMinute: expireAfterMinute ?? 0,
        data: btoa(JSON.stringify(result)),
    };
    cache[host].lastChange = now;

    cache = await _checkHostsExpiration(cache, now);
    await setLocalCache(cache.cache);
}

async function readCacheCall(call, ...params) {
    const hash = btoa(JSON.stringify(params));
    const host = getHost();
    let cache = await getLocalCache();
    cache = cache?.[host]?.[call]?.[hash];
    if (!cache) return undefined;
    const { date, expireAfterMinute, data } = cache;

    const now = Date.now();
    if (now - date > expireAfterMinute * 60 * 1000) return undefined;
    return JSON.parse(atob(data));
}
