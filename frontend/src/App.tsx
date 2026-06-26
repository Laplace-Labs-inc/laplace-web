import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings } from 'lucide-react';

// 페이지 컴포넌트 임포트
import { LandingPage } from './pages/LandingPage';
import { GatewayPage } from './pages/GatewayPage';
import { ConsoleLayout } from './pages/console/ConsoleLayout';
import { StatusPage } from './pages/console/StatusPage';
import { OrgsProjectsPage } from './pages/console/OrgsProjectsPage';
import { AccessPage } from './pages/console/AccessPage';
import { LoginPage } from './pages/LoginPage';
import { ContactPage } from './pages/ContactPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthProvider, useAuth } from './lib/auth';
import { RequireAuth } from './components/RequireAuth';

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-gray-800 bg-[#030712]/80 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition invert brightness-90">
        <img src="/images/Laplace_labs.png" alt="Laplace Labs Logo" className="h-14 w-auto object-contain" />
      </Link>

      <nav className="flex items-center gap-6 text-sm font-medium text-gray-300">
        <a href="https://laplace-labs.com/docs/" className="hover:text-white transition">Docs</a>
        <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        <Link to="/contact" className="hover:text-white transition">Contact</Link>

        <div className="h-4 w-px bg-gray-700 mx-2" />

        {isAuthenticated ? (
          <>
            <Link to="/console" className="flex items-center gap-2 hover:text-white transition">
              <Settings className="w-4 h-4" /> Console
            </Link>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition">
            <LogIn className="w-4 h-4" /> Login
          </Link>
        )}
      </nav>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-blue-500/30">
          <Header />
          <main className="w-full">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<GatewayPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route
                path="/console"
                element={
                  <RequireAuth>
                    <ConsoleLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<StatusPage />} />
                <Route path="orgs" element={<OrgsProjectsPage />} />
                <Route path="access" element={<AccessPage />} />
              </Route>
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
