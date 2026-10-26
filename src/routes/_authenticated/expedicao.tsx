import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { linkRomaneio } from "@/lib/site-url";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package2,
  Plus,
  QrCode,
  Trash2,
  Copy,
  FileDown,
  Printer,
  Pencil,
  PlusCircle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { QrDisplay } from "@/components/QrDisplay";
import { Switch } from "@/components/ui/switch";
import { estadoExpedicao } from "@/lib/romaneio-status";
import {
  filtrarPorData,
  periodo,
  type CampoDataRomaneio,
  type PresetDataRomaneio,
} from "@/lib/romaneio-filtro";
import {
  gerarNotaPacote,
  calcM3,
  type PacoteNota,
  type ItemRomaneioNota,
} from "@/lib/nota-expedicao";

type Pacote = PacoteNota & {
  id: string;
  token: string;
  forma_pagamento?: string | null;
  situacao_pagamento?: "pendente" | "pago" | null;
  valor_previsto?: number | null;
  data_saida_carga?: string | null;
  placa_caminhao?: string | null;
};

type ItemForm = {
  descricao: string;
  comprimento_m: string;
  espessura_m: string;
  largura_m: string;
  qtd_blocos: string;
  pecas_por_pacote: string;
  valor_unitario: string;
};

const novoItem = (): ItemForm => ({
  descricao: "",
  comprimento_m: "",
  espessura_m: "",
  largura_m: "",
  qtd_blocos: "",
  pecas_por_pacote: "",
  valor_unitario: "",
});

const num = (s: string | number | null | undefined) =>
  Number(String(s ?? "").replace(",", ".")) || 0;

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const dataLocalISO = () => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export const Route = createFileRoute("/_authenticated/expedicao")({
  head: () => ({
    meta: [
      { title: "Expedição · Fazenda Bela Vista" },
      {
        name: "description",
        content: "Romaneios de expedição com múltiplos produtos.",
      },
      { property: "og:title", content: "Expedição · Fazenda Bela Vista" },
      { property: "og:description", content: "Romaneios de madeira e cavaco e controle de expedição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpedicaoPage,
});

// Endereço público do site (domínio próprio): abre de qualquer celular sem login.
const linkOperador = (p: Pacote) => linkRomaneio(p.codigo, p.token);

const PRESETS: { id: PresetDataRomaneio; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7dias", label: "7 dias" },
  { id: "30dias", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "tudo", label: "Tudo" },
];

async function pacoteComItens(p: Pacote): Promise<Pacote> {
  if (p.tipo_carga === "cavaco") return p;

  const { data, error } = await supabase
    .from("itens_romaneio" as never)
    .select("*")
    .eq("romaneio_id", p.id)
    .order("criado_em", { ascending: true });

  if (error) throw error;

  return {
    ...p,
    itens: (data ?? []) as unknown as ItemRomaneioNota[],
  };
}

function ExpedicaoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<Pacote | null>(null);
  const [editing, setEditing] = useState<Pacote | null>(null);
  const [campoData, setCampoData] = useState<CampoDataRomaneio>("saida");
  const [preset, setPreset] = useState<PresetDataRomaneio>("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pacotes"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pacotes_expedicao" as never)
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;

      return data as unknown as Pacote[];
    },
  });

  const filtrados = filtrarPorData(rows, { campo: campoData, de, ate });
  const prontos = filtrados.filter((r) => r.status === "pronto");
  const exp = filtrados.filter((r) => r.status !== "pronto");

  const aplicarPreset = (id: PresetDataRomaneio) => {
    setPreset(id);
    const p = periodo(id);
    setDe(p.de);
    setAte(p.ate);
  };

  const abrirPdf = async (p: Pacote, imprimir = false) => {
    try {
      await gerarNotaPacote(await pacoteComItens(p), linkOperador(p), imprimir);
    } catch (e) {
      toast.error(
        `Não foi possível gerar a nota: ${(e as Error).message}`,
      );
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pátio · Estoque"
        title="Expedição de romaneios"
        description="Cadastre uma carga com vários produtos, calcule a cubagem e controle o pagamento."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Novo romaneio
              </Button>
            </DialogTrigger>

            <RomaneioForm
              key={String(open)}
              onSaved={(p) => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["pacotes"] });
                setQr(p);
              }}
            />
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 pb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Controle por data
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Data de
          </Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={campoData}
            onChange={(e) =>
              setCampoData(e.target.value as CampoDataRomaneio)
            }
          >
            <option value="saida">Saída da carga</option>
            <option value="registro">Registro</option>
            <option value="expedicao">Expedição</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            De
          </Label>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={de}
            onChange={(e) => {
              setDe(e.target.value);
              setPreset("tudo");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Até
          </Label>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={ate}
            onChange={(e) => {
              setAte(e.target.value);
              setPreset("tudo");
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {PRESETS.map((p) => {
            const ativo =
              p.id === "tudo" ? !de && !ate : preset === p.id && !(!de && !ate);
            return (
              <Button
                key={p.id}
                size="sm"
                variant={ativo ? "default" : "outline"}
                onClick={() => aplicarPreset(p.id)}
              >
                {p.label}
              </Button>
            );
          })}
        </div>

        <div className="ml-auto pb-1 text-right">
          <p className="text-sm font-semibold">
            {filtrados.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              de {rows.length} romaneios
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Os valores abaixo consideram o período
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Prontos p/ envio"
          value={prontos.length}
          icon={Package2}
          tone="warning"
        />

        <KpiCard
          label="Pacotes prontos"
          value={prontos.reduce(
            (s, r) => s + Number(r.qtd_blocos || 0),
            0,
          )}
          icon={Package2}
        />

        <KpiCard
          label={`Valor expedido (${exp.length})`}
          value={moeda(
            exp.reduce(
              (s, r) => s + Number(r.valor_previsto ?? r.valor_total ?? 0),
              0,
            ),
          )}
          icon={Package2}
          tone="success"
        />

        <KpiCard
          label="m³ expedidos"
          value={exp
            .reduce(
              (s, r) =>
                s + Number(r.volume_expedido_m3 ?? r.volume_m3 ?? 0),
              0,
            )
            .toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
          icon={Package2}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
          {de || ate
            ? "Nenhum romaneio no período selecionado."
            : "Nenhum romaneio cadastrado ainda."}
        </div>
      ) : (
        <DataTable
          rows={filtrados}
          columns={[
            {
              key: "codigo",
              label: "Romaneio",
              render: (r) => (
                <span className="font-mono text-xs">{r.codigo}</span>
              ),
            },
            {
              key: "criado_em",
              label: "Registro",
              render: (r) =>
                r.criado_em
                  ? new Date(r.criado_em).toLocaleDateString("pt-BR")
                  : "—",
            },
            {
              key: "descricao",
              label: "Produtos",
              render: (r) => (
                <span>
                  {r.descricao ||
                    (r.tipo_carga === "cavaco" ? "Cavaco" : "Romaneio")}
                </span>
              ),
            },
            { key: "cliente_nome", label: "Cliente" },
            {
              key: "data_saida_carga",
              label: "Saída",
              render: (r) =>
                r.data_saida_carga
                  ? new Date(
                      `${r.data_saida_carga}T12:00:00`,
                    ).toLocaleDateString("pt-BR")
                  : "—",
            },
            {
              key: "expedido_em",
              label: "Expedido em",
              render: (r) =>
                r.expedido_em
                  ? new Date(r.expedido_em).toLocaleDateString("pt-BR")
                  : "—",
            },
            {
              key: "qtd_blocos",
              label: "Pacotes",
              align: "right",
              render: (r) => String(r.qtd_blocos ?? 0),
            },
            {
              key: "qtd_pecas",
              label: "Peças",
              align: "right",
              render: (r) =>
                Number(r.qtd_pecas ?? 0).toLocaleString("pt-BR"),
            },
            {
              key: "volume_m3",
              label: "Volume (m³)",
              align: "right",
              render: (r) =>
                Number(r.volume_m3 ?? 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                }),
            },
            {
              key: "valor_previsto",
              label: "Valor",
              align: "right",
              render: (r) =>
                moeda(Number(r.valor_previsto ?? r.valor_total ?? 0)),
            },
            {
              key: "situacao_pagamento",
              label: "Pagamento",
              render: (r) => (
                <StatusBadge
                  tone={
                    r.situacao_pagamento === "pago" ? "success" : "warning"
                  }
                >
                  {r.situacao_pagamento === "pago" ? "Pago" : "Pendente"}
                </StatusBadge>
              ),
            },
            {
              key: "status",
              label: "Expedição",
              render: (r) => (
                <StatusBadge
                  tone={r.status === "pronto" ? "warning" : "success"}
                >
                  {r.status === "pronto" ? "Pronto" : "Expedido"}
                </StatusBadge>
              ),
            },
            {
              key: "acoes",
              label: "",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Editar romaneio"
                    onClick={() => setEditing(r)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    title="Baixar nota"
                    onClick={() => void abrirPdf(r)}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    title="QR Code"
                    onClick={() => setQr(r)}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    title="Excluir"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Excluir romaneio ${r.codigo}? Os produtos vinculados também serão excluídos.`,
                        )
                      ) {
                        return;
                      }

                      const { error } = await supabase
                        .from("pacotes_expedicao" as never)
                        .delete()
                        .eq("id", r.id);

                      if (error) {
                        toast.error(error.message);
                      } else {
                        toast.success("Romaneio excluído");
                        qc.invalidateQueries({ queryKey: ["pacotes"] });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        {editing && (
          <RomaneioForm
            pacote={editing}
            onSaved={(p) => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["pacotes"] });
              if (qr?.id === p.id) setQr(p);
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Romaneio {qr?.codigo}</DialogTitle>
          </DialogHeader>

          {qr && (
            <div className="flex flex-col items-center gap-3 py-2">
              <QrDisplay
                codigo={qr.codigo}
                value={linkOperador(qr)}
                size={220}
                tituloEtiqueta="Romaneio para expedição"
                details={[
                  {
                    label: "Produtos",
                    value: qr.descricao || "Romaneio de produtos",
                  },
                  {
                    label: "Cliente",
                    value: qr.cliente_nome ?? "—",
                  },
                  {
                    label: "Data de saída",
                    value: qr.data_saida_carga
                      ? new Date(
                          `${qr.data_saida_carga}T12:00:00`,
                        ).toLocaleDateString("pt-BR")
                      : "—",
                  },
                  {
                    label: "Placa",
                    value: qr.placa_caminhao ?? "—",
                  },
                  {
                    label: "Pacotes",
                    value: String(qr.qtd_blocos ?? 0),
                  },
                  {
                    label: "Peças",
                    value: Number(qr.qtd_pecas ?? 0).toLocaleString("pt-BR"),
                  },
                  {
                    label: "Volume",
                    value: `${Number(qr.volume_m3 ?? 0).toLocaleString(
                      "pt-BR",
                      { maximumFractionDigits: 4 },
                    )} m³`,
                  },
                  {
                    label: "Valor",
                    value: moeda(
                      Number(qr.valor_previsto ?? qr.valor_total ?? 0),
                    ),
                  },
                  {
                    label: "Pagamento",
                    value:
                      qr.situacao_pagamento === "pago" ? "Pago" : "Pendente",
                  },
                ]}
                notaEtiqueta="Romaneio da carga"
              />

              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => void abrirPdf(qr)}>
                  <FileDown className="mr-1 h-3.5 w-3.5" />
                  Baixar nota (PDF)
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void abrirPdf(qr, true)}
                >
                  <Printer className="mr-1 h-3.5 w-3.5" />
                  Imprimir nota
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(linkOperador(qr));
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copiar link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RomaneioForm({
  onSaved,
  pacote,
}: {
  onSaved: (p: Pacote) => void;
  pacote?: Pacote;
}) {
  const [tipo, setTipo] = useState(pacote?.tipo_carga ?? "madeira");
  const [expedido, setExpedido] = useState(pacote?.status === "expedido");
  const [cliente, setCliente] = useState(pacote?.cliente_nome ?? "");
  const [observacoes, setObservacoes] = useState(pacote?.observacoes ?? "");

  const [dataSaida, setDataSaida] = useState(
    pacote?.data_saida_carga ?? dataLocalISO(),
  );

  const [placaCaminhao, setPlacaCaminhao] = useState(
    pacote?.placa_caminhao ?? "",
  );

  const [formaPagamento, setFormaPagamento] = useState(
    pacote?.forma_pagamento ?? "pix",
  );

  const [situacaoPagamento, setSituacaoPagamento] = useState<
    "pendente" | "pago"
  >(pacote?.situacao_pagamento === "pago" ? "pago" : "pendente");

  const [itens, setItens] = useState<ItemForm[]>([novoItem()]);
  const [unidade, setUnidade] = useState(pacote?.unidade_venda ?? "m3");

  const [quantidadeCavaco, setQuantidadeCavaco] = useState(
    String(pacote?.quantidade_venda ?? ""),
  );

  const [precoCavaco, setPrecoCavaco] = useState(
    String(pacote?.valor_unitario ?? ""),
  );

  const [loadingItems, setLoadingItems] = useState(
    Boolean(pacote && pacote.tipo_carga !== "cavaco"),
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    if (!pacote || pacote.tipo_carga === "cavaco") {
      setLoadingItems(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("itens_romaneio" as never)
        .select("*")
        .eq("romaneio_id", pacote.id)
        .order("criado_em", { ascending: true });

      if (!active) return;

      if (error) {
        toast.error(
          `Não foi possível carregar os produtos: ${error.message}`,
        );
        setLoadingItems(false);
        return;
      }

      const found = (data ?? []) as unknown as ItemRomaneioNota[];

      if (found.length) {
        setItens(
          found.map((i) => ({
            descricao: i.descricao,
            comprimento_m: String(i.comprimento_m),
            espessura_m: String(i.espessura_m),
            largura_m: String(i.largura_m),
            qtd_blocos: String(i.qtd_blocos),
            pecas_por_pacote: String(i.pecas_por_pacote),
            valor_unitario: String(i.valor_unitario),
          })),
        );
      } else if (
        pacote.comprimento_m &&
        pacote.espessura_cm &&
        pacote.largura_cm
      ) {
        setItens([
          {
            descricao: pacote.descricao,
            comprimento_m: String(pacote.comprimento_m),
            espessura_m: String(Number(pacote.espessura_cm) / 100),
            largura_m: String(Number(pacote.largura_cm) / 100),
            qtd_blocos: String(pacote.qtd_blocos),
            pecas_por_pacote: String(
              pacote.pecas_por_pacote ??
                (pacote.qtd_blocos
                  ? Math.round(pacote.qtd_pecas / pacote.qtd_blocos)
                  : 0),
            ),
            valor_unitario: String(pacote.valor_unitario ?? ""),
          },
        ]);
      }

      setLoadingItems(false);
    })();

    return () => {
      active = false;
    };
  }, [pacote]);

  const calculados = itens.map((i) => {
    const qtdBlocos = num(i.qtd_blocos);
    const pecasPorPacote = num(i.pecas_por_pacote);
    const qtdPecas = qtdBlocos * pecasPorPacote;

    const volume = calcM3(
      num(i.comprimento_m),
      num(i.espessura_m),
      num(i.largura_m),
      qtdPecas,
    );

    const valor = volume * num(i.valor_unitario);

    return {
      ...i,
      qtdBlocos,
      pecasPorPacote,
      qtdPecas,
      volume,
      valor,
    };
  });

  const totalPacotes = calculados.reduce((s, i) => s + i.qtdBlocos, 0);
  const totalPecas = calculados.reduce((s, i) => s + i.qtdPecas, 0);
  const totalVolume = calculados.reduce((s, i) => s + i.volume, 0);

  const totalValor =
    tipo === "cavaco"
      ? num(quantidadeCavaco) * num(precoCavaco)
      : calculados.reduce((s, i) => s + i.valor, 0);

  const atualizaItem = (
    index: number,
    campo: keyof ItemForm,
    valor: string,
  ) =>
    setItens((old) =>
      old.map((i, ix) =>
        ix === index ? { ...i, [campo]: valor } : i,
      ),
    );

  const save = async () => {
    if (!cliente.trim()) {
      return toast.error("Informe o cliente ou comprador");
    }

    if (tipo !== "cavaco") {
      if (!calculados.length) {
        return toast.error("Adicione pelo menos um produto");
      }

      for (let i = 0; i < calculados.length; i++) {
        const p = calculados[i];

        if (!p.descricao.trim()) {
          return toast.error(
            `Informe a descrição do produto ${i + 1}`,
          );
        }

        if (
          [p.comprimento_m, p.espessura_m, p.largura_m].some(
            (v) => num(v) <= 0,
          )
        ) {
          return toast.error(
            `Informe as três medidas em metros do produto ${i + 1}`,
          );
        }

        if (
          !Number.isInteger(p.qtdBlocos) ||
          p.qtdBlocos <= 0 ||
          !Number.isInteger(p.pecasPorPacote) ||
          p.pecasPorPacote <= 0
        ) {
          return toast.error(
            `Pacotes e peças por pacote devem ser inteiros positivos (produto ${i + 1})`,
          );
        }

        if (num(p.valor_unitario) < 0) {
          return toast.error(
            `O preço por m³ não pode ser negativo (produto ${i + 1})`,
          );
        }
      }
    } else {
      if (num(quantidadeCavaco) <= 0) {
        return toast.error("Informe a quantidade de cavaco");
      }

      if (num(precoCavaco) < 0) {
        return toast.error("O preço do cavaco não pode ser negativo");
      }
    }

    setSaving(true);

    try {
      const isCavaco = tipo === "cavaco";

      const base: Record<string, unknown> = {
        tipo_carga: tipo,

        descricao: isCavaco
          ? "Cavaco"
          : calculados.length === 1
            ? calculados[0].descricao.trim()
            : `Romaneio com ${calculados.length} produtos`,

        cliente_nome: cliente.trim(),

        data_saida_carga: dataSaida || null,
        placa_caminhao: placaCaminhao.trim().toUpperCase() || null,

        espessura_cm:
          !isCavaco && calculados.length === 1
            ? num(calculados[0].espessura_m) * 100
            : null,

        largura_cm:
          !isCavaco && calculados.length === 1
            ? num(calculados[0].largura_m) * 100
            : null,

        comprimento_m:
          !isCavaco && calculados.length === 1
            ? num(calculados[0].comprimento_m)
            : null,

        qtd_blocos: isCavaco ? 0 : totalPacotes,

        pecas_por_pacote:
          !isCavaco && calculados.length === 1
            ? calculados[0].pecasPorPacote
            : null,

        qtd_pecas: isCavaco ? 0 : totalPecas,

        volume_m3: Number(
          (isCavaco
            ? unidade === "m3"
              ? num(quantidadeCavaco)
              : 0
            : totalVolume
          ).toFixed(6),
        ),

        unidade_venda: isCavaco ? unidade : "m3",

        quantidade_venda: isCavaco
          ? num(quantidadeCavaco)
          : Number(totalVolume.toFixed(6)),

        valor_unitario: isCavaco
          ? num(precoCavaco)
          : totalVolume > 0
            ? Number((totalValor / totalVolume).toFixed(2))
            : null,

        valor_total: Number(totalValor.toFixed(2)),
        valor_previsto: Number(totalValor.toFixed(2)),

        forma_pagamento: formaPagamento,
        situacao_pagamento: situacaoPagamento,
        observacoes: observacoes.trim() || null,
      };

      Object.assign(base, estadoExpedicao(expedido ? "expedido" : "pronto", {
        qtd_blocos: Number(base.qtd_blocos),
        qtd_pecas: Number(base.qtd_pecas),
        volume_m3: Number(base.volume_m3),
        quantidade_venda: Number(base.quantidade_venda),
      }, new Date().toISOString(), pacote));

      let saved: Pacote;

      if (pacote) {
        const { data, error } = await supabase
          .from("pacotes_expedicao" as never)
          .update(base as never)
          .eq("id", pacote.id)
          .select()
          .single();

        if (error) throw error;

        saved = data as unknown as Pacote;
      } else {
        const { data: codigo, error: codeError } = await supabase.rpc(
          "proximo_codigo" as never,
          { _prefixo: "PX" } as never,
        );

        if (codeError) throw codeError;

        const { data, error } = await supabase
          .from("pacotes_expedicao" as never)
          .insert({ ...base, codigo } as never)
          .select()
          .single();

        if (error) throw error;

        saved = data as unknown as Pacote;
      }

      if (isCavaco) {
        if (pacote) {
          const { error } = await supabase
            .from("itens_romaneio" as never)
            .delete()
            .eq("romaneio_id", saved.id);

          if (error) throw error;
        }
      } else {
        const rowsToInsert = calculados.map((i) => ({
          romaneio_id: saved.id,
          descricao: i.descricao.trim(),
          comprimento_m: num(i.comprimento_m),
          espessura_m: num(i.espessura_m),
          largura_m: num(i.largura_m),
          qtd_blocos: i.qtdBlocos,
          pecas_por_pacote: i.pecasPorPacote,
          qtd_pecas: i.qtdPecas,
          volume_m3: Number(i.volume.toFixed(6)),
          valor_unitario: num(i.valor_unitario),
          valor_total: Number(i.valor.toFixed(2)),
        }));

        if (pacote) {
          const { error } = await supabase
            .from("itens_romaneio" as never)
            .delete()
            .eq("romaneio_id", saved.id);

          if (error) throw error;
        }

        const { error: itemError } = await supabase
          .from("itens_romaneio" as never)
          .insert(rowsToInsert as never);

        if (itemError) throw itemError;
      }

      toast.success(
        pacote
          ? `Romaneio ${saved.codigo} atualizado`
          : `Romaneio ${saved.codigo} cadastrado`,
      );

      onSaved(saved);
    } catch (e) {
      toast.error(`Erro ao salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {pacote
            ? `Editar romaneio ${pacote.codigo}`
            : "Novo romaneio de expedição"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <Label htmlFor="romaneio-expedido">{expedido ? "Expedido" : "Não expedido"}</Label>
          <Switch id="romaneio-expedido" checked={expedido} onCheckedChange={setExpedido} />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de carga</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="madeira">Madeira / produtos por peças</option>
            <option value="cavaco">Cavaco (por m³ ou tonelada)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Cliente / comprador</Label>
          <Input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome do cliente"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Data de saída da carga</Label>
          <Input
            type="date"
            value={dataSaida}
            onChange={(e) => setDataSaida(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Placa do caminhão</Label>
          <Input
            value={placaCaminhao}
            onChange={(e) =>
              setPlacaCaminhao(e.target.value.toUpperCase())
            }
            placeholder="ABC1D23"
            maxLength={8}
          />
        </div>

        {tipo === "cavaco" ? (
          <>
            <div className="space-y-1.5">
              <Label>Unidade de venda</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
              >
                <option value="m3">Metro cúbico (m³)</option>
                <option value="ton">Tonelada (t)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Quantidade ({unidade === "ton" ? "toneladas" : "m³"})
              </Label>
              <Input
                type="number"
                min="0.001"
                step="any"
                value={quantidadeCavaco}
                onChange={(e) => setQuantidadeCavaco(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Preço por {unidade === "ton" ? "tonelada" : "m³"} (R$)
              </Label>
              <Input
                inputMode="decimal"
                value={precoCavaco}
                onChange={(e) => setPrecoCavaco(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 rounded-md bg-muted p-3 text-sm">
              <p>
                Valor total: <b>{moeda(totalValor)}</b>
              </p>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Produtos do romaneio</h3>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItens((old) => [...old, novoItem()])
                }
              >
                <PlusCircle className="mr-1 h-4 w-4" />
                Adicionar produto
              </Button>
            </div>

            {loadingItems ? (
              <p className="text-sm text-muted-foreground">
                Carregando produtos existentes...
              </p>
            ) : (
              calculados.map((item, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Produto {index + 1}</h4>

                    {itens.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setItens((old) =>
                            old.filter((_, ix) => ix !== index),
                          )
                        }
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Descrição *</Label>
                    <Input
                      value={item.descricao}
                      onChange={(e) =>
                        atualizaItem(index, "descricao", e.target.value)
                      }
                      placeholder="Ex.: Ripinha de eucalipto"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Comprimento (m)</Label>
                      <Input
                        inputMode="decimal"
                        value={item.comprimento_m}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "comprimento_m",
                            e.target.value,
                          )
                        }
                        placeholder="1,20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Espessura (m)</Label>
                      <Input
                        inputMode="decimal"
                        value={item.espessura_m}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "espessura_m",
                            e.target.value,
                          )
                        }
                        placeholder="0,08"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Largura (m)</Label>
                      <Input
                        inputMode="decimal"
                        value={item.largura_m}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "largura_m",
                            e.target.value,
                          )
                        }
                        placeholder="0,019"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Quantidade de pacotes</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.qtd_blocos}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "qtd_blocos",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Peças por pacote</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.pecas_por_pacote}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "pecas_por_pacote",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Preço por m³ (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={item.valor_unitario}
                        onChange={(e) =>
                          atualizaItem(
                            index,
                            "valor_unitario",
                            e.target.value,
                          )
                        }
                        placeholder="730,00"
                      />
                    </div>
                  </div>

                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="grid gap-1 sm:grid-cols-2">
                      <p>
                        Total de peças:{" "}
                        <b>{item.qtdPecas.toLocaleString("pt-BR")}</b>
                      </p>

                      <p>
                        Volume:{" "}
                        <b>
                          {item.volume.toLocaleString("pt-BR", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 6,
                          })}{" "}
                          m³
                        </b>
                      </p>

                      <p>
                        Valor deste produto: <b>{moeda(item.valor)}</b>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
              <h4 className="mb-2 font-semibold">Totais do romaneio</h4>

              <p>
                Produtos: <b>{calculados.length}</b>
              </p>

              <p>
                Pacotes: <b>{totalPacotes.toLocaleString("pt-BR")}</b>
              </p>

              <p>
                Total de peças: <b>{totalPecas.toLocaleString("pt-BR")}</b>
              </p>

              <p>
                Volume total:{" "}
                <b>
                  {totalVolume.toLocaleString("pt-BR", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 6,
                  })}{" "}
                  m³
                </b>
              </p>

              <p>
                Valor total: <b>{moeda(totalValor)}</b>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Forma de pagamento</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          >
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="transferencia">Transferência</option>
            <option value="cartao">Cartão</option>
            <option value="boleto">Boleto</option>
            <option value="prazo">A prazo</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Situação do pagamento</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={situacaoPagamento}
            onChange={(e) =>
              setSituacaoPagamento(
                e.target.value as "pendente" | "pago",
              )
            }
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={saving || loadingItems}>
          {saving
            ? "Salvando..."
            : pacote
              ? "Salvar alterações"
              : "Salvar romaneio + QR"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
