import type { AppState } from '../types';

const STORAGE_KEY = 'ordinal_topology_state';

export function saveState(state: AppState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save state:', e);
    }
}

export function loadState(): AppState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AppState;
    } catch (e) {
        console.error('Failed to load state:', e);
        return null;
    }
}

export function clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
}
