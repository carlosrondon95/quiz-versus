<?php if (!defined('ABSPATH'))
  exit; ?>
<div id="qr-app">
  <div class="qr-hud">
    <span>Estación: <span class="qr-badge">1 / 8</span></span>
    <span class="qr-hint qr-hint--desktop">Usa ← → / A D y ↑ / W / Espacio para saltar (doble salto)</span>
    <span class="qr-hint qr-hint--mobile">Usa los botones táctiles para moverte y saltar (doble toque = doble
      salto)</span>
  </div>

  <!-- Stage -->
  <div id="qr-stage" class="qr-stage">
    <canvas id="qr-canvas" width="960" height="320"></canvas>
  </div>

  <!-- Honeypot invisible para bots -->
  <input type="text" class="qr-hp" name="website" tabindex="-1" aria-hidden="true" />

  <!-- Controles táctiles (dentro de #qr-app) -->
  <div id="qr-pad" class="qr-pad" aria-hidden="true" hidden>
    <div class="qr-pad__left" role="group" aria-label="Movimiento">
      <button id="qr-pad-left" class="qr-pad__btn" aria-label="Mover a la izquierda">←</button>
      <button id="qr-pad-right" class="qr-pad__btn" aria-label="Mover a la derecha">→</button>
    </div>
    <div class="qr-pad__right" role="group" aria-label="Acción">
      <button id="qr-pad-jump" class="qr-pad__btn qr-pad__btn--primary" aria-label="Saltar">⤒</button>
    </div>
  </div>

  <!-- Botón salir de pantalla completa (dentro de #qr-app) -->
  <button id="qr-exit" class="qr-exit" aria-label="Salir de pantalla completa" hidden>✕</button>

  <!-- Overlay para forzar horizontal cuando no se puede bloquear orientación -->
  <div id="qr-rotate" class="qr-rotate" hidden>
    <div class="qr-rotate__card">
      <div class="qr-rotate__title">Gira el móvil</div>
      <div class="qr-rotate__text">Este juego solo se juega en horizontal. Pon el dispositivo en horizontal para
        continuar.</div>
    </div>
  </div>
</div>

<!-- Modal root -->
<div id="qr-modal-root"></div>