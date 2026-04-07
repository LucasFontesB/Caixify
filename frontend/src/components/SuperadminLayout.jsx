import { NavLink, useNavigate } from "react-router-dom"
import { useSuperadmin } from "../context/SuperadminContext"

const NAV = [
  { to: "/superadmin", label: "Dashboard", icon: "◈", end: true },
  { to: "/superadmin/empresas", label: "Empresas", icon: "⬡" },
  { to: "/superadmin/faturas", label: "Faturas", icon: "◇" },
  { to: "/superadmin/logs", label: "Auditoria", icon: "◻" },
]

export default function SuperadminLayout({ children }) {
  const { superadmin, logout } = useSuperadmin()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/superadmin/login")
  }

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={s.brandDot} />
          <span style={s.brandText}>Caixify</span>
          <span style={s.brandSub}>admin</span>
        </div>

        <nav style={s.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.adminName}>{superadmin?.nome}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <main style={s.main}>{children}</main>
    </div>
  )
}

const s = {
  root: { display: "flex", minHeight: "100vh", background: "#0f0f10", fontFamily: "'DM Mono', monospace" },
  sidebar: {
    width: 220, background: "#141416", borderRight: "1px solid #222",
    display: "flex", flexDirection: "column", padding: "28px 0", flexShrink: 0,
  },
  brand: { display: "flex", alignItems: "center", gap: 8, padding: "0 24px 32px" },
  brandDot: { width: 8, height: 8, borderRadius: "50%", background: "#534AB7" },
  brandText: { color: "#fff", fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" },
  brandSub: {
    fontSize: 9, color: "#534AB7", background: "#1e1b3a",
    padding: "1px 6px", borderRadius: 4, letterSpacing: "0.08em", textTransform: "uppercase",
  },
  nav: { display: "flex", flexDirection: "column", gap: 2, padding: "0 12px", flex: 1 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
    borderRadius: 8, color: "#666", fontSize: 13, textDecoration: "none",
    transition: "all 0.15s",
  },
  navActive: { color: "#c9c7ff", background: "#1e1b3a" },
  navIcon: { fontSize: 14, opacity: 0.8 },
  sidebarFooter: { padding: "24px 24px 0", borderTop: "1px solid #222", marginTop: 16 },
  adminName: { color: "#555", fontSize: 12, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  logoutBtn: {
    background: "none", border: "1px solid #2a2a2a", color: "#555", fontSize: 12,
    padding: "6px 12px", borderRadius: 6, cursor: "pointer", width: "100%",
  },
}
