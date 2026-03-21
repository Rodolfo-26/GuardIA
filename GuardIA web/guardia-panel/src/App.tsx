import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PanelTransition from "./components/overlays/PanelTransition";
import SpyTransition from "./components/overlays/SpyTransition";
import WelcomeOverlay from "./components/overlays/WelcomeOverlay";
import AppLayout from "./layout/AppLayout";
import AlertasPage from "./pages/AlertasPage";
import Dashboard from "./pages/Dashboard";
import GrabacionesPage from "./pages/GrabacionesPage";
import UsuariosPage from "./pages/UsuariosPage";
import CamerasPage from "./pages/camaras/CamerasPage";
import Login from "./pages/login/Login";
import LogsPage from "./pages/LogsPage";
import Monitoreo from "./pages/Monitoreo";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

const WELCOME_STORAGE_KEY = "guardia_welcome_seen_v1";

export default function App() {
  const { pathname } = useLocation();
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitoreo" element={<Monitoreo />} />
          <Route
            path="/camaras"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor"]}>
                <CamerasPage />
              </RoleRoute>
            }
          />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/grabaciones" element={<GrabacionesPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route
            path="/logs"
            element={
              <RoleRoute allowedRoles={["Admin", "Supervisor"]}>
                <LogsPage />
              </RoleRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
