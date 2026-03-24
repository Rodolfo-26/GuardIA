import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PanelTransition from "./components/overlays/PanelTransition";
import SpyTransition from "./components/overlays/SpyTransition";
import WelcomeOverlay from "./components/overlays/WelcomeOverlay";
import { getDefaultPanelRoute } from "./config/roleAccess";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./layout/AppLayout";
import AlertasPage from "./pages/AlertasPage";
import Dashboard from "./pages/Dashboard";
import GrabacionesPage from "./pages/GrabacionesPage";
import ReportesPage from "./pages/ReportesPage";
import ResidentsPage from "./pages/ResidentsPage";
import UsuariosPage from "./pages/UsuariosPage";
import CamerasPage from "./pages/camaras/CamerasPage";
import Login from "./pages/login/Login";
import Monitoreo from "./pages/Monitoreo";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

const WELCOME_STORAGE_KEY = "guardia_welcome_seen_v1";

export default function App() {
  const { pathname } = useLocation();
  const { appRole } = useAuth();
  const isLoginRoute = pathname === "/login";
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(WELCOME_STORAGE_KEY) !== "true";
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBootLoading(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  function handleCloseWelcome() {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setShowWelcome(false);
  }

  const defaultPanelRoute = getDefaultPanelRoute(appRole);

  return (
    <>
      {isBootLoading && <SpyTransition key="boot-scan" />}
      {!isBootLoading && showWelcome && <WelcomeOverlay onEnter={handleCloseWelcome} />}
      {!isBootLoading && !showWelcome && (isLoginRoute ? <SpyTransition key={pathname} /> : <PanelTransition key={pathname} />)}

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={defaultPanelRoute} replace />} />
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor"]} fallbackTo="/monitoreo">
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route path="/monitoreo" element={<Monitoreo />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route
            path="/camaras"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor", "Operador"]} fallbackTo="/monitoreo">
                <CamerasPage />
              </RoleRoute>
            }
          />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/grabaciones" element={<GrabacionesPage />} />
          <Route
            path="/residentes"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor"]} fallbackTo="/monitoreo">
                <ResidentsPage />
              </RoleRoute>
            }
          />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Route>

        <Route path="*" element={<Navigate to={defaultPanelRoute} replace />} />
      </Routes>
    </>
  );
}
