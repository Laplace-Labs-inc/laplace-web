import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Settings, LogIn } from 'lucide-react';

// 페이지 컴포넌트 임포트
import { LandingPage } from './pages/LandingPage';
import { GatewayPage } from './pages/GatewayPage';
import { ConsolePage } from './pages/ConsolePage';
import { LoginPage } from './pages/LoginPage';
import { ContactPage } from './pages/ContactPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-blue-500/30">
        <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-[#030712]/80 backdrop-blur-md">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition invert brightness-90">
          <img src="/images/Laplace_labs.png" alt="Laplace Labs Logo" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium text-gray-300">
            <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="hover:text-white transition">Docs</a>
            <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
            
            <div className="h-4 w-px bg-gray-700 mx-2" />
            
            <Link to="/console" className="flex items-center gap-2 hover:text-white transition">
              <Settings className="w-4 h-4" /> Console
            </Link>
            <Link to="/login" className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition">
              <LogIn className="w-4 h-4" /> Login
            </Link>
          </nav>
        </header>

        <main className="w-full">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<GatewayPage />} />
            <Route path="/console" element={<ConsolePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;