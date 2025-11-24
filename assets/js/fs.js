(function () {
  function isIOS() {
    return (
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function isStandalone() {
    // PWA / añadido a pantalla de inicio
    return (
      (window.matchMedia &&
        (window.matchMedia("(display-mode: fullscreen)").matches ||
          window.matchMedia("(display-mode: standalone)").matches)) ||
      window.navigator.standalone === true
    );
  }

  class QRFS {
    constructor(rootEl, stageEl, padEl) {
      this.root = rootEl;
      this.stage = stageEl;
      this.pad = padEl;
      this.isFS = false;
      this.btn = document.getElementById("qr-exit");
      this.rotate = document.getElementById("qr-rotate");
      this._isIOS = isIOS();
      this._isStandalone = isStandalone();

      if (this.btn) this.btn.addEventListener("click", () => this.exit());

      // Cambios de fullscreen estándar + webkit
      document.addEventListener("fullscreenchange", () => this._onChange());
      document.addEventListener("webkitfullscreenchange", () =>
        this._onChange()
      );

      window.addEventListener("orientationchange", () =>
        this._applyModeClasses()
      );
      window.addEventListener("resize", () => this._applyModeClasses());
    }

    async enter() {
      const root = this.root;
      if (!root) return;

      // 1) Intento máximo de fullscreen real
      try {
        if (root.requestFullscreen) {
          // Navegadores modernos (Android / algunos iOS recientes)
          await root.requestFullscreen({ navigationUI: "hide" });
        } else if (root.webkitRequestFullscreen) {
          // WebKit fallback
          root.webkitRequestFullscreen();
        }
      } catch (e) {
        // Silencio, seguimos con pseudo-FS
      }

      // 2) Intento de bloquear landscape (donde esté soportado)
      await this._tryLockLandscape();

      // 3) Modo "FS" visual unificado (Android + iOS)
      this.root.classList.add("qr-app--fs");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      if (this.stage) this.stage.classList.add("qr-stage--mobile");

      if (this.pad) {
        this.pad.hidden = false;
        this.pad.setAttribute("aria-hidden", "false");
      }

      if (this.btn) this.btn.hidden = false;

      this.isFS = true;

      // Ajustamos clases de orientación + tamaño viewport
      this._applyModeClasses();
      this._resizeRootToViewport();

      window.dispatchEvent(
        new CustomEvent("qr:fs:change", { detail: { isFS: true } })
      );

      // Reforzar después de pequeños reflows en móviles
      setTimeout(() => {
        this._resizeRootToViewport();
        window.dispatchEvent(new Event("resize"));
      }, 80);
    }

    async exit() {
      // 1) Salida de fullscreen real si lo hay
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (
          document.webkitFullscreenElement &&
          document.webkitExitFullscreen
        ) {
          document.webkitExitFullscreen();
        }
      } catch (e) {
        // ignoramos
      }

      // 2) Limpiamos modo "FS" visual
      if (this.root) {
        this.root.classList.remove("qr-app--fs", "is-portrait");
        this.root.style.width = "";
        this.root.style.height = "";
      }

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";

      if (this.stage) this.stage.classList.remove("qr-stage--mobile");

      if (this.pad) {
        this.pad.hidden = true;
        this.pad.setAttribute("aria-hidden", "true");
        this.pad.classList.remove("qr-pad--portrait", "qr-pad--landscape");
      }

      if (this.btn) this.btn.hidden = true;
      if (this.rotate) this.rotate.hidden = true;

      this.isFS = false;

      this._applyModeClasses();

      window.dispatchEvent(
        new CustomEvent("qr:fs:change", { detail: { isFS: false } })
      );

      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }

    _onChange() {
      const fsActive =
        !!document.fullscreenElement || !!document.webkitFullscreenElement;

      // Si el navegador ha salido de FS pero nosotros creemos que seguimos, reseteamos
      if (!fsActive && this.isFS) {
        this.exit();
      }
    }

    _applyModeClasses() {
      const portrait = window.matchMedia("(orientation: portrait)").matches;

      // Marca orientación en el botón salir
      if (this.btn) {
        this.btn.classList.toggle("qr-exit--portrait", portrait);
        this.btn.classList.toggle("qr-exit--landscape", !portrait);
      }

      // Marca orientación en el pad (posicionamiento/transparencias)
      if (this.pad && !this.pad.hidden) {
        this.pad.classList.toggle("qr-pad--portrait", portrait);
        this.pad.classList.toggle("qr-pad--landscape", !portrait);
      }

      // Estado en root para reglas de visibilidad
      if (this.root && this.root.classList.contains("qr-app--fs")) {
        this.root.classList.toggle("is-portrait", portrait);
      }

      // Overlay "gira": solo tiene sentido en FS
      if (this.rotate) {
        const shouldShowRotate =
          this.root && this.root.classList.contains("qr-app--fs") && portrait;
        this.rotate.hidden = !shouldShowRotate;
      }

      // En FS ajustamos siempre al viewport real (truco iOS)
      if (this.isFS) {
        this._resizeRootToViewport();
      }
    }

    _resizeRootToViewport() {
      if (!this.root) return;

      // En iOS Safari la barra de direcciones baila,
      // así que usamos innerWidth/innerHeight, que es lo más "real" que vamos a tener.
      const w = window.innerWidth || document.documentElement.clientWidth;
      const h = window.innerHeight || document.documentElement.clientHeight;

      this.root.style.width = w + "px";
      this.root.style.height = h + "px";
    }

    async _tryLockLandscape() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
          return;
        }
        const anyScreen = screen;
        const legacyLock =
          anyScreen.lockOrientation ||
          anyScreen.mozLockOrientation ||
          anyScreen.msLockOrientation;
        if (legacyLock) {
          legacyLock.call(anyScreen, "landscape");
        }
      } catch (e) {
        // iOS y otros no soportan lock; no pasa nada, el overlay "gira" se encargará
      }
    }
  }

  window.QRFS = QRFS;
})();
