(function () {
  const canvas = document.getElementById("qr-canvas");
  const hudBadge = document.querySelector(".qr-hud .qr-badge");
  const stage = document.getElementById("qr-stage");
  const appRoot = document.getElementById("qr-app");
  const padEl = document.getElementById("qr-pad");
  if (!canvas || !stage || !appRoot) return;

  // Detección robusta de móvil
  const isMobile = (function () {
    const ua = (
      navigator.userAgent ||
      navigator.vendor ||
      window.opera ||
      ""
    ).toLowerCase();
    const uaMobile =
      /android|iphone|ipad|ipod|iemobile|windows phone|blackberry|bb10/.test(
        ua
      );
    const coarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const noHover =
      window.matchMedia && window.matchMedia("(hover: none)").matches;
    return uaMobile || (coarse && noHover);
  })();

  if (isMobile) document.body.classList.add("is-mobile");
  else document.body.classList.remove("is-mobile");

  // Instancias
  let viewport = null;
  let virtualPad = null;
  let fsMgr = null;
  const padState = { left: false, right: false };

  if (isMobile) {
    viewport = new QRViewport(canvas, stage, padEl);
    virtualPad = new VirtualPad({
      onJump: () => {
        if (game) game.queueJump();
      },
    });
    fsMgr = new QRFS(appRoot, stage, padEl);

    // Leer estado de botones (clases) para el juego
    const btnL = document.getElementById("qr-pad-left");
    const btnR = document.getElementById("qr-pad-right");
    (function loopPad() {
      padState.left = btnL && btnL.classList.contains("qr-pad__btn--pressed");
      padState.right = btnR && btnR.classList.contains("qr-pad__btn--pressed");
      requestAnimationFrame(loopPad);
    })();
  } else {
    // Escritorio
    stage.classList.remove("qr-stage--mobile");
    if (padEl) {
      padEl.hidden = true;
      padEl.setAttribute("aria-hidden", "true");
    }
    canvas.style.width = "";
    canvas.style.height = "";
    stage.style.height = "";
    stage.style.minHeight = "";
  }

  // Juego
  const game = new QRGame(
    canvas,
    hudBadge,
    {},
    isMobile ? padState : { left: false, right: false }
  );

  // Menú de inicio: en móvil primero FS (y bloqueo a landscape), luego arrancamos
  window.QRUI.startModal(async () => {
    if (isMobile && fsMgr) {
      await fsMgr.enter(); // aquí se intenta bloquear a landscape
    }
    game.start();
  });
})();
