import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import SuperadminLayout from "../../components/SuperadminLayout"
import api from "../../services/superadminApi"

const PLANOS = ["basico", "pro", "enterprise"]
const STATUS_FATURA = {
  pago: { label: "Em dia", color: "#1D9E75", bg: "#0d2a1e" },
  pendente: { label: "Pendente", color: "#c09040", bg: "#2a2010" },
  vencido: { label: "Vencido", color: "#e06040", bg: "#2a1010" },
  cancelado: { label: "Cancelado", color: "#555", bg: "#1a1a1a" },
}

function Badge({ status }) {
  const cfg = STATUS_FATURA[status] || { label: status || "—", color: "#555", bg: "#1a1a1a" }
  return (
    <span style={{ ...s.badge, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function ModalCriar({ onClose, onCreated }) {
  const [form, setForm] = useState({
    nome: "", cnpj: "", contato: "", plano: "basico",
    admin_nome: "", admin_login: "", admin_senha: "",
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function handleLogo(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    setErro("")
    if (!form.nome || !form.admin_nome || !form.admin_login || !form.admin_senha) {
      setErro("Preencha todos os campos obrigatórios")
      return
    }
    setLoading(true)
    try {
      // 1. Cria a empresa
      const { data } = await api.post("/superadmin/empresas", form)

      // 2. Se tiver logo, faz upload
      if (logoFile) {
        const formData = new FormData()
        formData.append("file", logoFile)
        await api.post(`/superadmin/empresas/${data.id}/upload-logo`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }

      onCreated()
      onClose()
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao criar empresa")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>Nova empresa</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Dados da empresa</div>
          <div style={s.row2}>
            <Field label="Nome *" value={form.nome} onChange={set("nome")} />
            <Field label="CNPJ" value={form.cnpj} onChange={set("cnpj")} />
          </div>
          <div style={s.row2}>
            <Field label="Contato" value={form.contato} onChange={set("contato")} />
            <div style={s.field}>
              <label style={s.label}>Plano</label>
              <select style={s.input} value={form.plano} onChange={set("plano")}>
                {PLANOS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Upload de logo */}
          <div style={s.field}>
            <label style={s.label}>Logo da empresa</label>
            <div style={s.logoRow}>
              {logoPreview && (
                <img src={logoPreview} alt="preview" style={s.logoPreview} />
              )}
              <label style={s.uploadBtn}>
                {logoFile ? "Trocar logo" : "Selecionar logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogo}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Primeiro admin</div>
          <div style={s.row2}>
            <Field label="Nome *" value={form.admin_nome} onChange={set("admin_nome")} />
            <Field label="Login *" value={form.admin_login} onChange={set("admin_login")} />
          </div>
          <Field label="Senha *" type="password" value={form.admin_senha} onChange={set("admin_senha")} />
        </div>

        {erro && <div style={s.erro}>{erro}</div>}

        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={{ ...s.confirmBtn, opacity: loading ? 0.6 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando…" : "Criar empresa"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={value} onChange={onChange} />
    </div>
  )
}

export default function SuperadminEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [bloqueando, setBloqueando] = useState(null)
  const navigate = useNavigate()

  const carregar = () => {
    setLoading(true)
    api.get("/superadmin/empresas").then((r) => setEmpresas(r.data)).finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  async function toggleStatus(emp) {
    setBloqueando(emp.id)
    const novoAtivo = !emp.ativo
    await api.patch(`/superadmin/empresas/${emp.id}/status`, {
      ativo: novoAtivo,
      motivo_bloqueio: novoAtivo ? null : "manual",
    })
    setBloqueando(null)
    carregar()
  }

  return (
    <SuperadminLayout>
      <div style={s.root}>
        <div style={s.header}>
          <h1 style={s.title}>Empresas</h1>
          <button style={s.newBtn} onClick={() => setShowModal(true)}>+ Nova empresa</button>
        </div>

        {loading ? (
          <div style={s.loading}>Carregando…</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Empresa", "CNPJ", "Plano", "Fatura", "Status", "Criada em", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => (
                <tr key={emp.id} style={s.tr}>
                  <td style={s.td}>
                    <button style={s.linkBtn} onClick={() => navigate(`/superadmin/empresas/${emp.id}`)}>
                      {emp.nome}
                    </button>
                  </td>
                  <td style={{ ...s.td, color: "#555" }}>{emp.cnpj || "—"}</td>
                  <td style={s.td}>
                    <span style={s.planoTag}>{emp.plano}</span>
                  </td>
                  <td style={s.td}><Badge status={emp.fatura_status} /></td>
                  <td style={s.td}>
                    <span style={{ ...s.statusDot, background: emp.ativo ? "#1D9E75" : "#D85A30" }} />
                    <span style={{ color: emp.ativo ? "#1D9E75" : "#D85A30", fontSize: 12 }}>
                      {emp.ativo ? "Ativa" : emp.motivo_bloqueio || "Bloqueada"}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: "#444", fontSize: 11 }}>
                    {emp.created_at ? new Date(emp.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={s.td}>
                    <button
                      style={{ ...s.actionBtn, color: emp.ativo ? "#e06040" : "#1D9E75" }}
                      onClick={() => toggleStatus(emp)}
                      disabled={bloqueando === emp.id}
                    >
                      {bloqueando === emp.id ? "…" : emp.ativo ? "Bloquear" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ModalCriar onClose={() => setShowModal(false)} onCreated={carregar} />
      )}
    </SuperadminLayout>
  )
}

const s = {
    logoRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 4 },
logoPreview: { width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid #252525" },
uploadBtn: {
  background: "#1a1a1a", border: "1px solid #252525", color: "#777",
  borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: "pointer",
  fontFamily: "inherit",
},
  root: { padding: "36px 40px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  title: { color: "#ddd", fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 },
  loading: { color: "#555", fontSize: 13 },
  newBtn: {
    background: "#534AB7", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.02em",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    color: "#444", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e1e22",
  },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: { padding: "13px 12px", color: "#bbb", verticalAlign: "middle" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500 },
  planoTag: {
    fontSize: 10, color: "#9b95ff", background: "#1e1b3a",
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em",
  },
  statusDot: { display: "inline-block", width: 6, height: 6, borderRadius: "50%", marginRight: 6 },
  linkBtn: {
    background: "none", border: "none", color: "#c9c7ff", cursor: "pointer",
    fontSize: 13, fontFamily: "inherit", padding: 0, textDecoration: "none",
  },
  actionBtn: {
    background: "none", border: "1px solid #252525", borderRadius: 6,
    padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  // Modal
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#141416", border: "1px solid #252525", borderRadius: 16,
    width: "100%", maxWidth: 560, padding: "28px 32px", maxHeight: "90vh", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { color: "#ddd", fontSize: 16, fontWeight: 600 },
  closeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: "#534AB7", fontSize: 10, letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: 12,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { color: "#555", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" },
  input: {
    background: "#0f0f10", border: "1px solid #252525", borderRadius: 7,
    color: "#ccc", fontSize: 12, padding: "9px 10px", outline: "none", fontFamily: "inherit",
  },
  erro: {
    background: "#2a1010", border: "1px solid #4a1010", color: "#e07070",
    borderRadius: 8, padding: "9px 12px", fontSize: 12, marginBottom: 16,
  },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 },
  cancelBtn: {
    background: "none", border: "1px solid #252525", color: "#666",
    borderRadius: 8, padding: "9px 18px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  },
  confirmBtn: {
    background: "#534AB7", color: "#fff", border: "none",
    borderRadius: 8, padding: "9px 20px", fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
}
