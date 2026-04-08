import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { tratarErroApi } from "../../services/errorHandler";
import { useAuth } from "../../context/AuthContext";

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS = [
  { value: "admin",    label: "Admin",    desc: "Acesso total ao sistema"     },
  { value: "operador", label: "Operador", desc: "Acesso somente ao PDV"       },
];

const FORM_VAZIO = {
  nome:  "",
  login: "",
  senha: "",
  tipo:  "operador",
};

const EDIT_VAZIO = {
  nome:       "",
  login:      "",
  tipo:       "operador",
  nova_senha: "",
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

const IconKey = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="4.5" cy="4.5" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6.5 6.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconBlock = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.5 2.5l7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

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

// ─── Avatar de iniciais ───────────────────────────────────────────────────────
function Avatar({ nome }) {
  const iniciais = nome
    ?.split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") ?? "?";

  return <div style={s.avatar}>{iniciais}</div>;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Usuarios() {
  const { usuario: usuarioLogado } = useAuth();

  const [usuarios, setUsuarios]     = useState([]);
  const [form, setForm]             = useState(FORM_VAZIO);
  const [editando, setEditando]     = useState(null);
  const [redefinindo, setRedefinindo] = useState(null); // usuario para redefinir senha
  const [novaSenha, setNovaSenha]   = useState("");
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState("");

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregarUsuarios = useCallback(async () => {
    try {
      const res = await api.get("/usuarios/");
      setUsuarios(res.data);
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  // ── Feedback helper ─────────────────────────────────────────────────────────
  const mostrarSucesso = (msg) => {
    setSucesso(msg);
    setTimeout(() => setSucesso(""), 3000);
  };

  // ── Criar usuário ───────────────────────────────────────────────────────────
  const criarUsuario = async () => {
    if (!form.nome.trim())  { setErro("Nome é obrigatório.");  return; }
    if (!form.login.trim()) { setErro("Login é obrigatório."); return; }
    if (!form.senha.trim()) { setErro("Senha é obrigatória."); return; }

    setSalvando(true);
    setErro("");

    try {
      await api.post("/usuarios/", form);
      setForm(FORM_VAZIO);
      await carregarUsuarios();
      mostrarSucesso("Usuário criado com sucesso!");
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
  };

  // ── Editar usuário ──────────────────────────────────────────────────────────
  const abrirEdicao = (u) => {
    setEditando({ id: u.id, nome: u.nome, login: u.login, tipo: u.tipo });
    setErro("");
  };

  const salvarEdicao = async () => {
    if (!editando.nome.trim())  { setErro("Nome é obrigatório.");  return; }
    if (!editando.login.trim()) { setErro("Login é obrigatório."); return; }

    setSalvando(true);
    setErro("");

    try {
      await api.put(`/usuarios/${editando.id}`, {
        nome:  editando.nome,
        login: editando.login,
        tipo:  editando.tipo,
      });

      setEditando(null);
      await carregarUsuarios();
      mostrarSucesso("Usuário atualizado com sucesso!");
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
  };

  // ── Redefinir senha ─────────────────────────────────────────────────────────
  const abrirRedefinicao = (u) => {
    setRedefinindo(u);
    setNovaSenha("");
    setErro("");
  };

  const salvarNovaSenha = async () => {
    if (!novaSenha.trim() || novaSenha.length < 4) {
      setErro("A senha precisa ter ao menos 4 caracteres.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      await api.patch(`/usuarios/${redefinindo.id}/senha`, { senha: novaSenha });
      setRedefinindo(null);
      setNovaSenha("");
      mostrarSucesso("Senha redefinida com sucesso!");
    } catch (error) {
      setErro(tratarErroApi(error));
    } finally {
      setSalvando(false);
    }
  };

  // ── Desativar usuário ───────────────────────────────────────────────────────
  const desativarUsuario = async (u) => {
    if (!confirm(`Desativar o usuário "${u.nome}"?`)) return;

    setErro("");

    try {
      await api.delete(`/usuarios/${u.id}`);
      await carregarUsuarios();
      mostrarSucesso("Usuário desativado.");
    } catch (error) {
      setErro(tratarErroApi(error));
    }
  };

  const setField     = (f, v) => setForm((prev)     => ({ ...prev, [f]: v }));
  const setEditField = (f, v) => setEditando((prev) => ({ ...prev, [f]: v }));

  // ── Métricas ────────────────────────────────────────────────────────────────
  const totalAtivos   = usuarios.filter((u) => u.ativo !== false).length;
  const totalAdmins   = usuarios.filter((u) => u.tipo === "admin").length;
  const totalOpers    = usuarios.filter((u) => u.tipo === "operador").length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={s.page}>

        {/* Cabeçalho */}
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Usuários</h1>
          <p style={s.pageSub}>Gerencie os usuários da empresa</p>
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
            <div style={s.statLabel}>Usuários ativos</div>
            <div style={s.statValue}>{totalAtivos}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Admins</div>
            <div style={s.statValue}>{totalAdmins}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Operadores</div>
            <div style={s.statValue}>{totalOpers}</div>
          </div>
        </div>

        <div style={s.cols}>

          {/* ── Formulário de cadastro ── */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Novo usuário</span>
            </div>

            <div style={s.cardBody}>
              <Field label="Nome completo">
                <input
                  style={s.input}
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                />
              </Field>

              <Field label="Login">
                <input
                  style={s.input}
                  placeholder="Ex: joao.silva"
                  value={form.login}
                  onChange={(e) => setField("login", e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <Field label="Senha">
                <input
                  style={s.input}
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={form.senha}
                  onChange={(e) => setField("senha", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Tipo de acesso">
                <div style={s.tipoBtns}>
                  {TIPOS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      style={{
                        ...s.tipoBtn,
                        ...(form.tipo === value ? s.tipoBtnAtivo[value] : {}),
                      }}
                      onClick={() => setField("tipo", value)}
                      title={desc}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span style={s.fieldHint}>
                  {TIPOS.find((t) => t.value === form.tipo)?.desc}
                </span>
              </Field>

              <button
                style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
                onClick={criarUsuario}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "+ Criar usuário"}
              </button>
            </div>
          </div>

          {/* ── Tabela de usuários ── */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Usuários cadastrados</span>
              <span style={s.cardSub}>{usuarios.length} usuários</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Usuário</th>
                    <th style={s.th}>Login</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={s.emptyRow}>
                        Nenhum usuário cadastrado
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => {
                      const ehVoceMesmo = u.id === usuarioLogado?.id;
                      const ativo = u.ativo !== false;

                      return (
                        <tr key={u.id} style={!ativo ? s.rowInativa : {}}>
                          <td style={s.td}>
                            <div style={s.userCell}>
                              <Avatar nome={u.nome} />
                              <span style={{ ...s.tdNome, opacity: ativo ? 1 : 0.5 }}>
                                {u.nome}
                                {ehVoceMesmo && (
                                  <span style={s.voce}>você</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...s.td, ...s.tdMuted }}>{u.login}</td>
                          <td style={s.td}>
                            <span style={{
                              ...s.badge,
                              ...(u.tipo === "admin" ? s.badgeAdmin : s.badgeOperador),
                            }}>
                              {u.tipo === "admin" ? "Admin" : "Operador"}
                            </span>
                          </td>
                          <td style={s.td}>
                            {ativo
                              ? <span style={{ ...s.badge, ...s.badgeAtivo }}>Ativo</span>
                              : <span style={{ ...s.badge, ...s.badgeInativo }}>Inativo</span>
                            }
                          </td>
                          <td style={s.td}>
                            <div style={s.acoes}>
                              <button
                                style={s.btnAcao}
                                onClick={() => abrirEdicao(u)}
                                title="Editar"
                              >
                                <IconEdit /> Editar
                              </button>
                              <button
                                style={s.btnAcao}
                                onClick={() => abrirRedefinicao(u)}
                                title="Redefinir senha"
                              >
                                <IconKey /> Senha
                              </button>
                              {!ehVoceMesmo && ativo && (
                                <button
                                  style={{ ...s.btnAcao, ...s.btnAcaoDanger }}
                                  onClick={() => desativarUsuario(u)}
                                  title="Desativar usuário"
                                >
                                  <IconBlock /> Desativar
                                </button>
                              )}
                            </div>
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
      </div>

      {/* ── Modal: editar usuário ── */}
      {editando && (
        <div style={s.overlay} onClick={() => setEditando(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Editar usuário</span>
              <button style={s.modalClose} onClick={() => setEditando(null)}>
                <IconClose />
              </button>
            </div>

            <div style={s.modalBody}>
              <Field label="Nome completo">
                <input
                  style={s.input}
                  value={editando.nome}
                  onChange={(e) => setEditField("nome", e.target.value)}
                />
              </Field>

              <Field label="Login">
                <input
                  style={s.input}
                  value={editando.login}
                  onChange={(e) => setEditField("login", e.target.value)}
                />
              </Field>

              <Field label="Tipo de acesso">
                <div style={s.tipoBtns}>
                  {TIPOS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      style={{
                        ...s.tipoBtn,
                        ...(editando.tipo === value ? s.tipoBtnAtivo[value] : {}),
                      }}
                      onClick={() => setEditField("tipo", value)}
                      title={desc}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span style={s.fieldHint}>
                  {TIPOS.find((t) => t.value === editando.tipo)?.desc}
                </span>
              </Field>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
                onClick={salvarEdicao}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: redefinir senha ── */}
      {redefinindo && (
        <div style={s.overlay} onClick={() => setRedefinindo(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Redefinir senha</span>
              <button style={s.modalClose} onClick={() => setRedefinindo(null)}>
                <IconClose />
              </button>
            </div>

            <div style={s.modalBody}>
              <div style={s.senhaInfo}>
                <Avatar nome={redefinindo.nome} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#0f172a" }}>
                    {redefinindo.nome}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    @{redefinindo.login}
                  </div>
                </div>
              </div>

              <Field
                label="Nova senha"
                hint="Mínimo 4 caracteres"
              >
                <input
                  style={s.input}
                  type="password"
                  placeholder="Digite a nova senha..."
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setRedefinindo(null)}>
                Cancelar
              </button>
              <button
                style={{ ...s.btnPrimary, ...(salvando ? s.btnDisabled : {}) }}
                onClick={salvarNovaSenha}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Redefinir senha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    padding: "24px",
    background: "#f1f5f9",
    minHeight: "100vh",
  },

  pageHeader: { marginBottom: "20px" },

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

  alertDanger: {
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

  alertSuccess: {
    background: "#EAF3DE",
    border: "1px solid #C0DD97",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#3B6D11",
    marginBottom: "16px",
  },

  alertClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#dc2626",
    fontSize: "14px",
    padding: 0,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "16px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #f1f5f9",
  },

  statLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "4px",
  },

  statValue: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#0f172a",
  },

  cols: {
    display: "grid",
    gridTemplateColumns: "1fr 1.8fr",
    gap: "16px",
    alignItems: "start",
  },

  card: {
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
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

  cardSub: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  cardBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

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

  fieldHint: {
    fontSize: "11px",
    color: "#94a3b8",
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

  tipoBtns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  tipoBtn: {
    padding: "8px",
    borderRadius: "7px",
    border: "1.5px solid #e2e8f0",
    background: "none",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#64748b",
  },

  tipoBtnAtivo: {
    admin:    { border: "1.5px solid #534AB7", background: "#EEEDFE", color: "#26215C" },
    operador: { border: "1.5px solid #1D9E75", background: "#E1F5EE", color: "#085041" },
  },

  btnPrimary: {
    width: "100%",
    padding: "9px 16px",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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

  td: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#334155",
    borderBottom: "1px solid #f8fafc",
  },

  tdNome: {
    fontWeight: "500",
    color: "#0f172a",
    fontSize: "13px",
  },

  tdMuted: {
    color: "#94a3b8",
    fontSize: "12px",
  },

  rowInativa: {
    opacity: 0.5,
  },

  emptyRow: {
    textAlign: "center",
    padding: "32px",
    color: "#94a3b8",
    fontSize: "13px",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#EEEDFE",
    color: "#534AB7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "600",
    flexShrink: 0,
  },

  voce: {
    marginLeft: "6px",
    fontSize: "10px",
    background: "#f1f5f9",
    color: "#94a3b8",
    padding: "1px 6px",
    borderRadius: "999px",
    fontWeight: "500",
  },

  badge: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "999px",
    fontWeight: "500",
  },

  badgeAdmin:    { background: "#EEEDFE", color: "#26215C" },
  badgeOperador: { background: "#E1F5EE", color: "#085041" },
  badgeAtivo:    { background: "#EAF3DE", color: "#3B6D11" },
  badgeInativo:  { background: "#f1f5f9", color: "#94a3b8" },

  acoes: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  btnAcao: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 9px",
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#64748b",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  btnAcaoDanger: {
    color: "#dc2626",
    borderColor: "#fecaca",
  },

  // Modal
  overlay: {
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
    width: "360px",
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

  senhaInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
  },
};