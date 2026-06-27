import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { OperatorScopeProvider } from "./lib/operator-scope";
import { AdminLayout } from "./AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { TenantsPage } from "./pages/TenantsPage";
import { LicensingPage } from "./pages/LicensingPage";
import { BugDbPage } from "./pages/BugDbPage";
import { FeatureFlagsPage } from "./pages/FeatureFlagsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <OperatorScopeProvider>{children}</OperatorScopeProvider>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="licensing" element={<LicensingPage />} />
            <Route path="bugdb" element={<BugDbPage />} />
            <Route path="flags" element={<FeatureFlagsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
