---
title: Kanji ensinados em palavras
summary: Seleção por utilidade no Core, leituras contextualizadas e apresentação visual.
tags: [kanji, leitura, furigana]
created: 2026-09-23
updated: 2026-10-02
confidence: medium
sources: [F006, F008, F023]
---

# Kanji em palavras

## Atualização R002 — 2026-10-02

R002 revisou os 18 kanji no contexto de suas palavras, acrescentando leituras e alinhamentos de furigana e pré-requisitos lexicais. Todos os 18 alinhamentos passam roundtrip de grafia/leitura. Não há inventário completo de leituras, teste isolado obrigatório ou ativo de traços importado.

Ver [revisão editorial AI e evidência por item](../07-revisao-ai/README.md). O texto restante é a síntese anterior, lida junto desta atualização; não atribuir aos registros históricos certificação posterior.

O kanji entra quando ajuda a reconhecer palavras e materiais úteis. Essa é a regra da seed §7.8, em lugar de frequência de jornal ou uma promessa de compreender japonês conhecendo 500 caracteres.

## Seleção proposta

Para o recorte lexical vigente, contar palavras e sentidos que cada kanji participa de desbloquear. Quando houver pesos de frequência publicáveis, aplicar a soma ponderada da seed. Enquanto não houver, registrar **contagem lexical sem peso** e ajustes editoriais explícitos, sem chamá-la frequência.

Evitar dupla contagem de variantes gráficas, palavras repetidas em várias missões e sentidos duplicados. Distinguir kanji produtivo do currículo e item receptivo de utilidade, como uma placa. Uma palavra com dois kanji não se torna legível por dominar apenas um deles.

## Quatro dimensões diferentes

| Dimensão | Tarefa | O que não inferir |
|---|---|---|
| Forma visual | Distinguir caractere dentro de palavra | Não certifica pronúncia |
| Leitura lexical | Ler 水, 水曜日 e outra palavra separadamente quando ensinadas | Não conhecer “todas as leituras de 水” por acertar uma |
| Sentido da palavra | Relacionar palavra e contexto | Glosa isolada de kanji não resolve significado composto |
| Uso | Escolher palavra adequada à situação | Reconhecimento gráfico não prova produção |

As referências ao dia da semana ilustram a futura expansão; não fazem parte do lote lexical inicial por inferência.

## Curadoria de forma e leitura

- Registrar grafia de superfície, leitura da palavra, variantes usuais e alinhamento de furigana.
- Não decompor automaticamente toda leitura em segmentos por caractere: leituras especiais e alterações sonoras precisam de análise.
- Componentes visuais podem ajudar a lembrar; mnemônico autoral não deve ser apresentado como etimologia.
- Fonte tipográfica, variante e traços são informação editorial. KanjiVG fornece dados de traços sob licença própria, não uma validação de habilidade de escrita. [Repositório oficial](https://github.com/KanjiVG/kanjivg).
- KANJIDIC2 é fonte candidata de metadados, sob condições EDRDG; evitar importar campos sem necessidade pedagógica. [Termos](https://www.edrdg.org/edrdg/licence.html).

## Furigana e evidência

Aplicar a regra da seed: ajuda para leitura não automática, com opção de acessibilidade, mas nunca revelar a leitura-alvo durante sua avaliação. Proposta de pesquisa: distinguir ajuda acionada, ajuda permanente e resposta sem ajuda; nenhuma delas deve alterar silenciosamente o estado de memória da palavra irmã.

## Próximo lote

Q09: calcular cobertura dos kanji do piloto contra o léxico, selecionar primeiros 10 por ganho real, documentar cada leitura exigida e produzir uma frase por palavra de teste. Revisar palavras que poderiam aparecer inicialmente só em kana. O lote `kanji.json` é um mapa de relações, não um dicionário completo.

Relacionados: [[vocabulario-e-selecao|Vocabulário]] ([arquivo](vocabulario-e-selecao.md)); [[leitura-e-i-mais-um|Leitura]] ([arquivo](leitura-e-i-mais-um.md)).

