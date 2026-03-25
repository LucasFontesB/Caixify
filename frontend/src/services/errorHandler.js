export const tratarErroApi = (error) => {
  if (error.response) {
    console.error("Erro API:", error.response.data);

    return (
      error.response.data?.detail ||
      "Erro ao processar a requisição"
    );

  } else if (error.request) {
    console.error("Sem resposta do servidor");

    return "Servidor não respondeu. Verifique sua conexão.";

  } else {
    console.error("Erro inesperado:", error.message);

    return "Erro inesperado. Tente novamente.";
  }
};