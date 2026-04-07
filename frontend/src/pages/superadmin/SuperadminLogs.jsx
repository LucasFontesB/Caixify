import { useEffect, useState } from "react"
import SuperadminLayout from "../../components/SuperadminLayout"
import api from "../../services/superadminApi"

const ACAO_CFG = {
  login: { color: "#555", label: "login" },
  criar_empresa: { color: "#534AB7", label: "criar empresa" },
  bloquear_empresa: { color: "#e06040", label: "bloquear" },
  ativar_empresa: { color: "#1D9E75", label: "ativar" },
  deletar_empresa: { color: "#e06040", label: "deletar" },
  registrar_pagamento: { color: "#1D9E75", label: "pagamento" },
  criar_fatura: { color: "#c09040", label: "criar fatura" },
  cancelar_fatura: { color: "#555", label: "cancelar fatura" },
  processar_vencimentos: { color: "#c09040", label: "vencimentos" },
}

function AcaoBadge({ acao }) {
  const cfg = ACAO_CFG[acao] || { color: "#666", label: acao }
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 20,
      color: cfg.color, background: cfg.color + "20",
      letterSpacing: "0.04em",
    }}>
      {cfg.label}
    </span>
  )
}

function SnapshotView({ snapshot }) {
  const [open, setOpen] = useState(false)
  if (!snapshot) return <span style={{ color: "#333", fontSize: 11 }}>—</span>
  return (
    <div>
      <button
        style={{ background: "none", border: "none", color: "#534AB7", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▴ ocultar" : "▾ ver diff"}
      </button>
      {open && (
        <pre style={{
          background: "#0a0a0b", border: "1px solid #1e1e22", borderRadius: 6,
          padding: "8px 10px", fontSize: 10, color: "#777", marginTop: 6,
          overflowX: "auto", maxWidth: 320,
        }}>
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function SuperadminLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtroAcao, setFiltroAcao] = useState("")
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const carregar = () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset })
    if (filtroAcao) params.set("acao", filtroAcao)
    api.get(`/superadmin/logs?${params}`).then((r) => {
      setLogs(r.data.items)
      setTotal(r.data.total)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    setOffset(0)
  }, [filtroAcao])

  useEffect(carregar, [filtroAcao, offset])

  const acoes = Object.keys(ACAO_CFG)

  return (
    <SuperadminLayout>
      <div style={s.root}>
        <div style={s.header}>
          <h1 style={s.title}>Auditoria</h1>
          <span style={s.totalTag}>{total} registros</span>
        </div>

        {/* Filtro de ação */}
        <div style={s.filters}>
          <button
            style={{ ...s.filterBtn, ...(filtroAcao === "" ? s.filterActive : {}) }}
            onClick={() => setFiltroAcao("")}
          >
            Todas
          </button>
          {acoes.map((a) => (
            <button
              key={a}
              style={{ ...s.filterBtn, ...(filtroAcao === a ? s.filterActive : {}) }}
              onClick={() => setFiltroAcao(a)}
            >
              {ACAO_CFG[a].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.loading}>Carregando…</div>
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Data", "Ação", "Empresa", "IP", "Diff"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={s.tr}>
                    <td style={{ ...s.td, fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
                      {new Date(log.data).toLocaleString("pt-BR")}
                    </td>
                    <td style={s.td}><AcaoBadge acao={log.acao} /></td>
                    <td style={{ ...s.td, color: "#888" }}>{log.empresa_nome || "—"}</td>
                    <td style={{ ...s.td, color: "#444", fontSize: 11 }}>{log.ip || "—"}</td>
                    <td style={s.td}><SnapshotView snapshot={log.snapshot} /></td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#444", padding: 32 }}>
                      Nenhum registro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Paginação */}
            {total > LIMIT && (
              <div style={s.pagination}>
                <button style={s.pageBtn} onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>
                  ← anterior
                </button>
                <span style={s.pageInfo}>{offset + 1}–{Math.min(offset + LIMIT, total)} de {total}</span>
                <button style={s.pageBtn} onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}>
                  próximo →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SuperadminLayout>
  )
}

const s = {
  root: { padding: "36px 40px" },
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
  title: { color: "#ddd", fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 },
  totalTag: { fontSize: 11, color: "#555" },
  loading: { color: "#555", fontSize: 13 },
  filters: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  filterBtn: {
    background: "none", border: "1px solid #252525", color: "#555",
    borderRadius: 20, padding: "4px 12px", fontSize: 10, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.04em",
  },
  filterActive: { background: "#1e1b3a", borderColor: "#534AB7", color: "#9b95ff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    color: "#444", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e1e22",
  },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: { padding: "11px 12px", color: "#bbb", verticalAlign: "top" },
  pagination: { display: "flex", alignItems: "center", gap: 16, marginTop: 20 },
  pageBtn: {
    background: "none", border: "1px solid #252525", color: "#666",
    borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  pageInfo: { color: "#444", fontSize: 11 },
}
