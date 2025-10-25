#!/bin/bash
set -e

PG_BIN=/usr/lib/postgresql/18/bin
PG_DATA=/app/pgdata   # writable in rootless Podman
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

sudo bash extensions/nyno-log/setup.sh


# --- Start Best.js server in proper mode ---
if [ "$APP_ENV" = "prod" ]; then
    echo "[DEBUG] Starting Best.js in production mode..."
    exec bestjsserver --prod
else
    echo "[DEBUG] Starting Best.js in development mode..."
    exec bestjsserver
fi


