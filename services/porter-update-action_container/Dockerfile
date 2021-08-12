FROM ubuntu:latest
RUN apt-get update && apt-get install -y curl unzip
COPY . /action/
RUN /action/get-porter-cli.sh
ENTRYPOINT ["/action/entrypoint.sh"]
