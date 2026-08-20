#!/bin/sh
# Aplica las migraciones pendientes y arranca lo que se le pase como comando.
set -e

echo "[guia] Aplicando migraciones..."
./node_modules/prisma/build/index.js migrate deploy

echo "[guia] Arrancando aplicación"
exec "$@"
