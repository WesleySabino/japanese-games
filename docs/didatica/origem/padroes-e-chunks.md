---
title: Padrões produtivos e chunks
summary: Como transformar palavras e formas em combinações úteis e revisáveis.
tags: [padroes, chunks, sentence-unlocks]
created: 2026-09-23
updated: 2026-10-02
confidence: medium
sources: [F001, F002, F023]
---

# Padrões e chunks

## Atualização R002 — 2026-10-02

R002 revisou 20 padrões e 12 chunks e acrescentou 60 combinações autorais AI, sem áudio nem liberação para Sentence Unlock. Tarefas controladas de forma são separadas de produção contextual aberta, que aceita alternativas legítimas. Fórmulas polidas podem ser aprendidas antes da análise completa.

Ver [revisão editorial AI e evidência por item](../07-revisao-ai/README.md). O texto restante é a síntese anterior, lida junto desta atualização; não atribuir aos registros históricos certificação posterior.

Um padrão descreve uma estrutura reutilizável; um chunk oferece uma ação comunicativa pronta. Pedir para repetir pode ser útil antes de o aluno analisar toda a frase. A decomposição posterior deve preservar a ligação com formas e partículas, sem bloquear a introdução pragmática do chunk por dependência circular.

## Famílias a cobrir

| Família | Função | Dependências e riscos |
|---|---|---|
| Cópula e identificação | Dizer o que algo é | Nomes, demonstrativos, registro, negação |
| Dêixis e localização | Apontar e localizar | これ/それ/あれ, ここ/そこ/あそこ, どこ |
| Existência | Dizer que há algo/alguém | ある/いる e animacidade contextual |
| Ação e argumentos | Comer, beber, comprar, deslocar-se | Valência, objeto, lugar, origem/destino |
| Preferência/desejo | Gostar, querer fazer | 好き, たい e contexto de pessoa |
| Pedido/oferta | Pedir objeto, ação ou oferecer ajuda | Registro e benefício para interlocutor |
| Quantidade e comparação | Quantidade, preço, limitação, comparar | Contadores, escopo de だけ/しか, より |
| Aspecto/experiência | Ação em curso, estado resultante, experiência | ている não se reduz a gerúndio |
| Motivo/condição | Explicar e ligar consequências | から/ので e condicionais com restrições |

O piloto instancia só parte dessas famílias. Os ~75 padrões da seed continuam meta aberta de curadoria, sem contagem inflada por simples troca de registro.

## Especificação de um padrão

- Função em uma frase e situação de uso.
- Estrutura japonesa e registro.
- Formas e usos de partículas necessários.
- Slots com classes semânticas e exemplos de incompatibilidade.
- Pelo menos três combinações naturais verificadas para o desbloqueio.
- Prompt de produção, alternativas aceitas e explicação do erro provável.
- Áudio revisado por exemplo e lista de palavras conhecidas necessárias.

Exemplo editorial: `Nをください` usa um objeto solicitável no contexto. Não permitir toda entidade nominal apenas porque seu POS é substantivo. “Pedir um café no balcão” difere de “pedir uma estação”. Mesmo a forma gramaticalmente construída pode ser inadequada.

## Reparar é uma habilidade

Priorizar pedido de repetição, pedido de fala mais lenta, confirmação, declaração de não compreensão e pedido de localização. A missão deve permitir alcançar um resultado após reparo e informar o apoio utilizado, sem tratar isso como fracasso absoluto.

O JF Standard orienta metas por tarefas. Nossos can-dos e enunciados são propostas próprias; não são descritores oficialmente certificados. [JF Standard](https://www.jfstandard.jpf.go.jp/pdf/jfs2024_pamphlet_en.pdf).

## Medir combinabilidade sem exagerar

Manter IDs das combinações efetivamente revisadas. Quatro nomes e quatro verbos não autorizam anunciar 16 frases úteis; concordância semântica, contexto e registro podem eliminar várias. A interface futura conta padrões desbloqueados e exemplos validados.

Q06: escolher oito padrões do piloto, produzir três exemplos curtos por padrão e encaminhar cabeçalhos/chunks primeiro para revisão nativa.

Relacionados: [[formas-e-particulas|Gramática]] ([arquivo](formas-e-particulas.md)); [[missoes-e-pragmatica|Missões]] ([arquivo](missoes-e-pragmatica.md)); [[leitura-e-i-mais-um|Leitura]] ([arquivo](leitura-e-i-mais-um.md)).

