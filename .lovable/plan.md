
# Evolução Fazenda Bela Vista — Financeiro + Rastreabilidade + QR + PWA

Nenhuma tela, tabela, rota, código ou fluxo atual será removido. Tudo é aditivo. Cada fase é entregue funcionando antes de começar a próxima.

---

## Fase 1 — Financeiro completo

**Nota Fiscal manual, vinculada à entrega**
- Ampliar `notas_fiscais` (já existe): série, chave de 44 dg, natureza, CFOP, valor total, base ICMS, ICMS, IPI, data emissão, XML anexado (Storage), PDF anexado. Vínculo com `cargas` e `pedidos`.
- Ao marcar carga como "entregue" exigir NF vinculada (soft: aviso, não bloqueia).

**Centros de custo**
- Nova tabela `centros_custo` fixa: Colheita, Transporte, Serraria, Administrativo, Comercial.
- Campo `centro_custo_id` em `contas_financeiras` e `movimentacoes_caixa`.
- KPI + gráfico por centro na aba Financeiro.

**Conciliação bancária**
- Tabela `contas_bancarias` (banco, agência, conta, saldo inicial).
- Toda `movimentacao_caixa` referencia `conta_bancaria_id`.
- Tela "Conciliação": lista movimentações não-conciliadas × extrato manual (colar linhas ou marcar 1‑a‑1), botão "Conciliar".

**DRE (Demonstrativo de Resultado)**
- Server function que agrega por período: Receita bruta (pedidos entregues) − Impostos (NF) − Custos por centro = Resultado.
- Tela com filtro mês/ano e gráfico de barras.

**Exportação**
- Botões "Exportar CSV" e "Exportar Excel" (SheetJS) para: contas, movimentações, NFs, DRE, conciliação.

---

## Fase 2 — Rastreabilidade ampliada

Mantém a página atual. Adiciona abas laterais dentro dela:

- **Timeline**: eventos ordenados por hora (colheita → carga → saída → recebimento → serraria → PA → venda → entrega), lidos de nova tabela `eventos_rastreio`.
- **Histórico do QR**: quem, quando, onde (GPS), o quê, foto, observação.
- **Divergências**: comparação automática volume estimado × colhido × transportado × recebido × produzido × vendido, com alerta visual quando > 5%.
- **Mapa**: pontos GPS de cada evento em Leaflet (open-source, sem chave).
- **Busca ampliada**: QR/código/talhão/carga/lote/PA/pedido/cliente/espécie/data/motorista/OC/OP.
- **Auditoria**: view somente-leitura da `audit_log` filtrada pelo item.

Nada da rota `/rastreabilidade` atual é apagado — vira uma aba dentro do novo layout.

---

## Fase 3 — QR Code interativo (mesma URL, mais poder)

O código `BV-2026-000154` / `CG-2026-0048` **não muda**. A rota atual `/qr/:tipo/:codigo` continua servindo a mesma landing.

Adições:
- Botão **"Atualizar etapa"** com lista de próximas etapas válidas por tipo (colhido/carregado/em transporte/recebido/…).
- **Anexar foto** (câmera do celular via `<input capture>`), enviada ao bucket `rastreio-fotos` (privado, URL assinada).
- **Captura GPS** automática (`navigator.geolocation`) gravada com o evento.
- **Observação** opcional + responsável (usuário logado ou nome digitado no caso do cliente).
- **Login opcional**: leitura pública continua; escrever exige sessão OU token de confirmação (para cliente final receber a entrega).
- **Impressão** já existe — mantida.

**Confirmação do cliente**
- Link no PDF/etiqueta: `/entrega/:codigo?tok=…` → tela pública com "Recebi a carga", campo nome, foto opcional, assinatura (canvas). Marca pedido como ENTREGUE e cria evento.

---

## Fase 4 — PWA offline + sincronização

- `manifest.webmanifest` (nome, ícone, `display:standalone`, cor Bela Vista) — instalável no celular.
- Service worker (`vite-plugin-pwa`, `generateSW`, `NetworkFirst` para HTML, guardas para não registrar em preview/iframe).
- **Fila offline**: eventos QR gravados no IndexedDB quando `!navigator.onLine`; ao reconectar, replay contra a API. Fotos ficam em blob local e sobem depois.
- Badge "N eventos pendentes" no topo.

---

## Schema (novo, sem tocar no existente)

```text
centros_custo(id, nome, tipo)                          -- seed fixo
contas_bancarias(id, banco, agencia, conta, saldo_ini)
eventos_rastreio(id, entidade_tipo, entidade_id,
                 codigo, tipo_evento, usuario_id,
                 nome_publico, lat, lng, foto_url,
                 observacao, payload_jsonb, criado_em)
confirmacoes_entrega(id, pedido_id, carga_id, codigo,
                     token, assinatura_url, foto_url,
                     nome, criado_em)
```

Alterações aditivas:
- `notas_fiscais`: + serie, chave, cfop, natureza, base_icms, icms, ipi, xml_url, pdf_url
- `contas_financeiras`, `movimentacoes_caixa`: + centro_custo_id, conta_bancaria_id, conciliado_em

RLS: escrita para admin/gestor/comercial; leitura de `eventos_rastreio` liberada para `anon` só nos campos públicos (view). Bucket `rastreio-fotos` privado com URL assinada.

---

## Ordem de execução

1. Migration Fase 1 → tela Financeiro atualizada → aprovar
2. Migration Fase 2 + tela Rastreabilidade ampliada → aprovar
3. Rota QR interativa + bucket + confirmação de entrega → aprovar
4. PWA + fila offline → aprovar

Confirma para eu começar pela **Fase 1 (Financeiro)**? Se quiser mudar a ordem ou pular algo, me diga agora.
