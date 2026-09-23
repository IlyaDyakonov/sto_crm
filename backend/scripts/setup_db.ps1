# Creates/resets local role `sto` and database `sto_crm` for STO CRM.
# Usage (from repo root or backend/):
#   .\scripts\setup_db.ps1
#   .\scripts\setup_db.ps1 -PostgresPassword "your_postgres_password" -PgPort 5433

param(
    [string]$PgPort = "5433",
    [string]$PostgresUser = "postgres",
    [string]$PostgresPassword = "",
    [string]$PsqlPath = "",
    [string]$AppUser = "sto",
    [string]$AppPassword = "sto",
    [string]$AppDb = "sto_crm"
)

$ErrorActionPreference = "Stop"

if (-not $PsqlPath) {
    $candidates = @(
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $PsqlPath = $c; break }
    }
}

if (-not $PsqlPath -or -not (Test-Path $PsqlPath)) {
    throw "psql.exe not found. Install PostgreSQL or pass -PsqlPath."
}

if (-not $PostgresPassword) {
    $secure = Read-Host "Password for PostgreSQL user '$PostgresUser'" -AsSecureString
    $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

$env:PGPASSWORD = $PostgresPassword

Write-Host "Using: $PsqlPath (port $PgPort)"

# Ensure role exists and password matches .env (sto/sto)
$sqlRole = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$AppUser') THEN
    CREATE ROLE $AppUser LOGIN PASSWORD '$AppPassword';
  ELSE
    ALTER ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword';
  END IF;
END
`$`$;
"@

& $PsqlPath -U $PostgresUser -h 127.0.0.1 -p $PgPort -d postgres -v ON_ERROR_STOP=1 -c $sqlRole
if ($LASTEXITCODE -ne 0) { throw "Failed to create/reset role '$AppUser'. Check postgres password and port." }

$dbExists = & $PsqlPath -U $PostgresUser -h 127.0.0.1 -p $PgPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$AppDb'"
if ($dbExists -ne "1") {
    & $PsqlPath -U $PostgresUser -h 127.0.0.1 -p $PgPort -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $AppDb OWNER $AppUser"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create database '$AppDb'." }
} else {
    & $PsqlPath -U $PostgresUser -h 127.0.0.1 -p $PgPort -d postgres -v ON_ERROR_STOP=1 -c "ALTER DATABASE $AppDb OWNER TO $AppUser"
}

& $PsqlPath -U $PostgresUser -h 127.0.0.1 -p $PgPort -d $AppDb -v ON_ERROR_STOP=1 -c @"
GRANT ALL ON SCHEMA public TO $AppUser;
GRANT CREATE ON SCHEMA public TO $AppUser;
"@
if ($LASTEXITCODE -ne 0) { throw "Failed to grant schema privileges." }

# Verify app login
$env:PGPASSWORD = $AppPassword
& $PsqlPath -U $AppUser -h 127.0.0.1 -p $PgPort -d $AppDb -c "SELECT current_user, current_database();"
if ($LASTEXITCODE -ne 0) { throw "Login as '$AppUser' failed after setup." }

Write-Host ""
Write-Host "OK. Role/DB ready."
Write-Host "Set backend/.env DATABASE_URL to:"
Write-Host "  postgresql+psycopg://${AppUser}:${AppPassword}@127.0.0.1:${PgPort}/${AppDb}"
Write-Host "Then: cd backend; alembic upgrade head"
