import React, { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../../services/api";
import styles from "./DocumentosRecibidos.module.css";

/* =========================
   Tipos
========================= */
type DocumentoRecibido = {
  id: number;
  id_dictaminador: number;
  nombre_original: string;
  titulo?: string;
  descripcion?: string;
  leido: number;
  fecha_envio: string;
  dictaminador_nombre?: string;
  articulo_titulo?: string;
};

/* =========================
   Helpers
========================= */
function getToken() {
  return localStorage.getItem("token") || "";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      try { a.remove(); } catch {}
      window.URL.revokeObjectURL(url);
    }, 100);
  });
}

/* =========================
   Iconos
========================= */
function Icon({ name, tone = "muted" }: { name: "download" | "refresh" | "search" | "eye" | "file" | "check" | "clock"; tone?: "muted" | "light"; }) {
  const color = tone === "light" ? "rgba(255,255,255,0.92)" : "rgba(71,85,105,0.95)";
  const size = 18;
  const common = { width: size, height: size, display: "inline-block" as const };
  switch (name) {
    case "download":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M21 21H3" /></svg>;
    case "refresh":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 0 1-15.36 6.36" /><path d="M3 12a9 9 0 0 1 15.36-6.36" /><path d="M21 3v6h-6" /><path d="M3 21v-6h6" /></svg>;
    case "search":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 21l-4.3-4.3" /><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>;
    case "eye":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>;
    case "file":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>;
    case "clock":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    default:
      return null;
  }
}

/* =========================
   Componente Principal
========================= */
function DocumentosRecibidosContent() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoRecibido[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [descargando, setDescargando] = useState<number | null>(null);
  const [marcandoLeido, setMarcandoLeido] = useState<number | null>(null);
  const isMounted = useRef(true);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken()}` }), []);

  const hardLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }, []);

  const handleAuthMaybe = useCallback((err: any) => {
    const st = err?.response?.status;
    if (st === 401 || st === 403) {
      hardLogout();
      return true;
    }
    return false;
  }, [hardLogout]);

  // Cargar documentos recibidos
  const loadDocumentos = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await api.get<DocumentoRecibido[]>("/documentos/dictaminador/recibidos", {
        headers: authHeaders(),
      });
      if (isMounted.current) {
        setDocumentos(data || []);
      }
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      setErrorMsg(err?.response?.data?.detail || err?.message || "No se pudieron cargar los documentos.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [authHeaders, handleAuthMaybe]);

  // Marcar documento como leído
  const marcarLeido = async (documentoId: number) => {
    setMarcandoLeido(documentoId);
    try {
      await api.post(`/documentos/dictaminador/${documentoId}/marcar-leido`, {}, {
        headers: authHeaders(),
      });
      // Actualizar la lista
      await loadDocumentos();
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      alert("Error al marcar como leído.");
    } finally {
      setMarcandoLeido(null);
    }
  };

  // Descargar documento
  const downloadDocumento = async (documento: DocumentoRecibido) => {
    setDescargando(documento.id);
    try {
      const res = await api.get(`/documentos/dictaminador/${documento.id}/descargar`, {
        headers: authHeaders(),
        responseType: "blob",
        params: { ts: Date.now() },
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)], { type: res.headers?.["content-type"] || "application/octet-stream" });
      downloadBlob(blob, documento.nombre_original);
      // Recargar para actualizar el estado "leído"
      await loadDocumentos();
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      alert("Error al descargar el documento.");
    } finally {
      setDescargando(null);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadDocumentos();
    return () => { isMounted.current = false; };
  }, [loadDocumentos]);

  // Filtrar documentos
  const documentosFiltrados = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return documentos;
    return documentos.filter(d =>
      d.titulo?.toLowerCase().includes(term) ||
      d.nombre_original.toLowerCase().includes(term) ||
      d.articulo_titulo?.toLowerCase().includes(term) ||
      d.dictaminador_nombre?.toLowerCase().includes(term)
    );
  }, [documentos, searchTerm]);

  const noLeidos = documentos.filter(d => d.leido === 0).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>📥 Documentos Recibidos</div>
          <div className={styles.headerSub}>
            {loading ? "Cargando..." : `${documentos.length} documento(s) recibidos`}
            {noLeidos > 0 && (
              <span className={styles.badgeNoLeidoHeader}>🔴 {noLeidos} sin leer</span>
            )}
          </div>
        </div>
        <button type="button" className={styles.btnGhost} onClick={loadDocumentos} disabled={loading}>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            <Icon name="refresh" /> Actualizar
          </span>
        </button>
      </div>

      {errorMsg && <div className={styles.alertErr}>{errorMsg}</div>}

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}><Icon name="search" /></span>
          <input
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, capítulo o nombre del documento..."
          />
        </div>
      </div>

      {/* Lista de documentos */}
      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.loadingState}>Cargando documentos...</div>
        ) : documentosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? "No hay resultados con ese filtro." : "No has recibido documentos de la editorial."}
          </div>
        ) : (
          <div className={styles.cardsContainer}>
            {documentosFiltrados.map((doc) => (
              <div key={doc.id} className={`${styles.card} ${doc.leido === 0 ? styles.cardNoLeido : styles.cardLeido}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <Icon name="file" />
                    <span>{doc.titulo || doc.nombre_original}</span>
                  </div>
                  <span className={doc.leido === 1 ? styles.badgeLeido : styles.badgeNoLeido}>
                    {doc.leido === 1 ? "✅ Leído" : "⏳ No leído"}
                  </span>
                </div>

                {doc.descripcion && (
                  <div className={styles.cardDesc}>{doc.descripcion}</div>
                )}

                <div className={styles.cardMeta}>
                  <span>📄 {doc.nombre_original}</span>
                  {doc.articulo_titulo && <span>📖 {doc.articulo_titulo}</span>}
                  <span>📅 {fmtDateLong(doc.fecha_envio)}</span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => downloadDocumento(doc)}
                    disabled={descargando === doc.id}
                  >
                    <Icon name="download" tone="light" />
                    {descargando === doc.id ? "Descargando..." : "Descargar"}
                  </button>
                  {doc.leido === 0 && (
                    <button
                      type="button"
                      className={styles.btnSoft}
                      onClick={() => marcarLeido(doc.id)}
                      disabled={marcandoLeido === doc.id}
                    >
                      <Icon name="check" />
                      {marcandoLeido === doc.id ? "Marcando..." : "Marcar como leído"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentosRecibidos() {
  return <DocumentosRecibidosContent />;
}