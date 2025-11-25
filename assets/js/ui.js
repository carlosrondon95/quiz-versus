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
    if (stageEl) stageEl.classList.remove("qr-stage--select");
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

  // ===== Portada: fondo controlado por clases CSS =====
  function applyStartBg() {
    if (!stageEl) return;
    stageEl.classList.add("qr-stage--start");
  }

  function clearStartBg() {
    if (!stageEl) return;
    stageEl.classList.remove("qr-stage--start");
  }

  // ===== Pantalla de inicio (sin modal) =====
  function startModal(onPlay) {
    if (document.getElementById("qr-start-layer")) return;
    if (document.querySelector("#qr-stage .qr-modal")) return;

    applyStartBg();
    markStageModalOpen(true);

    const layer = document.createElement("div");
    layer.id = "qr-start-layer";
    layer.className = "qr-start-layer";
    layer.innerHTML = `
      <div class="qr-card qr-card--start">
        <div class="qr-start-cta2">
          <button class="qr-start-btn2" id="qrStartBtn" type="button" aria-label="Jugar">
            <span class="qr-start-btn2__icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    `;

    if (stageEl) stageEl.appendChild(layer);

    let keyHandler;

    const cleanup = () => {
      if (keyHandler) window.removeEventListener("keydown", keyHandler);

      const existing = document.getElementById("qr-start-layer");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      markStageModalOpen(false);
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

    keyHandler = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "enter" || k === " ") {
        e.preventDefault();
        start();
      }
    };

    const btn = layer.querySelector("#qrStartBtn");
    if (btn) btn.addEventListener("click", start);
    window.addEventListener("keydown", keyHandler);
  }

  // ===== Selección de personaje =====
  function selectHeroModal(maleUrl, femaleUrl, onSelect) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal qr-modal--select";
    // margen interno para que no pegue a los bordes del stage
    modal.style.padding = "min(16px, 2.5vh)";

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

    // Garantías contra reglas antiguas en cascada (límites relativos al stage)
    card.style.background = "transparent";
    card.style.border = "0";
    card.style.outline = "none";
    card.style.boxShadow = "none";
    card.style.width = "auto";
    card.style.height = "auto";
    card.style.maxWidth = "90%";
    card.style.maxHeight = "80%";

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    if (stageEl) stageEl.classList.add("qr-stage--select");
    emit("qr:modal:open");

    if (window.QRAudio) window.QRAudio.playDoor();

    // Escala dinámica: en móvil horizontal permitimos hasta 0.5
    const refit = () =>
      requestAnimationFrame(() => {
        const smallLandscape = window.matchMedia(
          "(max-width: 1024px) and (orientation: landscape)"
        ).matches;
        // Ajuste del "cuadrado" a 4/5 en horizontal para ganar altura visual
        const wraps = card.querySelectorAll(".qr-select__imgwrap");
        wraps.forEach((w) => {
          w.style.aspectRatio = smallLandscape ? "4 / 5" : "1 / 1";
        });
        const imgs = card.querySelectorAll(".qr-select__img");
        imgs.forEach((img) => {
          img.style.maxWidth = smallLandscape ? "92%" : "96%";
          img.style.maxHeight = smallLandscape ? "92%" : "96%";
        });
        const minScale = smallLandscape ? 0.5 : 0.8;
        fitCardToStage(card, minScale);
      });

    // Espera a que carguen imágenes y ajusta
    const allImgs = card.querySelectorAll("img");
    let pending = allImgs.length;
    const done = () => {
      pending--;
      if (pending <= 0) refit();
    };
    if (pending === 0) refit();
    else {
      allImgs.forEach((i) => {
        if (i.complete && i.naturalWidth) done();
        else {
          i.addEventListener("load", done, { once: true });
          i.addEventListener("error", done, { once: true });
        }
      });
    }

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

    // Accesibilidad con teclado
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
          <span class="qr-consent-label">
            Al pulsar SEND, estoy aceptando la 
            <a id="policyLink" class="qr-link" href="https://versuselearning.com/politica-de-privacidad/" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
          </span>
        </div>
        <div class="qr-start-actions">
          <button class="qr-btn--img" id="btnSend" type="submit" aria-label="Enviar">
            <span class="qr-btn--img__icon" aria-hidden="true"></span>
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

    const errName = card.querySelector("#errName");
    const errEmail = card.querySelector("#errEmail");
    const errPhone = card.querySelector("#errPhone");

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

    function setErr(inputEl, errEl, msg) {
      if (!errEl) return;
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

    function validateAll() {
      const a = validateName(),
        b = validateEmail(),
        c = validatePhone();
      return a && b && c;
    }

    nameI.addEventListener("input", validateName);
    mailI.addEventListener("input", validateEmail);
    phoneI.addEventListener("input", () => {
      sanitizePhone();
      validatePhone();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateAll()) {
        if (!validateName()) return nameI.focus();
        if (!validateEmail()) return mailI.focus();
        if (!validatePhone()) return phoneI.focus();
        return;
      }
      close();
      onSubmit &&
        onSubmit({
          name: nameI.value.trim(),
          email: mailI.value.trim(),
          phone: phoneI.value.trim(),
          consent: "1", // siempre se considera aceptada al pulsar SEND
        });
    });
  }

  // ================== CEREMONIA DE ASIGNACIÓN ==================
  function normalize(s) {
    return String(s || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .trim();
  }

  function makeSlug(idOrLabel) {
    return String(idOrLabel || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

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

  function metaFromDecorated(label) {
    const t = normalize(label);

    if (t.includes("AGE360")) {
      if (t.includes("AUXILIAR")) return ACADEMY_META.AGEAUX;
      return ACADEMY_META.AGEADMIN;
    }

    if (t.includes("JURISPOL")) {
      if (t.includes("EJECUTIVA")) return ACADEMY_META.JURISPOLEE;
      return ACADEMY_META.JURISPOLEB;
    }

    if (t.includes("PREFORTIA")) return ACADEMY_META.PREFORTIA;
    if (t.includes("FORVIDE")) return ACADEMY_META.FORVIDE;
    if (t.includes("METODOS") || t.includes("MÉTODOS"))
      return ACADEMY_META.METODOS;
    if (t.includes("DOZENTY")) return ACADEMY_META.DOZENTY;

    return { id: t, label: label || "Academia", logo: null, role: "" };
  }

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
        pending--;
      } else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
    fitCardToStage(card, 0.85);
    setTimeout(() => fitCardToStage(card, 0.85), 120);
  }

  function logoClass(meta) {
    if (!meta) return "";
    const slug = makeSlug(meta.id || meta.label);
    return slug ? ` qr-ceremony-logo--${slug}` : "";
  }

  function endingModal(result, onRestart) {
    if (!root) return;

    const winnersRaw = extractWinners(result);
    const mainMeta = winnersRaw[0] ? metaFromDecorated(winnersRaw[0]) : null;
    const secondMeta = winnersRaw[1] ? metaFromDecorated(winnersRaw[1]) : null;
    const hasSecond = !!(secondMeta && secondMeta.logo);

    let centerHtml = "";
    if (mainMeta && mainMeta.logo && !hasSecond) {
      centerHtml = `
        <div class="qr-ceremony-main qr-ceremony-main--single">
          <div class="qr-ceremony-cup"></div>
          <div class="qr-ceremony-logo${logoClass(mainMeta)}"></div>
          <div class="qr-ceremony-cup"></div>
        </div>
      `;
    } else if (mainMeta && mainMeta.logo && hasSecond) {
      centerHtml = `
        <div class="qr-ceremony-main qr-ceremony-main--double">
          <div class="qr-ceremony-logo${logoClass(mainMeta)}"></div>
          <div class="qr-ceremony-cup"></div>
          <div class="qr-ceremony-logo${logoClass(secondMeta)}"></div>
        </div>
      `;
    } else {
      centerHtml = `
        <div class="qr-ceremony-main">
          <div class="qr-ceremony-cup"></div>
        </div>
      `;
    }

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

    markStageModalOpen(true);
    root.innerHTML = "";

    const modal = document.createElement("div");
    modal.className = "qr-modal";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--ceremony";
    card.innerHTML = `
      <h2 class="qr-ceremony-title">CEREMONIA DE ASIGNACIÓN</h2>
      ${centerHtml}
      ${rolesHtml}
      <div class="qr-ceremony-actions">
        <button type="button" class="qr-ceremony-restart" aria-label="Reiniciar">
          <span class="qr-ceremony-restart-icon" aria-hidden="true"></span>
        </button>
      </div>
    `;

    modal.appendChild(card);
    root.appendChild(modal);
    emit("qr:modal:open");

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

    const restartBtn = card.querySelector(".qr-ceremony-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        close();
        markStageModalOpen(false);
        emit("qr-restart");
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
    setStartPosPortrait({ left, bottom } = {}) {
      setVar("--start-left-portrait", left);
      setVar("--start-bottom-portrait", bottom);
    },
    setStartPosLandscape({ left, bottom } = {}) {
      setVar("--start-left-landscape", left);
      setVar("--start-bottom-landscape", bottom);
    },
  };

  window.QRUI = window.QRUI || {};
  window.QRUI.controls = Object.assign(window.QRUI.controls || {}, controls);
})();
