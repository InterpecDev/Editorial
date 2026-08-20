import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { api } from "../../services/api";
import styles from "./MisAsignacionesDictaminador.module.css";
import DictaminacionContent from "./DictaminacionContent";
import SubirArchivosFirmados from "./SubirArchivosFirmados";
import DocumentosRecibidos from "./DocumentosRecibidos";
import { alertService } from "../../utils/alerts";

/* =========================
   Tipos
========================= */
type ChapterStatus =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "ENVIADO_A_DICTAMINADOR"
  | "EN_REVISION_DICTAMINADOR"
  | "CORRECCIONES_SOLICITADAS_A_AUTOR"
  | "CORRECCIONES"
  | "REENVIADO_POR_AUTOR"
  | "REVISADO_POR_EDITORIAL"
  | "LISTO_PARA_FIRMA"
  | "FIRMADO"
  | "EN_REVISION"
  | "APROBADO"
  | "RECHAZADO";

type AssignedChapterApi = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;
  book_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  deadline_at?: string | null;
  deadline_stage?: string | null;
  author_deadline_at?: string | null;
  evaluador_cvu?: string | null;
  evaluador_name?: string | null;
};

type AssignedChapterRow = {
  id: number;
  title: string;
  status: ChapterStatus;
  updated_at: string;
  file_path?: string | null;
  book_name?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  deadline_at?: string | null;
  deadline_stage?: string | null;
  author_deadline_at?: string | null;
  evaluador_cvu?: string | null;
  evaluador_name?: string | null;
};

type Me = {
  id: number;
  name: string;
  email: string;
  role: "editorial" | "dictaminador" | "autor";
  cvo_snii?: string;
};

type Preferences = {
  email_notify_enabled: boolean;
  notify_status_changes: boolean;
  notify_corrections: boolean;
  notify_approved_rejected: boolean;
};

type Privacy = {
  show_name: boolean;
  show_email: boolean;
};

type NavKey = "asignaciones" | "cuenta" | "dictaminacion" | "subirArchivos" | "documentosRecibidos";

/* =========================
   Error Boundary
========================= */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error capturado en MisAsignacionesDictaminador:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: 30,
              borderRadius: 16,
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              margin: 20,
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 12 }}>Algo salió mal</h3>
            <p style={{ marginBottom: 16, fontSize: 14 }}>{this.state.error?.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{
                padding: "10px 20px",
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reintentar
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/* =========================
   Helpers
========================= */
function getToken() {
  return localStorage.getItem("token") || "";
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = dateStr.slice(0, 10);
  const [y, m, dd] = d.split("-");
  if (!dd) return dateStr;
  return `${dd}/${m}/${y}`;
}

function fmtDateLong(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = dateStr.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!day) return dateStr;

  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusLabel(s: ChapterStatus) {
  if (s === "RECIBIDO") return "Recibido";
  if (s === "ASIGNADO_A_DICTAMINADOR") return "Asignado";
  if (s === "ENVIADO_A_DICTAMINADOR") return "Enviado a dictaminador";
  if (s === "EN_REVISION_DICTAMINADOR") return "En revisión (dictaminador)";
  if (s === "CORRECCIONES_SOLICITADAS_A_AUTOR") return "Correcciones solicitadas";
  if (s === "CORRECCIONES") return "Correcciones";
  if (s === "REENVIADO_POR_AUTOR") return "Reenviado";
  if (s === "REVISADO_POR_EDITORIAL") return "Revisado por editorial";
  if (s === "LISTO_PARA_FIRMA") return "Listo para firma";
  if (s === "FIRMADO") return "Firmado";
  if (s === "EN_REVISION") return "En revisión";
  if (s === "APROBADO") return "Aprobado";
  return "Rechazado";
}

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "D";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "D";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function getBadgeClass(status: ChapterStatus): string {
  const baseClass = styles.badge;

  if (
    [
      "ASIGNADO_A_DICTAMINADOR",
      "ENVIADO_A_DICTAMINADOR",
      "EN_REVISION",
      "EN_REVISION_DICTAMINADOR",
      "REENVIADO_POR_AUTOR",
      "REVISADO_POR_EDITORIAL",
      "LISTO_PARA_FIRMA",
    ].includes(status)
  ) {
    return `${baseClass} ${styles.statusPending}`;
  }
  if (["CORRECCIONES", "CORRECCIONES_SOLICITADAS_A_AUTOR"].includes(status)) {
    return `${baseClass} ${styles.statusCorrections}`;
  }
  if (["APROBADO", "RECHAZADO", "FIRMADO"].includes(status)) {
    return `${baseClass} ${styles.statusResolved}`;
  }
  return `${baseClass} ${styles.statusDefault}`;
}

function getStatusChipClass(status: ChapterStatus): string {
  const baseClass = styles.statusChip;

  if (status === "APROBADO" || status === "FIRMADO") return `${baseClass} ${styles.statusResolved}`;
  if (status === "RECHAZADO") return `${baseClass} ${styles.statusRejected}`;
  if (status === "CORRECCIONES" || status === "CORRECCIONES_SOLICITADAS_A_AUTOR") {
    return `${baseClass} ${styles.statusCorrections}`;
  }
  if (status === "EN_REVISION" || status === "EN_REVISION_DICTAMINADOR") {
    return `${baseClass} ${styles.statusPending}`;
  }
  if (status === "ENVIADO_A_DICTAMINADOR") return `${baseClass} ${styles.statusSent}`;
  if (status === "ASIGNADO_A_DICTAMINADOR") return `${baseClass} ${styles.statusAssigned}`;
  if (status === "REENVIADO_POR_AUTOR") return `${baseClass} ${styles.statusResent}`;
  if (status === "REVISADO_POR_EDITORIAL") return `${baseClass} ${styles.statusEditorial}`;
  if (status === "LISTO_PARA_FIRMA") return `${baseClass} ${styles.statusReady}`;

  return `${baseClass} ${styles.statusDefault}`;
}

function guessExtFromContentType(ct: string) {
  const s = (ct || "").toLowerCase();
  if (s.includes("pdf")) return ".pdf";
  if (s.includes("wordprocessingml.document")) return ".docx";
  if (s.includes("msword")) return ".doc";
  if (s.includes("vnd.openxmlformats-officedocument.spreadsheetml.sheet")) return ".xlsx";
  if (s.includes("vnd.ms-excel")) return ".xls";
  if (s.includes("text/plain")) return ".txt";
  return "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);

  requestAnimationFrame(() => {
    a.click();
    setTimeout(() => {
      try {
        a.remove();
      } catch {}
      window.URL.revokeObjectURL(url);
    }, 100);
  });
}

function toDateOnly(dateOrDatetime?: string | null): Date | null {
  if (!dateOrDatetime) return null;
  const d = String(dateOrDatetime).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return new Date(`${d}T00:00:00`);
}

function daysUntil(deadlineAt?: string | null): number | null {
  const dl = toDateOnly(deadlineAt);
  if (!dl) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = dl.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function deadlineTone(d: number | null) {
  if (d === null) {
    return { background: "rgba(148,163,184,.18)", borderColor: "rgba(148,163,184,.35)", color: "#334155" };
  }
  if (d < 0) {
    return { background: "rgba(244,63,94,.12)", borderColor: "rgba(244,63,94,.30)", color: "#9F1239" };
  }
  if (d <= 3) {
    return { background: "rgba(245,158,11,.14)", borderColor: "rgba(245,158,11,.35)", color: "#92400E" };
  }
  return { background: "rgba(16,185,129,.12)", borderColor: "rgba(16,185,129,.28)", color: "#065F46" };
}

/* =========================
   Iconos
========================= */
function Icon({
  name,
  tone = "muted",
}: {
  name:
    | "grid"
    | "book"
    | "user"
    | "refresh"
    | "logout"
    | "download"
    | "check"
    | "x"
    | "edit"
    | "bell"
    | "shield"
    | "privacy"
    | "search"
    | "eye"
    | "file"
    | "folder";
  tone?: "muted" | "light";
}) {
  const color = tone === "light" ? "rgba(255,255,255,0.92)" : "rgba(71,85,105,0.95)";
  const size = 18;
  const common = { width: size, height: size, display: "inline-block" as const };

  switch (name) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" />
          <path d="M4 13h7v7H4z" />
          <path d="M13 13h7v7h-7z" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M20 21a8 8 0 1 0-16 0" />
          <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 0 1-15.36 6.36" />
          <path d="M3 12a9 9 0 0 1 15.36-6.36" />
          <path d="M21 3v6h-6" />
          <path d="M3 21v-6h6" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M21 21H3" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
      );
    case "privacy":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a11 11 0 0 0-11 11v4a7 7 0 0 0 7 7h8a7 7 0 0 0 7-7v-4A11 11 0 0 0 12 1Z" />
          <path d="M12 11v4" />
          <path d="M9 11a3 3 0 0 1 6 0" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M21 21l-4.3-4.3" />
          <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      );
    case "eye":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      );
    case "file":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub ? <div className={styles.statSub}>{sub}</div> : null}
    </div>
  );
}

/* =========================
   Tarjeta
========================= */
const ChapterItem = React.memo(
  ({
    chapter,
    onAction,
    onDownloadLatest,
    onViewLatest,
    loading,
  }: {
    chapter: AssignedChapterRow;
    onAction: (type: "REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR", row: AssignedChapterRow) => void;
    onDownloadLatest: (c: AssignedChapterRow) => Promise<void>;
    onViewLatest: (c: AssignedChapterRow) => Promise<void>;
    loading: boolean;
  }) => {
    const statusClass = getStatusChipClass(chapter.status);

    const dlDays = daysUntil(chapter.deadline_at ?? null);
    const dlTone = deadlineTone(dlDays);

    const deadlineText = chapter.deadline_at ? `Fecha límite: ${fmtDateLong(chapter.deadline_at)}` : null;

    const deadlineRemain =
      dlDays === null
        ? null
        : dlDays < 0
        ? `Vencido (${Math.abs(dlDays)} día(s))`
        : dlDays === 0
        ? "Vence hoy"
        : `Faltan ${dlDays} día(s)`;

    const authorDlDays = daysUntil(chapter.author_deadline_at ?? null);
    const authorDlTone = deadlineTone(authorDlDays);

    const authorDeadlineText = chapter.author_deadline_at
      ? `Límite autor: ${fmtDateLong(chapter.author_deadline_at)}`
      : null;

    const authorDeadlineRemain =
      authorDlDays === null
        ? null
        : authorDlDays < 0
        ? `Vencido (${Math.abs(authorDlDays)} día(s))`
        : authorDlDays === 0
        ? "Vence hoy"
        : `Faltan ${authorDlDays} día(s)`;

    return (
      <div className={styles.item} style={{ display: "block", width: "100%", minHeight: "auto" }}>
        <div className={styles.itemTop} style={{ marginBottom: 12 }}>
          <div className={styles.itemTitle}>
            {chapter.title}
            {chapter.book_name ? <span className={styles.itemMuted}> • {chapter.book_name}</span> : null}
          </div>

          <span className={statusClass}>{statusLabel(chapter.status)}</span>
        </div>

        <div className={styles.itemMeta} style={{ marginBottom: 16 }}>
          <span className={styles.metaDot} />
          <span className={styles.metaSep}>•</span>
          <span>Actualizado {fmtDate(chapter.updated_at)}</span>

          {/* ✅ CORREO DEL AUTOR VISIBLE */}
          {chapter.author_name && (
            <>
              <span className={styles.metaSep}>•</span>
              <span>Autor: <b>{chapter.author_name}</b></span>
            </>
          )}
          {chapter.author_email && (
            <>
              <span className={styles.metaSep}>•</span>
              <span style={{ color: "#2d9cdb" }}>📧 {chapter.author_email}</span>
            </>
          )}

          {chapter.deadline_at ? (
            <>
              <span className={styles.metaSep}>•</span>
              <span className={styles.deadlineWrap}>
                <span className={styles.deadlineTag}>Editorial</span>
                <span className={styles.deadlineText}>{deadlineText}</span>
                <span className={styles.deadlinePill} style={dlTone}>
                  {deadlineRemain}
                </span>
              </span>
            </>
          ) : null}

          {chapter.author_deadline_at ? (
            <>
              <span className={styles.metaSep}>•</span>
              <span className={`${styles.deadlineWrap} ${styles.deadlineWrapAuthor}`}>
                <span className={styles.deadlineTag}>Autor</span>
                <span className={styles.deadlineText}>{authorDeadlineText}</span>
                <span className={styles.deadlinePill} style={authorDlTone}>
                  {authorDeadlineRemain}
                </span>
              </span>
            </>
          ) : null}
        </div>

        <div className={styles.itemActions} style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
          <button
            type="button"
            className={styles.btnSoft}
            onClick={() => onViewLatest(chapter)}
            disabled={loading}
            title="Abrir el último archivo"
          >
            <span className={styles.btnInner}>
              <Icon name="eye" /> Ver último
            </span>
          </button>

          <button
            type="button"
            className={styles.btnSoft}
            onClick={() => onDownloadLatest(chapter)}
            disabled={loading}
            title="Descargar el último archivo"
          >
            <span className={styles.btnInner}>
              <Icon name="download" /> Descargar último
            </span>
          </button>

          <button
            type="button"
            className={styles.btnSoft}
            onClick={() => onAction("REVISION", chapter)}
            disabled={loading}
            title="Marcar como En revisión"
          >
            <span className={styles.btnInner}>
              <Icon name="edit" /> Revisar
            </span>
          </button>

          <button
            type="button"
            className={styles.btnSoft}
            onClick={() => onAction("CORRECCIONES", chapter)}
            disabled={loading}
            title="Solicitar correcciones"
          >
            <span className={styles.btnInner}>
              <Icon name="edit" /> Correcciones
            </span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => onAction("APROBAR", chapter)}
            disabled={loading}
            title="Aprobar"
          >
            <span className={styles.btnInnerLight}>
              <Icon name="check" tone="light" /> Aprobar
            </span>
          </button>

          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => onAction("RECHAZAR", chapter)}
            disabled={loading}
            title="Rechazar"
          >
            <span className={styles.btnInner}>
              <Icon name="x" /> Rechazar
            </span>
          </button>
        </div>
      </div>
    );
  }
);

/* =========================
   Componente principal
========================= */
function MisAsignacionesDictaminadorContent() {
  const [nav, setNav] = useState<NavKey>("asignaciones");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({
    email_notify_enabled: true,
    notify_status_changes: true,
    notify_corrections: true,
    notify_approved_rejected: true,
  });
  const [privacy, setPrivacy] = useState<Privacy>({ show_name: true, show_email: false });
  const [openPrefs, setOpenPrefs] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [rows, setRows] = useState<AssignedChapterRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | ChapterStatus>("ALL");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR" | null>(null);
  const [selected, setSelected] = useState<AssignedChapterRow | null>(null);
  const [comment, setComment] = useState("");
  const [authorDeadline, setAuthorDeadline] = useState("");
  
  // NUEVOS ESTADOS para dictaminación
  const [selectedChapter, setSelectedChapter] = useState<AssignedChapterRow | null>(null);
  const [showDictamenForm, setShowDictamenForm] = useState(false);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken()}` }), []);
  const apiMsg = (err: any, fallback: string) => err?.response?.data?.detail || err?.message || fallback;
  
  const showError = (msg: string) => {
    alertService.error(msg);
    setErrorMsg(msg);
  };

  const hardLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }, []);

  const handleAuthMaybe = useCallback(
    (err: any) => {
      const st = err?.response?.status;
      if (st === 401 || st === 403) {
        alertService.warning("Sesión expirada. Serás redirigido al login.");
        hardLogout();
        return true;
      }
      return false;
    },
    [hardLogout]
  );

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get<Me>("/account/me", { headers: authHeaders() });
      console.log("👤 Datos del usuario /account/me:", data);
      setMe(data);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      setMe(null);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadPrefs = useCallback(async () => {
    try {
      const { data } = await api.get<Preferences>("/account/preferences", { headers: authHeaders() });
      setPrefs(data);
    } catch (err: any) {
      handleAuthMaybe(err);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadPrivacy = useCallback(async () => {
    try {
      const { data } = await api.get<Privacy>("/account/privacy", { headers: authHeaders() });
      setPrivacy(data);
    } catch (err: any) {
      handleAuthMaybe(err);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadAssignments = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const { data } = await api.get<AssignedChapterApi[]>("/dictaminador/chapters", {
        headers: authHeaders(),
      });

      const mapped: AssignedChapterRow[] = (data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        updated_at: c.updated_at,
        file_path: c.file_path ?? null,
        book_name: c.book_name ?? null,
        author_name: c.author_name ?? null,
        author_email: c.author_email ?? null,
        deadline_at: c.deadline_at ?? null,
        deadline_stage: c.deadline_stage ?? null,
        author_deadline_at: c.author_deadline_at ?? null,
        evaluador_cvu: (c as any).evaluador_cvu ?? null,
        evaluador_name: (c as any).evaluador_name ?? null,
      }));

      setRows(mapped);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudieron cargar tus asignaciones."));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, handleAuthMaybe]);

  useEffect(() => {
    loadMe();
    loadPrefs();
    loadPrivacy();
    loadAssignments();
  }, [loadMe, loadPrefs, loadPrivacy, loadAssignments]);

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;
        if (!norm) return true;

        const hay =
          String(r.id).includes(norm) ||
          (r.title || "").toLowerCase().includes(norm) ||
          (r.book_name || "").toLowerCase().includes(norm) ||
          (r.author_name || "").toLowerCase().includes(norm) ||
          (r.author_email || "").toLowerCase().includes(norm);

        return hay;
      })
      .slice()
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  }, [rows, q, status]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pendientes = rows.filter((r) =>
      [
        "ASIGNADO_A_DICTAMINADOR",
        "ENVIADO_A_DICTAMINADOR",
        "EN_REVISION",
        "EN_REVISION_DICTAMINADOR",
        "REENVIADO_POR_AUTOR",
        "REVISADO_POR_EDITORIAL",
        "LISTO_PARA_FIRMA",
      ].includes(r.status)
    ).length;

    const correcciones = rows.filter((r) =>
      ["CORRECCIONES", "CORRECCIONES_SOLICITADAS_A_AUTOR"].includes(r.status)
    ).length;

    const resueltos = rows.filter((r) =>
      ["APROBADO", "RECHAZADO", "FIRMADO"].includes(r.status)
    ).length;

    return { total, pendientes, correcciones, resueltos };
  }, [rows]);

  const patchStatus = async (
    chapterId: number,
    newStatus: ChapterStatus,
    extra?: { comment?: string; author_deadline_at?: string }
  ) => {
    const payload: any = { status: newStatus };
    if (extra?.comment) payload.comment = extra.comment;
    if (extra?.author_deadline_at) payload.author_deadline_at = extra.author_deadline_at;

    const { data } = await api.patch(`/dictaminador/chapters/${chapterId}/status`, payload, {
      headers: authHeaders(),
    });

    const updated: AssignedChapterRow = {
      id: data.id ?? chapterId,
      title: data.title ?? selected?.title ?? "",
      status: data.status ?? newStatus,
      updated_at: data.updated_at ?? new Date().toISOString(),
      file_path: data.file_path ?? selected?.file_path ?? null,
      book_name: data.book_name ?? selected?.book_name ?? null,
      author_name: data.author_name ?? selected?.author_name ?? null,
      author_email: data.author_email ?? selected?.author_email ?? null,
      deadline_at: data.deadline_at ?? selected?.deadline_at ?? null,
      deadline_stage: data.deadline_stage ?? selected?.deadline_stage ?? null,
      author_deadline_at: data.author_deadline_at ?? selected?.author_deadline_at ?? null,
    };

    setRows((prev) => prev.map((r) => (r.id === chapterId ? updated : r)));
  };

  const openAction = (type: "REVISION" | "CORRECCIONES" | "APROBAR" | "RECHAZAR", row: AssignedChapterRow) => {
    setSelected(row);
    setActionType(type);
    setComment("");
    setAuthorDeadline("");
    setActionOpen(true);
  };

  const runAction = async () => {
    if (!selected || !actionType) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      if (actionType === "REVISION") {
        await patchStatus(selected.id, "EN_REVISION");
        alertService.success("Capítulo marcado como 'En revisión'");
      }

      if (actionType === "CORRECCIONES") {
        if (!comment.trim()) {
          alertService.warning("Escribe las observaciones / comentario.");
          return;
        }

        if (!authorDeadline) {
          alertService.warning("Selecciona la fecha límite para el autor.");
          return;
        }

        await patchStatus(selected.id, "CORRECCIONES", {
          comment: comment.trim(),
          author_deadline_at: authorDeadline,
        });

        alertService.success("Correcciones solicitadas al autor");
      }

      if (actionType === "APROBAR") {
        const result = await alertService.confirm("¿Estás seguro de aprobar este capítulo?", "Aprobar capítulo");
        if (!result.isConfirmed) return;

        await patchStatus(selected.id, "APROBADO");
        alertService.success("Capítulo aprobado correctamente");
      }

      if (actionType === "RECHAZAR") {
        if (!comment.trim()) {
          alertService.warning("Escribe el motivo de rechazo.");
          return;
        }

        const result = await alertService.confirm(
          "¿Estás seguro de rechazar este capítulo? Esta acción no se puede deshacer.",
          "Rechazar capítulo"
        );
        if (!result.isConfirmed) return;

        await patchStatus(selected.id, "RECHAZADO", { comment: comment.trim() });
        alertService.success("Capítulo rechazado");
      }

      setActionOpen(false);
      await loadAssignments();
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudo ejecutar la acción."));
    } finally {
      setLoading(false);
    }
  };

  const viewLatestFile = async (c: AssignedChapterRow) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.get(`/dictaminador/chapters/${c.id}/view-latest`, {
        headers: authHeaders(),
        responseType: "blob",
        params: { ts: Date.now() },
      });

      const blob: Blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([JSON.stringify(res.data)], {
              type: res.headers?.["content-type"] || "application/octet-stream",
            });

      const blobUrl = window.URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");

      if (!newWindow) {
        alertService.warning("El navegador bloqueó la ventana emergente. Usa el botón 'Descargar último'.");
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
      } else {
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudo abrir el archivo."));
    } finally {
      setLoading(false);
    }
  };

  const downloadLatestFile = async (c: AssignedChapterRow) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.get(`/dictaminador/chapters/${c.id}/download-latest`, {
        headers: authHeaders(),
        responseType: "blob",
        params: { ts: Date.now() },
      });

      const blob: Blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([JSON.stringify(res.data)], {
              type: res.headers?.["content-type"] || "application/octet-stream",
            });

      let filename = `capitulo_${c.id}_ultimo`;
      const cd = res.headers?.["content-disposition"] as string | undefined;

      if (cd) {
        const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
        const raw = match?.[1] || match?.[2];
        if (raw) {
          try {
            filename = decodeURIComponent(raw);
          } catch {
            filename = raw;
          }
        }
      }

      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ct = (res.headers?.["content-type"] || "").toLowerCase();
        const ext = guessExtFromContentType(ct);
        if (ext) filename += ext;
      }

      downloadBlob(blob, filename);
      alertService.success("Descarga iniciada");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudo descargar el archivo."));
    } finally {
      setLoading(false);
    }
  };

  const savePrefs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Preferences>("/account/preferences", prefs, { headers: authHeaders() });
      setPrefs(data);
      setOpenPrefs(false);
      alertService.success("Preferencias guardadas ✅");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudieron guardar notificaciones."));
    } finally {
      setLoading(false);
    }
  };

  const savePrivacy = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data } = await api.patch<Privacy>("/account/privacy", privacy, { headers: authHeaders() });
      setPrivacy(data);
      setOpenPrivacy(false);
      alertService.success("Privacidad guardada ✅");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(apiMsg(err, "No se pudo guardar privacidad."));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const result = await alertService.confirm("¿Seguro que quieres cerrar sesión?");
    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  if (!me && loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#64748B" }}>Cargando información del usuario...</div>
      </div>
    );
  }

  const pageTitle = 
    nav === "asignaciones" 
      ? "Asignaciones" 
      : nav === "cuenta" 
      ? "Mi Cuenta" 
      : nav === "subirArchivos"
      ? "Subir Archivos Firmados"
      : nav === "documentosRecibidos"
      ? "Documentos Recibidos"
      : "Dictaminación";
      
  const pageSub =
    nav === "asignaciones"
      ? "Revisa capítulos, descarga archivos y registra dictámenes con trazabilidad."
      : nav === "cuenta"
      ? "Administra tu perfil, seguridad y preferencias del sistema."
      : nav === "subirArchivos"
      ? "Sube los archivos firmados digitalmente para que el administrador los revise."
      : nav === "documentosRecibidos"
      ? "Visualiza y descarga los documentos enviados por la editorial."
      : "Genera y administra los dictámenes de los capítulos evaluados.";

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.sideTop}>
          <div className={styles.brandMark}>
            <Icon name="grid" tone="light" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.brandName}>Editorial Interpec</div>
            <div className={styles.brandRole}>Panel de Dictaminador</div>
          </div>
        </div>

        <div className={styles.userCard}>
          <div className={styles.userAvatar}>{initials(me?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className={styles.userName}>{me?.name || "Dictaminador"}</div>
            <div className={styles.userEmail}>{me?.email || "Sesión activa"}</div>
          </div>
        </div>

        <div className={styles.sideNav}>
          <button
            type="button"
            onClick={() => setNav("asignaciones")}
            className={`${styles.navBtn} ${nav === "asignaciones" ? styles.navBtnActive : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon name="book" tone="light" />
            </span>
            <span>Asignaciones</span>
            {nav === "asignaciones" ? <span className={styles.navGlow} /> : null}
          </button>

          <button
            type="button"
            onClick={() => setNav("dictaminacion")}
            className={`${styles.navBtn} ${nav === "dictaminacion" ? styles.navBtnActive : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon name="file" tone="light" />
            </span>
            <span>Dictaminación</span>
            {nav === "dictaminacion" ? <span className={styles.navGlow} /> : null}
          </button>

          <button
            type="button"
            onClick={() => setNav("subirArchivos")}
            className={`${styles.navBtn} ${nav === "subirArchivos" ? styles.navBtnActive : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon name="folder" tone="light" />
            </span>
            <span>Subir Archivos</span>
            {nav === "subirArchivos" ? <span className={styles.navGlow} /> : null}
          </button>

          <button
            type="button"
            onClick={() => setNav("documentosRecibidos")}
            className={`${styles.navBtn} ${nav === "documentosRecibidos" ? styles.navBtnActive : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon name="download" tone="light" />
            </span>
            <span>Documentos Recibidos</span>
            {nav === "documentosRecibidos" ? <span className={styles.navGlow} /> : null}
          </button>

          <button
            type="button"
            onClick={() => setNav("cuenta")}
            className={`${styles.navBtn} ${nav === "cuenta" ? styles.navBtnActive : ""}`}
          >
            <span className={styles.navIcon}>
              <Icon name="user" tone="light" />
            </span>
            <span>Mi Cuenta</span>
            {nav === "cuenta" ? <span className={styles.navGlow} /> : null}
          </button>
        </div>

        <div className={styles.sideBottom}>
          <button type="button" className={styles.sideLogout} onClick={logout}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Icon name="logout" tone="light" /> Cerrar sesión
            </span>
          </button>
          <div className={styles.sideFoot}>© {new Date().getFullYear()} Editorial Interpec</div>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.topTitle}>{pageTitle}</div>
            <div className={styles.topSub}>{pageSub}</div>
          </div>

          <div className={styles.topActions}>
            {nav === "asignaciones" ? (
              <button type="button" className={styles.btnGhost} onClick={loadAssignments} disabled={loading}>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar
                </span>
              </button>
            ) : nav === "dictaminacion" ? (
              <button type="button" className={styles.btnGhost} onClick={loadAssignments} disabled={loading}>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar capítulos
                </span>
              </button>
            ) : nav === "subirArchivos" ? (
              <button type="button" className={styles.btnGhost} onClick={() => window.location.reload()} disabled={loading}>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar lista
                </span>
              </button>
            ) : nav === "documentosRecibidos" ? (
              <button type="button" className={styles.btnGhost} onClick={() => window.location.reload()} disabled={loading}>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar documentos
                </span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  loadMe();
                  loadPrefs();
                  loadPrivacy();
                }}
                disabled={loading}
              >
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Icon name="refresh" /> Actualizar datos
                </span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && <div className={styles.alertErr}>{errorMsg}</div>}

        {nav === "asignaciones" && (
          <div className={styles.hero}>
            <div className={styles.heroCard}>
              <div className={styles.heroKicker}>Panel de dictámenes</div>
              <div className={styles.heroTitle}>Control claro y rápido del flujo editorial</div>
              <div className={styles.heroText}>
                Descarga, revisa, solicita correcciones y emite dictamen. Mantén observaciones concretas para acelerar
                el ciclo.
              </div>

              <div className={styles.heroPills}>
                <span className={styles.heroPill}>
                  Sesión: <b style={{ color: "rgba(15,23,42,.9)" }}>{me?.email || "—"}</b>
                </span>
                <span className={styles.heroPill}>Tip: escribe observaciones por puntos.</span>
              </div>
            </div>

            <div className={styles.heroStats}>
              <Stat label="Total" value={stats.total} sub="Asignaciones" />
              <Stat label="Pendientes" value={stats.pendientes} sub="Por revisar" />
              <Stat label="Correcciones" value={stats.correcciones} sub="En espera" />
              <Stat label="Resueltos" value={stats.resueltos} sub="Aprobado / Rechazado" />
            </div>
          </div>
        )}

        {/* ===== SECCIÓN DICTAMINACIÓN ===== */}
        {nav === "dictaminacion" && (
          <div style={{ padding: "20px 24px" }}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Dictaminación</div>
                <div className={styles.cardHint}>Genera y administra dictámenes</div>
              </div>
              
              {/* Selector de capítulo */}
              <div className={styles.chapterSelector}>
                <label className={styles.selectorLabel}>Seleccionar capítulo para dictaminar:</label>
                <select 
                  className={styles.selectorSelect}
                  value={selectedChapter?.id || ""}
                  onChange={(e) => {
                    const chapterId = Number(e.target.value);
                    const chapter = rows.find(r => r.id === chapterId) || null;
                    
                    // Primero oculta el formulario
                    setShowDictamenForm(false);
                    
                    // Luego actualiza el capítulo seleccionado
                    setSelectedChapter(chapter);
                    
                    // Después de un pequeño delay, muestra el formulario nuevamente
                    if (chapter) {
                      setTimeout(() => {
                        setShowDictamenForm(true);
                      }, 50);
                    }
                  }}
                >
                  <option value="">-- Selecciona un capítulo --</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title} - {row.book_name || "Sin libro"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Formulario de dictamen con KEY para forzar remontaje */}
              {showDictamenForm && selectedChapter ? (
                <DictaminacionContent 
                  key={selectedChapter.id}
                  chapterId={selectedChapter.id}
                  chapterTitle={selectedChapter.title}
                  evaluadorName={me?.name || ""}
                  evaluadorCvu={
                    selectedChapter.evaluador_cvu ||
                    me?.cvo_snii ||
                    ""
                  }
                />
              ) : (
                <div className={styles.emptyState}>
                  <p style={{ textAlign: "center", color: "#64748B", padding: 40 }}>
                    Selecciona un capítulo de la lista para comenzar a generar el dictamen.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SECCIÓN SUBIR ARCHIVOS FIRMADOS ===== */}
        {nav === "subirArchivos" && <SubirArchivosFirmados />}

        {/* ===== SECCIÓN DOCUMENTOS RECIBIDOS ===== */}
        {nav === "documentosRecibidos" && <DocumentosRecibidos />}

        {nav === "cuenta" ? (
          <div className={styles.grid2}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Perfil</div>
                <div className={styles.cardHint}>Información básica de tu cuenta</div>
              </div>

              <div className={styles.kv}>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Nombre</div>
                  <div className={styles.kvVal}>{me?.name || "—"}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Correo</div>
                  <div className={styles.kvVal}>{me?.email || "—"}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvKey}>Rol</div>
                  <div className={styles.kvVal}>
                    <span className={styles.roleChip}>{me?.role || "dictaminador"}</span>
                  </div>
                </div>
              </div>

              <div className={styles.sep} />

              <div className={styles.note}>
                Las notificaciones se envían al correo con el que te registró la editorial: <b>{me?.email || "—"}</b>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Seguridad</div>
                <div className={styles.cardHint}>Contraseña y acceso</div>
              </div>

              <div className={styles.actionList}>
                <div className={styles.actionRow}>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.actionTitle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icon name="logout" /> Sesión
                      </span>
                    </div>
                    <div className={styles.actionSub}>Cierra sesión en este dispositivo si ya terminaste.</div>
                  </div>
                  <button type="button" className={styles.btnDangerSoft} onClick={logout}>
                    Cerrar
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Soporte</div>
                <div className={styles.cardHint}>¿Necesitas ayuda?</div>
              </div>

              <div className={styles.note}>
                Si tienes problemas con una asignación, contacta al área editorial. Revisa "Asignaciones" para ver el
                estado.
              </div>

              <div style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className={styles.btnGhost} onClick={() => setNav("asignaciones")}>
                  Ir a Asignaciones
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setNav("dictaminacion")}>
                  Ir a Dictaminación
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setNav("subirArchivos")}>
                  Ir a Subir Archivos
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setNav("documentosRecibidos")}>
                  Ir a Documentos Recibidos
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {nav === "asignaciones" && (
          <div className={styles.gridMain}>
            <section className={styles.card}>
              <div className={styles.cardHeadRow}>
                <div>
                  <div className={styles.cardTitle}>Mis asignaciones</div>
                  <div className={styles.cardHint}>{loading ? "Cargando..." : `${rows.length} capítulo(s)`}</div>
                </div>

                <div className={styles.searchWrap}>
                  <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>
                      <Icon name="search" />
                    </span>
                    <input
                      className={styles.searchInput}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar (título, autor, libro...)"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.filtersBar}>
                <div className={styles.filterBlock}>
                  <div className={styles.filterLabel}>Filtrar por estado</div>
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="ALL">Todos</option>
                    <option value="ASIGNADO_A_DICTAMINADOR">Asignado</option>
                    <option value="ENVIADO_A_DICTAMINADOR">Enviado a dictaminador</option>
                    <option value="EN_REVISION_DICTAMINADOR">En revisión (dictaminador)</option>
                    <option value="EN_REVISION">En revisión</option>
                    <option value="CORRECCIONES_SOLICITADAS_A_AUTOR">Correcciones solicitadas</option>
                    <option value="CORRECCIONES">Correcciones</option>
                    <option value="REENVIADO_POR_AUTOR">Reenviado</option>
                    <option value="REVISADO_POR_EDITORIAL">Revisado por editorial</option>
                    <option value="LISTO_PARA_FIRMA">Listo para firma</option>
                    <option value="FIRMADO">Firmado</option>
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>

                <div className={styles.quickBadges}>
                  <span className={getBadgeClass("ASIGNADO_A_DICTAMINADOR")}>Pendientes: {stats.pendientes}</span>
                  <span className={getBadgeClass("CORRECCIONES_SOLICITADAS_A_AUTOR")}>Correcciones: {stats.correcciones}</span>
                  <span className={getBadgeClass("APROBADO")}>Resueltos: {stats.resueltos}</span>
                </div>
              </div>

              <div className={styles.list} style={{ minHeight: 240 }}>
                {!loading && filtered.length === 0 ? (
                  <div className={styles.empty}>No hay asignaciones con ese filtro.</div>
                ) : (
                  filtered.map((r) => (
                    <ChapterItem
                      key={`chapter-${r.id}-${r.updated_at}`}
                      chapter={r}
                      onAction={openAction}
                      onDownloadLatest={downloadLatestFile}
                      onViewLatest={viewLatestFile}
                      loading={loading}
                    />
                  ))
                )}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Guía rápida</div>
                <div className={styles.cardHint}>Flujo sugerido</div>
              </div>

             <div className={styles.note}>
  <div>
    <b>1)</b> Abre <b>Ver último</b> para ver el archivo más reciente.
  </div>

  <div>
    <b>2)</b> Descarga con <b>Descargar último</b>.
  </div>

  <div>
    <b>3)</b> Marca <b>En revisión</b> o solicita <b>Correcciones</b>.
  </div>

  <div>
    <b>4)</b> Cuando el autor reenvíe, vuelve a <b>Ver último</b> y decide:{" "}
    <b>Aprobar</b> o <b>Rechazar</b>.
  </div>

  <div>
    <b>5)</b> Si apruebas, el capítulo pasará al apartado de Dictaminación,{" "}
    <b>
      donde seleccionarás el capítulo a dictaminar y posteriormente
      llenarás los datos correspondientes.
    </b>{" "}
    Guarda los datos para seleccionar la plantilla de dictamen y generar
    el archivo. <b>Descarga el dictamen</b> y procede a firmarlo
    digitalmente.
  </div>

  <div>
    <b>6)</b> Cuando tengas el archivo firmado, ve a{" "}
    <b>Subir Archivos</b> para subirlo y que la editorial lo revise.
  </div>

  <div>
    <b>7)</b> En el apartado de <b>Documentos Recibidos</b> es en donde podrás ver los archivos que la editorial
    haya subido para ti, como la <b>Constancia de Dictamen</b> y donde a su vez, podrás descargar.
  </div>
</div>

              <div className={styles.sep} />

              <div className={styles.note}>
                Registros cargados: <b>{rows.length}</b>
                <br />
                Registros filtrados: <b>{filtered.length}</b>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ===== MODALES FUERA DEL MAIN ===== */}
      
      {/* Modal de acción (correcciones, aprobar, rechazar) */}
      {actionOpen && selected && actionType && (
        <div className={styles.overlay} onClick={() => setActionOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              {actionType === "REVISION"
                ? "Marcar En revisión"
                : actionType === "CORRECCIONES"
                ? "Solicitar correcciones"
                : actionType === "APROBAR"
                ? "Aprobar capítulo"
                : "Rechazar capítulo"}
            </div>

            <div className={styles.modalHint}>
              <div>
                Capítulo: <b>{selected.title}</b> • Estado actual: <b>{statusLabel(selected.status)}</b>
              </div>
              {/* ✅ CORREO DEL AUTOR EN EL MODAL */}
              {(selected.author_name || selected.author_email) && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#1e293b" }}>
                  {selected.author_name && (
                    <span>
                      Autor: <b>{selected.author_name}</b>
                    </span>
                  )}
                  {selected.author_email && (
                    <span style={{ marginLeft: 12 }}>
                      📧 <b style={{ color: "#2d9cdb" }}>{selected.author_email}</b>
                    </span>
                  )}
                </div>
              )}
              {actionType === "CORRECCIONES" && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#92400e", background: "#fef3c7", padding: "8px 12px", borderRadius: 8 }}>
                  ⚠️ Las correcciones se enviarán al autor por correo electrónico.
                </div>
              )}
            </div>

            {(actionType === "CORRECCIONES" || actionType === "RECHAZAR") && (
              <>
                <label className={styles.modalLabel}>
                  {actionType === "CORRECCIONES" ? "Observaciones / comentario" : "Motivo de rechazo"}
                </label>
                <textarea
                  className={styles.modalInput}
                  style={{ minHeight: 120, resize: "vertical" }}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionType === "CORRECCIONES"
                      ? "• Ajustar formato\n• Revisar coherencia...\n• Corregir referencias..."
                      : "• No cumple criterios\n• Falta metodología..."
                  }
                />

                {actionType === "CORRECCIONES" && (
                  <>
                    <div style={{ height: 10 }} />
                    <label className={styles.modalLabel}>Fecha límite para el autor</label>
                    <input
                      className={styles.modalInput}
                      type="date"
                      value={authorDeadline}
                      onChange={(e) => setAuthorDeadline(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            <div className={styles.modalActions}>
              <button className={styles.btnGhost} type="button" onClick={() => setActionOpen(false)}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} type="button" onClick={runAction} disabled={loading}>
                {loading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de preferencias */}
      {openPrefs && (
        <div className={styles.overlay} onClick={() => setOpenPrefs(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Notificaciones por correo</div>
            <div className={styles.modalHint}>
              Se enviarán al correo: <b>{me?.email || "—"}</b>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={prefs.email_notify_enabled}
                onChange={(e) => setPrefs((s) => ({ ...s, email_notify_enabled: e.target.checked }))}
              />
              <span>
                <b>Activar notificaciones</b>
                <div className={styles.checkSub}>Recibir avisos oficiales del proceso editorial.</div>
              </span>
            </label>

            <div style={{ height: 10 }} />

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={prefs.notify_status_changes}
                disabled={!prefs.email_notify_enabled}
                onChange={(e) => setPrefs((s) => ({ ...s, notify_status_changes: e.target.checked }))}
              />
              <span>Cuando cambie el estado del capítulo</span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={prefs.notify_corrections}
                disabled={!prefs.email_notify_enabled}
                onChange={(e) => setPrefs((s) => ({ ...s, notify_corrections: e.target.checked }))}
              />
              <span>Cuando solicite correcciones</span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={prefs.notify_approved_rejected}
                disabled={!prefs.email_notify_enabled}
                onChange={(e) => setPrefs((s) => ({ ...s, notify_approved_rejected: e.target.checked }))}
              />
              <span>Cuando apruebe o rechace</span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.btnGhost} type="button" onClick={() => setOpenPrefs(false)}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} type="button" onClick={savePrefs} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de privacidad */}
      {openPrivacy && (
        <div className={styles.overlay} onClick={() => setOpenPrivacy(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Privacidad</div>
            <div className={styles.modalHint}>Controla lo que se muestra en tu perfil dentro del sistema.</div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={privacy.show_name}
                onChange={(e) => setPrivacy((s) => ({ ...s, show_name: e.target.checked }))}
              />
              <span>Mostrar mi nombre</span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={privacy.show_email}
                onChange={(e) => setPrivacy((s) => ({ ...s, show_email: e.target.checked }))}
              />
              <span>Mostrar mi correo</span>
            </label>

            <div className={styles.modalActions}>
              <button className={styles.btnGhost} type="button" onClick={() => setOpenPrivacy(false)}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} type="button" onClick={savePrivacy} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MisAsignacionesDictaminador() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Cargando módulo...</div>}>
        <MisAsignacionesDictaminadorContent />
      </Suspense>
    </ErrorBoundary>
  );
}