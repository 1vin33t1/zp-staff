import '@testing-library/jest-dom/vitest';
import {afterEach, beforeEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

// Node 25 also exposes a native localStorage; use deterministic browser storage.
const storage = () => {
    const values = new Map();
    return {
        getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
        setItem: (key, value) => values.set(String(key), String(value)),
        removeItem: key => values.delete(String(key)),
        clear: () => values.clear(),
        key: index => [...values.keys()][index] ?? null,
        get length() { return values.size; },
    };
};
beforeEach(() => {
    vi.stubGlobal('localStorage', storage());
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Unexpected network request in test'))));
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
