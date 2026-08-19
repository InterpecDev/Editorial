import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styles from "./LayoutEditorial.module.css";

// Importa los iconos de Lucide
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  PenTool,
  Users,
  Settings,
  Search,
  Plus,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Grid3x3,
  Library,
  FileCheck,
  Award,
  ChevronRight,
} from "lucide-react";

export default function LayoutEditorial() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 980) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Definición de los items del menú con sus iconos
  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { path: "/convocatorias", label: "Convocatorias", icon: FileText, badge: "3" },
    { path: "/libros", label: "Libros", icon: BookOpen, badge: null },
    { path: "/capitulos", label: "Capítulos", icon: FileCheck, badge: null },
    { path: "/dictamenes", label: "Dictámenes", icon: PenTool, badge: "12" },
    { path: "/constancias", label: "Constancias", icon: Award, badge: null },
    { path: "/usuarios", label: "Usuarios", icon: Users, badge: null },
  ];

  return (
    <div className={styles.shell}>
      {/* Overlay */}
      <button
        type="button"
        className={styles.overlay}
        data-open={sidebarOpen ? "1" : "0"}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={styles.sidebar} data-open={sidebarOpen ? "1" : "0"}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Library size={24} />
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>Editorial</div>
            <div className={styles.brandSubtitle}>Panel de control</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={styles.navIcon} size={20} />
                {item.label}
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </NavLink>
            );
          })}

          <div className={styles.navDivider} />

          <NavLink
            to="/configuracion"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className={styles.navIcon} size={20} />
            Configuración
          </NavLink>
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userBox}>
            <div className={styles.userAvatar}>JD</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>Juan Delgado</div>
              <div className={styles.userRole}>Editorial</div>
            </div>
          </div>

          <button className={styles.logoutBtn} type="button">
            <LogOut className={styles.btnIcon} size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className={styles.headerTitle}>
              Dashboard <span>/ Resumen</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} size={18} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar libros, capítulos, autores..."
              />
              <button className={styles.searchBtn}>
                <Search className={styles.btnIcon} size={16} />
                Buscar
              </button>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.headerActionBtn} aria-label="Notificaciones">
                <Bell className={styles.actionIcon} size={18} />
                <span className={styles.notifDot} />
              </button>
              <button className={styles.headerActionBtn} aria-label="Perfil">
                <User className={styles.actionIcon} size={18} />
              </button>
            </div>

            <button className={styles.panelBtn}>
              <Plus className={styles.btnIcon} size={16} />
              Nuevo
            </button>
          </div>
        </header>

        {/* Body */}
        <div className={styles.body}>
          <section className={styles.content}>
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}