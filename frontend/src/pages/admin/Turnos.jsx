import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { tratarErroApi } from "../../services/errorHandler";

// ─── Formatação ───────────────────────────────────────────────────────────────
const brl = (v) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const duracao = (abertoEm, fechadoEm) => {
  if (!fechadoEm) return "Em andamento";
  const diff = new Date(fechadoEm) - new Date(abertoEm);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const hoje = () => new Date().toISOString().split("T")[0];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Turnos() {
  const [turnos, setTurnos]     = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtros, setFiltros]   = useState({
    inicio:     hoje(),
    fim:        hoje(),
    usuario_id: "",
    status:     "",
  });
  const [erro, setErro] = useState("");

  // ── Carregamentos ───────────────────────────────────────────────────────────
  const carregarUsuarios = useCallback(async () => {
    try {
      const res = await api.get("/usuarios/");
      setUsuarios(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, []);

  const carregarTurnos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.inicio)     params.append("data_inicio",  filtros.inicio);
      if (filtros.fim)        params.append("data_fim",     filtros.fim);
      if (filtros.usuario_id) params.append("usuario_id",  filtros.usuario_id);
      if (filtros.status)     params.append("status",      filtros.status);

      const res = await api.get(`/turnos/?${params.toString()}`);
      setTurnos(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, [filtros]);

  useEffect(() => { carregarUsuarios(); }, [carregarUsuarios]);
  useEffect(() => { carregarTurnos();  }, [carregarTurnos]);

  // ── Métricas derivadas ──────────────────────────────────────────────────────
  const totalVendas    = turnos.reduce((a, t) => a + (t.total_vendas ?? 0), 0);
  const totalNumVendas = turnos.reduce((a, t) => a + (t.num_vendas  ?? 0), 0);
  const turnosAbertos  = turnos.filter((t) => t.status === "aberto").length;

  const setFiltro = (f, v) => setFiltros((p) => ({ ...p, [f]: v }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Turnos</h1>
        <p style={s.pageSub}>Histórico de turnos e operadores</p>
      </div>

      {erro && (
        <div style={s.alertDanger} role="alert">
          {erro}
          <button style={s.alertClose} onClick={() => setErro("")}>✕</button>
        </div>
      )}

      {/* Resumo */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Turnos no período</div>
          <div style={s.statValue}>{turnos.length}</div>
        </div>
        <div style={{ ...s.statCard, ...(turnosAbertos > 0 ? s.statInfo : {}) }}>
          <div style={s.statLabel}>Turnos abertos agora</div>
          <div style={{ ...s.statValue, ...(turnosAbertos > 0 ? s.statValueInfo : {}) }}>
            {turnosAbertos}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Vendas no período</div>
          <div style={s.statValue}>{totalNumVendas}</div>
        </div>
        <div style={{ ...s.statCard, ...s.statSuccess }}>
          <div style={s.statLabel}>Faturamento</div>
          <div style={{ ...s.statValue, ...s.statValueSuccess }}>{brl(totalVendas)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.card}>
        <div style={s.cardHeader}><span style={s.cardTitle}>Filtros</span></div>
        <div style={{ ...s.cardBody, flexDirection: "row", flexWrap: "wrap", gap: "12px" }}>
          <div style={s.field}>
            <label style={s.fieldLabel}>De</label>
            <input style={s.input} type="date" value={filtros.inicio}
              onChange={(e) => setFiltro("inicio", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Até</label>
            <input style={s.input} type="date" value={filtros.fim}
              onChange={(e) => setFiltro("fim", e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Operador</label>
            <select style={s.input} value={filtros.usuario_id}
              onChange={(e) => setFiltro("usuario_id", e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Status</label>
            <select style={s.input} value={filtros.status}
              onChange={(e) => setFiltro("status", e.target.value)}>
              <option value="">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de turnos */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.cardTitle}>Turnos</span>
          <span style={s.cardSub}>{turnos.length} registros</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Operador</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Abertura</th>
                <th style={s.th}>Fechamento</th>
                <th style={s.th}>Duração</th>
                <th style={s.th}>Saldo inicial</th>
                <th style={s.th}>Saldo final</th>
                <th style={s.th}>Vendas</th>
                <th style={s.th}>Total vendido</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={10} style={s.emptyRow}>Nenhum turno encontrado</td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <tr key={t.id}>
                    <td style={{ ...s.td, ...s.tdMuted }}>#{t.id}</td>
                    <td style={{ ...s.td, ...s.tdNome }}>{t.usuario_nome}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        ...(t.status === "aberto" ? s.badgeAberto : s.badgeFechado),
                      }}>
                        {t.status === "aberto" ? "● Aberto" : "Fechado"}
                      </span>
                    </td>
                    <td style={{ ...s.td, ...s.tdMuted }}>{fmtData(t.aberto_em)}</td>
                    <td style={{ ...s.td, ...s.tdMuted }}>{fmtData(t.fechado_em)}</td>
                    <td style={{ ...s.td, ...s.tdMuted }}>{duracao(t.aberto_em, t.fechado_em)}</td>
                    <td style={s.td}>{brl(t.saldo_abertura)}</td>
                    <td style={s.td}>{t.saldo_fechamento !== null ? brl(t.saldo_fechamento) : "—"}</td>
                    <td style={s.td}>{t.num_vendas}</td>
                    <td style={{ ...s.td, fontWeight: "600", color: "#1D9E75" }}>
                      {brl(t.total_vendas)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page:       { padding: "24px", background: "#f1f5f9", minHeight: "100vh" },
  pageHeader: { marginBottom: "20px" },
  pageTitle:  { fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: 0 },
  pageSub:    { fontSize: "13px", color: "#94a3b8", marginTop: "2px" },

  alertDanger: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "8px", padding: "10px 14px",
    fontSize: "13px", color: "#dc2626", marginBottom: "16px",
  },
  alertClose: { background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "14px", padding: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" },
  statCard:  { background: "#ffffff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #f1f5f9" },
  statSuccess:{ border: "1px solid #C0DD97", background: "#EAF3DE" },
  statInfo:   { border: "1px solid #B5D4F4", background: "#E6F1FB" },
  statLabel:  { fontSize: "11px", color: "#94a3b8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" },
  statValue:        { fontSize: "22px", fontWeight: "600", color: "#0f172a" },
  statValueSuccess: { color: "#1D9E75" },
  statValueInfo:    { color: "#185FA5" },

  card:       { background: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9", overflow: "hidden", marginBottom: "16px" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f8fafc" },
  cardTitle:  { fontSize: "13px", fontWeight: "600", color: "#0f172a" },
  cardSub:    { fontSize: "12px", color: "#94a3b8" },
  cardBody:   { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" },

  field:      { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: { fontSize: "11px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: {
    padding: "8px 10px", borderRadius: "7px",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    fontSize: "13px", color: "#0f172a", outline: "none",
    fontFamily: "inherit", width: "140px", boxSizing: "border-box",
  },

  table:   { width: "100%", borderCollapse: "collapse" },
  th:      { textAlign: "left", padding: "10px 14px", fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #f1f5f9" },
  td:      { padding: "11px 14px", fontSize: "13px", color: "#334155", borderBottom: "1px solid #f8fafc" },
  tdNome:  { fontWeight: "500", color: "#0f172a" },
  tdMuted: { color: "#94a3b8", fontSize: "12px" },
  emptyRow:{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" },

  badge:       { fontSize: "11px", padding: "3px 8px", borderRadius: "999px", fontWeight: "500" },
  badgeAberto: { background: "#E6F1FB", color: "#185FA5" },
  badgeFechado:{ background: "#f1f5f9", color: "#64748b" },
};