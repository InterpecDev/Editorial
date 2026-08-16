import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from "./Libros.module.css";
import { alertService } from "../utils/alerts";

type ChapterStatus =
  | "RECIBIDO"
  | "ASIGNADO_A_DICTAMINADOR"
  | "EN_REVISION"
  | "CORRECCIONES"
  | "REENVIADO_POR_AUTOR"
  | "APROBADO"
  | "RECHAZADO";

type Chapter = {
  id: string;
  title: string;
  author: string;
  updatedAt: string;
  status: ChapterStatus;
};

type Book = {
  id: string;
  name: string;
  year: number;
  authorName: string;
  authorEmail: string;
  chapters: Chapter[];
};

type AdminBookApi = {
  id: number;
  name: string;
  year: number;
  created_at: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  total_chapters: number;
  approved: number;
  corrections: number;
};

type AdminChapterApi = {
  id: number;
  title: string;
  author_name: string;
  author_email: string;
  status: ChapterStatus;
  updated_at: string;
};

function getPillClass(status: ChapterStatus): string {
  const baseClass = styles.pill;

  if (status === "APROBADO") return `${baseClass} ${styles.pillApproved}`;
  if (status === "CORRECCIONES") return `${baseClass} ${styles.pillCorrections}`;
  if (status === "EN_REVISION") return `${baseClass} ${styles.pillRevision}`;
  if (status === "ASIGNADO_A_DICTAMINADOR") return `${baseClass} ${styles.pillAssigned}`;
  if (status === "REENVIADO_POR_AUTOR") return `${baseClass} ${styles.pillResent}`;
  if (status === "RECHAZADO") return `${baseClass} ${styles.pillRejected}`;
  return `${baseClass} ${styles.pillDefault}`;
}

export default function Libros() {
  const nav = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ChapterStatus | "TODOS">("TODOS");

  const [openCreateBook, setOpenCreateBook] = useState(false);
  const [openAddChapter, setOpenAddChapter] = useState(false);

  const [newBook, setNewBook] = useState({
    name: "Libro",
    year: new Date().getFullYear(),
  });

  const [newChapter, setNewChapter] = useState({
    title: "",
    author: "",
    status: "RECIBIDO" as ChapterStatus,
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data } = await api.get<AdminBookApi[]>("/admin/books");

        const mapped: Book[] = (data ?? []).map((b) => ({
          id: String(b.id),
          name: b.name,
          year: b.year,
          authorName: b.author?.name ?? "—",
          authorEmail: b.author?.email ?? "—",
          chapters: [],
        }));

        if (!alive) return;

        setBooks(mapped);

        if (mapped.length && !selectedBookId) {
          setSelectedBookId(String(mapped[0].id));
        }
      } catch (err: any) {
        if (!alive) return;

        const msg =
          err?.response?.data?.detail ??
          "No se pudieron cargar los libros (admin). Revisa que el backend esté corriendo y tu token sea válido (rol editorial).";

        setErrorMsg(msg);
        alertService.toastError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!books.length) {
      setSelectedBookId("");
      return;
    }

    const exists = books.some((b) => b.id === selectedBookId);

    if (!exists) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  useEffect(() => {
    let alive = true;

    const loadChapters = async () => {
      if (!selectedBookId) return;

      try {
        const { data } = await api.get<AdminChapterApi[]>(
          `/admin/books/${Number(selectedBookId)}/chapters`
        );

        const chapters: Chapter[] = (data ?? []).map((c) => ({
          id: String(c.id),
          title: c.title,
          author: `${c.author_name} (${c.author_email})`,
          status: c.status,
          updatedAt: (c.updated_at || "").slice(0, 10),
        }));

        if (!alive) return;

        setBooks((prev) =>
          prev.map((b) =>
            b.id === selectedBookId ? { ...b, chapters } : b
          )
        );
      } catch (err: any) {
        if (!alive) return;

        setBooks((prev) =>
          prev.map((b) =>
            b.id === selectedBookId ? { ...b, chapters: [] } : b
          )
        );

        const msg =
          err?.response?.data?.detail ??
          "No se pudieron cargar los capítulos de este libro.";

        alertService.toastWarning(msg);
      }
    };

    loadChapters();

    return () => {
      alive = false;
    };
  }, [selectedBookId]);

  const filteredChapters = useMemo(() => {
    if (!selectedBook) return [];

    const base = selectedBook.chapters.slice();
    const qNorm = q.trim().toLowerCase();

    const byText = (c: Chapter) => {
      if (!qNorm) return true;

      return (
        c.title.toLowerCase().includes(qNorm) ||
        c.author.toLowerCase().includes(qNorm) ||
        c.id.toLowerCase().includes(qNorm)
      );
    };

    const byStatus = (c: Chapter) => {
      if (statusFilter === "TODOS") return true;
      return c.status === statusFilter;
    };

    base.sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || "")
    );

    return base.filter((c) => byText(c) && byStatus(c));
  }, [selectedBook, q, statusFilter]);

  const countsSelected = useMemo(() => {
    if (!selectedBook) return countStatuses([]);
    return countStatuses(selectedBook.chapters);
  }, [selectedBook]);

  const confirmCreateBook = async () => {
    await alertService.warning(
      "Deshabilitado: falta seleccionar autor (author_id).",
      "No disponible"
    );
  };

  const openAddChapterModal = async () => {
    await alertService.info(
      "En admin solo se visualiza. Los capítulos los sube el autor.",
      "Solo lectura"
    );

    setOpenAddChapter(false);
  };

  const confirmAddChapter = async () => {
    await alertService.warning("Deshabilitado.", "No disponible");
  };

  const goToChapter = (id: string) => {
    nav(`/capitulos/${id}`);
  };

  return (
    <div className={styles.wrap}>
      {/* =====================================================
          ENCABEZADO ADMINISTRATIVO
          ===================================================== */}
      <div className={styles.top}>
        <div className={styles.topCopy}>
          <div className={styles.adminEyebrow}>
            <span className={styles.adminEyebrowDot} />
            PANEL EDITORIAL
          </div>

          <div className={styles.topTitleRow}>
            <div>
              <h2 className={styles.h2}>Gestión de libros</h2>
              <p className={styles.p}>
                Administra y supervisa los libros, autores y capítulos
                registrados en la plataforma.
              </p>
            </div>

            <span className={styles.adminBadge}>Administrador</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>
          <div className={styles.loadingMark} />
          <strong>Cargando libros...</strong>
          <span>Consultando información editorial.</span>
        </div>
      ) : errorMsg ? (
        <div className={styles.errorBox}>{errorMsg}</div>
      ) : (
        <div className={styles.grid}>
          {/* =================================================
              LISTADO DE LIBROS
              ================================================= */}
          <div className={styles.leftCard}>
            <div className={styles.leftHeader}>
              <div>
                <div className={styles.sectionKicker}>BIBLIOTECA EDITORIAL</div>
                <div className={styles.leftTitle}>Libros de autores</div>
              </div>

              <div className={styles.bookCountBadge}>
                <strong>{books.length}</strong>
                <span>{books.length === 1 ? "libro" : "libros"}</span>
              </div>
            </div>

            <div className={styles.bookList}>
              {books
                .slice()
                .sort((a, b) => b.year - a.year)
                .map((b) => {
                  const active = b.id === selectedBookId;
                  const counts = countStatuses(b.chapters);

                  return (
                    <button
                      key={b.id}
                      className={`${styles.bookRow} ${
                        active ? styles.bookRowActive : ""
                      }`}
                      onClick={() => setSelectedBookId(b.id)}
                      type="button"
                    >
                      <div className={styles.bookRowMain}>
                        <div className={styles.bookTitleLine}>
                          <span className={styles.bookMiniIcon}>▣</span>

                          <div className={styles.bookTitle}>
                            {b.name}
                            <span className={styles.bookYear}>
                              {" "}
                              ({b.year})
                            </span>
                          </div>
                        </div>

                        <div className={styles.bookMeta}>
                          <span className={styles.metaLabel}>Autor</span>
                          <b>{b.authorName}</b>
                        </div>

                        <div className={styles.bookEmail}>
                          {b.authorEmail}
                        </div>

                        <div className={styles.bookStatsLine}>
                          <span>
                            <b>{b.chapters.length}</b> capítulos
                          </span>
                          <span className={styles.metaDot}>•</span>
                          <span>
                            <b>{counts.APROBADO}</b> aprobados
                          </span>
                          <span className={styles.metaDot}>•</span>
                          <span>
                            <b>{counts.CORRECCIONES}</b> en corrección
                          </span>
                        </div>
                      </div>

                      <span className={styles.bookChip}>
                        {b.chapters.length}/12
                      </span>
                    </button>
                  );
                })}

              {books.length === 0 && (
                <div className={styles.noBooks}>
                  <div className={styles.noBooksIcon}>▤</div>
                  <strong>No hay libros todavía</strong>
                  <span>
                    Los libros registrados aparecerán en este panel.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =================================================
              DETALLE DEL LIBRO
              ================================================= */}
          <div className={styles.rightCard}>
            {!selectedBook ? (
              <div className={styles.empty}>
                <strong>Selecciona un libro</strong>
                <span>El detalle aparecerá en este panel.</span>
              </div>
            ) : (
              <>
                <div className={styles.detailPanelTop}>
                  <div className={styles.sectionKicker}>
                    DETALLE EDITORIAL
                  </div>
                  <span className={styles.detailId}>
                    ID {selectedBook.id}
                  </span>
                </div>

                <div className={styles.bookHeader}>
                  <div className={styles.bookHeaderMain}>
                    <div className={styles.bookHeaderTitle}>
                      {selectedBook.name}
                    </div>

                    <div className={styles.bookHeaderSub}>
                      <span>Año {selectedBook.year}</span>
                      <span className={styles.headerDot}>•</span>
                      <span>
                        {selectedBook.chapters.length} capítulos
                      </span>
                      <span className={styles.headerDot}>•</span>
                      <span>
                        Autor: <b>{selectedBook.authorName}</b>
                      </span>
                    </div>

                    <div className={styles.bookAuthorEmail}>
                      {selectedBook.authorEmail}
                    </div>

                    <div className={styles.summaryLabel}>
                      Resumen de estados
                    </div>

                    <div className={styles.statsRow}>
                      <span className={getPillClass("RECIBIDO")}>
                        Recibidos: {countsSelected.RECIBIDO}
                      </span>

                      <span
                        className={getPillClass(
                          "ASIGNADO_A_DICTAMINADOR"
                        )}
                      >
                        Asignados:{" "}
                        {countsSelected.ASIGNADO_A_DICTAMINADOR}
                      </span>

                      <span className={getPillClass("EN_REVISION")}>
                        En revisión: {countsSelected.EN_REVISION}
                      </span>

                      <span className={getPillClass("CORRECCIONES")}>
                        Correcciones: {countsSelected.CORRECCIONES}
                      </span>

                      <span
                        className={getPillClass(
                          "REENVIADO_POR_AUTOR"
                        )}
                      >
                        Reenviados:{" "}
                        {countsSelected.REENVIADO_POR_AUTOR}
                      </span>

                      <span className={getPillClass("APROBADO")}>
                        Aprobados: {countsSelected.APROBADO}
                      </span>

                      <span className={getPillClass("RECHAZADO")}>
                        Rechazados: {countsSelected.RECHAZADO}
                      </span>
                    </div>
                  </div>

                  <div className={styles.bookHeaderRight}>
                    <button
                      className={styles.secondaryBtn}
                      onClick={openAddChapterModal}
                      type="button"
                      title="En admin solo se visualiza"
                    >
                      <span className={styles.btnIconDark}>＋</span>
                      Agregar capítulo
                    </button>
                  </div>
                </div>

                {/* =============================================
                    FILTROS
                    ============================================= */}
                <div className={styles.filterPanel}>
                  <div className={styles.filterPanelHead}>
                    <div>
                      <div className={styles.sectionKicker}>
                        CAPÍTULOS
                      </div>
                      <div className={styles.filterPanelTitle}>
                        Consultar capítulos
                      </div>
                    </div>

                    <div className={styles.resultsBadge}>
                      {filteredChapters.length}{" "}
                      {filteredChapters.length === 1
                        ? "resultado"
                        : "resultados"}
                    </div>
                  </div>

                  <div className={styles.filters}>
                    <div className={styles.filterField}>
                      <label className={styles.filterLabel}>
                        Buscar
                      </label>

                      <div className={styles.searchShell}>
                        <span className={styles.searchIcon}>⌕</span>

                        <input
                          className={styles.filterInput}
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Título, autor, ID..."
                        />
                      </div>
                    </div>

                    <div className={styles.filterField}>
                      <label className={styles.filterLabel}>
                        Estado
                      </label>

                      <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as any)
                        }
                      >
                        <option value="TODOS">Todos</option>
                        <option value="RECIBIDO">Recibido</option>
                        <option value="ASIGNADO_A_DICTAMINADOR">
                          Asignado a dictaminador
                        </option>
                        <option value="EN_REVISION">
                          En revisión
                        </option>
                        <option value="CORRECCIONES">
                          Correcciones
                        </option>
                        <option value="REENVIADO_POR_AUTOR">
                          Reenviado por autor
                        </option>
                        <option value="APROBADO">Aprobado</option>
                        <option value="RECHAZADO">Rechazado</option>
                      </select>
                    </div>

                    <div className={styles.filterRight}>
                      <span className={styles.muted}>
                        Filtro administrativo
                      </span>
                    </div>
                  </div>
                </div>

                {/* =============================================
                    TABLA
                    ============================================= */}
                <div className={styles.tableBlock}>
                  <div className={styles.tableBlockHead}>
                    <div>
                      <div className={styles.tableBlockTitle}>
                        Registro de capítulos
                      </div>
                      <div className={styles.tableBlockSub}>
                        Información asociada al libro seleccionado.
                      </div>
                    </div>

                    <span className={styles.tableCounter}>
                      {selectedBook.chapters.length}/12
                    </span>
                  </div>

                  <div className={styles.tableCard}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>#</th>
                          <th className={styles.th}>Capítulo</th>
                          <th className={styles.th}>Autor</th>
                          <th className={styles.th}>Estado</th>
                          <th className={styles.th}>Actualizado</th>
                          <th className={styles.th}>Acción</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredChapters.map((c, idx) => (
                          <tr key={c.id}>
                            <td className={styles.td}>
                              <span className={styles.rowNumber}>
                                {idx + 1}
                              </span>
                            </td>

                            <td className={styles.td}>
                              <div className={styles.cellTitle}>
                                {c.title}
                              </div>
                              <div className={styles.cellSub}>
                                ID: {c.id}
                              </div>
                            </td>

                            <td className={styles.td}>{c.author}</td>

                            <td className={styles.td}>
                              <span className={getPillClass(c.status)}>
                                {statusLabel(c.status)}
                              </span>
                            </td>

                            <td className={styles.td}>
                              {fmtDate(c.updatedAt)}
                            </td>

                            <td className={styles.td}>
                              <button
                                className={styles.linkBtn}
                                onClick={() => goToChapter(c.id)}
                                type="button"
                              >
                                Ver
                                <span
                                  className={styles.linkArrow}
                                  aria-hidden="true"
                                >
                                  →
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}

                        {filteredChapters.length === 0 && (
                          <tr>
                            <td
                              className={styles.td}
                              colSpan={6}
                            >
                              <div className={styles.emptyTable}>
                                <strong>
                                  Este libro aún no tiene capítulos.
                                </strong>
                                <span>
                                  No hay registros que coincidan con
                                  los filtros actuales.
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={styles.hintRow}>
                  <span className={styles.muted}>
                    Límite recomendado: 10–12 capítulos por libro.
                  </span>

                  <span className={styles.adminFootMark}>
                    Editorial · Panel administrativo
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL CREAR LIBRO
          ===================================================== */}
      {openCreateBook && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpenCreateBook(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalTopLine} />

            <div className={styles.modalTitle}>Crear libro</div>

            <div className={styles.errorBox}>
              Este modal está deshabilitado porque tu BD requiere{" "}
              <b>author_id</b>. Necesitas selector de autor + endpoint
              POST /api/admin/books.
            </div>

            <label className={styles.modalLabel}>Nombre</label>

            <input
              className={styles.modalInput}
              value={newBook.name}
              onChange={(e) =>
                setNewBook((s) => ({
                  ...s,
                  name: e.target.value,
                }))
              }
              placeholder="Ej: Libro 3"
              disabled
            />

            <label className={styles.modalLabel}>Año</label>

            <input
              className={styles.modalInput}
              type="number"
              value={newBook.year}
              onChange={(e) =>
                setNewBook((s) => ({
                  ...s,
                  year: Number(e.target.value),
                }))
              }
              placeholder="2026"
              disabled
            />

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => setOpenCreateBook(false)}
              >
                Cerrar
              </button>

              <button
                className={styles.primaryBtn}
                type="button"
                onClick={confirmCreateBook}
                disabled
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL AGREGAR CAPÍTULO
          ===================================================== */}
      {openAddChapter && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpenAddChapter(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalTopLine} />

            <div className={styles.modalTitle}>
              Agregar capítulo
            </div>

            <label className={styles.modalLabel}>Título</label>

            <input
              className={styles.modalInput}
              value={newChapter.title}
              onChange={(e) =>
                setNewChapter((s) => ({
                  ...s,
                  title: e.target.value,
                }))
              }
              placeholder="Ej: Educación y talento"
            />

            <label className={styles.modalLabel}>Autor</label>

            <input
              className={styles.modalInput}
              value={newChapter.author}
              onChange={(e) =>
                setNewChapter((s) => ({
                  ...s,
                  author: e.target.value,
                }))
              }
              placeholder="Ej: María López"
            />

            <label className={styles.modalLabel}>Estado</label>

            <select
              className={styles.modalInput}
              value={newChapter.status}
              onChange={(e) =>
                setNewChapter((s) => ({
                  ...s,
                  status: e.target.value as ChapterStatus,
                }))
              }
            >
              <option value="RECIBIDO">Recibido</option>
              <option value="ASIGNADO_A_DICTAMINADOR">
                Asignado a dictaminador
              </option>
              <option value="EN_REVISION">En revisión</option>
              <option value="CORRECCIONES">Correcciones</option>
              <option value="REENVIADO_POR_AUTOR">
                Reenviado por autor
              </option>
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => setOpenAddChapter(false)}
              >
                Cancelar
              </button>

              <button
                className={styles.primaryBtn}
                type="button"
                onClick={confirmAddChapter}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: ChapterStatus) {
  if (s === "RECIBIDO") return "Recibido";
  if (s === "ASIGNADO_A_DICTAMINADOR") return "Asignado";
  if (s === "EN_REVISION") return "En revisión";
  if (s === "CORRECCIONES") return "Correcciones";
  if (s === "REENVIADO_POR_AUTOR") return "Reenviado";
  if (s === "APROBADO") return "Aprobado";
  return "Rechazado";
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";

  const [y, m, d] = dateStr.split("-");

  if (!d) return dateStr;

  return `${d}/${m}/${y}`;
}

function countStatuses(chapters: Chapter[]) {
  const out: Record<ChapterStatus, number> = {
    RECIBIDO: 0,
    ASIGNADO_A_DICTAMINADOR: 0,
    EN_REVISION: 0,
    CORRECCIONES: 0,
    REENVIADO_POR_AUTOR: 0,
    APROBADO: 0,
    RECHAZADO: 0,
  };

  for (const c of chapters) {
    out[c.status] += 1;
  }

  return out;
}