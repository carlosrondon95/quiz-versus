(function () {
  // El modal debe colgar de #qr-app para ser visible en Fullscreen
  let root = document.querySelector("#qr-app #qr-modal-root");
  if (!root) {
    const app = document.getElementById("qr-app");
    root = document.createElement("div");
    root.id = "qr-modal-root";
    if (app) app.appendChild(root);
  }

  function emit(name) {
    window.dispatchEvent(new CustomEvent(name));
  }

  function close() {
    const m = document.querySelector(".qr-modal");
    if (m) m.remove();
    emit("qr:modal:close");
  }

  function isMobile() {
    return document.body.classList.contains("is-mobile");
  }

  /* ===== Menú de inicio ===== */
  function startModal(onPlay) {
    if (document.querySelector(".qr-modal")) return;

    const mobile = isMobile();

    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card";

    const desktopList = `
      <ul class="qr-startlist">
        <li>Mueve al personaje con <span class="qr-startkbd">←</span> <span class="qr-startkbd">→</span> o <span class="qr-startkbd">A</span> <span class="qr-startkbd">D</span>.</li>
        <li><strong>Salta y doble salto</strong> con <span class="qr-startkbd">↑</span> / <span class="qr-startkbd">W</span> / <span class="qr-startkbd">Espacio</span>.</li>
        <li>Acércate a la <strong>Puerta 1</strong> para empezar el cuestionario.</li>
        <li>Responde las <strong>8 preguntas</strong> y recibe tu recomendación.</li>
      </ul>`;

    const mobileList = `
      <ul class="qr-startlist">
        <li>Al pulsar <strong>Jugar</strong> se abrirá en <strong>pantalla completa y horizontal</strong>.</li>
        <li>Usa los <strong>botones táctiles</strong>:
          <span class="qr-startkbd">←</span> <span class="qr-startkbd">→</span> para moverte y
          <span class="qr-startkbd">⤒</span> para saltar (doble toque = doble salto).
        </li>
        <li>Ve hasta la <strong>Puerta 1</strong> para empezar el cuestionario.</li>
        <li>Completa las <strong>8 preguntas</strong> para ver tu recomendación.</li>
      </ul>`;

    card.innerHTML = `
      <h3 class="qr-title">🎮 Quiz Versus</h3>
      <p class="qr-lead"><strong>Tu futuro empieza hoy.</strong> Descubre la oposición que mejor encaja contigo.</p>
      ${mobile ? mobileList : desktopList}
      <div class="qr-start-actions">
        <button class="qr-btn" id="qrStartBtn">Jugar</button>
      </div>
    `;

    modal.appendChild(card);
    root.appendChild(modal);

    const cleanup = () => {
      window.removeEventListener("keydown", keyHandler);
      close();
    };
    const start = () => {
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

    document.getElementById("qrStartBtn").addEventListener("click", start);
    window.addEventListener("keydown", keyHandler);

    emit("qr:modal:open");
  }

  /* ===== Modal de pregunta ===== */
  function questionModal(qObj, onAnswer) {
    if (document.querySelector(".qr-modal")) return;
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
        close();
        onAnswer && onAnswer(op);
      });
      opts.appendChild(b);
    });

    modal.appendChild(card);
    root.appendChild(modal);
    emit("qr:modal:open");
  }

  /* ===== Modal de formulario ===== */
  /* ===== Modal de formulario (con validación inline) ===== */
  function formModal(onSubmit) {
    if (document.querySelector(".qr-modal")) return;

    const modal = document.createElement("div");
    modal.className = "qr-modal";
    const card = document.createElement("div");
    card.className = "qr-card";

    card.innerHTML = `
    <form id="qrLeadForm" novalidate>
      <div class="qr-q">Déjanos tus datos y te enviaremos tu resultado</div>

      <div class="qr-row">
        <label for="fName">Nombre</label>
        <input class="qr-input" id="fName" type="text" placeholder="Introduzca su nombre" maxlength="99" autocomplete="name">
        <div class="qr-error" id="errName"></div>
      </div>

      <div class="qr-row">
        <label for="fEmail">Email</label>
        <input class="qr-input" id="fEmail" type="email" placeholder="Introduzca su dirección de correo electrónico" autocomplete="email" inputmode="email">
        <div class="qr-error" id="errEmail"></div>
      </div>

      <div class="qr-row">
        <label for="fPhone">Teléfono</label>
        <input class="qr-input" id="fPhone" type="tel" placeholder="Introduzca su número de teléfono" inputmode="numeric" autocomplete="tel" pattern="\\d*">
        <div class="qr-error" id="errPhone"></div>
      </div>

      <div class="qr-row qr-consent">
        <label><input id="fConsent" type="checkbox"> Acepto la Política de Privacidad</label>
        <div class="qr-error" id="errConsent"></div>
      </div>

      <button class="qr-btn" id="btnSend" type="submit">Enviar</button>
    </form>
  `;

    modal.appendChild(card);
    const root =
      document.querySelector("#qr-app #qr-modal-root") ||
      document.getElementById("qr-modal-root");
    root.appendChild(modal);

    const form = card.querySelector("#qrLeadForm");
    const nameI = card.querySelector("#fName");
    const mailI = card.querySelector("#fEmail");
    const phoneI = card.querySelector("#fPhone");
    const consI = card.querySelector("#fConsent");

    const errName = card.querySelector("#errName");
    const errEmail = card.querySelector("#errEmail");
    const errPhone = card.querySelector("#errPhone");
    const errCons = card.querySelector("#errConsent");

    // == Validadores ==
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
      if (!v) {
        setErr(nameI, errName, "El nombre es obligatorio.");
        return false;
      }
      if (v.length > 99) {
        setErr(nameI, errName, "Máximo 99 caracteres.");
        return false;
      }
      setErr(nameI, errName, "");
      return true;
    }

    function validateEmail() {
      const v = (mailI.value || "").trim();
      if (!v) {
        setErr(mailI, errEmail, "El email es obligatorio.");
        return false;
      }
      if (!emailRe.test(v)) {
        setErr(mailI, errEmail, "Introduce un email válido.");
        return false;
      }
      setErr(mailI, errEmail, "");
      return true;
    }

    // Solo números; longitud 9–15 (puedes ajustar si quieres)
    function sanitizePhone() {
      // Permite solo dígitos y el signo + al inicio
      let v = phoneI.value.replace(/[^\d+]/g, "");
      // Solo un '+' y solo al principio
      if (v.includes("+")) {
        v = "+" + v.replace(/[+]/g, "").replace(/[^\d]/g, "");
      }
      phoneI.value = v;
    }

    function validatePhone() {
      sanitizePhone();
      const v = phoneI.value.trim();

      if (!v) {
        setErr(phoneI, errPhone, "El teléfono es obligatorio.");
        return false;
      }

      // Detectar si tiene prefijo internacional
      const isIntl = v.startsWith("+");

      // España (sin +34)
      if (!isIntl) {
        if (!/^\d{9}$/.test(v)) {
          setErr(phoneI, errPhone, "Debe tener 9 dígitos si es español.");
          return false;
        }
      } else {
        // Internacional: + y al menos 8 dígitos tras el prefijo
        if (!/^\+\d{8,15}$/.test(v)) {
          setErr(phoneI, errPhone, "Formato internacional no válido (+XX...).");
          return false;
        }
      }

      setErr(phoneI, errPhone, "");
      return true;
    }

    function validateConsent() {
      if (!consI.checked) {
        setErr(consI, errCons, "Debes aceptar la Política de Privacidad.");
        return false;
      }
      setErr(consI, errCons, "");
      return true;
    }

    function validateAll() {
      const a = validateName();
      const b = validateEmail();
      const c = validatePhone();
      const d = validateConsent();
      return a && b && c && d;
    }

    // Live validation
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
        // Lleva el foco al primer error
        if (!validateName()) {
          nameI.focus();
          return;
        }
        if (!validateEmail()) {
          mailI.focus();
          return;
        }
        if (!validatePhone()) {
          phoneI.focus();
          return;
        }
        if (!validateConsent()) {
          consI.focus();
          return;
        }
        return;
      }

      // OK: cerramos modal y devolvemos datos a onSubmit
      if (window.QRUI && typeof window.QRUI.close === "function")
        window.QRUI.close();
      onSubmit &&
        onSubmit({
          name: nameI.value.trim(),
          email: mailI.value.trim(),
          phone: phoneI.value.trim(),
          consent: consI.checked ? "1" : "0",
        });
    });

    window.dispatchEvent(new CustomEvent("qr:modal:open"));
  }

  /* ===== Pantalla final ===== */
  function endingModal(result, onRestart) {
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
        ${top2 ? `<div class="qr-badge">También encajas en: ${top2}</div>` : ""}
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
    document.getElementById("btnRestart").addEventListener("click", onRestart);

    emit("qr:modal:open");
  }

  // Helpers
  function val(sel) {
    const n = document.querySelector(sel);
    return n ? n.value.trim() : "";
  }
  function checked(sel) {
    const n = document.querySelector(sel);
    return !!(n && n.checked);
  }

  window.QRUI = { startModal, questionModal, formModal, endingModal, close };
})();
