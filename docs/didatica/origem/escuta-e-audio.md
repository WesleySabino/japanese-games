---
title: Escuta e produção de áudio
summary: Progressão, matriz de ativos e critérios de revisão antes de distribuir gravações.
tags: [escuta, audio, fonologia]
created: 2026-09-23
updated: 2026-09-26
confidence: medium
sources: [F007, F018, F025, F023]
---

# Escuta e áudio

## Progressão canônica

Kana isolado → palavra em kana → palavra com kanji e resposta de leitura → chunk → ditado de frase curta → anúncio/roteiro cotidiano autoral ou licenciado (seed §9). O conteúdo deve declarar se avalia percepção sonora, recuperação lexical, ortografia ou compreensão de uma ação.

| Camada | Ativo necessário | Tarefa candidata | Critério de qualidade |
|---|---|---|---|
| Kana atual | Gravação existente + ficha de escuta | Reconhecer som e escrever | Pronúncia, corte e volume verificados |
| Contraste de duração | Gravação nativa controlada de par | Escolher/produzir distinção | O contraste não pode depender só de volume ou locutor |
| Palavra | Leitura natural em contexto definido | Digitar leitura ou identificar sentido | Homófonos não recebem gabarito arbitrário |
| Chunk | Gravação com intenção pragmática | Identificar função e responder | Prosódia compatível com pedido/agradecimento |
| Frase | Texto revisado + voz revisada | Ditado ou compreensão | Alvo e variantes explícitos |
| Anúncio | Roteiro original, informações delimitadas | Identificar destino/horário | Dificuldade adicional documentada |

## Estado observado

O manifesto contém 71 registros e 71 revisões pendentes de pronúncia. Ele permite verificar origem e hash, mas não prova que o áudio realize corretamente o alvo. Padrões avançados dependem de voz do sistema segundo a documentação atual. [Manifesto local](https://github.com/WesleySabino/japanese-app/blob/main/public/audio/manifest.json).

## Plano de produção proposto

1. Revisar gravações existentes antes de substituí-las em massa.
2. Definir roteiro de contrastes com contexto, leitura, repetição e silêncio nas bordas.
3. Registrar locutor, variante-alvo, autorização e licença por gravação.
4. Solicitar avaliação independente de texto versus realização.
5. Conservar original e transformação técnica; verificar normalização de volume sem distorção.
6. Testar pacote offline e tamanho; conectar cada ativo ao item/versionamento.

Para TTS, separar licença do software, pesos, voz e saída sintetizada. A seed permite uso em material de baixo risco após seleção; isso não resolve qualidade ou redistribuição de uma voz específica. Não selecionamos fornecedor nem produzimos áudio nesta rodada.

## Evitar evidência enganosa

Transcrição visível, replay, velocidade reduzida e pistas são ajudas úteis, mas devem ficar registradas quando a tarefa pretende medir desempenho independente. Uma resposta de múltipla escolha não equivale a produzir a leitura. Abaixo da inteligibilidade necessária, o erro pertence ao material, não ao aluno.

Q07 compara fontes e vozes; Q01 define a revisão das gravações. Tatoeba, quando usado, exige conferência da licença de cada áudio, independente do texto. [Termos](https://tatoeba.org/en/terms_of_use).

Relacionados: [[kana-e-fonologia|Fonologia]] ([arquivo](kana-e-fonologia.md)); [[missoes-e-pragmatica|Missões]] ([arquivo](missoes-e-pragmatica.md)).
