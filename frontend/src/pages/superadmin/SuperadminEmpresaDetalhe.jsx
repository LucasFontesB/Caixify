import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import SuperadminLayout from "../../components/SuperadminLayout"
import api from "../../services/superadminApi"

const brl = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const STATUS_CORES = {
  pago: "#1D9E75",
  pendente: "#c09040",
  vencido: "#e06040",
  cancelado: "#555",
}

export default function SuperadminEmpresaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [novaFatura, setNovaFatura] = useState({ valor: "", vencimento: "", obs: "" })
  const [criandoFatura, setCriandoFatura] = useState(false)

  const carregar = () => {
    setLoading(true)
    api.get(`/superadmin/empresas/${id}`).then((r) => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(carregar, [id])

  async function criarFatura() {
    if (!novaFatura.valor || !novaFatura.vencimento) return
    setCriandoFatura(true)
    try {
      await api.post("/superadmin/faturas", {
        empresa_id: parseInt(id),
        valor: Math.round(parseFloat(novaFatura.valor) * 100),
        vencimento: new Date(novaFatura.vencimento).toISOString(),
        obs: novaFatura.obs || undefined,
      })
      setNovaFatura({ valor: "", vencimento: "", obs: "" })
      carregar()
    } finally {
      setCriandoFatura(false)
    }
  }

  async function pagarFatura(faturaId) {
    await api.patch(`/superadmin/faturas/${faturaId}/pagar`, {})
    carregar()
  }

  async function toggleStatus() {
    const emp = data.empresa
    await api.patch(`/superadmin/empresas/${id}/status`, {
      ativo: !emp.ativo,
      motivo_bloqueio: emp.ativo ? "manual" : null,
    })
    carregar()
  }

  if (loading || !data) return (
    <SuperadminLayout><div style={s.loading}>Carregando…</div></SuperadminLayout>
  )

  const { empresa, usuarios, faturas } = data

  return (
    <SuperadminLayout>
      <div style={s.root}>
        <button style={s.back} onClick={() => navigate("/superadmin/empresas")}>← Empresas</button>

        <div style={s.header}>
          <div>
            <h1 style={s.title}>{empresa.nome}</h1>
            <div style={s.meta}>
              {empresa.cnpj && <span>{empresa.cnpj}</span>}
              {empresa.contato && <span>{empresa.contato}</span>}
              <span style={s.planoTag}>{empresa.plano}</span>
            </div>
          </div>
          <div style={s.headerActions}>
            <div style={{ ...s.statusChip, background: empresa.ativo ? "#0d2a1e" : "#2a1010" }}>
              <span style={{ ...s.statusDot, background: empresa.ativo ? "#1D9E75" : "#e06040" }} />
              <span style={{ color: empresa.ativo ? "#1D9E75" : "#e06040", fontSize: 12 }}>
                {empresa.ativo ? "Ativa" : empresa.motivo_bloqueio || "Bloqueada"}
              </span>
            </div>
            <button
              style={{ ...s.toggleBtn, color: empresa.ativo ? "#e06040" : "#1D9E75" }}
              onClick={toggleStatus}
            >
              {empresa.ativo ? "Bloquear acesso" : "Ativar acesso"}
            </button>
          </div>
        </div>

        <div style={s.grid}>
          {/* Usuários */}
          <div style={s.card}>
            <div style={s.cardTitle}>Usuários ({usuarios.length})</div>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Nome", "Login", "Tipo", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>{u.nome}</td>
                    <td style={{ ...s.td, color: "#666" }}>{u.login}</td>
                    <td style={s.td}>
                      <span style={{ ...s.tipoBadge, ...(u.tipo === "admin" ? s.tipoAdmin : {}) }}>
                        {u.tipo}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.statusDot, background: u.ativo ? "#1D9E75" : "#555", display: "inline-block" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Faturas */}
          <div style={s.card}>
            <div style={s.cardTitle}>Faturas</div>

            {/* Nova fatura */}
            <div style={s.novaFatura}>
              <div style={s.novaFaturaRow}>
                <div style={s.field}>
                  <label style={s.label}>Valor (R$)</label>
                  <input
                    style={s.input} type="number" placeholder="99.90"
                    value={novaFatura.valor}
                    onChange={(e) => setNovaFatura({ ...novaFatura, valor: e.target.value })}
                  />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Vencimento</label>
                  <input
                    style={s.input} type="date"
                    value={novaFatura.vencimento}
                    onChange={(e) => setNovaFatura({ ...novaFatura, vencimento: e.target.value })}
                  />
                </div>
                <button
                  style={{ ...s.addBtn, opacity: criandoFatura ? 0.6 : 1 }}
                  onClick={criarFatura} disabled={criandoFatura}
                >
                  {criandoFatura ? "…" : "+ Gerar"}
                </button>
              </div>
            </div>

            <table style={s.table}>
              <thead>
                <tr>
                  {["Valor", "Vencimento", "Status", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {faturas.map((f) => (
                  <tr key={f.id} style={s.tr}>
                    <td style={s.td}>{brl(f.valor)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: "#666" }}>
                      {new Date(f.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={s.td}>
                      <span style={{ color: STATUS_CORES[f.status] || "#666", fontSize: 11 }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={s.td}>
                      {(f.status === "pendente" || f.status === "vencido") && (
                        <button style={s.pagarBtn} onClick={() => pagarFatura(f.id)}>
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {faturas.length === 0 && (
                  <tr><td colSpan={4} style={{ ...s.td, color: "#444", textAlign: "center" }}>Nenhuma fatura</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperadminLayout>
  )
}

const s = {
  root: { padding: "36px 40px" },
  loading: { padding: 40, color: "#555", fontSize: 13, fontFamily: "'DM Mono', monospace" },
  back: {
    background: "none", border: "none", color: "#555", cursor: "pointer",
    fontSize: 12, fontFamily: "inherit", padding: "0 0 20px", display: "block",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { color: "#ddd", fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em", margin: "0 0 8px" },
  meta: { display: "flex", gap: 12, color: "#555", fontSize: 12, alignItems: "center" },
  planoTag: {
    fontSize: 10, color: "#9b95ff", background: "#1e1b3a",
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em",
  },
  headerActions: { display: "flex", gap: 10, alignItems: "center" },
  statusChip: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: "50%" },
  toggleBtn: {
    background: "none", border: "1px solid #252525", borderRadius: 8,
    padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: {
    background: "#141416", border: "1px solid #1e1e22", borderRadius: 14,
    padding: "20px 22px",
  },
  cardTitle: { color: "#666", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { color: "#444", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #1e1e22" },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: { padding: "10px 8px", color: "#aaa", verticalAlign: "middle" },
  tipoBadge: { fontSize: 10, color: "#555", background: "#1a1a1a", padding: "2px 7px", borderRadius: 4 },
  tipoAdmin: { color: "#9b95ff", background: "#1e1b3a" },
  pagarBtn: {
    background: "none", border: "1px solid #1D9E75", color: "#1D9E75",
    borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  novaFatura: { marginBottom: 16 },
  novaFaturaRow: { display: "flex", gap: 8, alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  label: { color: "#444", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" },
  input: {
    background: "#0f0f10", border: "1px solid #222", borderRadius: 6,
    color: "#bbb", fontSize: 12, padding: "7px 9px", outline: "none", fontFamily: "inherit",
  },
  addBtn: {
    background: "#1e1b3a", border: "1px solid #534AB7", color: "#9b95ff",
    borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: "pointer",
    fontFamily: "inherit", whiteSpace: "nowrap",
  },
}
