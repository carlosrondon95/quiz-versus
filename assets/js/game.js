// assets/js/game.js
(function () {
  const { createLoop, Keys } = window.MicroLoop;
  const { QUESTIONS, freshScore, applyScoring, winner, bullets } =
    window.QRData;
  const { questionModal, formModal, endingModal } = window.QRUI;

  const BRAND = {
    dark: "#9a794a",
    light: "#d09e55",
    gDark: "#706f6f",
    gLite: "#9d9d9c",
    black: "#000000",
  };

  // Utilidades
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (min, max) => Math.random() * (max - min) + min;

  class QRGame {
    constructor(canvas, hudBadge, assets, pad) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;

      this.hudBadge = hudBadge;
      this.assets = assets || {}; // { hero:{...}, fondo, puerta, copa, obstaculo, deco:{...} }
      this.pad = pad || { left: false, right: false, onJump: () => {} };

      // Tamaño lógico de render (no tocar)
      this.W = this.cv.width;
      this.H = this.cv.height;

      // Suelo
      this.groundY = this.H - 64; // referencia visual
      this.footY = this.groundY - 8; // cota donde apoya el héroe y la base de puertas

      // Estaciones / recorrido (↑ más separación)
      this.stations = 8;
      this.spacing = 520; // antes 360 → más recorrido
      this.startX = 60;
      this.portalX = Array.from(
        { length: this.stations },
        (_, i) => this.startX + i * this.spacing
      );

      // Progreso
      this.step = 0;
      this.answers = [];
      this.score = freshScore();

      // Físicas
      this.gravity = 1800;
      this.jumpSpeed = 600;
      this.maxJumps = 2;
      this.jumpCount = 0;
      this.coyoteTime = 0.08;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0.12;
      this.jumpBufferT = 0;

      // Héroe (y = coordenada del pie)
      this.hero = {
        x: this.startX - 140,
        y: this.footY,
        w: 42,
        h: 42,
        dx: 0,
        vy: 0,
      };

      // Anim
      this.anim = { facing: 1, walkTimer: 0, frameDur: 0.12 };

      // Cámara
      this.camX = 0;

      // Obstáculos
      this.obstacles = this.createObstacles();

      // Decorativos (screen-space)
      this.flyers = [];
      this.flyTimer = 0;

      // Bucle
      this.loop = createLoop(this.update.bind(this), this.render.bind(this));

      // Input salto
      this.onKeyDown = (e) => {
        const code = e.code || e.key;
        const isScrollKey =
          code === "Space" ||
          code === "ArrowUp" ||
          code === "ArrowDown" ||
          e.key === " " ||
          code === "Spacebar";
        if (isScrollKey && !this.isTypingTarget(e.target)) e.preventDefault();
        if (code === "Space" || code === "ArrowUp" || code === "KeyW")
          this.queueJump();
      };
      window.addEventListener("keydown", this.onKeyDown, { passive: false });

      if (this.hudBadge) this.hudBadge.textContent = `1 / ${this.stations}`;
    }

    isTypingTarget(el) {
      if (!el) return false;
      const t = (el.tagName || "").toLowerCase();
      return (
        t === "input" ||
        t === "textarea" ||
        t === "select" ||
        el.isContentEditable === true
      );
    }

    queueJump() {
      this.jumpBufferT = this.jumpBuffer;
    }
    start() {
      this.loop.start();
    }
    stop() {
      this.loop.stop();
    }
    onGround() {
      return this.hero.y >= this.footY - 0.5;
    }

    /* ============ Obstáculos ============ */
    createObstacles() {
      const list = [];
      const img = this.assets.obstaculo;
      if (!img) return list;

      // Dimensiones base (escaladas por altura “objetivo”)
      const baseH = 28; // bloque suelo
      const stepH = 26; // bloque elevado
      const scaleBase = baseH / img.height;
      const scaleStep = stepH / img.height;
      const baseW = Math.max(16, Math.round(img.width * scaleBase));
      const stepW = Math.max(16, Math.round(img.width * scaleStep));

      for (let i = 0; i < this.stations - 1; i++) {
        // Saltamos el primer tramo a veces para no molestar al inicio
        if (i === 0 && Math.random() < 0.4) continue;

        // 70% de prob de poner “algo” en el tramo
        if (Math.random() < 0.7) {
          const x1 = this.portalX[i],
            x2 = this.portalX[i + 1];
          const leftSafe = x1 + 80;
          const rightSafe = x2 - 80;
          const span = Math.max(120, rightSafe - leftSafe);

          // 50%: single bajo | 50%: combo escalón (suelo + elevado a la derecha)
          if (Math.random() < 0.5) {
            const cx = leftSafe + rand(span * 0.25, span * 0.75);
            list.push({
              x: cx,
              w: baseW,
              h: baseH,
              yBottom: this.footY, // en el suelo
            });
          } else {
            // Bloque suelo
            const cx = leftSafe + rand(span * 0.2, span * 0.55);
            list.push({
              x: cx,
              w: baseW,
              h: baseH,
              yBottom: this.footY,
            });
            // Bloque elevado a la derecha (subir o saltar)
            const gap = 16 + rand(0, 12);
            const raise = 22 + rand(0, 10); // altura elevación
            const cx2 = cx + baseW + gap;
            list.push({
              x: cx2,
              w: stepW,
              h: stepH,
              yBottom: this.footY - raise, // elevado
            });
          }
        }
      }
      return list;
    }

    resolveObstacles(prevX, prevY) {
      if (!this.obstacles.length) return;

      const hero = this.hero;
      const leftH = hero.x - hero.w / 2;
      const rightH = hero.x + hero.w / 2;
      const topH = hero.y - hero.h;
      const bottomH = hero.y;

      for (const o of this.obstacles) {
        const topO = o.yBottom - o.h;
        const bottomO = o.yBottom;
        const leftO = o.x - o.w / 2;
        const rightO = o.x + o.w / 2;

        const overlapX = leftH < rightO && rightH > leftO;
        const overlapY = topH < bottomO && bottomH > topO;
        if (!overlapX || !overlapY) continue;

        // Aterrizaje desde arriba en la “plataforma”
        const wasAbove = prevY <= topO && hero.vy >= 0;
        if (wasAbove && rightH > leftO && leftH < rightO) {
          hero.y = topO; // pies en la plataforma
          hero.vy = 0;
          this.jumpCount = 0;
          this.coyoteTimer = this.coyoteTime;
          continue;
        }

        // Choque lateral: empujar fuera con mínima traslación
        const penLeft = rightH - leftO;
        const penRight = rightO - leftH;
        if (penLeft < penRight) {
          hero.x -= penLeft;
          hero.dx = Math.min(0, hero.dx);
        } else {
          hero.x += penRight;
          hero.dx = Math.max(0, hero.dx);
        }
      }
    }

    /* ============ Decorativos (cielo) ============ */
    hasActive(type) {
      return this.flyers.some((f) => f.type === type);
    }

    pickFlyerType() {
      // Pesos base (pájaros algo menos frecuentes)
      const weights = [];
      const add = (type, w) => weights.push({ type, w });

      // Unicidad: cometa/nave/marciano máx 1
      if (!this.hasActive("cometa")) add("cometa", 0.2);
      if (!this.hasActive("nave")) add("nave", 0.25);
      if (!this.hasActive("marciano")) add("marciano", 0.25);

      // Pájaros (pueden repetirse, pero “un poco” menos)
      add("pajaro1", 0.15);
      add("pajaro2", 0.15);

      const total = weights.reduce((s, it) => s + it.w, 0);
      if (total <= 0) return null;

      let r = Math.random() * total;
      for (const it of weights) {
        if ((r -= it.w) <= 0) return it.type;
      }
      return weights[weights.length - 1].type;
    }

    spawnFlyer() {
      if (!this.assets.deco) return;
      const type = this.pickFlyerType();
      if (!type) {
        this.flyTimer = rand(1.6, 2.8);
        return;
      }

      const img = this.assets.deco[type];
      if (!img) {
        this.flyTimer = rand(1.6, 2.8);
        return;
      }

      // Dirección y cinemática por tipo
      if (type === "cometa") {
        // Súper rápido, diagonal descendente
        const dir = Math.random() < 0.5 ? 1 : -1;
        const speed = rand(280, 420);
        const vx = speed * (dir === 1 ? 1 : -1);
        const vy = speed * rand(0.45, 0.75); // caída
        const y0 = rand(-30, 40); // entra por arriba
        const x0 = dir === 1 ? -img.width - 30 : this.W + 30;
        this.flyers.push({
          type,
          img,
          x: x0,
          y: y0,
          vx,
          vy,
          // sin bobbing
        });
        this.flyTimer = rand(2.2, 3.8); // no muy frecuentes
        return;
      }

      if (type === "marciano" || type === "nave") {
        // Más rápidos que pájaros, con ligera ondulación
        const dir = Math.random() < 0.5 ? 1 : -1;
        const speed = rand(140, 220) * (dir === 1 ? 1 : -1);
        const y = rand(this.H * 0.18, this.H * 0.45);
        const x = dir === 1 ? -img.width - 20 : this.W + 20;
        this.flyers.push({
          type,
          img,
          x,
          y,
          baseY: y,
          dir,
          t: 0,
          amp: rand(3, 7),
          freq: rand(0.9, 1.8),
          speed,
        });
        this.flyTimer = rand(1.4, 2.4);
        return;
      }

      // Pájaros: algo más lentos y menos frecuentes
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = rand(35, 60) * (dir === 1 ? 1 : -1);
      const y = rand(20, this.H * 0.4);
      const x = dir === 1 ? -img.width - 20 : this.W + 20;
      this.flyers.push({
        type,
        img,
        x,
        y,
        baseY: y,
        dir,
        t: 0,
        amp: rand(4, 10),
        freq: rand(0.8, 1.6),
        speed,
      });

      // Aumenta un poco el tiempo al siguiente spawn para reducir densidad de pájaros
      this.flyTimer = rand(1.8, 3.2);
    }

    /* ============ Update loop ============ */
    update(dt) {
      const goRight =
        Keys.isDown("ArrowRight") || Keys.isDown("KeyD") || !!this.pad.right;
      const goLeft =
        Keys.isDown("ArrowLeft") || Keys.isDown("KeyA") || !!this.pad.left;

      const prevX = this.hero.x;
      const prevY = this.hero.y;

      // Aceleración horizontal
      if (goRight) this.hero.dx += 0.8;
      if (goLeft) this.hero.dx -= 0.7;

      // Rozamiento
      this.hero.dx *= 0.9;
      const MAX_SPEED = 7;
      this.hero.dx = clamp(this.hero.dx, -MAX_SPEED, MAX_SPEED);

      // Avance horizontal
      this.hero.x += this.hero.dx;

      // Intento de salto buffered
      if (this.jumpBufferT > 0) {
        if (this.tryJump()) this.jumpBufferT = 0;
      }

      // Gravedad
      this.hero.vy += this.gravity * dt;
      this.hero.y += this.hero.vy * dt;

      // Colisiones con obstáculos (antes del suelo general)
      this.resolveObstacles(prevX, prevY);

      // Suelo general
      if (this.hero.y > this.footY) {
        this.hero.y = this.footY;
        this.hero.vy = 0;
        this.jumpCount = 0;
        this.coyoteTimer = this.coyoteTime;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      this.jumpBufferT = Math.max(0, this.jumpBufferT - dt);

      // Cámara
      const targetCam = this.hero.x - this.W / 2;
      this.camX += (targetCam - this.camX) * 0.07;

      // Animación facing y caminar
      if (goRight && !goLeft) this.anim.facing = 1;
      else if (goLeft && !goRight) this.anim.facing = -1;

      const movingOnGround = Math.abs(this.hero.dx) > 0.35 && this.onGround();
      this.anim.walkTimer = movingOnGround ? this.anim.walkTimer + dt : 0;

      // Trigger estación actual
      const px = this.portalX[this.step];
      if (Math.abs(this.hero.x - px) < 36 && this.onGround()) {
        this.hero.dx = 0;
        this.stop();

        const qObj = QUESTIONS[this.step];

        if (qObj.id === "form") {
          formModal(async ({ name, email, phone, consent }) => {
            try {
              const payload = new URLSearchParams();
              payload.append("action", "qr_send_lead");
              payload.append("nonce", qrAjax.nonce);
              payload.append("name", name);
              payload.append("email", email);
              payload.append("phone", phone);
              payload.append("consent", consent);
              payload.append("answers", JSON.stringify(this.answers));

              const r = await fetch(qrAjax.ajax_url, {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: payload.toString(),
                credentials: "same-origin",
              });

              let data = null;
              try {
                data = await r.json();
              } catch (e) {}

              if (!r.ok || !data || data.success !== true) {
                const msg =
                  data && data.data && data.data.message
                    ? data.data.message
                    : "No se pudo enviar el correo.";
                alert(msg);
                this.start();
                return;
              }

              this.finish();
            } catch (e) {
              alert("Error de red. Inténtalo de nuevo.");
              this.start();
            }
          });
          return;
        }

        questionModal(qObj, (opt) => {
          const choice = { id: qObj.id, q: qObj.q, value: opt };
          this.answers.push(choice);
          applyScoring(this.score, choice);

          this.step++;
          if (this.hudBadge)
            this.hudBadge.textContent = `${Math.min(
              this.step + 1,
              this.stations
            )} / ${this.stations}`;

          this.start();
          this.hero.dx = 1.2;
        });
      }

      // ===== Decorativos: spawn & update =====
      this.flyTimer -= dt;
      if (this.flyTimer <= 0) this.spawnFlyer();

      for (let i = this.flyers.length - 1; i >= 0; i--) {
        const f = this.flyers[i];

        if (f.vx !== undefined) {
          // Cometa: movimiento rectilíneo
          f.x += f.vx * dt;
          f.y += f.vy * dt;
        } else {
          // Otros: desplazamiento horizontal + bobbing
          f.t += dt;
          f.x += f.speed * dt;
          f.y = f.baseY + Math.sin(f.t * f.freq) * f.amp;
        }

        // Salida de pantalla: limpiar
        if (f.type === "cometa") {
          if (f.y > this.H + 60 || f.x < -60 || f.x > this.W + 60)
            this.flyers.splice(i, 1);
        } else {
          if (f.dir === 1 && f.x > this.W + 60) this.flyers.splice(i, 1);
          else if (f.dir === -1 && f.x < -60) this.flyers.splice(i, 1);
        }
      }
    }

    tryJump() {
      const canGroundJump = this.onGround() || this.coyoteTimer > 0;
      const canAirJump = this.jumpCount < this.maxJumps;
      if (canGroundJump || canAirJump) {
        this.hero.vy = -this.jumpSpeed;
        if (this.onGround() || this.coyoteTimer > 0) this.jumpCount = 1;
        else this.jumpCount++;
        this.coyoteTimer = 0;
        return true;
      }
      return false;
    }

    finish() {
      const win = winner(this.score);
      endingModal(
        { top1: win.top1, top2: win.top2, bullets: bullets(win.top1) },
        () => location.reload()
      );
    }

    /* ============ Render ============ */
    render() {
      const ctx = this.ctx,
        W = this.W,
        H = this.H;
      const yBottom = this.footY;

      // Fondo con parallax
      if (this.assets.fondo) {
        const bg = this.assets.fondo;
        const iw = bg.width,
          ih = bg.height;
        const scale = H / ih;
        const drawW = Math.ceil(iw * scale);
        const offset = -Math.floor(this.camX * 0.4) % drawW;
        for (let x = offset - drawW; x < W + drawW; x += drawW) {
          ctx.drawImage(bg, x, 0, drawW, H);
        }
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#f3f3f3");
        g.addColorStop(1, "#ffffff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // Decorativos screen-space
      if (this.flyers.length) {
        ctx.save();
        for (const f of this.flyers) {
          if (!f.img) continue;
          ctx.drawImage(f.img, Math.round(f.x), Math.round(f.y));
        }
        ctx.restore();
      }

      // Mundo
      ctx.save();
      ctx.translate(-this.camX, 0);

      // Puertas 1..7 y trofeo en 8 (más grande)
      const DOOR_H = 80;
      const TROPHY_H = 120; // ↑ tamaño del trofeo
      for (let i = 0; i < this.stations; i++) {
        const x = this.portalX[i];
        const isLast = i === this.stations - 1;

        let img = null,
          targetH = DOOR_H;
        if (isLast && this.assets.copa) {
          img = this.assets.copa;
          targetH = TROPHY_H;
        } else if (this.assets.puerta) {
          img = this.assets.puerta;
          targetH = DOOR_H;
        }

        if (img) {
          const scale = targetH / img.height;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const yTop = yBottom - h;

          // Gris para puertas inactivas (futuras)
          const inactive = !isLast && i > this.step;
          if (inactive && "filter" in ctx) {
            ctx.save();
            ctx.filter = "grayscale(100%) brightness(0.85) contrast(1.1)";
            ctx.drawImage(img, x - w / 2, yTop, w, h);
            ctx.restore();
          } else {
            ctx.drawImage(img, x - w / 2, yTop, w, h);
          }

          // Número (solo puertas)
          if (!isLast) {
            ctx.fillStyle = BRAND.gDark;
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = "center";
            ctx.fillText(String(i + 1), x, yTop - 8);
          }
        } else {
          // Fallback minimalista
          const h = isLast ? TROPHY_H : DOOR_H;
          const w = isLast ? 56 : 48;
          const yTop = yBottom - h;
          ctx.fillStyle = i <= this.step || isLast ? BRAND.light : BRAND.gLite;
          ctx.fillRect(x - w / 2, yTop, w, h);
          ctx.lineWidth = 6;
          ctx.strokeStyle = BRAND.gDark;
          ctx.strokeRect(x - w / 2, yTop, w, h);
          if (!isLast) {
            ctx.fillStyle = BRAND.gDark;
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = "center";
            ctx.fillText(String(i + 1), x, yTop - 8);
          }
        }
      }

      // Obstáculos
      if (this.obstacles.length) {
        const img = this.assets.obstaculo;
        for (const o of this.obstacles) {
          const left = o.x - o.w / 2;
          const top = o.yBottom - o.h;
          if (img)
            ctx.drawImage(img, Math.round(left), Math.round(top), o.w, o.h);
          else {
            ctx.fillStyle = "#6b6b6b";
            ctx.fillRect(Math.round(left), Math.round(top), o.w, o.h);
            ctx.strokeStyle = "#444";
            ctx.strokeRect(Math.round(left), Math.round(top), o.w, o.h);
          }
        }
      }

      // Sombra del héroe
      {
        const lift = Math.max(0, yBottom - this.hero.y);
        const maxLift = 120;
        const t = Math.min(1, lift / maxLift);
        const sx = 26 * (1 - 0.6 * t);
        const sy = 8 * (1 - 0.7 * t);
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(
          this.hero.x,
          yBottom + 6,
          Math.max(8, sx),
          Math.max(3, sy),
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = BRAND.black;
        ctx.fill();
        ctx.restore();
      }

      // Héroe
      ctx.save();
      ctx.translate(this.hero.x, this.hero.y);

      const hasHeroSprites =
        this.assets.hero &&
        this.assets.hero.idle &&
        this.assets.hero.stepR &&
        this.assets.hero.stepL &&
        this.assets.hero.jump;

      if (hasHeroSprites) {
        let sprite = this.assets.hero.idle;
        if (!this.onGround()) {
          sprite = this.assets.hero.jump;
        } else if (Math.abs(this.hero.dx) > 0.35) {
          const n = Math.floor(this.anim.walkTimer / this.anim.frameDur) % 2;
          sprite = n === 0 ? this.assets.hero.stepR : this.assets.hero.stepL;
        }
        if (this.anim.facing === -1) ctx.scale(-1, 1);
        const w = this.hero.w,
          h = this.hero.h;
        ctx.drawImage(sprite, -w / 2, -h, w, h);
      } else {
        ctx.fillStyle = BRAND.light;
        ctx.fillRect(-this.hero.w / 2, -this.hero.h, this.hero.w, this.hero.h);
        ctx.lineWidth = 3;
        ctx.strokeStyle = BRAND.gDark;
        ctx.strokeRect(
          -this.hero.w / 2,
          -this.hero.h,
          this.hero.w,
          this.hero.h
        );
        ctx.fillStyle = "#fff";
        ctx.fillRect(-10, -this.hero.h + 6, 20, 12);
      }

      ctx.restore(); // héroe
      ctx.restore(); // mundo
    }
  }

  window.QRGame = QRGame;
})();
