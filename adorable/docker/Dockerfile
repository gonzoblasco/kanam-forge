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
    && npm install -g npm@latest

# Create workspace dir
WORKDIR /workspace

# Dev server listens on all interfaces so the host can reach it
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "echo 'Kanam Forge sandbox ready' && tail -f /dev/null"]
