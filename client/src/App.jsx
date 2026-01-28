import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoChat from './components/VideoChat';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#020617] text-white font-['Outfit'] selection:bg-indigo-500/30">
        <Routes>
          <Route path="/" element={<VideoChat />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
