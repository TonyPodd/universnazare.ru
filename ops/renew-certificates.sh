#!/bin/sh
set -eu

# Serialize cron and manual runs against the shared certificate directory.
exec 9>/run/lock/classroom-renew-certificates.lock
flock -n 9 || exit 0
cd /root/classroom

# Override the Compose service's looping entrypoint with a one-shot command.
renew_status=0
docker compose run --rm --no-deps --entrypoint certbot certbot renew \
  --non-interactive --no-random-sleep-on-renew "$@" || renew_status=$?

# Load successful renewals even if renewal of another domain failed.
docker exec classroom-nginx nginx -t
docker exec classroom-nginx nginx -s reload
exit "$renew_status"
