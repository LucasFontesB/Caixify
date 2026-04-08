import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { tratarErroApi } from "../../services/errorHandler";

// ─── Formatação de moeda ─────────────────────────────────────────────────────
const brl = (valor) =>
  Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Estado inicial do formulário ────────────────────────────────────────────
const FORM_VAZIO = {
  nome: "",
  codigo_barras: "",
  preco_venda: "",
  preco_custo: "",
  estoque_minimo: "",
  ativo: true,
};

// ─── Ícones ──────────────────────────────────────────────────────────────────
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z"
      stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ─── Componente de campo ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Produtos() {
  const [produtos, setProdutos]   = useState([]);
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState(FORM_VAZIO);
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState("");

  // ── Carrega produtos ──────────────────────────────────────────────────────
  const carregarProdutos = useCallback(async () => {
    try {
      const res = await api.get("/produtos/");
      setProdutos(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  // ── Criar produto ─────────────────────────────────────────────────────────
  const criarProduto = async () => {
    if (!form.nome.trim()) {
      setErro("O nome do produto é obrigatório.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await api.post("/produtos/", {
        ...form,
        preco_venda:    Number(form.preco_venda)    || 0,
        preco_custo:    Number(form.preco_custo)    || 0,
        estoque_minimo: Number(form.estoque_minimo) || 0,
      });

      setForm(FORM_VAZIO);
      await carregarProdutos();
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
};

  // ── Atualizar produto ─────────────────────────────────────────────────────
  const atualizarProduto = async () => {
    if (!editando?.id) return;

    setSalvando(true);
    setErro("");

    try {
      const payload = {
        ...editando,
        preco_venda:    Number(editando.preco_venda)    || 0,
        preco_custo:    Number(editando.preco_custo)    || 0,
        estoque_minimo: Number(editando.estoque_minimo) || 0,
      };

      const { data } = await api.put(`/produtos/${editando.id}`, payload);

      setProdutos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      setEditando(null);
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
  };

  // ── Helpers de formulário ─────────────────────────────────────────────────
  const setFormField  = (field, value) => setForm((f)     => ({ ...f,        [field]: value }));
  const setEditField  = (field, value) => setEditando((e) => ({ ...e,        [field]: value }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={s.page}>

        {/* Cabeçalho */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Produtos</h1>
            <p style={s.pageSub}>Cadastre e gerencie os produtos da loja</p>
          </div>
        </div>

        {/* Mensagem de erro global */}
        {erro && (
          <div style={s.errorBar} role="alert">
            {erro}
            <button style={s.errorClose} onClick={() => setErro("")}>
              <IconClose />
            </button>
          </div>
        )}

        {/* ── Card: formulário de cadastro ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Novo produto</span>
          </div>

          <div style={s.cardBody}>
            {/* Linha 1: Nome, Código, Status */}
            <div style={s.formGrid3}>
              <Field label="Nome">
                <input
                  style={s.input}
                  placeholder="Ex: Arroz 5kg"
                  value={form.nome}
                  onChange={(e) => setFormField("nome", e.target.value)}
                />
              </Field>

              <Field label="Código de barras">
                <input
                  style={s.input}
                  placeholder="7891234567890"
                  value={form.codigo_barras}
                  onChange={(e) => setFormField("codigo_barras", e.target.value)}
                />
              </Field>

              <Field label="Status">
                <label style={s.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setFormField("ativo", e.target.checked)}
                  />
                  <span style={s.checkboxLabel}>Ativo</span>
                </label>
              </Field>
            </div>

            {/* Linha 2: Preços, Estoque mínimo, Botão */}
            <div style={s.formGrid4}>
              <Field label="Preço de venda">
                <input
                  style={s.input}
                  placeholder="0,00"
                  value={form.preco_venda}
                  onChange={(e) => setFormField("preco_venda", e.target.value)}
                />
              </Field>

              <Field label="Preço de custo">
                <input
                  style={s.input}
                  placeholder="0,00"
                  value={form.preco_custo}
                  onChange={(e) => setFormField("preco_custo", e.target.value)}
                />
              </Field>

              <Field label="Estoque mínimo">
                <input
                  style={s.input}
                  placeholder="0"
                  value={form.estoque_minimo}
                  onChange={(e) => setFormField("estoque_minimo", e.target.value)}
                />
              </Field>

              <div style={s.formBtnWrapper}>
                <button
                  style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
                  onClick={criarProduto}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "+ Adicionar produto"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card: tabela de produtos ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Produtos cadastrados</span>
            <span style={s.cardCount}>{produtos.length} {produtos.length === 1 ? "produto" : "produtos"}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Código</th>
                  <th style={s.th}>Venda</th>
                  <th style={s.th}>Custo</th>
                  <th style={s.th}>Est. mín.</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th} />
                </tr>
              </thead>

              <tbody>
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={s.emptyRow}>
                      Nenhum produto cadastrado ainda
                    </td>
                  </tr>
                ) : (
                  produtos.map((p) => (
                    <tr key={p.id} style={s.tableRow}>
                      <td style={{ ...s.td, ...s.tdNome }}>{p.nome}</td>
                      <td style={{ ...s.td, ...s.tdMuted }}>{p.codigo_barras || "—"}</td>
                      <td style={s.td}>{brl(p.preco_venda)}</td>
                      <td style={s.td}>{brl(p.preco_custo)}</td>
                      <td style={s.td}>{p.estoque_minimo}</td>
                      <td style={s.td}>
                        {p.ativo
                          ? <span style={s.badgeAtivo}>Ativo</span>
                          : <span style={s.badgeInativo}>Inativo</span>
                        }
                      </td>
                      <td style={s.td}>
                        <button style={s.btnEdit} onClick={() => setEditando(p)}>
                          <IconEdit />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal de edição ── */}
      {editando && (
        <div style={s.modalOverlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>

            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Editar produto</span>
              <button style={s.modalClose} onClick={() => setEditando(null)}>
                <IconClose />
              </button>
            </div>

            <div style={s.modalBody}>
              <Field label="Nome">
                <input
                  style={s.input}
                  value={editando.nome}
                  onChange={(e) => setEditField("nome", e.target.value)}
                />
              </Field>

              <Field label="Código de barras">
                <input
                  style={s.input}
                  value={editando.codigo_barras || ""}
                  onChange={(e) => setEditField("codigo_barras", e.target.value)}
                />
              </Field>

              <div style={s.formGrid2}>
                <Field label="Preço de venda">
                  <input
                    style={s.input}
                    value={editando.preco_venda}
                    onChange={(e) => setEditField("preco_venda", e.target.value)}
                  />
                </Field>

                <Field label="Preço de custo">
                  <input
                    style={s.input}
                    value={editando.preco_custo || ""}
                    onChange={(e) => setEditField("preco_custo", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Estoque mínimo">
                <input
                  style={s.input}
                  value={editando.estoque_minimo || ""}
                  onChange={(e) => setEditField("estoque_minimo", e.target.value)}
                />
              </Field>

              <Field label="Status">
                <label style={s.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={editando.ativo}
                    onChange={(e) => setEditField("ativo", e.target.checked)}
                  />
                  <span style={s.checkboxLabel}>Ativo</span>
                </label>
              </Field>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
                onClick={atualizarProduto}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const s = {
  // Layout
  page: {
    padding: "24px",
    background: "#f1f5f9",
    minHeight: "100vh",
  },

  pageHeader: {
    marginBottom: "20px",
  },

  pageTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
  },

  pageSub: {
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "2px",
  },

  // Erro global
  errorBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#dc2626",
    marginBottom: "16px",
  },

  errorClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    padding: 0,
  },

  // Cards
  card: {
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
    marginBottom: "16px",
    overflow: "hidden",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid #f8fafc",
  },

  cardTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
  },

  cardCount: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  cardBody: {
    padding: "16px 20px",
  },

  // Formulário
  formGrid3: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },

  formGrid4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto",
    gap: "12px",
    alignItems: "end",
  },

  formGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  formBtnWrapper: {
    display: "flex",
    alignItems: "flex-end",
    paddingBottom: "1px",
  },

  // Campos
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  fieldLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },

  input: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingTop: "8px",
    cursor: "pointer",
  },

  checkboxLabel: {
    fontSize: "13px",
    color: "#475569",
  },

  // Botões
  btnPrimary: {
    padding: "9px 16px",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },

  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  btnEdit: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#64748b",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  btnCancel: {
    padding: "9px 16px",
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#64748b",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Tabela
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "10px 16px",
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    borderBottom: "1px solid #f1f5f9",
  },

  tableRow: {
    transition: "background 0.1s",
  },

  td: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#334155",
    borderBottom: "1px solid #f8fafc",
  },

  tdNome: {
    fontWeight: "500",
    color: "#0f172a",
  },

  tdMuted: {
    color: "#94a3b8",
    fontSize: "12px",
  },

  emptyRow: {
    textAlign: "center",
    padding: "32px",
    color: "#94a3b8",
    fontSize: "13px",
  },

  // Badges
  badgeAtivo: {
    background: "#EAF3DE",
    color: "#3B6D11",
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "999px",
    fontWeight: "500",
  },

  badgeInativo: {
    background: "#FCEBEB",
    color: "#A32D2D",
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "999px",
    fontWeight: "500",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },

  modal: {
    background: "#fff",
    borderRadius: "14px",
    width: "380px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 10000,
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
  },

  modalTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
  },

  modalClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },

  modalBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "14px 20px",
    borderTop: "1px solid #f1f5f9",
  },
};