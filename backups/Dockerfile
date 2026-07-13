FROM public.ecr.aws/docker/library/alpine:3.21

RUN apk add --no-cache bash postgresql17-client rclone age aws-cli coreutils tar

WORKDIR /app
COPY lib/manifest.sh /app/lib/manifest.sh
COPY backup.sh /app/backup.sh
RUN chmod +x /app/backup.sh

ENTRYPOINT ["/app/backup.sh"]
