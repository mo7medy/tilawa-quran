# Cloudflare build support fix — 2026-10-21

The production build stopped before compiling the application. OpenNext's AWS helper `4.1.9`
computed Next.js 15's support deadline as `2024-10-21 + 2 years`, at midnight on 2026-10-21. That
lifecycle check rejected every Next.js 15 patch after this deadline, even while the official Next.js
support policy still listed Next.js 15 as Maintenance LTS.

Cloudflare adapter `1.20.13` uses AWS helper `4.1.12`, which also recognizes a major version as
supported while it is Active or Maintenance LTS: Next.js 15 remains supported until the helper
records Next.js 17. This corrects the date-only failure while keeping the lifecycle guard enabled.

This release pins Next.js and its ESLint configuration to `15.5.28` and the Cloudflare adapter to
`1.20.13`. The adapter's declared Next.js 15 peer range starts at `15.5.28`. React 18, Pages Router,
the application configuration and the Cloudflare build command are preserved. The lockfile includes
matching Next environment/compiler packages and the corrected AWS helper.

Sources:

- [Next.js support policy](https://nextjs.org/support-policy)
- [OpenNext Cloudflare releases](https://github.com/opennextjs/opennextjs-cloudflare/releases)
- Published `@opennextjs/aws@4.1.12`, `dist/build/helper.js`, `isNextVersionSupported` /
  `checkNextVersionSupport`.
- Published `@opennextjs/cloudflare@1.20.13`, `dist/cli/commands/build.js`.

Verification reproduces the old lifecycle rejection and confirms that the new helper accepts the
patched Next.js 15 release with the guard enabled. Registry metadata and dependency-closure checks
cover the 694 selectors referenced by the updated packages. Focused Quran reader, backend and
message-history tests pass in the existing local test runtime. Production compilation and deployment
run remotely through the existing Cloudflare Git integration.
