import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Shield, Ban, Users, Activity, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const socket = io('http://localhost:5000');

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminStats, setAdminStats] = useState({ onlineCount: 0, users: [] });
    const [password, setPassword] = useState("");

    useEffect(() => {
        socket.on('admin_auth_success', () => {
            setIsAuthenticated(true);
        });

        socket.on('statsUpdate', (stats) => {
            setAdminStats(stats);
        });

        return () => {
            socket.off('admin_auth_success');
            socket.off('statsUpdate');
        };
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        socket.emit('admin_login', password);
    };

    const banUser = (socketId) => {
        if (confirm(`Are you sure you want to ban ${socketId}?`)) {
            socket.emit('admin_ban_user', socketId);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#020617] p-6 font-sans">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full" />
                    <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-violet-600/10 blur-[120px] rounded-full" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                        <div className="flex flex-col items-center gap-6 mb-10">
                            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                                <Shield size={40} className="text-white" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Network Control</h2>
                                <p className="text-slate-400 text-sm font-medium">Authentication required to access Shandy Core</p>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Access Token</label>
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-white text-slate-950 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-xl active:scale-[0.98]"
                            >
                                Authenticate
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 px-10 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center">
                            <Shield className="text-indigo-400" size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">Security Dashboard</h1>
                            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-1.5">Node: Shandy-Core-Alpha</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/5 rounded-xl transition-all font-bold text-sm"
                    >
                        <LogOut size={18} />
                        Terminate Session
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-lg group hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <Users size={28} />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Real-time</span>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Active Channels</p>
                        <p className="text-4xl font-extrabold text-white tracking-tight">{adminStats.onlineCount}</p>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-lg group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <Activity size={28} />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Optimal</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">System Integrity</p>
                        <p className="text-4xl font-extrabold text-white tracking-tight">99.9%</p>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-lg group hover:border-rose-500/30 transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                                <Ban size={28} />
                            </div>
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-widest">Global</span>
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Banned Entities</p>
                        <p className="text-4xl font-extrabold text-white tracking-tight">Active</p>
                    </div>
                </div>

                {/* Main Table Content */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-800/20">
                        <h2 className="text-xl font-extrabold text-white flex items-center gap-3">
                            <Users size={24} className="text-indigo-400" />
                            Active Session Monitor
                        </h2>
                        <div className="px-4 py-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Total Nodes: {adminStats.users.length}</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-950/30 text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em]">
                                    <th className="px-10 py-6">Trace ID / Socket</th>
                                    <th className="px-10 py-6">Interface / IP</th>
                                    <th className="px-10 py-6 text-right">Containment Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {adminStats.users.map((user) => (
                                    <tr key={user.id} className="hover:bg-indigo-500/5 transition-all group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:animate-ping" />
                                                <span className="font-mono text-xs text-slate-400 uppercase">{user.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 font-medium text-slate-300">
                                            {user.ip}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button
                                                onClick={() => banUser(user.id)}
                                                className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto border border-rose-500/20"
                                            >
                                                <Ban size={14} />
                                                Terminate Access
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {adminStats.users.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-10 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <Users size={48} />
                                                <p className="text-sm font-bold uppercase tracking-widest">No active sessions detected</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Background Branding Overlay */}
            <div className="fixed bottom-10 right-10 pointer-events-none opacity-[0.02]">
                <Shield size={400} />
            </div>
        </div>
    );
};

export default AdminPanel;
