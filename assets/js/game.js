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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (min, max) => Math.random() * (max - min) + min;

  // 🧱 Config fáciles de tocar
  const WALL_GAP = 1200; // distancia de las murallas respecto a Puerta 1 / Trofeo
  const TOWER_BLOCKS = 14; // altura (en bloques) de las murallas verticales

  class QRGame {
    constructor(canvas, hudBadge, assets, pad) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;

      this.hudBadge = hudBadge;
      this.assets = assets || {};
      this.pad = pad || { left: false, right: false, onJump: () => {} };

      this.W = this.cv.width;
      this.H = this.cv.height;

      this.groundY = this.H - 64;
      this.footY = this.groundY - 8;

      // 🔢 Ahora el número de estaciones viene de las preguntas (11 puertas + 1 trofeo = 12)
      this.stations =
        window.QRData && Array.isArray(window.QRData.QUESTIONS)
          ? window.QRData.QUESTIONS.length
          : 12;

      this.spacing = 520;
      this.startX = 60;
      this.portalX = Array.from(
        { length: this.stations },
        (_, i) => this.startX + i * this.spacing
      );

      this.step = 0;
      this.answers = [];
      this.score = freshScore();

      this.gravity = 1800;
      this.jumpSpeed = 600;
      this.maxJumps = 2;
      this.jumpCount = 0;
      this.coyoteTime = 0.08;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0.12;
      this.jumpBufferT = 0;

      this.hero = {
        x: this.startX - 140,
        y: this.footY,
        w: 42,
        h: 42,
        dx: 0,
        vy: 0,
        dh: 58,
      };

      this.anim = { facing: 1, walkTimer: 0, frameDur: 0.12 };
      this.camX = 0;

      // Se definirán tras crear obstáculos (porque dependen del ancho del bloque)
      this.worldMinX = -Infinity;
      this.worldMaxX = +Infinity;

      this.obstacles = this.createObstacles();
      this.flyers = [];
      this.flyTimer = 0;

      // 🔒 Bloqueo temporal de input para evitar salto tras cerrar modal
      this.inputLockUntil = 0;

      this.loop = createLoop(this.update.bind(this), this.render.bind(this));

      this.onKeyDown = (e) => {
        const code = e.code || e.key;
        const isScrollKey =
          code === "Space" ||
          code === "Spacebar" ||
          code === "ArrowUp" ||
          code === "ArrowDown" ||
          e.key === " ";

        // ✅ Evita scroll SIEMPRE que no estés escribiendo, aunque haya modal
        if (isScrollKey && !this.isTypingTarget(e.target)) e.preventDefault();

        // Si hay modal o input bloqueado, no procesamos acciones del juego
        if (document.querySelector(".qr-modal")) return;
        if (this.isInputLocked()) return;

        if (code === "Space" || code === "ArrowUp" || code === "KeyW")
          this.queueJump();
      };
      window.addEventListener("keydown", this.onKeyDown, { passive: false });

      if (this.hudBadge) this.hudBadge.textContent = `1 / ${this.stations}`;
      // 📣 Notifica al HUD/UI el estado inicial
      window.dispatchEvent(
        new CustomEvent("qr:station", { detail: { index: 0 } })
      );
    }

    // === Utilidades input lock ===
    lockInput(ms = 220) {
      this.inputLockUntil = performance.now() + ms;
    }
    isInputLocked() {
      return performance.now() < this.inputLockUntil;
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
    _clearJumpInputs() {
      this.jumpBufferT = 0;
      const pressed =
        window.MicroLoop &&
        window.MicroLoop.Keys &&
        window.MicroLoop.Keys.pressed;
      if (pressed && pressed.delete) {
        pressed.delete("Space");
        pressed.delete(" ");
        pressed.delete("Spacebar");
        pressed.delete("ArrowUp");
        pressed.delete("KeyW");
      }
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

    createObstacles() {
      const list = [];
      const img = this.assets.obstaculo;
      if (!img) return list;

      const baseH = 28,
        stepH = 26;
      const scaleBase = baseH / img.height;
      const scaleStep = stepH / img.height;
      const baseW = Math.max(16, Math.round(img.width * scaleBase));
      const stepW = Math.max(16, Math.round(img.width * scaleStep));

      // Obstáculos normales entre puertas (aleatorios)
      for (let i = 0; i < this.stations - 1; i++) {
        if (i === 0 && Math.random() < 0.4) continue;
        if (Math.random() < 0.7) {
          const x1 = this.portalX[i],
            x2 = this.portalX[i + 1];
          const leftSafe = x1 + 80,
            rightSafe = x2 - 80;
          const span = Math.max(120, rightSafe - leftSafe);

          if (Math.random() < 0.5) {
            const cx = leftSafe + rand(span * 0.25, span * 0.75);
            list.push({ x: cx, w: baseW, h: baseH, yBottom: this.footY });
          } else {
            const cx = leftSafe + rand(span * 0.2, span * 0.55);
            list.push({ x: cx, w: baseW, h: baseH, yBottom: this.footY });
            const gap = 16 + rand(0, 12),
              raise = 22 + rand(0, 10);
            const cx2 = cx + baseW + gap;
            list.push({
              x: cx2,
              w: stepW,
              h: stepH,
              yBottom: this.footY - raise,
            });
          }
        }
      }

      // 🚧 Murallas verticales (mucho más altas y más lejos)
      const leftX = this.portalX[0] - WALL_GAP;
      const rightX = this.portalX[this.stations - 1] + WALL_GAP;

      const pushVerticalTower = (x) => {
        for (let i = 0; i < TOWER_BLOCKS; i++) {
          list.push({
            x,
            w: baseW,
            h: baseH,
            yBottom: this.footY - i * baseH, // pila vertical
          });
        }
      };
      pushVerticalTower(leftX);
      pushVerticalTower(rightX);

      // ⛔ Define límites duros del mundo alineados con las murallas
      this.worldMinX = leftX; // el centro del héroe no puede pasar de aquí
      this.worldMaxX = rightX;

      return list;
    }

    resolveObstacles(prevX, prevY) {
      if (!this.obstacles.length) return;

      const hero = this.hero;
      const leftH = hero.x - hero.w / 2,
        rightH = hero.x + hero.w / 2;
      const topH = hero.y - hero.h,
        bottomH = hero.y;

      for (const o of this.obstacles) {
        const topO = o.yBottom - o.h,
          bottomO = o.yBottom;
        const leftO = o.x - o.w / 2,
          rightO = o.x + o.w / 2;

        const overlapX = leftH < rightO && rightH > leftO;
        const overlapY = topH < bottomO && bottomH > topO;
        if (!overlapX || !overlapY) continue;

        const wasAbove = prevY <= topO && hero.vy >= 0;
        if (wasAbove && rightH > leftO && leftH < rightO) {
          hero.y = topO;
          hero.vy = 0;
          this.jumpCount = 0;
          this.coyoteTimer = this.coyoteTime;
          continue;
        }

        const penLeft = rightH - leftO,
          penRight = rightO - leftH;
        if (penLeft < penRight) {
          hero.x -= penLeft;
          hero.dx = Math.min(0, hero.dx);
        } else {
          hero.x += penRight;
          hero.dx = Math.max(0, hero.dx);
        }
      }
    }

    hasActive(type) {
      return this.flyers.some((f) => f.type === type);
    }
    pickFlyerType() {
      const pool = [];
      const add = (type, w) => pool.push({ type, w });
      if (!this.hasActive("cometa")) add("cometa", 0.22);
      if (!this.hasActive("nave")) add("nave", 0.24);
      if (!this.hasActive("marciano")) add("marciano", 0.24);
      add("pajaro1", 0.15);
      add("pajaro2", 0.15);
      const total = pool.reduce((s, it) => s + it.w, 0);
      if (total <= 0) return null;
      let r = Math.random() * total;
      for (const it of pool) {
        if ((r -= it.w) <= 0) return it.type;
      }
      return pool[pool.length - 1].type;
    }

    spawnFlyer() {
      if (!this.assets.deco) {
        this.flyTimer = rand(1.8, 3.0);
        return;
      }
      const type = this.pickFlyerType();
      if (!type) {
        this.flyTimer = rand(1.8, 3.0);
        return;
      }

      const img = this.assets.deco[type];
      if (!img) {
        this.flyTimer = rand(1.8, 3.0);
        return;
      }

      const leftEdge = this.camX,
        rightEdge = this.camX + this.W;
      const scaleByType = (t) =>
        t === "pajaro1" || t === "pajaro2" ? 0.85 : 1.0;

      if (type === "cometa") {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const speed = rand(280, 420);
        const vx = speed * (dir === 1 ? 1 : -1);
        const vy = speed * rand(0.45, 0.75);
        const y0 = rand(-30, 40);
        const x0 = dir === 1 ? leftEdge - 120 : rightEdge + 120;
        const flipX = dir === 1;
        this.flyers.push({
          type,
          img,
          x: x0,
          y: y0,
          vx,
          vy,
          s: scaleByType(type),
          flipX,
        });
        this.flyTimer = rand(2.2, 3.8);
        return;
      }

      const dir = Math.random() < 0.5 ? 1 : -1;
      const fastMin = type === "marciano" || type === "nave" ? 140 : 35;
      const fastMax = type === "marciano" || type === "nave" ? 220 : 60;
      const speed = rand(fastMin, fastMax) * (dir === 1 ? 1 : -1);
      const y = rand(this.H * 0.18, this.H * 0.45);
      const x = dir === 1 ? leftEdge - 120 : rightEdge + 120;

      let flipX = false;
      if (type === "pajaro1" && dir === -1) flipX = true;
      if (type === "nave" && dir === -1) flipX = true;
      if (type === "pajaro2" && dir === 1) flipX = true;

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
        s: scaleByType(type),
        flipX,
      });
      this.flyTimer =
        type === "marciano" || type === "nave"
          ? rand(1.4, 2.4)
          : rand(1.8, 3.2);
    }

    update(dt) {
      // Si el input está bloqueado, drenamos cualquier salto residual
      if (this.isInputLocked()) this._clearJumpInputs();

      const goRight =
        Keys.isDown("ArrowRight") || Keys.isDown("KeyD") || !!this.pad.right;
      const goLeft =
        Keys.isDown("ArrowLeft") || Keys.isDown("KeyA") || !!this.pad.left;

      const prevX = this.hero.x,
        prevY = this.hero.y;

      if (goRight) this.hero.dx += 0.8;
      if (goLeft) this.hero.dx -= 0.7;

      this.hero.dx *= 0.9;
      const MAX_SPEED = 7;
      this.hero.dx = clamp(this.hero.dx, -MAX_SPEED, MAX_SPEED);

      this.hero.x += this.hero.dx;

      // ✅ Clamp duro de límites del mundo (alineados con murallas)
      this.hero.x = clamp(this.hero.x, this.worldMinX, this.worldMaxX);

      if (!this.isInputLocked() && this.jumpBufferT > 0) {
        if (this.tryJump()) this.jumpBufferT = 0;
      } else {
        this.jumpBufferT = 0;
      }

      this.hero.vy += this.gravity * dt;
      this.hero.y += this.hero.vy * dt;

      this.resolveObstacles(prevX, prevY);

      if (this.hero.y > this.footY) {
        this.hero.y = this.footY;
        this.hero.vy = 0;
        this.jumpCount = 0;
        this.coyoteTimer = this.coyoteTime;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      this.jumpBufferT = Math.max(0, this.jumpBufferT - dt);

      const targetCam = this.hero.x - this.W / 2;
      this.camX += (targetCam - this.camX) * 0.07;

      if (goRight && !goLeft) this.anim.facing = 1;
      else if (goLeft && !goRight) this.anim.facing = -1;
      const movingOnGround = Math.abs(this.hero.dx) > 0.35 && this.onGround();
      this.anim.walkTimer = movingOnGround ? this.anim.walkTimer + dt : 0;

      const px = this.portalX[this.step];
      if (Math.abs(this.hero.x - px) < 36 && this.onGround()) {
        this.hero.dx = 0;
        this.stop();

        // 🔒 Bloquea input mientras aparece el modal
        this.lockInput(700);

        const qObj = QUESTIONS[this.step];
        const isLast =
          this.step === this.stations - 1 || (qObj && qObj.id === "form");

        // 🎵 Al llegar a una puerta suena "puerta", incluso en la última (formulario)
        if (window.QRAudio) {
          window.QRAudio.playDoor();
        }

        if (qObj.id === "form") {
          // Calculamos los ganadores UNA vez aquí
          const win = winner(this.score);
          // Enviamos exactamente lo que devuelve winner(), sin puntos, sin prefijos raros
          const academy1 = win.top1 || "";
          const academy2 = win.top2 || "";

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

              // 🔹 Aquí es donde mandamos academias al PHP, SIN "JURISPOL:" ni "AGE:"
              payload.append("academy1", academy1);
              payload.append("academy2", academy2);

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
              } catch {}

              if (!r.ok || !data || data.success !== true) {
                const msg =
                  data && data.data && data.data.message
                    ? data.data.message
                    : "No se pudo registrar el lead.";
                alert(msg);
                this.start();
                return;
              }

              // 🎵 Victoria SOLO al completar el formulario con éxito
              if (window.QRAudio) window.QRAudio.playVictory();
              this.finish();
            } catch {
              alert("Error de red. Inténtalo de nuevo.");
              this.start();
            }
          });

          return;
        }

        questionModal(qObj, (opt) => {
          if (window.QRAudio) window.QRAudio.playAnswer();

          const choice = { id: qObj.id, q: qObj.q, value: opt };
          this.answers.push(choice);
          applyScoring(this.score, choice);

          this.step++;
          if (this.hudBadge)
            this.hudBadge.textContent = `${Math.min(
              this.step + 1,
              this.stations
            )} / ${this.stations}`;
          // 📣 Notifica avance al HUD/UI
          window.dispatchEvent(
            new CustomEvent("qr:station", { detail: { index: this.step } })
          );

          // Anti-salto al cerrar el modal:
          this._clearJumpInputs();
          this.lockInput(360);
          this.hero.vy = 0;
          this.jumpCount = 0;
          this.coyoteTimer = 0;

          // Reanudar un frame después
          requestAnimationFrame(() => {
            this.start();
            this.hero.dx = 1.2;
          });
        });
      }

      this.flyTimer -= dt;
      if (this.flyTimer <= 0) this.spawnFlyer();

      const leftEdge = this.camX,
        rightEdge = this.camX + this.W;

      for (let i = this.flyers.length - 1; i >= 0; i--) {
        const f = this.flyers[i];
        if (f.vx !== undefined) {
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          if (
            f.y > this.H + 80 ||
            f.x < leftEdge - 160 ||
            f.x > rightEdge + 160
          )
            this.flyers.splice(i, 1);
        } else {
          f.t += dt;
          f.x += f.speed * dt;
          f.y = f.baseY + Math.sin(f.t * f.freq) * f.amp;
          if (
            (f.dir === 1 && f.x > rightEdge + 120) ||
            (f.dir === -1 && f.x < leftEdge - 120)
          )
            this.flyers.splice(i, 1);
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
        if (window.QRAudio) window.QRAudio.playJump();
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

    render() {
      const ctx = this.ctx,
        W = this.W,
        H = this.H;
      const yBottom = this.footY;

      // Fondo: solo dibujamos si tenemos textura cargada.
      // Si no, dejamos transparente y se verá fondo.png del stage (CSS),
      // evitando flashes blancos.
      ctx.clearRect(0, 0, W, H);
      if (this.assets.fondo) {
        const bg = this.assets.fondo;
        const iw = bg.width,
          ih = bg.height;
        const scale = H / ih;
        const drawW = Math.ceil(iw * scale);
        const factor = 1.0;
        const offset = -Math.floor(this.camX * factor) % drawW;
        for (let x = offset - drawW; x < W + drawW; x += drawW)
          ctx.drawImage(bg, x, 0, drawW, H);
      }

      ctx.save();
      ctx.translate(-this.camX, 0);

      if (this.flyers.length) {
        for (const f of this.flyers) {
          const img = f.img;
          if (!img) continue;
          const s = f.s || 1;
          const dw = Math.max(1, Math.round(img.width * s));
          const dh = Math.max(1, Math.round(img.height * s));
          const x = Math.round(f.x),
            y = Math.round(f.y);
          if (f.flipX) {
            ctx.save();
            ctx.translate(x + dw, y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, dw, dh);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, dw, dh);
          }
        }
      }

      const DOOR_H = 80,
        TROPHY_H = 120;
      for (let i = 0; i < this.stations; i++) {
        const x = this.portalX[i],
          isLast = i === this.stations - 1;
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
          const w = Math.round(img.width * scale),
            h = Math.round(img.height * scale);
          const yTop = yBottom - h;

          const inactive = !isLast && i > this.step;
          if (inactive && "filter" in ctx) {
            ctx.save();
            ctx.filter = "grayscale(100%) brightness(0.85) contrast(1.1)";
            ctx.drawImage(img, x - w / 2, yTop, w, h);
            ctx.restore();
          } else {
            ctx.drawImage(img, x - w / 2, yTop, w, h);
          }

          if (!isLast) {
            ctx.fillStyle = BRAND.gDark;
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = "center";
            ctx.fillText(String(i + 1), x, yTop - 8);
          }
        } else {
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

      if (this.obstacles.length) {
        const img = this.assets.obstaculo;
        for (const o of this.obstacles) {
          const left = o.x - o.w / 2,
            top = o.yBottom - o.h;
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
        const sx = 26 * (1 - 0.6 * t),
          sy = 8 * (1 - 0.7 * t);
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

      // HERO
      ctx.save();
      ctx.translate(this.hero.x, this.hero.y);
      const hasHero =
        this.assets.hero &&
        this.assets.hero.idle &&
        this.assets.hero.stepR &&
        this.assets.hero.stepL &&
        this.assets.hero.jump;
      if (hasHero) {
        let sprite = this.assets.hero.idle;
        if (!this.onGround()) sprite = this.assets.hero.jump;
        else if (Math.abs(this.hero.dx) > 0.35) {
          const n = Math.floor(this.anim.walkTimer / this.anim.frameDur) % 2;
          sprite = n === 0 ? this.assets.hero.stepR : this.assets.hero.stepL;
        }
        const drawH = this.hero.dh || 58;
        const ratio =
          sprite && sprite.height ? sprite.width / sprite.height : 1;
        const drawW = Math.max(1, Math.round(drawH * ratio));
        if (this.anim.facing === -1) ctx.scale(-1, 1);
        ctx.drawImage(sprite, -drawW / 2, -drawH, drawW, drawH);
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
      ctx.restore();

      ctx.restore();
    }
  }

  window.QRGame = QRGame;
})();
