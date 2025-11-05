<?php
if (!defined('ABSPATH'))
  exit;

class QR_Assets
{
  public function register()
  {
    add_action('wp_enqueue_scripts', [$this, 'enqueue']);
  }

  public function enqueue()
  {
    if (!is_singular() || !has_shortcode(get_post_field('post_content', get_the_ID()), 'quiz_runner')) {
      return;
    }

    $ver = '2.3.0';

    // CSS
    wp_enqueue_style('qr-app', QR_PLUGIN_URL . 'assets/css/app.css', [], $ver);

    // JS vendor
    wp_enqueue_script('qr-microloop', QR_PLUGIN_URL . 'assets/js/vendor/microloop.js', [], $ver, true);

    // UI/Data
    wp_enqueue_script('qr-data', QR_PLUGIN_URL . 'assets/js/data.js', [], $ver, true);
    wp_enqueue_script('qr-ui', QR_PLUGIN_URL . 'assets/js/ui.js', [], $ver, true);

    // Responsive + Virtual Pad + Fullscreen
    wp_enqueue_script('qr-viewport', QR_PLUGIN_URL . 'assets/js/viewport.js', [], $ver, true);
    wp_enqueue_script('qr-virtualpad', QR_PLUGIN_URL . 'assets/js/virtualpad.js', [], $ver, true);
    wp_enqueue_script('qr-fs', QR_PLUGIN_URL . 'assets/js/fs.js', [], $ver, true);

    // Game + Bootstrap
    wp_enqueue_script('qr-game', QR_PLUGIN_URL . 'assets/js/game.js', ['qr-microloop', 'qr-data', 'qr-ui', 'qr-viewport', 'qr-virtualpad'], $ver, true);
    wp_enqueue_script('qr-bootstrap', QR_PLUGIN_URL . 'assets/js/bootstrap.js', ['qr-game', 'qr-fs'], $ver, true);

    // Datos para AJAX/branding
    wp_localize_script('qr-bootstrap', 'qrAjax', [
      'ajax_url' => admin_url('admin-ajax.php'),
      'nonce' => wp_create_nonce(QR_Ajax::NONCE),
      'brand' => ['primary' => '#d09e55', 'font' => 'Poppins'],
    ]);
  }
}
