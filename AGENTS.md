# Project rules
- Content routes use leaf-level farmPageHead metadata or an equivalent unique head; shared defaults never replace route-specific titles and descriptions.
- Farm tables use database-enforced approved-role access with admin-only deletion; signup creates a profile without roles, and public tracking reads/writes require a per-code secret so registration is not farm authorization.
- Public delivery photos are uploaded through a secret-validated server function; anonymous storage listing and uploads are forbidden to avoid leaking operational files.
- Log entries keep an optional foreign key to their source plot; cumulative received volume is calculated independently of stock status in a shared tested helper to preserve harvest totals.
- Keep ready-load counting in a browser-safe helper shared by the dispatch page and focused tests; the "pacotes prontos" counter covers only ready manifests that carry blocks, so it never repeats the all-loads ready figure.
- Keep manifest dispatch-state initialization in a browser-safe helper shared by the form and focused tests, so shipment quantities remain consistent across cargo types.
- Public manifest QR reads must validate the per-manifest secret before returning manifest data or linked items; never expose the secret in the response.
- Cylindrical wood volume (pi*(d/2)^2*L*pieces) lives in src/lib/volume-cilindrico.ts, shared by form, PDF and tests; diameter is stored in the thickness field and mirrored to width.
