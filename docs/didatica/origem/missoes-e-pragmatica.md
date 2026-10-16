---
title: Missões e pragmática
summary: Três situações Alpha, objetivos observáveis e caminhos de reparo.
tags: [missoes, pragmatica, can-do]
created: 2026-09-23
updated: 2026-10-02
confidence: medium
sources: [F001, F002, F003, F023]
---

# Missões e pragmática

## Atualização R002 — 2026-10-02

R002 corrigiu os 3 grafos em protótipos textuais de dois turnos do aprendiz, incluindo fala do parceiro, repetição contextual e saída de cancelamento. Apoio é registrado separadamente de desempenho independente. Não há motor de execução, scoring, escuta ou cenário completo certificado.

Ver [revisão editorial AI e evidência por item](../07-revisao-ai/README.md). O texto restante é a síntese anterior, lida junto desta atualização; não atribuir aos registros históricos certificação posterior.

O Alpha tem exatamente três missões: konbini, estação e restaurante (seed §8). A orientação por tarefas do JF ajuda a escrever objetivos observáveis, mas nossos grafos são propostas autorais, sem certificação institucional. [JF Can-do for Life in Japan](https://www.jpf.go.jp/j/urawa/j_rsorcs/seikatsu.html).

## Especificação inicial

| Missão | Can-do autoral | Núcleo lexical | Êxito observável | Próxima expansão |
|---|---|---|---|---|
| Konbini | Pedir um item exibido e compreender uma confirmação simples | Dêixis, objeto, quantidade/preço | Pedido compatível com o item e registro; confirma ou pede repetição | Pergunta de sacola, pagamento e quantidade |
| Estação | Pedir localização da estação; depois confirmar destino de veículo | Estação, veículo, destino, 行く | No primeiro turno, pergunta onde fica a estação e consegue usar reparo | Confirmar destino, ouvir resposta negativa, rota alternativa e plataforma |
| Restaurante | Pedir uma bebida e solicitar a conta | Bebida, pedido, conta | Pedido apropriado; encerra interação de forma compreensível | Escolha entre opções e quantidade |

Os grafos de dados desta rodada são a **menor estrutura testável de autoria**, com início, turno, reparo e debrief. Ainda não representam toda a interação da tabela. Essa fronteira é explícita para evitar chamar um esqueleto de conversa completa.

## Registro e contexto

A tarefa informa local, papéis e intenção. Formas simples são base de aprendizado, mas o pedido em serviço pode exigir polidez. Elipse, apontar e respostas breves podem ser naturais; um parser que exige sempre sujeito explícito ensinaria comportamento artificial.

Não ensinar fórmulas culturais como regras universais de personalidade. Explicar a situação e alternativas. Distinguir recusa cortês, desconhecimento e pedido de repetição; a mesma tradução aproximada pode esconder funções distintas.

## Grafo compartilhado

`brief → scene → learner_turn → debrief`

Do turno sai uma aresta `repair`, que oferece repetição/pista e retorna ao turno. Na expansão, adicionar escolhas por intenção, slots semânticos e respostas do interlocutor. Definir limite de tentativas e saída voluntária no motor futuro, sem aprisionar o aluno em um ciclo.

Cada nó guarda texto, contexto, dependências e áudio quando houver. Cada aresta aceita uma intenção delimitada ou resposta curada, com registro. Não depende de julgamento por LLM em tempo real.

## Rubrica proposta

Avaliar separadamente: objetivo atingido, adequação de registro, compreensão, apoio utilizado e erro reparável. Sucesso com reparo é sucesso comunicativo com apoio; não precisa receber o mesmo indicador de uma execução independente.

Q08 deverá revisar todos os caminhos, inclusive resposta incompatível com slot, resposta válida em registro alternativo, falha de compreensão, abandono e retorno após reparo. Só ampliar missões depois de medir tempo de autoria/revisão dessas três.

Relacionados: [[padroes-e-chunks|Padrões/chunks]] ([arquivo](padroes-e-chunks.md)); [[catalogo-candidatos|Grafos candidatos]] ([arquivo](../03-conteudo/catalogo-candidatos.md)).

