# Modulo gestion comercial y contratos

Este sprint agrega un modulo reusable de administracion comercial sobre la tecnologia actual del proyecto:

- Backend Node.js + Express.
- SQL Server con `mssql` / `msnodesqlv8`.
- Frontend React + Vite + CoreUI.
- CRUD generico basado en metadata para facilitar nuevos mantenedores.

## Migracion SQL

Ejecuta la migracion sobre la base configurada en `backend/.env`:

```powershell
cd backend
npm run migrate:commercial
```

Tambien puedes ejecutar el SQL manualmente:

```sql
-- SQL Server Management Studio
:r backend/database/commercial-schema.sql
```

Si prefieres copiar/pegar, ejecuta todo el contenido de:

```text
backend/database/commercial-schema.sql
```

El script crea las tablas si no existen, agrega relaciones, indices y carga datos iniciales para:

- categoria
- tipo_contacto
- estado_contacto
- estado_vital
- tipo_servicio
- tipo_tarifa
- frecuencia_facturacion

## Tablas creadas

- `dbo.categoria`
- `dbo.empresa`
- `dbo.contacto`
- `dbo.tipo_contacto`
- `dbo.estado_contacto`
- `dbo.contrato`
- `dbo.estado_vital`
- `dbo.linea`
- `dbo.tipo_servicio`
- `dbo.tipo_tarifa`
- `dbo.frecuencia_facturacion`
- `dbo.caso`
- `dbo.documentos`

## Relaciones

- categoria 1 a N empresa
- empresa 1 a N contacto
- empresa 1 a N contrato
- tipo_contacto 1 a N contacto
- estado_contacto 1 a N contacto
- estado_vital 1 a N contrato
- contrato 1 a N linea
- contrato 1 a N documentos
- contrato 1 a N caso
- contacto 1 a N caso
- tipo_servicio 1 a N linea
- tipo_tarifa 1 a N linea
- frecuencia_facturacion 1 a N linea

Las FK no usan cascade delete. Las eliminaciones quedan protegidas por integridad referencial y por validacion API previa.

## Backend

Archivos principales:

- `backend/models/commercialModel.js`: metadata de tablas, campos, relaciones, obligatorios y dependencias.
- `backend/repositories/commercialRepository.js`: SQL CRUD generico.
- `backend/services/commercialService.js`: validaciones y reglas de eliminacion.
- `backend/controllers/commercialController.js`: respuestas HTTP.
- `backend/routes/commercialRoutes.js`: rutas protegidas.

Ruta base:

```text
/api/commercial
```

Endpoints:

```text
GET    /api/commercial/lookups
GET    /api/commercial/:resource
GET    /api/commercial/:resource/:id
POST   /api/commercial/:resource
PUT    /api/commercial/:resource/:id
DELETE /api/commercial/:resource/:id
```

Recursos disponibles:

```text
empresas
contactos
contratos
lineas
casos
documentos
categorias
tipo_contactos
estado_contactos
estado_vitales
tipo_servicios
tipo_tarifas
frecuencias
```

## Frontend

Pantallas disponibles en:

```text
/commercial/empresas
/commercial/contactos
/commercial/contratos
/commercial/lineas
/commercial/casos
/commercial/documentos
/commercial/categorias
/commercial/tipo_contactos
/commercial/estado_contactos
/commercial/estado_vitales
/commercial/tipo_servicios
/commercial/tipo_tarifas
/commercial/frecuencias
```

Cada mantenedor permite:

- Crear
- Listar con paginacion
- Buscar
- Ver detalle
- Editar
- Eliminar con confirmacion
- Cargar combos desde tablas maestras
- Mostrar mensajes de exito/error

## Validaciones obligatorias

- Empresa: `rut`, `razon_social`, `id_categoria`.
- Contacto: `rut_empresa`, `id_tipo_contacto`, `id_estado_contacto`, `nombre`.
- Contrato: `rut_empresa`, `id_estado_vital`, `titulo`.
- Linea: `id_contrato`, `id_tipo_servicio`, `id_tipo_tarifa`, `id_frecuencia`, `titulo`.
- Documento: `id_contrato`, `nombre`.
- Caso: `id_contacto`, `id_contrato`, `titulo`.

## Ejecucion

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd Frontend
npm install
npm start
```

Luego entra al menu lateral `Gestion comercial`.

## Como extender

Para agregar una nueva tabla compatible con el CRUD generico:

1. Agrega la tabla/FK al SQL.
2. Agrega su metadata en `backend/models/commercialModel.js`.
3. Agrega su configuracion visual en `Frontend/src/views/commercial/commercialConfig.js`.
4. Agrega ruta y item de menu si corresponde.
