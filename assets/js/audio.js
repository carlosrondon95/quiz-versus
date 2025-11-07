// assets/js/audio.js
(function () {
  function make(url, loop = false, vol = 1) {
    const a = new Audio(url);
    a.preload = "auto";
    a.loop = !!loop;
    a.volume = vol;
    a.playsInline = true; // iOS
    return a;
  }

  const QRAudio = {
    inited: false,
    base: "",
    music: {},
    sfx: {},
    wasPlaying: false,

    init(baseUrl) {
      if (this.inited) return;
      this.inited = true;
      this.base = (baseUrl || "/").replace(/\/?$/, "/");

      const root = this.base + "assets/audio/";
      const M = root + "music/";
      const S = root + "sfx/";

      // 🎵 Música
      this.music.musica = make(M + "musica.mp3", true, 0.5);
      this.music.victoria = make(M + "victoria.mp3", false, 0.9);

      // 🔔 SFX
      this.sfx.puerta = make(S + "puerta.mp3", false, 0.85);
      this.sfx.respuesta = make(S + "respuesta.mp3", false, 0.85);
      this.sfx.salto = make(S + "salto.mp3", false, 0.85);

      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) {
            this.wasPlaying = this.music.musica && !this.music.musica.paused;
            try {
              this.music.musica.pause();
            } catch (e) {}
          } else if (this.wasPlaying) {
            this.playMusic().catch(() => {});
          }
        },
        { passive: true }
      );
    },

    async playMusic() {
      if (!this.inited || !this.music.musica) return;
      const a = this.music.musica;
      try {
        if (a.paused) a.currentTime = 0;
        await a.play();
      } catch (e) {
        // Autoplay bloqueado: reintenta tras cualquier gesto
        this._armUnlock();
      }
    },

    stopMusic() {
      if (!this.inited || !this.music.musica) return;
      try {
        this.music.musica.pause();
      } catch (e) {}
    },

    _ping(aud) {
      if (!aud) return;
      try {
        const c = aud.cloneNode(true);
        c.volume = aud.volume;
        c.play().catch(() => {});
      } catch {}
    },

    playDoor() {
      this._ping(this.sfx.puerta);
    },
    playAnswer() {
      this._ping(this.sfx.respuesta);
    },
    playJump() {
      this._ping(this.sfx.salto);
    },
    playVictory() {
      this._ping(this.music.victoria);
    },

    _armUnlock() {
      const once = () => {
        this.playMusic().finally(() => {
          window.removeEventListener("pointerdown", once, true);
          window.removeEventListener("keydown", once, true);
          window.removeEventListener("touchstart", once, true);
        });
      };
      window.addEventListener("pointerdown", once, true);
      window.addEventListener("keydown", once, true);
      window.addEventListener("touchstart", once, true);
    },
  };

  window.QRAudio = QRAudio;
})();
