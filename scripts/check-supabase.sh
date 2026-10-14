#!/bin/sh
# Run from the repo root in a normal terminal: checks the live project without printing keys.
set -e
. ./web/.env.local
H="apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "REST:   $(curl -s -o /dev/null -w '%{http_code}' -H "$H" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/")"
echo "saves (anon, expect 200 with [] or 401/403):  $(curl -s -H "$H" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/saves?select=*&limit=1" | cut -c1-80)"
echo "crews (anon, expect [] or error):             $(curl -s -H "$H" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/crews?select=*&limit=1" | cut -c1-80)"
echo "join_crew rpc (anon, expect permission error): $(curl -s -X POST -H "$H" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{"p_code":"ZZZZZZ"}' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/join_crew" | cut -c1-100)"
echo "auth settings: $(curl -s -H "$H" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" | python3 -c 'import sys,json; j=json.load(sys.stdin); print("email", j["external"]["email"], "autoconfirm", j.get("mailer_autoconfirm"), "signup_disabled", j.get("disable_signup"))')"
