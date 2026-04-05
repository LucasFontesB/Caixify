export default function Cupom({ venda, empresa, logo, cnpj, contato, operador }) {
  if (!venda) return null;

  const brl = (v) =>
    Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const agora      = new Date();
  const dataFmt    = agora.toLocaleDateString("pt-BR");
  const horaFmt    = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const desconto   = Number(venda.desconto  ?? 0);
  const totalBruto = Number(venda.total     ?? 0) + desconto;
  const troco      = Number(venda.troco     ?? 0);

  const FORMAS = {
    dinheiro: "Dinheiro",
    credito:  "Cartão de Crédito",
    debito:   "Cartão de Débito",
    pix:      "PIX",
  };

  const formaPagamento = FORMAS[venda.pagamento] ?? venda.pagamento ?? "—";

  // Separadores via CSS border — se adaptam à largura real do papel
  const Sep  = () => <div style={c.sep}  />;
  const Sep2 = () => <div style={c.sep2} />;

  return (
    <div id="cupom" style={c.cupom}>

      {/* ── Cabeçalho ── */}
      <div style={c.centro}>
        {logo && (
          <img
            src={`http://127.0.0.1:8000${logo}`}
            alt="Logo"
            style={c.logo}
          />
        )}
        <div style={c.empresaNome}>{empresa ?? "MINHA LOJA"}</div>
        {cnpj    && <div style={c.info}>CNPJ: {cnpj}</div>}
        {contato && <div style={c.info}>Tel: {contato}</div>}
      </div>

      <Sep2 />

      <div style={c.centro}>
          <div style={c.docTitle}>CUPOM NÃO FISCAL</div>
          {venda.id && <div style={c.info}>Venda Nº {venda.id}</div>}  {/* ← adiciona */}
          <div style={c.info}>Data: {dataFmt} &nbsp;|&nbsp; Hora: {horaFmt}</div>
          {operador && <div style={c.info}>Operador: {operador}</div>}
        </div>



      <Sep />

      {/* ── Cabeçalho da tabela ── */}
      <div style={c.tabelaHeader}>
        <span style={{ flex: 1 }}>DESCRIÇÃO / QTD</span>
        <span style={{ width: "60px", textAlign: "right" }}>UNIT</span>
        <span style={{ width: "60px", textAlign: "right" }}>TOTAL</span>
      </div>

      <Sep />

      {/* ── Itens ── */}
      {venda.itens.map((item, i) => (
        <div key={i} style={c.itemRow}>
          <div style={c.itemNome}>{item.nome}</div>
          <div style={c.itemDetalhes}>
            <span style={{ flex: 1 }}>{item.quantidade}x</span>
            <span style={{ width: "60px", textAlign: "right" }}>{brl(item.preco)}</span>
            <span style={{ width: "60px", textAlign: "right" }}>{brl(item.subtotal)}</span>
          </div>
        </div>
      ))}

      <Sep />

      {/* ── Totais ── */}
      <div style={c.totalRow}>
        <span>Subtotal</span>
        <span>{brl(totalBruto)}</span>
      </div>

      {desconto > 0 && (
        <div style={c.totalRow}>
          <span>Desconto</span>
          <span>- {brl(desconto)}</span>
        </div>
      )}

      <Sep2 />

      <div style={c.totalFinalRow}>
        <span>TOTAL</span>
        <span>{brl(venda.total)}</span>
      </div>

      <Sep2 />

      {/* ── Pagamento ── */}
      <div style={c.totalRow}>
        <span>Forma de pagamento</span>
        <span>{formaPagamento}</span>
      </div>

      {venda.pagamento === "dinheiro" && troco > 0 && (
        <div style={{ ...c.totalRow, fontWeight: "bold" }}>
          <span>Troco</span>
          <span>{brl(troco)}</span>
        </div>
      )}

      <Sep />

      {/* ── Rodapé ── */}
      <div style={c.centro}>
        <div style={c.obrigado}>Obrigado pela preferência!</div>
        <div style={c.info}>Volte sempre!</div>
        <div style={{ ...c.info, marginTop: "6px" }}>{dataFmt} {horaFmt}</div>
      </div>

    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const BASE = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize:   "11px",
  color:      "#000",
  lineHeight: "1.5",
};

const c = {
  cupom: {
    ...BASE,
    // width: 100% se adapta à largura real da impressora
    width:      "100%",
    maxWidth:   "300px",
    margin:     "0",
    padding:    "8px 4px",
    background: "#fff",
    boxSizing:  "border-box",
  },

  centro: {
    textAlign:    "center",
    marginBottom: "4px",
  },

  logo: {
    width:       "80px",
    display:     "block",
    margin:      "0 auto 6px",
  },

  empresaNome: {
    ...BASE,
    fontSize:      "14px",
    fontWeight:    "bold",
    textTransform: "uppercase",
    marginBottom:  "2px",
  },

  docTitle: {
    ...BASE,
    fontSize:      "11px",
    fontWeight:    "bold",
    letterSpacing: "1px",
  },

  info: {
    ...BASE,
    fontSize: "10px",
    color:    "#333",
  },

  // Separador simples — borda CSS ocupa 100% da largura automaticamente
  sep: {
    width:        "100%",
    borderTop:    "1px dashed #000",
    margin:       "5px 0",
    height:       0,
  },

  // Separador duplo (destaque)
  sep2: {
    width:        "100%",
    borderTop:    "2px solid #000",
    margin:       "5px 0",
    height:       0,
  },

  tabelaHeader: {
    ...BASE,
    display:       "flex",
    fontSize:      "10px",
    fontWeight:    "bold",
    textTransform: "uppercase",
  },

  itemRow: {
    marginBottom: "5px",
  },

  itemNome: {
    ...BASE,
    fontSize:   "11px",
    fontWeight: "bold",
  },

  itemDetalhes: {
    ...BASE,
    display:  "flex",
    fontSize: "11px",
  },

  totalRow: {
    ...BASE,
    display:        "flex",
    justifyContent: "space-between",
    fontSize:       "11px",
    margin:         "2px 0",
  },

  totalFinalRow: {
    ...BASE,
    display:        "flex",
    justifyContent: "space-between",
    fontSize:       "15px",
    fontWeight:     "bold",
    margin:         "4px 0",
  },

  obrigado: {
    ...BASE,
    fontSize:   "12px",
    fontWeight: "bold",
    margin:     "4px 0 2px",
  },
};