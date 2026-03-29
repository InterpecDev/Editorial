import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import styles from "./DictamenDocumento.module.css";

type DictamenStatus = "BORRADOR" | "GENERADO" | "FIRMADO";

type Detail = {
  id: number;

  // folio del dictamen
  folio: string;

  // folio del capítulo
  chapterFolio?: string | null;

  status: DictamenStatus;

  template_docx_path?: string | null;
  generated_docx_path?: string | null;
  pdf_path?: string | null;
  recipient_name?: string | null;
  constancia_data_json?: Record<string, any> | null;

  capituloId: number;
  capitulo: string;
  libro: string;
  evaluador: string;

  // ✅ nuevos datos que debe mandar backend
  evaluador_institucion?: string | null;
  evaluador_cvo_snii?: string | null;
};

function Field({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

export default function DictamenDocumento() {
  const { id } = useParams();
  const nav = useNavigate();
  const dictamenId = Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);

  const [folioEdit, setFolioEdit] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [ciudadEstado, setCiudadEstado] = useState("");
  const [fechaEmisionTexto, setFechaEmisionTexto] = useState("");
  const [recipientInstitucion, setRecipientInstitucion] = useState("");
  const [cvu, setCvu] = useState("");
  const [capituloTitulo, setCapituloTitulo] = useState("");
  const [libroTitulo, setLibroTitulo] = useState("");
  const [entregaTexto, setEntregaTexto] = useState("");
  const [inicioTexto, setInicioTexto] = useState("");
  const [finTexto, setFinTexto] = useState("");
  const [cargoTexto, setCargoTexto] = useState("");
  const [firma1Nombre, setFirma1Nombre] = useState("");
  const [firma2Nombre, setFirma2Nombre] = useState("");

  const [storedTemplateName, setStoredTemplateName] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await api.get<Detail>(`/admin/dictamenes/${dictamenId}`);
      setDetail(data);

      const chapterFolio = (data.chapterFolio || "").trim();
      const dictamenFolio = (data.folio || "").trim();
      const evaluador = (data.evaluador || "").trim();
      const capitulo = (data.capitulo || "").trim();
      const libro = (data.libro || "").trim();

      // ✅ nuevos datos del evaluador
      const evaluadorInstitucion = (data.evaluador_institucion || "").trim();
      const evaluadorCvu = (data.evaluador_cvo_snii || "").trim();

      // ✅ folio: prioriza el del capítulo
      setFolioEdit(chapterFolio || dictamenFolio || "");

      const json = data.constancia_data_json || {};

      // ✅ nombre: si ya existe guardado, lo respeta; si no, usa evaluador
      setRecipientName((data.recipient_name || "").trim() || evaluador);

      setCiudadEstado((json.ciudad_estado || "").trim());
      setFechaEmisionTexto((json.fecha_emision_texto || "").trim());

      // ✅ institución y CVU: si ya existen guardados, los respeta; si no, usa los del evaluador
      setRecipientInstitucion((json.recipient_institucion || "").trim() || evaluadorInstitucion);
      setCvu((json.cvu_snii || "").trim() || evaluadorCvu);

      // ✅ capítulo y libro: si ya existe en json, lo respeta; si no, usa detalle
      setCapituloTitulo((json.capitulo_titulo || "").trim() || capitulo);
      setLibroTitulo((json.libro_titulo || "").trim() || libro);

      setEntregaTexto((json.entrega_texto || "").trim());
      setInicioTexto((json.inicio_dictamen_texto || "").trim());
      setFinTexto((json.fin_dictamen_texto || "").trim());
      setCargoTexto((json.cargo_texto || "").trim());
      setFirma1Nombre((json.firma1_nombre || "").trim());
      setFirma2Nombre((json.firma2_nombre || "").trim());

      if (data.template_docx_path) {
        const name = data.template_docx_path.split("\\").pop()?.split("/").pop();
        setStoredTemplateName(name || null);
      } else {
        setStoredTemplateName(null);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo cargar el dictamen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dictamenId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictamenId]);

  const uploadTemplate = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    try {
      setSaving(true);

      await api.post(`/admin/dictamenes/${dictamenId}/template`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await load();
      setSelectedTemplateName(null);
      alert("Plantilla subida correctamente.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al subir plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const saveData = async () => {
    try {
      setSaving(true);

      await api.put(`/admin/dictamenes/${dictamenId}/document-data`, {
        folio: folioEdit,
        recipient_name: recipientName,
        data: {
          ciudad_estado: ciudadEstado,
          fecha_emision_texto: fechaEmisionTexto,
          recipient_institucion: recipientInstitucion,
          cvu_snii: cvu,
          capitulo_titulo: capituloTitulo,
          libro_titulo: libroTitulo,
          entrega_texto: entregaTexto,
          inicio_dictamen_texto: inicioTexto,
          fin_dictamen_texto: finTexto,
          cargo_texto: cargoTexto,
          firma1_nombre: firma1Nombre,
          firma2_nombre: firma2Nombre,
        },
      });

      await load();
      alert("Datos guardados.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  };

  const renderDocument = async () => {
    try {
      setSaving(true);
      await api.post(`/admin/dictamenes/${dictamenId}/render-document`);
      await load();
      alert("Documento generado correctamente.");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo generar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (format: "docx" | "pdf") => {
    try {
      const res = await api.get(
        `/admin/dictamenes/${dictamenId}/download?format=${format}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const baseFolio =
        (detail?.chapterFolio || "").trim() ||
        (detail?.folio || "").trim() ||
        String(dictamenId);

      a.download = `dictamen-${baseFolio}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "No se pudo descargar.");
    }
  };

  if (loading) return <div className={styles.wrap}>Cargando...</div>;
  if (!detail) return <div className={styles.wrap}>No encontrado</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Documento del Dictamen</h2>
          <div className={styles.sub}>
            <b>Folio:</b> {(detail.chapterFolio || "").trim() || detail.folio} ·{" "}
            <b>Estatus:</b> {detail.status}
          </div>
          <div className={styles.sub}>
            <b>Capítulo:</b> {detail.capitulo} · <b>Libro:</b> {detail.libro} ·{" "}
            <b>Evaluador:</b> {detail.evaluador}
          </div>
        </div>

        <button className={styles.backBtn} onClick={() => nav("/dictamenes")}>
          Volver
        </button>
      </div>

      <div className={styles.card}>
        <h3>1) Subir Plantilla Word (.docx)</h3>

        <div style={{ pointerEvents: saving ? "none" : "auto", opacity: saving ? 0.85 : 1 }}>
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
            className={styles.fileInput}
          />
        </div>

        <div className={styles.muted}>
          {saving && selectedTemplateName ? (
            <span className={styles.warning}>⏳ Subiendo: {selectedTemplateName}</span>
          ) : storedTemplateName ? (
            <span className={styles.success}>✅ Plantilla actual: {storedTemplateName}</span>
          ) : (
            <span className={styles.warning}>⚠️ No hay plantilla subida</span>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3>2) Datos editables</h3>

        <div className={styles.grid}>
          <Field label="Folio (único)" value={folioEdit} onChange={setFolioEdit} disabled={saving} />
          <Field label="Dirigida a (nombre)" value={recipientName} onChange={setRecipientName} disabled={saving} />
          <Field
            label="Institución (destinatario)"
            value={recipientInstitucion}
            onChange={setRecipientInstitucion}
            disabled={saving}
          />
          <Field label="CVU / SNII" value={cvu} onChange={setCvu} disabled={saving} />
          <Field label="Ciudad y Estado" value={ciudadEstado} onChange={setCiudadEstado} disabled={saving} />
          <Field
            label="Fecha de emisión (texto)"
            value={fechaEmisionTexto}
            onChange={setFechaEmisionTexto}
            disabled={saving}
          />
          <Field
            label="Capítulo (título)"
            value={capituloTitulo}
            onChange={setCapituloTitulo}
            disabled={saving}
          />
          <Field
            label="Libro (título)"
            value={libroTitulo}
            onChange={setLibroTitulo}
            disabled={saving}
          />
          <Field label="Entrega (texto)" value={entregaTexto} onChange={setEntregaTexto} disabled={saving} />
          <Field
            label="Inicio dictamen (texto)"
            value={inicioTexto}
            onChange={setInicioTexto}
            disabled={saving}
          />
          <Field label="Fin dictamen (texto)" value={finTexto} onChange={setFinTexto} disabled={saving} />
          <Field label="Cargo (texto)" value={cargoTexto} onChange={setCargoTexto} disabled={saving} />
          <Field label="Firma 1 (nombre)" value={firma1Nombre} onChange={setFirma1Nombre} disabled={saving} />
          <Field label="Firma 2 (nombre)" value={firma2Nombre} onChange={setFirma2Nombre} disabled={saving} />
        </div>

        <div className={styles.actions}>
          <button className={styles.btn} onClick={saveData} disabled={saving}>
            Guardar datos
          </button>
          <button
            className={styles.btnStrong}
            onClick={renderDocument}
            disabled={saving || !detail.template_docx_path}
          >
            Generar DOCX + PDF
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h3>3) Descargas</h3>
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => download("docx")}
            disabled={detail.status === "BORRADOR" || saving}
          >
            Descargar DOCX
          </button>
          <button
            className={styles.btn}
            onClick={() => download("pdf")}
            disabled={detail.status === "BORRADOR" || saving}
          >
            Descargar PDF
          </button>
        </div>

        {detail.status === "BORRADOR" && (
          <div className={styles.muted}>
            ⚠️ Debes generar el documento antes de poder descargarlo.
          </div>
        )}
      </div>
    </div>
  );
}