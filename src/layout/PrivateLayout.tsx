import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./PrivateLayout.module.css";
import { alertService } from "../utils/alerts";

type Role = "editorial" | "dictaminador" | "autor";

type User = {
  id: number | string;
  name: string;
  email: string;
  role: Role;
};

function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return null;
  }
}

function getJwtPayload(token: string): any | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string) {
  const payload = getJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp <= nowSec;
}

function isRole(v: any): v is Role {
  return v === "editorial" || v === "dictaminador" || v === "autor";
}

function isValidUser(obj: any): obj is User {
  return (
    obj &&
    (typeof obj.id === "number" || typeof obj.id === "string") &&
    typeof obj.name === "string" &&
    typeof obj.email === "string" &&
    isRole(obj.role)
  );
}

function safeClearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

const defaultHomeByRole: Record<Role, string> = {
  editorial: "/libros",
  dictaminador: "/dictaminador",
  autor: "/autor/mis-envios",
};

const routeACL: Array<{ test: (path: string) => boolean; roles: Role[] }> = [
  { test: (p) => p.startsWith("/libros") || p.startsWith("/capitulos"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/dictamenes"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/usuarios"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/archivos-firmados"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/dictaminador"), roles: ["dictaminador"] },
  { test: (p) => p.startsWith("/enviar-documentos"), roles: ["editorial"] },
  { test: (p) => p.startsWith("/autor"), roles: ["autor"] },
];

function hasAccess(pathname: string, role: Role): boolean {
  const rule = routeACL.find((r) => r.test(pathname));
  if (!rule) return false;
  return rule.roles.includes(role);
}

// ============================================
// MAPA DE ÍCONOS PARA EL MENÚ
// ============================================
const menuIcons: Record<string, string> = {
  "/libros": "📚",
  "/capitulos": "📖",
  "/dictamenes": "📝",
  "/archivos-firmados": "📁",
  "/usuarios": "👥",
  "/dictaminador": "📋",
  "/autor/mis-envios": "📤",
};

export default function PrivateLayout() {
  const nav = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    return () => {
      alertService.close();
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 981) setSidebarOpen(false);
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

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  let user: User | null = null;
  let guard: JSX.Element | null = null;

  if (!token || !userRaw) {
    safeClearAuth();
    guard = <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!guard && isTokenExpired(token!)) {
    safeClearAuth();
    guard = <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!guard) {
    try {
      const parsed = JSON.parse(userRaw!);
      if (!isValidUser(parsed)) throw new Error("user shape invalid");
      user = parsed;
    } catch {
      safeClearAuth();
      guard = <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
  }

  if (!guard && user!.role === "editorial" && location.pathname === "/") {
    guard = <Navigate to="/libros" replace />;
  }

  if (!guard && !hasAccess(location.pathname, user!.role)) {
    guard = <Navigate to={defaultHomeByRole[user!.role]} replace />;
  }

  const logout = async () => {
    alertService.close();

    try {
      (document.activeElement as HTMLElement | null)?.blur?.();
    } catch {}

    await new Promise<void>((r) => setTimeout(() => r(), 0));

    const res = await alertService.confirm({
      title: "Cerrar sesión",
      text: "¿Seguro que deseas salir?",
      icon: "question",
      confirmText: "Sí, salir",
      cancelText: "Cancelar",
    });

    if (!res.isConfirmed) {
      alertService.close();
      return;
    }

    alertService.close();
    safeClearAuth();
    nav("/login", { replace: true });
  };

  const go = (path: string) => {
    setSidebarOpen(false);
    nav(path);
  };

  const isStarts = (prefix: string) => location.pathname.startsWith(prefix);

  const menu = useMemo(() => {
    if (!user) return [];
    if (user.role === "editorial") {
      return [
        { label: "Libros", path: "/libros" },
        { label: "Capítulos", path: "/capitulos" },
        { label: "Dictámenes", path: "/dictamenes" },
        { label: "Archivos ", path: "/archivos-firmados" },
        { label: "Usuarios", path: "/usuarios" },
        { label: "Enviar Documentos", path: "/enviar-documentos" }, // ✅ NUEVO

      ];
    }
    if (user.role === "dictaminador") return [{ label: "Mis asignaciones", path: "/dictaminador" }, 
    { label: "Documentos recibidos", path: "/dictaminador/documentos" } ];// ✅ NUEVO];
    return [{ label: "Mis envíos", path: "/autor/mis-envios" }];
  }, [user]);

  const avatarLetter = (user?.name?.trim()?.[0] ?? "U").toUpperCase();

  const roleNames: Record<Role, string> = {
    editorial: "Editorial",
    dictaminador: "Dictaminador",
    autor: "Autor",
  };

  if (guard) return guard;

  return (
    <div className={styles.shell} data-open={sidebarOpen ? "1" : "0"}>
      {/* OVERLAY para móvil */}
      <button
        type="button"
        className={styles.overlay}
        data-open={sidebarOpen ? "1" : "0"}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />

      {/* ===== SIDEBAR ===== */}
      <aside className={styles.sidebar} data-open={sidebarOpen ? "1" : "0"}>
        {/* BRAND */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>📘</div>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>Editorial</div>
            <div className={styles.brandSubtitle}>Administración</div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* DIVIDER */}
        <div className={styles.divider} />

        {/* NAVEGACIÓN */}
        <nav className={styles.nav}>
          <div className={styles.navLabel}>Menú Principal</div>
          {menu.map((item) => {
            const active = isStarts(item.path);
            const icon = menuIcons[item.path] || "📄";
            return (
              <button
                key={item.path}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                onClick={() => go(item.path)}
                type="button"
              >
                <span className={styles.navIcon}>{icon}</span>
                {item.label}
                {active && <span className={styles.navBadge}>●</span>}
              </button>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userBox}>
            <div className={styles.userAvatar}>{avatarLetter}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user?.name ?? "Usuario"}</div>
              <div className={styles.userRole}>
                {user?.role ? roleNames[user.role] : ""}
              </div>
            </div>
          </div>

          <button
            className={styles.logoutBtn}
            onClick={() => logout()}
            type="button"
          >
            <span className={styles.logoutIcon}>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===== MAIN - SIN HEADER ===== */}
      <main className={styles.main}>
        {/* Solo el botón hamburguesa en móvil */}
        <div className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
        </div>

        {/* CONTENIDO - Cada página maneja su propio header */}
        <div className={styles.body}>
          <section className={styles.content}>
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
}