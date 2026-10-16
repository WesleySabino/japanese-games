---
title: Kana, fonologia e ponte katakana
summary: Expansão qualitativa do conteúdo inicial e dos contrastes que exigem revisão auditiva.
tags: [kana, fonologia, katakana]
created: 2026-09-23
updated: 2026-09-23
confidence: medium
sources: [F018, F019, F020, F024, F025]
---

# Kana e fonologia

O catálogo atual cobre formas gráficas e alguns padrões. O próximo ganho de conteúdo é ensinar a relação entre **escrita, som, duração e digitação**, que não são a mesma informação. Ex.: コーヒー tem leitura aproximada `koohii`, mas entrada `ko-hi-` no conversor do projeto.

A referência TUFS distingue duração vocálica e maneiras de escrevê-la em hiragana/katakana. A fonte orienta a explicação; a realização de cada palavra precisa ser conferida. [TUFS — vogais longas](https://www.coelang.tufs.ac.jp/ja/en/pmod/practical/02-02-01.php).

## Matriz de conteúdo a produzir

| Alvo | Primeiro encontro proposto | Recuperação e contraste | Cuidado |
|---|---|---|---|
| Unidade rítmica | Segmentar em moras com marca visual simples | Reconhecer quantidade em itens já ensinados | Não dizer que cada mora tem duração acústica exatamente igual |
| ゃゅょ pequenos | Mostrar diferença entre junção e sequência | きゃ / きや com áudio conferido | Tipografia precisa tornar o tamanho perceptível |
| っ / ッ | Demonstrar duração consonantal no contexto | きて / きって, candidata a revisão | Não tratar como som isolado `tsu` |
| Vogal longa | Contraste de duração mantendo qualidade | おばさん / おばあさん, candidato | Não “corrigir” apagando vogal longa na normalização |
| ん | Final e antes de outras consoantes/vogais | Entrada `nn`/`n'`; áudio em palavras | A realização varia; não ensinar sempre como um n português |
| は・へ・を | Uso gramatical separado da leitura de linha | wa/e/o em contexto quando partículas existirem | Sem antecipar uma regra única para todos os contextos |
| じ/ぢ e ず/づ | Separar som e ortografia | Ditado com pista suficiente | Áudio isolado pode não distinguir grafia |
| Confusões visuais | Traços distintivos em fontes controladas | シ/ツ, ソ/ン, ぬ/め, ね/れ/わ | Revisar dicas em todas as fontes oferecidas |

Os exemplos da tabela são rascunhos didáticos, não pares já gravados ou aprovados. Para contrastes fonológicos, a seed §9 exige gravações nativas de referência desde o início da funcionalidade. TTS não é validação do contraste.

## Katakana por locale

O empréstimo deve ter leitura e sentido próprios. テレビ, バス e コーヒー podem apoiar uma primeira ponte, mas não têm transparência idêntica em inglês e pt-BR. Termos como コンセント, マンション e サービス devem entrar em uma fila separada de sentidos e falsos amigos. São candidatos editoriais a conferir, não classificações empíricas de dificuldade.

Planejar combinações adicionais como ティ/ファ/フィ quando o vocabulário escolhido as exigir. Isso é expansão Core, não ausência automática de requisito do Kana MVP.

## Lote seguinte e aceite

Q01: ficha por gravação contendo símbolo/palavra, transcrição, som esperado, integridade, volume, corte, ruído, avaliação auditiva e revisor. Começar por 12 contrastes e documentar a seleção. O manifesto atual tem 71 revisões pendentes; não chamá-las aprovadas por já estarem no app.

Relacionados: [[escuta-e-audio|Áudio]] ([arquivo](escuta-e-audio.md)); [[locale-e-acessibilidade|pt-BR]] ([arquivo](locale-e-acessibilidade.md)).
