#!/bin/bash
set -e

# Load base env
if [[ -f /nyno/envs/ports.env ]]; then
  source /nyno/envs/ports.env
fi

# Optional overrides
if [[ -f /nyno/envs/ports.local.env ]]; then
  source /nyno/envs/ports.local.env
fi

echo "WF:$WF"
echo "GU:$GU"
echo "RB:$RB"
APP_ENV=${APP_ENV:-dev}  # default to dev if not set

### 

mkdir -p envs
mkdir -p output



### POSTGRES PART BEGIN

PG_BIN=/usr/libexec/postgresql18
PG_DATA=${PG_DATA:-/nyno/pgdata}
PG_PORT=${PG_PORT:-5432}

mkdir -p "$PG_DATA"
chown -R postgres:postgres "$PG_DATA"
chmod 700 "$PG_DATA"


# PostgreSQL Unix socket directory
mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql
chmod 775 /run/postgresql

NEW_CLUSTER=0

# Initialize cluster only once
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo "[INFO] Initializing PostgreSQL cluster..."

    # Handle bind-mounted directories containing lost+found
    find "$PG_DATA" -mindepth 1 ! -name lost+found -exec rm -rf {} +

    su postgres -c "$PG_BIN/initdb -D '$PG_DATA'"

    NEW_CLUSTER=1
fi

echo "[INFO] Starting PostgreSQL..."
su postgres -c "exec $PG_BIN/postgres -D '$PG_DATA' -p $PG_PORT" &

until su postgres -c "$PG_BIN/pg_isready -p $PG_PORT" >/dev/null 2>&1; do
    sleep 1
done


# --- Wait for Postgres to be ready ---
echo "[DEBUG] Waiting for Postgres..."
until su - postgres -c "$PG_BIN/pg_isready -p $PG_PORT"; do
    sleep 1
done
echo "[DEBUG] Postgres is ready!"

# Only create the application database on first initialization
if [ "$NEW_CLUSTER" = "1" ]; then
    echo "[INFO] Creating initial Nyno database..."

    rm -f envs/.nyno_log_db.env
    sudo bash ./install-postgres-db.sh
else
    echo "[INFO] Existing PostgreSQL cluster detected, skipping database creation."
fi

### POSTGRES PART END


echo "=== Nyno Dev Container EntryPoint (mode: $APP_ENV) ==="









# Check if .venv directory exists
if [ -d ".venv" ]; then
    # Check if the activate script exists
    if [ -f ".venv/bin/activate" ]; then
        echo "Activating virtual environment..."
        source .venv/bin/activate
    else
        echo "Error: .venv/bin/activate not found."
        exit 1
    fi
fi



# --- Start Best.js server in proper mode ---
APP_ENV="prod"
echo "[DEBUG] Starting Best.js in production mode..."
exec ./run-prod.sh
