FROM alpine:3.24.1

WORKDIR /nyno

# --- Base system setup ---
RUN apk add --no-cache \
        ca-certificates \
        xz \
        curl \
        unzip \
        git \
        bash \
        lsb-release \
        gnupg \
        sudo \
        php84 \
        php84-cli \
        php84-dev \
        php84-common \
        php84-xml \
        php84-mbstring \
        php84-curl \
        php84-zip \
        php84-pdo \
        php84-pdo_pgsql \
        php84-pgsql \
        php84-openssl \
        php84-phar \
        php84-tokenizer \
        php84-session \
        python3 \
        py3-pip \
        py3-virtualenv \
	ruby \
	ruby-bundler \
        build-base \
	openssl \
        openssl-dev \
        yaml-dev \
        readline-dev \
        zlib-dev \
        libffi-dev \
        gdbm-dev \
        ncurses-dev \
        gmp-dev \
	postgresql18 \
	postgresql18-client \
	postgresql-pgvector

# Keep common command names available
RUN ln -sf /usr/bin/php84 /usr/local/bin/php && \
    ln -sf /usr/bin/php-config84 /usr/local/bin/php-config && \
    ln -sf /usr/bin/phpize84 /usr/local/bin/phpize

# --- PostgreSQL 18 ---
# Alpine provides PostgreSQL 18 directly; no PGDG apt repository is needed.


# --- Node.js + npm ---
ENV NODE_VERSION=24.18.1

RUN curl -fL \
    "https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64-musl.tar.xz" \
    -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz \
        -C /usr/local \
        --strip-components=1 && \
    rm -f /tmp/node.tar.xz

# --- Verify Node and npm ---
RUN node --version && npm --version

# --- Copy Swoole ---
# IMPORTANT: this .so must be compiled for Alpine/musl + PHP 8.4.
COPY container/bin/swoole.so /tmp/swoole.so

# Install Swoole into the actual PHP 8.4 extension directory
RUN cp /tmp/swoole.so "$(php-config84 --extension-dir)/swoole.so" && \
    rm -f /tmp/swoole.so && \
    echo "extension=$(php-config84 --extension-dir)/swoole.so" \
        > /etc/php84/conf.d/20-swoole.ini

# --- Ruby ---
RUN gem install --no-document bundler


# --- Clone Best.js ---
RUN git clone https://github.com/empowerd-cms/best.js /opt/best.js && \
    cd /opt/best.js && \
    npm install && \
    npm link

# --- Copy Nyno source ---
COPY . /nyno

# --- Install Nyno dependencies ---
RUN cd /nyno && npm install

# --- Install Astral UV ---
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# --- Create Python venv ---
RUN python3 -m venv /nyno/.venv

# Add venv + uv to PATH
ENV PATH="/nyno/.venv/bin:/root/.local/bin:$PATH"

# --- Install Python dependencies ---
RUN uv sync --project /nyno || \
    echo "[WARN] uv sync may fail if requirements are missing"

# --- Expose ports ---
EXPOSE 9024 9057 9003 9006 9072

# --- Entrypoint ---
COPY container/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

