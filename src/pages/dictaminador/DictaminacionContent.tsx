// src/components/dictaminador/DictaminacionContent.tsx
import React, { useState, useCallback, useEffect } from "react";
import { api } from "../../services/api";
import styles from "./DictaminacionContent.module.css";
import { alertService } from "../../utils/alerts";

// Tipos para los datos del dictamen
type DictamenData = {
  id?: number;
  folio?: string;
  evaluador_nombre: string;
  evaluador_cvu: string;
  folio_dictamen: string;
  capitulo_titulo: string;
  tipo_investigacion: string;
  tipo_divulgacion: string;
  tipo_docencia: string;
  resumen_obra: string;
  criterio_pertinencia: number;
  criterio_originalidad: number;
  criterio_metodologia: number;
  criterio_claridad: number;
  criterio_bibliografia: number;
  criterio_estilo: number;
  total_puntaje: number;
  rec_aceptar: string;
  rec_cambios_menores: string;
  rec_cambios_mayores: string;
  rec_rechazar: string;
  comentarios_autor: string;
  conflicto_si: string;
  conflicto_no: string;
  conflicto_detalle: string;
  firma_dictaminador_imagen?: string;
};

// Props del componente
interface DictaminacionContentProps {
  chapterId?: number;
  chapterTitle?: string;
  evaluadorName?: string;
  evaluadorCvu?: string;
}

export default function DictaminacionContent({ 
  chapterId, 
  chapterTitle = "",
  evaluadorName = "",
  evaluadorCvu = ""
}: DictaminacionContentProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Estado para los datos del dictamen
  const [data, setData] = useState<DictamenData>({
    evaluador_nombre: evaluadorName || "",
    evaluador_cvu: evaluadorCvu || "",
    folio_dictamen: "",
    capitulo_titulo: chapterTitle || "",
    tipo_investigacion: "X",
    tipo_divulgacion: "",
    tipo_docencia: "",
    resumen_obra: "",
    criterio_pertinencia: 0,
    criterio_originalidad: 0,
    criterio_metodologia: 0,
    criterio_claridad: 0,
    criterio_bibliografia: 0,
    criterio_estilo: 0,
    total_puntaje: 0,
    rec_aceptar: "",
    rec_cambios_menores: "",
    rec_cambios_mayores: "",
    rec_rechazar: "",
    comentarios_autor: "",
    conflicto_si: "",
    conflicto_no: "",
    conflicto_detalle: "",
  });

  // Estado para la plantilla
  const [storedTemplateName, setStoredTemplateName] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [dictamenId, setDictamenId] = useState<number | null>(null);
  const [hasGeneratedDoc, setHasGeneratedDoc] = useState(false);

  // Cargar datos existentes si hay un dictamen previo
  useEffect(() => {
    if (chapterId) {
      loadExistingDictamen();
    }
  }, [chapterId]);

  const loadExistingDictamen = async () => {
    try {
      setLoading(true);
      console.log("🔍 Cargando dictamen para capítulo:", chapterId);
      const response = await api.get(`/dictaminador/dictamen/${chapterId}`);
      console.log("📦 Respuesta del servidor:", response.data);

      const dictamen = response.data;
      
      // Si el servidor devuelve null o no hay datos
      if (!dictamen) {
        console.log("ℹ️ No existe dictamen para este capítulo, se creará uno nuevo");
        // Resetear datos a valores por defecto pero conservando nombre y CVU
        setData(prev => ({
          ...prev,
          evaluador_nombre: evaluadorName || "",
          evaluador_cvu: evaluadorCvu || "",
          capitulo_titulo: chapterTitle || "",
          folio_dictamen: "",
          tipo_investigacion: "X",
          tipo_divulgacion: "",
          tipo_docencia: "",
          resumen_obra: "",
          criterio_pertinencia: 0,
          criterio_originalidad: 0,
          criterio_metodologia: 0,
          criterio_claridad: 0,
          criterio_bibliografia: 0,
          criterio_estilo: 0,
          total_puntaje: 0,
          rec_aceptar: "",
          rec_cambios_menores: "",
          rec_cambios_mayores: "",
          rec_rechazar: "",
          comentarios_autor: "",
          conflicto_si: "",
          conflicto_no: "",
          conflicto_detalle: "",
        }));
        setDictamenId(null);
        setStoredTemplateName(null);
        setHasGeneratedDoc(false);
        return;
      }
      
      if (dictamen.id) {
        setDictamenId(dictamen.id);
        setData({
          evaluador_nombre: dictamen.evaluador_nombre || evaluadorName,
          evaluador_cvu: dictamen.evaluador_cvu || evaluadorCvu,
          folio_dictamen: dictamen.folio || "",
          capitulo_titulo: dictamen.capitulo_titulo || chapterTitle,
          tipo_investigacion: dictamen.tipo_investigacion || "",
          tipo_divulgacion: dictamen.tipo_divulgacion || "",
          tipo_docencia: dictamen.tipo_docencia || "",
          resumen_obra: dictamen.resumen_obra || "",
          criterio_pertinencia: dictamen.criterio_pertinencia || 0,
          criterio_originalidad: dictamen.criterio_originalidad || 0,
          criterio_metodologia: dictamen.criterio_metodologia || 0,
          criterio_claridad: dictamen.criterio_claridad || 0,
          criterio_bibliografia: dictamen.criterio_bibliografia || 0,
          criterio_estilo: dictamen.criterio_estilo || 0,
          total_puntaje: dictamen.total_puntaje || 0,
          rec_aceptar: dictamen.rec_aceptar || "",
          rec_cambios_menores: dictamen.rec_cambios_menores || "",
          rec_cambios_mayores: dictamen.rec_cambios_mayores || "",
          rec_rechazar: dictamen.rec_rechazar || "",
          comentarios_autor: dictamen.comentarios_autor || "",
          conflicto_si: dictamen.conflicto_si || "",
          conflicto_no: dictamen.conflicto_no || "",
          conflicto_detalle: dictamen.conflicto_detalle || "",
        });
        
        if (dictamen.template_path) {
          const name = dictamen.template_path.split("\\").pop()?.split("/").pop();
          setStoredTemplateName(name || null);
        }
        
        if (dictamen.generated_docx_path) {
          setHasGeneratedDoc(true);
        }
      }
    } catch (error: any) {
      // Si es 404, no hay dictamen aún, es normal
      if (error.response?.status === 404) {
        console.log("ℹ️ No existe dictamen para este capítulo (404)");
        // Resetear datos
        setData(prev => ({
          ...prev,
          evaluador_nombre: evaluadorName || "",
          evaluador_cvu: evaluadorCvu || "",
          capitulo_titulo: chapterTitle || "",
          folio_dictamen: "",
          tipo_investigacion: "X",
          tipo_divulgacion: "",
          tipo_docencia: "",
          resumen_obra: "",
          criterio_pertinencia: 0,
          criterio_originalidad: 0,
          criterio_metodologia: 0,
          criterio_claridad: 0,
          criterio_bibliografia: 0,
          criterio_estilo: 0,
          total_puntaje: 0,
          rec_aceptar: "",
          rec_cambios_menores: "",
          rec_cambios_mayores: "",
          rec_rechazar: "",
          comentarios_autor: "",
          conflicto_si: "",
          conflicto_no: "",
          conflicto_detalle: "",
        }));
        setDictamenId(null);
        setStoredTemplateName(null);
        setHasGeneratedDoc(false);
        return;
      }
      console.error("❌ Error al cargar dictamen existente:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular total automáticamente
  useEffect(() => {
    const total = 
      (data.criterio_pertinencia || 0) +
      (data.criterio_originalidad || 0) +
      (data.criterio_metodologia || 0) +
      (data.criterio_claridad || 0) +
      (data.criterio_bibliografia || 0) +
      (data.criterio_estilo || 0);
    
    setData(prev => ({ ...prev, total_puntaje: total }));
  }, [
    data.criterio_pertinencia,
    data.criterio_originalidad,
    data.criterio_metodologia,
    data.criterio_claridad,
    data.criterio_bibliografia,
    data.criterio_estilo,
  ]);

  // Manejar cambios en los campos
  const handleChange = (field: keyof DictamenData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Manejar cambios en criterios (número)
  const handleCriterioChange = (field: keyof DictamenData, value: string) => {
    const numValue = parseInt(value) || 0;
    const clamped = Math.min(Math.max(numValue, 0), 5);
    setData(prev => ({ ...prev, [field]: clamped }));
  };

  // Subir plantilla - RUTA ACTUALIZADA
  const uploadTemplate = async (file: File) => {
    if (!chapterId) {
      alertService.warning("Primero selecciona un capítulo");
      return;
    }

    // Primero guardar datos para asegurar que existe el dictamen
    if (!dictamenId) {
      alertService.warning("Primero guarda los datos del dictamen");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      setSaving(true);
      console.log("📤 Subiendo plantilla para dictamen:", dictamenId);
      await api.post(`/dictaminador/dictamen/${dictamenId}/template`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const name = file.name;
      setStoredTemplateName(name);
      setSelectedTemplateName(null);
      alertService.success("Plantilla subida correctamente.");
      
      // Recargar datos para actualizar la plantilla
      await loadExistingDictamen();
    } catch (err: any) {
      console.error("❌ Error al subir plantilla:", err);
      alertService.error(err?.response?.data?.detail || "Error al subir plantilla.");
    } finally {
      setSaving(false);
    }
  };

  // Guardar datos del dictamen - RUTAS ACTUALIZADAS
  const saveData = async () => {
    if (!chapterId) {
      alertService.warning("Primero selecciona un capítulo");
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        chapter_id: chapterId,
        ...data,
      };

      let response;
      if (dictamenId) {
        // Actualizar existente - PUT
        console.log("📝 Actualizando dictamen:", dictamenId);
        response = await api.put(`/dictaminador/dictamen/${dictamenId}`, payload);
      } else {
        // Crear nuevo - POST
        console.log("📝 Creando nuevo dictamen");
        response = await api.post("/dictaminador/dictamen/", payload);
      }
      
      if (response.data?.id) {
        setDictamenId(response.data.id);
        console.log("✅ Dictamen guardado con ID:", response.data.id);
      }

      alertService.success("Datos guardados correctamente.");
      
      // Recargar datos para obtener el estado actualizado
      await loadExistingDictamen();
    } catch (err: any) {
      console.error("❌ Error al guardar datos:", err);
      alertService.error(err?.response?.data?.detail || "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  };

  // Generar documento - RUTA ACTUALIZADA
  const renderDocument = async () => {
    if (!chapterId || !dictamenId) {
      alertService.warning("Primero guarda los datos del dictamen");
      return;
    }

    try {
      setGenerating(true);
      console.log("📄 Generando documento para dictamen:", dictamenId);
      await api.post(`/dictaminador/dictamen/${dictamenId}/render`);
      setHasGeneratedDoc(true);
      alertService.success("Documento generado correctamente.");
      
      // Recargar datos para actualizar el estado
      await loadExistingDictamen();
    } catch (err: any) {
      console.error("❌ Error al generar documento:", err);
      alertService.error(err?.response?.data?.detail || "No se pudo generar el documento.");
    } finally {
      setGenerating(false);
    }
  };

  // Descargar documento - RUTA ACTUALIZADA
  const download = async (format: "docx" | "pdf") => {
    if (!dictamenId) {
      alertService.warning("No hay documento generado");
      return;
    }

    try {
      console.log(`📥 Descargando documento en formato ${format} para dictamen:`, dictamenId);
      const res = await api.get(
        `/dictaminador/dictamen/${dictamenId}/download?format=${format}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dictamen-${data.folio_dictamen || "sin-folio"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      alertService.success(`Descarga de ${format.toUpperCase()} iniciada`);
    } catch (err: any) {
      console.error("❌ Error al descargar:", err);
      alertService.error(err?.response?.data?.detail || "No se pudo descargar.");
    }
  };

  // Determinar la recomendación seleccionada
  const getSelectedRecomendacion = () => {
    if (data.rec_aceptar === "X") return "Aceptar";
    if (data.rec_cambios_menores === "X") return "Aceptar con cambios menores";
    if (data.rec_cambios_mayores === "X") return "Cambios mayores";
    if (data.rec_rechazar === "X") return "Rechazar";
    return "No seleccionada";
  };

  // Determinar conflicto seleccionado
  const getSelectedConflicto = () => {
    if (data.conflicto_si === "X") return "Sí";
    if (data.conflicto_no === "X") return "No";
    return "No especificado";
  };

  return (
    <div className={styles.container}>
      {/* Sección de datos del dictamen */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Datos del Dictamen</h3>
          <span className={styles.chapterInfo}>Capítulo: {chapterTitle || "Sin seleccionar"}</span>
          {dictamenId && (
            <span className={styles.dictamenId}>ID: {dictamenId}</span>
          )}
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Evaluador (a)</label>
            <input
              value={data.evaluador_nombre}
              onChange={(e) => handleChange("evaluador_nombre", e.target.value)}
              placeholder="Nombre completo"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>CVU SNII</label>
            <input
              value={data.evaluador_cvu}
              onChange={(e) => handleChange("evaluador_cvu", e.target.value)}
              placeholder="CVU SNII"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Folio del dictamen</label>
            <input
              value={data.folio_dictamen}
              onChange={(e) => handleChange("folio_dictamen", e.target.value)}
              placeholder="Folio"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Título del capítulo</label>
            <input
              value={data.capitulo_titulo}
              onChange={(e) => handleChange("capitulo_titulo", e.target.value)}
              placeholder="Título"
              disabled={loading}
            />
          </div>
        </div>

        {/* Tipos */}
        <div className={styles.tipoSection}>
          <label>Tipo de trabajo:</label>
          <div className={styles.tipoGroup}>
            <label className={styles.tipoLabel}>
              <input
                type="checkbox"
                checked={data.tipo_investigacion === "X"}
                onChange={(e) => handleChange("tipo_investigacion", e.target.checked ? "X" : "")}
                disabled={loading}
              />
              Investigación
            </label>
            <label className={styles.tipoLabel}>
              <input
                type="checkbox"
                checked={data.tipo_divulgacion === "X"}
                onChange={(e) => handleChange("tipo_divulgacion", e.target.checked ? "X" : "")}
                disabled={loading}
              />
              Divulgación
            </label>
            <label className={styles.tipoLabel}>
              <input
                type="checkbox"
                checked={data.tipo_docencia === "X"}
                onChange={(e) => handleChange("tipo_docencia", e.target.checked ? "X" : "")}
                disabled={loading}
              />
              Docencia
            </label>
          </div>
        </div>

        {/* Resumen */}
        <div className={styles.field}>
          <label>Resumen de la obra (5-7 líneas)</label>
          <textarea
            value={data.resumen_obra}
            onChange={(e) => handleChange("resumen_obra", e.target.value)}
            placeholder="Escribe un resumen de la obra..."
            rows={4}
            disabled={loading}
          />
        </div>
      </div>

      {/* Criterios */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Criterios (escala 1-5)</h3>
          <span className={styles.totalPts}>Total: {data.total_puntaje}/30</span>
        </div>

        <div className={styles.criteriosGrid}>
          {[
            { key: "criterio_pertinencia", label: "Pertinencia y aporte" },
            { key: "criterio_originalidad", label: "Originalidad y estado del arte" },
            { key: "criterio_metodologia", label: "Metodología/argumento" },
            { key: "criterio_claridad", label: "Claridad y estructura" },
            { key: "criterio_bibliografia", label: "Bibliografía y actualidad" },
            { key: "criterio_estilo", label: "Calidad de escritura/estilo" },
          ].map(({ key, label }) => (
            <div key={key} className={styles.criterioField}>
              <label>{label}</label>
              <input
                type="number"
                min="0"
                max="5"
                value={data[key as keyof DictamenData] || 0}
                onChange={(e) => handleCriterioChange(key as keyof DictamenData, e.target.value)}
                disabled={loading}
                className={styles.criterioInput}
              />
              <span className={styles.criterioPts}>/5</span>
            </div>
          ))}
        </div>

        <div className={styles.totalSection}>
          <strong>TOTAL (se requieren 20 puntos para aceptar publicación):</strong>
          <span className={data.total_puntaje >= 20 ? styles.totalAprobado : styles.totalRechazado}>
            {data.total_puntaje}/30
          </span>
          {data.total_puntaje >= 20 ? " ✅ Aprobado" : " ❌ No alcanza"}
        </div>
      </div>

      {/* Recomendación */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Recomendación</h3>
        </div>

        <div className={styles.recomendacionGroup}>
          <label className={styles.recomendacionLabel}>
            <input
              type="radio"
              name="recomendacion"
              checked={data.rec_aceptar === "X"}
              onChange={() => {
                handleChange("rec_aceptar", "X");
                handleChange("rec_cambios_menores", "");
                handleChange("rec_cambios_mayores", "");
                handleChange("rec_rechazar", "");
              }}
              disabled={loading}
            />
            Aceptar
          </label>
          <label className={styles.recomendacionLabel}>
            <input
              type="radio"
              name="recomendacion"
              checked={data.rec_cambios_menores === "X"}
              onChange={() => {
                handleChange("rec_aceptar", "");
                handleChange("rec_cambios_menores", "X");
                handleChange("rec_cambios_mayores", "");
                handleChange("rec_rechazar", "");
              }}
              disabled={loading}
            />
            Aceptar con cambios menores
          </label>
          <label className={styles.recomendacionLabel}>
            <input
              type="radio"
              name="recomendacion"
              checked={data.rec_cambios_mayores === "X"}
              onChange={() => {
                handleChange("rec_aceptar", "");
                handleChange("rec_cambios_menores", "");
                handleChange("rec_cambios_mayores", "X");
                handleChange("rec_rechazar", "");
              }}
              disabled={loading}
            />
            Cambios mayores
          </label>
          <label className={styles.recomendacionLabel}>
            <input
              type="radio"
              name="recomendacion"
              checked={data.rec_rechazar === "X"}
              onChange={() => {
                handleChange("rec_aceptar", "");
                handleChange("rec_cambios_menores", "");
                handleChange("rec_cambios_mayores", "");
                handleChange("rec_rechazar", "X");
              }}
              disabled={loading}
            />
            Rechazar
          </label>
        </div>

        <div className={styles.selectedInfo}>
          <span>Selección actual: <strong>{getSelectedRecomendacion()}</strong></span>
        </div>
      </div>

      {/* Comentarios y conflicto */}
      <div className={styles.card}>
        <div className={styles.field}>
          <label>Comentarios para el autor (obligatorio)</label>
          <textarea
            value={data.comentarios_autor}
            onChange={(e) => handleChange("comentarios_autor", e.target.value)}
            placeholder="Escribe tus comentarios para el autor..."
            rows={5}
            disabled={loading}
            className={styles.comentariosTextarea}
          />
        </div>

        <div className={styles.conflictoSection}>
          <label>Conflicto de interés:</label>
          <div className={styles.conflictoGroup}>
            <label className={styles.conflictoLabel}>
              <input
                type="radio"
                name="conflicto"
                checked={data.conflicto_si === "X"}
                onChange={() => {
                  handleChange("conflicto_si", "X");
                  handleChange("conflicto_no", "");
                }}
                disabled={loading}
              />
              Sí
            </label>
            <label className={styles.conflictoLabel}>
              <input
                type="radio"
                name="conflicto"
                checked={data.conflicto_no === "X"}
                onChange={() => {
                  handleChange("conflicto_si", "");
                  handleChange("conflicto_no", "X");
                }}
                disabled={loading}
              />
              No
            </label>
          </div>
        </div>

        {data.conflicto_si === "X" && (
          <div className={styles.field}>
            <label>Detalle del conflicto</label>
            <input
              value={data.conflicto_detalle}
              onChange={(e) => handleChange("conflicto_detalle", e.target.value)}
              placeholder="Especifica el conflicto de interés..."
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* Plantilla y generación */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Plantilla y generación</h3>
        </div>

        <div className={styles.templateSection}>
          <div className={styles.templateUpload}>
            <label>Subir plantilla Word (.docx)</label>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedTemplateName(file.name);
                  uploadTemplate(file);
                }
              }}
              disabled={saving || loading || !dictamenId}
              className={styles.fileInput}
            />
            {!dictamenId && (
              <span className={styles.warning}>⚠️ Guarda los datos primero para poder subir la plantilla</span>
            )}
          </div>

          <div className={styles.templateStatus}>
            {saving && selectedTemplateName ? (
              <span className={styles.uploading}>⏳ Subiendo: {selectedTemplateName}</span>
            ) : storedTemplateName ? (
              <span className={styles.success}>✅ Plantilla actual: {storedTemplateName}</span>
            ) : (
              <span className={styles.warning}>⚠️ No hay plantilla subida</span>
            )}
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.btnSave}
            onClick={saveData}
            disabled={saving || loading || !chapterId}
          >
            {saving ? "Guardando..." : "Guardar datos"}
          </button>

          <button
            className={styles.btnGenerate}
            onClick={renderDocument}
            disabled={generating || !dictamenId || !storedTemplateName || loading}
          >
            {generating ? "Generando..." : "Generar DOCX + PDF"}
          </button>
        </div>

        <div className={styles.downloadSection}>
          <button
            className={styles.btnDownload}
            onClick={() => download("docx")}
            disabled={!hasGeneratedDoc || loading}
          >
            Descargar DOCX
          </button>
          
        </div>

        {!hasGeneratedDoc && dictamenId && storedTemplateName && (
          <div className={styles.infoMessage}>
            ⚠️ Genera el documento para poder descargarlo.
          </div>
        )}
        
        {!hasGeneratedDoc && dictamenId && !storedTemplateName && (
          <div className={styles.infoMessage}>
            ⚠️ Sube una plantilla .docx para poder generar el documento.
          </div>
        )}
      </div>
    </div>
  );
}