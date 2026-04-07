import axios from "axios"

const api = axios.create({ baseURL: "http://127.0.0.1:8000" })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("superadmin_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("superadmin_token")
      localStorage.removeItem("superadmin_nome")
      window.location.href = "/superadmin/login"
    }
    return Promise.reject(err)
  }
)

export default api