import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from "./Login.module.css";
import { alertService } from "../utils/alerts";

/* =========================================================
   TYPES
   ========================================================= */

type User = {
  id: number;
  name: string;
  email: string;
  role: "editorial" | "dictaminador" | "autor";
};

type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

/* =========================================================
   RUTAS POR ROL
   ========================================================= */

const HOME_BY_ROLE: Record<User["role"], string> = {
  editorial: "/",
  dictaminador: "/dictaminador/Dictaminador",
  autor: "/autor/mis-envios",
};

/* =========================================================
   VALIDAR RUTA DE RETORNO
   ========================================================= */

function isAllowedFrom(
  role: User["role"],
  from: string
) {
  if (!from) return false;

  if (from === "/login") {
    return false;
  }

  if (role === "editorial") {
    return [
      "/",
      "/convocatorias",
      "/libros",
      "/capitulos",
      "/dictamenes",
      "/constancias",
      "/usuarios",
    ].some(
      (path) =>
        from === path ||
        from.startsWith(path + "/")
    );
  }

  if (role === "dictaminador") {
    return from.startsWith("/dictaminador");
  }

  if (role === "autor") {
    return from.startsWith("/autor");
  }

  return false;
}

/* =========================================================
   HELPER
   ========================================================= */

function clamp(
  n: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, n)
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function Login() {
  const nav = useNavigate();

  /* =========================
     STATE
     ========================= */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [showPass, setShowPass] =
    useState(false);

  const [remember, setRemember] =
    useState(false);

  /* =========================
     REFS
     ========================= */

  const leftRef =
    useRef<HTMLElement | null>(null);

  const cardRef =
    useRef<HTMLDivElement | null>(null);

  /* =========================
     VALIDACIÓN BOTÓN
     ========================= */

  const canSubmit =
    useMemo(() => {
      return (
        !!email.trim() &&
        !!password.trim() &&
        !loading
      );
    }, [
      email,
      password,
      loading,
    ]);

  /* =========================================================
     LIMPIAR ALERTAS AL ENTRAR
     ========================================================= */

  useEffect(() => {
    alertService.close();
  }, []);

  /* =========================================================
     RECUPERAR "RECORDARME"
     ========================================================= */

  useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        "remembered_email"
      );

    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  /* =========================================================
     FX
     PARALLAX + SPOTLIGHT + PREMIUM TILT
     ========================================================= */

  useEffect(() => {
    const left =
      leftRef.current;

    const card =
      cardRef.current;

    if (!left || !card) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (prefersReducedMotion) {
      return;
    }

    let raf = 0;

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      cancelAnimationFrame(raf);

      raf =
        requestAnimationFrame(() => {
          /* =========================
             PARALLAX LEFT
             ========================= */

          const leftRect =
            left.getBoundingClientRect();

          const leftX =
            clamp(
              (
                event.clientX -
                leftRect.left
              ) /
                leftRect.width,
              0,
              1
            );

          const leftY =
            clamp(
              (
                event.clientY -
                leftRect.top
              ) /
                leftRect.height,
              0,
              1
            );

          const mx =
            (leftX - 0.5) * 2;

          const my =
            (leftY - 0.5) * 2;

          left.style.setProperty(
            "--mx",
            mx.toString()
          );

          left.style.setProperty(
            "--my",
            my.toString()
          );

          /* =========================
             LOGIN CARD
             ========================= */

          const cardRect =
            card.getBoundingClientRect();

          const rawX =
            (
              event.clientX -
              cardRect.left
            ) /
            cardRect.width;

          const rawY =
            (
              event.clientY -
              cardRect.top
            ) /
            cardRect.height;

          /*
            Permitimos que el spotlight
            siga un poco fuera del card.
          */

          const glowX =
            clamp(
              rawX,
              -0.2,
              1.2
            );

          const glowY =
            clamp(
              rawY,
              -0.2,
              1.2
            );

          card.style.setProperty(
            "--gx",
            `${glowX * 100}%`
          );

          card.style.setProperty(
            "--gy",
            `${glowY * 100}%`
          );

          /* =========================
             TILT SUAVE
             ========================= */

          const normalizedX =
            clamp(
              rawX,
              0,
              1
            );

          const normalizedY =
            clamp(
              rawY,
              0,
              1
            );

          const rotateX =
            clamp(
              (
                0.5 -
                normalizedY
              ) * 5.2,
              -2.6,
              2.6
            );

          const rotateY =
            clamp(
              (
                normalizedX -
                0.5
              ) * 5.2,
              -2.6,
              2.6
            );

          card.style.setProperty(
            "--rx",
            `${rotateX}deg`
          );

          card.style.setProperty(
            "--ry",
            `${rotateY}deg`
          );
        });
    };

    const resetEffects = () => {
      left.style.setProperty(
        "--mx",
        "0"
      );

      left.style.setProperty(
        "--my",
        "0"
      );

      card.style.setProperty(
        "--rx",
        "0deg"
      );

      card.style.setProperty(
        "--ry",
        "0deg"
      );

      card.style.setProperty(
        "--gx",
        "50%"
      );

      card.style.setProperty(
        "--gy",
        "25%"
      );
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      }
    );

    document.documentElement.addEventListener(
      "mouseleave",
      resetEffects
    );

    window.addEventListener(
      "blur",
      resetEffects
    );

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      document.documentElement.removeEventListener(
        "mouseleave",
        resetEffects
      );

      window.removeEventListener(
        "blur",
        resetEffects
      );
    };
  }, []);

  /* =========================================================
     SUBMIT LOGIN
     ========================================================= */

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setErrorMsg(null);

    if (
      !email.trim() ||
      !password.trim()
    ) {
      const msg =
        "Ingresa tu correo y contraseña.";

      setErrorMsg(msg);

      await alertService.warning(
        msg,
        "Faltan datos"
      );

      return;
    }

    try {
      setLoading(true);

      alertService.loading(
        "Iniciando sesión..."
      );

      const { data } =
        await api.post<LoginResponse>(
          "/auth/login",
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password:
              password.trim(),
          }
        );

      /* =========================
         TOKEN / USER
         ========================= */

      localStorage.setItem(
        "token",
        data.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          data.user
        )
      );

      /* =========================
         RECORDAR EMAIL
         ========================= */

      if (remember) {
        localStorage.setItem(
          "remembered_email",
          email
            .trim()
            .toLowerCase()
        );
      } else {
        localStorage.removeItem(
          "remembered_email"
        );
      }

      /* =========================
         REDIRECCIÓN
         ========================= */

      const from =
        (
          history.state?.usr
            ?.from as
            | string
            | undefined
        ) ?? "";

      const fallback =
        HOME_BY_ROLE[
          data.user.role
        ];

      const target =
        isAllowedFrom(
          data.user.role,
          from
        )
          ? from
          : fallback;

      alertService.close();

      nav(
        target,
        {
          replace: true,
        }
      );
    } catch (err: any) {
      const msg =
        err?.response?.data
          ?.detail ??
        "No se pudo iniciar sesión. Verifica tus credenciales.";

      setErrorMsg(msg);

      await alertService.error(
        msg,
        "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);

      alertService.close();
    }
  };

  /* =========================================================
     ACCESSIBILITY
     ========================================================= */

  const errorId =
    errorMsg
      ? "login-error"
      : undefined;

  /* =========================================================
     BUTTON RIPPLE
     ========================================================= */

  const onRipple = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!canSubmit) {
      return;
    }

    const btn =
      e.currentTarget;

    const rect =
      btn.getBoundingClientRect();

    const x =
      e.clientX -
      rect.left;

    const y =
      e.clientY -
      rect.top;

    const span =
      document.createElement(
        "span"
      );

    span.className =
      styles.ripple;

    span.style.left =
      `${x}px`;

    span.style.top =
      `${y}px`;

    btn.appendChild(span);

    window.setTimeout(
      () => {
        span.remove();
      },
      700
    );
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div
      className={styles.page}
      data-scope="login-luxe"
    >
      {/* =====================================================
          LEFT PANEL
          ===================================================== */}

      <section
        className={styles.left}
        ref={leftRef}
        style={
          {
            "--mx": 0,
            "--my": 0,
          } as React.CSSProperties
        }
      >
        {/* FX */}

        <div
          className={
            styles.fxAurora
          }
          aria-hidden
        />

        <div
          className={
            styles.fxNoise
          }
          aria-hidden
        />

        <div
          className={
            styles.leftBgGrid
          }
          aria-hidden
        />

        <div
          className={
            styles.leftBlob1
          }
          aria-hidden
        />

        <div
          className={
            styles.leftBlob2
          }
          aria-hidden
        />

        {/* PARTICLES */}

        <div
          className={
            styles.luxeParticles
          }
          aria-hidden
        >
          <span
            className={`${styles.particle} ${styles.particle1}`}
          />

          <span
            className={`${styles.particle} ${styles.particle2}`}
          />

          <span
            className={`${styles.particle} ${styles.particle3}`}
          />

          <span
            className={`${styles.particle} ${styles.particle4}`}
          />

          <span
            className={`${styles.particle} ${styles.particle5}`}
          />

          <span
            className={`${styles.particle} ${styles.particle6}`}
          />

          <span
            className={`${styles.particle} ${styles.particle7}`}
          />

          <span
            className={`${styles.particle} ${styles.particle8}`}
          />

          <span
            className={`${styles.particle} ${styles.particle9}`}
          />

          <span
            className={`${styles.particle} ${styles.particle10}`}
          />

          <span
            className={`${styles.particle} ${styles.particle11}`}
          />

          <span
            className={`${styles.particle} ${styles.particle12}`}
          />

          <span
            className={`${styles.particle} ${styles.particle13}`}
          />

          <span
            className={`${styles.particle} ${styles.particle14}`}
          />
        </div>

        {/* BRAND */}

        <header
          className={
            styles.brandRow
          }
        >
          <div
            className={
              styles.brandMark
            }
            aria-hidden
          >
            <div
              className={
                styles.brandDot
              }
            />
          </div>

          <div
            className={
              styles.brandTextWrap
            }
          >
            <div
              className={
                styles.brandName
              }
            >
              EDITORIAL
            </div>

            <div
              className={
                styles.brandTag
              }
            >
              Plataforma de gestión
              editorial
            </div>
          </div>
        </header>

        {/* HERO */}

        <div
          className={
            styles.centerCopy
          }
        >
          <h2
            className={
              styles.heroTitle
            }
          >
            Donde los{" "}
            <span
              className={
                styles.heroAccent
              }
            >
              manuscritos
            </span>{" "}
            se convierten en
            libros.
          </h2>

          <p
            className={
              styles.heroSubtitle
            }
          >
            Accede para
            administrar capítulos,
            versiones, dictámenes y
            evaluación con un flujo
            claro y profesional.
          </p>

          {/* QUOTE */}

          <div
            className={
              styles.quoteCard
            }
          >
            <div
              className={
                styles.quoteTop
              }
            >
              <span
                className={
                  styles.quoteIcon
                }
                aria-hidden
              >
                ❝
              </span>

              <p
                className={
                  styles.quote
                }
              >
                Los libros son
                espejos: solo se ve
                en ellos lo que ya
                llevas dentro.
              </p>
            </div>

            <div
              className={
                styles.quoteAuthor
              }
            >
              Carlos Ruiz Zafón
            </div>
          </div>

          {/* STATS */}

          <div
            className={
              styles.statsRow
            }
          >
            <div
              className={
                styles.stat
              }
            >
              <div
                className={
                  styles.statNum
                }
              >
                15K+
              </div>

              <div
                className={
                  styles.statLbl
                }
              >
                Libros publicados
              </div>
            </div>

            <div
              className={
                styles.statDivider
              }
              aria-hidden
            />

            <div
              className={
                styles.stat
              }
            >
              <div
                className={
                  styles.statNum
                }
              >
                500+
              </div>

              <div
                className={
                  styles.statLbl
                }
              >
                Autores
              </div>
            </div>

            <div
              className={
                styles.statDivider
              }
              aria-hidden
            />

            <div
              className={
                styles.stat
              }
            >
              <div
                className={
                  styles.statNum
                }
              >
                3.2M
              </div>

              <div
                className={
                  styles.statLbl
                }
              >
                Lectores alcanzados
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        <footer
          className={
            styles.leftFooter
          }
        >
          {/* SEGURIDAD */}

          <div
            className={
              styles.footerPill
            }
          >
            <span
              className={
                styles.pillDot
              }
              aria-hidden
            />

            Seguridad & control
            por roles
          </div>

          {/* WEB EDITORIAL + COPYRIGHT */}

          <div
            className={
              styles.footerRight
            }
          >
            <a
              href="https://editorialinterpec.org"
              target="_blank"
              rel="noopener noreferrer"
              className={
                styles.editorialLink
              }
              aria-label="Visitar el sitio web de Editorial Interpec"
            >
              <span
                className={
                  styles.editorialLinkIcon
                }
                aria-hidden
              >
                ◎
              </span>

              <span>
                Editorial Interpec
              </span>

              <span
                className={
                  styles.linkArrow
                }
                aria-hidden
              >
                ↗
              </span>
            </a>

            <div
              className={
                styles.footerMini
              }
            >
              ©{" "}
              {
                new Date().getFullYear()
              }{" "}
              Editorial Suite
            </div>
          </div>
        </footer>
      </section>

      {/* =====================================================
          RIGHT PANEL
          ===================================================== */}

      <section
        className={
          styles.right
        }
      >
        <div
          ref={cardRef}
          className={`${styles.formShell} ${styles.glassShell}`}
          style={
            {
              "--rx": "0deg",
              "--ry": "0deg",
              "--gx": "50%",
              "--gy": "25%",
            } as React.CSSProperties
          }
        >
          {/* GLOW QUE SIGUE MOUSE */}

          <div
            className={
              styles.borderGlow
            }
            aria-hidden
          />

          {/* HEADER */}

          <div
            className={
              styles.formHeader
            }
          >
            <div
              className={
                styles.formKicker
              }
            >
              Iniciar sesión
            </div>

            <h1
              className={
                styles.formTitle
              }
            >
              Bienvenido de vuelta
            </h1>

            <p
              className={
                styles.formSubtitle
              }
            >
              Ingresa tus
              credenciales para
              continuar.
            </p>
          </div>

          {/* FORM */}

          <form
            onSubmit={submit}
            className={
              styles.form
            }
            noValidate
          >
            {/* EMAIL */}

            <label
              className={
                styles.field
              }
            >
              <span
                className={
                  styles.label
                }
              >
                Correo
              </span>

              <div
                className={
                  styles.inputWrap
                }
              >
                <span
                  className={
                    styles.inputIcon
                  }
                  aria-hidden
                >
                  @
                </span>

                <input
                  className={
                    styles.input
                  }
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="tu_correo@dominio.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  aria-invalid={
                    !!errorMsg
                  }
                  aria-describedby={
                    errorId
                  }
                />

                <span
                  className={
                    styles.scanline
                  }
                  aria-hidden
                />
              </div>
            </label>

            {/* PASSWORD */}

            <label
              className={
                styles.field
              }
            >
              <span
                className={
                  styles.label
                }
              >
                Contraseña
              </span>

              <div
                className={
                  styles.inputWrap
                }
              >
                <span
                  className={
                    styles.inputIcon
                  }
                  aria-hidden
                >
                  ●
                </span>

                <input
                  className={
                    styles.input
                  }
                  type={
                    showPass
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  aria-invalid={
                    !!errorMsg
                  }
                  aria-describedby={
                    errorId
                  }
                />

                <button
                  type="button"
                  className={
                    styles.eyeBtn
                  }
                  onClick={() =>
                    setShowPass(
                      (state) =>
                        !state
                    )
                  }
                  aria-label={
                    showPass
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {showPass
                    ? "Ocultar"
                    : "Ver"}
                </button>

                <span
                  className={
                    styles.scanline
                  }
                  aria-hidden
                />
              </div>
            </label>

            {/* ERROR */}

            {errorMsg && (
              <div
                id="login-error"
                className={
                  styles.errorBox
                }
                role="alert"
                aria-live="polite"
              >
                <div
                  className={
                    styles.errorDot
                  }
                  aria-hidden
                />

                <div>
                  {errorMsg}
                </div>
              </div>
            )}

            {/* REMEMBER */}

            <div
              className={
                styles.actionsRow
              }
            >
              <label
                className={
                  styles.remember
                }
              >
                <input
                  className={
                    styles.checkbox
                  }
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(
                      e.target
                        .checked
                    )
                  }
                />

                <span>
                  Recordarme
                </span>
              </label>
            </div>

            {/* LOGIN BUTTON */}

            <button
              className={`${styles.button} ${
                !canSubmit
                  ? styles.buttonDisabled
                  : ""
              }`}
              type="submit"
              disabled={!canSubmit}
              onClick={onRipple}
            >
              <span
                className={
                  styles.btnGlow
                }
                aria-hidden
              />

              <span
                className={
                  styles.btnText
                }
              >
                {loading ? (
                  <span
                    className={
                      styles.loadingRow
                    }
                  >
                    <span
                      className={
                        styles.spin
                      }
                      aria-hidden
                    />

                    Accediendo...
                  </span>
                ) : (
                  "Acceder"
                )}
              </span>

              <span
                className={
                  styles.btnShimmer
                }
                aria-hidden
              />
            </button>

            {/* DIVIDER */}

            <div
              className={
                styles.dividerRow
              }
              aria-hidden
            >
              <div
                className={
                  styles.dividerLine
                }
              />

              <div
                className={
                  styles.dividerText
                }
              >
                Editorial Suite
              </div>

              <div
                className={
                  styles.dividerLine
                }
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}