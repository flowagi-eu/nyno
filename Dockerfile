
FROM debian:trixie-slim

WORKDIR /nyno

# --- Base system setup ---
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        xz-utils \
        curl \
        unzip \
        git \
        bash \
        lsb-release \
        gnupg \
        sudo \
        python3 \
        python3-pip \
        python3-venv \
        python3-full \
        build-essential \
        openssl \
        libssl-dev \
        libyaml-dev \
        libreadline-dev \
        zlib1g-dev \
        libffi-dev \
        libgdbm-dev \
        libncurses-dev \
        inotify-tools \
        libgmp-dev \
    && rm -rf /var/lib/apt/lists/*

# Rust
# --- Rust toolchain ---
ENV RUSTUP_HOME=/root/.rustup
ENV CARGO_HOME=/root/.cargo
ENV PATH="/root/.cargo/bin:$PATH"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --default-toolchain 1.100.0

RUN rustc --version && cargo --version

# --- Node.js + npm ---
ENV NODE_VERSION=26.13.1

RUN curl -fL \
    "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz \
        -C /usr/local \
        --strip-components=1 && \
    rm -f /tmp/node.tar.xz

# --- Verify Node and npm ---
RUN node --version && npm --version

# --- Clone Best.js ---
RUN git clone https://github.com/flowagi-eu/nyno-jt /opt/jt && \
    cd /opt/jt && \
    npm install && \
    npm link

# --- Copy Relevant Nyno source files ---
COPY backend /nyno/backend
COPY scripts /nyno/scripts
COPY start-devserver.sh /nyno/
COPY LICENSE /nyno/
COPY dev-server.js /nyno/

# --- Build Rust runner ---
RUN cd /nyno/backend/rust-runner && \
    chmod +x build.sh && \
    ./build.sh

# --- Install Nyno dependencies ---
RUN cd /nyno/backend && npm install

# --- Install Astral UV ---
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# --- Create Python venv ---
RUN python3 -m venv /nyno/.venv

# --- Add venv + uv to PATH ---
ENV PATH="/nyno/.venv/bin:/root/.local/bin:$PATH"

# --- Install Python dependencies ---
RUN uv sync --project /nyno || \
    echo "[WARN] uv sync may fail if requirements are missing"

# --- Expose ports ---
EXPOSE 9099

# --- Entrypoint ---
COPY container/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

