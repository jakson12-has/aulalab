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
- Si ya tenés una base de datos con información, no vuelvas a ejecutar el esquema completo a ciegas. Revisá y ejecutá la migración `backend/migrations/20261022_compatibilidad_auth_instituciones.sql` una sola vez en la base correcta.
- No se incluye una copia de tus datos ni credenciales reales de Aiven.

## Administración institucional
- El panel está en `frontend/admin-institucion.html`.
- La cuenta necesita una membresía activa con el rol institucional `institution_admin`.
- Los docentes deben tener rol global `teacher`, estar activos y tener aprobación `approved` (o `NULL` en bases anteriores).
- Un administrador global debe aprobar las solicitudes correspondientes desde las rutas existentes de AulaLab.

## Comprobaciones
- Ejecutá `npm run check` dentro de `backend` para revisar sintaxis JavaScript.
- `npm start` requiere variables de entorno válidas y un certificado SSL válido.
- Este ZIP no se ha podido probar contra tu instancia real de Aiven ni contra tus cuentas. Por eso no se garantiza que todas las funciones de base de datos estén operativas hasta ejecutar las pruebas en tu entorno.

## Seguridad
No guardes contraseñas, JWT secrets ni credenciales de correo en archivos públicos. Cambiá cualquier secreto que se haya compartido accidentalmente.
