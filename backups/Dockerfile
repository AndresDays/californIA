FROM alpine:3.21

RUN apk add --no-cache bash postgresql17-client rclone age aws-cli coreutils tar

WORKDIR /app
COPY lib/manifest.sh backup.sh ./
RUN chmod +x /app/backup.sh

ENTRYPOINT ["/app/backup.sh"]
