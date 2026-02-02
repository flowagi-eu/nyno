#!/usr/bin/env bash
set -e

ENV_FILE="envs/.nyno_log_db.env"

PG_SUPERUSER="postgres"

# Create NYNO_DB if file not exists
if [ ! -f "$ENV_FILE" ]; then

# Store the invoking user
ORIGINAL_USER=$(whoami)

# === DYNAMIC NAMES BASED ON TIMESTAMP ===
TIMESTAMP=$(date +%s)
NYNO_DB_NAME="nyno_log_db_$TIMESTAMP"
NYNO_DB_USER="nyno_log_user_$TIMESTAMP"
NYNO_DB_PASS=$(openssl rand -hex 32)

echo "=== Setting up Nyno Log Database ==="
echo "Database: $NYNO_DB_NAME"
echo "User: $NYNO_DB_USER"
echo "Password: $NYNO_DB_PASS"
echo

# === CREATE DATABASE AND USER ===
sudo -u $PG_SUPERUSER psql -c "CREATE DATABASE \"$NYNO_DB_NAME\";"
sudo -u $PG_SUPERUSER psql -c "CREATE USER \"$NYNO_DB_USER\" WITH ENCRYPTED PASSWORD '$NYNO_DB_PASS';"

else 
source $ENV_FILE
fi

# === MIGRATION ===
# Grant privileges
sudo -u $PG_SUPERUSER psql -d "$NYNO_DB_NAME" <<EOF
GRANT USAGE, CREATE ON SCHEMA public TO "$NYNO_DB_USER";
GRANT ALL PRIVILEGES ON DATABASE "$NYNO_DB_NAME" TO "$NYNO_DB_USER";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$NYNO_DB_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$NYNO_DB_USER";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "$NYNO_DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "$NYNO_DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "$NYNO_DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "$NYNO_DB_USER";
EOF

echo "✅ Database and user privileges configured."
echo "Applying schema migration..."
sudo -u $PG_SUPERUSER psql -d "$NYNO_DB_NAME" <<EOSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Persistent logs table (JSONB)
CREATE TABLE IF NOT EXISTS persistent_logs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    line JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Queue logs table (JSONB)
CREATE UNLOGGED TABLE IF NOT EXISTS queue_logs (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    line JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE json_storage (
    id UUID PRIMARY KEY DEFAULT uuidv7(),  -- UUID version 7 (time‑ordered)
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE embeddings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    embedding VECTOR(1024) NOT NULL,
    meta JSONB
);

-- Low-RAM, medium-scale IVFFlat index
CREATE INDEX embeddings_ivfflat_idx
ON embeddings
USING ivfflat (embedding vector_ip_ops)
WITH (lists = 1024);  -- 1024 clusters → tiny RAM (~4 MB for centroids)



-- Flush function
CREATE OR REPLACE FUNCTION flush_queue()
RETURNS void AS \$\$
BEGIN
    INSERT INTO persistent_logs (id, line, created_at)
    SELECT id, line, created_at
    FROM queue_logs
    WHERE created_at < NOW() - INTERVAL '10 seconds';

    DELETE FROM queue_logs
    WHERE created_at < NOW() - INTERVAL '10 seconds';
END;
\$\$ LANGUAGE plpgsql;

EOSQL

# === ENV FILE ===
if [ -f "$ENV_FILE" ]; then
	# nothing
	echo 'OK'
else
ENV_FILE=`realpath ./envs/.nyno_log_db.env`
cat > "$ENV_FILE" <<EOF
NYNO_DB_NAME=$NYNO_DB_NAME
NYNO_DB_USER=$NYNO_DB_USER
NYNO_DB_PASS=$NYNO_DB_PASS
NYNO_DB_HOST=localhost
NYNO_DB_PORT=5432
EOF

chmod 600 "$ENV_FILE"
sudo chown $ORIGINAL_USER:$ORIGINAL_USER "$ENV_FILE"

echo "✅ Saved credentials to $ENV_FILE (owned by $ORIGINAL_USER)"
fi

