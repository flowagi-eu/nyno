#!/usr/bin/env bash

set -e

# Colors
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BLUE}========================================"
echo -e " Nyno Host Environment Checker"
echo -e "========================================${RESET}"
echo ""

error_count=0
db_env_missing=false

check_cmd() {
    local cmd=$1
    local name=$2
    local install_help=$3

    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${GREEN}[OK]${RESET} $name → $( $cmd --version 2>/dev/null | head -n 1 )"
    else
        echo -e "${RED}[ERR]${RESET} $name not found"
        echo -e "      ${YELLOW}Install: $install_help${RESET}"
        error_count=$((error_count + 1))
    fi
}

check_php_ext() {
    local ext=$1

    if php -m 2>/dev/null | grep -q "^$ext$"; then
        echo -e "${GREEN}[OK]${RESET} PHP extension: $ext"
    else
        echo -e "${RED}[ERR]${RESET} Missing PHP extension: $ext"
        echo -e "      ${YELLOW}Install via your PHP package manager${RESET}"
        error_count=$((error_count + 1))
    fi
}


### --- RUNTIMES --- ###

check_cmd node "Node.js (>= 22)" "https://nodejs.org/en/download"
check_cmd bun "Bun" "curl -fsSL https://bun.sh/install | bash"
check_cmd php "PHP (>= 8.4)" "Install from your distro or https://www.php.net"
check_cmd python3 "Python 3 (>= 3.10)" "Install via distro or https://www.python.org"
check_cmd uv "uv (Astral)" "curl -fsSL https://astral.sh/uv/install.sh | bash"
check_cmd ruby "Ruby (>= 3.3)" "rbenv: https://github.com/rbenv/rbenv"
check_cmd psql "PostgreSQL Client" "sudo apt install postgresql-client"


### --- PostgreSQL Version Check --- ###
echo -e "${BLUE}Checking PostgreSQL version...${RESET}"

if command -v psql >/dev/null 2>&1; then
    PG_VERSION_RAW=$(psql --version 2>/dev/null | grep -oE "[0-9]+\.[0-9]+")
    PG_MAJOR="${PG_VERSION_RAW%%.*}"

    if [[ "$PG_MAJOR" -ge 18 ]]; then
        echo -e "${GREEN}[OK]${RESET} PostgreSQL client version $PG_VERSION_RAW (>= 18)"
    else
        echo -e "${RED}[ERR]${RESET} PostgreSQL version $PG_VERSION_RAW detected, but 18+ is required"
        echo -e "      ${YELLOW}Install from: https://www.postgresql.org/download/${RESET}"
        error_count=$((error_count + 1))
    fi
else
    echo -e "${RED}[ERR]${RESET} PostgreSQL client (psql) not found"
    echo -e "      ${YELLOW}Install: sudo apt install postgresql-client${RESET}"
    error_count=$((error_count + 1))
fi


### --- PHP Extensions --- ###
echo -e "${BLUE}Checking PHP extensions...${RESET}"
check_php_ext curl


### --- Optional Swoole --- ###
echo -e "${BLUE}Checking optional PHP extension: swoole...${RESET}"

if php -m 2>/dev/null | grep -q "^swoole$"; then
    echo -e "${GREEN}[OK]${RESET} Swoole enabled"
else
    echo -e "${YELLOW}[WARN]${RESET} Swoole not installed (optional)."
fi


### --- Check for Postgres ENV file --- ###
echo -e "${BLUE}Checking database environment file...${RESET}"

if [[ -f "envs/.nyno_log_db.env" ]]; then
    echo -e "${GREEN}[OK]${RESET} envs/.nyno_log_db.env exists"
else
    echo -e "${RED}[ERR]${RESET} Missing envs/.nyno_log_db.env"
    echo -e "      ${YELLOW}Run: bash setup-postgres-db.sh${RESET}"
    db_env_missing=true
    error_count=$((error_count + 1))
fi


### --- Summary --- ###
echo ""
echo -e "${BLUE}========================================${RESET}"

if [[ $error_count -eq 0 ]]; then
    echo -e "${GREEN}Your system is ready for Nyno!${RESET}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. bun install"
    echo -e "  2. uv sync"
    echo -e "  3. npm link @best.js"
    [[ "$db_env_missing" == false ]] || echo -e "  4. bash setup-postgres-db.sh"
    echo ""
    exit 0
else
    echo -e "${RED}Your system is NOT ready.${RESET}"
    echo -e "${YELLOW}$error_count problem(s) detected.${RESET}"
    echo ""
    echo "Fix the issues above, then re-run:"
    echo "  ./scripts/doctor.sh"
    echo ""
    exit 1
fi

