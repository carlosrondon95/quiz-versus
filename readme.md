# MISIÓN FUTURO

**MISIÓN FUTURO** es un mini-videojuego web integrado en WordPress. Convierte un cuestionario tradicional en una experiencia interactiva donde el usuario avanza por un pequeño *runner* en 2D, esquiva obstáculos y responde preguntas a medida que progresa por el escenario.

El objetivo es hacer más atractivo y dinámico el proceso de recopilación de información, ofreciendo una experiencia fluida y con estética retro.

---

## 🎮 Cómo funciona

- El jugador avanza por un escenario de estilo retro.
- Cada puerta del recorrido corresponde a una pregunta del cuestionario.
- El usuario elige sus respuestas mientras esquiva obstáculos.
- Al final aparece un formulario para introducir nombre, email y teléfono.
- El juego calcula las academias recomendadas según las respuestas.
- Al terminar, se muestra una pequeña ceremonia final con el resultado.

Todo ocurre en una sola pantalla, sin recargas y con controles tanto para escritorio como para dispositivos móviles.

---

## 📊 Registro de datos

Cuando el usuario completa MISIÓN FUTURO y envía el formulario final, el sistema guarda automáticamente toda la información en un archivo **CSV**:


### Contenido de cada registro:

- **Nombre**  
- **Teléfono**  
- **Email**  
- **Academia 1** (resultado principal)  
- **Academia 2** (si existe)  
- **Fecha del envío**

El archivo se va actualizando con cada nueva partida completada.

---

## ⚙️ Integración en WordPress

MISIÓN FUTURO funciona como un plugin propio:

1. La carpeta del plugin se comprime en un `.zip`.
2. Se instala desde **Plugins → Añadir nuevo → Subir plugin**.
3. Se activa.
4. Se inserta en la página deseada mediante shortcode.

No requiere configuraciones adicionales.

---

## 🛠️ Tecnologías utilizadas

- **JavaScript (Canvas 2D)**  
  Motor de juego ligero, animaciones, físicas simples y control del personaje.
- **PHP**  
  Gestión del formulario final y escritura de datos en el CSV.
- **AJAX**  
  Comunicación entre el juego y WordPress sin recargar la página.
- **CSS responsive**  
  Ajustes visuales para escritorio, móvil y orientación horizontal.
- **WordPress**  
  Como entorno de integración y punto central de almacenamiento.

---

## 🎯 Propósito del proyecto

MISIÓN FUTURO fue creado para mejorar la experiencia del usuario y hacer más ameno un proceso que normalmente resulta monótono. La mezcla de juego, narrativa ligera y recomendación final ofrece una interacción más memorable, manteniendo al mismo tiempo un flujo claro y directo de recogida de datos.
