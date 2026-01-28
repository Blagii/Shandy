import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Video, VideoOff, Mic, MicOff, Send, SkipForward, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('https://shandy.onrender.com');

const VideoChat = () => {
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [isMatching, setIsMatching] = useState(false);
    const [partnerDisconnected, setPartnerDisconnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream);
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }
        });

        socket.on('matchFound', (data) => {
            setIsMatching(false);
            setPartnerDisconnected(false);
            if (data.initiator) {
                callUser(data.partnerId);
            }
        });

        socket.on('signal', (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
        });

        socket.on('message', (data) => {
            setMessages((prev) => [...prev, { from: 'Stranger', text: data.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        });

        socket.on('partnerDisconnected', () => {
            setPartnerDisconnected(true);
            setRemoteStream(null);
            if (connectionRef.current) {
                connectionRef.current.destroy();
            }
        });

        return () => {
            socket.off('matchFound');
            socket.off('signal');
            socket.off('message');
            socket.off('partnerDisconnected');
        };
    }, []);

    useEffect(() => {
        if (receivingCall && !callAccepted) {
            answerCall();
        }
    }, [receivingCall]);

    const callUser = (id) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });

        peer.on('signal', (data) => {
            socket.emit('signal', {
                to: id,
                signal: data,
                from: socket.id,
            });
        });

        peer.on('stream', (currentStream) => {
            setRemoteStream(currentStream);
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        socket.on('signal', (data) => {
            if (data.from === id) {
                peer.signal(data.signal);
            }
        });

        connectionRef.current = peer;
        setCallAccepted(true);
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });

        peer.on('signal', (data) => {
            socket.emit('signal', { signal: data, to: caller });
        });

        peer.on('stream', (currentStream) => {
            setRemoteStream(currentStream);
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const findNext = () => {
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        setCallAccepted(false);
        setReceivingCall(false);
        setRemoteStream(null);
        setMessages([]);
        setIsMatching(true);
        socket.emit('next');
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', { text: message });
            setMessages((prev) => [...prev, { from: 'You', text: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            setMessage("");
        }
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
            {/* Sidebar / Chat Section */}
            <div className="w-[400px] flex flex-col border-r border-white/5 bg-slate-900/40 backdrop-blur-xl shrink-0">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Video className="text-white" size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Shandy</h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Live Network</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Status</p>
                            <p className="text-sm font-medium text-slate-200">{callAccepted ? 'Connected' : isMatching ? 'Searching...' : 'Idle'}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Privacy</p>
                            <p className="text-sm font-medium text-slate-200">Encrypted</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {messages.length === 0 && !partnerDisconnected && (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-6">
                            <Send size={48} className="mb-4" />
                            <p className="text-sm">Start a conversation with the stranger. Be respectful!</p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className={`flex flex-col ${msg.from === 'You' ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.from === 'You' ? 'text-indigo-400' : 'text-slate-500'}`}>
                                        {msg.from}
                                    </span>
                                    <span className="text-[10px] text-slate-600">{msg.time}</span>
                                </div>
                                <div className={`px-4 py-3 rounded-2xl max-w-[90%] text-[14px] leading-relaxed shadow-sm ${msg.from === 'You'
                                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {partnerDisconnected && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center"
                        >
                            <p className="text-xs text-amber-500 font-medium italic">
                                Stranger has left the chat.
                            </p>
                        </motion.div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-slate-900/60 border-t border-white/5">
                    <form onSubmit={sendMessage} className="relative group">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type something friendly..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!callAccepted}
                            className="absolute right-2 top-2 bottom-2 w-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shadow-lg"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 relative flex flex-col p-6 gap-6 bg-slate-950">
                {/* Top Bar Info */}
                <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-30 pointer-events-none">
                    <div className="flex flex-col gap-2">
                        {isMatching && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-4 py-2 bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 rounded-full flex items-center gap-3"
                            >
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Searching for match...</span>
                            </motion.div>
                        )}
                        {callAccepted && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-full flex items-center gap-3"
                            >
                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live Connection Established</span>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className="flex-1 relative rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/5 group shadow-2xl">
                    {/* Remote Video */}
                    {remoteStream ? (
                        <video
                            playsInline
                            ref={userVideo}
                            autoPlay
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617]">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full scale-150" />
                                {isMatching ? (
                                    <div className="relative flex flex-col items-center gap-6">
                                        <div className="w-24 h-24 border-b-4 border-indigo-600 rounded-full animate-spin" />
                                        <div className="text-center">
                                            <h3 className="text-2xl font-bold text-white mb-2">Finding a partner</h3>
                                            <p className="text-slate-500 text-sm">Our algorithm is looking for the best match...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col items-center gap-6 text-center max-w-sm px-10">
                                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-2">
                                            <Users size={40} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Ready to start?</h3>
                                            <p className="text-slate-500 text-sm leading-relaxed">Click the next button to connect with someone from around the world.</p>
                                        </div>
                                        <button
                                            onClick={findNext}
                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 group/btn"
                                        >
                                            <SkipForward size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                            Start Meeting
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between z-30">
                        <div className="flex gap-3">
                            <button
                                onClick={toggleMute}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={findNext}
                                className="h-14 px-8 bg-white text-slate-950 hover:bg-slate-200 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-2xl active:scale-95"
                            >
                                <SkipForward size={20} />
                                <span>Next Stranger</span>
                                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter">Space</span>
                            </button>
                        </div>
                    </div>

                    {/* Local Video - Floating Window */}
                    <div className="absolute top-10 right-10 w-64 aspect-video rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 z-40 group/local active:scale-[0.98] transition-all">
                        <div className="absolute inset-0 bg-blue-600/10 pointer-events-none group-hover/local:bg-transparent" />
                        {stream ? (
                            <video
                                playsInline
                                muted
                                ref={myVideo}
                                autoPlay
                                className="w-full h-full object-cover scale-x-[-1]"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                <VideoOff size={24} className="text-slate-700" />
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">You</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Branding */}
                <div className="flex items-center justify-between px-4 pb-2">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em]">
                        &copy; 2024 Shandy Network &bull; All matches are private
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase font-bold tracking-widest">Terms</a>
                        <a href="#" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase font-bold tracking-widest">Safety</a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VideoChat;
// build v102
