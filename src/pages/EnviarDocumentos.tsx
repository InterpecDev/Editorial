import React, { useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";
import styles from "./EnviarDocumentos.module.css";

type Dictaminador = {
  id: number;
  name: string;
  email: string;
  institution?: string;
  cvo_snii?: string;
};

type Capitulo = {
  id: number;
  title: string;
  status: string;
  book_name?: string | null;
};

type DocumentoEnviado = {
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

function Icon({ name, tone = "muted" }: { name: "send" | "file" | "download" | "refresh" | "delete" | "search" | "user" | "book"; tone?: "muted" | "light"; }) {
  const color = tone === "light" ? "rgba(255,255,255,0.92)" : "rgba(71,85,105,0.95)";
  const size = 18;
  const common = { width: size, height: size, display: "inline-block" as const };
  switch (name) {
    case "send": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" /></svg>;
    case "file": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /></svg>;
    case "download": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M21 21H3" /></svg>;
    case "refresh": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 0 1-15.36 6.36" /><path d="M3 12a9 9 0 0 1 15.36-6.36" /><path d="M21 3v6h-6" /><path d="M3 21v-6h6" /></svg>;
    case "delete": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;
    case "search": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M21 21l-4.3-4.3" /><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>;
    case "user": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M20 21a8 8 0 1 0-16 0" /><path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" /></svg>;
    case "book": return <svg viewBox="0 0 24 24" style={common} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 7H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>;
    default: return null;
  }
}

function EnviarDocumentosContent() {
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dictaminadores, setDictaminadores] = useState<Dictaminador[]>([]);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [selectedDictaminador, setSelectedDictaminador] = useState<number | null>(null);
  const [selectedCapitulo, setSelectedCapitulo] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [documentosEnviados, setDocumentosEnviados] = useState<DocumentoEnviado[]>([]);
  const [mostrarEnviados, setMostrarEnviados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  const loadDictaminadores = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      const { data } = await api.get<Dictaminador[]>("/documentos/admin/dictaminadores", { headers: authHeaders() });
      if (isMounted.current) setDictaminadores(data || []);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      setErrorMsg(err?.response?.data?.detail || err?.message || "No se pudieron cargar los dictaminadores.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadCapitulos = useCallback(async (dictaminadorId: number) => {
    if (!isMounted.current || !dictaminadorId) return;
    try {
      const { data } = await api.get<Capitulo[]>(`/documentos/admin/capitulos?dictaminador_id=${dictaminadorId}`, { headers: authHeaders() });
      if (isMounted.current) setCapitulos(data || []);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
    }
  }, [authHeaders, handleAuthMaybe]);

  const loadDocumentosEnviados = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const { data } = await api.get<DocumentoEnviado[]>("/documentos/admin/listar", { headers: authHeaders() });
      if (isMounted.current) setDocumentosEnviados(data || []);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
    }
  }, [authHeaders, handleAuthMaybe]);

  // ✅ ELIMINAR DOCUMENTO - Corregido
  const eliminarDocumento = async (documentoId: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.")) {
      return;
    }

    setEliminando(documentoId);
    try {
      const response = await api.delete(`/documentos/admin/${documentoId}`, {
        headers: authHeaders(),
      });

      alert("✅ Documento eliminado correctamente");
      await loadDocumentosEnviados();
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      const errorMsg = err?.response?.data?.detail || err?.message || "No se pudo eliminar el documento.";
      alert("❌ Error: " + errorMsg);
    } finally {
      setEliminando(null);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadDictaminadores();
    loadDocumentosEnviados();
    return () => { isMounted.current = false; };
  }, [loadDictaminadores, loadDocumentosEnviados]);

  useEffect(() => {
    if (selectedDictaminador) loadCapitulos(selectedDictaminador);
    else setCapitulos([]);
  }, [selectedDictaminador, loadCapitulos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.doc', '.docx', '.pdf'].includes(ext)) {
      alert("Solo se permiten archivos .doc, .docx y .pdf");
      e.target.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo no debe exceder los 50MB");
      e.target.value = "";
      return;
    }
    setArchivo(file);
    if (!titulo) setTitulo(file.name.replace(/\.[^/.]+$/, ""));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || enviando) return;
    if (!selectedDictaminador) { alert("Selecciona un dictaminador."); return; }
    if (!archivo) { alert("Selecciona un archivo para enviar."); return; }

    const formData = new FormData();
    formData.append("id_dictaminador", selectedDictaminador.toString());
    if (selectedCapitulo) formData.append("id_articulo", selectedCapitulo.toString());
    if (titulo.trim()) formData.append("titulo", titulo.trim());
    if (descripcion.trim()) formData.append("descripcion", descripcion.trim());
    formData.append("archivo", archivo);

    setSubmitting(true);
    setEnviando(true);

    try {
      await api.post("/documentos/enviar", formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });

      alert("✅ Documento enviado correctamente");
      window.location.reload();

    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      alert("Error: " + (err?.response?.data?.detail || err?.message || "Error al enviar el documento."));
      setSubmitting(false);
      setEnviando(false);
    }
  };

  const downloadDocumento = async (documento: DocumentoEnviado) => {
    try {
      const res = await api.get(`/documentos/dictaminador/${documento.id}/descargar`, {
        headers: authHeaders(),
        responseType: "blob",
        params: { ts: Date.now() },
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)], { type: res.headers?.["content-type"] || "application/octet-stream" });
      downloadBlob(blob, documento.nombre_original);
    } catch (err: any) {
      if (handleAuthMaybe(err)) return;
      alert("Error al descargar el documento.");
    }
  };

  const documentosFiltrados = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return documentosEnviados;
    return documentosEnviados.filter(d =>
      d.dictaminador_nombre?.toLowerCase().includes(term) ||
      d.articulo_titulo?.toLowerCase().includes(term) ||
      d.titulo?.toLowerCase().includes(term) ||
      d.nombre_original.toLowerCase().includes(term)
    );
  }, [documentosEnviados, searchTerm]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>📤 Enviar Documentos a Dictaminadores</div>
          <div className={styles.headerSub}>
            {loading ? "Cargando..." : `${dictaminadores.length} dictaminadores disponibles`}
          </div>
        </div>
        <button type="button" className={styles.btnGhost} onClick={() => { loadDictaminadores(); loadDocumentosEnviados(); }} disabled={loading}>
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Icon name="refresh" /> Actualizar</span>
        </button>
      </div>

      {errorMsg && <div className={styles.alertErr}>{errorMsg}</div>}

      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Enviar nuevo documento</h3>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}><Icon name="user" /> Dictaminador *</label>
              <select className={styles.select} value={selectedDictaminador || ""} onChange={(e) => { setSelectedDictaminador(e.target.value ? Number(e.target.value) : null); setSelectedCapitulo(null); }} required>
                <option value="">-- Selecciona un dictaminador --</option>
                {dictaminadores.map(d => <option key={d.id} value={d.id}>{d.name} - {d.email}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}><Icon name="book" /> Capítulo (opcional)</label>
              <select className={styles.select} value={selectedCapitulo || ""} onChange={(e) => setSelectedCapitulo(e.target.value ? Number(e.target.value) : null)} disabled={!selectedDictaminador}>
                <option value="">-- Sin capítulo específico --</option>
                {capitulos.map(c => <option key={c.id} value={c.id}>{c.title} {c.book_name ? `(${c.book_name})` : ""}</option>)}
              </select>
              {selectedDictaminador && capitulos.length === 0 && <span className={styles.helpText}>Este dictaminador no tiene capítulos asignados</span>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Título del documento</label>
            <input type="text" className={styles.input} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Dictamen editorial - Capítulo X" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción (opcional)</label>
            <textarea className={styles.textarea} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Agrega una descripción o nota sobre este documento..." rows={3} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Archivo * (.doc, .docx, .pdf - máx 50MB)</label>
            <div className={styles.fileDropZone}>
              <input type="file" id="fileInput" accept=".doc,.docx,.pdf" onChange={handleFileChange} className={styles.fileInput} />
              <label htmlFor="fileInput" className={styles.dropLabel}>
                {archivo ? (
                  <div className={styles.fileSelected}>
                    <Icon name="file" />
                    <span className={styles.fileName}>{archivo.name}</span>
                    <span className={styles.fileSize}>({formatFileSize(archivo.size)})</span>
                  </div>
                ) : (
                  <div className={styles.dropContent}>
                    <span className={styles.dropIcon}>📎</span>
                    <span className={styles.dropTitle}>Haz clic para seleccionar un archivo</span>
                    <span className={styles.dropSub}>Solo .doc, .docx, .pdf (máx 50MB)</span>
                  </div>
                )}
              </label>
            </div>
            {archivo && (
              <span className={styles.helpText}>💡 Para cambiar el archivo, selecciona uno nuevo</span>
            )}
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={submitting || enviando || !selectedDictaminador || !archivo}>
            {submitting || enviando ? "Enviando documento..." : <><Icon name="send" tone="light" /> Enviar Documento</>}
          </button>
        </form>
      </div>

      <div className={styles.historySection}>
        <button type="button" className={styles.toggleHistory} onClick={() => setMostrarEnviados(!mostrarEnviados)}>
          <span>{mostrarEnviados ? "▼" : "▶"} Historial de documentos enviados ({documentosEnviados.length})</span>
        </button>
        {mostrarEnviados && (
          <div className={styles.historyContent}>
            <div className={styles.searchWrap}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}><Icon name="search" /></span>
                <input className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por dictaminador, artículo o título..." />
              </div>
            </div>
            {documentosFiltrados.length === 0 ? (
              <div className={styles.emptyState}>{searchTerm ? "No hay resultados con ese filtro." : "Aún no has enviado documentos a los dictaminadores."}</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>📄 Documento</th>
                      <th>👤 Dictaminador</th>
                      <th>📅 Fecha</th>
                      <th>📖 Capítulo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosFiltrados.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div className={styles.docTitle}>
                            <span className={styles.docName}>{doc.titulo || doc.nombre_original}</span>
                            {doc.descripcion && <span className={styles.docDesc}>{doc.descripcion}</span>}
                          </div>
                        </td>
                        <td>{doc.dictaminador_nombre || "—"}</td>
                        <td>{fmtDate(doc.fecha_envio)}</td>
                        <td>{doc.articulo_titulo || "—"}</td>
                        <td>
                          <span className={doc.leido === 1 ? styles.badgeLeido : styles.badgeNoLeido}>
                            {doc.leido === 1 ? "✅ Leído" : "⏳ No leído"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button type="button" className={styles.btnSoft} onClick={() => downloadDocumento(doc)}>
                              <Icon name="download" /> Descargar
                            </button>
                            <button 
                              type="button" 
                              className={styles.btnDanger} 
                              onClick={() => eliminarDocumento(doc.id)}
                              disabled={eliminando === doc.id}
                            >
                              <Icon name="delete" tone="light" /> {eliminando === doc.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EnviarDocumentos() {
  return <EnviarDocumentosContent />;
}