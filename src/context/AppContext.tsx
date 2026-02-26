import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppState, Ballot, Participant } from '../types';
import { saveState, loadState } from '../lib/storage';
import * as LZString from 'lz-string';

interface AppContextType {
    state: AppState;
    addParticipant: (name: string) => void;
    removeParticipant: (id: string) => void;
    submitBallot: (ballot: Ballot) => void;
    reset: () => void;
    loadData: (data: { participants: Participant[], ballots: Ballot[] }) => void;
    page: 'setup' | 'ranking' | 'results';
    setPage: (page: 'setup' | 'ranking' | 'results') => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_STATE: AppState = { participants: [], ballots: [] };

function getInitialStateAndPage() {
    // 1. Check for URL Hash Archive (Shared Link)
    try {
        if (window.location.hash.startsWith('#archive=')) {
            const compressed = window.location.hash.substring(9);
            const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
            if (decompressed) {
                const parsed = JSON.parse(decompressed);
                if (parsed.participants && parsed.ballots) {
                    // Clean up URL without triggering navigation
                    window.history.replaceState(null, '', window.location.pathname);
                    return { state: parsed, page: 'results' as const };
                }
            }
        }
    } catch (e) {
        console.error("Failed to parse archive link", e);
    }

    // 2. Check for Local Storage
    const s = loadState();
    if (!s || s.participants.length < 2) return { state: s || DEFAULT_STATE, page: 'setup' as const };
    if (s.ballots.length < s.participants.length) return { state: s, page: 'ranking' as const };
    return { state: s, page: 'results' as const };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const initialState = getInitialStateAndPage();
    const [state, setState] = useState<AppState>(initialState.state);
    const [page, setPage] = useState<'setup' | 'ranking' | 'results'>(initialState.page);

    useEffect(() => {
        saveState(state);
    }, [state]);

    const addParticipant = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setState(prev => ({
            ...prev,
            participants: [...prev.participants, {
                id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: trimmed,
            }],
        }));
    }, []);

    const removeParticipant = useCallback((id: string) => {
        setState(prev => ({
            participants: prev.participants.filter(p => p.id !== id),
            ballots: prev.ballots.filter(b => b.voterId !== id),
        }));
    }, []);

    const submitBallot = useCallback((ballot: Ballot) => {
        setState(prev => ({
            ...prev,
            ballots: [
                ...prev.ballots.filter(b => b.voterId !== ballot.voterId),
                ballot,
            ],
        }));
    }, []);

    const reset = useCallback(() => {
        setState(DEFAULT_STATE);
        setPage('setup');
    }, []);

    const loadData = useCallback(({ participants, ballots }: { participants: Participant[], ballots: Ballot[] }) => {
        setState({ participants, ballots });
        setPage('results');
    }, []);

    return (
        <AppContext.Provider value={{ state, addParticipant, removeParticipant, submitBallot, reset, loadData, page, setPage }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp(): AppContextType {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
