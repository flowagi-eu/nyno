FROM debian:13-slim

WORKDIR /app

# --- Base system setup ---
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates xz-utils curl unzip git bash lsb-release gnupg \
        php8.4-cli php8.4-dev php8.4-common php8.4-xml php8.4-mbstring php8.4-curl php8.4-zip \
        python3 python3-pip python3-venv postgresql-common sudo \
         build-essential \
 autoconf bison \
    libssl-dev libyaml-dev libreadline-dev zlib1g-dev libffi-dev \
    libgdbm-dev libncurses5-dev libgmp-dev \
        && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- PostgreSQL repo and 18 install ---
RUN yes "" | /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh && \
    apt-get update && \
    apt-get install -y postgresql-18 postgresql-client-18 postgresql-server-dev-18 postgresql-18-pgvector && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Node.js + npm ---
ENV NODE_VERSION=22.17.1
RUN curl -fsSL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz \
    -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && \
    rm /tmp/node.tar.xz

# --- Verify Node and npm ---
RUN node -v && npm -v

# --- Copy Swoole ---
COPY container/bin/swoole.so /usr/lib/php/20230831/swoole.so

# Enable Swoole extension in PHP
RUN echo "extension=/usr/lib/php/20230831/swoole.so" > /etc/php/8.4/cli/conf.d/20-swoole.ini

# Install rbenv
ENV RBENV_ROOT=/usr/local/rbenv
ENV PATH="$RBENV_ROOT/bin:$RBENV_ROOT/shims:$PATH"

RUN git clone https://github.com/rbenv/rbenv.git $RBENV_ROOT && \
    mkdir -p "$RBENV_ROOT/plugins"

# Install ruby-build plugin
RUN git clone https://github.com/rbenv/ruby-build.git \
    $RBENV_ROOT/plugins/ruby-build

# Install Ruby via APT
RUN apt update && apt-get install -y --no-install-recommends \
      ruby-full \
      build-essential \
      git \
      ca-certificates && \
    gem install bundler && \
    rm -rf /var/lib/apt/lists/*




# --- Install Bun ---
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# --- Clone Best.js ---
RUN git clone https://github.com/empowerd-cms/best.js /opt/best.js && \
    cd /opt/best.js && bun install && npm link

# --- Copy Nyno source ---
COPY . /app

# --- Install Nyno dependencies ---
RUN cd /app && bun install


# --- Install Astral UV via curl/sh ---
RUN curl -fsSL https://astral.sh/uv/install.sh | bash
ENV PATH="/root/.local/bin:$PATH"


# Create Python venv
RUN python3 -m venv /app/.venv

# Add both uv and venv binaries to PATH
ENV PATH="/app/.venv/bin:$PATH"

# --- Install dependencies using uv ---
RUN uv sync --project /app || echo "[WARN] uv sync may fail if requirements missing"


# --- Expose ports ---
EXPOSE 9024 9057 9003 9006 9072

# --- Entrypoint ---
COPY container/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

