---
title: Locale pt-BR e conteúdo acessível
summary: Tradução funcional, orientação de entrada e alternativas de aprendizagem.
tags: [pt-br, locale, acessibilidade]
created: 2026-09-23
updated: 2026-09-23
confidence: medium
sources: [F022, F023]
---

# Locale e acessibilidade

Inglês é o locale atual; pt-BR entra na v1.1. A pesquisa pode preparar os dois, mas regras genéricas usam L1→JP e JP→L1. Traduções, explicações, respostas aceitas e textos de calibração pertencem ao locale, não à identidade japonesa do item.

## O que traduzir além da interface

| Camada | Trabalho pt-BR |
|---|---|
| Glosa | Delimitar sentido: “quente” pode esconder distinções contextuais |
| Resposta aceita | Curar sinônimos por tarefa, artigos, plural e variantes brasileiras |
| Pronúncia | Evitar prometer equivalência exata com sons portugueses |
| Entrada | Explicar leitura versus teclas, nn/n' e hífen para ー |
| Erro | Explicar o contraste em vez de só dizer “incorreto” |
| Progresso | Distinguir reconhecimento, produção e acesso rápido |
| Exemplos | Não presumir cognatos transparentes a partir do inglês |
| Calibração | Usar texto adequado ao dispositivo/locale sem alterar arbitrariamente regras do motor |

## Glossário editorial inicial, ainda proposto

| Conceito | Rótulo pt-BR candidato | Nota |
|---|---|---|
| Recall | Recuperar de memória | “Lembrar” pode servir em texto curto |
| Known | Conhecido | Explicar que precisa de evidência espaçada |
| Auto | Automático | Não equivale a fluência |
| Leech | Item com dificuldade recorrente | Evitar jargão ou culpa |
| Repair | Reforço / pedir ajuda, conforme contexto | Não usar uma tradução para treino e reparo comunicativo sem distinção |
| Don't know | Não sei ainda | Feedback neutro |
| Due | Para revisar | Evitar linguagem de dívida |

## Conteúdo e acesso

WCAG 2.2 oferece critérios para identificar idioma de trechos e permitir alternativas a limites de tempo. Isso orienta a revisão, sem constituir auditoria de conformidade do app. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Propostas a verificar: texto japonês marcado semanticamente; ruby legível e compatível com tecnologias assistivas; instrução que não dependa de cor; fonte suficientemente diferenciada; alternativas a ouvir para estudar significado, sem dizer que isso mede escuta; percurso sem pressão temporal para quem necessita. Touch e entrada assistiva não devem gerar Auto por comparação ingênua com latência de teclado físico.

## Banco de respostas

Uma tradução não é uma lista de gabaritos. “Rice”, “meal” e “arroz/refeição” para ご飯 dependem do sentido-alvo. Guardar listas por atividade/locale e exemplos de rejeição. Não aplicar tolerância ortográfica a kana que apague っ, ゃ ou vogal longa.

Q03: inventariar as strings reais da UI e produzir lote contextualizado de 20 traduções, com chave estável e captura do contexto textual. Não substituir diretamente frases no código nesta pesquisa.

Relacionados: [[kana-e-fonologia|Kana]] ([arquivo](kana-e-fonologia.md)); [[contrato-de-conteudo|Contrato]] ([arquivo](../04-integracao/contrato-de-conteudo.md)).
