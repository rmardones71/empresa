Listo. Te dejé el paquete ZIP aquí:

auth-db-login-installer.zip

Incluye un instalador interactivo que pregunta los parámetros de conexión y trae como predeterminados los actuales: DB_SERVER=D-RICHARD-M, DB_DATABASE=oportunidades, Windows Auth, driver ODBC 18, puerto 4000, etc.

Para usarlo en otro proyecto:

.\install.ps1 "C:\ruta\del\nuevo-proyecto"
El paquete incluye backend reutilizable con conexión SQL Server, login JWT, usuarios, roles, auditoría, seed inicial y .env generado. No incluí node_modules, logs ni el .env real con claves sensibles.