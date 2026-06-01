# PostgreSQL 17 + PostGIS 3.6 Installation Notes (Windows 11)

## Download

Downloaded the PostGIS bundle installer for PostgreSQL 17 (Windows x86_64):

https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

Selected:

* PostgreSQL 17
* PostGIS 3.6
* Windows x86_64

Downloaded file:

```text
postgis_3_6_pg17.exe
```

---

## Installation

Executed:

```text
postgis_3_6_pg17.exe
```

Installation settings:

* PostgreSQL version: 17
* PostGIS version: 3.6
* Architecture: x86_64
* All other installation options left at their default values

### PostgreSQL Superuser

User:

```text
postgres
```

Password:

```text
f..r
```

---

## PATH Configuration

After installation, `psql` was not recognized from Command Prompt.

Added the PostgreSQL bin directory to the Windows PATH:

```text
C:\Program Files\PostgreSQL\17\bin
```

### Steps

1. Open **Edit the system environment variables**
2. Click **Environment Variables**
3. Select **Path**
4. Click **Edit**
5. Click **New**
6. Add:

```text
C:\Program Files\PostgreSQL\17\bin
```

7. Save all dialogs
8. Open a new Command Prompt

---

## Verification

### Verify PostgreSQL Client

```cmd
psql --version
```

Expected output similar to:

```text
psql (PostgreSQL) 17.x
```

### Verify PATH

```cmd
where psql
```

Expected output:

```text
C:\Program Files\PostgreSQL\17\bin\psql.exe
```

---

## Connect to PostgreSQL

```cmd
psql -U postgres
```

Enter the password when prompted.

Alternative:

```cmd
psql -U postgres -h localhost -p 5432
```

---

## Create GIS Database

```sql
CREATE DATABASE gisdb;
```

Connect to it:

```sql
\c gisdb
```

---

## Enable PostGIS

```sql
CREATE EXTENSION postgis;
```

Optional:

```sql
CREATE EXTENSION postgis_topology;
```

---

## Verify PostGIS Installation

```sql
SELECT PostGIS_Version();
```

Expected output:

```text
3.6.x
```

---

## Useful psql Commands

List databases:

```sql
\l
```

List tables:

```sql
\dt
```

List installed extensions:

```sql
\dx
```

Show connection information:

```sql
\conninfo
```

Exit psql:

```sql
\q
```
