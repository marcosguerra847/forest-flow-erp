# Plano — SilvaCore Antifurto (Fase Funcional)

Vou ativar **Lovable Cloud** (Postgres + Auth + Storage gerenciados, sem servidor externo) e construir o MVP funcional em 3 entregas. A stack se mantém: React + TanStack Start + Tailwind + shadcn no front, Postgres no back (substitui o FastAPI/Mongo da sua especificação — vantagem: relacional forte ideal para rastreabilidade, RLS para segurança por papel, e zero infra para você gerenciar).

---

## Entrega 1 — Fundação + Cadastros (esta resposta)

**Infra**
- Ativar Lovable Cloud
- Auth Email/Senha + tabela `profiles` + enum de papéis (`app_role`): `admin`, `gestor`, `campo`, `patio`, `serraria`, `comercial`
- Tabela `user_roles` + função `has_role()` (padrão seguro, anti-escalada)
- Bucket Storage `evidencias` (fotos de cargas, recebimentos, parcelas, produção)
- Tabela `audit_log` + trigger genérico (quem/quando/o quê)

**Schema (Postgres) — núcleo rastreável**
```text
fazendas (id, nome, proprietario, local, area_ha, car, status)
talhoes (id, fazenda_id, codigo, especie, area_ha, ano_plantio,
         espacamento, idade_meses, volume_estimado_m3, status)
inventario_parcelas (id, talhao_id, numero, area_m2, qtd_arvores,
                     dap_medio_cm, altura_media_m, observacoes,
                     responsavel_id, data, fotos[])
ordens_colheita (id, codigo OC-AAAA-NNN, fazenda_id, talhao_id,
                 area_autorizada_ha, vol_estimado, vol_autorizado,
                 inicio_previsto, fim_previsto, equipe, maquinas,
                 motoristas_autorizados[], status, observacoes)
cargas (id, codigo CG-AAAA-NNNN, oc_id, talhao_id, especie,
        vol_estimado_m3, qtd_toras, motorista, placa,
        saida_em, gps_saida, responsavel_carregamento,
        fotos[], status)  -- carregada/em_transporte/recebida/divergente
recebimentos_patio (id, carga_id, chegada_em, vol_recebido_m3,
                    qtd_recebida, localizacao_patio, responsavel_id,
                    fotos[], divergencia_m3, justificativa,
                    status)  -- ok/divergente
lotes_patio (id, codigo LT-AAAA-NNN, recebimento_id, especie,
             vol_atual_m3, localizacao, status)
movimentacoes (id, lote_id|produto_id, origem, destino,
               usuario_id, data, fotos[], observacoes)
ordens_producao (id, codigo OP-AAAA-NNNN, lote_origem_id, especie,
                 vol_entrada_m3, vol_produzido_m3, perda_m3,
                 rendimento_pct, operador_id, maquina, data, status)
produtos_acabados (id, codigo PA-AAAA-NNNN, op_id, produto, medidas,
                   especie, quantidade, volume_m3, localizacao,
                   status, data_producao)
divergencias (id, tipo, referencia_id, valor_esperado, valor_real,
              delta, justificativa, status, criada_em)
```
RLS: leitura para autenticados; escrita restrita por papel via `has_role()`.

**Telas (frontend)**
- `/auth` — login/cadastro Email+Senha
- `/_authenticated/*` — todas as telas abaixo, gated
- Cadastros: **Fazendas** e **Talhões** (CRUD real, status, volume estimado)
- **Inventário Florestal** — parcelas por talhão; cálculo automático:
  `árvores/ha = qtd / (area_m2/10000)` · `vol/ha = árvores/ha × vol_árvore_médio`
- Tela **Gestão de Usuários** (admin atribui papéis)

---

## Entrega 2 — Operação Antifurto (próxima resposta após Entrega 1)

- **Ordens de Colheita** (CRUD + status workflow)
- **Cargas** — registro no campo, foto, GPS, geração de **QR Code** imprimível (lib `qrcode`)
- **Recebimento no Pátio** — leitor QR via câmera (`html5-qrcode`), conferência volume/qtd, divergência automática
- **Alertas de Divergência** — dashboard com fila + regras configuráveis (% tolerância)
- **Carga inicial de estoque** (toras e serrados já existentes) com QR retroativo
- **Movimentação no pátio** (origem→destino, log)

## Entrega 3 — Serraria + Produto Acabado

- **Ordem de Produção** — vincula lote_pátio → produto, calcula rendimento e perda
- **Produto Acabado** com QR Code próprio
- **Rastreabilidade end-to-end** (já existe a tela visual; passa a consultar dados reais via SQL recursivo)
- **Relatórios** (volume por talhão, divergências, rendimento, histórico por lote)

---

## Detalhes técnicos

- **Auditoria**: trigger `BEFORE INSERT/UPDATE/DELETE` em todas as tabelas operacionais grava em `audit_log` (`tabela`, `registro_id`, `acao`, `usuario_id`, `payload jsonb`, `criado_em`). Exclusões: soft-delete (`deleted_at`) para registros operacionais.
- **QR Code**: payload curto `tipo:codigo` (ex.: `CG:CG-2026-0001`). Ao escanear, app resolve para URL `/scan/CG-2026-0001` que abre a ficha.
- **Mobile**: telas já responsivas; câmera nativa via `navigator.mediaDevices` para QR e fotos. PWA installable adicionado na Entrega 2.
- **Divergência**: função SQL `check_carga_divergencia(carga_id, tolerancia_pct)` chamada no recebimento; cria registro em `divergencias` se exceder.

---

## Fora do escopo desta fase
Comercial, Logística/Entrega, Financeiro (ficam como já estão no mock visual até Fase 2 do roadmap).

Posso seguir com a **Entrega 1** agora?