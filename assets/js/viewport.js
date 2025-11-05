(function () {
  class QRViewport {
    constructor(canvas, stage, pad) {
      this.canvas = canvas;
      this.stage = stage;
      this.pad = pad;
      this.baseW = canvas.width;
      this.baseH = canvas.height;

      this.mode = "portrait";
      this.layout = this.layout.bind(this);

      window.addEventListener("resize", this.layout);
      window.addEventListener("orientationchange", this.layout);
      window.addEventListener("qr:fs:change", this.layout);
      this.layout();
    }

    getOrientation() {
      return window.matchMedia("(orientation: portrait)").matches
        ? "portrait"
        : "landscape";
    }

    layout() {
      const mode = this.getOrientation();
      this.mode = mode;

      const isFS =
        document.fullscreenElement ||
        document.getElementById("qr-app")?.classList.contains("qr-app--fs");

      const ww = window.innerWidth;
      const vh =
        window.visualViewport && window.visualViewport.height
          ? window.visualViewport.height
          : window.innerHeight;

      // En FS-portrait restamos la barra de controles si está visible
      const padVisible = !!(this.pad && !this.pad.hasAttribute("hidden"));
      const padH =
        mode === "portrait" && isFS && padVisible
          ? this.pad.offsetHeight || 0
          : 0;

      const availW = ww - 16;
      const availH = vh - padH - 16;

      const scale = Math.min(availW / this.baseW, availH / this.baseH);

      const outW = Math.max(1, Math.floor(this.baseW * scale));
      const outH = Math.max(1, Math.floor(this.baseH * scale));

      // Ajusta stage y canvas (CSS)
      this.stage.style.height = Math.max(0, Math.floor(availH)) + "px";
      this.stage.style.minHeight =
        Math.max(0, Math.floor(this.baseH * Math.min(1, scale))) + "px";

      this.canvas.style.width = outW + "px";
      this.canvas.style.height = outH + "px";

      window.dispatchEvent(
        new CustomEvent("qr:viewport:change", {
          detail: { mode, scale, outW, outH, padH, isFS: !!isFS },
        })
      );
    }
  }

  window.QRViewport = QRViewport;
})();
