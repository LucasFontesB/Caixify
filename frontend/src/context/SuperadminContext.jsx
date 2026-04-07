import { createContext, useContext, useState } from "react"

const SuperadminContext = createContext(null)

export function SuperadminProvider({ children }) {
  const [superadmin, setSuperadmin] = useState(() => {
    const nome = localStorage.getItem("superadmin_nome")
    const token = localStorage.getItem("superadmin_token")
    return nome && token ? { nome, token } : null
  })

  function login(token, nome) {
    localStorage.setItem("superadmin_token", token)
    localStorage.setItem("superadmin_nome", nome)
    setSuperadmin({ token, nome })
  }

  function logout() {
    localStorage.removeItem("superadmin_token")
    localStorage.removeItem("superadmin_nome")
    setSuperadmin(null)
  }

  return (
    <SuperadminContext.Provider value={{ superadmin, login, logout }}>
      {children}
    </SuperadminContext.Provider>
  )
}

export function useSuperadmin() {
  return useContext(SuperadminContext)
}