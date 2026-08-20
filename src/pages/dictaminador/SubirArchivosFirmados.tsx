import React, { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../../services/api";
import styles from "./SubirArchivosFirmados.module.css";

/* =========================================================
   TIPOS
========================================================= */

type ArchivoSubido = {
  id: number;
  nombre_original: string;
  ruta_archivo: string;
  tamaño: number;
  fecha_subida: string;
  comentario?: string;
};

type AssignedChapter = {
  id: number;
  title: string;
  book_name?: string | null;
  status: string;
};

/* =========================================================
   HELPERS
========================================================= */

function getToken(): string {
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

/* =========================================================
   ICONOS
========================================================= */

function Icon({ name, tone = "muted" }: { 
  name: "upload" | "file" | "x" | "download" | "refresh" | "check" | "trash" | "delete";
  tone?: "muted" | "light";
}) {
  const color = tone === "light" ? "rgba(255,255,255,0.92)" : "rgba(71,85,105,0.95)";
  const common = { width: 18, height: 18, display: "inline-block" as const, flexShrink: 0 };

  switch (name) {
    case "upload":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 3v12" /><path d="M7 10l5-5 5 5" /><path d="M21 21H3" /></svg>;
    case "file":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /></svg>;
    case "x":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>;
    case "download":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M21 21H3" /></svg>;
    case "refresh":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 0 1-15.36 6.36" /><path d="M3 12a9 9 0 0 1 15.36-6.36" /><path d="M21 3v6h-6" /><path d="M3 21v-6h6" /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>;
    case "trash":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    case "delete":
      return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
    default: return null;
  }
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function SubirArchivosFirmados() {
  const [loading, setLoading] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capitulos, setCapitulos] = useState<AssignedChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [comentario, setComentario] = useState("");
  const [archivosSubidos, setArchivosSubidos] = useState<ArchivoSubido[]>([]);
  const [mostrarSubidos, setMostrarSubidos] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const isMounted = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Cargar capítulos asignados
  const loadChapters = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get("/dictaminador/chapters", { 
        headers: authHeaders() 
      });
      
      const data = response.data || [];
      
      if (isMounted.current) {
        setCapitulos(data);
      }
    } catch (err: any) {
      console.error("❌ Error cargando capítulos:", err);
      if (handleAuthMaybe(err)) return;
      setErrorMsg(err?.response?.data?.detail || err?.message || "No se pudieron cargar los capítulos.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [authHeaders, handleAuthMaybe]);

  // ✅ Cargar archivos subidos - USANDO EL ROUTER CORRECTO
  const loadArchivosSubidos = useCallback(async () => {
    if (!selectedChapter || !isMounted.current) return;
    try {
      const { data } = await api.get(`/dictaminador/chapters/${selectedChapter}/archivos-firmados`, { 
        headers: authHeaders() 
      });
      if (isMounted.current) setArchivosSubidos(data || []);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      console.error("Error cargando archivos:", err);
    }
  }, [selectedChapter, authHeaders, handleAuthMaybe]);

  // Inicializar
  useEffect(() => {
    isMounted.current = true;
    loadChapters();
    return () => { isMounted.current = false; };
  }, [loadChapters]);

  // Cargar archivos al cambiar de capítulo
  useEffect(() => {
    if (selectedChapter) loadArchivosSubidos();
    else setArchivosSubidos([]);
  }, [selectedChapter, loadArchivosSubidos]);

  // Manejar selección de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nuevosArchivos = Array.from(files);
    
    // Validar extensiones
    const invalidFiles = nuevosArchivos.filter(f => !/\.(doc|docx|pdf)$/i.test(f.name));
    if (invalidFiles.length > 0) {
      window.alert(`Los siguientes archivos no son válidos (solo .doc, .docx, .pdf): ${invalidFiles.map(f => f.name).join(", ")}`);
      e.target.value = "";
      return;
    }

    // Validar tamaño (50MB)
    const oversized = nuevosArchivos.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      window.alert(`Los siguientes archivos exceden los 50MB: ${oversized.map(f => f.name).join(", ")}`);
      e.target.value = "";
      return;
    }

    setArchivos(prev => [...prev, ...nuevosArchivos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Eliminar archivo de la lista
  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ Subir archivos - USANDO EL ROUTER CORRECTO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subiendo) return;
    if (!selectedChapter) { window.alert("Selecciona un capítulo primero."); return; }
    if (archivos.length === 0) { window.alert("Selecciona al menos un archivo para subir."); return; }

    const formData = new FormData();
    
    archivos.forEach(file => {
      formData.append("archivos", file);
    });
    
    if (comentario.trim()) {
      formData.append("comentario", comentario.trim());
    }

    setSubiendo(true);
    setErrorMsg(null);

    try {
      const response = await api.post(
        `/dictaminador/chapters/${selectedChapter}/subir-firmados`,
        formData,
        { headers: { ...authHeaders() } }
      );

      console.log("✅ Respuesta:", response.data);

      window.alert(`✅ ¡${archivos.length} archivo(s) subido(s) correctamente!`);
      
      setArchivos([]);
      setComentario("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadArchivosSubidos();
      setMostrarSubidos(true);
    } catch (err: any) {
      console.error("❌ Error:", err);
      if (handleAuthMaybe(err)) return;
      const message = err?.response?.data?.detail || err?.message || "Error al subir los archivos.";
      setErrorMsg(message);
      window.alert("❌ Error: " + message);
    } finally {
      setSubiendo(false);
    }
  };

  // ✅ Eliminar archivo subido - USANDO EL ROUTER CORRECTO
  const eliminarArchivo = async (archivoId: number) => {
    if (!selectedChapter) return;
    if (!confirm("¿Estás seguro de eliminar este archivo? Esta acción no se puede deshacer.")) return;
    
    setEliminando(archivoId);
    try {
      await api.delete(`/dictaminador/chapters/${selectedChapter}/archivos-firmados/${archivoId}`, { 
        headers: authHeaders() 
      });
      await loadArchivosSubidos();
      window.alert("✅ Archivo eliminado correctamente");
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      window.alert("❌ Error: " + (err?.response?.data?.detail || err?.message || "No se pudo eliminar el archivo."));
    } finally {
      setEliminando(null);
    }
  };

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      RECIBIDO: "Recibido",
      ASIGNADO_A_DICTAMINADOR: "Asignado",
      ENVIADO_A_DICTAMINADOR: "Enviado",
      EN_REVISION: "En revisión",
      EN_REVISION_DICTAMINADOR: "En revisión (dictaminador)",
      CORRECCIONES_SOLICITADAS_A_AUTOR: "Correcciones solicitadas",
      CORRECCIONES: "Correcciones",
      REENVIADO_POR_AUTOR: "Reenviado por autor",
      REVISADO_POR_EDITORIAL: "Revisado por editorial",
      LISTO_PARA_FIRMA: "Listo para firma",
      FIRMADO: "Firmado",
      APROBADO: "Aprobado",
      RECHAZADO: "Rechazado",
    };
    return map[status] || status;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>📤 Subir Archivos Firmados</div>
          <div className={styles.headerSub}>
            {loading ? "Cargando capítulos..." : `${capitulos.length} capítulo(s) disponibles`}
          </div>
        </div>
        <button type="button" className={styles.btnGhost} onClick={loadChapters} disabled={loading}>
          <Icon name="refresh" /> Actualizar
        </button>
      </div>

      {errorMsg && <div className={styles.alertErr}>{errorMsg}</div>}

      {/* Selector de capítulo */}
      <div className={styles.selectorSection}>
        <label className={styles.selectorLabel}>Selecciona el capítulo para subir el(los) archivo(s) firmado(s):</label>
        <select
          className={styles.selectorSelect}
          value={selectedChapter ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedChapter(value ? Number(value) : null);
            setArchivos([]);
            setComentario("");
            setMostrarSubidos(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        >
          <option value="">-- Selecciona un capítulo --</option>
          {capitulos.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.title} {chapter.book_name ? `(${chapter.book_name})` : ""} - {statusLabel(chapter.status)}
            </option>
          ))}
        </select>
      </div>

      {selectedChapter && (
        <>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.uploadArea}>
              <div className={styles.dropZone}>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileInput"
                  multiple
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <label htmlFor="fileInput" className={styles.dropLabel}>
                  <div className={styles.dropIcon}><Icon name="upload" /></div>
                  <div className={styles.dropText}>
                    <span className={styles.dropTitle}>Haz clic o arrastra archivos aquí</span>
                    <span className={styles.dropSub}>Puedes seleccionar varios archivos (Word, PDF)</span>
                  </div>
                </label>
              </div>

              {archivos.length > 0 && (
                <div className={styles.fileList}>
                  {archivos.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${index}`} className={styles.fileItem}>
                      <span className={styles.fileName}><Icon name="file" /> {file.name}</span>
                      <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                      <button type="button" className={styles.removeBtn} onClick={() => removeFile(index)} disabled={subiendo}>
                        <Icon name="x" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.commentSection}>
                <label className={styles.commentLabel}>Comentario (opcional):</label>
                <textarea
                  className={styles.commentInput}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agrega alguna nota o aclaración sobre los archivos subidos..."
                  rows={3}
                  disabled={subiendo}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={subiendo || archivos.length === 0}>
                {subiendo ? "Subiendo archivos..." : <>Subir {archivos.length} archivo(s)</>}
              </button>
            </div>
          </form>

          {/* Archivos subidos */}
          <div className={styles.subidosSection}>
            <button type="button" className={styles.toggleSubidos} onClick={() => setMostrarSubidos(!mostrarSubidos)}>
              {mostrarSubidos ? "▼" : "▶"} Archivos ya subidos ({archivosSubidos.length})
            </button>

            {mostrarSubidos && (
              <div className={styles.subidosList}>
                {archivosSubidos.length === 0 ? (
                  <div className={styles.emptySubidos}>No has subido ningún archivo firmado para este capítulo.</div>
                ) : (
                  archivosSubidos.map((archivo) => (
                    <div key={archivo.id} className={styles.subidoItem}>
                      <div className={styles.subidoInfo}>
                        <span className={styles.subidoName}><Icon name="file" /> {archivo.nombre_original}</span>
                        <span className={styles.subidoMeta}>{formatFileSize(archivo.tamaño)} • {fmtDate(archivo.fecha_subida)}</span>
                        {archivo.comentario && <span className={styles.subidoComment}>📝 {archivo.comentario}</span>}
                      </div>
                      <div className={styles.subidoActions}>
                        <button type="button" className={styles.btnDanger} onClick={() => eliminarArchivo(archivo.id)} disabled={eliminando === archivo.id}>
                          <Icon name="delete" tone="light" /> {eliminando === archivo.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && capitulos.length === 0 && (
        <div className={styles.emptyState}>
          <p>No tienes capítulos disponibles para dictaminar.<br />
          <span style={{ fontSize: 14, color: "#94a3b8" }}>Cuando te asignen un capítulo, aparecerá aquí.</span></p>
        </div>
      )}
    </div>
  );
}