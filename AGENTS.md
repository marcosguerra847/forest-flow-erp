# Project rules
- Keep ready-load counting in a browser-safe helper shared by the dispatch page and focused tests; count manifests rather than blocks so bulk cargo is included.
- Keep manifest dispatch-state initialization in a browser-safe helper shared by the form and focused tests, so shipment quantities remain consistent across cargo types.
- Public manifest QR reads must validate the per-manifest secret before returning manifest data or linked items; never expose the secret in the response.