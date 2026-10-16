---
title: Leitura curada, tokenização e i+1
summary: Contrato de compreensão controlada, dificuldades de contagem e casos de fronteira.
tags: [leitura, tokenizacao, i-mais-um]
created: 2026-09-23
updated: 2026-09-23
confidence: medium
sources: [F012, F013, F016, F023]
---

# Leitura e i+1

## O que a seed exige

Material curado usa somente tokens armazenados pela análise offline. Vocabulário conhecido, formas/partículas e padrões devem ser verificados. Para leitura i+1: ≥95% Known e no máximo um elemento intencionalmente novo (seed §§7.7 e 10). Texto colado pelo usuário é uma estimativa distinta, com gramática não verificada.

## Esquema de análise proposto

`texto → tokens canônicos → mapeamento de lexema/sentido/forma → dependências gramaticais → decisão por perfil do aluno`

Guardar ferramenta, versão, edição/versão/hash do dicionário, modo, configuração e data. Sudachi oferece analisador e dicionários separados; o nome da ferramenta sozinho não identifica a segmentação. [sudachi.rs](https://github.com/WorksApplications/sudachi.rs), [SudachiDict](https://github.com/WorksApplications/SudachiDict).

Proposta de token: superfície, offsets com unidade declarada, lema, leitura, classe, sentido do currículo, forma e função gramatical. Tokenização morfológica não é análise semântica automática. Um auxiliar ou expressão fixa pode envolver vários tokens e uma só unidade pedagógica; ambas as representações precisam permanecer rastreáveis.

## Não chamar anotação manual de saída do pipeline

Os candidatos desta rodada guardam dependências editoriais e `canonical_analysis: null`. Não foram executados no tokenizer. Tampouco há teste por estado real do aluno. Não podem levar selo i+1.

## Casos de fronteira para Q04

| Caso | Falha possível | Conduta proposta |
|---|---|---|
| 5 ocorrências, 1 nova | 80% Known, embora apenas um tipo novo | Não passar no gate de 95% |
| Mesmo alvo novo repetido | 1 tipo desconhecido, várias ocorrências | Publicar ambos os contadores |
| Vocabulário todo conhecido, forma nova | 100% lexical sem compreensão da construção | Verificar forma; ela pode ser o único alvo novo |
| Leitura já conhecida, sentido novo | Palavra parece Known indevidamente | Identidade por sentido/tarefa |
| Homófono e kanji novo | Ditado pode admitir mais de uma escrita | Respostas e pistas dependem da habilidade |
| Nome próprio raro | Eleva dificuldade sem valor didático | Evitar ou ensinar explicitamente |
| Pontuação | Infla denominador de cobertura | Excluir da contagem lexical; regra versionada |
| Números e contadores | Segmentos familiares, leitura composta nova | Tratar composição e irregularidade |
| Token não mapeado | Desaparece do cálculo e aumenta cobertura | Falhar de forma conservadora; registrar desconhecido |
| Furigana revelando alvo | Ajuda invalida avaliação de leitura | Separar modo de estudo e teste |

## A tensão dos textos curtos

Contar ocorrências deixa uma nova ocorrência em 20 no limiar de 95%. Frases muito curtas com novidade lexical frequentemente falharão. Registrar DQ01; não resolver silenciosamente baixando o limiar ou alongando frases artificiais. Uma apresentação didática curta pode existir sem o selo de leitura curada i+1.

O trabalho de Nation é uma fonte candidata sobre cobertura, mas a abertura falhou nesta rodada e seu objeto não valida um limiar para japonês. Nenhum percentual é apresentado aqui como garantia de compreensão. [Registro universitário](https://openaccess.wgtn.ac.nz/articles/journal_contribution/How_large_a_vocabulary_is_needed_for_reading_and_listening_/12552221).

## Escada de materiais

Palavra → placa → cardápio → embalagem → mensagem → diálogo → aviso → texto graduado longo. Para cada degrau, criar pergunta funcional (“qual bebida?”, “qual saída?”), não apenas tradução. Capturar layout quando ele for necessário à compreensão, com licença do material visual.

Q04 deve produzir casos verificáveis de aceitação/rejeição antes de escolher implementação. Q06 deverá medir a proporção de candidatos sem leitura elegível; ausência de frase adequada é lacuna real.

Relacionados: [[decisoes-e-questoes|DQ01]] ([arquivo](../00-gestao/decisoes-e-questoes.md)); [[contrato-de-conteudo|Contrato]] ([arquivo](../04-integracao/contrato-de-conteudo.md)).
