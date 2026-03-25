import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function PDV() {
  const [codigo, setCodigo] = useState("");
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState("");
  const { setUsuario } = useAuth();
  const navigate = useNavigate();

  const inputRef = useRef(null);

  // 🔥 foco automático
  useEffect(() => {
    inputRef.current.focus();
  }, []);

    const logout = () => {
      if (!confirm("Deseja sair do sistema?")) return;

      localStorage.removeItem("usuario");
      localStorage.removeItem("token");
      setUsuario(null);
      navigate("/login");
    };

  const adicionarProduto = async () => {
    if (!codigo) return;

    try {
      const response = await api.get(`/produtos/buscar/${codigo}`);
      const produto = response.data;

      // 🔥 verifica se já existe
      const existente = itens.find(i => i.produto_id === produto.id);

      if (existente) {
        const novosItens = itens.map(i =>
          i.produto_id === produto.id
            ? {
                ...i,
                quantidade: i.quantidade + 1,
                subtotal: (i.quantidade + 1) * i.preco
              }
            : i
        );

        setItens(novosItens);
      } else {
        const novoItem = {
          produto_id: produto.id,
          nome: produto.nome,
          preco: produto.preco_venda,
          quantidade: 1,
          subtotal: produto.preco_venda
        };

        setItens([...itens, novoItem]);
      }

      setCodigo("");
      setErro("");
      inputRef.current.focus();
    } catch {
      setErro("Produto não encontrado");
    }
  };

  const alterarQuantidade = (index, quantidade) => {
    const novosItens = [...itens];

    novosItens[index].quantidade = quantidade;
    novosItens[index].subtotal =
      quantidade * novosItens[index].preco;

    setItens(novosItens);
  };

  const removerItem = (index) => {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(novosItens);
  };

  const total = itens.reduce((acc, item) => acc + item.subtotal, 0);

  const finalizarVenda = async () => {
    try {
      await api.post("/vendas", {
        total,
        desconto: 0,
        forma_pagamento: "dinheiro"
      });

      setItens([]);
      setErro("");
      inputRef.current.focus();
    } catch {
      setErro("Erro ao finalizar venda");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.left}>
          <div style={styles.header}>
              <button style={styles.logoutBtn} onClick={logout}>
                Sair 🚪
              </button>
            </div>

        <h2 style={styles.title}>PDV 🛒</h2>

        <input
          ref={inputRef}
          placeholder="Digite código ou nome..."
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionarProduto()}
          style={styles.input}
        />

        {erro && <span style={styles.error}>{erro}</span>}

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Preço</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {itens.map((item, index) => (
              <tr key={index}>
                <td>{item.nome}</td>

                <td>
                  <input
                    type="number"
                    value={item.quantidade}
                    onChange={(e) =>
                      alterarQuantidade(index, Number(e.target.value))
                    }
                    style={styles.qtdInput}
                  />
                </td>

                <td>R$ {item.preco}</td>
                <td>R$ {item.subtotal.toFixed(2)}</td>

                <td>
                  <button
                    onClick={() => removerItem(index)}
                    style={styles.removeBtn}
                  >
                    ✖
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.right}>
        <h1 style={styles.total}>R$ {total.toFixed(2)}</h1>

        <button style={styles.finalizar} onClick={finalizarVenda}>
          Finalizar Venda 💰
        </button>
      </div>
    </div>
  );
}

const styles = {

    header: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: "10px"
    },

    logoutBtn: {
      background: "#ef4444",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px"
    },

  container: {
    display: "flex",
    height: "100vh",
    background: "#f1f5f9"
  },

  left: {
    flex: 3,
    padding: "20px"
  },

  right: {
    flex: 1,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px"
  },

  title: {
    marginBottom: "10px"
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #cbd5f5",
    marginBottom: "10px",
    fontSize: "16px"
  },

  table: {
    width: "100%",
    background: "#fff",
    borderRadius: "10px",
    overflow: "hidden"
  },

  qtdInput: {
    width: "60px"
  },

  removeBtn: {
    background: "transparent",
    border: "none",
    color: "red",
    cursor: "pointer"
  },

  total: {
    fontSize: "40px"
  },

  finalizar: {
    padding: "15px 30px",
    fontSize: "18px",
    background: "#22c55e",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    cursor: "pointer"
  },

  error: {
    color: "red",
    fontSize: "14px"
  }
};