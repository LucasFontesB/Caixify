import { useEffect, useState } from "react"
import SuperadminLayout from "../../components/SuperadminLayout"
import api from "../../services/superadminApi"

const brl = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...s.card, borderColor: accent ? "#534AB7" : "#1e1e22" }}>
      <div style={s.cardLabel}>{label}</div>
      <div style={{ ...s.cardValue, color: accent ? "#9b95ff" : "#ddd" }}>{value}</div>
      {sub && <div style={s.cardSub}>{sub}</div>}
    </div>
  )
}

export default function SuperadminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/superadmin/dashboard").then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <SuperadminLayout><div style={s.loading}>Carregando…</div></SuperadminLayout>
  if (!data) return null

  const cobertura = data.receita_prevista_mes > 0
    ? Math.round((data.receita_recebida_mes / data.receita_prevista_mes) * 100)
    : 0

  return (
    <SuperadminLayout>
      <div style={s.root}>
        <div style={s.header}>
          <h1 style={s.title}>Dashboard</h1>
          <span style={s.tag}>visão geral</span>
        </div>

        {/* Alertas */}
        {(data.faturas_vencidas > 0 || data.faturas_vencendo_7dias > 0) && (
          <div style={s.alertBox}>
            {data.faturas_vencidas > 0 && (
              <span style={s.alertItem}>
                ⚠ {data.faturas_vencidas} fatura{data.faturas_vencidas > 1 ? "s" : ""} vencida{data.faturas_vencidas > 1 ? "s" : ""}
              </span>
            )}
            {data.faturas_vencendo_7dias > 0 && (
              <span style={{ ...s.alertItem, ...s.alertWarn }}>
                ◷ {data.faturas_vencendo_7dias} vence{data.faturas_vencendo_7dias > 1 ? "m" : ""} em 7 dias
              </span>
            )}
          </div>
        )}

        {/* Métricas principais */}
        <div style={s.grid}>
          <MetricCard label="MRR" value={brl(data.mrr)} sub="receita recorrente" accent />
          <MetricCard label="Receita prevista" value={brl(data.receita_prevista_mes)} sub="este mês" />
          <MetricCard label="Recebido" value={brl(data.receita_recebida_mes)} sub={`${cobertura}% do previsto`} />
          <MetricCard label="Total de empresas" value={data.total_empresas} />
          <MetricCard label="Empresas ativas" value={data.empresas_ativas} />
          <MetricCard label="Bloqueadas" value={data.empresas_bloqueadas} sub="inadimplência / manual" />
          <MetricCard label="Novas este mês" value={data.empresas_novas_mes} />
          <MetricCard label="Faturas vencidas" value={data.faturas_vencidas} />
        </div>

        {/* Barra de cobertura */}
        <div style={s.barSection}>
          <div style={s.barLabel}>
            <span style={s.barLabelText}>Cobertura do mês</span>
            <span style={s.barPct}>{cobertura}%</span>
          </div>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: `${Math.min(cobertura, 100)}%` }} />
          </div>
        </div>
      </div>
    </SuperadminLayout>
  )
}

const s = {
  root: { padding: "36px 40px", maxWidth: 900 },
  loading: { padding: 40, color: "#555", fontFamily: "'DM Mono', monospace", fontSize: 13 },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  title: { color: "#ddd", fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 },
  tag: {
    fontSize: 9, color: "#534AB7", background: "#1e1b3a",
    padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em", textTransform: "uppercase",
  },
  alertBox: {
    display: "flex", gap: 12, marginBottom: 24, padding: "12px 16px",
    background: "#1a1210", border: "1px solid #3a2010", borderRadius: 10,
  },
  alertItem: { fontSize: 12, color: "#e07040" },
  alertWarn: { color: "#c09040" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12, marginBottom: 32,
  },
  card: {
    background: "#141416", border: "1px solid #1e1e22", borderRadius: 12,
    padding: "18px 20px",
  },
  cardLabel: { color: "#555", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 },
  cardValue: { color: "#ddd", fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em" },
  cardSub: { color: "#444", fontSize: 11, marginTop: 4 },
  barSection: {
    background: "#141416", border: "1px solid #1e1e22", borderRadius: 12, padding: "18px 20px",
  },
  barLabel: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  barLabelText: { color: "#555", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" },
  barPct: { color: "#9b95ff", fontSize: 13, fontWeight: 600 },
  barTrack: { background: "#1e1e22", borderRadius: 4, height: 6, overflow: "hidden" },
  barFill: { background: "#534AB7", height: "100%", borderRadius: 4, transition: "width 0.6s ease" },
}
