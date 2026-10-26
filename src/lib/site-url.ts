// Endereço público do site (domínio próprio da fazenda).
// Usado nos QR de romaneio: abre de qualquer celular, sem login e sem marca da plataforma.
export const SITE_PUBLICO = "https://sistemafazendabelavista.com.br";

export const linkRomaneio = (codigo: string, token: string) =>
  `${SITE_PUBLICO}/x/${encodeURIComponent(codigo)}?t=${encodeURIComponent(token)}`;
