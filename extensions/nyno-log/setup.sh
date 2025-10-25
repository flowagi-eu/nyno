#!/usr/bin/env bash
set -e

# Store the invoking user
ORIGINAL_USER=$(whoami)

# === DYNAMIC NAMES BASED ON TIMESTAMP ===
TIMESTAMP=$(date +%s)
DB_NAME="nyno_log_db_$TIMESTAMP"
DB_USER="nyno_log_user_$TIMESTAMP"
DB_PASS=$(openssl rand -hex 32)
PG_SUPERUSER="postgres"

echo "=== Setting up Nyno Log Database ==="
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASS"
echo

# === CREATE DATABASE AND USER ===
sudo -u $PG_SUPERUSER psql -c "CREATE DATABASE \"$DB_NAME\";"
sudo -u $PG_SUPERUSER psql -c "CREATE USER \"$DB_USER\" WITH ENCRYPTED PASSWORD '$DB_PASS';"

# Grant privileges
sudo -u $PG_SUPERUSER psql -d "$DB_NAME" <<EOF
GRANT USAGE, CREATE ON SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "$DB_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "$DB_USER";
EOF

echo "✅ Database and user privileges configured."

# === MIGRATION ===
echo "Applying schema migration..."
sudo -u $PG_SUPERUSER psql -d "$DB_NAME" <<EOSQL
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
ENV_FILE=`realpath ./envs/.nyno_log_db.env`
cat > "$ENV_FILE" <<EOF
NYNO_DB_NAME=$DB_NAME
NYNO_DB_USER=$DB_USER
NYNO_DB_PASS=$DB_PASS
NYNO_DB_HOST=localhost
NYNO_DB_PORT=5432
EOF

chmod 600 "$ENV_FILE"
sudo chown $ORIGINAL_USER:$ORIGINAL_USER "$ENV_FILE"

echo "✅ Saved credentials to $ENV_FILE (owned by $ORIGINAL_USER)"

