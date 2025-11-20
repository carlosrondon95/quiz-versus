<?php
if (!defined('ABSPATH'))
  exit;

class QR_Ajax
{
  const NONCE = QR_Plugin::NONCE;

  public function register()
  {
    add_action('wp_ajax_qr_send_lead', [$this, 'handle']);
    add_action('wp_ajax_nopriv_qr_send_lead', [$this, 'handle']);
  }

  public function handle()
  {
    // Validación de nonce (evita envíos falsos)
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], self::NONCE)) {
      wp_send_json_error(['message' => 'Sesión caducada. Recarga la página.'], 403);
    }

    // Honeypot (si viene relleno => bot)
    $hp = isset($_POST['website']) ? trim((string) $_POST['website']) : '';
    if (!empty($hp)) {
      wp_send_json_error(['message' => 'Spam detectado.'], 400);
    }

    // Datos del formulario
    $name = isset($_POST['name']) ? sanitize_text_field(wp_unslash($_POST['name'])) : '';
    $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $phone = isset($_POST['phone']) ? sanitize_text_field(wp_unslash($_POST['phone'])) : '';
    $consent = (isset($_POST['consent']) && $_POST['consent'] === '1') ? 'Sí' : 'No';

    // Respuestas completas (por si en el futuro se quieren usar)
    $answers_json = isset($_POST['answers']) ? wp_unslash($_POST['answers']) : '[]';
    $answers = json_decode($answers_json, true);
    if (!is_array($answers)) {
      $answers = [];
    }

    // Academias calculadas en el front
    $academy1 = isset($_POST['academy1']) ? sanitize_text_field(wp_unslash($_POST['academy1'])) : '';
    $academy2 = isset($_POST['academy2']) ? sanitize_text_field(wp_unslash($_POST['academy2'])) : '';

    // Validaciones básicas
    if (empty($name) || empty($email) || !is_email($email)) {
      wp_send_json_error(['message' => 'Revisa nombre y email.'], 422);
    }
    if ($consent !== 'Sí') {
      wp_send_json_error(['message' => 'Debes aceptar la política de privacidad.'], 422);
    }

    // === Guardado en CSV (Excel) ===
    $upload_dir = wp_upload_dir();
    if (!empty($upload_dir['error'])) {
      wp_send_json_error(['message' => 'No se pudo acceder al directorio de subidas.'], 500);
    }

    $dir = trailingslashit($upload_dir['basedir']) . 'mision-futuro/';
    if (!wp_mkdir_p($dir)) {
      wp_send_json_error(['message' => 'No se pudo crear el directorio de leads.'], 500);
    }

    $file = $dir . 'mision-futuro-leads.csv';
    $is_new = !file_exists($file);

    $fh = @fopen($file, 'a');
    if (!$fh) {
      wp_send_json_error(['message' => 'No se pudo escribir el fichero de leads.'], 500);
    }

    if ($is_new) {
      fwrite($fh, "\xEF\xBB\xBF");

      $header = ['NOMBRE', 'TELEFONO', 'MAIL', 'ACADEMIA 1', 'ACADEMIA 2', 'FECHA'];
      fputcsv($fh, $header, ';');
    }

    // Fecha del día (según zona horaria de WordPress)
    $fecha = current_time('Y-m-d');

    $row = [$name, $phone, $email, $academy1, $academy2, $fecha];
    fputcsv($fh, $row, ';');

    fclose($fh);

    wp_send_json_success(['message' => '¡Gracias! Tus datos se han registrado correctamente.']);
  }
}
