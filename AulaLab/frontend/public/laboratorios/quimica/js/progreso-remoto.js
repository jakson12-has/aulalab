(() => {
  "use strict";

  const apiBase = window.AULALAB_CONFIG?.API_BASE;
  const token = sessionStorage.getItem("aulalab_token");
  let usuario = null;

  try {
    usuario = JSON.parse(
      sessionStorage.getItem("aulalab_usuario") || "null"
    );
  } catch {
    usuario = null;
  }

  if (
    !apiBase ||
    !token ||
    String(usuario?.rol || "").toLowerCase() !== "student"
  ) return;

  const url = `${apiBase}/api/progreso/actividades/quimica`;
  const CLAVE_PRINCIPAL = "aulalab_quimica_progreso_v1";
  const CLAVE_EXTRA = "aulalab_nuevas_actividades_v1";
  let silenciar = false;
  let temporizador = null;

  function leer(clave, inicial) {
    try {
      const valor = localStorage.getItem(clave);
      return valor ? JSON.parse(valor) : inicial;
    } catch {
      return inicial;
    }
  }

  function comoObjeto(valor, inicial = {}) {
    if (typeof valor === "string") {
      try { valor = JSON.parse(valor); } catch { return inicial; }
    }
    return valor && typeof valor === "object" && !Array.isArray(valor)
      ? valor : inicial;
  }

  function principalLocal() {
    const p = leer(CLAVE_PRINCIPAL, {});
    return {
      nivel: p.nivel || "bachillerato",
      elementosExplorados: Array.isArray(p.elementosExplorados)
        ? p.elementosExplorados : [],
      phCompletado: p.phCompletado === true,
      balanceoCompletado: p.balanceoCompletado === true,
      quizCompletado: p.quizCompletado === true,
      mejorPuntaje: Number(p.mejorPuntaje) || 0,
      ultimoPuntaje: Number.isFinite(p.ultimoPuntaje)
        ? p.ultimoPuntaje : null
    };
  }

  function extraLocal() {
    const e = leer(CLAVE_EXTRA, {});
    const c = e.completadas || {};
    return {
      puntos: Number(e.puntos) || 0,
      completadas: {
        atomos: c.atomos === true,
        densidad: c.densidad === true,
        moleculas: c.moleculas === true,
        detective: c.detective === true,
        misiones: c.misiones === true
      },
      insignias: Array.isArray(e.insignias) ? e.insignias : [],
      casosResueltos: Array.isArray(e.casosResueltos)
        ? e.casosResueltos : [],
      casosConPuntos: Array.isArray(e.casosConPuntos)
        ? e.casosConPuntos : [],
      casoActual: Number(e.casoActual) || 0
    };
  }

  function union(a, b) {
    const valores = [...(Array.isArray(a) ? a : []),
      ...(Array.isArray(b) ? b : [])];
    return [...new Map(valores.map(v => [JSON.stringify(v), v])).values()];
  }

  function combinarPrincipal(local, remoto) {
    const r = comoObjeto(remoto);
    return {
      nivel: local.nivel || r.nivel || "bachillerato",
      elementosExplorados: union(
        local.elementosExplorados, r.elementosExplorados
      ),
      phCompletado: local.phCompletado || r.phCompletado === true,
      balanceoCompletado:
        local.balanceoCompletado || r.balanceoCompletado === true,
      quizCompletado: local.quizCompletado || r.quizCompletado === true,
      mejorPuntaje: Math.max(
        Number(local.mejorPuntaje) || 0,
        Number(r.mejorPuntaje) || 0
      ),
      ultimoPuntaje: local.ultimoPuntaje !== null
        ? local.ultimoPuntaje
        : (Number.isFinite(r.ultimoPuntaje) ? r.ultimoPuntaje : null)
    };
  }

  function combinarExtra(local, remoto) {
    const r = comoObjeto(remoto);
    const rc = r.completadas || {};
    const completadas = {};

    for (const k of [
      "atomos", "densidad", "moleculas", "detective", "misiones"
    ]) {
      completadas[k] = local.completadas[k] || rc[k] === true;
    }

    return {
      puntos: Math.max(Number(local.puntos) || 0, Number(r.puntos) || 0),
      completadas,
      insignias: union(local.insignias, r.insignias),
      casosResueltos: union(local.casosResueltos, r.casosResueltos),
      casosConPuntos: union(local.casosConPuntos, r.casosConPuntos),
      casoActual: Math.max(
        Number(local.casoActual) || 0, Number(r.casoActual) || 0
      )
    };
  }

  async function enviarProgreso() {
    const cuerpo = {
      main_progress: principalLocal(),
      extra_progress: extraLocal()
    };

    const respuesta = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(cuerpo)
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || datos.ok !== true) {
      throw new Error(datos.mensaje || "No se pudo sincronizar el progreso.");
    }
  }

  function programarGuardado() {
    if (silenciar) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      enviarProgreso().catch(error =>
        console.warn("Progreso local conservado; sincronización pendiente.", error)
      );
    }, 700);
  }

  window.addEventListener(
    "aulalab:quimica-progreso-actualizado",
    programarGuardado
  );

  async function iniciar() {
    try {
      const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok || datos.ok !== true) {
        throw new Error(datos.mensaje || "No se pudo consultar el progreso.");
      }

      const remoto = datos.progreso;
      const principal = combinarPrincipal(
        principalLocal(), remoto?.main_progress
      );
      const extra = combinarExtra(
        extraLocal(), remoto?.extra_progress
      );

      silenciar = true;
      try {
        window.AulaLabQuimicaProgreso?.aplicarPrincipal?.(principal);
        window.AulaLabQuimicaProgreso?.aplicarExtra?.(extra);
      } finally {
        silenciar = false;
      }

      await enviarProgreso();
      console.info("Progreso de química sincronizado con AulaLab.");
    } catch (error) {
      console.warn(
        "No se pudo sincronizar con MySQL. El progreso local se conserva.",
        error
      );
    }
  }

  iniciar();
})();
