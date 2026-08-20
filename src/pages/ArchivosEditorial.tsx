import React, { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";
import { alertService } from "../utils/alerts";
import styles from "./ArchivosEditorial.module.css";

/* =========================
   Tipos
========================= */
type ArchivoFirmado = {
  id: number;
  id_articulo: number;
  id_dictaminador: number;
  nombre_original: string;
  ruta_archivo: string;
  tamaño: number;
  comentario: string | null;
  fecha_subida: string;
  // Datos relacionados (JOIN)
  articulo_titulo?: string;
  dictaminador_nombre?: string;
  dictaminador_email?: string;
};

type GrupoArchivos = {
  id_articulo: number;
  articulo_titulo: string;
  dictaminador_nombre: string;
  dictaminador_email: string;
  archivos: ArchivoFirmado[];
  fecha_ultima_subida: string;
};

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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    | "folder"
    | "zip";
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
    case "zip":
      return (
        <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M12 10v4" />
          <path d="M12 18h.01" />
        </svg>
      );
  }
}

/* =========================
   Componente Principal
========================= */
function ArchivosEditorialContent() {
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<ArchivoFirmado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoArchivos | null>(null);
  const [downloading, setDownloading] = useState(false);

  const isMounted = useRef(true);

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken()}` }), []);

const showError = (msg: string) => {
  console.error("ArchivosEditorial:", msg);
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
      console.warn("Sesión expirada o sin permisos.");
      hardLogout();
      return true;
    }

    return false;
  },
  [hardLogout]
);

  const loadArchivos = useCallback(async () => {
    if (!isMounted.current) return;
    
    setErrorMsg(null);
    setLoading(true);

    try {
      const { data } = await api.get<ArchivoFirmado[]>("/dictaminador/admin/archivos-firmados", {
        headers: authHeaders(),
      });

      if (isMounted.current) {
        setArchivos(data || []);
      }
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(err?.response?.data?.detail || err?.message || "No se pudieron cargar los archivos firmados.");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [authHeaders, handleAuthMaybe]);

  useEffect(() => {
    isMounted.current = true;
    loadArchivos();
    
    return () => {
      isMounted.current = false;
    };
  }, [loadArchivos]);

  // Agrupar archivos por artículo
  const grupos = React.useMemo(() => {
    const map = new Map<number, GrupoArchivos>();

    archivos.forEach((arch) => {
      const key = arch.id_articulo;
      if (!map.has(key)) {
        map.set(key, {
          id_articulo: arch.id_articulo,
          articulo_titulo: arch.articulo_titulo || `Artículo #${arch.id_articulo}`,
          dictaminador_nombre: arch.dictaminador_nombre || "Desconocido",
          dictaminador_email: arch.dictaminador_email || "",
          archivos: [],
          fecha_ultima_subida: arch.fecha_subida,
        });
      }
      const grupo = map.get(key)!;
      grupo.archivos.push(arch);
      // Actualizar fecha más reciente
      if (arch.fecha_subida > grupo.fecha_ultima_subida) {
        grupo.fecha_ultima_subida = arch.fecha_subida;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.fecha_ultima_subida.localeCompare(a.fecha_ultima_subida)
    );
  }, [archivos]);

  // Filtrar grupos
  const gruposFiltrados = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return grupos;

    return grupos.filter(
      (g) =>
        g.articulo_titulo.toLowerCase().includes(term) ||
        g.dictaminador_nombre.toLowerCase().includes(term) ||
        g.dictaminador_email.toLowerCase().includes(term) ||
        g.archivos.some((a) => a.nombre_original.toLowerCase().includes(term))
    );
  }, [grupos, searchTerm]);

  // Estadísticas
  const stats = React.useMemo(() => ({
    totalArticulos: grupos.length,
    totalArchivos: archivos.length,
    totalDictaminadores: new Set(archivos.map(a => a.id_dictaminador)).size,
  }), [grupos, archivos]);

  const openModal = (grupo: GrupoArchivos) => {
    setSelectedGrupo(grupo);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGrupo(null);
  };

  const downloadSingleFile = async (archivo: ArchivoFirmado) => {
    try {
      setDownloading(true);
      const res = await api.get(`/dictaminador/admin/archivos-firmados/${archivo.id}/download`, {
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

      let filename = archivo.nombre_original;

      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ct = (res.headers?.["content-type"] || "").toLowerCase();
        if (ct.includes("pdf")) filename += ".pdf";
        else if (ct.includes("word")) filename += ".docx";
        else if (ct.includes("msword")) filename += ".doc";
      }

      downloadBlob(blob, filename);
      alertService.success(`Descargando: ${archivo.nombre_original}`);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(err?.response?.data?.detail || err?.message || "No se pudo descargar el archivo.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllFiles = async (grupo: GrupoArchivos) => {
    try {
      setDownloading(true);
      
      // Intentar descargar ZIP
      try {
        const res = await api.get(`/dictaminador/admin/archivos-firmados/zip/${grupo.id_articulo}`, {
          headers: authHeaders(),
          responseType: "blob",
          params: { ts: Date.now() },
        });

        const blob: Blob =
          res.data instanceof Blob
            ? res.data
            : new Blob([JSON.stringify(res.data)], {
                type: res.headers?.["content-type"] || "application/zip",
              });

        const filename = `archivos_firmados_articulo_${grupo.id_articulo}.zip`;
        downloadBlob(blob, filename);
        alertService.success(`Descargando ${grupo.archivos.length} archivo(s) en ZIP`);
        return;
      } catch (zipErr: any) {
        // Si el endpoint ZIP no existe, descargamos uno por uno
        if (zipErr?.response?.status === 404 || zipErr?.response?.status === 501) {
          for (const arch of grupo.archivos) {
            await downloadSingleFile(arch);
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          alertService.success(`Descargando ${grupo.archivos.length} archivo(s) individualmente`);
          return;
        }
        throw zipErr;
      }
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      showError(err?.response?.data?.detail || err?.message || "No se pudieron descargar los archivos.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Mejorado */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>📁</div>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerTitle}>Archivos Firmados Recibidos</div>
            <div className={styles.headerSub}>
              <span className={styles.statusDot} />
              {loading ? "Cargando..." : `${grupos.length} artículo(s) con archivos firmados`}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={loadArchivos}
            disabled={loading}
          >
            <Icon name="refresh" /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats Bar - NUEVO */}
      <div className={styles.statsBar}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>📄</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Artículos</span>
            <span className={styles.statValue}>{stats.totalArticulos}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>📎</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Archivos</span>
            <span className={styles.statValue}>{stats.totalArchivos}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>👤</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Dictaminadores</span>
            <span className={styles.statValue}>{stats.totalDictaminadores}</span>
          </div>
        </div>
      </div>

      {errorMsg && <div className={styles.alertErr}>{errorMsg}</div>}

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <Icon name="search" />
          </span>
          <input
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por artículo, dictaminador o nombre de archivo..."
          />
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            Cargando archivos firmados...
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            {searchTerm
              ? "No hay resultados con ese filtro."
              : "Aún no hay archivos firmados subidos por los dictaminadores."}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Dictaminador</th>
                <th>Última subida</th>
                <th>Archivos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.map((grupo) => (
                <tr key={grupo.id_articulo}>
                  <td className={styles.cellTitle}>
                    {grupo.articulo_titulo}
                    <span className={styles.versionBadge}>v{grupo.archivos.length}</span>
                  </td>
                  <td>
                    <div className={styles.dictaminadorInfo}>
                      <span className={styles.dictaminadorName}>{grupo.dictaminador_nombre}</span>
                      {grupo.dictaminador_email && (
                        <span className={styles.dictaminadorEmail}>
                          {grupo.dictaminador_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={styles.dateCell}>{fmtDateLong(grupo.fecha_ultima_subida)}</td>
                  <td>
                    <span className={styles.fileCount}>
                      {grupo.archivos.length} archivo(s)
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => openModal(grupo)}
                      >
                        <Icon name="eye" tone="light" /> Ver
                      </button>
                      <button
                        type="button"
                        className={styles.btnSoft}
                        onClick={() => downloadAllFiles(grupo)}
                        disabled={downloading}
                      >
                        <Icon name="download" /> Descargar todos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal con lista de archivos */}
      {modalOpen && selectedGrupo && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                Archivos firmados
                <span className={styles.modalSub}>
                  {selectedGrupo.articulo_titulo}
                </span>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <span className={styles.infoItem}>
                  <span className={styles.label}>Dictaminador:</span>
                  <span className={styles.value}>{selectedGrupo.dictaminador_nombre}</span>
                </span>
                {selectedGrupo.dictaminador_email && (
                  <span className={styles.infoItem}>
                    <span className={styles.label}>Email:</span>
                    <span className={styles.value}>{selectedGrupo.dictaminador_email}</span>
                  </span>
                )}
                <span className={styles.infoItem}>
                  <span className={styles.label}>Total:</span>
                  <span className={styles.value}>{selectedGrupo.archivos.length} archivo(s)</span>
                </span>
              </div>

              <div className={styles.fileList}>
                {selectedGrupo.archivos.map((arch) => (
                  <div key={arch.id} className={styles.fileItem}>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>
                        <span className={styles.fileIcon}>📄</span>
                        {arch.nombre_original}
                      </span>
                      <span className={styles.fileMeta}>
                        {formatFileSize(arch.tamaño)}
                        <span className={styles.sep}>•</span>
                        Subido: {fmtDate(arch.fecha_subida)}
                      </span>
                      {arch.comentario && (
                        <span className={styles.fileComment}>💬 {arch.comentario}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.btnSoft}
                      onClick={() => downloadSingleFile(arch)}
                      disabled={downloading}
                    >
                      <Icon name="download" /> Descargar
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => downloadAllFiles(selectedGrupo)}
                  disabled={downloading}
                >
                  <Icon name="zip" tone="light" /> Descargar todos en ZIP
                </button>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArchivosEditorial() {
  return <ArchivosEditorialContent />;
}