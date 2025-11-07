// assets/js/ui.js
(function () {
  // Los modales cuelgan del STAGE para integrarse y escalar con él
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
  function emit(name) {
    window.dispatchEvent(new CustomEvent(name));
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

  // Bloqueo de scroll con ESPACIO cuando estás dentro de la app/modales
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

  // Escalado de tarjeta para que NUNCA se corte (por ancho y por alto)
  function fitCardToStage(card, minScale = 0.8) {
    if (!card || !stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    // margen visual dentro del stage
    const padW = 16,
      padH = 16;
    const availW = Math.max(1, stageRect.width - padW);
    const availH = Math.max(1, stageRect.height - padH);

    // Reset para medir tamaño natural
    card.style.transform = "none";
    card.style.transformOrigin = "center center";
    card.style.willChange = "transform";

    const rect = card.getBoundingClientRect();
    const scaleW = availW / Math.max(1, rect.width);
    const scaleH = availH / Math.max(1, rect.height);
    const scale = Math.min(1, Math.max(minScale, Math.min(scaleW, scaleH)));

    if (scale < 1) {
      card.style.transform = `scale(${scale})`;
    }
  }

  /* ===== Menú de inicio ===== */
  function startModal(onPlay) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card qr-card--start";

    const mobile = isMobile();
    const desktopList = `
      <ul class="qr-startlist">
        <li>Mueve al personaje con ← → / A D.</li>
        <li>Salta y doble salto con ↑ / W / Espacio.</li>
        <li>Acércate a la Puerta 1 para empezar.</li>
        <li>Completa las 8 para tu recomendación.</li>
      </ul>`;
    const mobileList = `
      <ul class="qr-startlist">
        <li>Al pulsar Jugar se abrirá en horizontal.</li>
        <li>Usa los botones táctiles para moverte/saltar.</li>
        <li>Ve hasta la Puerta 1 para empezar.</li>
        <li>Completa las 8 y verás tu resultado.</li>
      </ul>`;

    card.innerHTML = `
      <h3 class="qr-title">🎮 Misión Futuro</h3>
      <p class="qr-lead"><strong>Tu futuro empieza hoy.</strong></p>
      ${mobile ? mobileList : desktopList}
      <div class="qr-start-actions">
        <button class="qr-btn" id="qrStartBtn">Jugar</button>
      </div>
    `;

    modal.appendChild(card);
    root.appendChild(modal);
    markStageModalOpen(true);
    emit("qr:modal:open");

    // Ajuste inicial y en cambios de viewport/orientación
    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.78));
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

    const cleanup = () => {
      window.removeEventListener("keydown", keyHandler);
      close();
    };

    // 🔒 En móvil: solicitar pantalla completa INMEDIATAMENTE con el gesto
    async function requestFSNow() {
      if (!isMobile()) return;
      try {
        if (!document.fullscreenElement && appEl && appEl.requestFullscreen) {
          await appEl.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (_) {
        /* iOS puede rechazar; QRFS volverá a intentarlo */
      }
    }

    const start = async () => {
      await requestFSNow(); // intenta FS ya aquí (gesto del usuario)
      cleanup();
      onPlay && onPlay(); // bootstrap también llamará a FS + lock landscape
    };

    const keyHandler = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "enter" || k === " ") {
        e.preventDefault();
        start();
      }
    };
    document.getElementById("qrStartBtn").addEventListener("click", start);
    window.addEventListener("keydown", keyHandler);
  }

  /* ===== Selección de personaje ===== */
  function selectHeroModal(maleUrl, femaleUrl, onSelect) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card qr-card--select";

    card.innerHTML = `
      <h3 class="qr-title">Elige tu personaje</h3>
      <div class="qr-select" role="listbox" aria-label="Elige personaje">
        <button class="qr-select__item" id="selMale"  aria-label="Hombre">
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
    root.appendChild(modal);
    markStageModalOpen(true);
    emit("qr:modal:open");

    // SFX al abrir selección
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

    // Accesibilidad teclado
    const items = card.querySelectorAll(".qr-select__item");
    let idx = 0;
    items[idx].focus();
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

  /* ===== Modal de pregunta ===== */
  function questionModal(qObj, onAnswer) {
    if (document.querySelector("#qr-stage .qr-modal")) return;
    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card";

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
    root.appendChild(modal);
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

  /* ===== Modal de formulario (ya lo tenías ajustado antes) ===== */
  function formModal(onSubmit) {
    if (document.querySelector("#qr-stage .qr-modal")) return;

    // Reutilizamos tu plantilla previa (ya compactada) — omitida aquí por brevedad:
    // ... (tu versión actual con el enlace a Política y validación)
    // Solo añadimos el refit por si acaso.

    // --- INICIO BLOQUE ORIGINAL (abreviado) ---
    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card qr-card--form";

    card.innerHTML = `
      <form id="qrLeadForm" novalidate>
        <h3 class="qr-title">📩 Tus datos</h3>
        <div class="qr-row">
          <label for="fName">Nombre</label>
          <input class="qr-input" id="fName" type="text" placeholder="Nombre" maxlength="99" autocomplete="name">
          <div class="qr-error" id="errName"></div>
        </div>
        <div class="qr-row">
          <label for="fEmail">Email</label>
          <input class="qr-input" id="fEmail" type="email" placeholder="Email" autocomplete="email" inputmode="email">
          <div class="qr-error" id="errEmail"></div>
        </div>
        <div class="qr-row">
          <label for="fPhone">Teléfono</label>
          <input class="qr-input" id="fPhone" type="tel" placeholder="Teléfono" inputmode="numeric" autocomplete="tel" pattern="\\d*">
          <div class="qr-error" id="errPhone"></div>
        </div>
        <div class="qr-row qr-consent">
          <label for="fConsent">
            <input id="fConsent" type="checkbox">
            Acepto la <a id="policyLink" class="qr-link" href="https://versuselearning.com/politica-de-privacidad/" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
          </label>
          <div class="qr-error" id="errConsent"></div>
        </div>
        <div class="qr-start-actions">
          <button class="qr-btn" id="btnSend" type="submit">Enviar</button>
        </div>
      </form>
    `;

    modal.appendChild(card);
    root.appendChild(modal);
    markStageModalOpen(true);
    emit("qr:modal:open");

    const policyLink = card.querySelector("#policyLink");
    if (policyLink)
      policyLink.addEventListener("click", (e) => e.stopPropagation());

    // Validación: mantén tu implementación actual aquí (omitida por brevedad)

    // --- FIN BLOQUE ORIGINAL (abreviado) ---

    const refit = () => requestAnimationFrame(() => fitCardToStage(card, 0.82));
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

    // Aquí iría tu onSubmit con fetch/lead; lo mantienes igual
    const form = card.querySelector("#qrLeadForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // valida, cierra y llama onSubmit(...) como ya tenías
      close();
      onSubmit &&
        onSubmit({
          /* ...tus campos... */
        });
    });
  }

  window.QRUI = {
    startModal,
    selectHeroModal,
    questionModal,
    formModal,
    endingModal: function (result, onRestart) {
      // Tu ending original (sin cambios). Lo dejamos como estaba.
      const { top1, top2, bullets } = result;
      const modal = document.createElement("div");
      modal.className = "qr-modal";
      const card = document.createElement("div");
      card.className = "qr-card qr-end";
      card.innerHTML = `
        <h3 class="qr-title">🎖 Ceremonia de Asignación</h3>
        <p class="qr-end-lead"><strong>Tu perfil ideal:</strong> ${top1}</p>
        <div class="qr-end-badges">
          <div class="qr-badge">${top1}</div>
          ${
            top2
              ? `<div class="qr-badge">También encajas en: ${top2}</div>`
              : ""
          }
        </div>
        <ul class="qr-end-list">
          ${bullets.map((b) => `<li>${b}</li>`).join("")}
        </ul>
        <div class="qr-end-actions">
          <button class="qr-btn" id="btnRestart">Reiniciar</button>
        </div>
      `;
      modal.appendChild(card);
      root.appendChild(modal);
      markStageModalOpen(true);
      document
        .getElementById("btnRestart")
        .addEventListener("click", onRestart);
      emit("qr:modal:open");
      const refit = () =>
        requestAnimationFrame(() => fitCardToStage(card, 0.85));
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
    },
    close,
  };
})();
