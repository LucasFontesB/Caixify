import { useEffect, useState } from "react";
import api from "../../services/api";
import { tratarErroApi } from "../../services/errorHandler";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    codigo_barras: "",
    preco_venda: "",
    preco_custo: "",
    estoque_minimo: "",
    ativo: true
  });

  const atualizarProduto = async () => {
      if (!editando?.id) {
        console.warn("Produto sem ID");
        return;
      }

      try {
        const payload = {
          ...editando,
          preco_venda: Number(editando.preco_venda) || 0,
          preco_custo: Number(editando.preco_custo) || 0,
          estoque_minimo: Number(editando.estoque_minimo) || 0
        };

        const { data } = await api.put(`/produtos/${editando.id}`, payload);

        // 🔄 Atualiza a lista local sem precisar recarregar tudo
        setProdutos((prev) =>
          prev.map((p) => (p.id === data.id ? data : p))
        );

        setEditando(null);

        // 🔔 Feedback elegante (substituir futuramente por toast)
        console.log("Produto atualizado com sucesso");

      } catch (error) {
          const mensagem = tratarErroApi(error);
          alert(mensagem);
        }
    };

  const carregarProdutos = async () => {
    const res = await api.get("/produtos");
    setProdutos(res.data);
  };

  const criarProduto = async () => {
    await api.post("/produtos", {
      ...form,
      preco_venda: Number(form.preco_venda),
      preco_custo: Number(form.preco_custo),
      estoque_minimo: Number(form.estoque_minimo)
    });

    setForm({
      nome: "",
      codigo_barras: "",
      preco_venda: "",
      preco_custo: "",
      estoque_minimo: "",
      ativo: true
    });

    carregarProdutos();
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  return (
  <>
    <div style={styles.container}>
      <h2 style={styles.title}>Produtos 📦</h2>

      {/* 🔥 FORM */}
      <div style={styles.card}>
        <div style={styles.grid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nome</label>
            <input
              style={styles.input}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Código de barras</label>
            <input
              style={styles.input}
              value={form.codigo_barras}
              onChange={(e) =>
                setForm({ ...form, codigo_barras: e.target.value })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Preço de venda</label>
            <input
              style={styles.input}
              value={form.preco_venda}
              onChange={(e) =>
                setForm({ ...form, preco_venda: e.target.value })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Preço de custo</label>
            <input
              style={styles.input}
              value={form.preco_custo}
              onChange={(e) =>
                setForm({ ...form, preco_custo: e.target.value })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Estoque mínimo</label>
            <input
              style={styles.input}
              value={form.estoque_minimo}
              onChange={(e) =>
                setForm({ ...form, estoque_minimo: e.target.value })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Status</label>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) =>
                  setForm({ ...form, ativo: e.target.checked })
                }
              />
              Ativo
            </label>
          </div>
        </div>

        <button style={styles.button} onClick={criarProduto}>
          Adicionar Produto
        </button>
      </div>

      {/* 🔥 LISTA */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Venda</th>
                <th style={styles.th}>Custo</th>
                <th style={styles.th}>Min</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.nome}</td>
                  <td style={styles.td}>{p.codigo_barras}</td>
                  <td style={styles.td}>R$ {p.preco_venda}</td>
                  <td style={styles.td}>R$ {p.preco_custo}</td>
                  <td style={styles.td}>{p.estoque_minimo}</td>
                  <td style={styles.td}>
                    {p.ativo ? (
                      <span style={styles.ativo}>Ativo</span>
                    ) : (
                      <span style={styles.inativo}>Inativo</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => setEditando(p)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>

    {/* 🔥 MODAL */}
    {editando && (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <h3>Editar Produto ✏️</h3>

          <div style={styles.inputGroup}>
        <label style={styles.label}>Nome</label>
        <input
          style={styles.input}
          value={editando.nome}
          onChange={(e) =>
            setEditando({ ...editando, nome: e.target.value })
          }
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Código de barras</label>
        <input
          style={styles.input}
          value={editando.codigo_barras || ""}
          onChange={(e) =>
            setEditando({ ...editando, codigo_barras: e.target.value })
          }
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Preço de venda</label>
        <input
          style={styles.input}
          value={editando.preco_venda}
          onChange={(e) =>
            setEditando({ ...editando, preco_venda: e.target.value })
          }
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Preço de custo</label>
        <input
          style={styles.input}
          value={editando.preco_custo || ""}
          onChange={(e) =>
            setEditando({ ...editando, preco_custo: e.target.value })
          }
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Estoque mínimo</label>
        <input
          style={styles.input}
          value={editando.estoque_minimo || ""}
          onChange={(e) =>
            setEditando({ ...editando, estoque_minimo: e.target.value })
          }
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Status</label>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={editando.ativo}
            onChange={(e) =>
              setEditando({ ...editando, ativo: e.target.checked })
            }
          />
          Ativo
        </label>
      </div>

      <div style={styles.modalActions}>
        <button style={styles.button} onClick={() => {
          atualizarProduto();
        }}> Salvar 💾 </button>

        <button onClick={() => setEditando(null)}>
          Cancelar
        </button>
      </div>
    </div>
      </div>
    )}
  </>
);
}

const styles = {

    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    },

    label: {
      fontSize: "12px",
      color: "#64748b"
    },

    input: {
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
      outline: "none",
      fontSize: "14px",
      width: "100%",
      boxSizing: "border-box",
      transition: "0.2s"
    },

    checkbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px"
    },

    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999 // 🔥 ESSA LINHA
    },

    modal: {
      background: "#fff",
      padding: "20px",
      borderRadius: "12px",
      width: "320px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      zIndex: 10000 // 🔥 GARANTE QUE FICA NA FRENTE
    },

    modalActions: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "10px"
    },

  container: {
    padding: "20px"
  },

  title: {
    marginBottom: "20px"
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.05)"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
    marginBottom: "15px"
  },

  button: {
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  ativo: {
    color: "green",
    fontWeight: "bold"
  },

  inativo: {
    color: "red",
    fontWeight: "bold"
  },

    table: {
      width: "100%",
      borderCollapse: "collapse"
    },

    th: {
      textAlign: "left",
      padding: "10px",
      borderBottom: "1px solid #e2e8f0",
      color: "#64748b",
      fontSize: "14px"
    },

    td: {
      padding: "10px",
      borderBottom: "1px solid #f1f5f9"
    }
};