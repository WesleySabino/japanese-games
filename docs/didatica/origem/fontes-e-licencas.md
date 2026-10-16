---
title: Fontes, licenças e política de absorção
summary: O papel de cada fonte e os cuidados concretos antes de incorporar seus dados.
tags: [fontes, licencas, proveniencia]
created: 2026-09-23
updated: 2026-09-26
confidence: medium
---

# Fontes e condições de uso

Cadastro estruturado: [fontes.json](fontes.json). O cadastro registra o que foi consultado e o limite da leitura; não é um certificado jurídico. Esta página transforma condições observadas e decisões da seed em regras editoriais de publicação.

| Origem | Papel na pesquisa | Absorção pretendida / condição |
|---|---|---|
| F001–F003 — Japan Foundation | Can-dos, situações, organização do ensino | Criar objetivos próprios e mapear cobertura; não importar descritores por padrão |
| F004/F005 — Irodori | Referência curricular e contraste de escopo | Consulta e links; textos/áudios não entram no pacote sem esclarecer uso específico |
| F006 — EDRDG | Conferência lexical e informações de kanji | Manifesto por campo, atribuição, licença e política de atualização |
| F007 — Tatoeba | Possível reservatório de frases | Filtrar item/autor/licença, revisar japonês e tradução; áudio tem análise independente |
| F008 — KanjiVG | SVGs e estrutura de traços | Manter CC BY-SA 3.0 e atribuição; não reclassificar como conteúdo autoral |
| F009/F010 — CEJC | Questões de corpus e validação permitida | Regra conservadora da seed D1 permanece; nenhum rank ou ordenação derivada |
| F011 — wordfreq | Candidato a sinal lexical complementar | Verificar transformação, notices e segmentação antes de extrair dados |
| F012/F013 — Sudachi | Análise offline | Fixar release do analisador/dicionário e preservar seus avisos; código e dados são camadas distintas |
| F014–F017 — Estudos | Base para desenho e perguntas | Síntese com limites; nenhuma importação de materiais experimentais foi feita |
| F018–F020 — TUFS | Fonologia | Referência didática; nenhum áudio ou exercício copiado |
| F022 — W3C | Acessibilidade | Orienta critérios de conteúdo e tarefas; conformidade precisa avaliação própria |

## Achados que mudam a curadoria

**EDRDG:** a declaração abrange os componentes japonês/inglês de JMdict e KANJIDIC2; outras línguas possuem titulares próprios e há campos com condições adicionais. Há também instruções de atribuição e atualização. O locale pt-BR desta pesquisa é rascunho próprio, não uma tradução declarada como retirada do JMdict. [Declaração oficial](https://www.edrdg.org/edrdg/licence.html).

**Irodori:** a página permite determinados usos educacionais e materiais relacionados, mas restringe criar materiais novos sem relação com o site. Download gratuito não é autorização geral para compor outro app. Política desta base: usar como referência; não copiar lições, ilustrações ou áudio. [Termos oficiais](https://www.irodori.jpf.go.jp/en/privacy.html).

**Tatoeba:** preservar licença e autoria da frase e verificar separadamente a tradução e a gravação. Uma frase comunitária pode precisar de correção mesmo quando os direitos permitem reutilização. [Termos oficiais, §§5–6](https://tatoeba.org/en/terms_of_use).

**wordfreq:** o mantenedor declara dados históricos, segmentação própria e condições para transformação, inclusive uma objeção explícita à conversão CSV. Não produzir ranking tabular nesta rodada; primeiro resolver o formato de derivação e atribuição pretendido. [Documentação](https://github.com/rspeer/wordfreq).

**CEJC:** o bloqueio de publicação é a decisão local explícita D1. A consulta inicial não resolveu o alcance de derivação nem obteve resposta escrita. Não apresentar essa ausência como nova interpretação jurídica definitiva. [Índice NINJAL](https://www2.ninjal.ac.jp/conversation/cejc/cejc-wc.html) e [seed D1](https://github.com/WesleySabino/japanese-product-design/blob/main/00-product/seed-v5.md).

## Manifesto mínimo antes de distribuir

Para cada campo importado: origem exata, ID upstream, versão/data, titular, licença, texto de atribuição, transformação feita e onde o aviso será entregue. Para áudio/imagem: acrescentar arquivo, hash e vínculo com a frase. Para conteúdo autoral: registrar autoria assistida, revisão e política do projeto, sem atribuir ao revisor autoria de algo que não escreveu.

Uma licença favorável não torna o conteúdo pedagogicamente adequado; revisão linguística não resolve direitos ausentes. Ambas são condições independentes.

Relacionados: [[contrato-de-conteudo|Contrato]] ([arquivo](../04-integracao/contrato-de-conteudo.md)); [[decisoes-e-questoes|Questões]] ([arquivo](../00-gestao/decisoes-e-questoes.md)).
