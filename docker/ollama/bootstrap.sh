#!/bin/sh
# Descarga los modelos y crea la variante de chat con contexto ampliado.
# Es idempotente: si ya existen, Ollama no vuelve a descargar nada.
set -e

BASE_MODEL="${OLLAMA_BASE_MODEL:-qwen2.5:14b-instruct}"
CHAT_MODEL="${CHAT_MODEL:-guia-chat}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-bge-m3}"

echo "[ollama] Esperando al servidor..."
until ollama list >/dev/null 2>&1; do
  sleep 2
done

echo "[ollama] Descargando $BASE_MODEL (puede tardar bastante la primera vez)"
ollama pull "$BASE_MODEL"

echo "[ollama] Descargando $EMBEDDING_MODEL"
ollama pull "$EMBEDDING_MODEL"

echo "[ollama] Creando $CHAT_MODEL con num_ctx ampliado"
sed "s|^FROM .*|FROM $BASE_MODEL|" /modelfiles/Modelfile.chat > /tmp/Modelfile.chat
ollama create "$CHAT_MODEL" -f /tmp/Modelfile.chat

echo "[ollama] Modelos listos:"
ollama list
