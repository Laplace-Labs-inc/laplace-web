import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { ConsoleLayout } from "./pages/console/ConsoleLayout";
import { StatusPage } from "./pages/console/StatusPage";
import { OrgsProjectsPage } from "./pages/console/OrgsProjectsPage";
import { AccessPage } from "./pages/console/AccessPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthProvider, useAuth } from "./lib/auth";
import { RequireAuth } from "./components/RequireAuth";

/** console.laplace-labs.com is a console-only SPA: marketing/docs live on their
 *  own surfaces. The root just routes to the console (or login). */
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/console" : "/login"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
          <Route path="*" element={<Navigate to="/console" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
