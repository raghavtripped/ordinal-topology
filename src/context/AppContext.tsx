import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppState, Ballot } from '../types';
import { saveState, loadState } from '../lib/storage';

interface AppContextType {
    state: AppState;
    addParticipant: (name: string) => void;
    removeParticipant: (id: string) => void;
    submitBallot: (ballot: Ballot) => void;
    reset: () => void;
    page: 'setup' | 'ranking' | 'results';
    setPage: (page: 'setup' | 'ranking' | 'results') => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_STATE: AppState = { participants: [], ballots: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AppState>(() => loadState() || DEFAULT_STATE);
    const [page, setPage] = useState<'setup' | 'ranking' | 'results'>(() => {
        const s = loadState();
        if (!s || s.participants.length < 2) return 'setup';
        if (s.ballots.length < s.participants.length) return 'ranking';
        return 'results';
    });

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

    return (
        <AppContext.Provider value={{ state, addParticipant, removeParticipant, submitBallot, reset, page, setPage }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp(): AppContextType {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
