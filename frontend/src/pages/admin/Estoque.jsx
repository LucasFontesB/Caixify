import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { tratarErroApi } from "../../services/errorHandler";

// ─── Formatação ───────────────────────────────────────────────────────────────
const brl = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatarData = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return `hoje ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `ontem ${hora}`;
  return d.toLocaleDateString("pt-BR") + " " + hora;
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS = [
  { value: "entrada", label: "↑ Entrada", desc: "Adiciona ao estoque"  },
  { value: "saida",   label: "↓ Saída",   desc: "Remove do estoque"    },
  { value: "ajuste",  label: "⇄ Ajuste",  desc: "Define valor exato"   },
];

const FORM_VAZIO = {
  produto_id:        "",
  tipo:              "entrada",
  quantidade:        "",
  valor_unitario:    "",
  valor_total:       "",
  referencia:        "",
  registrar_despesa: false,
  registrar_receita: false,
};

// ─── Componente Field ─────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <span style={s.fieldHint}>{hint}</span>}
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, hint, color = "#534AB7" }) {
  return (
    <div style={s.toggleRow}>
      <div style={s.toggleInfo}>
        <span style={s.toggleLabel}>{label}</span>
        {hint && <span style={s.toggleHint}>{hint}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          ...s.toggleTrack,
          background: checked ? color : "#e2e8f0",
        }}
      >
        <span style={{
          ...s.toggleThumb,
          transform: checked ? "translateX(18px)" : "translateX(2px)",
        }} />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Estoque() {
  const [produtos, setProdutos]           = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [form, setForm]                   = useState(FORM_VAZIO);
  const [salvando, setSalvando]           = useState(false);
  const [erro, setErro]                   = useState("");
  const [sucesso, setSucesso]             = useState("");

  // ── Carregamentos ───────────────────────────────────────────────────────────
  const carregarProdutos = useCallback(async () => {
    try {
      const res = await api.get("/produtos/");
      setProdutos(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, []);

  const carregarMovimentacoes = useCallback(async () => {
    try {
      const res = await api.get("/estoque/movimentacoes/");
      setMovimentacoes(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
    carregarMovimentacoes();
  }, [carregarProdutos, carregarMovimentacoes]);

  // ── Métricas derivadas ──────────────────────────────────────────────────────
  const totalEmEstoque    = produtos.filter((p) => p.estoque > 0).length;
  const abaixoDoMinimo    = produtos.filter((p) => p.estoque < p.estoque_minimo).length;
  const hoje              = new Date().toDateString();
  const movimentacoesHoje = movimentacoes.filter(
    (m) => new Date(m.created_at).toDateString() === hoje
  ).length;

  // ── Cálculo automático de valores ───────────────────────────────────────────
  const handleQuantidade = (valor) => {
    const qtd = Number(valor);
    const uni = Number(form.valor_unitario);
    const total = qtd > 0 && uni > 0 ? (qtd * uni).toFixed(2) : form.valor_total;
    setForm((f) => ({ ...f, quantidade: valor, valor_total: total }));
  };

  const handleValorUnitario = (valor) => {
    const uni = Number(valor);
    const qtd = Number(form.quantidade);
    const total = uni > 0 && qtd > 0 ? (uni * qtd).toFixed(2) : form.valor_total;
    setForm((f) => ({ ...f, valor_unitario: valor, valor_total: total }));
  };

  const handleValorTotal = (valor) => {
    const total = Number(valor);
    const qtd   = Number(form.quantidade);
    const uni   = total > 0 && qtd > 0 ? (total / qtd).toFixed(4) : form.valor_unitario;
    setForm((f) => ({ ...f, valor_total: valor, valor_unitario: uni }));
  };

  // ── Registrar movimentação ──────────────────────────────────────────────────
  const registrar = async () => {
    if (!form.produto_id) { setErro("Selecione um produto."); return; }
    if (!form.quantidade || Number(form.quantidade) <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }

    // Valida: se marcou registrar_despesa, valor_unitario é obrigatório
    if (form.registrar_despesa && (!form.valor_unitario || Number(form.valor_unitario) <= 0)) {
      setErro("Informe o valor unitário para registrar a despesa.");
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      await api.post("/estoque/movimentar/", {
        produto_id:        Number(form.produto_id),
        tipo:              form.tipo,
        quantidade:        Number(form.quantidade),
        referencia:        form.referencia || null,
        valor_unitario:    form.valor_unitario ? Number(form.valor_unitario) : null,
        registrar_despesa: form.registrar_despesa,
        registrar_receita: form.registrar_receita,
      });

      setSucesso("Movimentação registrada com sucesso!");
      setForm(FORM_VAZIO);
      await Promise.all([carregarProdutos(), carregarMovimentacoes()]);
      setTimeout(() => setSucesso(""), 3000);
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Produto selecionado (para mostrar preco_venda na receita)
  const produtoSelecionado = produtos.find((p) => p.id === Number(form.produto_id));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Cabeçalho */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Estoque</h1>
        <p style={s.pageSub}>Movimentações e níveis de estoque</p>
      </div>

      {/* Feedback */}
      {erro && (
        <div style={s.alertDanger} role="alert">
          {erro}
          <button style={s.alertClose} onClick={() => setErro("")}>✕</button>
        </div>
      )}
      {sucesso && (
        <div style={s.alertSuccess} role="status">{sucesso}</div>
      )}

      {/* Cards de resumo */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Produtos em estoque</div>
          <div style={s.statValue}>{totalEmEstoque}</div>
          <div style={s.statSub}>com quantidade &gt; 0</div>
        </div>

        <div style={{ ...s.statCard, ...(abaixoDoMinimo > 0 ? s.statWarn : {}) }}>
          <div style={s.statLabel}>Abaixo do mínimo</div>
          <div style={{ ...s.statValue, ...(abaixoDoMinimo > 0 ? s.statValueWarn : {}) }}>
            {abaixoDoMinimo}
          </div>
          <div style={s.statSub}>
            {abaixoDoMinimo > 0 ? "precisam de reposição" : "tudo em ordem"}
          </div>
        </div>

        <div style={s.statCard}>
          <div style={s.statLabel}>Movimentações hoje</div>
          <div style={s.statValue}>{movimentacoesHoje}</div>
          <div style={s.statSub}>entradas e saídas</div>
        </div>
      </div>

      {/* Colunas: formulário + histórico */}
      <div style={s.cols}>

        {/* ── Formulário ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Registrar movimentação</span>
          </div>

          <div style={s.cardBody}>
            {/* Tipo */}
            <Field label="Tipo">
              <div style={s.tipoBtns}>
                {TIPOS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    style={{
                      ...s.tipoBtn,
                      ...(form.tipo === value ? s.tipoBtnAtivo[value] : {}),
                    }}
                    onClick={() => setField("tipo", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p style={s.tipoDesc}>
                {TIPOS.find((t) => t.value === form.tipo)?.desc}
              </p>
            </Field>

            {/* Produto */}
            <Field label="Produto">
              <select
                style={s.input}
                value={form.produto_id}
                onChange={(e) => setField("produto_id", e.target.value)}
              >
                <option value="">Selecione um produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — estoque atual: {p.estoque ?? 0}
                  </option>
                ))}
              </select>
            </Field>

            {/* Quantidade */}
            <Field label={form.tipo === "ajuste" ? "Novo valor do estoque" : "Quantidade"}>
              <input
                style={s.input}
                type="number"
                min="1"
                placeholder="0"
                value={form.quantidade}
                onChange={(e) => handleQuantidade(e.target.value)}
              />
            </Field>

            {/* Valores — só para entrada */}
            {form.tipo === "entrada" && (
              <div style={s.valoresGrid}>
                <Field label="Valor unitário" hint="Preço pago por unidade">
                  <div style={s.inputPrefix}>
                    <span style={s.prefix}>R$</span>
                    <input
                      style={{ ...s.input, ...s.inputWithPrefix }}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={form.valor_unitario}
                      onChange={(e) => handleValorUnitario(e.target.value)}
                    />
                  </div>
                </Field>

                <Field label="Valor total" hint="Total da compra / NF">
                  <div style={s.inputPrefix}>
                    <span style={s.prefix}>R$</span>
                    <input
                      style={{ ...s.input, ...s.inputWithPrefix }}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={form.valor_total}
                      onChange={(e) => handleValorTotal(e.target.value)}
                    />
                  </div>
                </Field>
              </div>
            )}

            {/* Toggle: registrar como despesa (só entrada) */}
            {form.tipo === "entrada" && (
              <Toggle
                checked={form.registrar_despesa}
                onChange={(v) => setField("registrar_despesa", v)}
                label="Registrar como despesa"
                hint={
                  form.valor_unitario && form.quantidade
                    ? `Será criada uma despesa de ${brl(Number(form.valor_unitario) * Number(form.quantidade))}`
                    : "Informe o valor unitário para calcular"
                }
                color="#D85A30"
              />
            )}

            {/* Toggle: registrar como receita (só saída) */}
            {form.tipo === "saida" && (
              <Toggle
                checked={form.registrar_receita}
                onChange={(v) => setField("registrar_receita", v)}
                label="Registrar como receita no caixa"
                hint={
                  produtoSelecionado && form.quantidade
                    ? `Será criada uma receita de ${brl(Number(produtoSelecionado.preco_venda) * Number(form.quantidade))}`
                    : "Baseado no preço de venda do produto"
                }
                color="#1D9E75"
              />
            )}

            {/* Referência */}
            <Field label="Referência / Observação (opcional)">
              <input
                style={s.input}
                placeholder="Ex: NF 00123, Compra fornecedor..."
                value={form.referencia}
                onChange={(e) => setField("referencia", e.target.value)}
              />
            </Field>

            <button
              style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
              onClick={registrar}
              disabled={salvando}
            >
              {salvando ? "Registrando..." : "Registrar movimentação"}
            </button>
          </div>
        </div>

        {/* ── Histórico ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Histórico de movimentações</span>
            <span style={s.cardSub}>Últimas 20</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Produto</th>
                  <th style={s.th}>Tipo</th>
                  <th style={s.th}>Qtd</th>
                  <th style={s.th}>Referência</th>
                  <th style={s.th}>Data</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={s.emptyRow}>
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td style={{ ...s.td, ...s.tdNome }}>
                        {m.produto_nome ?? `Produto #${m.produto_id}`}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...s.badgeTipo[m.tipo] }}>
                          {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}
                        </span>
                      </td>
                      <td style={{ ...s.td, ...s.qtdCor[m.tipo] }}>
                        {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : "→"}{m.quantidade}
                      </td>
                      <td style={{ ...s.td, ...s.tdMuted }}>{m.referencia || "—"}</td>
                      <td style={{ ...s.td, ...s.tdMuted }}>{formatarData(m.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Tabela de saldo atual ── */}
      <div style={{ ...s.card, marginTop: "16px" }}>
        <div style={s.cardHeader}>
          <span style={s.cardTitle}>Saldo atual por produto</span>
          <span style={s.cardSub}>{produtos.length} produtos</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Produto</th>
                <th style={s.th}>Estoque atual</th>
                <th style={s.th}>Estoque mínimo</th>
                <th style={s.th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={s.emptyRow}>Nenhum produto cadastrado</td>
                </tr>
              ) : (
                produtos.map((p) => {
                  const qtd    = p.estoque ?? 0;
                  const min    = p.estoque_minimo ?? 0;
                  const zerado = qtd === 0;
                  const abaixo = qtd < min;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...s.td, ...s.tdNome }}>{p.nome}</td>
                      <td style={{
                        ...s.td,
                        fontWeight: "600",
                        color: zerado ? "#D85A30" : "#0f172a",
                      }}>
                        {qtd}
                      </td>
                      <td style={{ ...s.td, ...s.tdMuted }}>{min}</td>
                      <td style={s.td}>
                        {zerado ? (
                          <span style={{ ...s.badge, background: "#FAECE7", color: "#4A1B0C" }}>
                            Sem estoque
                          </span>
                        ) : abaixo ? (
                          <span style={{ ...s.badge, background: "#FAEEDA", color: "#633806" }}>
                            Abaixo do mínimo
                          </span>
                        ) : (
                          <span style={{ ...s.badge, background: "#E1F5EE", color: "#085041" }}>
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
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
  alertSuccess: {
    background: "#EAF3DE", border: "1px solid #C0DD97",
    borderRadius: "8px", padding: "10px 14px",
    fontSize: "13px", color: "#3B6D11", marginBottom: "16px",
  },
  alertClose: { background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "14px", padding: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" },

  statCard:      { background: "#ffffff", borderRadius: "10px", padding: "14px 16px", border: "1px solid #f1f5f9" },
  statWarn:      { border: "1px solid #FAC775", background: "#FAEEDA" },
  statLabel:     { fontSize: "11px", color: "#94a3b8", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" },
  statValue:     { fontSize: "22px", fontWeight: "600", color: "#0f172a" },
  statValueWarn: { color: "#854F0B" },
  statSub:       { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },

  cols: { display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "16px", alignItems: "start" },

  card:       { background: "#ffffff", borderRadius: "12px", border: "1px solid #f1f5f9", overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f8fafc" },
  cardTitle:  { fontSize: "13px", fontWeight: "600", color: "#0f172a" },
  cardSub:    { fontSize: "12px", color: "#94a3b8" },
  cardBody:   { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" },

  field:      { display: "flex", flexDirection: "column", gap: "5px" },
  fieldLabel: { fontSize: "11px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.4px" },
  fieldHint:  { fontSize: "11px", color: "#94a3b8" },

  input: {
    padding: "8px 10px", borderRadius: "7px",
    border: "1px solid #e2e8f0", background: "#f8fafc",
    fontSize: "13px", color: "#0f172a", outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  },

  valoresGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  inputPrefix:    { display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#f8fafc", overflow: "hidden" },
  prefix:         { padding: "8px 10px", fontSize: "13px", color: "#94a3b8", background: "#f1f5f9", borderRight: "1px solid #e2e8f0", flexShrink: 0 },
  inputWithPrefix:{ border: "none", background: "transparent", borderRadius: 0, width: "100%" },

  tipoBtns: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" },
  tipoBtn:  { padding: "8px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "none", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", color: "#64748b" },
  tipoBtnAtivo: {
    entrada: { border: "1.5px solid #1D9E75", background: "#E1F5EE", color: "#085041" },
    saida:   { border: "1.5px solid #D85A30", background: "#FAECE7", color: "#4A1B0C" },
    ajuste:  { border: "1.5px solid #534AB7", background: "#EEEDFE", color: "#26215C" },
  },
  tipoDesc: { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },

  // Toggle
  toggleRow:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" },
  toggleInfo:  { display: "flex", flexDirection: "column", gap: "2px" },
  toggleLabel: { fontSize: "13px", fontWeight: "500", color: "#0f172a" },
  toggleHint:  { fontSize: "11px", color: "#94a3b8" },
  toggleTrack: { width: "40px", height: "22px", borderRadius: "999px", border: "none", cursor: "pointer", padding: 0, position: "relative", transition: "background 0.2s", flexShrink: 0 },
  toggleThumb: { position: "absolute", top: "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#ffffff", transition: "transform 0.2s", display: "block" },

  btnPrimary:  { width: "100%", padding: "10px", background: "#534AB7", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", marginTop: "4px" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },

  table: { width: "100%", borderCollapse: "collapse" },
  th:    { textAlign: "left", padding: "10px 16px", fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #f1f5f9" },
  td:    { padding: "11px 16px", fontSize: "13px", color: "#334155", borderBottom: "1px solid #f8fafc" },
  tdNome:  { fontWeight: "500", color: "#0f172a" },
  tdMuted: { color: "#94a3b8", fontSize: "12px" },
  emptyRow: { textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: "13px" },

  badge: { fontSize: "11px", padding: "3px 8px", borderRadius: "999px", fontWeight: "500" },
  badgeTipo: {
    entrada: { background: "#E1F5EE", color: "#085041" },
    saida:   { background: "#FAECE7", color: "#4A1B0C" },
    ajuste:  { background: "#EEEDFE", color: "#26215C" },
  },
  qtdCor: {
    entrada: { color: "#1D9E75", fontWeight: "600" },
    saida:   { color: "#D85A30", fontWeight: "600" },
    ajuste:  { color: "#534AB7", fontWeight: "600" },
  },
};