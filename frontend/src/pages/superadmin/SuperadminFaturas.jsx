import { useEffect, useState } from "react"
import SuperadminLayout from "../../components/SuperadminLayout"
import api from "../../services/superadminApi"

const brl = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const STATUS_CFG = {
  pago: { label: "Pago", color: "#1D9E75", bg: "#0d2a1e" },
  pendente: { label: "Pendente", color: "#c09040", bg: "#2a2010" },
  vencido: { label: "Vencido", color: "#e06040", bg: "#2a1010" },
  cancelado: { label: "Cancelado", color: "#555", bg: "#1a1a1a" },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: "#666", bg: "#1a1a1a" }
  return (
    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

export default function SuperadminFaturas() {
  const [faturas, setFaturas] = useState([])
  const [filtroStatus, setFiltroStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)
  const [processandoVenc, setProcessandoVenc] = useState(false)

  const carregar = () => {
    setLoading(true)
    const params = filtroStatus ? `?status=${filtroStatus}` : ""
    api.get(`/superadmin/faturas${params}`).then((r) => setFaturas(r.data)).finally(() => setLoading(false))
  }

  useEffect(carregar, [filtroStatus])

  async function pagar(faturaId) {
    setProcessando(faturaId)
    await api.patch(`/superadmin/faturas/${faturaId}/pagar`, {})
    setProcessando(null)
    carregar()
  }

  async function cancelar(faturaId) {
    if (!confirm("Cancelar esta fatura?")) return
    await api.patch(`/superadmin/faturas/${faturaId}/cancelar`)
    carregar()
  }

  async function processarVencimentos() {
    setProcessandoVenc(true)
    const { data } = await api.post("/superadmin/faturas/processar-vencimentos")
    alert(`${data.vencidas} fatura(s) vencida(s). ${data.empresas_bloqueadas} empresa(s) bloqueada(s).`)
    setProcessandoVenc(false)
    carregar()
  }

  const vencidas = faturas.filter((f) => f.status === "vencido").length

  return (
    <SuperadminLayout>
      <div style={s.root}>
        <div style={s.header}>
          <h1 style={s.title}>Faturas</h1>
          <div style={s.headerActions}>
            <button
              style={{ ...s.warnBtn, opacity: processandoVenc ? 0.6 : 1 }}
              onClick={processarVencimentos}
              disabled={processandoVenc}
            >
              {processandoVenc ? "Processando…" : "⚡ Processar vencimentos"}
            </button>
          </div>
        </div>

        {vencidas > 0 && (
          <div style={s.alert}>
            ⚠ {vencidas} fatura{vencidas > 1 ? "s" : ""} vencida{vencidas > 1 ? "s" : ""} — clique em "Processar vencimentos" para bloquear automaticamente as empresas inadimplentes
          </div>
        )}

        {/* Filtros */}
        <div style={s.filters}>
          {["", "pendente", "pago", "vencido", "cancelado"].map((st) => (
            <button
              key={st}
              style={{ ...s.filterBtn, ...(filtroStatus === st ? s.filterActive : {}) }}
              onClick={() => setFiltroStatus(st)}
            >
              {st || "Todas"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.loading}>Carregando…</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Empresa", "Valor", "Vencimento", "Status", "Pago em", ""].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faturas.map((f) => (
                <tr key={f.id} style={s.tr}>
                  <td style={s.td}>{f.empresa_nome}</td>
                  <td style={s.td}>{brl(f.valor)}</td>
                  <td style={{ ...s.td, fontSize: 11, color: "#666" }}>
                    {new Date(f.vencimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={s.td}><StatusBadge status={f.status} /></td>
                  <td style={{ ...s.td, fontSize: 11, color: "#555" }}>
                    {f.pago_em ? new Date(f.pago_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ ...s.td, display: "flex", gap: 8 }}>
                    {(f.status === "pendente" || f.status === "vencido") && (
                      <button
                        style={{ ...s.actionBtn, color: "#1D9E75", borderColor: "#1D9E75", opacity: processando === f.id ? 0.5 : 1 }}
                        onClick={() => pagar(f.id)} disabled={processando === f.id}
                      >
                        {processando === f.id ? "…" : "Pagar"}
                      </button>
                    )}
                    {f.status !== "cancelado" && f.status !== "pago" && (
                      <button
                        style={{ ...s.actionBtn, color: "#666" }}
                        onClick={() => cancelar(f.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {faturas.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#444", padding: 32 }}>
                    Nenhuma fatura encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </SuperadminLayout>
  )
}

const s = {
  root: { padding: "36px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { color: "#ddd", fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 },
  headerActions: { display: "flex", gap: 10 },
  loading: { color: "#555", fontSize: 13 },
  alert: {
    background: "#2a1810", border: "1px solid #4a2810", color: "#e09050",
    borderRadius: 10, padding: "11px 16px", fontSize: 12, marginBottom: 20,
  },
  warnBtn: {
    background: "#1e1810", border: "1px solid #534AB7", color: "#9b95ff",
    borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  },
  filters: { display: "flex", gap: 6, marginBottom: 20 },
  filterBtn: {
    background: "none", border: "1px solid #252525", color: "#555",
    borderRadius: 20, padding: "5px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  filterActive: { background: "#1e1b3a", borderColor: "#534AB7", color: "#9b95ff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    color: "#444", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e1e22",
  },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: { padding: "13px 12px", color: "#bbb", verticalAlign: "middle" },
  actionBtn: {
    background: "none", border: "1px solid #252525",
    borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
}
