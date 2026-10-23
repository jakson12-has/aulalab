# AulaLab — paquete de proyecto

Este paquete se reconstruyó a partir del ZIP que compartiste. Conserva los archivos existentes y añade piezas que faltaban para la administración institucional, además de corregir la ubicación del certificado SSL.

## Requisitos
- Node.js 20 o posterior
- MySQL 8 compatible (por ejemplo, Aiven)
- Navegador moderno

## Preparación
1. Descomprimí el ZIP.
2. En `backend`, copiá `.env.example` y renombrá la copia a `.env`.
3. Completá las variables `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PORT` y `JWT_SECRET`.
4. No compartás ni subás el archivo `.env`.
5. El certificado SSL se espera en `backend/certificados/ca.pem`; el paquete coloca allí una copia del `ca.pem` incluido en el ZIP original.
6. En una terminal abierta dentro de `backend`, ejecutá `npm install` y luego `npm start`.
7. Abrí `http://localhost:3000`.

## Base de datos
- `backend/schema.sql` describe el esquema de una instalación nueva.
- Si ya tenés una base de datos con información, no vuelvas a ejecutar el esquema completo a ciegas. Hacé un respaldo y ejecutá `backend/migrations/20261022_compatibilidad_auth_instituciones.sql` en la base correcta. La migración agrega compatibilidad para NIE, aprobación de estudiantes, códigos de activación, progreso y solicitudes administrativas sin borrar tablas ni registros. Si existen NIE duplicados, revisalos antes de crear el índice único.
- No se incluye una copia de tus datos ni credenciales reales de Aiven.

## Administración institucional
- El panel está en `frontend/admin-institucion.html`.
- La cuenta necesita una membresía activa con el rol institucional `institution_admin`.
- Los docentes deben tener rol global `teacher`, estar activos y tener aprobación `approved` (o `NULL` en bases anteriores).
- Un administrador global debe aprobar las solicitudes correspondientes desde las rutas existentes de AulaLab.

## Comprobaciones
- Ejecutá `npm run check` dentro de `backend` para revisar la sintaxis de `server.js`, `database.js` y las tres rutas de backend incluidas en el proyecto.
- `npm start` requiere variables de entorno válidas y un certificado SSL válido.
- Este ZIP no se ha podido probar contra tu instancia real de Aiven ni contra tus cuentas. Por eso no se garantiza que todas las funciones de base de datos estén operativas hasta ejecutar las pruebas en tu entorno.

## Flujo de cuentas
- El registro público crea cuentas docentes pendientes de aprobación; el panel global debe aprobarlas antes de permitir el inicio de sesión.
- Las cuentas estudiantiles se inscriben desde una institución, esperan la aprobación de la inscripción y después se activan con el NIE y el código de activación.
- El acceso al panel institucional se determina por una membresía activa con rol `institution_admin`, aunque el rol global de la persona siga siendo `teacher`.

## Seguridad
No guardes contraseñas, JWT secrets ni credenciales de correo en archivos públicos. Cambiá cualquier secreto que se haya compartido accidentalmente.
