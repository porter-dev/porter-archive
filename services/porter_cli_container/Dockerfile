FROM ubuntu:latest

COPY get-porter-cli.sh /scratch/

RUN apt-get update && apt-get install -y curl unzip git

ARG DOCKER_VERSION=24.0.6
ARG DOCKER_BUILDX_VERSION=0.11.2

RUN curl -fsSLO https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz && \
    tar --strip-components=1 -xvzf docker-${DOCKER_VERSION}.tgz -C /usr/local/bin && \
    mkdir -p /usr/local/libexec/docker/cli-plugins && \
    curl -fsSLo /usr/local/libexec/docker/cli-plugins/docker-buildx https://github.com/docker/buildx/releases/download/v${DOCKER_BUILDX_VERSION}/buildx-v${DOCKER_BUILDX_VERSION}.linux-amd64 && \
    chmod +x /usr/local/libexec/docker/cli-plugins/docker-buildx

ARG VERSION

RUN /scratch/get-porter-cli.sh

ENTRYPOINT ["porter"]
