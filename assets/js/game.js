(function(){
  const { createLoop, Keys } = window.MicroLoop;
  const { QUESTIONS, freshScore, applyScoring, winner, bullets } = window.QRData;
  const { questionModal, formModal, endingModal } = window.QRUI;

  class QRGame {
    constructor(canvas, hudBadge) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.hudBadge = hudBadge;

      // Mundo
      this.W = this.cv.width;
      this.H = this.cv.height;
      this.groundY = this.H - 64;
      this.stations = 8;
      this.spacing  = 360;
      this.startX   = 60;
      this.portalX  = Array.from({length:this.stations}, (_,i)=> this.startX + i*this.spacing);

      // Estado
      this.step = 0;
      this.answers = [];
      this.score = freshScore();

      // Héroe 
      this.hero = { x:this.startX - 140, y:this.groundY-8, w:42, h:42, dx:0 };

      // Cámara
      this.camX = 0;

      // Bucle
      this.loop = createLoop(this.update.bind(this), this.render.bind(this));
    }

    start(){ this.loop.start(); }
    stop(){ this.loop.stop(); }

    update(dt){
  // input movimiento
  if (Keys.isDown('ArrowRight') || Keys.isDown('KeyD')) this.hero.dx += 1.6;
  if (Keys.isDown('ArrowLeft')  || Keys.isDown('KeyA')) this.hero.dx -= 1.2;

  // físicas simples
  this.hero.dx *= 0.9;
  this.hero.x  += this.hero.dx;

  // cámara suave
  const targetCam = this.hero.x - this.W/2;
  this.camX += (targetCam - this.camX) * 0.07;

  // portal activo actual (0..7)
  const px = this.portalX[this.step];

  // si estamos cerca del portal activo, mostramos su contenido
  if (Math.abs(this.hero.x - px) < 36) {
    this.hero.dx = 0;
    this.stop();

    const qObj = QUESTIONS[this.step];

    // Si es la estación 8 (formulario), SOLO se abre al llegar ahora
    if (qObj.id === 'form') {
      formModal(async ({name,email,phone,consent})=>{
        try{
          const payload = new URLSearchParams();
          payload.append('action','qr_send_lead');
          payload.append('nonce', qrAjax.nonce);
          payload.append('name', name);
          payload.append('email', email);
          payload.append('phone', phone);
          payload.append('consent', consent);
          payload.append('answers', JSON.stringify(this.answers));
          const r = await fetch(qrAjax.ajax_url, {
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},
            body: payload.toString()
          });
          const data = await r.json();
          this.finish();
        }catch(e){
          alert('Error de red');
          this.finish();
        }
      });
      return;
    }

    // Para estaciones 1..7: pregunta normal
    questionModal(qObj, (opt)=>{
      const choice = { id:qObj.id, q:qObj.q, value: opt };
      this.answers.push(choice);
      applyScoring(this.score, choice);

      // avanzamos a la siguiente estación
      this.step++;
      if (this.hudBadge) this.hudBadge.textContent = `${Math.min(this.step+1,8)} / 8`;

      // reanudamos el juego; NO abrimos el formulario aún, habrá que llegar a la puerta 8
      this.start();
      this.hero.dx = 1.8;
    });
  }
}


    finish(){
      const win = winner(this.score);
      endingModal({ top1:win.top1, top2:win.top2, bullets: bullets(win.top1) }, ()=> location.reload());
    }

    render(){
      const ctx = this.ctx, W=this.W, H=this.H, gy=this.groundY;

      // Cielo
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bdefff'); g.addColorStop(1,'#e8fdff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

      ctx.save();
      ctx.translate(-this.camX, 0);

      // Suelo
      ctx.fillStyle = '#7ed0df';
      ctx.fillRect(-5000, gy, 10000, 8);
      ctx.fillStyle = '#a7e9f3';
      for (let x=-5000; x<5000; x+=32) ctx.fillRect(x, gy+8, 16, 6);

      // Portales
      for (let i=0;i<this.stations;i++){
        const x = this.portalX[i];
        ctx.fillStyle = (i <= this.step) ? '#ffe18c' : '#cfd8dc';
        ctx.fillRect(x-24, gy-72, 48, 72);
        ctx.lineWidth = 6; ctx.strokeStyle = '#222';
        ctx.strokeRect(x-24, gy-72, 48, 72);
        ctx.fillStyle = '#222'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
        ctx.fillText(String(i+1), x, gy-80);
      }

      // Héroe (vectorial)
      ctx.save();
      ctx.translate(this.hero.x, this.hero.y);
      ctx.fillStyle = '#00BCD4';
      ctx.fillRect(-this.hero.w/2, -this.hero.h, this.hero.w, this.hero.h);
      ctx.lineWidth = 3; ctx.strokeStyle = '#222';
      ctx.strokeRect(-this.hero.w/2, -this.hero.h, this.hero.w, this.hero.h);
      // cara
      ctx.fillStyle = '#fff';
      ctx.fillRect(-10, -this.hero.h+6, 20, 12);
      ctx.restore();

      ctx.restore();
    }
  }

  window.QRGame = QRGame;
})();
