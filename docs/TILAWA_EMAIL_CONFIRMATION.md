# Email confirmation and waiting page

## Diagnosed on 2026-10-21

The independent website project `gsoelrejabrmzqypdchv` has email confirmation enabled. Its live Auth
configuration was read through the existing CLI identity:

- `site_url`: `http://localhost:3000`
- `uri_allow_list`: empty
- Confirmation template: the standard `{{ .ConfirmationURL }}` link

The website already supplies its own origin and `/auth/confirm` callback with a safe local
destination. Without an allowed callback, the hosted Auth flow falls back to the local Site URL. The
screenshot's `localhost:3000/?code=...` is consistent with those verified settings.

## Implemented in the website

- Registration without a session opens `/auth/check-email` instead of leaving the empty signup form.
- EN/AR copy explains that confirmation is required, with inbox/spam instructions and sign-in links.
- Resend uses `auth.resend({ type: 'signup', ... })` and the same origin, locale and safe
  destination.
- A 60-second UI cooldown, pending-request lock and server rate-limit feedback prevent repeated
  clicks.
- The pending address and destination are kept in the current tab's session storage for up to one
  hour. Email is excluded from page URLs. Passwords and confirmation tokens are never stored there.
- When storage is unavailable or the page is opened directly, the address can be entered again.
- Invalid callback links show a useful sign-in message and a resend link.
- Existing sessions continue straight to the requested destination; confirmation is never bypassed.

## Production Auth configuration applied with owner approval

The owner approved the reduced proposal on 2026-10-21. It was applied to the verified independent
website project and read back successfully. Only the deployed website's callbacks were added,
without local hosts or preview domains:

```json
{
  "site_url": "https://tilawa-quran.muhammad5mdk.workers.dev",
  "uri_allow_list": "https://tilawa-quran.muhammad5mdk.workers.dev/auth/confirm,https://tilawa-quran.muhammad5mdk.workers.dev/auth/confirm?**,https://tilawa-quran.muhammad5mdk.workers.dev/auth/callback,https://tilawa-quran.muhammad5mdk.workers.dev/auth/callback?**"
}
```

The query suffix patterns allow the existing `next` and `lang` parameters on those two paths only.
Do not push the complete local `supabase/config.toml` to production to fix these two settings. Keep
email confirmation required, SMTP/provider settings and templates unchanged. The read-back
comparison confirmed that every other Auth configuration field remained unchanged. Request a new
confirmation email after changing settings; previously generated links may retain their original
redirect. A link that already verified an address may permit normal password login.

## Validation

Focused tests cover registration navigation, no-session/session/error outcomes, resend cooldown,
duplicate clicks, failed transport, rate limiting, storage failure, safe return paths and callback
exchange. The page was checked in 20 EN/AR, light/dark layouts at 360, 390, 768, 1024 and 1440
pixels. Visual tests mock mail delivery and block external assets. Real inbox delivery and the final
confirmation round trip require deployed website code and a fresh confirmation email. The hosted
settings are now applied; website UI changes remain local until separately pushed and deployed.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[resend confirmation](https://supabase.com/docs/reference/javascript/auth-resend),
[Auth configuration API](https://supabase.com/docs/reference/api/v1-update-auth-service-config).
