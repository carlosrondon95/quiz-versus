// assets/js/data.js
(function () {
  // =========================
  //  PREGUNTAS (versión final)
  // =========================
  const QUESTIONS = [
    {
      id: "age",
      q: "¿Cuál es tu rango de edad?",
      opts: ["16-18 años", "19-25 años", "25-29 años", "+29 años", "+40 años"],
    },
    {
      id: "studies",
      q: "¿Qué estudios has completado?",
      opts: [
        "ESO",
        "Bachillerato",
        "Ciclo Formativo Grado Medio",
        "Ciclo Formativo Grado Superior",
        "Universidad / Máster",
      ],
    },
    {
      id: "type",
      q: "¿Qué tipo de trabajo te llama más la atención?",
      opts: [
        "Seguridad y acción",
        "Administración / gestión",
        "Docencia y formación",
        "Tecnología y planificación",
      ],
    },
    {
      id: "env",
      q: "¿En qué entorno te ves trabajando?",
      opts: [
        "Terreno / Operativo",
        "Mixto (terreno/oficina)",
        "Oficina / administración / docencia",
      ],
    },
    {
      id: "shifts",
      q: "¿Disponibilidad para turnos rotativos (noches/fines de semana)?",
      opts: ["Sin problema", "Prefiero horario estable"],
    },
    {
      id: "physical",
      q: "¿Aceptarías pruebas físicas durante la oposición?",
      opts: ["Sí", "Prefiero evitarlas"],
    },
    {
      id: "maneuvers",
      q: "¿Te interesan las maniobras?",
      opts: ["Sí", "Prefiero evitarlas"],
    },
    {
      id: "contact",
      q: "¿Quieres un trabajo con contacto directo con personas?",
      opts: ["Sí", "No"],
    },
    {
      id: "mode",
      q: "¿Cómo prefieres estudiar?",
      opts: ["100% Online", "Presencial"],
    },
    {
      id: "hours",
      q: "¿Cuántas horas puedes dedicar al estudio a la semana?",
      opts: ["Menos de 10h", "10-20h", "Más de 20h"],
    },
    {
      id: "goal",
      q: "¿Qué valoras más en tu futura oposición?",
      opts: [
        "Estabilidad laboral y salario",
        "Crecimiento profesional",
        "Impacto social / vocación docente",
      ],
    },
    {
      id: "form",
      q: "Déjanos tus datos y te enviaremos tu resultado",
      opts: [],
    },
  ];

  // =========================
  //  ESTADO
  // =========================
  function freshScore() {
    return {
      PREFORTIA: 0,
      JURISPOL: 0, // se fija a max(B, E)
      FORVIDE: 0,
      AGE360: 0,
      MÉTODOS: 0,
      DOZENTY: 0,
      __juris: { Básica: 0, Ejecutiva: 0 },
      __age360: null, // 'Auxiliar' | 'Administrativo'
      __flags: {
        docencia: false,
        entornoOfi: false,
        horarioEstable: false,
        maneuversYes: false,
        operativoPack: false,
      },
    };
  }

  // =========================
  //  HELPERS
  // =========================
  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const add = (score, name, pts) => {
    if (score[name] !== undefined) score[name] += pts;
  };
  const addJuris = (score, scale, pts) => {
    score.__juris[scale] += pts;
  };

  // =========================
  //  MOTOR DE PUNTUACIÓN (v5 ajustado)
  // =========================
  function applyScoring(score, choice) {
    const id = choice.id;
    const v = normalize(choice.value);

    switch (id) {
      // 1) EDAD
      case "age": {
        if (normalize("16-18 años") === v) {
          addJuris(score, "Básica", 2);
          add(score, "MÉTODOS", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
        }
        if (normalize("19-25 años") === v) {
          addJuris(score, "Básica", 2);
          add(score, "PREFORTIA", 1);
          add(score, "MÉTODOS", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
        }
        if (normalize("25-29 años") === v) {
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "PREFORTIA", 1);
          add(score, "MÉTODOS", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
        }
        if (normalize("+29 años") === v) {
          addJuris(score, "Ejecutiva", 2);
          add(score, "PREFORTIA", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
        }
        if (normalize("+40 años") === v) {
          addJuris(score, "Ejecutiva", 2);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
        }
        break;
      }

      // 2) ESTUDIOS (+ rama AGE360)
      case "studies": {
        const isESO = normalize("ESO") === v;
        const isBach = normalize("Bachillerato") === v;
        const isCFGM = normalize("Ciclo Formativo Grado Medio") === v;
        const isCFGS = normalize("Ciclo Formativo Grado Superior") === v;
        const isUni = normalize("Universidad / Máster") === v;

        if (isESO) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 2);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          score.__age360 = "Auxiliar";
          add(score, "MÉTODOS", 1);
        }
        if (isBach || isCFGM || isCFGS) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          score.__age360 = "Administrativo";
        }
        if (isUni) {
          addJuris(score, "Ejecutiva", 2);
          add(score, "DOZENTY", 2);
          add(score, "AGE360", 1);
          score.__age360 = "Administrativo";
          add(score, "PREFORTIA", 1);
          add(score, "FORVIDE", 1);
          add(score, "MÉTODOS", 1);
        }
        break;
      }

      // 3) TIPO DE TRABAJO
      case "type": {
        if (
          normalize("seguridad y accion") === v ||
          normalize("seguridad y acción") === v
        ) {
          add(score, "PREFORTIA", 3); // ↑ equilibrado
          addJuris(score, "Básica", 3);
          add(score, "FORVIDE", 2);
          add(score, "MÉTODOS", 1);
        }
        if (
          normalize("administracion / gestion") === v ||
          normalize("administración / gestión") === v
        ) {
          add(score, "AGE360", 3);
          addJuris(score, "Ejecutiva", 2);
          add(score, "FORVIDE", 3);
        }
        if (
          normalize("docencia y formacion") === v ||
          normalize("docencia y formación") === v
        ) {
          add(score, "DOZENTY", 3);
          addJuris(score, "Ejecutiva", 1);
          add(score, "AGE360", 1);
          score.__flags.docencia = true;
        }
        if (
          normalize("tecnologia y planificacion") === v ||
          normalize("tecnología y planificación") === v
        ) {
          add(score, "AGE360", 2);
          add(score, "MÉTODOS", 2);
          addJuris(score, "Ejecutiva", 1);
          add(score, "FORVIDE", 1);
        }
        break;
      }

      // 4) ENTORNO
      case "env": {
        if (normalize("terreno / operativo") === v) {
          add(score, "PREFORTIA", 3); // ↑ equilibrado
          addJuris(score, "Básica", 3);
          add(score, "MÉTODOS", 1); // ↓ equilibrado
        }
        if (normalize("mixto (terreno/oficina)") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 2);
          addJuris(score, "Ejecutiva", 2);
          add(score, "FORVIDE", 2);
        }
        if (
          normalize("oficina / administracion / docencia") === v ||
          normalize("oficina / administración / docencia") === v
        ) {
          add(score, "AGE360", 3);
          add(score, "DOZENTY", 3);
          addJuris(score, "Ejecutiva", 1);
          score.__flags.entornoOfi = true;
        }
        break;
      }

      // 5) TURNOS
      case "shifts": {
        if (normalize("sin problema") === v) {
          add(score, "PREFORTIA", 2);
          addJuris(score, "Básica", 2);
          add(score, "MÉTODOS", 1);
          add(score, "FORVIDE", 3);
        }
        if (normalize("prefiero horario estable") === v) {
          add(score, "AGE360", 3);
          addJuris(score, "Ejecutiva", 2);
          add(score, "DOZENTY", 2);
          score.__flags.horarioEstable = true;
        }
        break;
      }

      // 6) PRUEBAS FÍSICAS
      case "physical": {
        if (normalize("si") === v || normalize("sí") === v) {
          add(score, "PREFORTIA", 3); // ↑ equilibrado
          addJuris(score, "Básica", 3);
          add(score, "MÉTODOS", 1); // ↓ equilibrado
          score.__flags.operativoPack = true;
        }
        if (normalize("prefiero evitarlas") === v) {
          add(score, "AGE360", 2);
          add(score, "DOZENTY", 2);
          add(score, "FORVIDE", 3);
          addJuris(score, "Ejecutiva", 2);
        }
        break;
      }

      // 7) MANIOBRAS
      case "maneuvers": {
        if (normalize("si") === v || normalize("sí") === v) {
          add(score, "MÉTODOS", 3); // SOLO MÉTODOS (equilibrado)
          score.__flags.maneuversYes = true;
        } else if (normalize("prefiero evitarlas") === v) {
          // Efecto suave
          add(score, "PREFORTIA", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
        }
        break;
      }

      // 8) CONTACTO
      case "contact": {
        if (normalize("si") === v || normalize("sí") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "MÉTODOS", 1);
          add(score, "DOZENTY", 1);
        } else {
          add(score, "AGE360", 1); // ambas válidas en AGE360
        }
        break;
      }

      // 9) MODO
      case "mode": {
        if (normalize("100% online") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "MÉTODOS", 1);
          add(score, "DOZENTY", 1);
        } else if (normalize("presencial") === v) {
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
        }
        break;
      }

      // 10) HORAS
      case "hours": {
        if (normalize("menos de 10h") === v) {
          add(score, "MÉTODOS", 1);
          addJuris(score, "Ejecutiva", 1);
        }
        if (normalize("10-20h") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 1);
          add(score, "FORVIDE", 1);
          add(score, "AGE360", 1);
          add(score, "DOZENTY", 1);
        }
        if (normalize("mas de 20h") === v || normalize("más de 20h") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 1);
          add(score, "FORVIDE", 1);
          add(score, "DOZENTY", 1);
        }
        break;
      }

      // 11) VALORAS
      case "goal": {
        if (normalize("estabilidad laboral y salario") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Básica", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "FORVIDE", 3); // ↑
          add(score, "AGE360", 2);
        }
        if (normalize("crecimiento profesional") === v) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Ejecutiva", 2);
          add(score, "AGE360", 1);
          add(score, "MÉTODOS", 1); // ↓
        }
        if (
          normalize("impacto social / vocacion docente") === v ||
          normalize("impacto social / vocación docente") === v
        ) {
          add(score, "PREFORTIA", 1);
          addJuris(score, "Ejecutiva", 1);
          add(score, "DOZENTY", 3);
          add(score, "MÉTODOS", 1);
          score.__flags.docencia = true;
        }
        break;
      }
    }

    // Flags auxiliares
    if (id === "type") window.__qr_lastType = choice.value;
    if (id === "env") window.__qr_lastEnv = choice.value;
    if (id === "physical") window.__qr_lastPhysical = choice.value;

    if (id === "type" || id === "env" || id === "physical") {
      const gotSeg =
        normalize(window.__qr_lastType || "") ===
          normalize("Seguridad y acción") ||
        (id === "type" &&
          (v === normalize("seguridad y accion") ||
            v === normalize("seguridad y acción")));
      const gotTer =
        normalize(window.__qr_lastEnv || "") ===
          normalize("Terreno / Operativo") ||
        (id === "env" && v === normalize("terreno / operativo"));
      const gotFis =
        normalize(window.__qr_lastPhysical || "") === normalize("Sí") ||
        (id === "physical" && (v === normalize("si") || v === normalize("sí")));

      score.__flags.operativoPack = !!(gotSeg && gotTer && gotFis);
    }
  }

  // =========================
  //  GANADOR (top1/top2)
  // =========================
  function winner(score) {
    // Anti-doble-conteo de Jurispol
    const b = (score.__juris && score.__juris["Básica"]) || 0;
    const e = (score.__juris && score.__juris["Ejecutiva"]) || 0;
    score["JURISPOL"] = Math.max(b, e);

    const entries = Object.entries(score)
      .filter(([k]) => !k.startsWith("__"))
      .map(([k, v]) => [k, v])
      .sort((a, b) => b[1] - a[1]);

    if (!entries.length || entries[0][1] <= 0)
      return { top1: null, top2: null };

    // Reordenadores suaves (solo si empatan)
    function applyTieBreakers(list) {
      // Maniobras SÍ → MÉTODOS primero
      if (score.__flags.maneuversYes) {
        const iM = list.indexOf("MÉTODOS");
        if (iM >= 0) list.splice(0, 0, list.splice(iM, 1)[0]);
      }
      // Docencia + oficina + horario estable → DOZENTY primero, AGE360 segunda si está
      if (
        score.__flags.docencia &&
        score.__flags.entornoOfi &&
        score.__flags.horarioEstable
      ) {
        const iD = list.indexOf("DOZENTY");
        if (iD >= 0) list.splice(0, 0, list.splice(iD, 1)[0]);
        const iA = list.indexOf("AGE360");
        if (iA >= 0 && list[1] !== "AGE360")
          list.splice(1, 0, list.splice(iA, 1)[0]);
      }
      return list;
    }

    let candidateKeys = entries.slice(0, 3).map((e) => e[0]);
    candidateKeys = applyTieBreakers(candidateKeys);

    // Umbral del segundo (cap 2)
    const top1Val = score[candidateKeys[0]] || 0;
    const top2Val = score[candidateKeys[1]] || 0;
    const takeSecond =
      candidateKeys[1] && top2Val >= 0.8 * top1Val && top2Val >= 4;

    const chosen = takeSecond ? candidateKeys.slice(0, 2) : [candidateKeys[0]];

    function decorateName(key) {
      if (key === "JURISPOL") {
        let scale =
          e > b
            ? "Escala Ejecutiva"
            : b > e
            ? "Escala Básica"
            : "Escala Ejecutiva";
        return `JURISPOL – ${scale}`;
      }
      if (key === "AGE360") {
        const rama = score.__age360 || "Administrativo";
        return `AGE360 – ${rama}`;
      }
      return key;
    }

    return {
      top1: decorateName(chosen[0]),
      top2: chosen[1] ? decorateName(chosen[1]) : null,
    };
  }

  // =========================
  //  BULLETS
  // =========================
  function bullets(name) {
    const base =
      name && name.startsWith("JURISPOL")
        ? "JURISPOL"
        : name && name.startsWith("AGE360")
        ? "AGE360"
        : name;

    switch (base) {
      case "PREFORTIA":
        return ["Foco operativo", "Buenos recursos", "Mentoría"];
      case "JURISPOL":
        return [
          "Entrenamiento sólido",
          "Plan intensivo",
          "Simulacros realistas",
        ];
      case "MÉTODOS":
        return [
          "Maniobras y técnica",
          "Práctica guiada",
          "Correcciones en directo",
        ];
      case "DOZENTY":
        return [
          "Docencia/educación",
          "Plan estructurado",
          "Temario y didáctica",
        ];
      case "FORVIDE":
        return [
          "Seguridad/Administración",
          "Online o presencial",
          "Plan de estudio progresivo",
        ];
      case "AGE360": {
        const rama =
          name && name.includes("–") ? name.split("–")[1].trim() : "";
        if (normalize(rama) === normalize("Auxiliar"))
          return ["Acceso con ESO", "Funciones de apoyo", "Promoción interna"];
        return [
          "Bachillerato o superior",
          "Tareas administrativas",
          "Buen equilibrio vida-trabajo",
        ];
      }
      default:
        return [
          "Itinerario recomendado",
          "Formación guiada",
          "Acompañamiento experto",
        ];
    }
  }

  // Exponer API
  window.QRData = { QUESTIONS, freshScore, applyScoring, winner, bullets };
})();
