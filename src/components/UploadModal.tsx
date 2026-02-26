import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileJson, FileText, AlertCircle } from 'lucide-react';
import { parseCsv, parseJson } from '../lib/parser';
import { useApp } from '../context/AppContext';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const { loadData } = useApp();
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        try {
            const text = await file.text();
            let data;

            if (file.name.endsWith('.json')) {
                data = parseJson(text);
            } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                data = parseCsv(text);
            } else {
                throw new Error("Unsupported file type. Please upload a .json or .csv file.");
            }

            loadData(data);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to parse file. Please check the required format.');
        } finally {
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg glass-card overflow-hidden shadow-2xl border border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Upload className="text-brand-400" size={20} />
                                Upload Dataset
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                Upload a data file to instantly run advanced sociological and network analysis. Valid formats:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* JSON Format */}
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-200 mb-2">
                                        <FileJson size={16} className="text-amber-400" /> JSON Array
                                    </h4>
                                    <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg leading-relaxed">
                                        [<br />
                                        &nbsp;&nbsp;["Alice", "Bob", "Dave"],<br />
                                        &nbsp;&nbsp;["Eve", "Alice", "Carol"]<br />
                                        ]
                                        <div className="mt-2 text-slate-500 font-sans">
                                            (Each array represents one voter's ranked preference from 1st to Nth)
                                        </div>
                                    </div>
                                </div>

                                {/* CSV Format */}
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <h4 className="flex items-center gap-2 font-bold text-slate-200 mb-2">
                                        <FileText size={16} className="text-emerald-400" /> CSV Rows
                                    </h4>
                                    <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg leading-relaxed">
                                        Alice,Bob,Dave<br />
                                        Eve,Alice,Carol<br />
                                        Bob,Dave,Alice
                                        <div className="mt-2 text-slate-500 font-sans">
                                            (Each row is one valid ballot. Left-most column is 1st choice)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm font-medium">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Upload Area */}
                            <div className="relative group">
                                <input
                                    type="file"
                                    ref={fileRef}
                                    accept=".json,.csv,.txt"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-brand-500/40 rounded-xl text-brand-300 font-bold bg-brand-500/5 group-hover:bg-brand-500/10 group-hover:border-brand-400 transition-colors">
                                    <Upload size={18} />
                                    Click or Drag & Drop File
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
