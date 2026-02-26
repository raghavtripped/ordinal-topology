import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../context/AppContext';
import type { Participant } from '../types';
import { GripVertical, CheckCircle2, ChevronLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Sortable item ──────────────────────────────────────────────
interface SortableItemProps {
    id: string;
    rank: number;
    name: string;
}

function SortableItem({ id, rank, name }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative mb-2 w-full">
            <div
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 select-none border 
                    ${isDragging
                        ? 'bg-slate-800/90 border-brand-500 shadow-[0_0_20px_rgba(2,132,199,0.3)] scale-[1.02] backdrop-blur-md'
                        : 'glass-panel hover:bg-slate-800/60'
                    }`}
            >
                <button
                    {...attributes}
                    {...listeners}
                    className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1 -ml-1"
                >
                    <GripVertical size={18} />
                </button>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900/50 border border-slate-700/50 text-brand-400 font-mono font-bold text-sm">
                    {rank}
                </div>
                <span className="text-base font-medium text-slate-200 flex-1">{name}</span>
            </div>
        </div>
    );
}

// ── Ballot form for a single voter ─────────────────────────────
interface BallotFormProps {
    voter: Participant;
    others: Participant[];
    existingRanking: string[] | null;
    onSubmit: (ranking: string[]) => void;
}

function BallotForm({ voter, others, existingRanking, onSubmit }: BallotFormProps) {
    const [items, setItems] = useState<string[]>(() => {
        if (existingRanking && existingRanking.length === others.length) {
            return existingRanking;
        }
        return shuffleArray(others.map(p => p.id));
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems(prev => {
                const oldIdx = prev.indexOf(active.id as string);
                const newIdx = prev.indexOf(over.id as string);
                return arrayMove(prev, oldIdx, newIdx);
            });
        }
    };

    const nameMap = Object.fromEntries(others.map(p => [p.id, p.name]));

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            key={voter.id}
            className="glass-card mb-8 border-l-4 border-l-brand-500"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="text-xs font-bold tracking-widest text-brand-400 uppercase mb-1">
                        Current Voter
                    </div>
                    <div className="text-2xl font-bold text-white flex items-center gap-2">
                        {voter.name}'s Ballot
                    </div>
                </div>
                <div className="text-sm font-medium text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
                    Drag to rank (1 = highly preferred)
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                        {items.map((id, i) => (
                            <SortableItem key={id} id={id} rank={i + 1} name={nameMap[id] || id} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={() => onSubmit(items)}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(2,132,199,0.5)] flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={18} />
                    Confirm & Submit Ballot
                </button>
            </div>
        </motion.div>
    );
}

// ── Main Ranking Page ──────────────────────────────────────────
export function RankingPage() {
    const { state, submitBallot, setPage } = useApp();
    const { participants, ballots } = state;

    const [currentVoterIdx, setCurrentVoterIdx] = useState(() => {
        const submittedIds = new Set(ballots.map(b => b.voterId));
        const firstUnsubmitted = participants.findIndex(p => !submittedIds.has(p.id));
        return firstUnsubmitted >= 0 ? firstUnsubmitted : 0;
    });

    const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);

    const submittedIds = new Set(ballots.map(b => b.voterId));
    const allSubmitted = participants.every(p => submittedIds.has(p.id));
    const submittedCount = submittedIds.size;
    const progressPercent = (submittedCount / participants.length) * 100;

    const currentVoter = participants[currentVoterIdx];
    const others = participants.filter(p => p.id !== currentVoter.id);

    const handleSubmit = async (ranking: string[]) => {
        submitBallot({ voterId: currentVoter.id, ranking });

        // Auto-save via Vite middleware
        try {
            await fetch('/api/save-ballot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voterId: currentVoter.id,
                    voterName: currentVoter.name,
                    ranking: ranking.map(id => participants.find(p => p.id === id)?.name || id)
                })
            });
        } catch (e) {
            console.error('Auto-save failed', e);
        }

        const nextUnsubmitted = participants.findIndex(
            (p, i) => i > currentVoterIdx && !submittedIds.has(p.id) && p.id !== currentVoter.id
        );
        let nextIdx = nextUnsubmitted;
        if (nextIdx < 0) {
            nextIdx = participants.findIndex(p => !submittedIds.has(p.id) && p.id !== currentVoter.id);
        }

        if (nextIdx >= 0) {
            setCurrentVoterIdx(nextIdx);
            setShowPrivacyScreen(true);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-transparent pt-6 pb-24"
        >
            {/* Minimal Header */}
            <header className="max-w-4xl mx-auto px-6 mb-8 flex items-center justify-between">
                <button
                    onClick={() => setPage('setup')}
                    className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition-colors bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 hover:border-slate-700"
                >
                    <ChevronLeft size={16} /> Edit Group
                </button>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Progress</div>
                        <div className="text-sm font-medium text-slate-300">
                            <span className="text-white">{submittedCount}</span> of {participants.length}
                        </div>
                    </div>
                    <div className="w-32 sm:w-48 h-2.5 bg-slate-900/80 rounded-full border border-slate-800 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full bg-gradient-primary rounded-full relative"
                        >
                            <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                        </motion.div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6">

                {/* Voter Selection Pills */}
                <div className="mb-8">
                    <div className="section-header">Select Voter</div>
                    <div className="flex flex-wrap gap-2.5">
                        {participants.map((p, i) => {
                            const done = submittedIds.has(p.id);
                            const active = i === currentVoterIdx;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        if (!done || active) setCurrentVoterIdx(i);
                                    }}
                                    disabled={done && !active}
                                    className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden
                                        ${active
                                            ? 'bg-brand-500 text-white shadow-[0_0_15px_rgba(2,132,199,0.5)] border-transparent scale-105'
                                            : done
                                                ? 'bg-slate-900/50 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50'
                                                : 'glass-panel text-slate-300 hover:bg-slate-800/80 cursor-pointer'
                                        }`}
                                >
                                    {done && !active && <CheckCircle2 size={14} className="inline mr-1.5 -mt-0.5" />}
                                    {p.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="relative">
                    <AnimatePresence mode="wait">
                        {showPrivacyScreen ? (
                            <motion.div
                                key="privacy-screen"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="glass-card flex flex-col items-center justify-center py-16 text-center border-brand-500/30"
                            >
                                <div className="bg-emerald-500/20 p-4 rounded-full mb-6">
                                    <CheckCircle2 size={48} className="text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Ballot Securely Saved</h2>
                                <p className="text-slate-400 mb-8 max-w-sm">
                                    Please pass the device to the next voter to guarantee ballot secrecy.
                                </p>
                                <button
                                    onClick={() => setShowPrivacyScreen(false)}
                                    className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(2,132,199,0.5)] flex items-center justify-center gap-2"
                                >
                                    I am {currentVoter.name} <ArrowRight size={20} />
                                </button>
                            </motion.div>
                        ) : !allSubmitted && currentVoterIdx !== -1 && !submittedIds.has(currentVoter.id) ? (
                            <BallotForm
                                voter={currentVoter}
                                others={others}
                                existingRanking={null} // Never load existing rankings
                                onSubmit={handleSubmit}
                                key={currentVoter.id}
                            />
                        ) : null}
                    </AnimatePresence>

                    {/* Finalize Action */}
                    <AnimatePresence>
                        {allSubmitted && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card mt-8 border-emerald-500/30 bg-emerald-900/10"
                            >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                                    <div>
                                        <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-lg mb-1">
                                            <CheckCircle2 size={24} />
                                            Data Collection Complete
                                        </div>
                                        <p className="text-slate-400 text-sm">
                                            All {participants.length} ordinal ballots have been successfully collected and secured in local storage.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPage('results')}
                                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-base font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        Compute Topology
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </main>
        </motion.div>
    );
}

