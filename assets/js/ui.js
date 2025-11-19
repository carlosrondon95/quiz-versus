// assets/js/ui.js
(function () {
  /* =========================
   *  PROGRESO / CONTADOR DE PUERTAS
   * ========================= */
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

  /* =========================
   *  BASE DE ASSETS
   * ========================= */
  function resolveAssetsBase() {
    if (window.QR_ASSETS_BASE)
      return String(window.QR_ASSETS_BASE).replace(/\/?$/, "/");

    const scripts = document.scripts || document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || "";
      const m = src.match(/^(.*\/assets\/)js\/ui\.js(?:\?.*)?$/i);
      if (m) return m[1];
    }
    return "assets/";
  }

  const ASSETS = resolveAssetsBase();

  /* =========================
   *  INFRA MODAL
   * ========================= */
  const stageEl = document.getElementById("qr-stage");
  let root = document.querySelector("#qr-stage #qr-modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "qr-modal-root";
    if (stageEl) stageEl.appendChild(root);
  }
  const appEl = document.getElementById("qr-app");

  function markStageModalOpen(on) {
    if (stageEl) stageEl.classList.toggle("qr-stage--modal-open", !!on);
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

  // Bloqueo scroll con SPACE fuera del juego
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

  /* =========================
   *  AJUSTE ESCALA TARJETAS
   * ========================= */
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

  function isPortrait() {
    return window.matchMedia("(orientation: portrait)").matches;
  }

  /* =========================
   *  PORTADA / START
   * ========================= */
  function pickStartImageSrc() {
    if (isMobile() && isPortrait()) return `${ASSETS}img/portadaresponsive.jpg`;
    return `${ASSETS}img/inicio.jpg`;
  }

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

  function startModal(onPlay) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

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

    let keyHandler;

    const cleanup = () => {
      if (keyHandler) window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("orientationchange", onOrient);
      close();
      clearStartBg(); // vuelve al fondo definido en el CSS (.qr-stage)
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
      cleanup(); // 1) cerramos portada y restauramos fondo
      onPlay && onPlay(); // 2) luego disparamos el callback (selección de personaje, etc.)
    };

    keyHandler = (e) => {
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

  /* =========================
   *  SELECCIÓN DE PERSONAJE
   * ========================= */
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
          <div class="qr-select__imgwrap">
            <img class="qr-select__img" src="${maleUrl}" alt="Hombre" />
          </div>
        </button>
        <button class="qr-select__item" id="selFemale" aria-label="Mujer">
          <div class="qr-select__imgwrap">
            <img class="qr-select__img" src="${femaleUrl}" alt="Mujer" />
          </div>
        </button>
      </div>
    `;

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    // Marcamos el estado de selección y dejamos que el CSS pinte fondo.jpg
    if (stageEl) {
      stageEl.classList.add("qr-stage--select");
    }

    window.addEventListener(
      "qr:modal:close",
      () => {
        if (stageEl) {
          stageEl.classList.remove("qr-stage--select");
        }
      },
      { once: true }
    );

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

      // Primero avisamos al motor del juego (elige personaje / prepara canvas)
      if (onSelect) onSelect(g);

      // Cerramos el modal en el siguiente frame → el canvas ya está pintado y no hay pantallazo negro
      requestAnimationFrame(() => {
        close();
      });
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

  /* =========================
   *  MODAL DE PREGUNTA
   * ========================= */
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
      b.type = "button";
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

  /* =========================
   *  MODAL FORMULARIO
   * ========================= */
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
            Acepto la
            <a id="policyLink" class="qr-link" href="https://versuselearning.com/politica-de-privacidad/" target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </a>
          </label>
          <div class="qr-error" id="errConsent"></div>
        </div>
        <div class="qr-ceremony-actions">
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

  /* =========================
   *  CEREMONIA FINAL
   * ========================= */
  function normalize(str) {
    return String(str || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .trim();
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

  function mapWinnerNameToMetaKey(name) {
    const n = normalize(name);
    if (!n) return null;

    if (n.startsWith("AGE360") && n.includes("AUXILIAR")) return "AGEAUX";
    if (n.startsWith("AGE360")) return "AGEADMIN";

    if (n.startsWith("JURISPOL") && n.includes("ESCALA BASICA"))
      return "JURISPOLEB";
    if (n.startsWith("JURISPOL") && n.includes("ESCALA EJECUTIVA"))
      return "JURISPOLEE";

    if (n === "PREFORTIA") return "PREFORTIA";
    if (n === "FORVIDE") return "FORVIDE";
    if (n === "METODOS" || n === "MÉTODOS") return "METODOS";
    if (n === "DOZENTY") return "DOZENTY";

    return null;
  }

  function getBulletsFor(name) {
    try {
      if (window.QRData && typeof window.QRData.bullets === "function") {
        return window.QRData.bullets(name) || [];
      }
    } catch (_) {}
    return [];
  }

  /**
   * endingModal(result, [leadData], [onRestart])
   * result: { top1, top2 }
   */
  function endingModal(result, maybeLeadOrCb, maybeCb) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const leadData =
      typeof maybeLeadOrCb === "function" ? null : maybeLeadOrCb || null;
    const onRestart =
      typeof maybeLeadOrCb === "function"
        ? maybeLeadOrCb
        : typeof maybeCb === "function"
        ? maybeCb
        : null;

    const top1 = result && result.top1 ? result.top1 : null;
    const top2 = result && result.top2 ? result.top2 : null;

    const key1 = mapWinnerNameToMetaKey(top1);
    const key2 = top2 ? mapWinnerNameToMetaKey(top2) : null;

    const ac1 = key1 ? ACADEMY_META[key1] : null;
    const ac2 = key2 ? ACADEMY_META[key2] : null;

    const bullets1 = top1 ? getBulletsFor(top1) : [];
    const bullets2 = top2 ? getBulletsFor(top2) : [];

    const modal = document.createElement("div");
    modal.className = "qr-modal";

    const card = document.createElement("div");
    card.className = "qr-card qr-card--ceremony";

    const single = !!ac1 && !ac2;
    const mainClass = single
      ? "qr-ceremony-main qr-ceremony-main--single"
      : "qr-ceremony-main qr-ceremony-main--double";

    let rolesHtml = "";
    if (ac1) {
      rolesHtml += `<div class="qr-ceremony-role">${ac1.role}</div>`;
    }
    if (ac2 && ac2.role !== ac1.role) {
      rolesHtml += `<div class="qr-ceremony-role">${ac2.role}</div>`;
    }

    function academyBlock(ac, title, bullets, extraClass) {
      if (!ac) return "";
      const safeTitle = title || ac.label;
      const bulletsHtml = bullets.map((b) => `<li>${b}</li>`).join("") || "";
      return `
        <div class="qr-ceremony-item ${extraClass || ""}">
          <img src="${ASSETS}img/logos/${
        ac.logo
      }" alt="${safeTitle}" class="qr-ceremony-logo" />
          <div class="qr-ceremony-academy">${safeTitle}</div>
          ${
            bulletsHtml
              ? `<ul class="qr-ceremony-bullets">${bulletsHtml}</ul>`
              : ""
          }
        </div>
      `;
    }

    let mainHtml = "";
    if (single && ac1) {
      mainHtml = `
        <div class="${mainClass}">
          <div class="qr-ceremony-item">
            <img src="${ASSETS}img/copa.png" alt="" class="qr-ceremony-cup" />
          </div>
          ${academyBlock(ac1, top1 || ac1.label, bullets1, "")}
          <div class="qr-ceremony-item">
            <img src="${ASSETS}img/copa.png" alt="" class="qr-ceremony-cup" />
          </div>
        </div>
      `;
    } else if (ac1 && ac2) {
      mainHtml = `
        <div class="${mainClass}">
          ${academyBlock(ac1, top1 || ac1.label, bullets1, "")}
          <div class="qr-ceremony-item">
            <img src="${ASSETS}img/copa.png" alt="" class="qr-ceremony-cup" />
          </div>
          ${academyBlock(ac2, top2 || ac2.label, bullets2, "")}
        </div>
      `;
    } else if (ac1) {
      mainHtml = `
        <div class="${mainClass}">
          ${academyBlock(ac1, top1 || ac1.label, bullets1, "")}
        </div>
      `;
    } else {
      mainHtml = `
        <div class="${mainClass}">
          <p>No se ha podido determinar una academia.</p>
        </div>
      `;
    }

    let leadHtml = "";
    if (leadData && (leadData.name || leadData.email || leadData.phone)) {
      leadHtml = `
        <div class="qr-ceremony-roles">
          ${
            leadData.name
              ? `<div class="qr-ceremony-academy">Alumno: ${leadData.name}</div>`
              : ""
          }
          ${
            leadData.email
              ? `<div class="qr-ceremony-academy">Email: ${leadData.email}</div>`
              : ""
          }
          ${
            leadData.phone
              ? `<div class="qr-ceremony-academy">Teléfono: ${leadData.phone}</div>`
              : ""
          }
        </div>
      `;
    }

    card.innerHTML = `
      <h3 class="qr-ceremony-title">CEREMONIA DE ASIGNACIÓN</h3>
      <div class="qr-ceremony-roles">
        ${rolesHtml}
      </div>
      ${leadHtml}
      ${mainHtml}
      <div class="qr-ceremony-actions">
        <button class="qr-ceremony-restart" type="button" aria-label="Volver a jugar">
          <img src="${ASSETS}img/buttons/restart.png" alt="Volver a jugar" />
        </button>
      </div>
    `;

    modal.appendChild(card);
    (document.querySelector("#qr-stage #qr-modal-root") || root).appendChild(
      modal
    );
    markStageModalOpen(true);
    emit("qr:modal:open");

    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.9));
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

    const restartBtn = card.querySelector(".qr-ceremony-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        if (window.QRAudio) window.QRAudio.playDoor();
        close();
        onRestart && onRestart();
      });
    }
  }

  /* =========================
   *  EXPORTAR API UI
   * ========================= */
  window.QRUI = {
    startModal,
    selectHeroModal,
    questionModal,
    formModal,
    endingModal,
  };
})();
