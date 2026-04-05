import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import Cupom from "../components/Cupom";

// ─── Formatação de moeda ────────────────────────────────────────────────────
const brl = (valor) =>
  Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Formas de pagamento ────────────────────────────────────────────────────
const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro", icon: "💵" },
  { value: "debito",   label: "Débito",   icon: "💳" },
  { value: "credito",  label: "Crédito",  icon: "💳" },
  { value: "pix",      label: "PIX",      icon: "⚡" },
];

// ─── Ícones SVG ──────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="7" cy="7" r="5" stroke="#94a3b8" strokeWidth="1.4" />
    <path d="M11 11l3 3" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5 7h8M9 4l3 3-3 3M8 2H2a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h6"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <div style={tg.row}>
      <span style={tg.label}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{ ...tg.track, background: checked ? "#534AB7" : "#e2e8f0" }}
      >
        <span style={{ ...tg.thumb, transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
      </button>
    </div>
  );
}

const tg = {
  row:   { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" },
  label: { fontSize: "13px", fontWeight: "500", color: "#0f172a" },
  track: { width: "40px", height: "22px", borderRadius: "999px", border: "none", cursor: "pointer", padding: 0, position: "relative", flexShrink: 0 },
  thumb: { position: "absolute", top: "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "transform 0.2s", display: "block" },
};

// ─── Modal de abertura de turno ─────────────────────────────────────────────
function ModalAberturaTurno({ operador, onAbrir, salvando }) {
  const [saldo, setSaldo] = useState("");
  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        <div style={ms.header}>
          <div style={ms.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="14" rx="1.5" fill="white" />
              <rect x="9" y="4" width="6" height="11" rx="1.5" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span style={ms.headerTitle}>Caixify PDV</span>
        </div>
        <div style={ms.body}>
          <div style={ms.icon}>🕐</div>
          <h2 style={ms.title}>Abrir turno</h2>
          <p style={ms.sub}>Olá, <strong>{operador}</strong>! Informe o saldo inicial do caixa para começar.</p>
          <div style={ms.field}>
            <label style={ms.label}>Troco inicial em caixa</label>
            <div style={ms.inputPrefix}>
              <span style={ms.prefix}>R$</span>
              <input style={ms.inputInner} type="number" min="0" step="0.01" placeholder="0,00"
                value={saldo} onChange={(e) => setSaldo(e.target.value)} autoFocus />
            </div>
          </div>
          <button style={{ ...ms.btn, ...(salvando ? ms.btnDisabled : {}) }}
            onClick={() => onAbrir(saldo || "0")} disabled={salvando}>
            {salvando ? "Abrindo..." : "Abrir turno e entrar no PDV"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de fechamento de turno ───────────────────────────────────────────
function ModalFechamentoTurno({ turno, operador, onFechar, onCancelar, salvando }) {
  const [saldo, setSaldo] = useState("");
  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        <div style={ms.header}>
          <div style={ms.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="14" rx="1.5" fill="white" />
              <rect x="9" y="4" width="6" height="11" rx="1.5" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span style={ms.headerTitle}>Caixify PDV</span>
        </div>
        <div style={ms.body}>
          <div style={ms.icon}>🔒</div>
          <h2 style={ms.title}>Fechar turno</h2>
          <p style={ms.sub}>Confira o resumo do seu turno antes de fechar.</p>
          <div style={ms.resumo}>
            <div style={ms.resumoRow}>
              <span style={ms.resumoLabel}>Operador</span>
              <span style={ms.resumoValor}>{operador}</span>
            </div>
            <div style={ms.resumoRow}>
              <span style={ms.resumoLabel}>Vendas realizadas</span>
              <span style={ms.resumoValor}>{turno.num_vendas} {turno.num_vendas === 1 ? "venda" : "vendas"}</span>
            </div>
            <div style={ms.resumoRow}>
              <span style={ms.resumoLabel}>Total vendido</span>
              <span style={{ ...ms.resumoValor, color: "#1D9E75", fontWeight: "600" }}>{brl(turno.total_vendas)}</span>
            </div>
            <div style={ms.resumoRow}>
              <span style={ms.resumoLabel}>Saldo de abertura</span>
              <span style={ms.resumoValor}>{brl(turno.saldo_abertura)}</span>
            </div>
          </div>
          <div style={ms.field}>
            <label style={ms.label}>Saldo final em caixa</label>
            <div style={ms.inputPrefix}>
              <span style={ms.prefix}>R$</span>
              <input style={ms.inputInner} type="number" min="0" step="0.01" placeholder="0,00"
                value={saldo} onChange={(e) => setSaldo(e.target.value)} autoFocus />
            </div>
          </div>
          <button style={{ ...ms.btnDanger, ...(salvando ? ms.btnDisabled : {}) }}
            onClick={() => onFechar(saldo || "0")} disabled={salvando}>
            {salvando ? "Fechando..." : "Confirmar fechamento"}
          </button>
          <button style={ms.btnCancelar} onClick={onCancelar}>Cancelar — voltar ao PDV</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de pagamento ─────────────────────────────────────────────────────
function ModalPagamento({ totalBruto, onConfirmar, onCancelar }) {
  const [forma, setForma]                   = useState("");
  const [valorRecebido, setValorRecebido]   = useState("");
  const [comDesconto, setComDesconto]       = useState(false);
  const [descPerc, setDescPerc]             = useState("");
  const [descValor, setDescValor]           = useState("");

  // Cálculo automático entre % e valor
  const handleDescPerc = (v) => {
    setDescPerc(v);
    const perc = Number(v);
    setDescValor(perc > 0 ? ((perc / 100) * totalBruto).toFixed(2) : "");
  };

  const handleDescValor = (v) => {
    setDescValor(v);
    const val = Number(v);
    setDescPerc(val > 0 ? ((val / totalBruto) * 100).toFixed(2) : "");
  };

  const desconto   = comDesconto ? Math.min(Number(descValor) || 0, totalBruto) : 0;
  const totalFinal = Math.max(0, totalBruto - desconto);

  const troco = forma === "dinheiro" && valorRecebido !== ""
    ? Number(valorRecebido) - totalFinal
    : null;

  const podeConfirmar =
    forma !== "" &&
    (forma !== "dinheiro" || Number(valorRecebido) >= totalFinal);

  // Limpa campos de desconto ao desativar o toggle
  const handleToggleDesconto = (val) => {
    setComDesconto(val);
    if (!val) { setDescPerc(""); setDescValor(""); }
  };

  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        <div style={ms.header}>
          <div style={ms.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="14" rx="1.5" fill="white" />
              <rect x="9" y="4" width="6" height="11" rx="1.5" fill="white" opacity="0.7" />
            </svg>
          </div>
          <span style={ms.headerTitle}>Finalizar venda</span>
        </div>

        <div style={ms.body}>

          {/* Total */}
          <div style={mp.totalBox}>
            <span style={mp.totalLabel}>
              {desconto > 0 ? "Subtotal" : "Total a pagar"}
            </span>
            <span style={{
              ...mp.totalValor,
              ...(desconto > 0 ? { fontSize: "16px", color: "#94a3b8", textDecoration: "line-through" } : {}),
            }}>
              {brl(totalBruto)}
            </span>
          </div>

          {/* Toggle desconto */}
          <Toggle
            checked={comDesconto}
            onChange={handleToggleDesconto}
            label="Aplicar desconto"
          />

          {/* Campos de desconto — só aparecem quando toggle ativo */}
          {comDesconto && (
            <div style={mp.descontoArea}>
              <div style={mp.descontoGrid}>
                <div style={ms.field}>
                  <label style={ms.label}>Percentual (%)</label>
                  <div style={ms.inputPrefix}>
                    <span style={ms.prefix}>%</span>
                    <input style={ms.inputInner} type="number" min="0" max="100" step="0.01"
                      placeholder="0,00" value={descPerc}
                      onChange={(e) => handleDescPerc(e.target.value)} autoFocus />
                  </div>
                </div>
                <div style={ms.field}>
                  <label style={ms.label}>Valor (R$)</label>
                  <div style={ms.inputPrefix}>
                    <span style={ms.prefix}>R$</span>
                    <input style={ms.inputInner} type="number" min="0" step="0.01"
                      placeholder="0,00" value={descValor}
                      onChange={(e) => handleDescValor(e.target.value)} />
                  </div>
                </div>
              </div>

              {desconto > 0 && (
                <div style={mp.descontoAplicado}>
                  <span style={mp.descontoLabel}>Desconto</span>
                  <span style={mp.descontoValor}>− {brl(desconto)}</span>
                </div>
              )}

              {/* Total com desconto */}
              {desconto > 0 && (
                <div style={mp.totalComDesconto}>
                  <span style={mp.totalLabel}>Total com desconto</span>
                  <span style={mp.totalValor}>{brl(totalFinal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Formas de pagamento */}
          <div style={mp.formasGrid}>
            {FORMAS_PAGAMENTO.map(({ value, label, icon }) => (
              <button key={value} type="button"
                style={{ ...mp.formaBtn, ...(forma === value ? mp.formaBtnAtivo : {}) }}
                onClick={() => { setForma(value); setValorRecebido(""); }}>
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Valor recebido — só dinheiro */}
          {forma === "dinheiro" && (
            <div style={{ width: "100%" }}>
              <div style={ms.field}>
                <label style={ms.label}>Valor recebido</label>
                <div style={ms.inputPrefix}>
                  <span style={ms.prefix}>R$</span>
                  <input style={ms.inputInner} type="number" min={totalFinal} step="0.01"
                    placeholder="0,00" value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)} />
                </div>
              </div>
              {troco !== null && troco >= 0 && (
                <div style={mp.trocoBox}>
                  <span style={mp.trocoLabel}>Troco</span>
                  <span style={mp.trocoValor}>{brl(troco)}</span>
                </div>
              )}
              {troco !== null && troco < 0 && (
                <div style={mp.trocoInsuficiente}>
                  Valor insuficiente — faltam {brl(Math.abs(troco))}
                </div>
              )}
            </div>
          )}

          <button style={{ ...ms.btn, ...(!podeConfirmar ? ms.btnDisabled : {}) }}
            onClick={() => podeConfirmar && onConfirmar(forma, troco ?? 0, desconto)}
            disabled={!podeConfirmar}>
            Confirmar pagamento
          </button>
          <button style={ms.btnCancelar} onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function PDV() {
  const [itens, setItens]                     = useState([]);
  const [erro, setErro]                       = useState("");
  const [busca, setBusca]                     = useState("");
  const [sugestoes, setSugestoes]             = useState([]);
  const [showSugestoes, setShowSugestoes]     = useState(false);
  const [produtos, setProdutos]               = useState([]);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [showPagamento, setShowPagamento]     = useState(false);

  const [turno, setTurno]                     = useState(null);
  const [turnoCarregado, setTurnoCarregado]   = useState(false);
  const [showFecharTurno, setShowFecharTurno] = useState(false);
  const [salvandoTurno, setSalvandoTurno]     = useState(false);

  const { usuario, setUsuario } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const empresa  = usuario?.empresa_nome;
  const logo     = usuario?.empresa_logo;
  const operador = usuario?.nome
    ?? JSON.parse(localStorage.getItem("usuario") || "{}")?.nome
    ?? null;
  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);

  usePageTitle("PDV");

  const verificarTurno = useCallback(async () => {
    try {
      const res = await api.get("/turnos/meu-turno");
      setTurno(res.data.aberto ? res.data.turno : null);
    } catch { setTurno(null); }
    finally  { setTurnoCarregado(true); }
  }, []);

  useEffect(() => { verificarTurno(); }, [verificarTurno]);
  useEffect(() => { if (turno) inputRef.current?.focus(); }, [turno]);

  useEffect(() => {
    async function carregarProdutos() {
      try { const res = await api.get("/produtos"); setProdutos(res.data); }
      catch (e) { console.error(e); }
    }
    carregarProdutos();
  }, []);

  useEffect(() => {
    if (!busca) { setSugestoes([]); return; }
    const filtrados = produtos.filter((p) =>
      p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo_barras?.includes(busca)
    );
    setSugestoes(filtrados.slice(0, 5));
  }, [busca, produtos]);

  useEffect(() => {
    if (vendaFinalizada) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [vendaFinalizada]);

  const abrirTurno = async (saldoAbertura) => {
    setSalvandoTurno(true);
    try {
      const res = await api.post("/turnos/abrir", { saldo_abertura: Number(saldoAbertura) || 0 });
      setTurno({ id: res.data.turno_id, saldo_abertura: res.data.saldo_abertura, aberto_em: res.data.aberto_em, num_vendas: 0, total_vendas: 0 });
    } catch { setErro("Erro ao abrir turno"); }
    finally  { setSalvandoTurno(false); }
  };

  const fecharTurno = async (saldoFechamento) => {
    setSalvandoTurno(true);
    try {
      await api.post("/turnos/fechar", { saldo_fechamento: Number(saldoFechamento) || 0 });
      setTurno(null); setShowFecharTurno(false);
      localStorage.removeItem("usuario"); localStorage.removeItem("token");
      setUsuario(null); navigate("/login");
    } catch { setErro("Erro ao fechar turno"); setSalvandoTurno(false); }
  };

  function processarEntrada(valor) {
    if (valor.includes("*")) {
      const [qtdStr, cod] = valor.split("*");
      return { quantidade: Number(qtdStr) || 1, codigo: cod };
    }
    return { quantidade: 1, codigo: valor };
  }

  const logout = () => {
    if (turno) { setShowFecharTurno(true); return; }
    if (!confirm("Deseja sair do sistema?")) return;
    localStorage.removeItem("usuario"); localStorage.removeItem("token");
    setUsuario(null); navigate("/login");
  };

  const adicionarProduto = async (input, quantidade = 1) => {
    try {
      let data = null;
      if (typeof input === "object") { data = input; }
      else { const r = await api.get(`/produtos/buscar?q=${input}`); data = r.data[0]; }
      if (!data) throw new Error();
      const produto = { id: data.id, nome: data.nome, codigo: data.codigo_barras, preco: data.preco_venda };
      setItens((prev) => {
        const ex = prev.find((i) => i.produto_id === produto.id);
        if (ex) return prev.map((i) => i.produto_id === produto.id
          ? { ...i, quantidade: i.quantidade + quantidade, subtotal: (i.quantidade + quantidade) * i.preco }
          : i
        );
        return [...prev, { produto_id: produto.id, nome: produto.nome, preco: produto.preco, quantidade, subtotal: produto.preco * quantidade }];
      });
      setBusca(""); setErro(""); inputRef.current?.focus();
    } catch { setErro("Produto não encontrado"); }
  };

  const alterarQuantidade = (index, quantidade) => {
    setItens((prev) => prev.map((item, i) =>
      i === index ? { ...item, quantidade, subtotal: quantidade * item.preco } : item
    ));
  };

  const removerItem = (index) => setItens((prev) => prev.filter((_, i) => i !== index));

  const validarEAbrirPagamento = () => {
    if (itens.length === 0) return;
    for (const item of itens) {
      const produto = produtos.find((p) => p.id === item.produto_id);
      if (!produto) { setErro(`Produto "${item.nome}" não encontrado.`); return; }
      if (produto.estoque < item.quantidade) {
        setErro(`Estoque insuficiente para "${item.nome}". Disponível: ${produto.estoque} — Solicitado: ${item.quantidade}`);
        return;
      }
    }
    setErro(""); setShowPagamento(true);
  };

  const finalizarVenda = async (formaPagamento, troco, desconto = 0) => {
      setShowPagamento(false);
      try {
        const totalFinal = Math.max(0, total - desconto);

        const response = await api.post("/vendas", {
          total:           totalFinal,
          desconto:        desconto,
          forma_pagamento: formaPagamento,
          turno_id:        turno?.id ?? null,
        });

        const vendaId = response.data.id;

        await Promise.all(itens.map((item) =>
          api.post(`/venda-itens/${vendaId}`, {
            produto_id: item.produto_id,
            quantidade: item.quantidade,
          })
        ));

        if (turno) {
          setTurno((t) => ({ ...t, num_vendas: (t.num_vendas ?? 0) + 1, total_vendas: (t.total_vendas ?? 0) + totalFinal }));
        }

        // ← agora inclui o id
        setVendaFinalizada({ itens, total: totalFinal, pagamento: formaPagamento, troco, desconto, id: vendaId });
        setItens([]); setErro("");
        inputRef.current?.focus();
      } catch (error) {
        const mensagem = error?.response?.data?.detail ?? "Erro ao finalizar venda";
        setErro(mensagem);
      }
    };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (sugestoes.length > 0) { adicionarProduto(sugestoes[0]); }
    else { const { quantidade, codigo } = processarEntrada(busca); adicionarProduto(codigo, quantidade); }
    setBusca(""); setShowSugestoes(false);
  };

  if (!turnoCarregado) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9", fontSize: "14px", color: "#94a3b8" }}>
        Carregando...
      </div>
    );
  }

  if (!turno) return <ModalAberturaTurno operador={operador} onAbrir={abrirTurno} salvando={salvandoTurno} />;
  if (showFecharTurno) return <ModalFechamentoTurno turno={turno} operador={operador} onFechar={fecharTurno} onCancelar={() => setShowFecharTurno(false)} salvando={salvandoTurno} />;

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      {showPagamento && (
        <ModalPagamento totalBruto={total} onConfirmar={finalizarVenda} onCancelar={() => setShowPagamento(false)} />
      )}

      <div style={s.container}>
        <div style={s.left}>
          <div style={s.topbar}>
            <div style={s.topbarLeft}>
              <div style={s.logoIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="14" rx="1.5" fill="white" />
                  <rect x="9" y="4" width="6" height="11" rx="1.5" fill="white" opacity="0.7" />
                </svg>
              </div>
              <span style={s.appName}>Caixify</span>
              <span style={s.pdvBadge}>PDV</span>
              <span style={s.turnoBadge}>Turno #{turno.id} · {turno.num_vendas} {turno.num_vendas === 1 ? "venda" : "vendas"}</span>
              {usuario?.tipo === "admin" && (
                <button style={s.adminBtn} onClick={() => navigate("/admin/produtos")}>Painel ADM</button>
              )}
            </div>
            <button style={s.logoutBtn} onClick={logout}><IconLogout /> Fechar turno</button>
          </div>

          <div style={s.searchArea}>
            <div style={{ position: "relative" }}>
              <div style={s.searchIcon}><IconSearch /></div>
              <input ref={inputRef}
                placeholder="Digite código de barras ou nome do produto..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setShowSugestoes(true); }}
                onKeyDown={handleKeyDown}
                style={s.searchInput} aria-label="Buscar produto" autoComplete="off"
              />
              {showSugestoes && sugestoes.length > 0 && (
                <div style={s.dropdown}>
                  {sugestoes.map((item, i) => (
                    <div key={i} style={s.dropdownItem}
                      onClick={() => { adicionarProduto(item); setShowSugestoes(false); }}>
                      <span style={s.dropdownNome}>{item.nome}</span>
                      <span style={s.dropdownPreco}>{brl(item.preco_venda ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p style={s.searchHint}>
              Pressione <kbd style={s.kbd}>Enter</kbd> para adicionar &nbsp;·&nbsp;
              Use <kbd style={s.kbd}>2*código</kbd> para adicionar 2 unidades
            </p>
          </div>

          {erro && <div style={s.errorBar} role="alert">{erro}</div>}

          <div style={s.tableArea}>
            <div style={s.tableHead}>
              <span style={s.thNome}>Produto</span>
              <span style={s.thQtd}>Qtd</span>
              <span style={s.thPreco}>Preço</span>
              <span style={s.thSubtotal}>Subtotal</span>
              <span style={s.thAcao} />
            </div>
            {itens.length === 0 ? (
              <div style={s.emptyState}>Nenhum item adicionado ainda</div>
            ) : itens.map((item, index) => (
              <div key={index} style={s.itemRow}>
                <span style={s.itemNome}>{item.nome}</span>
                <div>
                  <input type="number" min="1" value={item.quantidade}
                    onChange={(e) => alterarQuantidade(index, Number(e.target.value))}
                    style={s.qtdInput} aria-label={`Quantidade de ${item.nome}`} />
                </div>
                <span style={s.itemCell}>{brl(item.preco)}</span>
                <span style={{ ...s.itemCell, ...s.itemSubtotal }}>{brl(item.subtotal)}</span>
                <button onClick={() => removerItem(index)} style={s.removeBtn}><IconClose /></button>
              </div>
            ))}
          </div>
        </div>

        <div style={s.right}>
          <div style={s.empresaBox}>
            {logo
              ? <img src={`http://127.0.0.1:8000${logo}`} alt={`Logo ${empresa}`} style={s.logoImg} />
              : <div style={s.empresaAvatar}>{empresa?.charAt(0)?.toUpperCase() ?? "E"}</div>
            }
            <span style={s.empresaNome}>{empresa}</span>
            {operador && <span style={s.operadorNome}>Operador: {operador}</span>}
          </div>
          <div style={s.itemsCount}>
            <span style={s.itemsCountLabel}>Itens na venda</span>
            <span style={s.itemsCountValue}>{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
          </div>
          <div style={s.totalBox}>
            <span style={s.totalLabel}>TOTAL</span>
            <h1 style={s.totalValue}>{brl(total)}</h1>
            <span style={s.totalHint}>Selecione a forma de pagamento</span>
          </div>
          <button
            style={{ ...s.finalizarBtn, ...(itens.length === 0 ? s.finalizarBtnDisabled : {}) }}
            onClick={validarEAbrirPagamento}
            disabled={itens.length === 0}
          >
            <IconArrow /> Finalizar Venda
          </button>
        </div>
      </div>

      <div id="print-area" className="no-screen">
        {vendaFinalizada && (
          <Cupom
            venda={vendaFinalizada}
            empresa={empresa}
            logo={logo}
            cnpj={usuario?.empresa_cnpj}
            contato={usuario?.empresa_contato}
            operador={operador}
          />
        )}
      </div>
    </div>
  );
}

// ─── Estilos dos modais ──────────────────────────────────────────────────────
const ms = {
  overlay:     { position: "fixed", inset: 0, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  modal:       { background: "#ffffff", borderRadius: "16px", width: "400px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" },
  header:      { background: "#534AB7", padding: "16px 20px", display: "flex", alignItems: "center", gap: "10px" },
  logoIcon:    { width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: "15px", fontWeight: "600", color: "#fff" },
  body:        { padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px", alignItems: "center", textAlign: "center" },
  icon:        { fontSize: "36px", lineHeight: 1 },
  title:       { fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: 0 },
  sub:         { fontSize: "14px", color: "#64748b", lineHeight: "1.5", margin: 0 },
  resumo:      { width: "100%", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9", overflow: "hidden" },
  resumoRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "13px" },
  resumoLabel: { color: "#64748b" },
  resumoValor: { fontWeight: "500", color: "#0f172a" },
  field:       { display: "flex", flexDirection: "column", gap: "6px", width: "100%", textAlign: "left" },
  label:       { fontSize: "12px", color: "#64748b", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.4px" },
  inputPrefix: { display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", overflow: "hidden" },
  prefix:      { padding: "10px 12px", fontSize: "14px", color: "#94a3b8", background: "#f1f5f9", borderRight: "1px solid #e2e8f0", flexShrink: 0 },
  inputInner:  { flex: 1, padding: "10px 12px", border: "none", background: "transparent", fontSize: "14px", color: "#0f172a", outline: "none", fontFamily: "inherit" },
  btn:         { width: "100%", padding: "12px", background: "#534AB7", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  btnDanger:   { width: "100%", padding: "12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  btnCancelar: { width: "100%", padding: "10px", background: "none", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
};

// ─── Estilos do modal de pagamento ───────────────────────────────────────────
const mp = {
  totalBox:       { background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "12px 16px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" },
  totalLabel:     { fontSize: "13px", color: "#64748b" },
  totalValor:     { fontSize: "22px", fontWeight: "700", color: "#0f172a" },

  descontoArea:   { width: "100%", display: "flex", flexDirection: "column", gap: "8px" },
  descontoGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" },
  descontoAplicado: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAEEDA", border: "1px solid #FAC775", borderRadius: "8px" },
  descontoLabel:  { fontSize: "13px", color: "#633806" },
  descontoValor:  { fontSize: "14px", fontWeight: "600", color: "#854F0B" },
  totalComDesconto: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: "8px", width: "100%" },

  formasGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%" },
  formaBtn:       { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", background: "none", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit", color: "#475569" },
  formaBtnAtivo:  { border: "1.5px solid #534AB7", background: "#EEEDFE", color: "#26215C" },

  trocoBox:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", padding: "10px 14px", background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: "8px" },
  trocoLabel:     { fontSize: "13px", color: "#3B6D11", fontWeight: "500" },
  trocoValor:     { fontSize: "18px", fontWeight: "700", color: "#1D9E75" },
  trocoInsuficiente: { marginTop: "8px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", textAlign: "center" },
};

// ─── Estilos do PDV ──────────────────────────────────────────────────────────
const DARK = "#0f172a";

const s = {
  container:   { display: "flex", height: "100vh", background: "#f1f5f9", overflow: "hidden" },
  left:        { flex: 3, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 },
  topbarLeft:  { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon:    { width: "28px", height: "28px", background: "#534AB7", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  appName:     { fontSize: "15px", fontWeight: "600", color: "#0f172a" },
  pdvBadge:    { background: "#EEEDFE", color: "#534AB7", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", fontWeight: "500" },
  turnoBadge:  { background: "#f1f5f9", color: "#64748b", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", fontWeight: "500" },
  adminBtn:    { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #e2e8f0", color: "#534AB7", padding: "5px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "inherit" },
  logoutBtn:   { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #e2e8f0", color: "#64748b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" },
  searchArea:  { padding: "14px 20px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 },
  searchIcon:  { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" },
  searchInput: { width: "100%", padding: "10px 12px 10px 38px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "15px", color: "#0f172a", outline: "none", fontFamily: "inherit" },
  searchHint:  { fontSize: "12px", color: "#94a3b8", marginTop: "7px" },
  kbd:         { background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "1px 5px", fontSize: "11px", color: "#64748b", fontFamily: "inherit" },
  dropdown:     { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", zIndex: 20, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
  dropdownItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "14px" },
  dropdownNome: { color: "#0f172a" },
  dropdownPreco:{ color: "#534AB7", fontWeight: "500" },
  errorBar:    { margin: "8px 20px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", color: "#dc2626", flexShrink: 0 },
  tableArea:   { flex: 1, overflowY: "auto", padding: "14px 20px" },
  tableHead:   { display: "grid", gridTemplateColumns: "1fr 90px 110px 110px 36px", alignItems: "center", gap: "8px", padding: "0 12px 8px" },
  thNome:      { fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  thQtd:       { width: 90,  fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  thPreco:     { width: 110, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  thSubtotal:  { width: 110, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
  thAcao:      { width: 36 },
  itemRow:     { display: "grid", gridTemplateColumns: "1fr 90px 110px 110px 36px", alignItems: "center", gap: "8px", background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "10px 12px", marginBottom: "6px" },
  itemNome:    { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  itemCell:    { fontSize: "14px", color: "#64748b" },
  itemSubtotal:{ color: "#0f172a", fontWeight: "500" },
  qtdInput:    { width: "60px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "13px", textAlign: "center", fontFamily: "inherit", color: "#0f172a" },
  removeBtn:   { width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: "6px", cursor: "pointer", color: "#94a3b8", flexShrink: 0 },
  emptyState:  { display: "flex", alignItems: "center", justifyContent: "center", height: "120px", fontSize: "14px", color: "#94a3b8" },
  right:       { width: "280px", flexShrink: 0, background: DARK, color: "#fff", display: "flex", flexDirection: "column", padding: "20px 16px", gap: "16px", height: "100vh", boxSizing: "border-box", overflow: "hidden" },
  empresaBox:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
  logoImg:     { width: "100%", maxWidth: "120px", maxHeight: "60px", objectFit: "contain", borderRadius: "8px", background: "#1e293b", padding: "6px" },
  empresaAvatar:{ width: "44px", height: "44px", borderRadius: "10px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "600", color: "#7F77DD" },
  empresaNome: { fontSize: "13px", fontWeight: "500", color: "#f1f5f9", textAlign: "center", wordBreak: "break-word" },
  operadorNome:{ fontSize: "12px", color: "#64748b" },
  itemsCount:  { display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  itemsCountLabel: { fontSize: "12px", color: "#475569" },
  itemsCountValue: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  totalBox:    { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", overflow: "hidden" },
  totalLabel:  { fontSize: "11px", color: "#334155", letterSpacing: "2px", fontWeight: "600" },
  totalValue:  { fontSize: "38px", fontWeight: "700", color: "#f8fafc", lineHeight: 1.1 },
  totalHint:   { fontSize: "11px", color: "#334155" },
  finalizarBtn:        { width: "100%", padding: "14px", border: "none", borderRadius: "10px", background: "#16a34a", color: "#fff", fontSize: "15px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexShrink: 0 },
  finalizarBtnDisabled:{ opacity: 0.4, cursor: "not-allowed" },
};