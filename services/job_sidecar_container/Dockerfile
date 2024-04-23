FROM debian:bullseye-slim

# fetch procps for ps command, coreutils for tail with -pid flag
RUN apt-get update && apt-get install procps coreutils -y

COPY *.sh .

RUN ["chmod", "+x", "./job_killer.sh", "./signal.sh", "./sidecar_killer.sh", "./wait_for_job.sh"]

ENTRYPOINT ["./job_killer.sh"]
