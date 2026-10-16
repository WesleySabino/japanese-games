---
title: Vocabulário, sentidos e seleção do Core
summary: Método de escolha de um núcleo combinável sem inventar rankings ou equivalências.
tags: [vocabulario, curriculo, sentidos]
created: 2026-09-23
updated: 2026-10-02
confidence: medium
sources: [F002, F006, F009, F011, F023]
---

# Vocabulário e seleção

## Atualização R002 — 2026-10-02

R002 revisou os 60 lexemas, corrigiu sete campos de glosa/POS e adicionou 60 exemplos guiados e gabaritos contextuais. Mantém IDs/sentidos e frequency:null. Não importou verbetes nem classificou frequência; o léxico piloto não representa currículo completo.

Ver [revisão editorial AI e evidência por item](../07-revisao-ai/README.md). O texto restante é a síntese anterior, lida junto desta atualização; não atribuir aos registros históricos certificação posterior.

## Unidade editorial

Selecionar **lexema + leitura + sentido + uso**, não apenas sequência de caracteres. Separar homógrafos/homófonos quando necessário; evitar acumular todas as traduções do dicionário numa resposta aceita. A glosa de 水 no primeiro recorte pode ser “água”; não autoriza todos os usos possíveis da palavra nem todas as expressões com 水.

JMdict é candidato para conferência lexical, com as condições de F006. Nenhum verbete foi importado para o piloto desta rodada. Os campos `upstream_entry_id` e `frequency` permanecem `null` até verificação.

## Seleção em camadas

1. Definir ações: pedir bebida, localizar estação, confirmar destino, comprar item, reparar falta de compreensão.
2. Selecionar preenchimentos de slots: bebida, lugar, objeto comprável, quantidade, hora, ação, qualidade.
3. Acrescentar funções transversais: dêixis, pergunta, negação, existência, preferência, agradecimento.
4. Conferir escrita usual, classe, valência, registro e sentidos em fonte adequada.
5. Triangular evidências de uso; registrar gêneros e populações cobertos.
6. Comparar pares de candidatos por utilidade, documentando a escolha editorial e possíveis vieses.
7. Só calcular U após dados normalizados e metodologia reproduzível; preservar análises de sensibilidade.

A fórmula da seed é um prior. Não substituir frequência ausente por zero, pois “desconhecido” e “raríssimo” são estados diferentes. O piloto usa `source_band: editorial-pilot`, sem ranking CEJC ou pontuação pseudocientífica.

## Amplitude prevista para o Core

| Família | Exemplos de escopo | Risco a investigar |
|---|---|---|
| Pessoas e relações | Referência, família, ocupação | Pronomes e parentesco dependem do contexto |
| Espaço e transporte | Lugar, direção, origem, destino | Confundir localização com destino ou ação |
| Alimentação e compras | Bebidas, refeições, pagamento | Preferência, pedido e recusa não equivalem |
| Tempo e quantidade | Datas, preços, horários, contadores | Leituras e combinações irregulares |
| Ações cotidianas | Ir, vir, comer, beber, comprar, ver | Grupo verbal e transitividade |
| Estados e qualidades | Existência, tamanho, preço, gosto | Classes adjetivais e polissemia |
| Organização do discurso | Perguntar, confirmar, repetir | Registro, entonação e elipse |
| Necessidades adicionais | Casa, trabalho, estudo, saúde cotidiana | Priorizar sem transformar o app em orientação profissional |

O último grupo é pesquisa futura, sem acrescentar missões Alpha além das três fixadas.

## Aceite lexical por item

Leitura confirmada; sentido delimitado; glosa en/pt-BR revisada; classe e restrições; escrita de apresentação; formas pertinentes; dependências; fontes por campo; ao menos um uso situado; respostas aceitas separadas de tradução. Para escala, a seed propõe três frases por palavra como piso de curadoria — o piloto ainda não o cumpre.

O objetivo da próxima rodada Q02 é verificar os primeiros 20 itens antes de expandir o corte para 60. Não saltar diretamente para 1.500 linhas pouco sustentadas.

Relacionados: [[catalogo-candidatos|Piloto]] ([arquivo](../03-conteudo/catalogo-candidatos.md)); [[kanji-em-palavras|Kanji]] ([arquivo](kanji-em-palavras.md)); [[padroes-e-chunks|Padrões]] ([arquivo](padroes-e-chunks.md)).

