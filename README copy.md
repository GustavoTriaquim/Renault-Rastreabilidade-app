# Renault Tracer

Aplicativo mobile (React Native + Expo SDK 57 + TypeScript + Expo Router) para simular a
rastreabilidade de peças de protótipo. Dados simulados localmente, sem backend.

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

## Dados de demonstração

Os dados iniciais ficam em `src/data/*.json` e usam datas **relativas** ao primeiro uso do app, para que
os alertas de prazo nunca "envelheçam". Depois disso o estado é persistido no AsyncStorage.

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

Há ainda 2 peças em revisão (27491638 e 38572941) e 2 concluídas com dossiê (49618205 e 50729316).

## Regras de negócio

Ficam em `src/services` (nunca nas telas). Cada serviço devolve `{ ok, value }` ou `{ ok: false, error }`
com um código tipado e uma mensagem em português. Toda escrita é uma transação atômica: se qualquer regra
falhar, nada é gravado. O prazo é calculado por seis meses-calendário (31/08 + 6 meses = 28/02).

## Estrutura

```
src/app/         rotas (Expo Router): login, abas, detalhes
src/components/  componentes reutilizáveis (src/components/ui = design system)
src/constants/   rótulos e configuração de prazos
src/context/     sessão do operador
src/data/        JSON iniciais (operadores, peças, eventos, revisões, notificações, dossiês)
src/services/    repositório, persistência e regras de negócio
src/utils/       datas e cálculo de prazo
src/__tests__/   testes das regras
src/theme/       cores, tipografia, espaçamento
src/types/       tipos de domínio
```
