# Guia de design didático para jogos de japonês

Consolidado em 15/10/2026 a partir do que existia na pesquisa de conteúdo (`japanese-content-research`, sínteses de 23/09 a 02/10/2026), no planejamento dos 34 jogos (auditoria de 09/10/2026) e no protótipo Gojūon Board. É material de consulta para desenhar jogos. Não é currículo, não define uma trilha e não promete nível de proficiência.

Cada afirmação traz a origem. "Pesquisa externa" é um estudo ou referência pública. "Regra de projeto" é uma escolha nossa, que precisa ser calibrada com jogadores. As duas não se confundem.

## 1. Diga com precisão o que o jogo treina

Um jogo de japonês treina uma ação específica. Antes de dizer que ele ensina algo, pergunte que resposta o jogador precisa dar, e se essa resposta só é possível usando a habilidade em questão.

A auditoria do catálogo separou 16 habilidades e um eixo transversal de retenção. A lista serve para nomear com honestidade o que cada jogo faz, não para cobrir tudo:

| Código | Habilidade | O que o jogo precisa exigir |
|---|---|---|
| KAN | Decodificação de kana | Recuperar a leitura de hiragana e katakana sem rótulo de apoio |
| ORT | Ortografia em kana | Montar, distinguir ou corrigir a escrita (dakuten, yōon, っ, vogal longa, ー) |
| SEG | Segmentação | Marcar limites de palavras e blocos em texto sem espaços |
| PHO | Percepção de moras e contrastes | Distinguir pelo som, sem a escrita mostrar a resposta (きて/きって) |
| KJF | Forma de kanji | Distinguir e compor componentes (未/末, 待/持) |
| KJR | Leitura de kanji em palavras | Recuperar a leitura adequada à palavra e ao contexto |
| VOC | Vocabulário | Recuperar a palavra e relacioná-la ao sentido |
| LEX | Relações lexicais | Compostos, colocações, polissemia |
| NUM | Números e contadores | Interpretar quantidades, datas, preços e contadores |
| PAR | Partículas | Escolher ou interpretar a partícula pelo papel na frase |
| MOR | Formas verbais | Interpretar negação, tempo, aspecto e auxiliares |
| SYN | Sintaxe | Entender quem faz o quê e o alcance dos modificadores |
| TXT | Compreensão de texto | Ligar referências, inferir, reconstruir a lógica |
| FUN | Leitura funcional | Cumprir uma tarefa com informação escrita (placa, horário, cardápio) |
| FLU | Fluência com compreensão | Ler mais rápido mantendo entendimento verificável |
| LIS | Compreensão auditiva | Entender frases ou diálogos sem o texto entregar a resposta |
| RET | Retenção e transferência | Recuperar depois de um intervalo, em outro formato ou contexto |

**Regras para não superestimar** (regras de projeto da auditoria):

1. Kana ou kanji que aparecem dentro de uma frase são pré-requisitos, não cobertura da habilidade.
2. Ouvir o áudio depois de acertar, ou ter um arquivo de áudio disponível, não treina percepção auditiva. Isso exige responder a um estímulo sonoro sem que a solução esteja visível.
3. Digitar a leitura de um kanji não torna a ortografia um objetivo do jogo. Isso exige uma tarefa explícita de montagem ou contraste.
4. Um acerto imediato, uma sequência de vitórias ou o tempo de tela não substituem a retenção tardia nem a transferência.
5. Uma nota de cobertura é uma leitura editorial ordinal. Não some notas para produzir uma porcentagem de "japonês coberto".

**No Kana Rain:** o jogo treina KAN, isto é, ver a forma e dar o som em romaji, com pressão de tempo. O áudio toca no acerto, na correção e como dica. É reforço, não treino de escuta, porque o kana está sempre visível. As fileiras e o registro de evidência apoiam RET dentro do jogo, mas nada mede o que acontece fora dele (blueprint v7, §6).

## 2. Kana: escrita, som, duração e digitação são coisas diferentes

A relação entre escrita, som, duração e digitação é o ponto mais rico para jogos de kana. São quatro informações distintas. コーヒー se lê aproximadamente *koohii*, mas se digita `ko-hi-` (pesquisa de conteúdo, kana e fonologia; [TUFS sobre vogais longas](https://www.coelang.tufs.ac.jp/ja/en/pmod/practical/02-02-01.php)).

| Alvo | Contraste possível | Cuidado |
|---|---|---|
| Mora como unidade rítmica | Contar moras em itens conhecidos | Não dizer que toda mora tem a mesma duração acústica |
| ゃゅょ pequenos | きゃ / きや | O tamanho precisa ser visível na fonte usada |
| っ / ッ | きて / きって | Não tratar っ como um som isolado *tsu* |
| Vogal longa | おばさん / おばあさん | A normalização da resposta não pode apagar a vogal longa |
| ん | Posição final e antes de outros sons | Aceitar `nn` e `n'` na digitação; a realização varia |
| は, へ, を como partículas | wa, e, o em contexto | Separar do uso na tabela de leitura |
| じ/ぢ, ず/づ | Som igual, grafia diferente | Áudio isolado não distingue a grafia |
| Confusões visuais | シ/ツ, ソ/ン, ぬ/め, ね/れ/わ | Revisar as dicas em todas as fontes oferecidas |

Para katakana, a palavra emprestada tem leitura e sentido próprios. テレビ e バス ajudam no começo, mas a transparência não é a mesma em inglês e em português. Termos como コンセント e マンション merecem uma fila separada de falsos amigos.

**Tolerância nas respostas:** nunca aplique uma tolerância ortográfica que apague っ, ゃ ou a vogal longa. Uma tradução também não é uma lista de gabaritos: as respostas aceitas pertencem à tarefa e ao idioma do jogador.

**No Kana Rain:** as gotas manchadas e as confusões シ/ツ já existem. O problema do "n" (esperar 300 ms por uma letra ambígua) é um caso concreto da diferença entre digitação e som.

## 3. Recuperação, espaçamento e o que conta como evidência

**Pesquisa externa:**
- Roediger e Karpicke (2006): testar a recuperação deu vantagem sobre reler em avaliações posteriores, embora a releitura possa favorecer o teste imediato. Só o resumo foi lido. ([estudo](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/))
- Cepeda e colegas (2008): o melhor intervalo entre sessões de estudo depende de quanto tempo se quer reter a informação. Não existe um espaçamento universal. ([resumo](https://digitalcommons.usf.edu/psy_facpub/1766/))
- Long et al. (2026): 58 falantes de chinês aprenderam 30 pares japonês–chinês, e a recuperação com feedback favoreceu os resultados. Os testes tardios eram de reconhecimento. Isso não prova produção tardia nem um efeito específico de digitar. ([artigo](https://pmc.ncbi.nlm.nih.gov/articles/PMC13403799/))

**O que isso sugere para jogos** (regras de projeto):

| Situação no jogo | Como registrar |
|---|---|
| Primeiro encontro com um item | Exposição. Não conta como recuperação. |
| Acerto com dica, áudio ou resposta visível | Assistido, separado do acerto independente |
| Redigitar depois do erro | Correção, não nova evidência de recuperação |
| Velocidade alta | Não substitui acerto nem compreensão |
| Limites como "conhecido após 3 acertos" | Hipóteses locais a calibrar, não descobertas |

Não facilite a resposta para "salvar o relógio" mostrando pistas que a entregam. Se o tempo aperta demais, ajuste o desafio, não a evidência.

**No Kana Rain:** o sistema de evidência já aplica isso. Um acerto fica marcado como assistido até passarem 60 s e 2 outros itens desde a ajuda (blueprint v7, §6).

## 4. Desempenho no jogo não é aprendizagem fora dele

Acertar um item treinado demonstra memória daquele item. Um item novo com os mesmos componentes avalia recombinação. Nenhuma medida isolada representa proficiência (pesquisa de conteúdo, avaliação e transferência).

O blueprint v7 separa quatro coisas: prazer ao jogar, desempenho no jogo, lembrança depois e uso fora do jogo. Para chegar às duas últimas, a pesquisa propõe:
- Material reservado que nunca aparece nas revisões, para testar o que transfere.
- Separar acerto, tempo, ajuda e inferência no registro.
- Não usar visualizações de página como retenção, nem dados locais como participantes implícitos de um estudo.

Habgood e Ainsworth (2011, texto integral lido) dão o alerta central: a versão extrínseca de um jogo teve mais acertos dentro do jogo, e a intrínseca ensinou mais no teste tardio. O desempenho dentro do jogo pode enganar.

**Uso direto:** a investigação B do blueprint ("do jogo para a página") é este princípio aplicado a mim mesmo, com palavras e uma página simples lidas fora do jogo, sem relógio.

## 5. Áudio

**Progressão possível:** kana isolado → palavra em kana → palavra com kanji → chunk → frase curta → anúncio do cotidiano. Cada tarefa deve declarar se avalia percepção sonora, recuperação lexical, ortografia ou compreensão.

**Regras de projeto:**
- Revise as gravações antes de substituí-las em massa. Para cada gravação, registre locutor, variante, licença, corte, volume e revisor.
- Um contraste fonológico pede gravação de referência. A voz sintética (TTS) não valida o contraste.
- Transcrição visível, replay e velocidade reduzida são ajudas úteis. Quando a tarefa mede desempenho independente, elas precisam ficar registradas.
- Abaixo da inteligibilidade necessária, o erro é do material, não do jogador.
- No TTS, licença do software, pesos do modelo, voz e saída sintetizada são objetos de direito separados.

**O que aconteceu no Gojūon Board** (relato do protótipo, arquivado):
- O pacote de voz Kokoro foi rejeitado para as palavras de ensino.
- Uma revisão nativa estruturada de 32 gravações Nemo aprovou 22, marcou 8 para refazer e deixou 2 incertas.
- O jogo passou a usar só as gravações aprovadas e mostra o texto sem som nas demais.

A lição é revisar com um falante nativo antes de escalar e manter o jogo funcionando sem áudio. Detalhes em [origem/gojuon-audio-replacement-research.md](origem/gojuon-audio-replacement-research.md).

## 6. Feedback, entrada e regras para protótipos

Estas seis regras saíram da revisão dos 34 jogos e valem para qualquer protótipo novo (regras de projeto):

1. **Uma mecânica e um conjunto pequeno de conteúdo por protótipo.** Use conjuntos locais revisados, com respostas e alternativas já anotadas. Adie a geração livre de frases e a análise linguística em tempo de execução.
2. **Precisão antes de pressão.** Comece sem limite de tempo por resposta e introduza velocidade depois. No arcade, separe a consequência dentro do jogo da evidência de erro linguístico.
3. **Entrada previsível.** Suporte toque e teclado. Onde houver arrastar, permita também selecionar e depois tocar no destino. Diga qual é a unidade da resposta: caractere, mora, palavra ou bloco. Não faça do IME a única forma de responder.
4. **Correção suficiente para aprender.** Mostre a resposta e uma explicação curta até o jogador continuar. Consultar uma dica não precisa custar pontos nem vidas, mas não conta como acerto independente.
5. **Alternativas explícitas.** Anote as variantes válidas por item. Remova itens ambíguos que o validador simples não consegue julgar.
6. **Núcleo compartilhado só quando houver segundo jogo.** Um registro mínimo de resposta basta: item, faceta, jogo, resultado, ajuda e motivo da falha quando conhecido.

**Tipos de erro:** a pesquisa de gramática propõe separar erro de forma, erro de partícula, sentido, registro e entrada (por exemplo, o teclado). Esse vocabulário serve para qualquer jogo que dê feedback.

## 7. Acessibilidade

- O WCAG 2.2 pede alternativas a limites de tempo e identificação do idioma em trechos de texto. Isso orienta revisões, mas não é auditoria de conformidade ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Em jogos com relógio, considere um modo sem pressão.
- Marque o japonês semanticamente (`lang="ja"`). Use ruby legível, instruções que não dependam de cor e fontes que diferenciem bem as formas.
- Entrada por toque ou tecnologia assistiva não deve ser comparada ingenuamente com a latência de um teclado físico.
- Feedback neutro. Prefira "não sei ainda" e "para revisar" a linguagem de dívida ou culpa.

## 8. Reservatório para jogos além de kana

Se um jogo futuro sair do kana, a pesquisa já deixou bases. O detalhe está nas sínteses em [origem/](origem/README.md).

- **Vocabulário:** a unidade é lexema + leitura + sentido + uso, não uma sequência de caracteres. "Desconhecido" e "raríssimo" são estados diferentes, então não troque frequência ausente por zero.
- **Kanji em palavras:** forma visual, leitura lexical, sentido e uso são dimensões distintas. O kanji entra quando ajuda a ler palavras úteis. Mnemônico autoral não é etimologia.
- **Padrões e chunks:** um chunk pode ser aprendido antes da análise completa. Quatro nomes e quatro verbos não fazem 16 frases úteis. Pedir para repetir também é uma habilidade.
- **Números e contadores:** irregularidades como さんびゃく e いっぷん não saem de concatenação. Os distratores devem modelar erros reais, como confundir 300 com 3.000.
- **Leitura i+1:** a escada vai de palavra a placa, cardápio, embalagem, mensagem, diálogo, aviso e texto longo. Cada degrau pede uma pergunta funcional ("qual saída?"), não só tradução.
- **Missões:** brief → cena → turno → debrief, com uma saída de reparo que volta ao turno. Sucesso com reparo é sucesso comunicativo com apoio.

O conteúdo candidato da pesquisa (60 lexemas, 18 kanji, padrões, frases e 3 missões) continua no repositório `japanese-content-research`, pasta `03-conteudo/`. Ele teve revisão editorial por IA, mas não teve revisão nativa nem foi aprovado para uso.

## Fontes externas citadas

- [TUFS — vogais longas](https://www.coelang.tufs.ac.jp/ja/en/pmod/practical/02-02-01.php)
- [Roediger e Karpicke, 2006](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/) (resumo)
- [Cepeda et al., 2008](https://digitalcommons.usf.edu/psy_facpub/1766/) (resumo)
- [Long et al., 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13403799/) (resumo e contexto)
- Habgood e Ainsworth, 2011, *Journal of the Learning Sciences* 20(2) ([versão aceita](https://shura.shu.ac.uk/3556/))
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [JF Standard](https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do) e [FAQ do JLPT](https://www.jlpt.jp/e/faq/), sobre por que não há lista oficial por nível
- Licenças de fontes linguísticas (JMdict, KANJIDIC2, KanjiVG, Tatoeba): [origem/fontes-e-licencas.md](origem/fontes-e-licencas.md)
