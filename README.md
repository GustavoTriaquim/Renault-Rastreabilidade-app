# Renault Tracer

Aplicativo mobile (React Native + Expo SDK 57 + TypeScript + Expo Router) que simula a
rastreabilidade de peças de protótipo em três etapas: **Doca → Meio → Destruição**.
Todos os dados são simulados localmente (JSON + AsyncStorage), sem backend.

## Requisitos

- Node.js LTS (20.19.4 ou superior), Git e VS Code.
- Celular Android com depuração USB (build local) **ou** conta gratuita no Expo (build na nuvem).

## Executar

```bash
npm install
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # regras de negócio (Jest, roda em Node)
```

O app usa módulos nativos (câmera e OCR), então **não roda no Expo Go**: é preciso um
development build instalado no celular.

### Opção A — build na nuvem (EAS)

```bash
npm install -g eas-cli
eas login
eas init
eas build --profile development --platform android
```

Instale o `.apk` gerado no celular e, no computador, rode `npx expo start --dev-client`.

### Opção B — build local (exige Android Studio + JDK)

```bash
npx expo run:android
```

## Funcionalidades

| Área | O que faz |
|---|---|
| Login | Matrícula digitada (teclado numérico) ou lida do crachá por **OCR**; recusa matrícula inválida, inexistente ou de operador inativo; sessão lembrada entre aberturas (revalidada a cada abertura); logout |
| Home | Saudação, etapa de atuação, contadores (pendentes e urgentes/vencidas), atalhos e fila de peças da etapa do operador, por prazo e depois por ordem de chegada na etapa |
| Scanner | Câmera com moldura, OCR real de números impressos, escolha entre vários números, correção manual, tratamento de leitura parcial, sem texto, número inexistente, peça de outra etapa, permissão negada e câmera indisponível; **nada é gravado antes da confirmação** |
| Validação | Aprova a peça na etapa do operador, registra evento de auditoria, avança a etapa, notifica a etapa seguinte; na Destruição conclui a peça e gera o dossiê (uma única vez) |
| Revisão | Motivo e justificativa obrigatórios; a peça fica bloqueada; a decisão é simulada alternando **aprovada, reprovada, aprovada…** |
| Histórico | Derivado dos eventos; filtros por período, etapa, tipo de evento e número da peça; ordenação; abre os detalhes da peça |
| Notificações | Geradas pelos eventos (nunca na renderização); lida/não lida; selo na aba; detalhes com peça, solicitante, analista, justificativas e destino |
| Detalhes da peça | Dados, doca/prazo/status, linha do tempo, operadores, revisões, trilha de auditoria e dossiê |
| Dossiê | Identificação, etapas percorridas (operador, matrícula, data/hora, resultado), revisões e conclusão |

### Regras de negócio decididas com o time

- Toda peça aprovada na revisão **volta para o Meio**.
- A fila é por ordem de chegada na etapa; cada operador só vê peças da própria etapa. O prazo tem prioridade:
  vencido, urgente, médio, leve; dentro da mesma faixa, quem chegou antes.
- A decisão das revisões é simulada e alterna a cada revisão decidida (a primeira é aprovada). A decisão é
  disparada pelo botão **Simular decisão da análise**, que aparece para quem solicitou a revisão
  (nos detalhes da peça e da notificação). O analista é fictício ("Análise de Qualidade (simulada)").
- O prazo é de seis meses-calendário (31/08 + 6 meses = 28/02), nunca 180 dias. O vencimento é uma condição
  derivada da data: não muda etapa nem status.
- Para ficar com o login obrigatório a cada abertura (aparelho compartilhado), mude `PERSIST_SESSION`
  para `false` em `src/constants/session.ts`.

## Dados de demonstração

Os dados iniciais ficam em `src/data/*.json` e usam datas **relativas** ao primeiro uso do app, para que
os alertas de prazo nunca "envelheçam". Depois disso o estado é persistido no AsyncStorage.
Na Home, **Restaurar dados de demonstração** volta tudo ao estado inicial.

| Matrícula | Operador | Etapa |
|---|---|---|
| 483917 | Carlos Almeida | Doca |
| 574206 | Fernanda Lima | Doca |
| 619853 | Rafael Souza | Meio |
| 702418 | Juliana Costa | Meio |
| 835296 | Marcos Pereira | Destruição |
| 941762 | Patrícia Rocha | Destruição |
| 358071 | Ricardo Nunes | Meio (inativo: o login deve ser recusado) |

Números de peça aguardando validação:

| Etapa | Número | Doca | Prazo |
|---|---|---|---|
| Doca | 58316072 | A | vencido |
| Doca | 91826374 | B | urgente (entrou na etapa há ~3 dias) |
| Doca | 47203518 | C | urgente (entrou há ~1 dia) |
| Doca | 31759204 | B | médio |
| Doca | 20481937 | A | leve |
| Meio | 73850621 | C | urgente |
| Meio | 62947185 | B | leve |
| Destruição | 95173846 | B | urgente |
| Destruição | 84617309 | A | médio |
| Destruição | 16385729 | C | leve |

Há ainda 2 peças em revisão (27491638, pedida por Rafael; 38572941, pedida por Fernanda) e 2 concluídas
com dossiê (49618205 e 50729316).

## Roteiros de demonstração

**Fluxo normal (doca → meio → destruição → dossiê)**
1. Entre com `483917` (Carlos). A peça `58316072` (vencida) aparece primeiro na fila.
2. Aba **Scanner**: leia (ou digite) `91826374` → **Consultar peça** → **Confirmar validação**.
3. **Sair**; entre com `619853` (Rafael). Há um aviso de "Peça 91826374 disponível". Valide-a no Scanner.
4. **Sair**; entre com `835296` (Marcos). Valide-a: a destruição é concluída. Toque em **Ver dossiê**.

**Revisão**
1. Entre com `574206` (Fernanda), Scanner, número `31759204` → **Enviar para revisão**: escolha o motivo e escreva
   a justificativa. A peça sai da fila e fica bloqueada.
2. Abra os detalhes da peça: no card da revisão, toque em **Simular decisão da análise**. A primeira decisão é
   **aprovada**: a peça volta ao Meio. Entre com `619853` e veja o aviso "voltou para Meio".
3. Repita com `20481937`: a segunda decisão é **reprovada**. A peça fica bloqueada e não pode ser concluída.
   A notificação de Fernanda mostra analista, justificativas e destino.

**OCR**
Imprima (ou exiba em outra tela, em fonte grande) as matrículas e os números de peça das tabelas acima. No login,
**Ler matrícula do crachá**; no Scanner, enquadre o número. Teste também: duas sequências na mesma foto (aparece a
escolha), um número que não existe, uma foto sem texto e a negação da permissão da câmera.

**Persistência**
Valide uma peça, feche totalmente o app e abra de novo: a sessão, os eventos e os estados continuam.

## Regras de negócio

Ficam em `src/services` (nunca nas telas). Cada serviço devolve `{ ok, value }` ou `{ ok: false, error }`
com um código tipado e uma mensagem em português. Toda escrita é uma transação atômica: se qualquer regra
falhar, nada é gravado.

## Estrutura

```
src/app/         rotas (Expo Router): login, abas, detalhes da peça e da notificação, dossiê
src/components/  componentes reutilizáveis (src/components/ui = design system)
src/constants/   rótulos, prazos, OCR, sessão e revisão
src/context/     sessão do operador e versão dos dados (recarga das telas)
src/data/        JSON iniciais (operadores, peças, eventos, revisões, notificações, dossiês)
src/hooks/       leitura de serviços e decisão de revisão
src/services/    repositório, persistência, sessão, OCR e regras de negócio
src/utils/       datas, prazo, formatação, filtros do histórico e rotas
src/__tests__/   testes das regras
src/theme/       cores, tipografia, espaçamento
src/types/       tipos de domínio
```

O OCR fica isolado em `src/services/ocr`: o motor (`expo-text-extractor`) só entrega linhas de texto; a extração
de candidatos numéricos é uma função pura e testada; quem consulta os dados e decide se a operação é válida é a
camada de serviços. Trocar o motor de OCR não exige mexer em telas nem em regras.

## Limitações conhecidas

- Exige development build (módulos nativos de câmera e OCR). Se o módulo de OCR não existir (por exemplo, no Expo Go),
  o app trata como "OCR indisponível" e deixa digitar o número; esse caminho é coberto por teste de lógica, mas
  não foi validado no Expo Go.
- A qualidade do OCR depende da iluminação, do foco e do contraste do número impresso; por isso a confirmação e a
  correção manual existem antes de qualquer consulta.
- As imagens das peças são ilustrações por ícone (sem fotos reais).
- A decisão das revisões e o analista são simulados; no sistema real virão do site administrativo (fora do escopo).
- Uma revisão aprovada sempre devolve a peça ao Meio, inclusive quando foi pedida na Doca (regra definida para a simulação).
- O dossiê é um objeto estruturado exibido na tela; não há exportação para arquivo.
