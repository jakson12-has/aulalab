(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const apiBase = () => window.AULALAB_CONFIG?.API_BASE || "";
  const token = () => sessionStorage.getItem("aulalab_token");
  const selector = $("#institucion");
  const mensaje = $("#mensaje");
  const resultados = $("#resultados");
  const lista = $("#listaDocentes");

  function avisar(texto, tipo = "info") {
    mensaje.className = `alert alert-${tipo}`;
    mensaje.textContent = texto;
  }
  function ocultarAviso() {
    mensaje.className = "alert d-none";
    mensaje.textContent = "";
  }
  async function api(ruta, opciones = {}) {
    const respuesta = await fetch(`${apiBase()}${ruta}`, {
      ...opciones,
      headers: {
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(opciones.headers || {})
      }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || datos.ok === false) throw new Error(datos.mensaje || "No se pudo completar la operación.");
    return datos;
  }
  function elemento(tag, texto, clase) {
    const node = document.createElement(tag);
    if (texto !== undefined) node.textContent = texto;
    if (clase) node.className = clase;
    return node;
  }
  async function cargarInstituciones() {
    if (!token()) {
      location.href = "login.html";
      return;
    }
    const datos = await api("/api/me");
    if (datos.usuario?.rol !== "institution_admin" && datos.usuario?.rol !== "platform_admin") {
      avisar("Tu cuenta no tiene el rol de administración institucional.", "warning");
      selector.replaceChildren(new Option("Sin permisos", ""));
      return;
    }
    const permitidas = (datos.instituciones || []).filter(i =>
      i.rol === "institution_admin" && Number(i.is_active) === 1
    );
    selector.replaceChildren(new Option(
      permitidas.length ? "Seleccioná una institución" : "No tenés instituciones administrables", ""
    ));
    permitidas.forEach(i => selector.add(new Option(i.name, i.id)));
    if (!permitidas.length) {
      avisar("Tu cuenta todavía no tiene una vinculación activa como administrador de una institución. Solicitá la aprobación correspondiente.", "warning");
      return;
    }
    ocultarAviso();
    await cargarDocentes();
  }
  async function cargarDocentes() {
    const id = Number(selector.value);
    resultados.replaceChildren();
    if (!id) {
      lista.textContent = "Seleccioná una institución para cargar los docentes.";
      return;
    }
    const datos = await api(`/api/instituciones/${id}/docentes`);
    const docentes = datos.docentes || [];
    if (!docentes.length) {
      lista.textContent = "Todavía no hay docentes vinculados.";
      return;
    }
    const tabla = elemento("div", undefined, "table-responsive");
    const table = elemento("table", undefined, "table table-striped align-middle");
    const thead = elemento("thead");
    const header = elemento("tr");
    ["Docente", "Correo", "Especialidad"].forEach(t => header.append(elemento("th", t)));
    thead.append(header);
    const tbody = elemento("tbody");
    docentes.forEach(d => {
      const tr = elemento("tr");
      tr.append(elemento("td", `${d.first_name || ""} ${d.last_name || ""}`.trim()));
      tr.append(elemento("td", d.email || ""));
      tr.append(elemento("td", d.specialization || "—"));
      tbody.append(tr);
    });
    table.append(thead, tbody);
    tabla.append(table);
    lista.replaceChildren(tabla);
  }
  $("#formBuscar").addEventListener("submit", async event => {
    event.preventDefault();
    ocultarAviso();
    const id = Number(selector.value);
    const q = $("#busqueda").value.trim();
    if (!id) return avisar("Seleccioná primero una institución.", "warning");
    if (q.length < 2) return avisar("Escribí al menos 2 caracteres.", "warning");
    resultados.textContent = "Buscando…";
    try {
      const datos = await api(`/api/instituciones/${id}/docentes/buscar?q=${encodeURIComponent(q)}`);
      const usuarios = datos.usuarios || [];
      resultados.replaceChildren();
      if (!usuarios.length) {
        resultados.textContent = "No encontramos cuentas docentes activas y aprobadas con esos datos.";
        return;
      }
      usuarios.forEach(u => {
        const row = elemento("div", undefined, "d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 border rounded p-3 mb-2");
        const info = elemento("div");
        info.append(elemento("div", `${u.first_name || ""} ${u.last_name || ""}`.trim(), "fw-semibold"));
        info.append(elemento("div", u.email, "small text-secondary"));
        const btn = elemento("button", "Vincular docente", "btn btn-sm btn-outline-primary");
        btn.type = "button";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            const resultado = await api(`/api/instituciones/${id}/docentes`, {
              method: "POST", body: JSON.stringify({ user_id: u.user_id })
            });
            avisar(resultado.mensaje || "Docente vinculado.", "success");
            row.remove();
            await cargarDocentes();
          } catch (e) {
            avisar(e.message, "danger");
            btn.disabled = false;
          }
        });
        row.append(info, btn);
        resultados.append(row);
      });
    } catch (e) {
      resultados.textContent = "";
      avisar(e.message, "danger");
    }
  });
  selector.addEventListener("change", () => cargarDocentes().catch(e => avisar(e.message, "danger")));
  $("#cerrarSesion").addEventListener("click", () => {
    sessionStorage.removeItem("aulalab_token");
    sessionStorage.removeItem("aulalab_usuario");
    location.href = "login.html";
  });
  cargarInstituciones().catch(e => avisar(e.message, "danger"));
})();
