import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SetupPage() {
    const { state, addParticipant, removeParticipant, setPage } = useApp();
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        if (state.participants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
            setError('Name already exists');
            return;
        }
        if (state.participants.length >= 50) {
            setError('Max 50 participants');
            return;
        }
        addParticipant(trimmed);
        setInput('');
        setError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAdd();
    };

    const canProceed = state.participants.length >= 2;

    const sampleNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
    const addSample = () => {
        for (const name of sampleNames) {
            if (!state.participants.some(p => p.name === name)) {
                addParticipant(name);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="min-h-screen bg-transparent pt-12 pb-24"
        >
            <main className="max-w-3xl mx-auto px-6">

                {/* Hero / Intro */}
                <div className="mb-12 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primary shadow-[0_0_30px_rgba(2,132,199,0.5)] mb-6"
                    >
                        <Sparkles size={32} className="text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                        Social Topology <span className="text-gradient">Analyzer</span>
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
                        Discover the hidden hierarchical and community structures within your group using advanced social choice theory.
                    </p>
                </div>

                {/* Configuration Card */}
                <div className="glass-card mb-8">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">
                                Add Participant
                            </label>
                            <input
                                type="text"
                                value={input}
                                onChange={e => { setInput(e.target.value); setError(''); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter a name (e.g., Alice)..."
                                className="w-full premium-input rounded-xl px-4 py-3.5 text-base"
                                maxLength={40}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            className="bg-brand-500 hover:bg-brand-400 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            Add
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 ml-1">
                        {error ? (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 font-medium">
                                {error}
                            </motion.p>
                        ) : (
                            <p className="text-sm text-slate-500 font-medium">{state.participants.length}/50 added</p>
                        )}

                        {state.participants.length === 0 && (
                            <button
                                onClick={addSample}
                                className="text-sm font-medium text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                            >
                                <RefreshCw size={14} /> Load Sample (5)
                            </button>
                        )}
                    </div>
                </div>

                {/* Participants Grid */}
                {state.participants.length > 0 && (
                    <div className="mb-12">
                        <div className="section-header">Participants</div>
                        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <AnimatePresence>
                                {state.participants.map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                                        className="group flex items-center justify-between glass-panel rounded-xl px-4 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono font-bold text-slate-500 w-4">{i + 1}</span>
                                            <span className="text-sm font-medium text-slate-200">{p.name}</span>
                                        </div>
                                        <button
                                            onClick={() => removeParticipant(p.id)}
                                            className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}

                {/* Floating Action Bar */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none flex justify-center px-6"
                >
                    <div className={`pointer-events-auto glass-card py-3 px-4 flex items-center gap-4 border ${canProceed ? 'border-brand-500/30' : 'border-slate-800'}`}>
                        <div className="text-sm font-medium mr-4">
                            {canProceed
                                ? <span className="text-slate-200">Ready to begin</span>
                                : <span className="text-slate-500">Add at least 2 participants</span>}
                        </div>
                        <button
                            onClick={() => setPage('ranking')}
                            disabled={!canProceed}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${canProceed
                                ? 'bg-gradient-primary text-white shadow-[0_0_20px_rgba(2,132,199,0.4)] hover:shadow-[0_0_30px_rgba(2,132,199,0.6)] hover:scale-105'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            Start Survey
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </motion.div>

            </main>
        </motion.div>
    );
}

