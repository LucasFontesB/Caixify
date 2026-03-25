import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import PDV from "./pages/PDV";
import AdminLayout from "./pages/AdminLayout";
import Produtos from "./pages/admin/Produtos";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

function Dashboard() {
  return <h1>Dashboard 🚀</h1>;
}

function App() {
    const { usuario } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={usuario}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pdv"
          element={
            <ProtectedRoute user={usuario}>
              <PDV />
            </ProtectedRoute>
          }
        />
        <Route path="/sem-acesso" element={<h1>🚫 Acesso negado</h1>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={usuario} tipo="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="produtos" element={<Produtos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;