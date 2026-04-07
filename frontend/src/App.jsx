import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { SuperadminProvider, useSuperadmin } from "./context/SuperadminContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./pages/Login";
import PDV from "./pages/PDV";
import AdminLayout from "./pages/AdminLayout";
import Produtos from "./pages/admin/Produtos";
import Estoque from "./pages/admin/Estoque";
import Usuarios from "./pages/admin/Usuarios";
import Caixa from "./pages/admin/Caixa";
import Despesas from "./pages/admin/Despesas";
import Turnos from "./pages/admin/Turnos";

import SuperadminLogin from "./pages/superadmin/SuperadminLogin";
import SuperadminDashboard from "./pages/superadmin/SuperadminDashboard";
import SuperadminEmpresas from "./pages/superadmin/SuperadminEmpresas";
import SuperadminEmpresaDetalhe from "./pages/superadmin/SuperadminEmpresaDetalhe";
import SuperadminFaturas from "./pages/superadmin/SuperadminFaturas";
import SuperadminLogs from "./pages/superadmin/SuperadminLogs";

import "./styles/print.css";

function SuperadminGuard({ children }) {
  const { superadmin } = useSuperadmin();
  if (!superadmin) return <Navigate to="/superadmin/login" replace />;
  return children;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Routes>
      {/* Rotas do Caixify */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/sem-acesso" element={<h1>🚫 Acesso negado</h1>} />

      <Route
        path="/pdv"
        element={
          <ProtectedRoute user={usuario}>
            <PDV />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute user={usuario} tipo="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="produtos"  element={<Produtos />} />
        <Route path="estoque"   element={<Estoque />} />
        <Route path="usuarios"  element={<Usuarios />} />
        <Route path="caixa"     element={<Caixa />} />
        <Route path="despesas"  element={<Despesas />} />
        <Route path="turnos"    element={<Turnos />} />
      </Route>

      {/* Rotas superadmin */}
      <Route path="/superadmin/login" element={<SuperadminLogin />} />

      <Route path="/superadmin" element={
        <SuperadminGuard><SuperadminDashboard /></SuperadminGuard>
      } />
      <Route path="/superadmin/empresas" element={
        <SuperadminGuard><SuperadminEmpresas /></SuperadminGuard>
      } />
      <Route path="/superadmin/empresas/:id" element={
        <SuperadminGuard><SuperadminEmpresaDetalhe /></SuperadminGuard>
      } />
      <Route path="/superadmin/faturas" element={
        <SuperadminGuard><SuperadminFaturas /></SuperadminGuard>
      } />
      <Route path="/superadmin/logs" element={
        <SuperadminGuard><SuperadminLogs /></SuperadminGuard>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SuperadminProvider>
        <AppRoutes />
      </SuperadminProvider>
    </BrowserRouter>
  );
}

export default App;