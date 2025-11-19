(function () {
  // ===== Util: total de puertas =====
  function getTotalDoors() {
    return window.QRData && Array.isArray(window.QRData.QUESTIONS)
      ? window.QRData.QUESTIONS.length
      : 0;
  }
  function setBadge(currentOneBased) {
    var badge = document.querySelector(".qr-badge");
    var total = getTotalDoors();
    if (badge && total > 0) {
      var curr = Math.max(1, currentOneBased || 1);
      badge.textContent = curr + " / " + total;
    }
  }
  setBadge(1);
  window.addEventListener("qr:station", function (ev) {
    var idx = ev?.detail?.index ?? 0;
    setBadge(idx + 1);
  });

  // ===== Resolver base de assets =====
  function resolveAssetsBase() {
    if (window.QR_ASSETS_BASE) {
      return String(window.QR_ASSETS_BASE).replace(/\/?$/, "/");
    }
    const scripts = document.scripts || document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || "";
      const m = src.match(/^(.*\/assets\/)js\/ui\.js(?:\?.*)?$/i);
      if (m) return m[1];
    }
    return "assets/";
  }
  const ASSETS = resolveAssetsBase();

  // ===== Infra modal =====
  const stageEl = document.getElementById("qr-stage");
  let root = document.querySelector("#qr-stage #qr-modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "qr-modal-root";
    if (stageEl) stageEl.appendChild(root);
  }
  const appEl = document.getElementById("qr-app");

  function markStageModalOpen(on) {
    if (!stageEl) return;
    stageEl.classList.toggle("qr-stage--modal-open", !!on);
  }
  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
  function close() {
    const m = document.querySelector("#qr-stage .qr-modal");
    if (m) m.remove();
    const any = document.querySelector("#qr-stage .qr-modal");
    markStageModalOpen(!!any);
    emit("qr:modal:close");
  }

  function isMobile() {
    return document.body.classList.contains("is-mobile");
  }
  function isTypingTarget(el) {
    if (!el) return false;
    const t = (el.tagName || "").toLowerCase();
    return (
      t === "input" ||
      t === "textarea" ||
      t === "select" ||
      el.isContentEditable === true
    );
  }

  // Bloquear scroll con Space fuera de inputs
  (function installSpaceScrollGuard() {
    const handler = (e) => {
      const code = e.code || e.key;
      const isSpace = code === "Space" || code === "Spacebar" || e.key === " ";
      if (!isSpace) return;
      if (isTypingTarget(e.target)) return;
      const insideApp = !!(appEl && appEl.contains(e.target));
      const modalOpen = !!document.querySelector("#qr-stage .qr-modal");
      if (insideApp || modalOpen) e.preventDefault();
    };
    document.addEventListener("keydown", handler, {
      passive: false,
      capture: true,
    });
  })();

  // Ajuste de escala para tarjetas
  function fitCardToStage(card, minScale = 0.85) {
    if (!card || !stageEl) return;
    const rectStage = stageEl.getBoundingClientRect();
    const availW = Math.max(1, rectStage.width - 16);
    const availH = Math.max(1, rectStage.height - 16);
    card.style.transform = "none";
    card.style.transformOrigin = "center center";
    card.style.willChange = "transform";
    const rect = card.getBoundingClientRect();
    const scaleW = availW / Math.max(1, rect.width);
    const scaleH = availH / Math.max(1, rect.height);
    const scale = Math.min(1, Math.max(minScale, Math.min(scaleW, scaleH)));
    if (scale < 1) card.style.transform = `scale(${scale})`;
  }

  // ===== Helpers de orientación =====
  function isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches;
  }

  // ===== Portada: elección de imagen =====
  function pickStartImageSrc() {
    if (isMobile() && isPortrait()) {
      return `${ASSETS}img/portadaresponsive.jpg`;
    }
    return `${ASSETS}img/inicio.jpg`;
  }

  // ===== Aplicar/actualizar fondo de portada vía variables CSS =====
  let _prevStageStyle = null;

  function applyStartBg() {
    if (!stageEl) return;
    _prevStageStyle = stageEl.getAttribute("style") || "";
    stageEl.classList.add("qr-stage--start");
    stageEl.style.setProperty(
      "--start-bg-img",
      `url("${pickStartImageSrc()}")`
    );
  }

  function updateStartBgImageOnly() {
    if (!stageEl || !stageEl.classList.contains("qr-stage--start")) return;
    stageEl.style.setProperty(
      "--start-bg-img",
      `url("${pickStartImageSrc()}")`
    );
  }

  function clearStartBg() {
    if (!stageEl) return;
    stageEl.classList.remove("qr-stage--start");
    if (_prevStageStyle !== null) {
      stageEl.setAttribute("style", _prevStageStyle);
      _prevStageStyle = null;
    } else {
      stageEl.removeAttribute("style");
    }
  }

  // ===== Pantalla de inicio =====
  function startModal(onPlay) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    // Fondo de portada
    applyStartBg();

    const modal = document.createElement("div");
    modal.className = "qr-modal qr-modal--start";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--start";
    card.innerHTML = `
      <div class="qr-start-cta2">
        <button class="qr-start-btn2" id="qrStartBtn" type="button" aria-label="Jugar">
          <img src="${ASSETS}img/buttons/start.png" alt="Jugar" class="qr-start-btn2__icon" />
        </button>
      </div>
    `;

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    const onOrient = () => updateStartBgImageOnly();
    window.addEventListener("orientationchange", onOrient);

    const cleanup = () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("orientationchange", onOrient);
      close();
      clearStartBg();
    };

    async function requestFSNow() {
      if (!isMobile()) return;
      try {
        if (!document.fullscreenElement && appEl && appEl.requestFullscreen) {
          await appEl.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (_) {}
    }

    const start = async () => {
      await requestFSNow();
      cleanup();
      onPlay && onPlay();
    };

    const keyHandler = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "enter" || k === " ") {
        e.preventDefault();
        start();
      }
    };

    const btn = card.querySelector("#qrStartBtn");
    if (btn) btn.addEventListener("click", start);
    window.addEventListener("keydown", keyHandler);
  }

  // ===== Selección de personaje =====
  function selectHeroModal(maleUrl, femaleUrl, onSelect) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal qr-modal--select";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--select";
    card.innerHTML = `
      <h3 class="qr-title">Elige tu personaje</h3>
      <div class="qr-select" role="listbox" aria-label="Elige personaje">
        <button class="qr-select__item" id="selMale" aria-label="Hombre">
          <div class="qr-select__imgwrap"><img class="qr-select__img" src="${maleUrl}" alt="Hombre" /></div>
        </button>
        <button class="qr-select__item" id="selFemale" aria-label="Mujer">
          <div class="qr-select__imgwrap"><img class="qr-select__img" src="${femaleUrl}" alt="Mujer" /></div>
        </button>
      </div>
    `;

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    if (window.QRAudio) window.QRAudio.playDoor();

    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.8));
    refit();
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("qr:viewport:change", refit);
    window.addEventListener(
      "qr:modal:close",
      () => {
        window.removeEventListener("resize", refit);
        window.removeEventListener("orientationchange", refit);
        window.removeEventListener("qr:viewport:change", refit);
      },
      { once: true }
    );

    const pick = (g) => {
      if (window.QRAudio) window.QRAudio.playAnswer();
      close();
      onSelect && onSelect(g);
    };
    card
      .querySelector("#selMale")
      .addEventListener("click", () => pick("hombre"));
    card
      .querySelector("#selFemale")
      .addEventListener("click", () => pick("mujer"));

    const items = card.querySelectorAll(".qr-select__item");
    let idx = 0;
    if (items[0]) items[0].focus();
    card.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        idx = Math.min(items.length - 1, idx + 1);
        items[idx].focus();
      }
      if (e.key === "ArrowLeft") {
        idx = Math.max(0, idx - 1);
        items[idx].focus();
      }
      if (e.key === "Enter") {
        items[idx].click();
      }
    });
  }

  // ===== Pregunta =====
  function questionModal(qObj, onAnswer) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--question";
    card.innerHTML = `
      <div class="qr-q">${qObj.q}</div>
      <div class="qr-opts"></div>
    `;
    const opts = card.querySelector(".qr-opts");
    qObj.opts.forEach((op) => {
      const b = document.createElement("button");
      b.className = "qr-opt";
      b.textContent = op;
      b.addEventListener("click", () => {
        if (window.QRAudio) window.QRAudio.playAnswer();
        close();
        onAnswer && onAnswer(op);
      });
      opts.appendChild(b);
    });

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.85));
    refit();
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("qr:viewport:change", refit);
    window.addEventListener(
      "qr:modal:close",
      () => {
        window.removeEventListener("resize", refit);
        window.removeEventListener("orientationchange", refit);
        window.removeEventListener("qr:viewport:change", refit);
      },
      { once: true }
    );
  }

  // ===== Formulario =====
  function formModal(onSubmit) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--form";
    card.innerHTML = `
      <form id="qrLeadForm" novalidate>
        <h3 class="qr-title">TUS DATOS</h3>
        <div class="qr-form-grid">
          <div class="qr-row">
            <label for="fName">Nombre</label>
            <input class="qr-input" id="fName" type="text" placeholder="Nombre" maxlength="99" autocomplete="name">
            <div class="qr-error" id="errName"></div>
          </div>
          <div class="qr-row">
            <label for="fPhone">Teléfono</label>
            <input class="qr-input" id="fPhone" type="tel" placeholder="Teléfono" inputmode="numeric" autocomplete="tel" pattern="\\d*">
            <div class="qr-error" id="errPhone"></div>
          </div>
        </div>
        <div class="qr-row">
          <label for="fEmail">Email</label>
          <input class="qr-input" id="fEmail" type="email" placeholder="Email" autocomplete="email" inputmode="email">
          <div class="qr-error" id="errEmail"></div>
        </div>
        <div class="qr-row qr-consent">
          <label>
            <input id="fConsent" type="checkbox">
            Acepto la <a id="policyLink" class="qr-link" href="https://versuselearning.com/politica-de-privacidad/" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
          </label>
          <div class="qr-error" id="errConsent"></div>
        </div>
        <div class="qr-start-actions">
          <button class="qr-btn--img" id="btnSend" type="submit" aria-label="Enviar">
            <img src="${ASSETS}img/buttons/send.png" alt="Enviar" class="qr-btn--img__icon" />
          </button>
        </div>
      </form>
    `;

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.85));
    refit();
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("qr:viewport:change", refit);
    window.addEventListener(
      "qr:modal:close",
      () => {
        window.removeEventListener("resize", refit);
        window.removeEventListener("orientationchange", refit);
        window.removeEventListener("qr:viewport:change", refit);
      },
      { once: true }
    );

    const policyLink = card.querySelector("#policyLink");
    if (policyLink)
      policyLink.addEventListener("click", (e) => e.stopPropagation());

    // Validación
    const form = card.querySelector("#qrLeadForm");
    const nameI = card.querySelector("#fName");
    const mailI = card.querySelector("#fEmail");
    const phoneI = card.querySelector("#fPhone");
    const consI = card.querySelector("#fConsent");

    const errName = card.querySelector("#errName");
    const errEmail = card.querySelector("#errEmail");
    const errPhone = card.querySelector("#errPhone");
    const errCons = card.querySelector("#errConsent");

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

    function setErr(inputEl, errEl, msg) {
      if (msg) {
        errEl.textContent = msg;
        inputEl && inputEl.classList.add("is-invalid");
      } else {
        errEl.textContent = "";
        inputEl && inputEl.classList.remove("is-invalid");
      }
    }

    function validateName() {
      const v = (nameI.value || "").trim();
      if (!v) return setErr(nameI, errName, "El nombre es obligatorio."), false;
      if (v.length > 99)
        return setErr(nameI, errName, "Máximo 99 caracteres."), false;
      setErr(nameI, errName, "");
      return true;
    }

    function sanitizePhone() {
      let v = phoneI.value.replace(/[^\d+]/g, "");
      if (v.includes("+"))
        v = "+" + v.replace(/[+]/g, "").replace(/[^\d]/g, "");
      phoneI.value = v;
    }

    function validatePhone() {
      sanitizePhone();
      const v = phoneI.value.trim();
      if (!v)
        return setErr(phoneI, errPhone, "El teléfono es obligatorio."), false;
      const isIntl = v.startsWith("+");
      if (!isIntl) {
        if (!/^\d{9}$/.test(v))
          return (
            setErr(phoneI, errPhone, "Debe tener 9 dígitos si es español."),
            false
          );
      } else {
        if (!/^\+\d{8,15}$/.test(v))
          return (
            setErr(
              phoneI,
              errPhone,
              "Formato internacional no válido (+XX...)."
            ),
            false
          );
      }
      setErr(phoneI, errPhone, "");
      return true;
    }

    function validateEmail() {
      const v = (mailI.value || "").trim();
      if (!v) return setErr(mailI, errEmail, "El email es obligatorio."), false;
      if (!emailRe.test(v))
        return setErr(mailI, errEmail, "Introduce un email válido."), false;
      setErr(mailI, errEmail, "");
      return true;
    }

    function validateConsent() {
      if (!consI.checked)
        return (
          setErr(consI, errCons, "Debes aceptar la Política de Privacidad."),
          false
        );
      setErr(consI, errCons, "");
      return true;
    }

    function validateAll() {
      const a = validateName(),
        b = validateEmail(),
        c = validatePhone(),
        d = validateConsent();
      return a && b && c && d;
    }

    nameI.addEventListener("input", validateName);
    mailI.addEventListener("input", validateEmail);
    phoneI.addEventListener("input", () => {
      sanitizePhone();
      validatePhone();
    });
    consI.addEventListener("change", validateConsent);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateAll()) {
        if (!validateName()) return nameI.focus();
        if (!validateEmail()) return mailI.focus();
        if (!validatePhone()) return phoneI.focus();
        if (!validateConsent()) return consI.focus();
        return;
      }
      close();
      onSubmit &&
        onSubmit({
          name: nameI.value.trim(),
          email: mailI.value.trim(),
          phone: phoneI.value.trim(),
          consent: consI.checked ? "1" : "0",
        });
    });
  }

  // ================== CEREMONIA DE ASIGNACIÓN NUEVA ==================

  // Normalización básica
  function normalize(s) {
    return String(s || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .trim();
  }

  // Mapeo: identificador -> logo + texto de rol
  const ACADEMY_META = {
    AGEADMIN: {
      id: "AGEADMIN",
      label: "AGE Administrativo",
      logo: "ageadmin.png",
      role: "FUNCIONARIO DEL ESTADO",
    },
    AGEAUX: {
      id: "AGEAUX",
      label: "AGE Auxiliar",
      logo: "ageaux.png",
      role: "FUNCIONARIO DEL ESTADO",
    },
    DOZENTY: {
      id: "DOZENTY",
      label: "Dozenty",
      logo: "dozenty.png",
      role: "PROFESOR",
    },
    FORVIDE: {
      id: "FORVIDE",
      label: "Forvide",
      logo: "forvide.png",
      role: "FUNCIONARIO PRISIONES",
    },
    PREFORTIA: {
      id: "PREFORTIA",
      label: "Prefortia",
      logo: "prefortia.png",
      role: "GUARDIA CIVIL",
    },
    METODOS: {
      id: "METODOS",
      label: "Métodos",
      logo: "metodos.png",
      role: "MILITAR",
    },
    JURISPOLEB: {
      id: "JURISPOLEB",
      label: "JURISPOL (EB)",
      logo: "jurispoleb.png",
      role: "POLICÍA NACIONAL",
    },
    JURISPOLEE: {
      id: "JURISPOLEE",
      label: "JURISPOL (EE)",
      logo: "jurispolee.png",
      role: "POLICÍA NACIONAL",
    },
  };

  // Detecta meta a partir del texto “decorado” que manda game.js (p.ej. "JURISPOL – Escala Ejecutiva", "AGE360 – Auxiliar")
  function metaFromDecorated(label) {
    const t = normalize(label);

    // AGE360 → distinguir rama
    if (t.includes("AGE360")) {
      if (t.includes("AUXILIAR")) return ACADEMY_META.AGEAUX;
      return ACADEMY_META.AGEADMIN; // por defecto Administrativo si no indica Auxiliar
    }

    // JURISPOL → distinguir escala
    if (t.includes("JURISPOL")) {
      if (t.includes("EJECUTIVA")) return ACADEMY_META.JURISPOLEE;
      return ACADEMY_META.JURISPOLEB; // por defecto Básica si no indica Ejecutiva
    }

    // Resto directos
    if (t.includes("PREFORTIA")) return ACADEMY_META.PREFORTIA;
    if (t.includes("FORVIDE")) return ACADEMY_META.FORVIDE;
    if (t.includes("METODOS") || t.includes("MÉTODOS"))
      return ACADEMY_META.METODOS;
    if (t.includes("DOZENTY")) return ACADEMY_META.DOZENTY;

    // Fallback genérico (sin logo/rol)
    return { id: t, label: label || "Academia", logo: null, role: "" };
  }

  // Extrae ganadores de distintos formatos
  function extractWinners(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result.slice(0, 2);
    if (result.main || result.secondary)
      return [result.main, result.secondary].filter(Boolean);
    if (result.primary || result.secondary)
      return [result.primary, result.secondary].filter(Boolean);
    if (result.first || result.second)
      return [result.first, result.second].filter(Boolean);
    if (result.top2 && Array.isArray(result.top2))
      return result.top2.slice(0, 2);
    if (result.best && Array.isArray(result.best))
      return result.best.slice(0, 2);
    if (result.winner) return [result.winner];
    if (result.academy) return [result.academy];
    if (result.top1 || result.top2)
      return [result.top1, result.top2].filter(Boolean);
    return [];
  }

  // Esperar a que carguen imágenes del card y refitear
  function refitOnImages(card) {
    if (!card) return;
    const imgs = Array.from(card.querySelectorAll("img"));
    if (!imgs.length) {
      fitCardToStage(card, 0.85);
      return;
    }
    let pending = imgs.length;
    const done = () => {
      pending--;
      if (pending <= 0) fitCardToStage(card, 0.85);
    };
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth) {
        // ya cargada
        pending--;
      } else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
    // refit inicial y de seguridad
    fitCardToStage(card, 0.85);
    setTimeout(() => fitCardToStage(card, 0.85), 120);
  }

  // Ceremonia
  function endingModal(result, onRestart) {
    if (!root) return;

    const winnersRaw = extractWinners(result);
    const mainMeta = metaFromDecorated(winnersRaw[0]);
    const secondMeta = winnersRaw[1] ? metaFromDecorated(winnersRaw[1]) : null;
    const hasSecond = !!(secondMeta && secondMeta.logo);

    const CUP_SRC = `${ASSETS}img/copa.png`;
    const LOGO_BASE = `${ASSETS}img/logos/`;
    const RESTART_SRC = `${ASSETS}img/buttons/restart.png`;

    // Bloque central: logos + copas
    let centerHtml = "";
    if (mainMeta && mainMeta.logo && !hasSecond) {
      // Una sola academia: logo en centro + dos copas
      centerHtml = `
        <div class="qr-ceremony-main qr-ceremony-main--single">
          <img src="${CUP_SRC}" alt="Copa" class="qr-ceremony-cup" />
          <img src="${LOGO_BASE + mainMeta.logo}" alt="${
        mainMeta.label
      }" class="qr-ceremony-logo" />
          <img src="${CUP_SRC}" alt="Copa" class="qr-ceremony-cup" />
        </div>
      `;
    } else if (mainMeta && mainMeta.logo && hasSecond) {
      // Dos academias: copa medio; main izq, second dcha
      centerHtml = `
        <div class="qr-ceremony-main qr-ceremony-main--double">
          <img src="${LOGO_BASE + mainMeta.logo}" alt="${
        mainMeta.label
      }" class="qr-ceremony-logo" />
          <img src="${CUP_SRC}" alt="Copa" class="qr-ceremony-cup" />
          <img src="${LOGO_BASE + secondMeta.logo}" alt="${
        secondMeta.label
      }" class="qr-ceremony-logo" />
        </div>
      `;
    } else {
      // Fallback
      centerHtml = `
        <div class="qr-ceremony-main">
          <img src="${CUP_SRC}" alt="Copa" class="qr-ceremony-cup" />
        </div>
      `;
    }

    // Roles (estilo del título, apilados)
    const rolesHtml = `
      <div class="qr-ceremony-roles">
        ${
          mainMeta && mainMeta.role
            ? `<div class="qr-ceremony-role">${mainMeta.role}</div>`
            : ""
        }
        ${
          hasSecond && secondMeta.role
            ? `<div class="qr-ceremony-role">${secondMeta.role}</div>`
            : ""
        }
      </div>
    `;

    // Limpiar y montar
    markStageModalOpen(true);
    root.innerHTML = "";

    const modal = document.createElement("div");
    modal.className = "qr-modal"; // velo estándar

    const card = document.createElement("div");
    card.className = "qr-card qr-card--ceremony";
    card.innerHTML = `
      <h2 class="qr-ceremony-title">CEREMONIA DE ASIGNACIÓN</h2>
      ${centerHtml}
      ${rolesHtml}
      <div class="qr-ceremony-actions">
        <button type="button" class="qr-ceremony-restart" aria-label="Reiniciar">
          <img src="${RESTART_SRC}" alt="Volver a jugar" />
        </button>
      </div>
    `;

    modal.appendChild(card);
    root.appendChild(modal);
    emit("qr:modal:open");

    // Refit responsive (y al cargar imágenes)
    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.85));
    refitOnImages(card);
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("qr:viewport:change", refit);
    window.addEventListener(
      "qr:modal:close",
      () => {
        window.removeEventListener("resize", refit);
        window.removeEventListener("orientationchange", refit);
        window.removeEventListener("qr:viewport:change", refit);
      },
      { once: true }
    );

    // Restart funcional:
    const restartBtn = card.querySelector(".qr-ceremony-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        // Cerrar modal, liberar flag y ejecutar callback si existe
        close();
        markStageModalOpen(false);
        emit("qr-restart"); // por compatibilidad
        if (typeof onRestart === "function") {
          try {
            onRestart();
          } catch (e) {
            location.reload();
          }
        } else {
          location.reload();
        }
      });
    }

    return modal;
  }
  // ================== FIN CEREMONIA ==================

  window.QRUI = {
    startModal,
    selectHeroModal,
    questionModal,
    formModal,
    endingModal,
    close,
  };
})();

/* =================== CONTROLES JS PARA POSICIÓN DEL START EN MÓVIL =================== */
(function () {
  const R = document.documentElement.style;
  function setVar(name, val) {
    if (val == null) return;
    const v = typeof val === "number" ? val + "%" : String(val);
    R.setProperty(name, v);
  }

  const controls = {
    /** Ajuste rápido en móvil vertical (portrait) */
    setStartPosPortrait({ left, bottom } = {}) {
      setVar("--start-left-portrait", left);
      setVar("--start-bottom-portrait", bottom);
    },
    /** Ajuste rápido en móvil horizontal (landscape) */
    setStartPosLandscape({ left, bottom } = {}) {
      setVar("--start-left-landscape", left);
      setVar("--start-bottom-landscape", bottom);
    },
  };

  window.QRUI = window.QRUI || {};
  window.QRUI.controls = Object.assign(window.QRUI.controls || {}, controls);
})();
