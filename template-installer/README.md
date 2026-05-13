# Plantilla instalable base CRM

Esta carpeta contiene una plantilla reutilizable basada en el sistema actual, pero sin logica funcional de negocio.

Conserva:

- Conexion SQL Server y variables de entorno.
- Login, logout, refresh tokens, permisos basicos y sesion.
- Usuarios, roles, permisos, auditoria y perfil.
- Frontend visual, layout, menu, estilos, iconos y fuentes.
- Opciones de menu comerciales como pantallas placeholder.
- Scripts SQL idempotentes para tablas minimas y datos iniciales.

No conserva:

- CRUD reales comerciales.
- Procesos internos de contratos, casos, documentos o lineas.
- Reportes o QA scripts del sistema original.

## Uso del instalador

Desde esta carpeta:

```powershell
npm install
npm run install:template
```

Tambien puede indicarse una carpeta destino:

```powershell
node install.js C:\aplicativos\nuevo-sistema
```

El instalador solicita:

- Servidor SQL.
- Instancia SQL.
- Puerto.
- Usuario SQL.
- Contrasena SQL.
- Base de datos.
- Tipo de autenticacion.
- Ambiente: Desarrollo, QA o Produccion.
- Usuario administrador inicial.

Los valores actuales detectados se muestran como referencia editable.

Si la base de datos no existe, pregunta si debe crearla. Si se acepta, crea la base, ejecuta el esquema y carga datos iniciales.

## Resultado

La carpeta destino queda con:

```text
backend/
Frontend/
```

Luego ejecutar:

```powershell
cd backend
npm install
npm start
```

En otra terminal:

```powershell
cd Frontend
npm install
npm start
```

## Scripts SQL

Los scripts principales estan en:

```text
template/backend/database/auth-schema.sql
template/backend/database/seed-auth.sql
```

Son idempotentes:

- Validan si las tablas existen.
- Crean claves primarias y foraneas.
- Crean indices si faltan.
- Insertan roles, permisos, menu y parametros sin duplicar.
- Crean el administrador inicial si no existe.

## Credenciales iniciales

Se configuran durante la instalacion. Por defecto:

```text
Usuario: admin
Clave: 123456
```

La clave queda hasheada con bcrypt en SQL Server.
