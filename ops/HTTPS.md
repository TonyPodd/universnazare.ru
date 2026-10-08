# Production HTTPS renewal

Public ports 80 and 443 are served by `classroom-nginx` on the Beget VPS.
The Compose project lives in `/root/classroom`. Host Nginx must remain
disabled so that it does not compete for these ports.

Certificates are stored in `/root/classroom/certbot/conf`, mounted in the
Certbot and Nginx containers at `/etc/letsencrypt`. Challenge files are in
`/root/classroom/certbot/www`, mounted at `/var/www/certbot`. Renewal files
in `conf/renewal/*.conf` must use the container paths, not host paths.
HTTP Nginx locations for `/.well-known/acme-challenge/` must serve this
webroot without redirecting the challenge.

## Install

From `/root/mss-platform` on the VPS:

```sh
install -m 750 ops/renew-certificates.sh /usr/local/sbin/classroom-renew-certificates
crontab -e
```

Replace the old classroom Certbot renewal line with this line; preserve
other cron jobs:

```cron
17 */12 * * * /usr/local/sbin/classroom-renew-certificates >> /var/log/classroom-certificates-renew.log 2>&1
```

The Compose Certbot service has a looping shell entrypoint. Running
`docker compose run --rm certbot renew` does not override it and can leave
long-running containers behind on every cron execution. The script
explicitly overrides the entrypoint, removes its temporary container,
prevents concurrent runs and reloads Nginx after checking its configuration.

## Verify

```sh
/usr/local/sbin/classroom-renew-certificates --cert-name universnazare.ru --dry-run
curl -I https://universnazare.ru/
curl https://universnazare.ru/api/
tail -50 /var/log/classroom-certificates-renew.log
```

To renew an expired certificate immediately:

```sh
/usr/local/sbin/classroom-renew-certificates --cert-name universnazare.ru
```

Normal scheduled runs process the shared certificate directory, including
the classroom and tehno-mk domains. They renew only certificates that are
due. Do not stop the shared Nginx container or change its domain routing
to renew a certificate.

On 2026-10-08, the expired universnazare.ru certificate was renewed, the
script above was installed, and both a simulated renewal and HTTPS/API
checks succeeded. The replacement certificate expires on 2027-01-06.
