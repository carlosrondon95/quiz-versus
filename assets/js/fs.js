(function () {
  class QRFS {
    constructor(rootEl, stageEl, padEl) {
      this.root = rootEl;
      this.stage = stageEl;
      this.pad = padEl;
      this.isFS = false;
      this.btn = document.getElementById("qr-exit");
      this.rotate = document.getElementById("qr-rotate");

      if (this.btn) this.btn.addEventListener("click", () => this.exit());

      document.addEventListener("fullscreenchange", () => this._onChange());
      window.addEventListener("orientationchange", () =>
        this._applyModeClasses()
      );
      window.addEventListener("resize", () => this._applyModeClasses());
    }

    async enter() {
      try {
        if (this.root.requestFullscreen) {
          await this.root.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (e) {
        /* iOS u otros: seguimos con fallback */
      }

      // Intento bloquear a horizontal (Chrome Android y compatibles)
      await this._tryLockLandscape();

      // Fallback / modo unificado
      this.root.classList.add("qr-app--fs");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      if (this.stage) this.stage.classList.add("qr-stage--mobile");

      // Mostrar controles (la visibilidad final depende de orientación por CSS)
      if (this.pad) {
        this.pad.hidden = false;
        this.pad.setAttribute("aria-hidden", "false");
      }

      if (this.btn) this.btn.hidden = false;

      this.isFS = true;
      this._applyModeClasses();
      window.dispatchEvent(
        new CustomEvent("qr:fs:change", { detail: { isFS: true } })
      );
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    }

    async exit() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch (e) {}

      this.root.classList.remove("qr-app--fs", "is-portrait");
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
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    }

    _onChange() {
      const fs = !!document.fullscreenElement;
      if (!fs && this.isFS) {
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

      // Overlay "gira"
      if (this.rotate) {
        this.rotate.hidden = !portrait;
      }
    }

    async _tryLockLandscape() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape");
        }
      } catch (e) {
        // iOS Safari y otros: no soporta lock; el overlay avisará en portrait
      }
    }
  }

  window.QRFS = QRFS;
})();
