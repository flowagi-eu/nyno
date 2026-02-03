#!/bin/bash
set -e

PG_BIN=/usr/lib/postgresql/18/bin
PG_DATA=/nyno/pgdata   # writable in rootless Podman
PG_PORT=5432


APP_ENV=${APP_ENV:-dev}  # default to dev if not set
echo "=== Nyno Dev Container EntryPoint (mode: $APP_ENV) ==="


# --- Ensure postgres user exists ---
if ! id postgres &>/dev/null; then
    echo "[ERROR] User 'postgres' does not exist"
    exit 1
fi

# --- Ensure data dir exists ---
mkdir -p "$PG_DATA"
chown -R postgres:postgres "$PG_DATA"

# --- Initialize Postgres if needed ---
if [ ! -s "$PG_DATA/PG_VERSION" ]; then
    echo "[DEBUG] Initializing Postgres..."
    su - postgres -c "$PG_BIN/initdb -D '$PG_DATA'"
fi

# --- Start Postgres in background ---
echo "[DEBUG] Starting Postgres..."
su - postgres -c "$PG_BIN/postgres -D '$PG_DATA' -p $PG_PORT" &

# --- Wait for Postgres to be ready ---
echo "[DEBUG] Waiting for Postgres..."
until su - postgres -c "$PG_BIN/pg_isready -p $PG_PORT"; do
    sleep 1
done
echo "[DEBUG] Postgres is ready!"

# -- Create Postgres Databaes for nyno-logs extension
mkdir envs -p

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

sudo bash ./install-postgres-db.sh


# --- Start Best.js server in proper mode ---
if [ "$APP_ENV" = "prod" ]; then
    echo "[DEBUG] Starting Best.js in production mode..."
    exec ./run-prod.sh
else
    echo "[DEBUG] Starting Best.js in development mode..."
    exec ./run-dev.sh
fi


