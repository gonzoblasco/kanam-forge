# Kanam Forge - sandbox base image
# A Node.js + git environment where the agent writes and runs code.
# The workspace is mounted at /workspace.

FROM node:22-alpine

# Install git and basic tools the agent may need
RUN apk add --no-cache \
    git \
    curl \
    bash \
    openssh-client \
    build-base \
    python3 \
    py3-pip \
    socat \
    && npm install -g npm@latest

# Create workspace dir
WORKDIR /workspace

# Dev server listens on all interfaces so the host can reach it
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Keep the container alive and proxy localhost:11434 -> host.docker.internal:11434
# so apps that talk to Ollama via localhost work inside the container.
# host.docker.internal is provided by Docker Desktop (macOS/Windows) via
# --add-host=host.docker.internal:host-gateway.
CMD ["sh", "-c", "(socat TCP-LISTEN:11434,fork,reuseaddr TCP:host.docker.internal:11434 &) && echo 'Kanam Forge sandbox ready' && tail -f /dev/null"]
