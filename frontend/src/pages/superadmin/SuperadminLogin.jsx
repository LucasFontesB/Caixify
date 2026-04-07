import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSuperadmin } from "../../context/SuperadminContext"
import api from "../../services/superadminApi"

export default function SuperadminLogin() {
  const [form, setForm] = useState({ login: "", senha: "" })
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useSuperadmin()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro("")
    setLoading(true)
    try {
      const { data } = await api.post("/superadmin/auth/login", form)
      // Decodifica nome do token (payload base64)
      const payload = JSON.parse(atob(data.access_token.split(".")[1]))
      login(data.access_token, payload.nome)
      navigate("/superadmin")
    } catch (err) {
      setErro(err.response?.data?.detail || "Credenciais inválidas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <span style={s.dot} />
          <span style={s.logo}>Caixify</span>
          <span style={s.badge}>superadmin</span>
        </div>

        <p style={s.subtitle}>Painel de controle do sistema</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Login</label>
            <input
              style={s.input}
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              autoComplete="username"
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Senha</label>
            <input
              style={s.input}
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              autoComplete="current-password"
              required
            />
          </div>

          {erro && <div style={s.erro}>{erro}</div>}

          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  root: {
    minHeight: "100vh", background: "#0f0f10", display: "flex",
    alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace",
  },
  card: {
    background: "#141416", border: "1px solid #222", borderRadius: 16,
    padding: "40px 36px", width: "100%", maxWidth: 360,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#534AB7" },
  logo: { color: "#fff", fontWeight: 600, fontSize: 16, letterSpacing: "-0.02em" },
  badge: {
    fontSize: 9, color: "#534AB7", background: "#1e1b3a",
    padding: "2px 7px", borderRadius: 4, letterSpacing: "0.08em", textTransform: "uppercase",
  },
  subtitle: { color: "#444", fontSize: 12, marginBottom: 32 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#555", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" },
  input: {
    background: "#0f0f10", border: "1px solid #252525", borderRadius: 8,
    color: "#ddd", fontSize: 13, padding: "10px 12px", outline: "none",
    fontFamily: "inherit",
  },
  erro: {
    background: "#2a1010", border: "1px solid #4a1010", color: "#e07070",
    borderRadius: 8, padding: "10px 12px", fontSize: 12,
  },
  btn: {
    background: "#534AB7", color: "#fff", border: "none", borderRadius: 8,
    padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", marginTop: 8, letterSpacing: "0.02em",
  },
}
