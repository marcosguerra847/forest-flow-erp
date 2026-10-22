# Project rules
- Keep manifest dispatch-state initialization in a browser-safe helper shared by the form and focused tests, so shipment quantities remain consistent across cargo types.
- Public manifest QR reads must validate the per-manifest secret before returning manifest data or linked items; never expose the secret in the response.