# Documentacion Tecnica - CRM Oportunidades

Fecha de generacion: 2026-05-15  
Repositorio: `C:\aplicativos\oportunidades`

## 1. Resumen ejecutivo

CRM Oportunidades es una aplicacion web tipo backoffice para gestion comercial, contratos empresa, usuarios, roles, permisos y auditoria. La solucion activa esta separada en dos modulos principales:

- `backend`: API REST en Node.js + Express, conectada a SQL Server.
- `Frontend`: SPA React + Vite basada en CoreUI, con autenticacion JWT y control de permisos.

La raiz tambien contiene artefactos historicos o auxiliares (`restore-point-*`, `template-installer`, `packages_instalar_login_server`, `estructura.txt`). No forman parte del runtime principal, pero sirven como respaldo, plantilla o instaladores.

## 2. Arquitectura general

### 2.1 Vista logica

```text
Usuario
  |
  v
Frontend React/Vite/CoreUI
  - HashRouter
  - Redux Toolkit
  - Axios con bearer token y refresh token
  - Vistas protegidas por permisos
  |
  v
Backend Express
  - Helmet, CORS, rate limit
  - JWT access token
  - Refresh token persistido por hash
  - Middlewares de roles/permisos
  - Controladores REST
  - Servicios de negocio
  - Repositorios SQL
  |
  v
SQL Server
  - Seguridad: Users, Roles, SystemModules, RolePermissions
  - Auditoria: AuditLogs, commercial_change_log
  - Comercial: empresa, contacto, lineas, casos, documentos, tablas maestras
  - Contratos empresa: contratos_empresa y asociaciones
```

### 2.2 Estilo arquitectonico

- Frontend SPA: React con rutas lazy-loaded, layout principal autenticado y navegacion dinamica.
- Backend modular: rutas -> controladores -> servicios -> repositorios/base de datos.
- Persistencia relacional: SQL Server con scripts idempotentes para gran parte del esquema comercial.
- Seguridad por permisos: combinacion de roles (`Super Admin`, `Admin`, `User`) y matriz por modulo/accion.
- Auditoria dual:
  - `dbo.AuditLogs`: eventos de seguridad y operaciones generales.
  - `dbo.commercial_change_log`: cambios campo a campo en mantenedores comerciales.

## 3. Stack tecnologico

### 3.1 Backend

- Node.js CommonJS.
- Express 4.
- SQL Server via `mssql` y `msnodesqlv8`.
- JWT con `jsonwebtoken`.
- Hash de passwords con `bcrypt`.
- SMTP con `nodemailer`.
- Seguridad HTTP con `helmet`, `cors`, `express-rate-limit`, `cookie-parser`.
- Validacion HTTP con `express-validator`.

### 3.2 Frontend

- React 19.
- Vite 7.
- CoreUI React 5.
- Redux Toolkit + React Redux.
- React Router DOM 7 con `HashRouter`.
- Axios.
- React Hook Form + Yup.
- Exportacion Excel/PDF con `xlsx`, `jspdf`, `jspdf-autotable`.
- Sass.

## 4. Estructura de carpetas

```text
.
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- database/
|   |   |-- migrations/
|   |-- middlewares/
|   |-- models/
|   |-- repositories/
|   |-- routes/
|   |-- scripts/
|   |-- security/
|   |-- seed/
|   |-- services/
|   |-- uploads/
|   |-- utils/
|   |-- app.js
|   |-- server.js
|   |-- package.json
|   |-- .env
|   |-- .env.example
|
|-- Frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- layout/
|   |   |-- routes/
|   |   |-- scss/
|   |   |-- services/
|   |   |-- store/
|   |   |-- utils/
|   |   |-- views/
|   |   |-- App.js
|   |   |-- index.js
|   |   |-- routes.js
|   |   |-- _nav.js
|   |-- vite.config.mjs
|   |-- package.json
|   |-- .env.local
|
|-- README-commercial-module.md
|-- README.md
|-- AGENTS.md
|-- .gitignore
|-- DOCUMENTACION_TECNICA.md
```

Carpetas no runtime principal:

- `node_modules/`: dependencias instaladas.
- `Frontend/build/`: salida compilada de Vite.
- `restore-point-*`: respaldos de versiones anteriores.
- `template-installer/`: plantilla base/instalador.
- `packages_instalar_login_server/`: paquete instalador de login/auth.

## 5. Diccionario de archivos

### 5.1 Raiz

| Archivo/carpeta | Proposito |
|---|---|
| `.gitignore` | Excluye `node_modules`, `build`, `.env`, logs y otros artefactos. |
| `README.md` | README minimo del repo. |
| `README-commercial-module.md` | Guia historica del modulo comercial, migracion, endpoints y extension del CRUD generico. |
| `AGENTS.md` | Archivo reservado para instrucciones/agentes; actualmente sin contenido relevante. |
| `estructura.txt` | Inventario/volcado de estructura, no usado por runtime. |
| `qc` | Artefacto auxiliar sin participacion directa en runtime. |
| `DOCUMENTACION_TECNICA.md` | Este documento. |

### 5.2 Backend - entrada y configuracion

| Archivo | Proposito |
|---|---|
| `backend/package.json` | Scripts y dependencias del backend. |
| `backend/server.js` | Punto de arranque. Antes de escuchar el puerto consulta `/api/health`; si ya hay backend activo, imprime `Backend already running`. Ejecuta migraciones startup con `ensureSchema()`. |
| `backend/app.js` | Construye la app Express, configura middlewares globales, rutas API, estaticos de `/uploads` y manejador central de errores SQL. |
| `backend/config/env.js` | Carga `.env`, valida variables requeridas y normaliza configuracion de puerto, CORS, SQL Server, SMTP, JWT y seguridad. |
| `backend/.env.example` | Plantilla de variables de entorno. |
| `backend/.env` | Configuracion local real. No debe versionarse ni copiarse a documentacion por contener secretos. |

### 5.3 Backend - base de datos

| Archivo | Proposito |
|---|---|
| `backend/database/db.js` | Conexion SQL Server. Soporta autenticacion integrada Windows (`msnodesqlv8`) o SQL Auth (`mssql`). Expone `query`, `getPool` y `sql`. |
| `backend/database/ensureSchema.js` | Ejecuta migraciones minimas al iniciar: `AuditLogs` y `RefreshTokens`. |
| `backend/database/auth-schema.sql` | Script destructivo/base para crear esquema de seguridad: roles, usuarios, modulos, permisos, auditoria y refresh tokens. |
| `backend/database/seed-auth.sql` | Semilla de roles, usuario admin y modulos. |
| `backend/database/commercial-schema.sql` | Crea/actualiza tablas comerciales base y datos maestros. |
| `backend/database/migrations/*.sql` | Migraciones incrementales para foto de usuario, permisos, contratos empresa, autonumeracion, relaciones y tablas de auditoria/token. |

### 5.4 Backend - rutas

| Archivo | Proposito |
|---|---|
| `backend/routes/authRoutes.js` | Endpoints de login, 2FA, recuperacion, cambio/reset de password, refresh y logout. |
| `backend/routes/usersRoutes.js` | CRUD de usuarios, perfil propio, toggle 2FA y toggle estado. |
| `backend/routes/rolesRoutes.js` | CRUD de roles y administracion de permisos por rol. |
| `backend/routes/auditRoutes.js` | Consulta de auditoria y tipos de accion. |
| `backend/routes/commercialRoutes.js` | CRUD generico comercial por recurso, lookups, uploads y log de cambios. |
| `backend/routes/contratosEmpresaRoutes.js` | Modulo especializado de contratos empresa: listado, detalle, metricas, reserva/liberacion de codigo y asociaciones. |

### 5.5 Backend - controladores

| Archivo | Proposito |
|---|---|
| `backend/controllers/authController.js` | Orquesta login, bloqueo por intentos, 2FA por email, generacion JWT, refresh tokens, logout y passwords. |
| `backend/controllers/usersController.js` | Listado paginado/filtrado de usuarios, CRUD, perfil propio y toggles. |
| `backend/controllers/rolesController.js` | CRUD de roles y lectura/guardado de matriz de permisos. |
| `backend/controllers/auditController.js` | Consulta paginada de `AuditLogs` y lista de `ActionType`. |
| `backend/controllers/commercialController.js` | Adaptador HTTP para el CRUD comercial generico y auditoria comercial. |
| `backend/controllers/contratosEmpresaController.js` | Adaptador HTTP para el servicio especializado de contratos empresa. |

### 5.6 Backend - servicios, repositorios y modelos

| Archivo | Proposito |
|---|---|
| `backend/models/commercialModel.js` | Metadata del CRUD generico: recursos, tablas, campos, validaciones, joins, dependencias y lookups. |
| `backend/repositories/commercialRepository.js` | SQL generico para listar, buscar, ordenar, paginar, crear, actualizar, eliminar, lookups y cambio-log. |
| `backend/services/commercialService.js` | Reglas del CRUD comercial: validaciones, casteo, RUT chileno, duplicados, dependencias antes de borrar, uploads y change log. |
| `backend/services/contratosEmpresaService.js` | Reglas especializadas: codigo `CEMP00000001`, reservas, CRUD, metricas, asociaciones a lineas/casos/documentos y eliminacion en cascada controlada. |
| `backend/services/permissionService.js` | Sincroniza modulos del sistema, normaliza permisos y evalua `hasPermission`/`hasAnyPermission`. |
| `backend/services/auditService.js` | Inserta eventos en `dbo.AuditLogs`. |
| `backend/services/mailService.js` | Envio SMTP; si no hay `SMTP_HOST`, omite envio y retorna `skipped`. |
| `backend/security/permissionModules.js` | Catalogo canonico de modulos protegibles y rutas de menu. |

### 5.7 Backend - middlewares y utilidades

| Archivo | Proposito |
|---|---|
| `backend/middlewares/authMiddleware.js` | Valida `Authorization: Bearer <token>` y adjunta `req.user`. |
| `backend/middlewares/permissionMiddleware.js` | Requiere permisos por modulo/accion o rol administrador de seguridad. |
| `backend/middlewares/roleMiddleware.js` | Requiere pertenencia a roles concretos. |
| `backend/utils/tokens.js` | Firma/verifica access/refresh tokens y hashea refresh token con SHA-256. |
| `backend/utils/random.js` | Genera codigos 2FA y passwords temporales. |
| `backend/utils/rutChile.js` | Valida y formatea RUT chileno. |
| `backend/utils/sqlErrors.js` | Traduce errores SQL comunes a respuestas HTTP amigables: conexion, permisos y duplicados. |
| `backend/utils/asyncHandler.js` | Wrapper para propagar errores async a Express. |

### 5.8 Backend - scripts

| Archivo | Proposito |
|---|---|
| `backend/seed/seed-admin.js` | Recrea esquema auth, aplica semilla y deja usuario `admin` con password temporal inicial. |
| `backend/seed/run-commercial-migration.js` | Ejecuta `commercial-schema.sql`. |
| `backend/scripts/test-smtp.js` | Verifica SMTP enviando email de prueba. |
| `backend/scripts/qa-commercial-flow.js` | Script QA de flujo comercial via API. |
| `backend/scripts/qa-contract-search-cdp.js` | QA automatizado con Chrome DevTools Protocol. |
| `backend/scripts/seed-qa-dashboard-contracts.js` | Datos QA para dashboard/contratos. |
| `backend/scripts/seed-qa-dashboard-extra-contracts.js` | Datos QA adicionales. |
| `backend/scripts/grant-app-user.sql` | Script SQL para permisos del usuario de app. |
| `backend/scripts/system-sql-grant.ps1` | Helper PowerShell para grants SQL. |

### 5.9 Frontend - entrada, rutas y estado

| Archivo | Proposito |
|---|---|
| `Frontend/package.json` | Scripts y dependencias de React/Vite. |
| `Frontend/vite.config.mjs` | Configura Vite: puerto 3000, build en `build`, alias `src/`, soporte JSX en `.js`. |
| `Frontend/index.html` | HTML shell. |
| `Frontend/src/index.js` | Montaje React y proveedores globales. |
| `Frontend/src/App.js` | Raiz SPA con `HashRouter`, rutas publicas y layout protegido. |
| `Frontend/src/routes.js` | Catalogo de rutas protegidas y `permissionKey`. |
| `Frontend/src/routes/ProtectedRoutes.jsx` | Redirige a `/login` si no hay access token. |
| `Frontend/src/_nav.js` | Configuracion de sidebar con grupos, iconos y permisos. |
| `Frontend/src/store.js` | Store Redux con slices `theme`, `auth`, `ui`. |
| `Frontend/src/store/authSlice.js` | Guarda sesion en `localStorage` bajo `crm_oportunidades_auth`. |
| `Frontend/src/store/themeSlice.js` | Estado de tema CoreUI. |
| `Frontend/src/store/uiSlice.js` | Estado UI global. |

### 5.10 Frontend - servicios y utilidades

| Archivo | Proposito |
|---|---|
| `Frontend/src/services/api.js` | Cliente Axios. Agrega bearer token y reintenta 401 mediante `/api/auth/refresh-token`. |
| `Frontend/src/services/authService.js` | Funciones HTTP para login, 2FA, forgot/reset/change password y logout. |
| `Frontend/src/utils/permissions.js` | Evalua permisos en cliente y helpers de seguridad. |
| `Frontend/src/utils/export.js` | Exporta Excel/PDF y construye filtros de fecha UTC. |
| `Frontend/src/utils/gridSort.js` | Helpers de ordenamiento de grillas. |
| `Frontend/src/utils/gridKeyboard.js` | Helpers de teclado para busquedas/grillas. |
| `Frontend/src/utils/formNavigation.js` | Navegacion por Enter/foco en formularios. |

### 5.11 Frontend - componentes compartidos

| Archivo/carpeta | Proposito |
|---|---|
| `Frontend/src/components/AppContent.js` | Renderiza rutas protegidas y muestra alerta si falta permiso. |
| `Frontend/src/components/AppSidebar.js` | Sidebar principal. |
| `Frontend/src/components/AppSidebarNav.js` | Filtra items de menu segun permisos. |
| `Frontend/src/components/AppHeader.js` | Header principal. |
| `Frontend/src/components/AppFooter.js` | Footer principal. |
| `Frontend/src/components/AppBreadcrumb.js` | Breadcrumbs. |
| `Frontend/src/components/AuthSplitLayout.js` | Layout de pantallas de autenticacion. |
| `Frontend/src/components/ErrorBoundary.jsx` | Captura errores de renderizado por ruta/componente. |
| `Frontend/src/components/ToastProvider.jsx` | Notificaciones globales. |
| `Frontend/src/components/GridPaginationBar.jsx` | Paginacion reutilizable. |
| `Frontend/src/components/GridColumnPicker.jsx` | Seleccion de columnas. |
| `Frontend/src/components/SortableTableHeader.jsx` | Header ordenable para tablas. |
| `Frontend/src/components/ExportModal.jsx` | Modal de configuracion de exportacion. |
| `Frontend/src/components/MacDateInput.jsx` | Input fecha/hora estilizado. |

### 5.12 Frontend - vistas relevantes

| Archivo/carpeta | Proposito |
|---|---|
| `Frontend/src/views/pages/login/Login.js` | Login con username/email y password. |
| `Frontend/src/views/pages/verify2fa/Verify2FA.js` | Verificacion de codigo 2FA. |
| `Frontend/src/views/pages/forgot-password/ForgotPassword.js` | Solicitud de password temporal. |
| `Frontend/src/views/pages/reset-password/ResetPassword.js` | Cambio obligatorio tras password temporal. |
| `Frontend/src/views/profile/MyProfile.js` | Perfil propio. |
| `Frontend/src/views/profile/ChangePassword.js` | Cambio de password autenticado. |
| `Frontend/src/views/admin/users/UserManagement.js` | Administracion de usuarios. |
| `Frontend/src/views/admin/roles/RolesManagement.js` | Administracion de roles y matriz de permisos. |
| `Frontend/src/views/admin/audit/AuditLogsManagement.js` | Consulta/exportacion de auditoria. |
| `Frontend/src/views/dashboard/Dashboard.js` | Dashboard basado en metricas de contratos empresa. |
| `Frontend/src/views/commercial/commercialConfig.js` | Metadata visual de mantenedores comerciales. |
| `Frontend/src/views/commercial/CommercialModule.js` | Mantenedor generico: listar, buscar, crear, editar, detalle, borrar, historial, exportar y subir archivos. |
| `Frontend/src/views/commercial/rutChile.js` | Validacion/formato RUT en cliente. |
| `Frontend/src/views/commercial/chileLocations.js` | Regiones, ciudades y comunas para formularios. |
| `Frontend/src/views/contract-company/ContratoEmpresa.js` | Pantalla funcional especializada de contratos empresa: cabecera, empresa, contacto, lineas, casos, documentos, exportacion y numeracion. |
| `Frontend/src/views/base`, `buttons`, `forms`, `icons`, `notifications`, `widgets`, `theme`, `charts` | Vistas heredadas/demo de CoreUI, algunas permanecen accesibles por rutas de plantilla. |

## 6. Flujo del sistema

### 6.1 Arranque backend

1. `npm start` ejecuta `node --disable-warning=DEP0169 server.js`.
2. `server.js` consulta `http://localhost:<PORT>/api/health`.
3. Si ya responde un backend sano, imprime `Backend already running on http://localhost:<PORT>` y termina.
4. Si no hay instancia activa, ejecuta `ensureSchema()`.
5. `ensureSchema()` aplica migraciones startup para `AuditLogs` y `RefreshTokens`.
6. Express escucha en `env.port`.

Nota: el puerto por defecto en codigo es `4000`, pero `Frontend/.env.local` apunta a `http://localhost:4001`. En ambiente local conviene alinear `backend/.env PORT=4001` o cambiar `VITE_API_BASE_URL`.

### 6.2 Arranque frontend

1. `npm start` en `Frontend` levanta Vite en `http://localhost:3000`.
2. `App.js` inicializa `HashRouter` y tema CoreUI.
3. Las rutas publicas son login, 2FA, forgot/reset password y paginas 404/500.
4. El resto queda envuelto en `ProtectedRoutes`; sin token redirige a `/login`.
5. `DefaultLayout` monta sidebar, header, contenido y footer.

### 6.3 Login sin 2FA

1. Frontend envia `POST /api/auth/login`.
2. Backend busca usuario por `Username` o `Email`.
3. Valida estado activo, bloqueo y password bcrypt.
4. Genera access token JWT y refresh token JWT.
5. Guarda hash SHA-256 del refresh token en `dbo.RefreshTokens`.
6. Devuelve tokens, usuario y mapa de permisos.
7. Frontend persiste sesion en `localStorage`.
8. Si `tempPassword=true`, redirige a `/reset-password`; si no, a `/dashboard`.

### 6.4 Login con 2FA

1. Si `TwoFactorEnabled=1`, backend genera codigo numerico de 6 digitos.
2. Guarda codigo y expiracion en `dbo.Users`.
3. Envia correo por SMTP. En desarrollo, si SMTP no esta configurado, loguea advertencia.
4. Frontend guarda `userId` temporal en `sessionStorage` y redirige a `/verify-2fa`.
5. `POST /api/auth/verify-2fa` valida codigo y emite tokens.

### 6.5 Refresh token

1. Axios detecta respuesta `401`.
2. Si no es un retry previo, llama `POST /api/auth/refresh-token`.
3. Backend verifica firma del refresh token y que su hash exista, no este revocado y no este vencido.
4. Devuelve nuevo access token.
5. Axios reintenta la request original.
6. Si falla el refresh, limpia sesion local.

### 6.6 Autorizacion por permisos

Backend:

- `authRequired` valida JWT.
- `requirePermission(moduleKey, action)` consulta `RolePermissions`.
- `requireAnyPermission(prefix, action)` permite si hay al menos un modulo con ese prefijo.
- `requireSecurityAdmin` permite solo `Super Admin` o `Admin`.
- `Super Admin` tiene bypass logico en `permissionService`.

Frontend:

- `AppSidebarNav` oculta menus sin permiso de lectura.
- `AppContent` muestra alerta si se intenta acceder a una ruta sin permiso.
- Las vistas calculan `canCreate`, `canRead`, `canWrite`, `canDelete` para habilitar/deshabilitar acciones.

### 6.7 CRUD comercial generico

1. La vista `CommercialModule` identifica el recurso desde la URL (`/commercial/:resource`).
2. Usa `commercialConfig.js` para labels, campos, secciones, columnas y lookups.
3. Carga combos con `GET /api/commercial/lookups`.
4. Lista con `GET /api/commercial/:resource?page&pageSize&q&sortBy&sortDir`.
5. Crea/actualiza/elimina con `POST`, `PUT`, `DELETE`.
6. Backend valida metadata de `commercialModel.js`, tipos, requeridos y RUT.
7. `commercialRepository.js` construye SQL generico con joins, paginacion y busqueda.
8. Cambios se registran en `commercial_change_log`.

### 6.8 Flujo contratos empresa

1. Usuario entra a `/contratos-empresa`.
2. La vista carga `GET /api/contratos-empresa/lookups`.
3. Al crear, puede reservar codigo con `POST /api/contratos-empresa/reserve-code`.
4. El codigo tiene formato `CEMP########`, por ejemplo `CEMP00000001`.
5. La creacion guarda cabecera en `dbo.contratos_empresa`.
6. Lineas, casos y documentos se pueden crear desde mantenedores o modales integrados.
7. Las asociaciones se mantienen con:
   - `dbo.contrato_empresa_lineas`
   - `dbo.contrato_empresa_casos`
   - `dbo.contrato_empresa_documentos`
8. Al asociar, tambien se actualiza `contrato_empresa_id` en la tabla hija.
9. Al eliminar un contrato empresa desde el modulo especializado, el servicio borra asociaciones e hijos relacionados antes de borrar cabecera.

## 7. Endpoints API

Base URL local esperada por frontend actual: `http://localhost:4001` segun `Frontend/.env.local`.  
Base path API: `/api`.

### 7.1 Health

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/health` | No | Estado del backend y puerto. |

### 7.2 Auth

| Metodo | Ruta | Auth | Body principal | Descripcion |
|---|---|---|---|---|
| POST | `/api/auth/login` | No | `login`, `password` | Autentica por username/email. Puede requerir 2FA. |
| POST | `/api/auth/verify-2fa` | No | `userId`, `code` | Verifica codigo 2FA y emite tokens. |
| POST | `/api/auth/forgot-password` | No | `email` | Genera password temporal y lo envia por correo. |
| POST | `/api/auth/reset-password` | Si | `newPassword` | Cambia password cuando `TempPassword=1`. |
| POST | `/api/auth/change-password` | Si | `currentPassword`, `newPassword` | Cambio normal de password. |
| POST | `/api/auth/refresh-token` | No | `refreshToken` | Emite nuevo access token. |
| POST | `/api/auth/logout` | Si | `refreshToken` | Revoca refresh token. |

### 7.3 Usuarios

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/api/users/me` | Usuario autenticado | Perfil propio y permisos. |
| PUT | `/api/users/me` | Usuario autenticado | Actualiza email, nombres y foto propia. |
| GET | `/api/users` | `admin.users:read` | Lista paginada con filtros `page`, `pageSize`, `q`, `role`, `sortBy`, `sortDir`, `dateFrom`, `dateTo`. |
| GET | `/api/users/:id` | `admin.users:read` | Obtiene usuario. |
| POST | `/api/users` | `admin.users:create` | Crea usuario. |
| PUT | `/api/users/:id` | `admin.users:write` | Actualiza usuario. |
| DELETE | `/api/users/:id` | `admin.users:delete` | Elimina usuario. |
| PATCH | `/api/users/:id/toggle-2fa` | `admin.users:write` | Activa/desactiva 2FA. |
| PATCH | `/api/users/:id/toggle-status` | `admin.users:write` | Activa/desactiva usuario. |

### 7.4 Roles y permisos

| Metodo | Ruta | Permiso/Rol | Descripcion |
|---|---|---|---|
| GET | `/api/roles` | `Super Admin` o `Admin` | Lista roles. |
| POST | `/api/roles` | `Super Admin` | Crea rol. |
| PUT | `/api/roles/:id` | `Super Admin` | Actualiza rol. |
| DELETE | `/api/roles/:id` | `Super Admin` | Elimina rol. |
| GET | `/api/roles/:id/permissions` | Security admin | Obtiene matriz de permisos del rol. |
| PUT | `/api/roles/:id/permissions` | Security admin | Guarda matriz de permisos. |

Security admin significa rol `Super Admin` o `Admin`.

### 7.5 Auditoria

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/api/audit` | `admin.audit:read` | Lista eventos con filtros de usuario, accion, fechas y paginacion. |
| GET | `/api/audit/action-types` | `admin.audit:read` | Lista acciones distintas. |

### 7.6 Comercial generico

Todas las rutas requieren JWT. El permiso se calcula como `commercial.<resource>:<action>`.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/api/commercial/lookups` | Cualquier `commercial.*:read` | Combos/listas maestras. |
| POST | `/api/commercial/uploads` | Cualquier `commercial.*:create` | Sube archivo base64 permitido a `backend/uploads/commercial`. |
| GET | `/api/commercial/logs/:resource/:id` | `commercial.<resource>:read` | Historial de cambios del registro. |
| GET | `/api/commercial/:resource` | `commercial.<resource>:read` | Lista paginada. |
| GET | `/api/commercial/:resource/:id` | `commercial.<resource>:read` | Detalle. |
| POST | `/api/commercial/:resource` | `commercial.<resource>:create` | Crea registro. |
| PUT | `/api/commercial/:resource/:id` | `commercial.<resource>:write` | Actualiza registro. |
| DELETE | `/api/commercial/:resource/:id` | `commercial.<resource>:delete`; en `contratos_empresa` tambien security admin | Elimina registro si no hay dependencias. |

Recursos genericos:

- `empresas`
- `contactos`
- `contratos_empresa`
- `lineas`
- `casos`
- `documentos`
- `categorias`
- `tipo_contactos`
- `estado_contactos`
- `estado_vitales`
- `estados_ctr`
- `tipo_servicios`
- `tipo_tarifas`
- `frecuencias`

Parametros comunes de listado:

- `page`: pagina, minimo 1.
- `pageSize`: entre 10 y 100.
- `q`: busqueda normalizada.
- `sortBy`: campo de orden permitido por metadata.
- `sortDir`: `asc` o `desc`.
- `dateFrom`, `dateTo`: filtro por `fecha_creacion` o `created_at` si el recurso lo tiene.

### 7.7 Contratos empresa especializado

Todas las rutas requieren JWT y permisos sobre `commercial.contratos_empresa`.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/api/contratos-empresa/lookups` | read | Lookups enriquecidos para pantalla funcional. |
| GET | `/api/contratos-empresa/metrics` | read | Metricas por usuario, semana y mes para dashboard. |
| POST | `/api/contratos-empresa/reserve-code` | create | Reserva proximo codigo `CEMP########` para el usuario. |
| POST | `/api/contratos-empresa/release-code` | create | Libera codigo reservado. |
| GET | `/api/contratos-empresa` | read | Lista paginada con busqueda. |
| GET | `/api/contratos-empresa/:id` | read | Detalle con lineas, casos y documentos. |
| POST | `/api/contratos-empresa` | create | Crea contrato empresa. |
| PUT | `/api/contratos-empresa/:id` | write | Actualiza contrato empresa y sincroniza asociaciones. |
| DELETE | `/api/contratos-empresa/:id` | delete + security admin | Elimina contrato y relacionados controlados. |
| POST | `/api/contratos-empresa/:id/:type` | write | Asocia `lineas`, `casos` o `documentos`; body `{ id }`. |
| DELETE | `/api/contratos-empresa/:id/:type/:relatedId` | write | Desasocia `lineas`, `casos` o `documentos`. |

Parametros de listado:

- `page`, `pageSize`, `q`, `searchMode`, `sortBy`, `sortDir`, `dateFrom`, `dateTo`.
- `searchMode=header` limita busqueda a codigo, empresa y RUT.

## 8. Base de datos

### 8.1 Conexion

El backend usa SQL Server. Hay dos modos:

- Autenticacion integrada Windows:
  - `DB_INTEGRATED=true`
  - Usa `mssql/msnodesqlv8`.
  - Requiere driver ODBC y contexto Windows correcto.
- SQL Auth:
  - `DB_INTEGRATED=false`
  - Usa `DB_USER` y `DB_PASSWORD`.

La base por defecto es `oportunidades`.

### 8.2 Tablas de seguridad

| Tabla | Proposito |
|---|---|
| `dbo.Roles` | Roles del sistema. Campos clave: `RoleId`, `RoleName`, `Description`, `IsActive`. |
| `dbo.Users` | Usuarios. Incluye credenciales bcrypt, datos personales, estado, 2FA, bloqueo, password temporal y rol. |
| `dbo.SystemModules` | Catalogo de modulos protegibles. |
| `dbo.RolePermissions` | Matriz rol-modulo con `CanCreate`, `CanRead`, `CanWrite`, `CanDelete`. |
| `dbo.AuditLogs` | Eventos generales: login, usuarios, roles, permisos, acciones comerciales. |
| `dbo.RefreshTokens` | Refresh tokens por usuario, guardados como hash SHA-256, con expiracion y revocacion. |

Relaciones principales:

- `Users.RoleId -> Roles.RoleId`
- `RolePermissions.RoleId -> Roles.RoleId`
- `RolePermissions.ModuleKey -> SystemModules.ModuleKey`
- `AuditLogs.UserId -> Users.UserId`
- `RefreshTokens.UserId -> Users.UserId`

### 8.3 Tablas comerciales base

| Tabla | PK | Proposito |
|---|---|---|
| `dbo.categoria` | `id_categoria` | Categoria de empresa/contrato. |
| `dbo.tipo_contacto` | `id_tipo_contacto` | Tipo comercial/tecnico/finanzas/legal, etc. |
| `dbo.estado_contacto` | `id_estado_contacto` | Estado del contacto. |
| `dbo.estado_vital` | `id_estado_vital` | Estado vital de contrato. |
| `dbo.estado_ctr` | `id_estado_ctr` | Estado de contrato: activo, borrador, nulo, cancelado. |
| `dbo.tipo_servicio` | `id_tipo_servicio` | Tipos de servicio. |
| `dbo.tipo_tarifa` | `id_tipo_tarifa` | Fija, variable, mixta, consumo. |
| `dbo.frecuencia_facturacion` | `id_frecuencia` | Mensual, bimestral, trimestral, etc. |
| `dbo.empresa` | `rut` | Empresas con razon social, datos comerciales y ubicacion. |
| `dbo.contacto` | `id_contacto` | Contactos independientes, con tipo/estado y datos de comunicacion. |
| `dbo.linea` | `id_linea` | Lineas de contrato con servicio, tarifa, frecuencia, divisa y valores. |
| `dbo.caso` | `id_caso` | Casos asociados a contacto y contrato empresa. |
| `dbo.documentos` | `id_documento` | Documentos/archivos asociados a contrato empresa. |
| `dbo.commercial_change_log` | `id_log` | Auditoria campo a campo de mantenedores comerciales. |

Relaciones comerciales relevantes:

- `empresa.id_categoria -> categoria.id_categoria`
- `contacto.id_tipo_contacto -> tipo_contacto.id_tipo_contacto`
- `contacto.id_estado_contacto -> estado_contacto.id_estado_contacto`
- `linea.id_tipo_servicio -> tipo_servicio.id_tipo_servicio`
- `linea.id_tipo_tarifa -> tipo_tarifa.id_tipo_tarifa`
- `linea.id_frecuencia -> frecuencia_facturacion.id_frecuencia`
- `linea.contrato_empresa_id -> contratos_empresa.id`
- `caso.id_contacto -> contacto.id_contacto`
- `caso.contrato_empresa_id -> contratos_empresa.id`
- `documentos.contrato_empresa_id -> contratos_empresa.id`

Campos de auditoria agregados a la mayoria de tablas comerciales:

- `fecha_creacion`
- `fecha_actualizacion`
- `usuario_creacion_id`

### 8.4 Contratos empresa

| Tabla | Proposito |
|---|---|
| `dbo.contratos_empresa` | Cabecera funcional del contrato empresa. |
| `dbo.contrato_empresa_lineas` | Tabla puente contrato-lineas. |
| `dbo.contrato_empresa_casos` | Tabla puente contrato-casos. |
| `dbo.contrato_empresa_documentos` | Tabla puente contrato-documentos. |
| `dbo.contrato_empresa_codigo_reservas` | Reservas temporales de codigos `CEMP########`. |

Campos principales de `dbo.contratos_empresa`:

- `id`
- `numero_contrato_empresa`
- `codigo_contrato_empresa`
- `rut_empresa`
- `id_categoria`
- `id_tipo_servicio`
- `id_estado_vital`
- `id_estado_ctr`
- `titulo`
- `fecha_firma`, `fecha_inicio`, `fecha_termino`, `fecha_facturacion`
- `medio_pago`
- `reajustable`
- `multa`
- `requiere_orden_compra`
- `id_frecuencia`
- `id_tipo_tarifa`
- `id_contacto`
- `id_tipo_contacto`
- `id_estado_contacto`
- `activo`
- `created_at`, `updated_at`
- `created_by`, `updated_by`

Indices destacados:

- `UX_contratos_empresa_numero`
- `UX_contratos_empresa_codigo`
- `UX_contrato_empresa_codigo_reservas_numero`
- `UX_contrato_empresa_codigo_reservas_codigo`
- indices por FK y por `activo`.

### 8.5 Datos maestros sembrados

`commercial-schema.sql` inserta si no existen:

- Categorias: Cliente, Proveedor, Partner, Prospecto.
- Tipos de contacto: Comercial, Tecnico, Finanzas, Legal.
- Estados de contacto: Activo, Inactivo, No contactar, Pendiente.
- Estados vitales: Borrador, Vigente, Por vencer, Vencido, Cerrado.
- Estados de contrato: Activo, Borrador, Nulo, Cancelado.
- Tipos de servicio: Servicio recurrente, Servicio puntual, Soporte, Licencia, Implementacion.
- Tipos de tarifa: Fija, Variable, Mixta, Por consumo.
- Frecuencias: Mensual, Bimestral, Trimestral, Semestral, Anual, Unica.

## 9. Dependencias

### 9.1 Backend principales

| Dependencia | Uso |
|---|---|
| `express` | API REST. |
| `mssql` | Conexion SQL Server con SQL Auth. |
| `msnodesqlv8` | Conexion SQL Server con autenticacion integrada Windows. |
| `bcrypt` | Hash/verificacion de passwords. |
| `jsonwebtoken` | Access y refresh JWT. |
| `nodemailer` | Envio de correos 2FA/recuperacion. |
| `dotenv` | Carga `.env`. |
| `helmet` | Headers HTTP seguros. |
| `cors` | CORS con allowlist de origenes. |
| `express-rate-limit` | Limite global de requests. |
| `express-validator` | Validacion de body. |
| `cookie-parser` | Parseo de cookies, aunque la sesion actual usa bearer tokens. |

### 9.2 Frontend principales

| Dependencia | Uso |
|---|---|
| `react`, `react-dom` | SPA. |
| `react-router-dom` | Rutas cliente. |
| `@reduxjs/toolkit`, `react-redux` | Estado global. |
| `axios` | HTTP API. |
| `@coreui/react`, `@coreui/icons-react`, `@coreui/coreui` | UI/admin template. |
| `react-hook-form`, `yup`, `@hookform/resolvers` | Formularios y validacion. |
| `chart.js`, `@coreui/react-chartjs` | Dashboard/graficos. |
| `xlsx` | Exportacion Excel. |
| `jspdf`, `jspdf-autotable` | Exportacion PDF. |
| `sass` | Estilos SCSS. |
| `vite`, `@vitejs/plugin-react` | Dev server y build. |

## 10. Variables de entorno

### 10.1 Backend (`backend/.env`)

| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Ambiente. En `production` evita filtrar errores internos. |
| `PORT` | No | `4000` | Puerto backend. Para este entorno local debe alinearse con `4001` si el frontend apunta alli. |
| `APP_ORIGIN` | No | `http://localhost:3000` | Origenes CORS permitidos, separados por coma. |
| `TRUST_PROXY` | No | `false` | Configura `app.set('trust proxy')`. Usar `1` detras de proxy simple. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Ventana del rate limit. |
| `RATE_LIMIT_MAX` | No | `2000` | Maximo de requests por ventana. |
| `DB_DATABASE` | No | `oportunidades` | Base SQL Server. |
| `DB_SERVER` | Si | - | Host/instancia SQL Server. |
| `DB_PORT` | No | `1433` | Puerto SQL Server. |
| `DB_ENCRYPT` | No | `true` | Cifrado de conexion SQL. |
| `DB_INTEGRATED` | No | `false` | `true` para Windows Auth. |
| `DB_USER` | Condicional | - | Usuario SQL si `DB_INTEGRATED=false`. |
| `DB_PASSWORD` | Condicional | - | Password SQL si `DB_INTEGRATED=false`. |
| `DB_ODBC_DRIVER` | No | `ODBC Driver 18 for SQL Server` | Driver para autenticacion integrada. |
| `SMTP_HOST` | No | vacio | Host SMTP. Sin valor se omiten emails en desarrollo. |
| `SMTP_PORT` | No | `587` | Puerto SMTP. |
| `SMTP_USER` | No | vacio | Usuario SMTP. |
| `SMTP_PASS` | No | vacio | Password SMTP. |
| `MAIL_FROM` | No | vacio | Remitente. |
| `JWT_SECRET` | Si* | - | Secreto access token. En seed puede usar fallback temporal. |
| `JWT_REFRESH_SECRET` | Si* | - | Secreto refresh token. En seed puede usar fallback temporal. |
| `SEED_MODE` | No | `false` | Permite secretos fallback para procesos seed. |

### 10.2 Frontend (`Frontend/.env.local`)

| Variable | Requerida | Default en codigo | Descripcion |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:4000` | URL base para Axios. En este workspace esta en `http://localhost:4001`. |

## 11. Comandos de operacion

### 11.1 Instalar dependencias

```powershell
cd C:\aplicativos\oportunidades\backend
npm install

cd C:\aplicativos\oportunidades\Frontend
npm install
```

### 11.2 Levantar backend

```powershell
cd C:\aplicativos\oportunidades\backend
npm start
```

Scripts backend disponibles:

```text
npm run dev
npm start
npm run seed
npm run migrate:commercial
npm run seed:qa-dashboard
npm run seed:qa-dashboard-extra
npm run test:smtp
```

### 11.3 Levantar frontend

```powershell
cd C:\aplicativos\oportunidades\Frontend
npm start
```

Scripts frontend disponibles:

```text
npm start
npm run build
npm run serve
npm run lint
```

### 11.4 Migraciones/seed

Auth y usuario inicial:

```powershell
cd C:\aplicativos\oportunidades\backend
npm run seed
```

Comercial:

```powershell
cd C:\aplicativos\oportunidades\backend
npm run migrate:commercial
```

Advertencia: `auth-schema.sql` elimina y recrea tablas de seguridad si se ejecuta completo. Usarlo con cuidado fuera de ambientes de desarrollo.

## 12. Guia de mantenimiento

### 12.1 Agregar un nuevo mantenedor comercial generico

1. Crear o migrar tabla en SQL Server.
2. Agregar el recurso en `backend/models/commercialModel.js`:
   - `table`
   - `idField`
   - `idType`
   - `displayField`
   - `searchFields`
   - `required`
   - `fields`
   - `joins`
   - `dependencies`
3. Agregar modulo en `backend/security/permissionModules.js`.
4. Asegurar permisos en `SystemModules`/`RolePermissions` mediante migracion o `permissionService.syncPermissionModules()`.
5. Agregar configuracion visual en `Frontend/src/views/commercial/commercialConfig.js`.
6. Agregar ruta en `Frontend/src/routes.js`.
7. Agregar item en `Frontend/src/_nav.js`.
8. Probar listar, crear, editar, borrar, permisos y exportacion.

### 12.2 Agregar campo a un recurso existente

1. Crear migracion SQL idempotente en `backend/database/migrations`.
2. Si el arranque debe garantizarla, agregarla a `startupMigrations` en `backend/database/ensureSchema.js`; si no, documentar ejecucion manual.
3. Actualizar `backend/models/commercialModel.js`.
4. Actualizar `Frontend/src/views/commercial/commercialConfig.js`.
5. Si aplica a contrato especializado, actualizar tambien `backend/services/contratosEmpresaService.js` y `Frontend/src/views/contract-company/ContratoEmpresa.js`.
6. Probar busqueda, ordenamiento, crear/editar y detalle.

### 12.3 Agregar permiso/menu

1. Registrar modulo en `backend/security/permissionModules.js`.
2. Agregar ruta o vista con `permissionKey` en `Frontend/src/routes.js`.
3. Agregar item de menu con `permissionKey` en `Frontend/src/_nav.js`.
4. Verificar en UI de roles que el modulo aparece y guardar permisos.

### 12.4 Manejo de uploads

- Endpoint: `POST /api/commercial/uploads`.
- Tipos permitidos: PDF, Word, Excel, PNG, JPG, TXT.
- Tamano maximo: 8 MB.
- Destino: `backend/uploads/commercial`.
- URL publica: `/uploads/commercial/<archivo>`.

Para produccion, revisar:

- Politica de backups de `backend/uploads`.
- Sanitizacion adicional si se exponen archivos publicamente.
- Antivirus/escaneo si aplica.
- Limites de almacenamiento.

## 13. Guia de debugging

### 13.1 Backend dice `Backend already running`

El mensaje viene de `server.js` cuando `/api/health` ya responde en el puerto configurado. Para identificar el proceso:

```powershell
netstat -ano | Select-String ':4001'
```

Para cerrar un PID concreto:

```powershell
Stop-Process -Id <PID> -Force
```

### 13.2 Frontend no conecta al backend

Revisar:

1. `Frontend/.env.local`: `VITE_API_BASE_URL`.
2. `backend/.env`: `PORT`.
3. `backend/config/env.js`: `APP_ORIGIN` debe incluir `http://localhost:3000`.
4. Consola del navegador: errores CORS o `ERR_CONNECTION_REFUSED`.
5. Health:

```powershell
Invoke-RestMethod http://localhost:4001/api/health
```

### 13.3 Error SQL Server / SSPI

`backend/utils/sqlErrors.js` traduce errores SSPI a `DB_CONNECTION`. Opciones:

- Usar SQL Auth:
  - `DB_INTEGRATED=false`
  - configurar `DB_USER` y `DB_PASSWORD`
- O corregir autenticacion integrada:
  - Driver ODBC instalado.
  - SPN/Kerberos correcto.
  - Servicio SQL accesible desde el usuario que ejecuta Node.

### 13.4 Error de permisos SQL

Si aparece `DB_PERMISSION`, el usuario de BD no tiene permiso `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER` o similar. Revisar grants con `backend/scripts/grant-app-user.sql` o el script PowerShell correspondiente.

### 13.5 Duplicados

Errores SQL `2627`/`2601` se traducen a `409 DUPLICATE`. Restricciones conocidas:

- `UQ_Users_Username`
- `UQ_Users_Email`
- `UQ_Roles_RoleName`
- `PK_empresa`
- `UX_contacto_rut`
- `UX_contratos_empresa_codigo`
- `UX_contratos_empresa_numero`

### 13.6 401 en frontend

Flujo esperado:

1. Access token vence.
2. Axios llama refresh.
3. Si refresh es valido, reintenta.
4. Si no, limpia sesion.

Si el usuario vuelve al login:

- Revisar que `refreshToken` exista en `localStorage`.
- Revisar tabla `dbo.RefreshTokens`.
- Confirmar que `JWT_REFRESH_SECRET` no cambio desde que se emitio el token.
- Revisar reloj del servidor por expiraciones.

### 13.7 403 por permisos

Revisar:

1. Rol del usuario.
2. `dbo.SystemModules` contiene el `ModuleKey`.
3. `dbo.RolePermissions` tiene `CanRead/CanCreate/CanWrite/CanDelete`.
4. Frontend usa el mismo `permissionKey` que backend.
5. En `Super Admin` deberia haber bypass.

### 13.8 2FA no llega por correo

1. Ejecutar:

```powershell
cd C:\aplicativos\oportunidades\backend
npm run test:smtp -- --to destinatario@dominio.com
```

2. Revisar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
3. En desarrollo, si falta SMTP, el backend no bloquea login 2FA y loguea el codigo en consola; en produccion retorna error.

### 13.9 Problemas con contrato empresa y codigo CEMP

Revisar:

- `dbo.contratos_empresa.numero_contrato_empresa`
- `dbo.contratos_empresa.codigo_contrato_empresa`
- `dbo.contrato_empresa_codigo_reservas`
- indices unicos `UX_contratos_empresa_numero` y `UX_contratos_empresa_codigo`

La reserva usa transaccion con locks sobre contratos y reservas para evitar duplicados concurrentes.

### 13.10 Archivos no descargan

1. Confirmar que el campo guarda `/uploads/commercial/<archivo>`.
2. Confirmar que existe el archivo fisico en `backend/uploads/commercial`.
3. Confirmar que Express sirve `app.use('/uploads', express.static(...))`.
4. Confirmar que el navegador usa la URL del backend, no del frontend, si el path relativo no resuelve en despliegue.

## 14. Riesgos y observaciones arquitectonicas

- `auth-schema.sql` es destructivo: hace `DROP TABLE` de seguridad si se ejecuta completo.
- `ensureSchema.js` solo ejecuta dos migraciones startup; muchas migraciones comerciales deben aplicarse explicitamente o estan parcialmente garantizadas por servicios.
- La pantalla de contratos empresa duplica parte de logica del mantenedor generico. Es aceptable por su flujo funcional, pero cualquier cambio de campos debe sincronizar backend especializado, frontend especializado y metadata generica.
- `cookie-parser` esta instalado/configurado, pero la autenticacion activa viaja en bearer token y refresh token en body/localStorage.
- `localStorage` simplifica sesion SPA, pero expone tokens a riesgo XSS; en produccion evaluar cookies httpOnly para refresh token.
- `Frontend` conserva muchas vistas demo CoreUI. Si no se usan, pueden ocultarse o eliminarse para reducir superficie de UI.
- `restore-point-*` aumenta ruido de repo; mantenerlos fuera del analisis runtime y considerar moverlos a backups externos.

## 15. Checklist rapido de verificacion

Backend:

```powershell
cd C:\aplicativos\oportunidades\backend
npm start
Invoke-RestMethod http://localhost:4001/api/health
```

Frontend:

```powershell
cd C:\aplicativos\oportunidades\Frontend
npm start
```

Build frontend:

```powershell
cd C:\aplicativos\oportunidades\Frontend
npm run build
```

SMTP:

```powershell
cd C:\aplicativos\oportunidades\backend
npm run test:smtp -- --to destinatario@dominio.com
```

Puertos:

```powershell
netstat -ano | Select-String ':4001'
netstat -ano | Select-String ':3000'
```
