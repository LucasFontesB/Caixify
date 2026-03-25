import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, user, tipo }) {
  // 🚫 Não logado
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 🚫 Não tem permissão
  if (tipo && user.tipo !== tipo) {
    return <Navigate to="/sem-acesso" />;
  }

  return children;
}