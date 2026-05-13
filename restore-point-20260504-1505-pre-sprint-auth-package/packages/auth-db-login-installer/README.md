# Auth DB Login Installer

Paquete reutilizable para instalar en otro proyecto un backend Node.js con:

- Conexion a SQL Server por Windows Auth o SQL Auth.
- Login con JWT y refresh token.
- Roles, usuarios, auditoria y 2FA por email.
- Script de seed para crear tablas y usuario administrador inicial.
- Archivo `.env` generado de forma interactiva.

## Uso desde el ZIP

1. Descomprime `auth-db-login-installer.zip`.
2. Abre PowerShell en la carpeta descomprimida.
3. Ejecuta:

```powershell
.\install.ps1 "C:\ruta\de\tu\nuevo-proyecto"
```

Tambien puedes usar Node directamente:

```powershell
node install.js "C:\ruta\de\tu\nuevo-proyecto"
```

El instalador preguntara los parametros de conexion. Al presionar Enter acepta los defaults actuales:

- `DB_SERVER=D-RICHARD-M`
- `DB_DATABASE=oportunidades`
- `DB_PORT=1433`
- `DB_INTEGRATED=true`
- `DB_ODBC_DRIVER=ODBC Driver 18 for SQL Server`
- `DB_ENCRYPT=false`
- `PORT=4000`
- `APP_ORIGIN=http://localhost:3000,http://localhost:3001`

Por seguridad, los secretos JWT se generan automaticamente como valores largos aleatorios. El password SMTP queda vacio por defecto para no empacar credenciales sensibles.

## Despues de instalar

En el backend instalado:

```powershell
npm install
npm run seed
npm run dev
```

Usuario inicial predeterminado:

- Usuario: `admin`
- Password: `123456`

Puedes cambiarlo durante la instalacion con `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`.

## Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/verify-2fa`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/users`
- `GET /api/roles`
- `GET /api/audit`

## Notas

- El script `npm run seed` recrea las tablas de autenticacion (`Roles`, `Users`, `AuditLogs`, `RefreshTokens`). Usalo con cuidado en bases de datos existentes.
- No se incluye `node_modules`; se instala con `npm install` en cada proyecto destino.
- No se incluye ningun `.env` real del proyecto origen.
