import { dayjs } from "./dayjs";

interface PersistedValue<T> {
    v: T;
    ttl: number;
}

/**
 * Caches the result of a function for a specified duration.
 *
 * Note: This function uses localStorage to persist the cached value. You should never trust blindly this value.
 *
 * @param {() => (Promise<T> | T)} fn
 * @param {number} elapses_at
 * @param {{key: string}} persist
 * @returns {() => Promise<T>}
 */
export function cachedFunction<T>(
    fn: () => Promise<T> | T,
    elapses_at: number,
    persist?: {
        key: string
    },
): () => Promise<T> {
    let cached_value: T | null = null;

    if (persist) {
        const cached = localStorage.getItem(persist.key);
        if (cached) {
            const val = JSON.parse(cached) as PersistedValue<T>;
            const now = dayjs.utc().unix();

            // Check if the cached value is still valid
            if (now < val.ttl) {
                cached_value = val.v;
                elapses_at = val.ttl;
            }
            else {
                localStorage.removeItem(persist.key);
            }
        }
    }

    return async () => {
        const now = dayjs.utc().unix();
        if (cached_value && now < elapses_at) {
            return cached_value;
        }

        cached_value = await fn();

        if (persist) {
            localStorage.setItem(persist.key, JSON.stringify({v: cached_value, ttl: elapses_at}));
        }

        return cached_value;
    };
}