export const kpis = {
  faturamentoMensal: "R$ 1.482.350",
  volumeProduzido: "2.840 m³",
  volumeVendido: "2.610 m³",
  estoqueAtual: "5.120 m³",
  entregasPendentes: 14,
  custoOperacional: "R$ 612.480",
  lucroBruto: "R$ 869.870",
  producaoDiaria: "94 m³",
  rendimento: "68,4%",
};

export const producaoSerie = [
  { mes: "Jan", producao: 2100, venda: 1980 },
  { mes: "Fev", producao: 2350, venda: 2210 },
  { mes: "Mar", producao: 2600, venda: 2480 },
  { mes: "Abr", producao: 2480, venda: 2390 },
  { mes: "Mai", producao: 2720, venda: 2580 },
  { mes: "Jun", producao: 2840, venda: 2610 },
];

export const estoqueEspecie = [
  { especie: "Eucalipto", volume: 2840 },
  { especie: "Pinus", volume: 1420 },
  { especie: "Teca", volume: 520 },
  { especie: "Cedro", volume: 340 },
];

export const fazendas = [
  { id: 1, nome: "Santa Helena", proprietario: "Agropec. Verde S.A.", local: "Itapeva-SP", area: 1240, plantada: 980, status: "Ativa" },
  { id: 2, nome: "Boa Vista", proprietario: "Florestal Boa Vista", local: "Lages-SC", area: 860, plantada: 720, status: "Ativa" },
  { id: 3, nome: "Três Pinheiros", proprietario: "JR Madeiras", local: "Telêmaco Borba-PR", area: 2100, plantada: 1850, status: "Manejo" },
  { id: 4, nome: "Vale Verde", proprietario: "Cooperativa Verde", local: "Caçador-SC", area: 540, plantada: 410, status: "Ativa" },
];

export const talhoes = [
  { codigo: "T-01", fazenda: "Santa Helena", especie: "Eucalipto", area: 84, plantio: "2019-03", idade: "6a 8m", status: "Pronto p/ corte" },
  { codigo: "T-05", fazenda: "Santa Helena", especie: "Eucalipto", area: 96, plantio: "2020-07", idade: "5a 5m", status: "Em manejo" },
  { codigo: "T-12", fazenda: "Boa Vista", especie: "Pinus", area: 120, plantio: "2017-11", idade: "8a", status: "Em colheita" },
  { codigo: "T-23", fazenda: "Três Pinheiros", especie: "Pinus", area: 210, plantio: "2018-02", idade: "7a 9m", status: "Pronto p/ corte" },
  { codigo: "T-31", fazenda: "Vale Verde", especie: "Teca", area: 45, plantio: "2015-09", idade: "10a 2m", status: "Em colheita" },
];

export const toras = [
  { id: "TR-1042", especie: "Eucalipto", fazenda: "Santa Helena", talhao: "T-01", diametro: 38, comprimento: 5.2, volume: 0.59, valor: 142, entrada: "2026-05-28", patio: "Pilha A-3" },
  { id: "TR-1043", especie: "Pinus", fazenda: "Boa Vista", talhao: "T-12", diametro: 42, comprimento: 4.8, volume: 0.67, valor: 156, entrada: "2026-05-28", patio: "Pilha B-1" },
  { id: "TR-1044", especie: "Eucalipto", fazenda: "Santa Helena", talhao: "T-05", diametro: 35, comprimento: 5.5, volume: 0.53, valor: 128, entrada: "2026-05-29", patio: "Pilha A-3" },
  { id: "TR-1045", especie: "Teca", fazenda: "Vale Verde", talhao: "T-31", diametro: 48, comprimento: 4.5, volume: 0.81, valor: 412, entrada: "2026-05-30", patio: "Pilha C-1" },
  { id: "TR-1046", especie: "Pinus", fazenda: "Três Pinheiros", talhao: "T-23", diametro: 40, comprimento: 5.0, volume: 0.62, valor: 148, entrada: "2026-05-31", patio: "Pilha B-2" },
  { id: "TR-1047", especie: "Eucalipto", fazenda: "Santa Helena", talhao: "T-01", diametro: 36, comprimento: 5.3, volume: 0.54, valor: 130, entrada: "2026-06-01", patio: "Pilha A-4" },
];

export const ordensProducao = [
  { op: "OP-2026-0184", tora: "TR-1042", produto: "Prancha 5x20", operador: "Carlos M.", maquina: "Serra L-02", data: "2026-06-01", entrada: 0.59, saida: 0.41, rend: 69.5, status: "Concluída" },
  { op: "OP-2026-0185", tora: "TR-1043", produto: "Viga 6x16", operador: "André S.", maquina: "Serra L-01", data: "2026-06-01", entrada: 0.67, saida: 0.46, rend: 68.7, status: "Concluída" },
  { op: "OP-2026-0186", tora: "TR-1045", produto: "Tábua 2.5x15", operador: "Joana P.", maquina: "Serra L-03", data: "2026-06-02", entrada: 0.81, saida: 0.58, rend: 71.6, status: "Em execução" },
  { op: "OP-2026-0187", tora: "TR-1046", produto: "Caibro 5x6", operador: "Marcos T.", maquina: "Serra L-02", data: "2026-06-02", entrada: 0.62, saida: 0, rend: 0, status: "Aguardando" },
];

export const produtos = [
  { codigo: "PR-501", nome: "Prancha 5x20", especie: "Eucalipto", qtd: 312, volume: 124.8, local: "Galpão A", preco: 2480 },
  { codigo: "PR-502", nome: "Viga 6x16", especie: "Eucalipto", qtd: 184, volume: 86.4, local: "Galpão A", preco: 2210 },
  { codigo: "PR-503", nome: "Caibro 5x6", especie: "Pinus", qtd: 540, volume: 64.8, local: "Galpão B", preco: 1380 },
  { codigo: "PR-504", nome: "Tábua 2.5x15", especie: "Pinus", qtd: 720, volume: 81.0, local: "Galpão B", preco: 1180 },
  { codigo: "PR-505", nome: "Ripa 2x5", especie: "Eucalipto", qtd: 1240, volume: 24.8, local: "Galpão A", preco: 890 },
  { codigo: "PR-506", nome: "Sarrafo 2x10", especie: "Teca", qtd: 95, volume: 14.2, local: "Galpão C", preco: 4820 },
];

export const clientes = [
  { id: 1, nome: "Construtora Horizonte", doc: "12.345.678/0001-90", tel: "(11) 3456-7890", email: "compras@horizonte.com.br", limite: 250000 },
  { id: 2, nome: "Madeireira Central", doc: "98.765.432/0001-10", tel: "(41) 3322-1180", email: "fiscal@central.com.br", limite: 180000 },
  { id: 3, nome: "Marcenaria Artezza", doc: "54.321.876/0001-22", tel: "(47) 99887-5544", email: "contato@artezza.com.br", limite: 60000 },
  { id: 4, nome: "Construtech Engenharia", doc: "11.222.333/0001-44", tel: "(11) 4002-8922", email: "supply@constructech.com", limite: 420000 },
];

export const pedidos = [
  { numero: "PV-3201", cliente: "Construtora Horizonte", itens: 4, total: 84320, pagamento: "30/60/90", status: "Faturado", data: "2026-05-28" },
  { numero: "PV-3202", cliente: "Madeireira Central", itens: 6, total: 142180, pagamento: "À vista", status: "Em separação", data: "2026-05-30" },
  { numero: "PV-3203", cliente: "Marcenaria Artezza", itens: 2, total: 18640, pagamento: "Boleto 30d", status: "Aguardando pgto", data: "2026-05-31" },
  { numero: "PV-3204", cliente: "Construtech Engenharia", itens: 9, total: 318720, pagamento: "Carteira", status: "Em produção", data: "2026-06-01" },
];

export const entregas = [
  { id: "ENT-880", pedido: "PV-3201", veiculo: "MBB-2429 / KQR-8821", motorista: "Sérgio L.", rota: "SP → Campinas", saida: "2026-06-02", status: "Em rota" },
  { id: "ENT-881", pedido: "PV-3202", veiculo: "Volvo FH / RTY-4490", motorista: "Pedro V.", rota: "PR → Curitiba", saida: "2026-06-03", status: "Carregando" },
  { id: "ENT-882", pedido: "PV-3204", veiculo: "Scania R450 / OPL-1187", motorista: "Anderson R.", rota: "SC → Joinville", saida: "2026-06-04", status: "Agendada" },
];

export const financeiro = [
  { tipo: "Receber", desc: "PV-3201 — Construtora Horizonte", venc: "2026-06-27", valor: 28107, status: "Em aberto" },
  { tipo: "Receber", desc: "PV-3202 — Madeireira Central", venc: "2026-06-05", valor: 142180, status: "Em aberto" },
  { tipo: "Pagar", desc: "Compra toras — Florestal Boa Vista", venc: "2026-06-10", valor: 84600, status: "Programado" },
  { tipo: "Pagar", desc: "Energia — Serraria Matriz", venc: "2026-06-08", valor: 32480, status: "Programado" },
  { tipo: "Pagar", desc: "Folha de pagamento — Maio", venc: "2026-06-05", valor: 218400, status: "Programado" },
  { tipo: "Receber", desc: "PV-3198 — Construtech", venc: "2026-05-30", valor: 96400, status: "Recebido" },
];

export const fluxoCaixa = [
  { mes: "Jan", entrada: 1180, saida: 820 },
  { mes: "Fev", entrada: 1240, saida: 880 },
  { mes: "Mar", entrada: 1390, saida: 910 },
  { mes: "Abr", entrada: 1310, saida: 940 },
  { mes: "Mai", entrada: 1420, saida: 980 },
  { mes: "Jun", entrada: 1482, saida: 1010 },
];

export const rastreio = {
  produto: "Prancha 5x20 — lote PR-501-A",
  cadeia: [
    { etapa: "Produto Final", info: "Prancha 5x20 — Eucalipto", data: "2026-06-01", local: "Galpão A" },
    { etapa: "Ordem de Produção", info: "OP-2026-0184 · Operador Carlos M. · Serra L-02", data: "2026-06-01", local: "Serraria Matriz" },
    { etapa: "Tora", info: "TR-1042 · Ø38cm · 5.2m · 0.59 m³", data: "2026-05-28", local: "Pátio — Pilha A-3" },
    { etapa: "Colheita", info: "Equipe C · Volume 412 m³ · Harvester JD-1270", data: "2026-05-22", local: "Talhão T-01" },
    { etapa: "Talhão", info: "T-01 · Eucalipto urograndis · 84 ha", data: "Plantio 03/2019", local: "Fazenda Santa Helena" },
    { etapa: "Fazenda", info: "Santa Helena · Itapeva-SP · 1.240 ha · CAR ativo", data: "Origem", local: "SP" },
  ],
};
