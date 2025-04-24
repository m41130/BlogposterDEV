#!/usr/bin/env bash
###############################################################################
#  BlogPosterCMS – Startseite setzen (interaktiv)
# ---------------------------------------------------------------------------
#  – fragt alles ab, legt ein tmp‑Cookie‑File an, ruft CSRF‑Token,
#    loggt sich ein und setzt die gewählte Seite als Startseite.
###############################################################################
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# 0) Interaktive Eingabe (ENTER übernimmt Default in [Klammern])
# ──────────────────────────────────────────────────────────────────────────
read -erp "CMS‑URL               [http://localhost:3000] : " BASE_URL
BASE_URL=${BASE_URL:-http://localhost:3000}

read -erp "Admin‑Benutzer        [admin]                : " USER
USER=${USER:-admin}

read -erp "Admin‑Passwort        [123]                  : " -s PASS
PASS=${PASS:-123}
echo

read -erp "Page‑ID als Startseite (z. B. 11)            : " PAGE_ID
[[ -z "$PAGE_ID" ]] && { echo "!! Page‑ID fehlt – abbruch"; exit 1; }

read -erp "Sprach‑Code           [de]                   : " LANG
LANG=${LANG:-de}

API="$BASE_URL/admin/api"
COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT   # temp‑Cookie‑Datei löschen, wenn Script endet

# ──────────────────────────────────────────────────────────────────────────
# 1) CSRF‑Token holen
# ──────────────────────────────────────────────────────────────────────────
printf "• Hole CSRF‑Token … "
curl -s -c "$COOKIE" "$API/auth/config" > /dev/null
CSRF=$(awk '/blog_csrf/ {print $NF}' "$COOKIE" | tail -1) || true
[[ -z "$CSRF" ]] && { echo "❌  fehlgeschlagen"; exit 1; }
echo "ok"

# ──────────────────────────────────────────────────────────────────────────
# 2) Login
# ──────────────────────────────────────────────────────────────────────────
printf "• Login %s … " "$USER"
curl -s -b "$COOKIE" -c "$COOKIE" \
     -H "Content-Type: application/json" \
     -H "x-csrf-token: $CSRF" \
     -X POST "$API/auth/login" \
     -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
     | jq -e '.success==true' >/dev/null 2>&1 && echo "ok" || { echo "❌  fehlgeschlagen"; exit 1; }

# ──────────────────────────────────────────────────────────────────────────
# 3) Seite als Startseite markieren
# ──────────────────────────────────────────────────────────────────────────
printf "• Setze Page‑ID %s als Startseite (%s) … " "$PAGE_ID" "$LANG"
RESP=$(curl -s -b "$COOKIE" -c "$COOKIE" \
     -H "Content-Type: application/json" \
     -H "x-csrf-token: $CSRF" \
     -X POST "$API/pages/$PAGE_ID/setAsStart" \
     -d "{\"language\":\"$LANG\"}")

if echo "$RESP" | jq -e '.success==true' >/dev/null 2>&1; then
  echo "ok"
  echo -e "\n✅  Öffne:  $BASE_URL/  – die Seite sollte jetzt geladen werden."
else
  echo "❌"
  echo "Server‑Antwort:"
  echo "$RESP" | jq .
  exit 1
fi
