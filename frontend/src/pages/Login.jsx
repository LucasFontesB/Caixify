import { useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const navigate = useNavigate();

  // 🔐 Auto login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/pdv");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    setErro("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        login,
        senha
      });

      const token = response.data.access_token;

      localStorage.setItem("token", token);

      navigate("/pdv");
    } catch (error) {
      setErro("Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={styles.container}>
        <div style={styles.left}>
          <div style={styles.leftContent}>
            <img
              src="/Barcode.gif"
              alt="Ilustração"
              style={styles.image}
            />

            <h2 style={styles.leftTitle}>
              Simplifique suas vendas
            </h2>

            <p style={styles.leftText}>
              Controle estoque, vendas e lucros em um só lugar
            </p>
          </div>
        </div>

        <div style={styles.right}>
          <div style={styles.card}>
              <h1 style={styles.logo}>Mercado Fácil</h1>
            <p style={styles.subtitle}>Gestão inteligente para seu mercadinho</p>
            <h2 style={styles.title}>Entrar</h2>

            <form onSubmit={handleLogin} style={styles.form}>
              <input
                type="text"
                placeholder="Usuário"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={styles.input}
              />

              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={styles.input}
              />

              {erro && <span style={styles.error}>{erro}</span>}

              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
}

const styles = {
    logo: {
      margin: 0,
      fontSize: "22px",
      fontWeight: "bold",
      color: "#0f172a",
      textAlign: "center"
    },

    subtitle: {
      fontSize: "13px",
      color: "#64748b",
      textAlign: "center",
      marginBottom: "10px"
    },

  container: {
    display: "flex",
    height: "100vh",
    background: "#f1f5f9"
  },

  left: {
    flex: 1.3,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2ff, #e0f2fe)"
  },

    leftContent: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px"
    },

    leftTitle: {
      color: "#1e293b",
      fontSize: "18px",
      marginTop: "10px"
    },

    leftText: {
      color: "#64748b",
      fontSize: "14px",
      textAlign: "center",
      maxWidth: "300px"
    },

  image: {
      width: "90%",
      maxWidth: "600px"
    },

  right: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  card: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    width: "320px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },

  title: {
    margin: 0,
    textAlign: "center",
    color: "#0f172a"
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },

  input: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    outline: "none",
    fontSize: "14px",
    transition: "0.2s",
    background: "#f8fafc"
  },

  button: {
    marginTop: "10px",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #7c3aed, #9333ea)",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s"
  },

  error: {
    color: "#dc2626",
    fontSize: "13px",
    textAlign: "center"
  }
};