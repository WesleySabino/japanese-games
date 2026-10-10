# Minijogos de Navegador para Aprender a Ler Japonês
## Documento de Design — Brainstorm, Currículo, Ecossistema e MVP

**Autor do briefing:** Wesley Sabino
**Data:** 07/10/2026
**Papéis assumidos neste documento:** game designer · especialista em aquisição de segunda língua (SLA) · designer instrucional · desenvolvedor de jogos web leves
**Idioma-base de instrução dentro dos jogos:** inglês (glosas, enunciados de apoio e feedback). Este documento está em português, mas todos os exemplos de "tela" usam inglês como língua de apoio, como o produto final usaria.
**Escopo:** leitura e vocabulário — do zero absoluto até compreensão leitora e vocabulário de nível intermediário (aprox. JLPT N3 / ~3.000–4.000 palavras, ~600–700 kanji). **Fora do escopo:** conversação e pronúncia.

---

## Sumário

0. Princípios de design (o "contrato" que todo jogo deve cumprir)
1. Catálogo de 34 minijogos
2. Jornada curricular (fases 0 a 9)
3. Integração do ecossistema e modelo central do aprendiz (com pseudocódigo)
4. Seleções: Top 10 pedagógico, Top 10 diversão/retenção, Top 10 simplicidade, MVP de 8 jogos
5. Análises adicionais: arquitetura de conteúdo, modelo de dados (TypeScript/JSON), geração procedural, anti-memorização, migração do inglês para o japonês, erros como conteúdo, progressão e recompensas
6. Apêndices: fontes de dados abertas, riscos globais, próximos passos

---

## 0. Princípios de design

Antes das ideias, as regras que filtram as ideias. Elas refletem a ordem de prioridade definida: (1) eficácia real de aprendizagem, (2) qualidade da mecânica, (3) repetição sem sensação de repetição, (4) baixo custo computacional, (5) simplicidade de desenvolvimento, (6) visual.

### 0.1 Regras pedagógicas

| # | Princípio | Tradução em regra de design |
|---|-----------|------------------------------|
| P1 | **Recuperação ativa > reconhecimento passivo** | Toda rodada exige que o jogador *recupere* algo da memória (forma, leitura, significado, função). Nunca apenas "ver" a resposta. Reconhecimento (escolher) é permitido, mas sempre como degrau para produção (digitar, montar, ordenar, segmentar). |
| P2 | **Repetição espaçada governada por um modelo único** | Nenhum jogo escolhe conteúdo "por conta própria": todos pedem itens ao *Scheduler* central (Seção 3), que sabe o que está vencendo. |
| P3 | **Intercalação (interleaving)** | Itens confundíveis aparecem *juntos* de propósito (ぬ/め, シ/ツ, 待/持, は/が). A discriminação é a habilidade; separar os itens esconderia o problema. |
| P4 | **Facetas separadas** | "Saber 食" não é uma coisa só. Rastreamos separadamente: forma→significado, forma→leitura, leitura→forma, compreensão em contexto, velocidade. Cada jogo declara quais facetas treina. |
| P5 | **Contexto cedo, tradução tarde** | O inglês é andaime, não destino. A exposição a japonês sem tradução cresce de forma mensurável a cada fase (Seção 5.5). |
| P6 | **Romaji é andaime descartável** | Romaji só existe nas fases 0–1, e desaparece por item (não por calendário) assim que o kana correspondente é dominado. Nunca aparece junto de kanji. |
| P7 | **Frequência real manda** | A ordem de vocabulário e kanji segue frequência de corpus (com ajuste por "utilidade para leitura de iniciante"), não ordem de livro escolar. |
| P8 | **Chunking** | Palavras são aprendidas em pedaços reutilizáveis: componentes de kanji, colocações (お茶を飲む), padrões de frase (〜てください). |
| P9 | **Divulgação progressiva** | Uma regra nova por vez; cada jogo tem "camadas" que se desbloqueiam conforme o domínio, em vez de um tutorial longo. |
| P10 | **Erro vira conteúdo** | Todo erro é classificado (visual, fonológico, semântico, gramatical) e gera material futuro (Seção 5.6). |
| P11 | **Velocidade só depois da precisão** | Modos cronometrados só abrem para itens com precisão estável; caso contrário treinamos chute rápido, não leitura. |
| P12 | **Pouca múltipla escolha** | Múltipla escolha (MC) é limitada a ≤ 30% das interações totais e, quando usada, os distratores vêm do grafo de confusões do próprio jogador (nunca aleatórios e óbvios). |

### 0.2 Regras técnicas

- **Stack:** HTML + CSS + JS/TypeScript sem framework pesado (ou Preact/Svelte, ~5–15 KB). Renderização em DOM; `<canvas>` 2D apenas em 3–4 jogos de arcade.
- **Fontes:** usar fontes do sistema (`"Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", "Noto Sans CJK JP", sans-serif`). Nenhum webfont CJK completo (pesam 4–16 MB). Se necessário, *subset* dinâmico só dos glifos da fase.
- **Orçamento:** shell do app < 150 KB gzip; cada jogo < 15 KB gzip; pacotes de conteúdo carregados por fase (~50–300 KB gzip cada). Memória alvo < 40 MB.
- **Offline-first:** PWA com Service Worker; progresso em IndexedDB; sincronização opcional.
- **Sessão:** 1–10 min; todo jogo pode ser interrompido a qualquer momento sem perder o que foi aprendido (cada resposta é gravada imediatamente).
- **Entrada:** toque e teclado; digitação em kana via teclado virtual próprio (grade gojūon) para não depender de IME no celular; no desktop, aceitar IME *e* romaji→kana convertido ao vivo (nas fases iniciais).
- **Plugin:** todo jogo implementa a mesma interface (`GameModule`, Seção 5.2), consumindo o mesmo banco de conteúdo.

### 0.3 Legenda dos campos do catálogo

Cada jogo traz os 14 campos pedidos: **(1)** nome · **(2)** conceito · **(3)** funcionamento · **(4)** ação por rodada · **(5)** habilidade · **(6)** por que ajuda · **(7)** nível · **(8)** exemplo · **(9)** progressão de dificuldade · **(10)** reuso do banco · **(11)** complexidade · **(12)** custo · **(13)** rejogabilidade · **(14)** riscos pedagógicos.

Níveis: *iniciante absoluto* (fases 0–1), *iniciante* (2–3), *iniciante avançado* (4–5), *pré-intermediário* (6–7), *intermediário* (8–9).

---

## 1. Catálogo de minijogos

### Visão geral

| # | Nome provisório | Gênero | Foco principal | Nível inicial | Compl. | Custo |
|---|---|---|---|---|---|---|
| 1 | Chuva de Kana | arcade / velocidade | kana→som | inic. absoluto | baixa | muito baixo |
| 2 | Tabuleiro Gojūon | puzzle / sequência | sistema do kana | inic. absoluto | muito baixa | mínimo |
| 3 | Gêmeos Traiçoeiros | identificação visual | discriminação de kana/kanji parecidos | inic. absoluto | muito baixa | mínimo |
| 4 | Cobra Silábica | arcade clássico adaptado | soletração em kana | inic. absoluto | baixa | muito baixo |
| 5 | Kana Wordle (かなドル) | jogo de palavras / dedução | ortografia + vocabulário | iniciante | baixa | mínimo |
| 6 | Forja de Diacríticos | puzzle de transformação | ゛゜, っ, ゃゅょ, ー | inic. absoluto | baixa | mínimo |
| 7 | Espelho Hira–Kata | memória / pareamento | correspondência hiragana↔katakana | iniciante | muito baixa | mínimo |
| 8 | Katakana Café | dedução / decodificação | empréstimos em katakana | iniciante | baixa | mínimo |
| 9 | Fatiador de Frases | segmentação / puzzle | segmentar texto sem espaços | inic. absoluto → interm. | baixa | mínimo |
| 10 | Esteira de Triagem | sorting / velocidade | categorias semânticas em japonês | iniciante | baixa | muito baixo |
| 11 | Empilhador de Sílabas | arcade "Tetris-like" | formação de palavras | iniciante | média | baixo |
| 12 | Shiritori Duelo | clássico japonês | recuperação livre de vocabulário | iniciante | baixa | mínimo |
| 13 | Quem Sou Eu? (なんでしょう) | dedução / charada | compreensão de definições em japonês | iniciante → pré-int. | muito baixa | mínimo |
| 14 | Alquimia de Radicais | puzzle de composição | componentes de kanji | iniciante avançado | baixa | mínimo |
| 15 | Famílias de Kanji | sorting | componentes semânticos/fonéticos | iniciante avançado | muito baixa | mínimo |
| 16 | Tríades | matching estilo "SET" | kanji–leitura–significado | iniciante avançado | baixa | mínimo |
| 17 | Leitura Dupla (音訓) | discriminação em contexto | on'yomi vs kun'yomi | iniciante avançado | baixa | mínimo |
| 18 | Encruzilhada Kanji (和同開珎) | puzzle clássico japonês | compostos (熟語) | pré-intermediário | baixa | mínimo |
| 19 | Corrente de Compostos | word chain / estratégia | rede de compostos | pré-intermediário | baixa | mínimo |
| 20 | Bingo de Leituras | clássico adaptado | leitura→kanji | iniciante avançado | muito baixa | mínimo |
| 21 | Leitor de Placas | leitura de realia | kanji funcionais do cotidiano | iniciante avançado | baixa | mínimo |
| 22 | Relógio & Calendário | velocidade / números | números, datas, leituras irregulares | iniciante | baixa | mínimo |
| 23 | Mercado de Contadores | sorting / lógica | contadores e mudanças sonoras | iniciante avançado | baixa | mínimo |
| 24 | Partícula Ninja | reconhecimento de padrão | partículas e função | iniciante avançado | baixa | mínimo |
| 25 | Construtor de Frases | construção de frases | ordem SOV, blocos (文節) | iniciante avançado | baixa | mínimo |
| 26 | Cena Relâmpago (○✕) | velocidade / compreensão | compreensão de frase rápida | iniciante → interm. | muito baixa | mínimo |
| 27 | Mapa de Instruções | leitura → ação | compreensão procedural | iniciante avançado | baixa | muito baixo |
| 28 | Rastreador de Formas | dedução gramatical | reconhecer conjugações | pré-intermediário | baixa | mínimo |
| 29 | Detetive de Contexto | inferência | significado por contexto | pré-intermediário | baixa | mínimo |
| 30 | Ordem da História | sequência | coesão textual, conectivos | pré-intermediário | muito baixa | mínimo |
| 31 | Explorador de Texto | exploração de texto / caça | *scanning* e leitura extensiva | pré-intermediário | baixa | mínimo |
| 32 | Corredor de Leitura (RSVP) | fluência | velocidade de leitura | pré-intermediário → interm. | baixa | mínimo |
| 33 | Masmorra de Palavras | roguelite textual | integração de tudo | iniciante → interm. | média | baixo |
| 34 | Sobrevivência Kanji + Revanche | sobrevivência de conhecimento | revisão espaçada + erros | todos | baixa | mínimo |

---

### 1. Chuva de Kana

1. **Nome:** Chuva de Kana (*Kana Rain*)
2. **Conceito:** kana caem do topo da tela e o jogador os "quebra" digitando ou tocando o som correspondente antes que cheguem ao chão.
3. **Funcionamento:** cada gota é um elemento DOM com `transform: translateY` animado por CSS (ou `requestAnimationFrame` com um único loop). O jogador digita o som (fase 0–1: romaji; depois: escolhe em teclado de kana o par hiragana↔katakana, ou digita a leitura de uma palavra inteira). Acertos removem a gota; erros fazem a gota acelerar e "manchar" a tela até ser resolvida corretamente. Três gotas no chão = fim. Ondas são montadas pelo Scheduler: ~60% itens em revisão, ~25% fracos, ~15% novos.
4. **Ação por rodada:** ver o caractere → recuperar o som → digitar → receber feedback instantâneo (som correto exibido em 300 ms em caso de erro, junto do caractere com que foi confundido).
5. **Habilidade:** reconhecimento automático kana→som (decodificação), depois katakana↔hiragana, depois palavras inteiras em kana.
6. **Por que ajuda:** decodificação automatizada é o pré-requisito para tudo na leitura; se cada kana custa 500 ms, a memória de trabalho não sobra para o significado. O jogo treina *automaticidade* (fluência), com recuperação ativa (produção do som, não escolha), e o "espaço" entre gotas força tentativa rápida sem pistas visuais adjacentes.
7. **Nível:** iniciante absoluto (fases 0–2), com modo "palavras" até iniciante.
8. **Exemplo de rodada:** caem か, き, さ, ち. O jogador digita `ka` ✓, `ki` ✓, `chi` na gota さ ✗ → feedback: "さ = sa (you typed chi → ち)". As duas gotas さ e ち reaparecem lado a lado na onda seguinte (intercalação deliberada). Modo palavra (fase 3): cai ねこ — digita `neko`; tooltip após acerto: *cat*.
9. **Progressão:** (a) velocidade de queda ajustada para manter ~85% de acerto; (b) do set de uma linha (あいうえお) para todo o gojūon; (c) dakuten/combinados (ぎゃ, しょ); (d) mistura hiragana+katakana; (e) palavras inteiras; (f) "chuva ácida": gotas com kana confundíveis do jogador.
10. **Reuso do banco:** usa `kana[]` e, no modo palavra, `words[]` filtradas por `script = kana-only` e frequência; a lista de confusões vem de `learner.confusions`.
11. **Complexidade:** baixa.
12. **Custo:** muito baixo (≤ 20 nós DOM simultâneos, um loop de animação).
13. **Rejogabilidade:** alta nas fases iniciais (recorde por set, desafio diário); cai depois que o kana é dominado — por isso migra para "modo palavras".
14. **Riscos:** (a) treinar romaji como intermediário permanente — mitigação: romaji some por item quando o kana atinge domínio; depois, resposta é em kana ou via significado; (b) chute sob pressão — velocidade só sobe se precisão ≥ 85%; (c) foco em caractere isolado — o modo palavras é obrigatório a partir da fase 1b.

---

### 2. Tabuleiro Gojūon

1. **Nome:** Tabuleiro Gojūon (五十音の盤)
2. **Conceito:** um quebra-cabeça em que o jogador reconstrói a tabela gojūon arrastando peças de kana para as casas certas, descobrindo a lógica consoante×vogal.
3. **Funcionamento:** grade 5 colunas (a i u e o) × N linhas (∅, k, s, t, n, h, m, y, r, w). Algumas casas vêm preenchidas como âncora; o jogador posiciona as peças restantes. Variações: "tabela com buracos" (falta um kana por linha), "tabela embaralhada" (trocar pares de casas até ordenar, estilo *15-puzzle*), "tabela espelho" (montar a de katakana a partir da de hiragana).
4. **Ação por rodada:** escolher uma peça, inferir sua linha (consoante) e coluna (vogal), colocá-la; acertos travam a peça.
5. **Habilidade:** modelo mental do sistema silábico; relação entre linhas (か→が, は→ば→ぱ); base para entender conjugações (que "andam" pelas colunas: 書か・書き・書く・書け・書こ).
6. **Por que ajuda:** organiza 46+25+33 símbolos em uma *estrutura* (chunking por esquema), reduzindo carga de memória: aprender "a linha k" é aprender um padrão, não 5 símbolos. A tabela também será reaproveitada mais tarde para explicar o 五段 dos verbos — um investimento que rende.
7. **Nível:** iniciante absoluto.
8. **Exemplo:** linha "s" incompleta: さ [ ] す せ [ ]. Peças disponíveis: し, そ, ち, ろ. O jogador coloca し e そ; ち e ろ são distratores (ち é visualmente parecida com さ, ろ com る). Feedback em erro: "ち belongs to the T-row: た ち つ て と".
9. **Progressão:** 1 linha → 3 linhas → tabela completa; depois dakuten (が ざ だ ば ぱ), depois combinados (きゃ きゅ きょ como "sub-tabela"), depois katakana com tempo, depois "tabela fantasma" (sem rótulos de linha/coluna).
10. **Reuso:** usa somente `kana[]` com metadados `row`, `col`, `script`, `variantOf`.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média; ótimo como aquecimento de 60 s e como "teste de prontidão" da fase 1.
14. **Riscos:** o jogador pode resolver por posição e lógica sem memorizar a forma (ex.: sabe que falta "o" da linha s → coloca a única peça que sobra). Mitigação: sempre incluir distratores visualmente confundíveis e pedir, ao final, uma rodada sem grade.

---

### 3. Gêmeos Traiçoeiros

1. **Nome:** Gêmeos Traiçoeiros (*Tricky Twins*)
2. **Conceito:** uma grade cheia de um mesmo caractere esconde um ou mais "impostores" quase idênticos; encontre-os rápido.
3. **Funcionamento:** grade 4×4 a 8×8 com o caractere-alvo repetido e 1–3 impostores retirados do grafo de confusão visual (ex.: ぬ entre め). O jogador toca nos impostores; depois, deve dizer (digitar ou escolher entre 2) o som de ambos. Tempo conta, erros custam segundos.
4. **Ação por rodada:** varrer a grade, detectar a diferença, nomear os dois caracteres.
5. **Habilidade:** discriminação visual fina — kana (さ/ち, ぬ/め, ね/れ/わ, る/ろ, シ/ツ, ソ/ン, ク/ケ/タ, コ/ユ, ウ/ワ/フ), depois kanji (未/末, 土/士, 待/持, 問/間, 貝/見, 礼/札, 人/入/八).
6. **Por que ajuda:** muitos erros de leitura de iniciante são de *percepção*, não de memória. Treino de discriminação perceptual com pares mínimos visuais (análogo ao treino de pares mínimos fonológicos) acelera o reconhecimento e reduz confusões persistentes. A segunda etapa (nomear) liga a percepção à recuperação.
7. **Nível:** iniciante absoluto (kana) até pré-intermediário (kanji).
8. **Exemplo:** grade 6×6 de シ com dois ツ escondidos. Após encontrá-los: "シ = shi, ツ = tsu. Tip: シ's strokes rise from the lower left; ツ's fall from the top." Variante kanji: grade de 持 com um 待: "持 (hold, も-つ) vs 待 (wait, ま-つ): 扌 hand vs 彳 going".
9. **Progressão:** grade maior; impostores mais sutis; diferentes fontes (gótica, mincho, manuscrita do sistema, se disponível) para generalizar a forma; tempo menor; "impostor zero" (às vezes não há nenhum — impede tocar por reflexo).
10. **Reuso:** `confusionGraph` (visual) derivado de decomposição de componentes (KanjiVG/IDS) + confusões registradas do próprio jogador.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média-alta (curto, competitivo, recorde de tempo).
14. **Riscos:** virar caça-diferenças puramente visual sem aprendizado de som/significado — por isso a segunda etapa é obrigatória. Evitar usar pares que o jogador ainda não estudou.

---

### 4. Cobra Silábica

1. **Nome:** Cobra Silábica (*Kana Snake*)
2. **Conceito:** o clássico Snake, mas a cobra deve comer os kana na ordem que soletra a palavra pedida.
3. **Funcionamento:** grade 12×12 em `<canvas>` ou CSS grid. No topo: o alvo (fase 0–1: romaji + significado "**sakana** – fish"; depois só significado "fish" ou imagem/emoji; depois definição em japonês). Na grade, os kana corretos e 3–5 distratores (kana confundíveis e kana da mesma palavra fora de ordem). Comer o kana certo cresce a cobra; o errado encurta e registra a confusão.
4. **Ação por rodada:** recuperar a forma escrita da palavra → planejar rota → executar.
5. **Habilidade:** produção ortográfica em kana (leitura→forma), incluindo っ, ゃ e vogais longas.
6. **Por que ajuda:** é *produção* (mais forte que reconhecimento para a memória), mas em formato lúdico e sem teclado. O planejamento de rota mantém o item na memória de trabalho por vários segundos (ensaio), e os distratores forçam discriminação (ex.: comer ゆ grande em vez de ゅ pequeno).
7. **Nível:** iniciante absoluto → iniciante.
8. **Exemplo:** alvo "train station" → えき. Grade com え, き (corretos) e さ, ん, お (distratores; さ é visualmente próxima de き, お de あ/え na fase inicial). Fase 1b: "ticket" → きっぷ: na grade きっぷ + つ (grande) + ふ + ぶ. Comer つ grande registra confusão っ/つ.
9. **Progressão:** palavras mais longas; mais distratores; velocidade; palavras com っ/ー/combinados; katakana (アイスクリーム); prompt sem inglês.
10. **Reuso:** `words[]` com campo `kana`; distratores via `confusionGraph` de kana.
11. **Complexidade:** baixa.
12. **Custo:** muito baixo.
13. **Rejogabilidade:** alta (arcade clássico, curto).
14. **Riscos:** habilidade motora dominar a pontuação — mitigar: velocidade baixa por padrão, pontuação ponderada por acertos ortográficos e não por sobrevivência; evitar palavras muito longas que viram teste de reflexo.

---

### 5. Kana Wordle (かなドル)

1. **Nome:** Kana Wordle (かなドル)
2. **Conceito:** adivinhe a palavra secreta em kana em 6 tentativas, com feedback por cor — e com uma camada extra de feedback "gojūon" que ensina o sistema.
3. **Funcionamento:** palavras de 3–4 moras (todas do vocabulário já *visto* pelo jogador). Feedback: 🟩 kana certo na posição certa; 🟨 kana existe em outra posição; 🟦 **mesma linha** (consoante certa, vogal errada — ex.: palpite か, alvo き); 🟪 **mesma coluna** (vogal certa). Teclado virtual de kana em grade gojūon que acumula as cores. Só palpites que sejam *palavras reais do banco* são aceitos.
4. **Ação por rodada:** recuperar palavras do vocabulário que encaixam nas restrições (produção + raciocínio).
5. **Habilidade:** vocabulário em kana (produção), ortografia, estrutura gojūon.
6. **Por que ajuda:** cada palpite é uma recuperação livre de vocabulário com restrições (a forma mais exigente de *retrieval practice*), e o jogador repassa mentalmente dezenas de palavras para gerar candidatas — revisão "escondida". Após resolver, o jogo exibe a palavra em kanji (se houver) + significado + frase-exemplo, criando um momento de *exposição contextual*.
7. **Nível:** iniciante (após ~150 palavras).
8. **Exemplo:** alvo とけい (*clock*). Palpite 1: さくら (*cherry blossom*) → さ ✗ · く 🟦 (linha k certa na posição 2, vogal errada) · ら ✗. O jogador deduz: posição 2 é か/き/け/こ. Palpite 2: とおい (*far*) → と 🟩 · お ✗ · い 🟩. Palpite 3: とけい → 🟩🟩🟩. Tela final: 時計 (とけい) — *clock, watch*. 「へやに とけいが ありません。」 *There is no clock in the room.*
9. **Progressão:** 3→4→5 moras; dicionário de alvos acompanha o vocabulário aprendido; modo katakana; modo "hard" (dicas reveladas devem ser usadas); modo kanji-compostos (2 kanji, feedback por componente — avançado).
10. **Reuso:** `words[]` (alvos = itens em revisão; palpites aceitos = todos os itens "vistos").
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** muito alta (formato diário provado, compartilhável).
14. **Riscos:** (a) estratégia de "queimar kana" sem pensar em significado — mitigar: palpites só de palavras conhecidas e tooltip com significado de cada palpite; (b) vocabulário de alvo pequeno nas primeiras semanas — combinar com palavras do pacote em estudo.

---

### 6. Forja de Diacríticos

1. **Nome:** Forja de Diacríticos (*Mark Forge*)
2. **Conceito:** o jogador transforma uma palavra em outra adicionando/removendo ゛, ゜, っ, ゃゅょ pequenos e ー, como um ferreiro que "martela" sons.
3. **Funcionamento:** mostra uma palavra-base e um alvo (significado em inglês ou imagem). O jogador arrasta "ferramentas" (゛, ゜, っ, ゃ, ゅ, ょ, ー) para as posições certas. Muitas palavras são pares mínimos reais: かき (*persimmon*) → かぎ (*key*); ふく (*clothes*) → ふぐ (*pufferfish*); おばさん (*aunt*) → おばあさん (*grandmother*); きて (*come!*) → きって (*stamp*); びよういん (*beauty salon*) → びょういん (*hospital*). O gerador só aceita pares a uma única operação diacrítica de distância em que **as duas formas são palavras reais do banco**.
4. **Ação por rodada:** comparar palavra e significado-alvo, deduzir qual transformação ortográfica falta, aplicar.
5. **Habilidade:** ortografia fina do kana (dakuten, handakuten, sokuon, yōon, vogal longa) e sua importância semântica.
6. **Por que ajuda:** esses detalhes são a principal fonte de erro de leitura em kana e o iniciante tende a "não ver" as marcas pequenas. Pares mínimos tornam a diferença *significativa* (muda o significado), o que aumenta a atenção (*noticing*, hipótese de Schmidt) e a memória.
7. **Nível:** iniciante absoluto (fase 1b) → iniciante.
8. **Exemplo:** base びよういん, alvo "hospital 🏥". O jogador arrasta ょ pequeno e substitui よ → びょういん ✓. Feedback: "びよういん (bi-yo-u-in) = beauty salon · びょういん (byo-u-in) = hospital. One small ょ changes everything."
9. **Progressão:** 1 transformação → 2 transformações; katakana (ベッド *bed* vs ベット; バス *bus* vs パス *pass*); remover marcas (inverso); modo "detecção" (qual das duas é a palavra pedida, cronometrado).
10. **Reuso:** gera pares automaticamente cruzando `words[].kana` com distância de edição de 1 operação "diacrítica"; mantém só pares em que ambas as palavras existem no banco.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (conjunto de pares reais é finito, mas grande com 5.000+ palavras).
14. **Riscos:** introduzir palavras raras só porque formam um par — filtrar por frequência (ambas abaixo de um rank) ou marcar a palavra rara como "só para este jogo" sem cobrar depois.

---

### 7. Espelho Hira–Kata

1. **Nome:** Espelho Hira–Kata (*Mirror Match*)
2. **Conceito:** jogo da memória (*Concentration*) em que cada par é o mesmo som em hiragana e katakana — e, mais tarde, a mesma palavra escrita em scripts diferentes.
3. **Funcionamento:** cartas viradas em grade 4×4 a 6×6; virar duas; par = mesmo som (か/カ). Variante "espelho rápido": duas colunas, ligar pares com linhas em 30 s. Variante avançada: *palavra em kanji ↔ leitura em kana* (山 ↔ やま, 水 ↔ みず). Observação: não se criam pares "palavra em katakana ↔ mesma palavra em hiragana" (パン ↔ ぱん), porque isso ensinaria grafias que o japonês real não usa.
4. **Ação por rodada:** lembrar posições + identificar correspondências entre scripts.
5. **Habilidade:** mapear katakana sobre o hiragana já aprendido (transferência), depois kanji↔leitura.
6. **Por que ajuda:** o katakana é aprendido mais rápido quando ancorado no hiragana (mesma estrutura, aprendizagem por associação), e o formato memória obriga a manter as formas na memória de trabalho. Pares confundíveis (ソ/ン, シ/ツ) vão juntos no mesmo tabuleiro.
7. **Nível:** iniciante (fase 2); variante kanji: iniciante avançado.
8. **Exemplo:** tabuleiro com し, シ, つ, ツ, ん, ン, そ, ソ. O jogador vira シ e つ → não é par; feedback mínimo: "シ = shi". Jogadores frequentemente erram aqui exatamente o par que precisam treinar.
9. **Progressão:** mais cartas; menos tempo de visualização; pares todos confundíveis; versão "sem virar" (velocidade); depois pares kanji↔leitura e kanji↔significado.
10. **Reuso:** `kana[]` (campo `pairId`), depois `kanji[]`/`words[]`.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (bom como pausa de 2 min).
14. **Riscos:** o jogo de memória treina memória *espacial* mais que leitura — limitar a ≤ 2 rodadas por sessão e sempre fechar com rodada de recuperação sem posição (ex.: Chuva de Kana em modo katakana).

---

### 8. Katakana Café

1. **Nome:** Katakana Café (カタカナ・カフェ)
2. **Conceito:** você é garçom num café japonês; os clientes pedem itens do cardápio em katakana e você precisa decodificar para servir o prato certo.
3. **Funcionamento:** um "pedido" aparece (ex.: ハンバーガー). O jogador precisa identificar o item: nas fases iniciais tocando no ícone/emoji correto numa bandeja de 6; depois digitando a palavra inglesa de origem (com tolerância de grafia); depois o inverso — ouvir não (sem áudio!) — ver o item e *montar* o katakana com peças. Pedidos aumentam de ritmo; clientes "impacientes" dão mais gorjeta. Inclui armadilhas reais: empréstimos não ingleses (パン, do português *pão*; アルバイト, do alemão *Arbeit*) e "falsos amigos" (マンション = *apartamento*, não *mansion*; スマート = *slim*).
4. **Ação por rodada:** decodificar katakana → reconstruir o som → mapear para a palavra de origem (dedução fonológica: ー = vogal longa, ッ = consoante dobrada, vogais epentéticas).
5. **Habilidade:** leitura fluente de katakana; regras de adaptação fonológica de empréstimos (ex.: "cup" → カップ; "milk" → ミルク; "computer" → コンピューター).
6. **Por que ajuda:** para um aprendiz que usa inglês como base, os gairaigo são um "atalho" de vocabulário enorme (dezenas de milhares de palavras), mas só se ele aprende o *sistema de adaptação*. O jogo transforma isso em dedução, o que gera processamento profundo (*levels of processing*). A curiosidade do brasileiro com パン, カステラ (*Castella*, de Castela via português) e テンプラ ajuda a memória por elaboração.
7. **Nível:** iniciante (fase 2), modo avançado em pré-intermediário (palavras longas, falsos amigos).
8. **Exemplo:** pedidos: コーヒー → ☕ *coffee*; サンドイッチ → 🥪 *sandwich*; アイスクリーム → 🍨; パン → 🍞 "Fun fact: パン comes from Portuguese 'pão'!". Armadilha: ミルクティー vs ミルク — duas bandejas parecidas.
9. **Progressão:** palavras curtas → longas; ícones → digitação → montagem reversa; tempo; cardápio sem ícones (só texto japonês com preço: 「コーヒー 300円」) e pedidos combinados ("コーヒーと ケーキを ください"), introduzindo と e ください naturalmente.
10. **Reuso:** `words[]` com `origin: "en" | "pt" | "de" | ...` e `script: "katakana"`, mais `emoji` opcional.
11. **Complexidade:** baixa.
12. **Custo:** mínimo (emoji nativo, sem imagens).
13. **Rejogabilidade:** alta (tema, ritmo, cardápios temáticos: café, loja de eletrônicos, esportes).
14. **Riscos:** (a) reforçar "katakana = inglês" — mitigar com empréstimos de outras línguas e wasei-eigo; (b) dependência do inglês como ponte permanente — nas fases altas, o pedido vira descrição em japonês.

---

### 9. Fatiador de Frases

1. **Nome:** Fatiador de Frases (*Sentence Slicer*)
2. **Conceito:** o japonês não tem espaços; o jogador "fatia" uma linha contínua de texto nos pontos certos entre palavras e partículas.
3. **Funcionamento:** frase sem espaços em uma linha; o jogador toca/arrasta entre caracteres para inserir cortes. Ao confirmar, cada pedaço correto acende e mostra glosa curta ao toque. Pontuação por cortes certos, penalidade por cortes errados; bônus de tempo. O banco de frases tem tokenização pré-calculada (offline, com MeCab/Sudachi), então o jogo é só comparação de índices.
4. **Ação por rodada:** ler, reconhecer palavras conhecidas e partículas, marcar fronteiras.
5. **Habilidade:** segmentação (*parsing*) — talvez a habilidade mais subestimada da leitura japonesa; reconhecimento de partículas, terminações verbais e palavras como unidades.
6. **Por que ajuda:** leitores fluentes de japonês segmentam usando a alternância de scripts (kanji = conteúdo, hiragana = gramática) e palavras conhecidas. Treinar isso explicitamente desde o começo, em frases só em kana, acelera muito a transição para textos. É *pattern recognition* puro, pouco "escolar".
7. **Nível:** iniciante absoluto (frases curtíssimas em kana) → intermediário (frases longas com kanji).
8. **Exemplo (fase 1):** わたしはがくせいです → わたし｜は｜がくせい｜です. Glosas: *I | (topic) | student | am*. **Exemplo (fase 6):** 昨日友達と駅前の喫茶店でコーヒーを飲みました → 昨日｜友達｜と｜駅前｜の｜喫茶店｜で｜コーヒー｜を｜飲みました. Observação: o jogo aceita granularidade "palavra" (飲みました como uma unidade) ou "morfema" (飲み｜まし｜た) conforme o modo; o padrão é bunsetsu/palavra, para não virar aula de morfologia.
9. **Progressão:** só kana → kana+kanji (mais fácil para segmentar, o que ensina o *valor* do kanji!); frases mais longas; tempo; modo "fatiar parágrafo"; modo "fatiar e classificar" (marcar a partícula em cor diferente).
10. **Reuso:** `sentences[].tokens[]` (offsets e `wordId`); cada token correto conta como exposição em contexto para a palavra correspondente no modelo do aprendiz.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (fonte de frases praticamente infinita: Tatoeba + geradas).
14. **Riscos:** ambiguidade de segmentação (ex.: ここではきものをぬぐ — "ここで はきものを" vs "ここでは きものを") — o jogo deve aceitar segmentações alternativas válidas ou *usar* essas ambiguidades como desafio bônus explicado. Evitar regras morfológicas excessivamente técnicas.

---

### 10. Esteira de Triagem

1. **Nome:** Esteira de Triagem (*Sorting Belt*)
2. **Conceito:** palavras passam numa esteira e o jogador as arrasta para caixas rotuladas *em japonês* (たべもの, どうぶつ, ばしょ...) antes que caiam no fim.
3. **Funcionamento:** 2–4 caixas com rótulos de categoria em japonês (com glosa em inglês só nas primeiras exposições). As palavras deslizam (CSS `transform`) da direita para a esquerda; o jogador arrasta ou usa swipe direcional (mobile) / setas (desktop). As categorias podem ser semânticas (comida/animal/lugar), gramaticais (verbo/adjetivo-い/adjetivo-な), de script/leitura (on/kun), de formalidade, ou temáticas ("coisas frias / coisas quentes"). Uma caixa "わからない" (*don't know*) existe e é penalizada menos que o erro — reduz chute.
4. **Ação por rodada:** ler a palavra → acessar o significado *sem traduzir* → decidir categoria em < 3 s.
5. **Habilidade:** acesso lexical direto (forma→conceito), categorização semântica, depois categorias gramaticais.
6. **Por que ajuda:** o jogador prova que entende a palavra sem precisar produzir a tradução inglesa — um passo explícito para compreensão direta em japonês (Seção 5.5). Classificação semântica gera processamento profundo e é excelente para intercalação (palavras de várias lições ao mesmo tempo). As categorias têm rótulos japoneses, que viram vocabulário por exposição.
7. **Nível:** iniciante (fase 3) → pré-intermediário (categorias abstratas).
8. **Exemplo:** caixas: たべもの (*food*) · どうぶつ (*animals*) · ばしょ (*places*). Esteira: りんご → たべもの; いぬ → どうぶつ; えき → ばしょ; さかな → *ambíguo* (comida E animal) → aceita ambos e dá bônus "both!"; 図書館 → ばしょ. Fase 5: caixas 「うごく」(*moves*) / 「うごかない」(*doesn't move*): 車 ✓ うごく, 山 ✓ うごかない.
9. **Progressão:** 2→4 caixas; velocidade; itens em kanji; rótulos sem glosa; categorias mais abstratas (感情 *emotions*, 時間 *time*), categorias gramaticais, categorias de "registro" (です/ます vs forma simples).
10. **Reuso:** `words[].tags` (semânticas, POS) — a mesma tag usada por dezenas de jogos; tags vêm de WordNet japonês / classificação manual de categorias de alta frequência.
11. **Complexidade:** baixa.
12. **Custo:** muito baixo.
13. **Rejogabilidade:** alta (combinações de categorias são combinatórias).
14. **Riscos:** acertar por "cara" da palavra (ex.: tudo em katakana vai para comida) — mitigar com categorias que cortam o script; palavras ambíguas devem ser aceitas, nunca punidas.

---

### 11. Empilhador de Sílabas

1. **Nome:** Empilhador de Sílabas (*Kana Stack*)
2. **Conceito:** blocos de kana caem num poço; o jogador os posiciona para formar palavras reais em linha horizontal ou vertical, que então desaparecem (Tetris × palavras cruzadas).
3. **Funcionamento:** poço 6×10 em CSS grid. Cada bloco é um kana (escolhido para que formar palavras seja viável: o gerador pega palavras-alvo do Scheduler e "fatia" suas moras na fila de blocos, com 20–30% de ruído). O próximo bloco é visível (estratégia). Palavras formadas são validadas contra o vocabulário conhecido; palavras-alvo de revisão valem o dobro. Japonês vertical (縦書き, de cima para baixo) também conta — um bônus cultural.
4. **Ação por rodada:** ver os blocos, *gerar* candidatas de palavras com os kana disponíveis (recuperação livre), planejar posições.
5. **Habilidade:** recuperação de vocabulário a partir de pistas parciais (como completar palavras), ortografia.
6. **Por que ajuda:** a mecânica incentiva "varrer" o léxico mental muitas vezes por minuto — prática de recuperação com geração (efeito de geração). A palavra formada exibe sua glosa e kanji por 1 s, ligando forma a significado.
7. **Nível:** iniciante → iniciante avançado.
8. **Exemplo:** na pilha há か, さ; cai ね? Não forma; cai さ → "かさ" (*umbrella*, 傘) horizontal ✓ → some, mostra 傘 *umbrella*. Mais adiante: に+ほ+ん vertical → 日本.
9. **Progressão:** velocidade; palavras mais longas valem mais; blocos de kanji (fase 4+: 日, 本, 人 → 日本, 本人, 人口...); combos multiplicadores.
10. **Reuso:** `words[]` e, na versão kanji, `words[]` filtradas por kanji conhecidos.
11. **Complexidade:** média (lógica de grade, rotação desnecessária — blocos são 1×1).
12. **Custo:** baixo.
13. **Rejogabilidade:** muito alta.
14. **Riscos:** o jogador passar a formar sempre as mesmas palavras curtas e fáceis (かさ, いえ) — mitigar com pontuação decrescente para palavras repetidas na sessão e bônus para palavras em revisão.

---

### 12. Shiritori Duelo

1. **Nome:** Shiritori Duelo (しりとり対決)
2. **Conceito:** o clássico jogo de palavras japonês: cada palavra começa com o último kana da anterior; quem usar palavra terminada em ん perde.
3. **Funcionamento:** contra um bot que joga com o *vocabulário do próprio jogador* (palavras vistas) mais algumas novas de alta frequência (introduzidas ao jogador com glosa quando o bot as usa — aprendizagem por exposição). O jogador digita em kana (teclado gojūon virtual) ou monta com peças. Timer por jogada. Regras configuráveis: só substantivos, ゛ livre (か↔が), vogal longa ignorada (コーヒー → ひ).
4. **Ação por rodada:** dado o kana final, recuperar livremente uma palavra que comece com ele — e evitar terminar em ん ou deixar o bot numa posição fácil.
5. **Habilidade:** recuperação livre (produção) de vocabulário indexado por som inicial; ortografia.
6. **Por que ajuda:** recuperação livre é a forma mais forte de prática de recuperação e o índice "primeiro kana" é um caminho de acesso diferente do "significado" usado nos outros jogos (variabilidade de pistas fortalece a memória). Há estratégia real: escolher finais difíceis (る, ぬ, ぷ) para o bot.
7. **Nível:** iniciante (≥ 200 palavras) → todos.
8. **Exemplo:** Bot: りんご (*apple*) → Jogador pensa em ごはん, mas percebe o ん final (perderia) → joga ごま (*sesame*) ✓ → Bot: まど (*window*) → Jogador: どうぶつ (*animal*) ✓ → Bot: つくえ (*desk*) → Jogador: えき (*station*) ✓ → Bot: きって (*stamp*; se for nova para o jogador, a glosa aparece) → Jogador: テレビ (*TV*; scripts misturados aceitos) ✓ → Bot: びょういん ✗ — o bot terminou em ん: vitória do jogador.
9. **Progressão:** bot mais forte (escolhe finais raros); tempo menor; restrição temática ("só comidas"); modo kanji (o jogador deve escrever a palavra em kanji se souber — bônus); "shiritori de compostos" (ver jogo 19).
10. **Reuso:** `words[]` indexadas por primeiro e último kana (índice pré-calculado).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** muito alta.
14. **Riscos:** frustração quando o vocabulário é pequeno (travar em る) — oferecer "dica" que mostra significado de uma palavra-candidata conhecida (sem a forma), convertendo a ajuda em nova recuperação.

---
### 13. Quem Sou Eu? (なんでしょう？)

1. **Nome:** Quem Sou Eu? (なんでしょう？)
2. **Conceito:** charadas em japonês simples revelam pistas uma a uma; quanto menos pistas o jogador precisar para adivinhar a palavra, mais pontos.
3. **Funcionamento:** cada "carta-charada" tem 3–6 pistas ordenadas da mais vaga à mais específica, escritas só com vocabulário que o jogador já domina (o gerador verifica). O jogador pode responder a qualquer momento *produzindo* a palavra (digitando em kana, montando com peças, ou — em níveis iniciais — escolhendo entre 6 candidatas). Responder errado custa uma pista extra. As pistas são templates sobre atributos do item no banco (`category`, `color`, `size`, `place`, `sound`, `use`).
4. **Ação por rodada:** ler uma pista em japonês → atualizar hipóteses → decidir se arrisca.
5. **Habilidade:** compreensão de frases simples sem tradução; vocabulário via definições em japonês; inferência.
6. **Por que ajuda:** é o primeiro contato sistemático com **definições monolíngues** — o jogador aprende a entender japonês usando japonês. A decisão "arrisco agora?" cria leitura atenta (cada pista importa) e metacognição (confiança vs. conhecimento). Cada charada é ~10–30 palavras de input compreensível.
7. **Nível:** iniciante (pistas de 3–5 palavras) → pré-intermediário (pistas com orações relativas).
8. **Exemplo:** Pista 1: 「どうぶつです。」 (*It's an animal.*) · Pista 2: 「あしは 四本です。」 (*It has four legs.*) · Pista 3: 「いえで かいます。」 (*People keep it at home.*) · Pista 4: 「「ワンワン」と なきます。」 (*It goes "wan-wan".*) → resposta: いぬ (犬). Respondeu na pista 3 com ねこ → errado, ganha pista 4 → いぬ ✓. Feedback mostra as duas palavras comparadas: いぬ「ワンワン」/ ねこ「ニャー」.
9. **Progressão:** pistas sem glosa; pistas com kanji (furigana só nos kanji não dominados); pistas mais abstratas (「〜するときに つかいます」 *used when you do ~*); categorias abstratas (sentimentos, profissões); modo inverso: o jogador *escolhe* pistas para fazer o bot adivinhar (seleciona entre frases pré-geradas — leitura avaliativa).
10. **Reuso:** atributos semânticos de `words[]` + templates de frase (`clueTemplates[]`) + verificador de vocabulário conhecido.
11. **Complexidade:** muito baixa (dados exigem curadoria — o custo está no conteúdo, não no código).
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (mesma palavra pode ter muitas combinações de pistas).
14. **Riscos:** pistas que usam palavras desconhecidas viram frustração — o gerador deve garantir ≥ 95% de cobertura lexical conhecida (limiar de Nation/Laufer para compreensão). Evitar charadas ambíguas (aceitar todas as respostas consistentes com as pistas mostradas).

---

### 14. Alquimia de Radicais

1. **Nome:** Alquimia de Radicais (*Radical Alchemy*)
2. **Conceito:** o jogador combina componentes no "caldeirão" para criar kanji — descobrindo que kanji são construídos de peças com significado.
3. **Funcionamento:** inventário de componentes desbloqueados (木, 日, 月, 口, 亻, 女, 子, 田, 力, 氵, 言...). Combinar duas ou três peças produz um kanji, se existir no banco de kanji da fase; o kanji descoberto entra no "grimório" com significado, uma palavra comum e mnemônica gerada da decomposição. Há **missões**: "Create the kanji for *rest*" (o jogador deve deduzir: pessoa + árvore). Combinações inválidas dão dica ("close! you need a person-component"). Os kanji produzidos tornam-se novos ingredientes (林 + 木 → 森).
4. **Ação por rodada:** ler a missão (significado-alvo) → raciocinar sobre componentes → combinar.
5. **Habilidade:** decomposição de kanji em componentes; associação componente→significado; base para reconhecimento de milhares de kanji.
6. **Por que ajuda:** a aprendizagem de kanji por componentes reduz drasticamente a carga (≈ 200–300 componentes cobrem os 2.136 jōyō), e a *descoberta* gera efeito de geração e mnemônicas elaborativas. Também prepara o jogador para adivinhar significado de kanji novos.
7. **Nível:** iniciante avançado (fase 4).
8. **Exemplo:** Missão: "*rest*". Inventário: 亻(person), 木 (tree), 日 (sun), 月 (moon). O jogador combina 亻+木 → **休** (やす-む, *rest*): "A person leaning against a tree." Palavra: 休み (やすみ, *holiday, break*). Missão seguinte: "*bright*" → 日+月 → **明** (あか-るい, *bright*) → palavra 明日 (あした, *tomorrow*). Encadeamento: 木+木 → 林 (はやし, *grove*), 林+木 → 森 (もり, *forest*).
9. **Progressão:** combinações de 2 → 3 peças; componentes de posição variável (氵 à esquerda, 艹 em cima); missões por significado vago ("*something related to speech*" → 言+舌 = 話, 言+吾 = 語); revelar que muitos kanji são fono-semânticos (日 + 寺 = 時: 日 dá o sentido "tempo", 寺 dá o som ジ).
10. **Reuso:** `kanji[].components` (de KanjiVG/IDS, com nomes de componentes em inglês) + `kanji[].keyword`.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média-alta (coleção, descoberta; reaproveitável como "laboratório" toda vez que componentes novos são liberados).
14. **Riscos:** (a) etimologia falsa — as mnemônicas devem ser marcadas como "memory aid", não etimologia histórica; (b) treinar só kanji→significado, esquecendo leituras e palavras — cada kanji descoberto vem com 1 palavra real e é agendado para jogos de leitura (16, 17); (c) componentes sem utilidade para o iniciante.

---

### 15. Famílias de Kanji

1. **Nome:** Famílias de Kanji (*Kanji Families*)
2. **Conceito:** arrastar kanji para "casas de família" definidas por um componente compartilhado — semântico (氵 água) ou fonético (青 = セイ).
3. **Funcionamento:** 2–4 "casas" com o componente-chefe; kanji chegam um a um (fila ou esteira) e devem ir para a casa certa. Após cada casa completa, o jogo exibe o padrão descoberto ("all of these relate to water"; "all of these are read セイ"). Variante "intruso": uma família com um kanji que *parece* pertencer mas não segue a regra de leitura (待 com 寺 lê タイ, não ジ).
4. **Ação por rodada:** identificar o componente em um kanji complexo → associá-lo à família → (fase avançada) prever a leitura on'yomi.
5. **Habilidade:** reconhecimento de componentes dentro de kanji complexos; uso de componentes fonéticos para adivinhar leituras.
6. **Por que ajuda:** cerca de 60% ou mais dos kanji jōyō são fono-semânticos; reconhecer famílias transforma memorização arbitrária em *regras com exceções*, o que melhora a retenção e habilita inferência sobre kanji desconhecidos.
7. **Nível:** iniciante avançado → pré-intermediário.
8. **Exemplo (semântico):** casas 氵(water) · 言 (speech) · 木 (tree). Kanji: 海 → 氵, 話 → 言, 林 → 木, 泳 → 氵, 読 → 言, 校 → 木, 酒 → 氵. **Exemplo (fonético):** casa 青 (セイ): 晴 (晴れ *sunny*), 清, 静, 精 ✓ → "青-family usually reads セイ". Casa 寺 (ジ): 時 (ジ), 持 (ジ), 侍 (ジ), 待 → ⚠️ exceção: 待 é タイ.
9. **Progressão:** componentes mais escondidos (亻 vs 彳; 礻 vs 衤); famílias fonéticas; intrusos; famílias sem rótulo (o jogador agrupa livremente e o jogo valida as regras que ele "descobriu").
10. **Reuso:** `kanji[].components`, `kanji[].phoneticComponent`, `kanji[].on[]`.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média.
14. **Riscos:** supergeneralizar regras fonéticas — sempre incluir exceções explícitas; não mostrar famílias de kanji que o jogador nunca verá na fase atual.

---

### 16. Tríades

1. **Nome:** Tríades (*Triads*)
2. **Conceito:** num tabuleiro de peças misturadas — kanji/palavras, leituras e significados — o jogador forma trios corretos (forma + leitura + significado), como no jogo de cartas SET.
3. **Funcionamento:** tabuleiro com 9–15 peças (3–5 trios). As peças de leitura e significado incluem distratores *plausíveis* (homófonos, sinônimos, kanji parecidos). Selecionar um trio correto o remove e novas peças entram (fluxo contínuo de 90 s). Um trio errado "trava" as peças por 2 s e registra exatamente qual faceta falhou (leitura ou significado).
4. **Ação por rodada:** escolher uma peça-âncora → recuperar as duas facetas faltantes → localizá-las no tabuleiro entre distratores.
5. **Habilidade:** associação kanji–leitura–significado, a tríade central da leitura de kanji.
6. **Por que ajuda:** o maior problema do aprendiz de kanji é saber o significado mas não a leitura (ou vice-versa). Exigir as três facetas juntas consolida a ligação, e o modelo do aprendiz recebe evidência separada por faceta. Os distratores (かわ: 川 *river* vs 皮 *skin*) forçam discriminação.
7. **Nível:** iniciante avançado (kanji isolados) → pré-intermediário (compostos).
8. **Exemplo:** peças: 山 · 川 · 火 · やま · かわ · ひ · さん · *mountain* · *river* · *fire* · *day*. Trios: 山–やま–*mountain*; 川–かわ–*river*; 火–ひ–*fire*. Peças extras: さん (leitura on'yomi de 山 — também válida: o jogo aceita 山–さん–*mountain* como trio on'yomi, com bônus) e *day* (significado de 日, que também se lê ひ: é um distrator fonológico para 火–ひ). Fase 6: 先生–せんせい–*teacher*; 学生–がくせい–*student*; 生活–せいかつ–*daily life*.
9. **Progressão:** mais peças; compostos com leituras parecidas (せいかつ / せいかく); significados em japonês simples em vez de inglês; peças de "frase-exemplo" substituindo o significado (a quarta faceta: contexto).
10. **Reuso:** `kanji[]`, `words[]` (`surface`, `reading`, `glossEn`), `confusionGraph` (fonológico + visual + semântico).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta.
14. **Riscos:** eliminação por exclusão (no fim restam 3 peças óbvias) — mitigar com fluxo contínuo (sempre há ≥ 9 peças) e peças "órfãs" sem trio.

---

### 17. Leitura Dupla (音訓)

1. **Nome:** Leitura Dupla (*On/Kun Switch*)
2. **Conceito:** o mesmo kanji aparece em palavras diferentes e o jogador precisa escrever a leitura correta *daquela palavra* — treinando a escolha on'yomi/kun'yomi pelo contexto.
3. **Funcionamento:** uma série de 6–10 palavras compartilhando um kanji (destacado). Para cada uma, o jogador digita a leitura completa em kana (produção), ou em níveis mais baixos monta com peças. Pistas heurísticas são *ensinadas pelo jogo* conforme o jogador erra: kanji sozinho/com okurigana → geralmente kun; composto de 2+ kanji → geralmente on; exceções (jukujikun: 明日 あした, 今日 きょう, 大人 おとな) ganham o selo "special reading".
4. **Ação por rodada:** observar a estrutura da palavra (sozinho? okurigana? composto?) → decidir on/kun → produzir a leitura, incluindo rendaku e sokuon (一生 いっしょう).
5. **Habilidade:** leitura de kanji em palavras reais; consciência das regras de leitura.
6. **Por que ajuda:** saber "人 = ジン, ニン, ひと" em lista não ajuda a ler; o que importa é escolher a leitura certa *em palavra*. Variabilidade de contexto com o mesmo kanji é prática intercalada no nível mais útil.
7. **Nível:** iniciante avançado → pré-intermediário.
8. **Exemplo:** kanji 人: 人 → ひと · 日本人 → にほんじん · 三人 → さんにん · 一人 → ひとり (special!) · 大人 → おとな (special!) · 人気 → にんき. Kanji 生: 先生 → せんせい · 学生 → がくせい · 生まれる → うまれる · 生きる → いきる · 一生 → いっしょう.
9. **Progressão:** kanji com 2 leituras → kanji com muitas (生, 下, 上); okurigana enganosas (上がる あがる / 上る のぼる); rendaku (手紙 てがみ); palavras dentro de frases (contexto decide: 「下手」 へた vs したて — evitar ambiguidades raras).
10. **Reuso:** `words[]` indexadas por kanji (`byKanji[k]`), `kanji[].on/kun`, flags `jukujikun`, `rendaku`.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média-alta (cada kanji é um "nível").
14. **Riscos:** virar decoreba de leituras sem significado — sempre exibir glosa após resposta e agendar a palavra em jogos de contexto; não introduzir palavras raras só para mostrar uma leitura.

---

### 18. Encruzilhada Kanji (和同開珎)

1. **Nome:** Encruzilhada Kanji (和同開珎 — *wadō kaichin* puzzle)
2. **Conceito:** adaptação de um passatempo japonês real: quatro kanji ao redor de um espaço vazio; o jogador descobre o kanji central que forma uma palavra composta com cada um deles.
3. **Funcionamento:** cruz com o centro vazio. Setas indicam a direção de leitura: cima→centro, esquerda→centro, centro→direita, centro→baixo. O jogador digita a leitura do kanji central ou escolhe entre peças de kanji (com distratores do grafo visual). Ao acertar, as quatro palavras são exibidas com leitura e significado.
4. **Ação por rodada:** gerar hipóteses de compostos com cada kanji periférico e encontrar a interseção.
5. **Habilidade:** conhecimento de rede de compostos (熟語), produtividade dos kanji, vocabulário de nível intermediário.
6. **Por que ajuda:** recuperação com restrições múltiplas: cada hipótese testada ativa vários compostos (revisão ampla); a interseção exige conhecimento de palavras reais, não de kanji isolados. Revela a estrutura do vocabulário sino-japonês, o que acelera a aquisição de novas palavras (o aprendiz passa a "ver" 学 em 学校, 学生, 大学...).
7. **Nível:** pré-intermediário → intermediário.
8. **Exemplo:**
   ```
          大
          ↓
   入 →  ？ → 生
          ↓
          校
   ```
   Resposta: **学** → 大学 (だいがく, *university*), 入学 (にゅうがく, *school admission*), 学生 (がくせい, *student*), 学校 (がっこう, *school*). Outro: cima 天, esquerda 元, direita 分, baixo 温 → **気**: 天気 (*weather*), 元気 (*healthy, energetic*), 気分 (*mood*), 気温 (*air temperature*).
9. **Progressão:** compostos frequentes → menos frequentes; dicas (leitura de uma das palavras) removidas; "dupla encruzilhada" (dois centros ligados); modo tempo.
10. **Reuso:** índice `compoundsByKanji` gerado de `words[]` (só palavras com kanji conhecidos); o gerador procura kanji centrais com ≥ 4 compostos conhecidos pelo jogador (ou 3 conhecidos + 1 novo de alta frequência, exposto como aprendizagem).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (combinatória enorme; ótimo como desafio diário).
14. **Riscos:** soluções múltiplas válidas (aceitar qualquer kanji que forme as 4 palavras do banco); dependência de vocabulário — só gerar quando o jogador conhece ≥ 3 das 4 palavras.

---

### 19. Corrente de Compostos

1. **Nome:** Corrente de Compostos (熟語しりとり)
2. **Conceito:** um shiritori de kanji: cada composto de duas letras deve começar com o último kanji do anterior; o jogador constrói a corrente mais longa possível com uma "mão" de kanji.
3. **Funcionamento:** o jogador recebe uma mão de 8 peças de kanji e uma palavra inicial. A cada turno, escolhe uma peça que forme com o último kanji um composto válido (do banco). Pontuação por comprimento e frequência inversa (palavras mais raras valem mais), bônus por **fechar o ciclo** (voltar ao kanji inicial). Elemento de estratégia: guardar peças que abram muitas possibilidades.
4. **Ação por rodada:** dado o kanji final, avaliar quais peças da mão formam compostos reais e quais deixam boas opções para o próximo passo.
5. **Habilidade:** rede de compostos, leitura dos compostos (cada jogada exige digitar ou confirmar a leitura), produtividade dos kanji.
6. **Por que ajuda:** é recuperação generativa com planejamento: o jogador pensa em várias palavras por jogada. A confirmação de leitura impede "acertar só pela forma".
7. **Nível:** pré-intermediário → intermediário.
8. **Exemplo (ciclo):** 学生 (がくせい, *student*) → 生活 (せいかつ, *daily life*) → 活動 (かつどう, *activity*) → 動物 (どうぶつ, *animal*) → 物語 (ものがたり, *story*) → 語学 (ごがく, *language study*) → volta a 学: **ciclo completo, bônus ×2**.
9. **Progressão:** mão menor; tempo; obrigatoriedade de digitar a leitura; versão cooperativa com bot; "corrente temática" (só palavras de um campo: 天気, 気温, 温度...).
10. **Reuso:** grafo `kanji → compostos` derivado de `words[]`.
11. **Complexidade:** baixa (busca em grafo pequeno).
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta.
14. **Riscos:** premiar palavras raras demais — limitar a palavras dentro do rank de frequência da fase + uma "palavra nova" por partida, exposta e agendada.

---

### 20. Bingo de Leituras

1. **Nome:** Bingo de Leituras (*Reading Bingo*)
2. **Conceito:** cartela 5×5 de kanji/palavras; o "locutor" anuncia leituras em kana ou frases com lacuna, e o jogador marca a palavra correspondente.
3. **Funcionamento:** a cartela é gerada do pool de revisão. O locutor mostra (texto, sem áudio) uma leitura (「やま」), uma definição simples em japonês, ou uma frase com lacuna (「＿で およぎます」). O jogador tem 5 s para marcar. Marcações erradas custam uma "ficha". Homófonos são usados de propósito e resolvidos por contexto.
4. **Ação por rodada:** ler o anúncio → recuperar a forma em kanji → varrer a cartela.
5. **Habilidade:** leitura→forma (direção inversa do reconhecimento habitual), homófonos, contexto.
6. **Por que ajuda:** a direção leitura→kanji é pouco treinada em apps de flashcards e é essencial para "ver" palavras conhecidas oralmente quando aparecem escritas. A busca visual na cartela repete a forma de muitos kanji passivamente (exposição extra) enquanto o alvo é recuperado ativamente.
7. **Nível:** iniciante avançado.
8. **Exemplo:** cartela inclui 川, 皮, 山, 木, 気, 雨, 駅... Locutor: 「かわで およぎます。」 (*I swim in the ___.*) → 川 (*river*), não 皮 (*skin*). Locutor: 「き」 + 「もりに たくさん あります」 → 木, não 気.
9. **Progressão:** leitura pura → definição → frase com lacuna; cartela maior; tempo menor; palavras compostas; "bingo reverso" (a cartela tem leituras, o locutor mostra kanji).
10. **Reuso:** `words[]`, `sentences[]` com cloze automático, `homophoneIndex`.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média-alta.
14. **Riscos:** frases de lacuna com mais de uma resposta válida na cartela — o gerador verifica que só um item da cartela é compatível (checando tags semânticas e colocações).

---

### 21. Leitor de Placas

1. **Nome:** Leitor de Placas (*Sign Reader*)
2. **Conceito:** o jogador está numa estação, loja ou rua japonesa simulada e precisa *agir* lendo as placas: achar a saída norte, não entrar onde é proibido, saber se a loja está aberta.
3. **Funcionamento:** cenas simples em HTML/CSS (retângulos com texto que imitam placas, setas Unicode). Cada cena dá uma missão em inglês (depois em japonês) e o jogador toca na placa/porta certa. Pontos por rapidez; erros têm consequências narrativas leves ("You walked into the staff-only area!").
4. **Ação por rodada:** ler a missão → varrer placas → reconhecer kanji funcionais → agir.
5. **Habilidade:** reconhecimento rápido de kanji e palavras funcionais do mundo real (*realia*), leitura por *scanning*.
6. **Por que ajuda:** tarefas autênticas aumentam motivação e transferência; ler para agir (não para traduzir) força compreensão direta. Os kanji de placas são de altíssima frequência visual no Japão e muito motivadores para quem pretende viajar.
7. **Nível:** iniciante avançado (fase 4–5).
8. **Exemplo:** Cena "Station": placas 北口 · 南口 · 改札 · 出口 · 入口 · きっぷうりば · 関係者以外立入禁止. Missão: "Exit on the north side" → 北口 (きたぐち). Missão: "Is the café open?" Placa da porta: 準備中 → *No* (preparing). Outras placas: 営業中 (*open*), 本日休業 (*closed today*), 押 (*push*) / 引 (*pull*), 禁煙 (*no smoking*), 非常口 (*emergency exit*), 止まれ (*stop*).
9. **Progressão:** missões em japonês (「きたぐちから でてください」); cenas com mais placas; placas compostas; tempo; cenas temáticas (hospital: 受付, 待合室; supermercado: 半額, 税込).
10. **Reuso:** `words[]` com tag `realia`, `scenes[]` (JSON com posição das placas).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (cenas e missões randomizadas).
14. **Riscos:** vocabulário "de turista" crescer desproporcionalmente — limitar a ~80–120 placas de alta utilidade; cobrir também leituras, não só reconhecimento.

---

### 22. Relógio & Calendário

1. **Nome:** Relógio & Calendário (*Time Keeper*)
2. **Conceito:** a agenda de um personagem chega escrita em japonês; o jogador arrasta compromissos para o dia e a hora certos num calendário e num relógio.
3. **Funcionamento:** um calendário mensal e um relógio (CSS). Cada "mensagem" contém data/hora em japonês (「四月八日（月）午後三時半」). O jogador posiciona o evento. Modo "leitura" separado: digitar a leitura (よっか, ようか...), porque datas japonesas têm muitas leituras irregulares. Modo "relâmpago": uma hora aparece, o jogador ajusta os ponteiros em 4 s.
4. **Ação por rodada:** decodificar números em kanji, contadores (月, 日, 時, 分) e marcadores (午前/午後, 半) → agir no calendário.
5. **Habilidade:** números em kanji, datas, horas, dias da semana, leituras irregulares (ついたち, ふつか, はつか; よじ, くじ, しちじ; じゅっぷん).
6. **Por que ajuda:** números e datas aparecem em praticamente todo texto real; o mapeamento para uma ação (posicionar) prova compreensão sem tradução. O modo leitura isola o problema das irregularidades com repetição espaçada focada.
7. **Nível:** iniciante (números em algarismos arábicos + kana) → iniciante avançado (kanji).
8. **Exemplo:** 「十月二十日（火）午前九時」 → arrastar para 20/10, terça, 9h. Leitura: 二十日 = はつか, 九時 = くじ. 「三月一日 午後四時十分」 → 1/3, 16h10; leituras ついたち, よじ, じゅっぷん.
9. **Progressão:** algarismos arábicos → kanji; horas cheias → minutos; dias da semana (月火水木金土日 — também ótimos primeiros kanji); expressões relativas (来週の火曜日, 三日後).
10. **Reuso:** gerador procedural (datas aleatórias) + `words[]` para leituras irregulares (cada leitura irregular é um item rastreado).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (procedural infinito, mas temática estreita).
14. **Riscos:** o jogador ler os algarismos e ignorar o resto — usar kanji assim que possível e incluir expressões relativas que exigem compreensão.

---

### 23. Mercado de Contadores

1. **Nome:** Mercado de Contadores (*Counter Market*)
2. **Conceito:** o jogador é lojista: lê listas de pedidos com contadores japoneses e monta as cestas com os objetos e quantidades certos.
3. **Funcionamento:** pedido escrito (「えんぴつを 三本と きってを 五枚 ください。」). O jogador arrasta emojis/objetos para a cesta e define a quantidade. O contador indica a categoria de forma (本 longo e fino; 枚 plano; 匹 animal pequeno; 冊 livro; 台 máquina; 個 objeto pequeno; 人 pessoa; つ genérico). Modo inverso: o jogador vê uma cesta e escolhe/monta o contador e lê a quantidade (いっぽん, さんぼん, ろっぽん — mudanças sonoras).
4. **Ação por rodada:** ler o pedido → decodificar número + contador → inferir o tipo de objeto quando o substantivo é desconhecido (o contador é pista!) → montar.
5. **Habilidade:** contadores, números, mudanças sonoras (rendaku/sokuon), leitura de pedidos com を/と/ください.
6. **Por que ajuda:** contadores são um ponto clássico de dificuldade, e o formato de "loja" dá uso funcional. O modo de inferência (contador como pista da categoria) treina leitura estratégica.
7. **Nível:** iniciante avançado.
8. **Exemplo:** 「ねこを 二匹、かさを 一本、本を 三冊 ください。」 → 🐈×2, ☂️×1, 📕×3. Leituras: 二匹 にひき, 一本 いっぽん, 三冊 さんさつ. Armadilha: 本 (*book*) vs 〜本 (contador de objetos longos) na mesma frase.
9. **Progressão:** contadores básicos → mudanças sonoras (一匹 いっぴき, 三匹 さんびき, 六匹 ろっぴき) → pedidos longos → contadores menos comuns (杯, 足, 軒) → descrições em que só o contador revela o objeto.
10. **Reuso:** `counters[]` (tabela de leituras por número), `words[].counter` (qual contador o substantivo usa).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média.
14. **Riscos:** excesso de contadores raros; ensinar "1 contador por objeto" quando há variação (ex.: うさぎ com 羽 é tradição, 匹 é comum) — aceitar variantes comuns.

---

### 24. Partícula Ninja

1. **Nome:** Partícula Ninja (*Particle Ninja*)
2. **Conceito:** frases chegam com "buracos" nas posições de partícula; o jogador lança shurikens de partículas (は, が, を, に, で, へ, と, の, も) nos buracos certos, contra o tempo.
3. **Funcionamento:** frases curtas (5–9 tokens) com 1–3 lacunas de partícula. O jogador toca na lacuna e depois na partícula (ou arrasta). Respostas alternativas válidas (に/へ com verbos de movimento) são aceitas. Feedback não é regra gramatical longa: é um *contraste* mínimo ("で = where an action happens · に = destination / point in time"). Frases são todas compreensíveis (≥ 95% de vocabulário conhecido).
4. **Ação por rodada:** ler a frase inteira → identificar a função de cada sintagma (lugar da ação? objeto? destino?) → escolher a partícula.
5. **Habilidade:** reconhecimento de padrões gramaticais de partículas — essencial para *compreender* quem faz o quê.
6. **Por que ajuda:** partículas são o esqueleto da frase japonesa; o leitor que não as processa automaticamente adivinha relações. Prática massiva com feedback contrastivo leva à indução de regras implícitas (aprendizagem estatística), sem aula de gramática. Intercalar partículas confundíveis (に/で, は/が) é a chave.
7. **Nível:** iniciante avançado → pré-intermediário.
8. **Exemplo:** 「としょかん＿ ほん＿ よみます。」 → で, を (*I read books at the library.*). 「七時＿ おきます。」 → に. 「バス＿ えき＿ いきます。」 → で, に/へ (*I go to the station by bus.*). 「わたし＿ ねこ＿ すきです。」 → は, が.
9. **Progressão:** 1 lacuna → 3; partículas compostas (から, まで, より); frases com kanji; は vs が em pares contrastivos de frase (「ねこは います」 vs 「ねこが います」 em contexto de mini-diálogo); modo "explique": após acertar, o jogador escolhe a tradução que corresponde (verificação de compreensão real).
10. **Reuso:** `sentences[].tokens` com `pos = particle`; lacunas geradas automaticamente; distratores = partículas que o jogador confunde (matriz de confusão de partículas).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta.
14. **Riscos:** virar exercício escolar de gramática — evitar terminologia, manter ritmo de jogo, sempre com frases significativas; não cobrar distinções sutis de は/が sem contexto (fonte de frustração).

---
### 25. Construtor de Frases

1. **Nome:** Construtor de Frases (*Sentence Builder*)
2. **Conceito:** blocos de frase (文節, *bunsetsu*) embaralhados devem ser ordenados para formar uma frase que corresponda a uma cena, uma glosa ou — nos níveis altos — a uma paráfrase em japonês.
3. **Funcionamento:** 3–7 blocos arrastáveis (cada bloco = conteúdo + partícula, ex.: 「こうえんで」). O alvo: no início, uma frase em inglês; depois uma cena de emoji; depois uma frase japonesa equivalente com outras palavras. Pode haver 1 bloco distrator (partícula errada: 「こうえんに」). O validador aceita qualquer ordem gramatical válida (japonês tem ordem flexível antes do verbo) — calculada a partir das regras: verbo no fim; modificador antes do modificado.
4. **Ação por rodada:** compreender o alvo → identificar a função de cada bloco → ordenar, com o verbo por último.
5. **Habilidade:** estrutura SOV, função de partículas, modificação pré-nominal (orações relativas: 「きのう かった ほん」), chunking em blocos.
6. **Por que ajuda:** ler japonês exige "segurar" blocos até o verbo final; montar frases treina essa expectativa estrutural (*processing* de núcleo final). O formato de blocos (em vez de palavras soltas) ensina a unidade de leitura natural do japonês. É produção estruturada sem exigir digitação.
7. **Nível:** iniciante avançado → pré-intermediário.
8. **Exemplo:** alvo: *I run in the park every morning.* Blocos: 「はしります」「まいあさ」「わたしは」「こうえんで」 (+ distrator 「こうえんを」). Resposta: 「わたしは まいあさ こうえんで はしります。」 (também válida: 「まいあさ わたしは こうえんで はしります。」). Nível 6: alvo-cena 📚👦🛒 (ontem) → 「きのう / 買った / 本を / 読みました」 → 「きのう 買った 本を 読みました。」 *I read the book I bought yesterday.*
9. **Progressão:** 3 → 7 blocos; distratores de partícula; orações relativas; conectivos (〜て, 〜から, 〜けど); alvo em japonês (paráfrase: 「毎朝 公園を 走って います」→ montar outra forma com o mesmo sentido); limite de tempo opcional.
10. **Reuso:** `sentences[].chunks` (gerados da tokenização + regra de bunsetsu) e glosas de frase.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (corpus de frases grande).
14. **Riscos:** (a) resolver por "pistas de superfície" (o bloco com ます vai no fim) sem compreender — por isso os níveis altos exigem escolher entre duas montagens com sentidos diferentes (「犬が 猫を 追う」 vs 「猫が 犬を 追う」); (b) rejeitar ordens válidas — o validador precisa de regras de ordem flexível.

---

### 26. Cena Relâmpago (○✕)

1. **Nome:** Cena Relâmpago (*Flash Scene* — ○✕クイズ)
2. **Conceito:** uma "imagem" feita de emojis e uma frase japonesa aparecem; o jogador decide em segundos se a frase descreve a cena (○) ou não (✕).
3. **Funcionamento:** a cena é uma grade CSS com emojis posicionados (🐈 sobre 🪑, 🌧️ no céu, 🕒 no relógio). A frase é gerada por templates a partir da *mesma* estrutura de dados da cena, verdadeira ou falsa com mudança mínima (posição, número, cor, sujeito, tempo verbal, negação). Swipe direita/esquerda ou teclas ←/→. Sequências de 20 frases em ~60 s; ritmo adaptativo.
4. **Ação por rodada:** ler a frase inteira (inclusive o final: negação e tempo verbal estão no fim!) → comparar com a cena → decidir.
5. **Habilidade:** compreensão de frase rápida e *direta* (sem tradução); atenção ao final da frase (〜ます/〜ません/〜ました), partículas de posição (うえ・した・なか・まえ・うしろ・となり).
6. **Por que ajuda:** verifica compreensão real com custo de resposta mínimo (alta densidade de input: 20 frases por minuto). A mudança mínima entre frase verdadeira e falsa obriga a processar *cada* elemento — especialmente o final verbal, que iniciantes ignoram. Nenhum inglês na tela: é a ponte mais pura para leitura direta.
7. **Nível:** iniciante (fase 3) → intermediário (frases longas, inferências).
8. **Exemplo:** cena: 🐈 embaixo de 🪑, 🍎🍎🍎 na mesa. Frases: 「ねこは いすの したに います。」 → ○ · 「りんごが 二つ あります。」 → ✕ (há três) · 「ねこは いすの うえに いません。」 → ○ (negação!). Nível avançado (texto como cena): mini-texto 「田中さんは 傘を 持たずに 出かけた。午後、雨が 降った。」 → 「田中さんは ぬれたかもしれない。」 → ○ (inferência).
9. **Progressão:** frases curtas → longas; negações e passado; contrafactuais; quantificadores (だけ, しか〜ない, も); cenas substituídas por mini-textos (inferência); tempo por frase adaptado à velocidade de leitura medida.
10. **Reuso:** `sceneTemplates[]` + `words[]` com atributos visuais (`emoji`); frases geradas de forma procedural (Seção 5.3), mais frases curadas para níveis altos.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** muito alta.
14. **Riscos:** 50% de chance de acerto no chute — compensar com pontuação que penaliza erros (score = acertos − erros), detecção de respostas rápidas demais (< tempo mínimo de leitura estimado para a frase) e modo "explique" ocasional (onde está o erro? toque na palavra falsa).

---

### 27. Mapa de Instruções

1. **Nome:** Mapa de Instruções (*Follow the Directions*)
2. **Conceito:** o jogador move um personagem num mapa em grade seguindo instruções escritas em japonês — ler é agir.
3. **Funcionamento:** grade 7×7 com marcos em emoji (🏦 ぎんこう, 🏫 がっこう, 🏪 コンビニ, 🌳 こうえん). Uma instrução de 1–4 passos aparece; o jogador toca nas casas/setas para executar. Se chegar ao destino certo, ganha estrela; o caminho é avaliado passo a passo (o erro exato é registrado: confundiu みぎ/ひだり? ignorou 二つ?).
4. **Ação por rodada:** ler a instrução → construir um modelo mental → executar.
5. **Habilidade:** compreensão de instruções (〜て, 〜てください, 〜たら), direções, números, posições (まえ, うしろ, となり, かど).
6. **Por que ajuda:** inspirado em *Total Physical Response*, mas pela leitura: compreensão verificada pela ação, sem tradução. Encadear passos com 〜て treina leitura de frases longas segmentadas.
7. **Nível:** iniciante avançado → pré-intermediário.
8. **Exemplo:** 「まっすぐ 二つ すすんで、みぎに まがって ください。ぎんこうの まえで とまって ください。」 (*Go straight two blocks, turn right, and stop in front of the bank.*) Nível 6: 「コンビニの かどを 左に 曲がったら、公園の となりの 店に 入って ください。」
9. **Progressão:** 1 passo → 4; condicionais (〜たら); instruções relativas a marcos; kanji (右, 左, 前, 後ろ); mapa maior; tempo de leitura limitado (a instrução some antes de agir: exige reter o significado, não reler).
10. **Reuso:** gerador de instruções sobre `mapTemplates[]` + vocabulário de direções; todas as frases geradas por gramática de templates.
11. **Complexidade:** baixa.
12. **Custo:** muito baixo.
13. **Rejogabilidade:** média-alta (mapas procedurais).
14. **Riscos:** campo lexical estreito — usar como jogo "de fase" e integrá-lo à Masmorra (33) para não saturar.

---

### 28. Rastreador de Formas

1. **Nome:** Rastreador de Formas (*Form Tracker*)
2. **Conceito:** o jogador "desmonta" verbos e adjetivos conjugados encontrados em frases, ligando interruptores de significado (NEG, PAST, WANT, CAN, -TE, POLITE...) até que a leitura corresponda.
3. **Funcionamento:** uma frase com uma forma verbal destacada. Painel: campo "dictionary form" (escolha entre 3 ou digitação) + interruptores de função. O jogador ajusta os interruptores e confirma; o jogo mostra a tradução da frase *só depois*. Sem tabelas de conjugação: o foco é reconhecimento (leitura), não produção.
4. **Ação por rodada:** isolar o radical → identificar a forma de dicionário → decodificar cada sufixo de significado.
5. **Habilidade:** reconhecimento de morfologia verbal/adjetival — crucial para leitura, pois o significado da frase muda no último sufixo.
6. **Por que ajuda:** leitores pré-intermediários "conhecem" 食べる mas não reconhecem 食べさせられなかった; tratar a conjugação como pilha de interruptores ensina composicionalidade (chunking morfológico). Ancorado em frases reais, evita o formato escolar de tabelas.
7. **Nível:** pré-intermediário → intermediário.
8. **Exemplo:** 「きのうは なにも 食べなかった。」 → 食べる + NEG + PAST → *didn't eat*. 「今日は 飲みたくない。」 → 飲む + WANT + NEG → *don't want to drink*. 「この 漢字が 読めますか。」 → 読む + CAN + POLITE (+ question) → *Can you read this kanji?* Ambiguidade didática: 「先生に 見られた。」 → 見る + PASSIVE + PAST (*was seen by the teacher*); 「られる」 também pode ser potencial — o contexto (に + agente) decide.
9. **Progressão:** ます/ません/ました → forma て/た → ない/たい → potencial → passiva/causativa → combinações; adjetivos (高くなかった); auxiliares (〜てしまった, 〜ている, 〜ておく).
10. **Reuso:** `sentences[].tokens` com `lemma` e `inflection[]` (fornecidos pelo analisador morfológico na preparação offline).
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média.
14. **Riscos:** virar aula de gramática — manter interruptores com nomes semânticos simples, nunca termos como "renyōkei"; garantir que a frase seja compreendida (passo final de checagem de sentido).

---

### 29. Detetive de Contexto

1. **Nome:** Detetive de Contexto (*Context Detective*)
2. **Conceito:** uma palavra desconhecida aparece destacada em frases cada vez mais reveladoras; o jogador deduz seu significado o mais cedo possível.
3. **Funcionamento:** "caso" = 1 palavra-alvo nova + 3 frases-pista (todas com ≥ 95% de vocabulário conhecido, exceto o alvo). Após cada pista, o jogador pode "acusar": escolher um campo semântico entre 6 (nível baixo), digitar uma palavra-chave em inglês (validada por lista de sinônimos), ou — em nível alto — escolher uma definição japonesa simples. Acertar com 1 pista = 3 estrelas. Depois do caso, a palavra entra no Scheduler como "item novo aprendido por inferência" com marcação especial (alta prioridade de revisão em 24 h).
4. **Ação por rodada:** ler o contexto → usar pistas sintáticas (partícula, posição), semânticas e de kanji (componentes!) → formular e testar hipótese.
5. **Habilidade:** inferência lexical a partir do contexto — a estratégia nº 1 de quem lê extensivamente; também uso de componentes de kanji para adivinhar.
6. **Por que ajuda:** a maior parte do vocabulário de um leitor fluente vem da leitura, não de listas; inferir é uma habilidade treinável. O esforço da dedução (*desirable difficulty*) e o momento "aha" geram memória forte. Mostrar a palavra em vários contextos dá significado mais rico do que uma glosa.
7. **Nível:** pré-intermediário → intermediário (versão simples em iniciante avançado).
8. **Exemplo (iniciante avançado):** alvo かわいた: 1) 「あつい 日に たくさん はしりました。」 2) 「のどが かわいたので、みずを のみました。」 → *thirsty* (lit. *the throat got dry*). **Exemplo (intermediário):** alvo 欠かさない: 1) 「彼は 毎朝、公園で ジョギングを する。」 2) 「雨の 日も 欠かさない。」 3) 「もう 十年、一日も 欠かしたことが ない。」 → *never misses / never skips*. Pista de kanji: 欠 aparece em 欠席 (*absence*).
9. **Progressão:** pistas mais sutis; menos pistas; alvos mais abstratos; múltiplos alvos por texto; pedir ao jogador para *distinguir* o alvo de um sinônimo próximo (ex.: 必ず vs きっと).
10. **Reuso:** busca no `sentences[]` de frases que contêm o alvo e cuja cobertura lexical (para este jogador) ≥ 95% — consulta direta no modelo do aprendiz.
11. **Complexidade:** baixa (o desafio é a curadoria/filtragem automática).
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (cada palavra nova é um caso novo).
14. **Riscos:** inferência errada consolidada — sempre confirmar com a definição ao final e reapresentar o item logo; evitar alvos cujo contexto é genuinamente ambíguo (o curador/heurística avalia a "informatividade" das pistas, ex.: com testes A/B de taxa de acerto).

---

### 30. Ordem da História

1. **Nome:** Ordem da História (*Story Sequencer*)
2. **Conceito:** as frases de uma mini-história ou receita estão embaralhadas; o jogador as reordena usando conectivos, tempos verbais e lógica.
3. **Funcionamento:** 4–7 cartões de frase; arrastar para ordenar. Níveis baixos: marcadores explícitos (まず, つぎに, それから, さいごに). Níveis altos: só pistas de coesão (pronomes それ/その, de causa だから/でも, retomadas lexicais, mudanças de tempo). Validação aceita ordens alternativas plausíveis definidas no conteúdo.
4. **Ação por rodada:** ler todas as frases → identificar início/fim → construir a cadeia lógica.
5. **Habilidade:** compreensão de nível de discurso — coesão e coerência; conectivos.
6. **Por que ajuda:** a compreensão de textos depende de ligar frases (inferências-ponte); a tarefa obriga a reler cada frase com propósito (leitura repetida motivada, que melhora fluência).
7. **Nível:** pré-intermediário (versão com marcadores em iniciante avançado).
8. **Exemplo (receita):** embaralhado: 「さいごに、カレールーを いれます。」「まず、やさいを きります。」「それから、みずを いれて にます。」「つぎに、にくを いためます。」 → ordem: まず → つぎに → それから → さいごに. **Exemplo (narrativa sem marcadores):** 「でも、さいふが ありませんでした。」「田中さんは コンビニに 行きました。」「だから、何も 買えませんでした。」「おにぎりを とって レジに 行きました。」 → 行きました → おにぎり... → でも... → だから...
9. **Progressão:** mais frases; remoção de marcadores; frases mais longas; parágrafos inteiros como cartões; textos expositivos (問題 → 原因 → 解決).
10. **Reuso:** `texts[]` com `sentenceIds` ordenados e metadados de ordens alternativas.
11. **Complexidade:** muito baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (texto conhecido perde graça; precisa de volume de textos — ver geração procedural de receitas/rotinas na Seção 5.3).
14. **Riscos:** resolver só por marcadores sem entender — remover marcadores cedo e incluir perguntas de compreensão pós-ordenação.

---

### 31. Explorador de Texto

1. **Nome:** Explorador de Texto (*Text Explorer*)
2. **Conceito:** um texto curto é um "território" a explorar com missões de caça: encontrar todas as comidas, descobrir para onde o personagem foi, tocar em todos os verbos no passado — com um orçamento limitado de consultas ao dicionário.
3. **Funcionamento:** texto de 80–400 caracteres, renderizado com tokens clicáveis (spans). Missões de 3 tipos: *scanning* (achar informação específica), *categorizar* (tocar em todos os X), *compreensão* (responder à pergunta tocando a frase que prova a resposta). Consultar uma palavra (toque longo) gasta uma "lanterna" (orçamento de 3–5), mostra leitura + glosa e registra a palavra como "consultada" no modelo do aprendiz. Furigana adaptativa: só sobre kanji cuja leitura o jogador ainda não domina.
4. **Ação por rodada:** ler com propósito → localizar evidência → decidir quando gastar consultas.
5. **Habilidade:** leitura com propósito, *scanning*, leitura extensiva controlada, gestão de palavras desconhecidas.
6. **Por que ajuda:** leitura real envolve objetivos e tolerância à incerteza; o orçamento de consultas ensina a não traduzir tudo (estratégia de leitor fluente) e gera dados preciosos (palavras consultadas = palavras a ensinar). "Tocar na evidência" verifica compreensão sem múltipla escolha.
7. **Nível:** pré-intermediário → intermediário (versão em kana na fase 5).
8. **Exemplo:** texto: 「日曜日、わたしは 友だちと 町へ 行きました。まず、パン屋で パンを 二つ 買いました。それから、公園で 昼ご飯を 食べました。友だちは おにぎりを 食べましたが、わたしは パンを 食べました。夕方、雨が 降ったので、早く 帰りました。」 Missões: (1) "Tap every food" → パン, 昼ご飯, おにぎり, パン; (2) 「どうして 早く 帰りましたか。」 → tocar em 「雨が 降ったので」; (3) "Tap all past-tense verbs" (5).
9. **Progressão:** textos mais longos; menos lanternas; furigana reduzida; missões de inferência (「わたしは パンが すきだと 思いますか。」); gêneros variados (e-mail, anúncio, diário, notícia simplificada).
10. **Reuso:** `texts[]` tokenizados (`wordId` por token), metadados de missão gerados de tags (`food`, `verb.past`) + perguntas curadas.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média (por texto) — alta pela biblioteca de textos e missões múltiplas por texto.
14. **Riscos:** textos acima do nível (frustração) — selecionar por cobertura ≥ 95–98% (Seção 3); missões que se resolvem por padrão visual (ex.: tocar em tudo que termina em た) — combinar com perguntas de sentido.

---

### 32. Corredor de Leitura (RSVP / Leitura Guiada)

1. **Nome:** Corredor de Leitura (*Reading Runner*)
2. **Conceito:** um texto é revelado bloco a bloco em ritmo controlado (como numa esteira de corrida); o jogador "aguenta o ritmo" e depois prova compreensão. O ritmo sobe conforme a fluência.
3. **Funcionamento:** dois modos: (a) *Guiado*: o texto completo fica visível e um realce percorre os blocos (bunsetsu) na velocidade-alvo (preserva a possibilidade de olhar para trás, mais natural); (b) *RSVP*: blocos aparecem um a um no centro (mais intenso, para treino curto). Velocidade em caracteres por minuto (CPM), inicial ~120–150 CPM; nativos leem ~400–600 CPM. Após o texto: 3 perguntas ○✕ ou "toque na evidência". Se a compreensão ≥ 80%, a próxima corrida sobe ~5–10% de velocidade; se < 60%, desce.
4. **Ação por rodada:** ler em ritmo imposto, sem parar para traduzir → responder.
5. **Habilidade:** fluência de leitura (velocidade com compreensão), automaticidade de reconhecimento de palavras.
6. **Por que ajuda:** a fluência só se desenvolve com leitura de texto *fácil* em volume e com pressão leve de ritmo (pesquisa de leitura extensiva e treino de fluência, ex.: "timed reading" de Nation). Textos devem ter ~98% de palavras conhecidas: o objetivo é velocidade, não vocabulário novo. O CPM vira uma métrica motivadora e honesta.
7. **Nível:** pré-intermediário → intermediário (versão em kana para fase 5).
8. **Exemplo:** texto (≈ 90 caracteres) a 150 CPM (~36 s): 「きのう、ともだちと こうえんへ いきました。てんきが よかったので、ベンチで おべんとうを たべました。そのあと、いけの まわりを さんぽしました。」 Perguntas: 「てんきは わるかった。」 ✕ · 「ベンチで たべた。」 ○ · 「いけで およいだ。」 ✕.
9. **Progressão:** CPM adaptativo; textos mais longos; mais kanji; menos furigana; RSVP com blocos maiores; reler o mesmo texto 2–3 vezes com velocidade crescente (*repeated reading*, técnica comprovada para fluência).
10. **Reuso:** `texts[]` e `sentences[]` com contagem de caracteres; seleção por cobertura lexical do jogador ≥ 98%.
11. **Complexidade:** baixa.
12. **Custo:** mínimo.
13. **Rejogabilidade:** média-alta (biblioteca + recorde de CPM).
14. **Riscos:** velocidade sem compreensão — nunca subir CPM sem compreensão ≥ 80%; RSVP impede regressões e pode prejudicar textos complexos — usar o modo guiado como padrão.

---

### 33. Masmorra de Palavras

1. **Nome:** Masmorra de Palavras (言葉のダンジョン — *Word Dungeon*)
2. **Conceito:** um roguelite textual de 5–10 minutos em que cada sala é um micro-desafio de leitura; os inimigos são suas próprias confusões e o chefe é um texto curto.
3. **Funcionamento:** mapa de andares com 5–8 salas em grafo (escolha de caminho, estilo *Slay the Spire* simplificado, todo em texto/emoji). Tipos de sala: *combate* (micro-rodadas de jogos 1, 3, 16, 24, 26 — cada acerto causa dano), *porta trancada* (ler uma instrução para escolher a porta certa), *baú* (charada estilo jogo 13), *loja* (gastar moedas em itens), *descanso* (revisão leve). Itens: 辞書 (dicionário: revela uma glosa), 巻物 (pergaminho: furigana numa frase), お守り (amuleto: perdoa um erro), 時計 (relógio: +5 s). Inimigos têm nome derivado de confusões reais do jogador ("ぬめスライム", aparece se ぬ/め é confusão ativa; "待持ゴースト"). Chefe: texto curto + 3 perguntas. Morte encerra a *run*, mas todas as respostas já foram registradas no modelo do aprendiz; a meta-progressão desbloqueia **tipos de sala e cosméticos**, nunca poder que dispense saber.
4. **Ação por rodada:** escolher caminho (risco vs recompensa: sala de elite = itens confusos do jogador), resolver desafios, gerenciar HP/itens.
5. **Habilidade:** integração de tudo (kana, vocabulário, kanji, partículas, compreensão), com ênfase no que o Scheduler indica.
6. **Por que ajuda:** fornece o "porquê jogar hoje" que mantém a repetição espaçada viva: o conteúdo da run *é* a fila de revisão do dia, mas embrulhado em decisões estratégicas. A variedade de formatos dentro da run é intercalação natural; personificar confusões transforma erro em alvo (motivação para revisar o que é difícil).
7. **Nível:** iniciante (masmorra de kana) → intermediário (masmorra de textos).
8. **Exemplo:** Andar 2, sala "porta trancada": 「左の とびらは あぶない。まんなかの とびらは かぎが かかって いる。右へ 行け。」 → o jogador escolhe a porta direita. Sala de combate contra "シツ Twins": 6 rodadas rápidas シ/ツ/ソ/ン em palavras (シャツ, ソファ). Chefe: texto 「この 森に 住む 竜は、毎晩 月を 見て 歌う。しかし、雨の 夜は 歌わない。」 → 「竜は 雨の 夜に 歌う。」 ✕.
9. **Progressão:** andares mais profundos usam formatos mais exigentes (produção > reconhecimento); masmorras temáticas por fase; modificadores opcionais (sem furigana = +50% moedas).
10. **Reuso:** é um *orquestrador*: chama os módulos dos outros jogos via a mesma interface `GameModule` e pede conteúdo ao Scheduler.
11. **Complexidade:** média (o maior jogo; mas reaproveita os demais).
12. **Custo:** baixo.
13. **Rejogabilidade:** muito alta.
14. **Riscos:** a camada de jogo engolir a aprendizagem (tempo gasto em menus/mapas) — limitar a ≤ 15% do tempo em decisões não-linguísticas; itens não podem "pular" perguntas sem custo pedagógico (o dicionário revela a glosa, mas a palavra é reagendada como erro parcial).

---

### 34. Sobrevivência Kanji + Revanche

1. **Nome:** Sobrevivência Kanji (*Kanji Survival*) com chefe semanal **Revanche** (*Rematch*)
2. **Conceito:** um modo sem fim que serve a fila de revisão do dia em formatos misturados; com 3 vidas, o jogador sobrevive o máximo possível. Toda semana, um chefe "Revanche" é montado a partir dos seus erros dos últimos 7 dias.
3. **Funcionamento:** cada pergunta é sorteada entre formatos compatíveis com o item e a faceta a revisar (digitar leitura, escolher significado entre distratores do grafo de confusões, ○✕ em frase, completar partícula, segmentar). Acertos em itens difíceis devolvem meia vida; tempo de resposta é registrado. A Revanche mostra o "histórico de crimes" (os itens errados e com que foram confundidos) e enfrenta cada um em formato diferente do erro original.
4. **Ação por rodada:** responder rapidamente itens vencidos em formato imprevisível.
5. **Habilidade:** retenção de longo prazo de tudo o que foi aprendido; generalização entre formatos.
6. **Por que ajuda:** é a materialização direta da repetição espaçada com recuperação variada (o mesmo item em formatos diferentes evita aprendizado "dependente de formato"). A Revanche usa o *efeito de hipercorreção* e reforça que errar é parte do jogo, não fracasso.
7. **Nível:** todos (a partir da fase 1).
8. **Exemplo:** sequência: (1) 「駅」 → digitar leitura: えき ✓ · (2) 「待つ」 → *wait* / *hold* / *buy* / *walk* → *wait* ✓ · (3) 「きのう えいがを みませんでした。」 + 🎬✅ → ✕ ✓ · (4) Revanche: no dia 3 o jogador leu 持つ como まつ; agora aparece 「荷物を 持って ください。」 → digitar a leitura de 持って: もって ✓ → "Rematch won! 持 (hold) ≠ 待 (wait)".
9. **Progressão:** a dificuldade é a própria fila; com o tempo, mais formatos de produção e menos de reconhecimento; ritmo adaptativo.
10. **Reuso:** 100% Scheduler + `errorLog`.
11. **Complexidade:** baixa (reaproveita renderizadores de rodada dos outros jogos).
12. **Custo:** mínimo.
13. **Rejogabilidade:** alta (é o "modo diário").
14. **Riscos:** sensação de "prova" — manter ritmo rápido, feedback positivo e sessões curtas (o jogador pode parar a qualquer momento sem penalidade de vida perdida). Não transformar a Revanche em humilhação: linguagem positiva ("You beat 9 of your 11 old mistakes").

---
## 2. Jornada curricular

### 2.1 Melhorias na estrutura proposta

A estrutura 0–8 sugerida foi mantida, com quatro ajustes:

1. **Fase 1 dividida em 1a e 1b** (hiragana base vs. diacríticos/combinados/sokuon/vogal longa), porque o segundo bloco é onde a maioria dos erros persistentes nasce.
2. **Fase 9 adicionada — Autonomia**: leitura extensiva com textos graduados e reais, onde os minijogos passam a ser "suporte" à leitura, não o centro.
3. **Trilhas sobrepostas, não fases estanques.** A fase é um "centro de gravidade", mas as trilhas (kana, vocabulário, kanji, gramática de leitura, fluência) avançam em paralelo. Ex.: os primeiros kanji (一二三, 日月, 山川, 人) entram ainda na fase 3, como palavras; a fase 4 é quando o kanji vira *trilha principal*.
4. **Avanço por domínio do item, não por calendário.** Romaji, furigana e inglês desaparecem *item a item* quando o modelo do aprendiz indica domínio (Seção 3). Os critérios de "prontidão" abaixo regulam apenas a liberação de novos jogos/conteúdos.

**Convenção de métricas:** *dominado* = probabilidade estimada de recordação ≥ 0,9 numa revisão com intervalo ≥ 7 dias **e** tempo médio de resposta abaixo do limiar da faceta (ex.: kana < 1,2 s; palavra < 2,0 s). *Cobertura* = % de tokens de um texto cujos lemas estão dominados.

### 2.2 Visão geral

| Fase | Nome | Duração típica (10–20 min/dia) | Metas acumuladas | Exposição a japonês sem tradução |
|---|---|---|---|---|
| 0 | Primeiro contato | 1–2 dias | modelo mental do sistema de escrita; 10 kana | ~5% |
| 1a | Hiragana base | 1–2 semanas | 46 hiragana | ~10% |
| 1b | Hiragana completo | 1 semana | +25 dakuten/handakuten, 33 combinados, っ, ー | ~15% |
| 2 | Katakana | 1–2 semanas | 46 + variantes; ~80 gairaigo | ~20% |
| 3 | Vocabulário básico | 3–5 semanas | ~300 palavras; 15 kanji-palavra | ~30% |
| 4 | Primeiros kanji | 4–6 semanas | ~120 kanji, ~150 componentes, ~600 palavras | ~40% |
| 5 | Frases simples | 4–6 semanas | ~900 palavras; partículas e ます-forms; ~180 kanji | ~50% |
| 6 | Vocabulário + kanji em contexto | 2–3 meses | ~1.600 palavras; ~320 kanji; formas て/た/ない | ~65% |
| 7 | Textos curtos | 2–3 meses | ~2.400 palavras; ~470 kanji; 150–200 CPM | ~80% |
| 8 | Compreensão intermediária | 3–4 meses | ~3.500 palavras; ~650 kanji; 250–300 CPM | ~90% |
| 9 | Autonomia | contínuo | leitura extensiva; 4.000+ palavras | ~95% |

---

### Fase 0 — Primeiro contato (iniciante absoluto)

- **Objetivo:** desmistificar. Mostrar em 10 minutos que o japonês usa três scripts com papéis diferentes, e que o jogador já consegue ler algo.
- **Jogos usados:** Tabuleiro Gojūon (versão "linha あ" e "linha か"), Chuva de Kana (10 kana, romaji como resposta), Fatiador de Frases em modo "demonstração" (frase com kanji+kana colorida por script).
- **Conhecimento introduzido:** あいうえお, かきくけこ; a ideia de mora; a noção de que hiragana = gramática/palavras nativas, katakana = empréstimos, kanji = conteúdo; a primeira palavra legível: あおい (*blue*), いえ (*house*), かお (*face*), あき (*autumn*).
- **Revisado:** — (primeiras revisões do Scheduler no mesmo dia, em intervalos de minutos).
- **Critério de prontidão:** reconhecer os 10 kana com ≥ 90% de acerto em duas sessões distintas; ler 3 palavras de 2 kana.

### Fase 1a — Hiragana base (iniciante absoluto)

- **Jogos:** Chuva de Kana, Tabuleiro Gojūon, Gêmeos Traiçoeiros (kana), Cobra Silábica, Fatiador de Frases (frases curtíssimas em kana), Sobrevivência (modo kana).
- **Introduzido:** 46 hiragana em blocos de 5–10 por linha do gojūon, intercalando já na 2ª linha pares confundíveis (さ/き/ち; ぬ/め; ね/れ/わ; は/ほ; る/ろ). ~30 palavras de 2–3 kana de alta frequência só como material de leitura (ねこ, いぬ, すし, はな).
- **Revisado:** todo kana anterior, com peso nos confundíveis; romaji começa a sumir (o kana dominado deixa de mostrar romaji em feedback).
- **Prontidão:** 46/46 hiragana dominados (≥ 90% e < 1,5 s); Tabuleiro Gojūon completo em < 90 s; ler palavras de 3 kana com ≥ 85% de acerto.

### Fase 1b — Hiragana completo (iniciante absoluto)

- **Jogos:** Forja de Diacríticos, Chuva de Kana (modo palavras), Cobra Silábica (っ, ゃ), Kana Wordle (versão restrita a ~100 palavras), Fatiador de Frases.
- **Introduzido:** が〜ぽ (25), きゃ〜ぴょ (33), っ, vogais longas (おかあさん, とうきょう), a partícula は lida "wa", を "o", へ "e".
- **Revisado:** hiragana base (intervalos já de dias); confusões registradas na 1a.
- **Prontidão:** ≥ 90% em leitura de palavras com っ/ゃ/ー; distinguir pares mínimos (びよういん/びょういん, きて/きって) com ≥ 90%; **romaji eliminado** de todos os prompts.

### Fase 2 — Katakana (iniciante)

- **Jogos:** Espelho Hira–Kata, Katakana Café, Gêmeos Traiçoeiros (シ/ツ/ソ/ン, ク/ケ/タ, ウ/ワ/フ, コ/ユ, ア/マ), Chuva de Kana (modo katakana e misto), Cobra Silábica (gairaigo).
- **Introduzido:** 46 katakana ancorados no hiragana; ー; combinações estendidas (ティ, ファ, ウィ, ジェ); ~80 empréstimos frequentes (コーヒー, テレビ, パン, バス, ホテル, レストラン, コンビニ, スマホ).
- **Revisado:** hiragana completo (em palavras), vocabulário da fase 1.
- **Prontidão:** katakana dominado (≥ 90%, < 1,5 s); Katakana Café nível 3 com ≥ 85%; ler palavras longas (アイスクリーム, コンピューター) com ≥ 80%.

### Fase 3 — Vocabulário básico (iniciante)

- **Jogos:** Esteira de Triagem, Kana Wordle, Shiritori Duelo, Quem Sou Eu? (pistas curtíssimas), Empilhador de Sílabas, Cena Relâmpago (frases de 3–4 palavras), Fatiador, Relógio & Calendário (números arábicos + kana), Sobrevivência.
- **Introduzido:** ~300 palavras por frequência e utilidade (pessoas, comida, lugares, tempo, adjetivos básicos, verbos em ます); ~15 kanji-palavra concretos e pictográficos (一 二 三 日 月 山 川 人 口 木 水 火 大 小 中), apresentados como palavras com furigana; padrões de frase fixos como *chunks* (〜は〜です, 〜が あります/います, 〜を ください).
- **Revisado:** kana em palavras (a revisão de kana isolado praticamente para); vocabulário com o Scheduler.
- **Prontidão:** 250+ palavras com faceta "significado" dominada; Cena Relâmpago com ≥ 85% em frases de 4 palavras a ≤ 4 s/frase; Esteira de Triagem com rótulos sem glosa ≥ 85%.

### Fase 4 — Primeiros kanji (iniciante avançado)

- **Jogos:** Alquimia de Radicais, Famílias de Kanji, Tríades, Leitura Dupla (versão simples), Bingo de Leituras, Leitor de Placas, Gêmeos Traiçoeiros (kanji), Relógio & Calendário (kanji), Empilhador (blocos de kanji).
- **Introduzido:** ~120 kanji (ordem: frequência × simplicidade × utilidade como componente: 日 月 火 水 木 金 土 / 人 口 目 手 / 上 下 中 / 学 生 先 / 行 来 見 食 飲 / 時 間 / 駅 店 / 入 出 ...); ~150 componentes nomeados em inglês; ~300 palavras novas, todas contendo kanji conhecidos; furigana adaptativa ativada.
- **Revisado:** vocabulário da fase 3 agora reescrito *com kanji* (a palavra é o mesmo item; a forma em kanji é uma faceta nova: やま → 山).
- **Prontidão:** 100+ kanji com faceta "significado" dominada e 70+ com "leitura em palavra" dominada; Tríades com ≥ 85%; componentes reconhecidos em kanji novos (Famílias ≥ 80% com kanji nunca vistos).

### Fase 5 — Frases simples (iniciante avançado)

- **Jogos:** Partícula Ninja, Construtor de Frases, Cena Relâmpago, Mapa de Instruções, Mercado de Contadores, Fatiador (com kanji), Detetive de Contexto (versão simples), Masmorra de Palavras (andares 1–3).
- **Introduzido:** partículas principais (は が を に で へ と の も から まで), formas ます/ません/ました/ませんでした, adjetivos い/な (presente/negativo/passado), existência (ある/いる), posição (うえ・した・なか・まえ・うしろ・となり), contadores básicos, 〜てください; ~300 palavras novas; ~60 kanji novos.
- **Revisado:** vocabulário e kanji das fases 3–4, agora *em frases* (a faceta "compreensão em contexto" começa a ser medida).
- **Prontidão:** Partícula Ninja ≥ 85% com に/で/を/は/が intercalados; Cena Relâmpago com frases de 6–8 palavras ≥ 85%; compreender 3 instruções encadeadas (Mapa) ≥ 80%.

### Fase 6 — Vocabulário + kanji em contexto (pré-intermediário)

- **Jogos:** Leitura Dupla (completo), Tríades (compostos), Encruzilhada Kanji, Detetive de Contexto, Rastreador de Formas (て/た/ない/たい), Construtor de Frases (orações relativas), Bingo (frases com lacuna), Esteira (categorias gramaticais), Masmorra (andares 4–6), Sobrevivência.
- **Introduzido:** ~700 palavras (muitas como compostos de kanji conhecidos); ~140 kanji; formas て/た/ない, 〜ている, 〜たい, 〜から/〜ので, 〜けど, modificação pré-nominal; inferência lexical como estratégia explícita.
- **Revisado:** kanji por compostos (cada kanji revisado *em palavras*, não sozinho); confusões visuais de kanji (待/持, 未/末).
- **Prontidão:** 300+ kanji com leitura em palavra dominada; Detetive de Contexto ≥ 70% com até 2 pistas; cobertura ≥ 95% em textos graduados de nível 2 (por exemplo, equivalentes a leitores graduados de nível iniciante).

### Fase 7 — Textos curtos (pré-intermediário)

- **Jogos:** Explorador de Texto, Ordem da História, Corredor de Leitura, Cena Relâmpago (com mini-textos), Corrente de Compostos, Detetive de Contexto, Masmorra (chefes = textos), Rastreador de Formas (potencial, volitivo, condicional).
- **Introduzido:** ~800 palavras; ~150 kanji; textos de 100–400 caracteres (diários, e-mails, anúncios, receitas, histórias); conectivos de discurso (それから, でも, だから, それで, つまり); formas planas (forma de dicionário em textos escritos); furigana só para kanji não dominados.
- **Revisado:** tudo via textos — o vocabulário é revisado majoritariamente em contexto (Scheduler prefere frases e textos que contenham itens vencidos).
- **Prontidão:** ler textos de 300 caracteres com 98% de cobertura a ≥ 150 CPM com compreensão ≥ 80%; Ordem da História sem marcadores ≥ 75%.

### Fase 8 — Compreensão intermediária (intermediário)

- **Jogos:** Corredor de Leitura (CPM alto, leitura repetida), Explorador de Texto (inferência, textos de 400–1.000 caracteres), Detetive de Contexto (palavras abstratas), Rastreador de Formas (passiva/causativa/〜てしまう), Encruzilhada Kanji, Masmorra (andares profundos), Sobrevivência/Revanche.
- **Introduzido:** ~1.100 palavras (vocabulário abstrato, expressões de opinião); ~180 kanji; gêneros expositivos (notícias simplificadas, explicações, opiniões); estruturas de nível N3 (〜ようだ, 〜らしい, 〜ために, 〜ことにする, 〜わけではない).
- **Revisado:** retenção de longo prazo (intervalos de meses); leech items com tratamento especial.
- **Prontidão (para "intermediário de leitura"):** ~3.500 palavras e ~650 kanji estimados dominados; leitura de textos graduados avançados/notícias simplificadas a 250–300 CPM com ≥ 80% de compreensão; Detetive de Contexto ≥ 70% com 1–2 pistas.

### Fase 9 — Autonomia (intermediário+)

- **Uso dos jogos:** como suporte a leitura extensiva. O jogador importa (ou escolhe) textos; o sistema calcula cobertura, pré-ensina as 5–10 palavras desconhecidas mais frequentes do texto com Detetive de Contexto/Tríades, e depois o jogador lê no Explorador de Texto; palavras consultadas viram itens no Scheduler.
- **Critério:** não há "fim" — a métrica passa a ser volume de leitura (caracteres lidos/semana) e CPM.

---

## 3. Integração do ecossistema: o modelo central do aprendiz

### 3.1 Princípio

Todos os jogos são *clientes* de três serviços centrais:

```
┌──────────────┐   pede itens    ┌─────────────┐    lê/escreve    ┌──────────────────┐
│  GameModule  │ ──────────────▶ │  Scheduler  │ ◀──────────────▶ │  LearnerModel    │
│ (qualquer    │ ◀────────────── │ (o que vem  │                  │ (estado por      │
│  minijogo)   │  itens+distrat. │  a seguir)  │                  │  item × faceta)  │
│              │ ── evidências ─────────────────────────────────▶ │                  │
└──────────────┘                 └─────────────┘                  └──────────────────┘
        │                              │
        ▼                              ▼
┌──────────────────┐         ┌────────────────────┐
│ DistractorService│◀────────│  ContentStore      │  (palavras, kana, kanji,
│ (grafo confusão) │         │  (pacotes JSON)    │   frases, textos, índices)
└──────────────────┘         └────────────────────┘
```

O jogo **nunca decide** o que o jogador estuda; ele declara *o que sabe treinar* e o Scheduler devolve o melhor conteúdo para aquele formato. Isso garante que um minuto de Cobra Silábica e um minuto de Explorador de Texto alimentem o mesmo progresso.

### 3.2 Itens e facetas

- **Item** = unidade de conhecimento: um kana, um componente, um kanji, uma palavra (lema), um padrão gramatical, uma leitura irregular, um contador.
- **Faceta** = direção/tipo de conhecimento sobre o item:

| Faceta | Exemplo | Tipos de item |
|---|---|---|
| `form→sound` | ぬ → nu | kana, palavra, kanji-em-palavra |
| `sound→form` | "nu" → ぬ ; やま → 山 | kana, palavra |
| `form→meaning` | 山 → *mountain* | kanji, palavra, componente |
| `meaning→form` | *mountain* → 山/やま | palavra |
| `context` | entender 山 em 「山に のぼる」 | palavra, padrão |
| `discrimination` | 待 vs 持 | pares confundíveis |
| `fluency` | tempo de reconhecimento | todos |

Cada evidência (resposta) atualiza **uma ou mais facetas** com um **peso** que depende do formato:

| Formato de resposta | Peso de evidência | Comentário |
|---|---|---|
| Produção digitada sem pista | 1,0 | evidência mais forte |
| Montagem com peças (com distratores) | 0,8 | |
| Classificação / ação (Esteira, Mapa, Placas) | 0,7 | compreensão sem tradução |
| ○✕ | 0,4 | 50% de acerto por chance |
| Múltipla escolha com distratores do grafo | 0,6 | |
| Múltipla escolha com distratores aleatórios | 0,3 | evitado |
| Exposição passiva (palavra lida num texto, sem tarefa) | 0,1 (só `exposures`) | conta como exposição, não como recuperação |

### 3.3 Estado por item

```ts
interface FacetState {
  stability: number;      // dias até P(recall) cair a 0.9 (modelo tipo FSRS/half-life)
  difficulty: number;     // 1..10, aprendido por item
  lastReview: number;     // epoch ms
  reps: number;           // revisões com evidência >= 0.5
  lapses: number;         // falhas após ter sido "aprendido"
  correct: number;
  errors: number;
  rtEmaMs: number;        // média móvel exponencial do tempo de resposta (acertos)
}

interface ItemState {
  itemId: string;                 // "w:山", "k:山", "kana:ぬ", "g:te-kudasai"
  firstSeen: number;
  exposures: number;              // inclui leitura passiva em textos
  facets: Partial<Record<Facet, FacetState>>;
  confusions: Record<string, number>; // itemId confundido → contagem (decai com o tempo)
  scaffold: { romaji: boolean; furigana: boolean; gloss: boolean }; // andaimes ainda visíveis
  flags: { leech?: boolean; inferred?: boolean; lookedUp?: number };
}
```

**Probabilidade de recordação** (curva de esquecimento, compatível com FSRS simplificado):

```ts
// R(t) = (1 + t / (9 * S)) ^ -1   → R = 0.9 quando t = S
function retrievability(f: FacetState, now: number): number {
  const tDays = (now - f.lastReview) / 86_400_000;
  return Math.pow(1 + tDays / (9 * f.stability), -1);
}
```

**Domínio estimado** (exibido ao jogador e usado nos critérios de fase):

```ts
function mastery(item: ItemState, facet: Facet, now: number): number {
  const f = item.facets[facet]; if (!f) return 0;
  const R = retrievability(f, now);
  const longTerm = Math.min(1, Math.log1p(f.stability) / Math.log1p(60)); // 60 dias ≈ teto
  const speed = clamp01((RT_SLOW[facet] - f.rtEmaMs) / (RT_SLOW[facet] - RT_FAST[facet]));
  return 0.5 * R + 0.35 * longTerm + 0.15 * speed;
}
```

### 3.4 Atualização após cada resposta

```ts
function update(item: ItemState, facet: Facet, ev: Evidence, now: number) {
  const f = item.facets[facet] ?? initFacet(now);
  const R = retrievability(f, now);
  const w = ev.weight;                         // tabela 3.2
  item.exposures++;
  if (ev.correct) {
    f.correct++;
    // ganho de estabilidade maior quando R era baixo (dificuldade desejável) e o formato é forte
    const gain = 1 + w * Math.exp(0.9) * (11 - f.difficulty) / 10
                     * Math.pow(f.stability, -0.2) * (Math.exp((1 - R) * 1.5) - 1);
    // resposta lenta = acerto "frágil": ganho reduzido
    const slow = ev.rtMs > RT_SLOW[facet] ? 0.6 : 1;
    f.stability *= Math.max(1.05, gain * slow);
    f.difficulty = clamp(f.difficulty - 0.15 * w, 1, 10);
    f.rtEmaMs = ema(f.rtEmaMs, ev.rtMs, 0.3);
  } else {
    f.errors++; f.lapses += f.reps > 2 ? 1 : 0;
    f.stability = Math.max(0.02, f.stability * (0.35 + 0.3 * (1 - w))); // erro em formato fácil pesa mais
    f.difficulty = clamp(f.difficulty + 0.6 * w, 1, 10);
    if (ev.chosenItemId) {                                   // registra confusão
      item.confusions[ev.chosenItemId] = (item.confusions[ev.chosenItemId] ?? 0) + 1;
      errorLog.push({ itemId: item.itemId, confusedWith: ev.chosenItemId, facet,
                      type: classifyError(item.itemId, ev.chosenItemId), at: now, gameId: ev.gameId });
    }
    if (f.lapses >= 6) item.flags.leech = true;              // ver Seção 5.6
  }
  if (w >= 0.5) f.reps++;
  f.lastReview = now;
  item.facets[facet] = f;
  updateScaffolds(item, now);   // remove romaji/furigana/glosa quando mastery > limiar
}
```

Evidência **implícita** também é aproveitada: no Explorador de Texto, se o jogador respondeu certo a uma pergunta cuja evidência está numa frase, todas as palavras dessa frase recebem uma evidência `context` leve (w = 0,2); se ele *consultou* uma palavra, ela recebe um erro leve na faceta `form→meaning`.

### 3.5 Seleção do que vem a seguir (Scheduler)

Cada jogo declara:

```ts
interface GameCapabilities {
  itemTypes: ItemType[];          // ["kana"] | ["word","kanji"] | ["sentence"] ...
  facets: Facet[];                // facetas que este jogo mede
  needsContext: boolean;          // precisa de frase/texto contendo o item?
  maxNewPerRound: number;         // quantos itens novos tolera
  roundSize: [min: number, max: number];
}
```

Algoritmo de seleção de uma rodada:

```ts
function selectRound(game: GameCapabilities, learner: Learner, now: number): RoundPlan {
  const candidates = learner.itemsOfTypes(game.itemTypes);

  // 1. Pontuação de prioridade por item × faceta compatível
  const scored = candidates.flatMap(item => game.facets
    .filter(fc => isUnlocked(item, fc, learner))            // pré-requisitos (ex.: kanji só após kana)
    .map(fc => {
      const f = item.facets[fc];
      const R = f ? retrievability(f, now) : null;
      let p = 0;
      if (R === null) p = 0;                                 // novo: tratado no passo 3
      else {
        p += Math.max(0, TARGET_R - R) * 10;                 // vencido (TARGET_R = 0.9)
        p += (f.difficulty / 10) * 1.5;                      // difícil
        p += Math.min(3, sum(item.confusions)) * 0.8;        // confusões ativas
        p += item.flags.leech ? 1.5 : 0;
        p += recentlyErred(item, now, 10 * MIN) ? 4 : 0;     // repetição inteligente do erro (curta)
        p -= recentlySeen(item, now, 2 * MIN) ? 5 : 0;       // evita repetir cedo demais
        p += formatNovelty(item, fc, game) * 0.5;            // prefere formatos ainda não usados p/ o item
      }
      return { item, facet: fc, p, R };
    }));

  // 2. Revisões: os mais prioritários entre os vencidos (R < 0.9) ou fracos
  const reviews = topK(scored.filter(s => s.R !== null && (s.R < TARGET_R || s.p > 3)),
                       Math.round(game.roundSize[1] * 0.7));

  // 3. Itens novos: só se a carga de revisão estiver saudável
  const dueBacklog = countDue(learner, now);
  const newBudget = dueBacklog > 80 ? 0 : Math.min(game.maxNewPerRound, learner.dailyNewLeft);
  const news = nextNewItems(learner, game, newBudget);       // ordem: currículo × frequência × pré-requisitos

  // 4. Reforço: itens bem sabidos, para ritmo e confiança (~15%)
  const easy = sample(scored.filter(s => s.R !== null && s.R > 0.97), Math.round(game.roundSize[1] * 0.15));

  // 5. Intercalação: garantir que pares confundíveis apareçam juntos
  const plan = interleave([...reviews, ...news, ...easy], learner.confusionGraph);

  // 6. Contexto: se o jogo precisa de frases, escolher frases que cubram vários itens do plano
  if (game.needsContext) plan.contexts = pickContexts(plan, learner, { minCoverage: 0.95 });

  // 7. Distratores por item
  plan.distractors = plan.items.map(s => DistractorService.for(s.item, s.facet, learner, 3));
  return plan;
}
```

**Escolha de contexto** (frases/textos) — cobertura por jogador:

```ts
function pickContexts(plan, learner, { minCoverage }) {
  const targets = new Set(plan.items.map(s => s.item.itemId));
  return ContentStore.sentencesContainingAny(targets)
    .map(s => ({ s, cov: coverage(s, learner, targets),          // % tokens conhecidos (alvos contam como conhecidos)
                 hits: s.wordIds.filter(id => targets.has(id)).length,
                 fresh: !learner.sawSentenceRecently(s.id) }))
    .filter(x => x.cov >= minCoverage && x.fresh)
    .sort((a, b) => b.hits - a.hits || b.cov - a.cov)
    .greedyCover(targets);                                        // cobertura gulosa de conjunto
}
```

**Distratores** — sempre do que *o jogador* confunde, depois do que *as pessoas* confundem:

```ts
function distractorsFor(item, facet, learner, n) {
  const personal = Object.entries(learner.state(item).confusions)
                    .sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const graph = ConfusionGraph.neighbors(item.itemId, facetToRelation(facet)); // visual | phonological | semantic
  const pool = unique([...personal, ...graph])
               .filter(id => learner.hasSeen(id));               // nunca distrator desconhecido
  return pool.slice(0, n).concat(randomSameCategory(item, n));   // completa se faltar
}
```

**Escolha do próximo jogo** (no "modo sessão" que encadeia jogos):

```ts
function nextGame(learner, sessionSoFar): GameId {
  const deficits = facetDeficits(learner);   // ex.: { "sound→form": 0.3, context: 0.6, fluency: 0.2 }
  return argmax(availableGames(learner.phase), g =>
      dot(g.facetVector, deficits)          // treina o que mais falta
    + 0.5 * learner.preference[g.id]        // gosto do jogador (tempo de jogo voluntário)
    - 0.8 * (sessionSoFar.includes(g.id) ? 1 : 0)   // variedade
    - 0.3 * g.cognitiveLoad * sessionFatigue(sessionSoFar));
}
```

### 3.6 Exemplo concreto de decisão

Estado do jogador (fase 4): `k:待` com `form→meaning` R = 0,72 e confusão `{ "k:持": 3 }`; `w:駅` com R = 0,95; `w:時間` novo; vencidos totais = 34.

1. Jogo atual: **Tríades** (facetas `form→meaning`, `form→sound`).
2. Prioridade de 待: (0,9 − 0,72)·10 = 1,8 + dificuldade 6,5/10·1,5 = 0,98 + confusões 3·0,8 = 2,4 → **5,2** (topo).
3. Intercalação força 持 no mesmo tabuleiro; DistractorService adiciona *hold* como significado-distrator para 待.
4. 時間 entra como item novo (backlog 34 < 80).
5. 駅 entra como item "fácil" de ritmo.
6. Se o jogador errar 待 de novo → `recentlyErred` (+4) faz 待 voltar daqui a 2–3 rodadas em **formato diferente** (Leitura Dupla: 「駅で 友だちを 待つ」 → digitar まつ).

### 3.7 Desbloqueio de andaimes (romaji, furigana, inglês)

```ts
function updateScaffolds(item, now) {
  if (item.type === "kana")  item.scaffold.romaji   = mastery(item, "form→sound", now) < 0.75;
  if (item.type === "kanji" || item.hasKanji)
                             item.scaffold.furigana = mastery(item, "form→sound", now) < 0.70;
  if (item.type === "word")  item.scaffold.gloss    = mastery(item, "form→meaning", now) < 0.80
                                                      || item.facets.context === undefined;
}
```

Furigana é decidida **por kanji em cada palavra** no momento de renderizar: 「駅で 友だちを 待つ」 pode mostrar furigana só em 待 (まつ) se só ele estiver fraco.

---

## 4. Seleções

### 4.1 Top 10 — mais fortes pedagogicamente

| # | Jogo | Por quê |
|---|---|---|
| 1 | **Detetive de Contexto (29)** | Treina a habilidade que gera a maior parte do vocabulário de longo prazo (inferência na leitura), com dificuldade desejável e múltiplos contextos. |
| 2 | **Fatiador de Frases (9)** | Ataca diretamente o gargalo específico do japonês (texto sem espaços); útil da fase 0 à 8; ensina o valor funcional dos scripts. |
| 3 | **Cena Relâmpago (26)** | Compreensão direta sem tradução, alta densidade de input, pares mínimos semânticos que forçam atenção ao fim da frase. |
| 4 | **Tríades (16)** | Consolida a tríade forma–leitura–significado e mede cada faceta separadamente. |
| 5 | **Explorador de Texto (31)** | Leitura com propósito, gestão de incerteza, prova por evidência; gera dados sobre palavras desconhecidas. |
| 6 | **Leitura Dupla (17)** | Produção da leitura em palavra real — a maneira certa de aprender on/kun. |
| 7 | **Sobrevivência + Revanche (34)** | Repetição espaçada com variabilidade de formato + erros como conteúdo: o motor de retenção. |
| 8 | **Corredor de Leitura (32)** | Único jogo que treina fluência (CPM com compreensão) — sem ele o aluno "sabe" mas lê devagar. |
| 9 | **Partícula Ninja (24)** | Automatiza o esqueleto da frase com feedback contrastivo e intercalação de partículas confundíveis. |
| 10 | **Alquimia de Radicais (14)** | Torna o kanji composicional; reduz carga e habilita inferência de kanji novos. |

### 4.2 Top 10 — mais divertidos / maior potencial de retenção de usuários

| # | Jogo | Gancho principal |
|---|---|---|
| 1 | **Masmorra de Palavras (33)** | Estrutura roguelite (escolhas, risco, runs curtas, "só mais uma"); inimigos personalizados. |
| 2 | **Kana Wordle (5)** | Formato diário provado, compartilhável, dedução satisfatória. |
| 3 | **Empilhador de Sílabas (11)** | Loop arcade de alta tensão com estratégia e "combos". |
| 4 | **Shiritori Duelo (12)** | Jogo cultural real, competitivo, estratégico. |
| 5 | **Encruzilhada Kanji (18)** | Puzzle "aha" diário, sensação de maestria visível. |
| 6 | **Chuva de Kana (1)** | Recorde, ritmo, progresso rápido e tangível nas primeiras horas (crítico para retenção D1–D7). |
| 7 | **Katakana Café (8)** | Tema, humor (パン = pão!), ritmo de gestão. |
| 8 | **Quem Sou Eu? (13)** | Tensão de "arriscar cedo", charadas surpreendentes. |
| 9 | **Cena Relâmpago (26)** | Ritmo de swipe viciante, sessões de 60 s. |
| 10 | **Corrente de Compostos (19)** | Estratégia + o prazer de fechar ciclos. |

### 4.3 Top 10 — mais simples de implementar

| # | Jogo | Motivo |
|---|---|---|
| 1 | Tabuleiro Gojūon (2) | Grade estática + drag & drop; dados mínimos. |
| 2 | Gêmeos Traiçoeiros (3) | Grade de botões; depende só do grafo de confusão. |
| 3 | Espelho Hira–Kata (7) | Jogo da memória clássico. |
| 4 | Famílias de Kanji (15) | Arrastar para caixas; metadados de componentes. |
| 5 | Bingo de Leituras (20) | Grade + fila de anúncios. |
| 6 | Ordem da História (30) | Lista ordenável. |
| 7 | Cena Relâmpago (26) | Swipe binário; gerador de templates é o único esforço. |
| 8 | Quem Sou Eu? (13) | Revelação sequencial de texto; esforço em conteúdo. |
| 9 | Fatiador de Frases (9) | Comparação de índices de corte com tokenização pré-calculada. |
| 10 | Esteira de Triagem (10) | Animação CSS + drop zones. |

### 4.4 MVP — os 8 jogos

| # | Jogo | Fases | Gênero | Facetas principais | Complexidade |
|---|---|---|---|---|---|
| 1 | **Chuva de Kana** | 0–2 (modo palavras até 3) | arcade/velocidade | form→sound, fluency | baixa |
| 2 | **Katakana Café** | 2–3 | dedução/gestão | form→sound, form→meaning | baixa |
| 3 | **Fatiador de Frases** | 0–8 | puzzle/segmentação | context, form→meaning | baixa |
| 4 | **Esteira de Triagem** | 3–6 | sorting/velocidade | form→meaning (sem inglês) | baixa |
| 5 | **Tríades** | 4–7 | matching estratégico | form→meaning, form→sound, discrimination | baixa |
| 6 | **Cena Relâmpago** | 3–8 | velocidade/compreensão | context, fluency | muito baixa |
| 7 | **Detetive de Contexto** | 5–8 | dedução/inferência | context, aquisição de novos itens | baixa |
| 8 | **Sobrevivência + Revanche** | 1–9 | sobrevivência | todas (via Scheduler), discrimination | baixa |

**Por que esses 8, juntos:**

- **Eficiência pedagógica:** cobrem toda a cadeia de leitura — decodificar (Chuva), decodificar empréstimos (Café), segmentar (Fatiador), acessar significado sem tradução (Esteira), ligar forma–leitura–significado de kanji (Tríades), compreender frases (Cena), adquirir vocabulário pela leitura (Detetive) e reter tudo no longo prazo (Sobrevivência/Revanche). Juntos treinam todas as facetas do modelo do aprendiz, e cerca de 70% das interações são de produção, ação ou classificação, não de múltipla escolha.
- **Variedade:** oito gêneros distintos (arcade, gestão, puzzle, sorting, matching, swipe, dedução, sobrevivência), com ritmos diferentes (reflexo, raciocínio, leitura atenta), o que permite montar sessões de 5–10 minutos encadeando 2–3 jogos sem monotonia.
- **Progressão:** existe pelo menos um jogo "principal" para cada fase de 0 a 8; Fatiador, Cena e Sobrevivência acompanham o aluno do começo ao fim e *mudam de cara* conforme o conteúdo (kana → kanji → textos), dando continuidade e percepção de progresso.
- **Baixo custo técnico:** todos são DOM puro (só a Chuva usa um loop de animação), nenhum usa imagens (emoji nativo), todos cabem em < 15 KB gzip; a maior parte do esforço está no pipeline de conteúdo, que é compartilhado.
- **Expansibilidade:** os oito obrigam a construir, já no MVP, o núcleo que todos os outros 26 jogos usam: ContentStore com tokenização, LearnerModel por faceta, Scheduler, DistractorService/grafo de confusões, gerador de templates (Cena) e errorLog (Revanche). Cada jogo seguinte é um plugin de baixo custo.
- **Retenção de usuários:** Chuva e Café dão vitórias rápidas nas primeiras horas (crítico para D1–D7); Cena e Sobrevivência sustentam o hábito diário de 1–5 minutos; Revanche cria um evento semanal; Detetive oferece a sensação de "estou lendo de verdade" que segura o aluno no platô intermediário.

**Roadmap pós-MVP sugerido:** v1.1 → Kana Wordle, Partícula Ninja, Construtor de Frases, Explorador de Texto · v1.2 → Alquimia de Radicais, Leitura Dupla, Corredor de Leitura · v1.3 → Masmorra de Palavras (orquestrando os anteriores), Encruzilhada, Shiritori.

---

## 5. Análises adicionais

### 5.1 Arquitetura conceitual do sistema de conteúdo

```
┌─────────────────────────── BUILD OFFLINE (Node/Python, CI) ───────────────────────────┐
│ Fontes: JMdict (palavras), KANJIDIC2 (kanji), KanjiVG/IDS (componentes),            │
│         Tatoeba + frases curadas (frases), listas de frequência (corpus/web/legendas), │
│         textos graduados próprios                                                       │
│   │                                                                                     │
│   ├─ Normalização (NFKC, variantes), seleção por frequência e fase                     │
│   ├─ Tokenização (Sudachi ou MeCab+UniDic): lema, leitura, POS, flexões, bunsetsu       │
│   ├─ Enriquecimento: tags semânticas, emoji, contador, origem de gairaigo,             │
│   │                  homófonos, compostos por kanji, kanji→palavras                    │
│   ├─ Grafo de confusão: visual (componentes/IDS + distância de traços),                │
│   │                     fonológico (leituras), semântico (tags/embeddings)             │
│   ├─ Dificuldade de frase/texto: rank de frequência dos lemas, nº de kanji, extensão,   │
│   │                               padrões gramaticais → "nível" 0–9                     │
│   ├─ Validação: frases de template re-tokenizadas; revisão humana amostral            │
│   └─ Empacotamento por fase: core.json, phase-03.json, sentences-03a.json …            │
└────────────────────────────────────────────────────────────────────────────────────────┘
                     │ (estático, CDN, cache do Service Worker)
┌─────────────────────────── RUNTIME (navegador) ─────────────────────────────────────┐
│ ContentStore: carrega pacotes sob demanda; índices em memória (Map) só da fase atual  │
│              + anteriores; pacotes futuros pré-carregados em segundo plano            │
│ LearnerModel: IndexedDB (um registro por item); escrita a cada resposta (fila em lote)│
│ Scheduler / DistractorService / TemplateEngine / ErrorAnalyzer                        │
│ GameModules (plugins carregados por import() dinâmico)                                │
│ Sync opcional: exporta/importa JSON do progresso; backend mínimo (KV) se houver conta │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Orçamento de dados (estimado):** 4.000 palavras × ~250 B = ~1 MB bruto (~250 KB gzip); 700 kanji × ~400 B = ~280 KB; 20.000 frases tokenizadas × ~350 B = ~7 MB bruto (~1,5 MB gzip) — divididas em pacotes por fase de 100–300 KB gzip; progresso do aprendiz: 10.000 itens × ~200 B = ~2 MB em IndexedDB. Tudo confortável para celulares modestos.

**Licenças a respeitar:** JMdict/KANJIDIC2 (EDRDG, CC BY-SA 4.0 — exige atribuição e compartilhamento), KanjiVG (CC BY-SA 3.0), Tatoeba (CC BY 2.0 FR; qualidade variável, exige curadoria). Listas de frequência devem ter licença verificada caso a caso.

### 5.2 Modelo de dados

```ts
// ---------- Conteúdo ----------
type Script = "hiragana" | "katakana" | "kanji" | "mixed";
type ItemType = "kana" | "component" | "kanji" | "word" | "grammar" | "counter";
type Facet = "form→sound" | "sound→form" | "form→meaning" | "meaning→form"
           | "context" | "discrimination" | "fluency";

interface Kana {
  id: string;            // "kana:ぬ"
  char: string;          // "ぬ"
  script: "hiragana" | "katakana";
  romaji: string;        // "nu"  (andaime, fases 0–1)
  row: string;           // "n"
  col: "a" | "i" | "u" | "e" | "o" | "-";
  kind: "basic" | "dakuten" | "handakuten" | "yoon" | "small" | "extended";
  pairId: string;        // "nu" → liga ぬ e ヌ
  baseOf?: string[];     // か → ["kana:が"]
}

interface Component {
  id: string;            // "comp:氵"
  glyph: string;         // "氵"
  nameEn: string;        // "water"
  variants?: string[];   // ["水"]
}

interface Kanji {
  id: string;            // "k:待"
  char: string;
  keywordEn: string;     // "wait"
  on: string[];          // ["タイ"]
  kun: string[];         // ["ま.つ"]
  components: string[];  // ["comp:彳", "comp:寺"]
  phonetic?: string;     // "comp:寺" (com nota de exceção quando a leitura não segue)
  strokes: number;
  freqRank: number;
  phase: number;         // fase em que é introduzido
  confusables: string[]; // ["k:持", "k:特"]
}

interface Word {
  id: string;            // "w:待つ"
  surface: string;       // "待つ"
  reading: string;       // "まつ"
  glossEn: string[];     // ["to wait"]
  defJa?: string;        // "だれかが くるまで そこに いる こと"  (definição simples)
  pos: string[];         // ["verb.godan.tsu"]
  kanji: string[];       // ["k:待"]
  tags: string[];        // ["action", "time"]
  freqRank: number;
  phase: number;
  emoji?: string;
  counter?: string;      // "本" para えんぴつ
  origin?: "en" | "pt" | "de" | "fr" | "nl" | "wasei";
  homophones?: string[];
  flags?: { jukujikun?: boolean; rendaku?: boolean };
}

interface Token {
  s: string;             // superfície: "待って"
  r: string;             // leitura: "まって"
  start: number; end: number;  // offsets na frase
  wordId?: string;       // "w:待つ"
  pos: string;           // "verb"
  infl?: string[];       // ["te"]
  chunk: number;         // índice do bunsetsu
}

interface Sentence {
  id: string;
  text: string;          // "駅で友だちを待っています。"
  tokens: Token[];
  glossEn?: string;
  level: number;         // 0–9
  grammar: string[];     // ["g:te-iru", "g:particle-de-place"]
  source: "tatoeba" | "curated" | "template";
  sceneId?: string;      // para jogos de cena
}

interface Text {
  id: string;
  title: string;
  sentenceIds: string[];
  level: number;
  chars: number;
  missions?: Mission[];
  validOrders?: number[][]; // para Ordem da História
}

interface ConfusionEdge {
  a: string; b: string;
  type: "visual" | "phonological" | "semantic" | "grammatical";
  weight: number;        // global (dados agregados) — o pessoal fica no ItemState
}

// ---------- Progresso ----------
// (ItemState e FacetState definidos na Seção 3.3)
interface ErrorRecord {
  itemId: string; confusedWith?: string; facet: Facet;
  type: "visual" | "phonological" | "semantic" | "grammatical" | "orthographic" | "unknown";
  gameId: string; contextId?: string; at: number; resolvedAt?: number;
}

interface SessionLog {
  id: string; start: number; end: number;
  games: { gameId: string; rounds: number; correct: number; charsRead: number }[];
}

// ---------- Plugin de jogo ----------
interface GameModule {
  id: string;
  capabilities: GameCapabilities;            // Seção 3.5
  generateRound(plan: RoundPlan, rng: RNG, difficulty: DifficultyVector): Round;
  render(root: HTMLElement, round: Round, io: GameIO): void;   // DOM puro
  score(round: Round, response: unknown): Evidence[];          // → LearnerModel.update
  dispose(): void;
}
```

**Exemplos JSON:**

```json
{
  "id": "w:待つ",
  "surface": "待つ",
  "reading": "まつ",
  "glossEn": ["to wait"],
  "defJa": "だれかが くるまで そこに いる",
  "pos": ["verb.godan.tsu"],
  "kanji": ["k:待"],
  "tags": ["action"],
  "freqRank": 412,
  "phase": 4
}
```

```json
{
  "id": "s:00731",
  "text": "駅で友だちを待っています。",
  "glossEn": "I'm waiting for my friend at the station.",
  "level": 6,
  "grammar": ["g:particle-de-place", "g:te-iru"],
  "tokens": [
    { "s": "駅",   "r": "えき",   "start": 0, "end": 1,  "wordId": "w:駅",   "pos": "noun",     "chunk": 0 },
    { "s": "で",   "r": "で",     "start": 1, "end": 2,  "pos": "particle", "chunk": 0 },
    { "s": "友だち", "r": "ともだち", "start": 2, "end": 5, "wordId": "w:友だち", "pos": "noun", "chunk": 1 },
    { "s": "を",   "r": "を",     "start": 5, "end": 6,  "pos": "particle", "chunk": 1 },
    { "s": "待って", "r": "まって", "start": 6, "end": 9, "wordId": "w:待つ", "pos": "verb", "infl": ["te"], "chunk": 2 },
    { "s": "います", "r": "います", "start": 9, "end": 12, "wordId": "w:いる", "pos": "aux", "infl": ["polite"], "chunk": 2 },
    { "s": "。",   "r": "",       "start": 12, "end": 13, "pos": "punct", "chunk": 2 }
  ],
  "source": "curated"
}
```

```json
{
  "itemId": "k:待",
  "firstSeen": 1790000000000,
  "exposures": 23,
  "facets": {
    "form→meaning": { "stability": 4.2, "difficulty": 6.5, "lastReview": 1791200000000,
                      "reps": 7, "lapses": 2, "correct": 9, "errors": 4, "rtEmaMs": 1850 },
    "form→sound":   { "stability": 2.1, "difficulty": 7.1, "lastReview": 1791100000000,
                      "reps": 5, "lapses": 1, "correct": 5, "errors": 3, "rtEmaMs": 2400 }
  },
  "confusions": { "k:持": 3, "k:特": 1 },
  "scaffold": { "romaji": false, "furigana": true, "gloss": true },
  "flags": {}
}
```

### 5.3 Geração procedural de variações de partida

**Eixos de variação** (cada rodada é uma combinação; o gerador recebe uma semente e um vetor de dificuldade):

| Eixo | Exemplos |
|---|---|
| Conteúdo | quais itens (do Scheduler), quais contextos |
| Direção | forma→significado, significado→forma, leitura→forma |
| Representação | kana / kanji com furigana / kanji puro / definição japonesa / emoji |
| Formato de resposta | digitar, montar, arrastar, swipe, tocar evidência |
| Distratores | grafo pessoal, grafo global, mesma categoria, mesma leitura |
| Pressão | sem tempo, tempo folgado, tempo adaptativo |
| Regras modificadoras | "sem furigana", "só japonês", "um erro = fim", "dobro por produção" |
| Tema/skin | café, estação, masmorra, cozinha (muda vocabulário de enquadramento, não a mecânica) |

```ts
interface DifficultyVector {
  itemLevel: number;       // nível médio dos itens
  newRatio: number;        // fração de itens novos
  distractorSimilarity: number; // 0..1
  timePressure: number;    // 0..1
  scaffolds: number;       // 0..1 (furigana/glosa)
  responseProduction: number; // 0..1 (proporção de produção vs reconhecimento)
}
// Ajuste adaptativo (alvo ~85% de acerto, a "zona" de aprendizagem eficiente):
function adapt(d: DifficultyVector, recentAcc: number): DifficultyVector {
  const delta = (recentAcc - 0.85) * 0.5;      // acima de 85% → mais difícil
  return { ...d,
    timePressure: clamp01(d.timePressure + delta),
    distractorSimilarity: clamp01(d.distractorSimilarity + delta),
    responseProduction: clamp01(d.responseProduction + delta * 0.5) };
}
```

**Gerador de frases por templates (ex.: Cena Relâmpago).** Os templates têm *slots tipados* com restrições semânticas, para nunca produzir frases agramaticais ou absurdas:

```ts
const TEMPLATES = [
  { id: "exist-pos",
    pattern: "{X}は {Y}の {POS}に {EXIST}。",
    slots: { X: { tags: ["object|animal"] }, Y: { tags: ["furniture"] },
             POS: { set: ["うえ", "した", "なか", "まえ", "うしろ", "となり"] } },
    derive: { EXIST: (s) => s.X.tags.includes("animate") ? "います" : "あります" } }, // いる/ある
  { id: "count",
    pattern: "{Y}の {POS}に {X}が {N}{CTR} {EXIST}。",
    derive: { CTR: (s) => s.X.counter ?? "つ" } },  // leitura gerada pela tabela de contadores
];

function makeStatement(scene: Scene, rng: RNG, truth: boolean) {
  const fact = rng.pick(scene.facts);                 // { X: "w:ねこ", Y: "w:いす", POS: "した" }
  const f = truth ? fact : mutateMinimal(fact, rng);  // troca UM atributo: POS, N, X, ou negação
  return renderTemplate(pickTemplateFor(f), f);
}
// mutateMinimal escolhe o atributo a trocar priorizando o que o jogador erra mais
// (ex.: se ele ignora negações, a mutação "negação" é sorteada com maior peso).
```

**Outros geradores:**

- **Encruzilhada Kanji:** para cada kanji `c` conhecido, listar compostos conhecidos `XC` (X antes) e `CX` (X depois); sortear 2+2 com frequência dentro da fase; validar que nenhum outro kanji conhecido satisfaz os 4 (ou aceitar todos).
- **Ordem da História:** "roteiros" (receita, rotina matinal, viagem) com passos ordenáveis e variações de verbo/objeto; conectivos inseridos ou removidos conforme a dificuldade.
- **Mapa de Instruções:** caminho aleatório no grafo da grade → descrição em templates (「まっすぐ {N}つ すすんで、{DIR}に まがって ください」).
- **Detetive de Contexto:** busca, no corpus, de frases que contêm o alvo com cobertura ≥ 95% para o jogador; ordenar por "informatividade" (estimada pela taxa de acerto histórica com aquela frase).
- **Wordle/Shiritori/Empilhador:** índices de prefixo/sufixo sobre o vocabulário *visto* pelo jogador.

**Reprodutibilidade:** toda rodada guarda `{ gameId, seed, difficulty, itemIds }` — permite repetir a "mesma partida" (desafio diário igual para todos) e depurar.

### 5.4 Evitando memorização de posição ou formato

1. **Posição:** embaralhar opções sempre; nunca a resposta na mesma posição duas vezes seguidas para o mesmo item; em grades, posição aleatória com distribuição uniforme verificada por item.
2. **Conjunto de opções:** os distratores mudam a cada aparição (sorteio do grafo de confusões) — o jogador não pode reconhecer o "pacote" de opções.
3. **Formato:** o Scheduler aplica `formatNovelty`: o mesmo item tende a aparecer em formatos diferentes em revisões consecutivas (digitar → ○✕ → classificação → contexto).
4. **Frase/contexto:** nunca a mesma frase para o mesmo item em revisões consecutivas; rotação entre ≥ 3 frases por palavra comum.
5. **Representação:** alternar kana/kanji, fonte (gótica/mincho), furigana, orientação vertical (縦書き) em jogos de leitura.
6. **Ordem:** listas nunca na mesma ordem; nada de "lição 3 sempre começa com 水".
7. **Respostas "impossíveis de rápidas":** se o tempo de resposta for menor que o mínimo fisiológico de leitura da tarefa (ex.: < 250 ms + 50 ms/caractere), a evidência recebe peso reduzido e o item é reapresentado em formato de produção.
8. **Opção "nenhuma/não sei":** às vezes nenhuma opção é correta (em Gêmeos: zero impostores; em MC: "none of these"), quebrando a estratégia de exclusão.
9. **Generalização obrigatória:** um item só é marcado como dominado se acertado em ≥ 2 formatos distintos e ≥ 2 contextos.

### 5.5 Migrando da dependência do inglês para compreensão direta em japonês

**Escada de representação do significado** (cada item sobe a escada individualmente, conforme o domínio):

| Degrau | Como o significado é apresentado | Exemplo para 山 |
|---|---|---|
| E0 | inglês + japonês | 山 = *mountain* |
| E1 | japonês + inglês em tamanho menor / só no feedback | 山 (*mountain*) |
| E2 | japonês; inglês sob toque (contabilizado como consulta) | 山 |
| E3 | emoji / cena / ação | 山 → ⛰️, tocar na montanha |
| E4 | definição japonesa simples | 「たかくて おおきい ところ。のぼる ことが できる。」 |
| E5 | só contexto | 「ふじさんは 日本で いちばん たかい 山です。」 |

**Táticas:**

- **Tarefas que não pedem tradução:** classificar (Esteira), agir (Mapa, Placas), verificar (Cena ○✕), localizar (Explorador). A resposta é uma ação, não uma palavra inglesa.
- **Inglês como feedback, não como prompt:** a partir da fase 3, o inglês aparece cada vez mais *depois* da resposta (confirmação), não antes.
- **Rótulos e UI em japonês progressivamente:** botões e instruções recorrentes viram vocabulário (つぎへ *next*, もういちど *again*, せいかい *correct*, まちがい *wrong*); a UI muda para japonês item a item, quando a palavra é dominada.
- **Definições monolíngues** (campo `defJa`) introduzidas a partir da fase 5 com vocabulário controlado (só palavras dominadas); Quem Sou Eu? é o treino dedicado.
- **Métrica explícita:** "% de telas sem inglês" por sessão, mostrada ao jogador como conquista ("Today: 72% Japanese-only") e com metas por fase (tabela 2.2).
- **Inglês sob demanda tem custo leve, não punição:** consultar a glosa registra uma evidência fraca negativa (o item volta antes), sem tirar pontos — para não ensinar a evitar consultas quando são necessárias.
- **Gairaigo como ponte, não como muleta:** o Katakana Café usa o inglês; nas fases altas, o pedido vem descrito em japonês.

### 5.6 Transformando erros em conteúdo futuro

1. **Classificar cada erro** (`ErrorAnalyzer`): visual (ぬ→め; 待→持), fonológico (かわ: 川 vs 皮; しゅ vs しょう), ortográfico (っ omitido, vogal longa), semântico (*wait* vs *hold*), gramatical (に vs で), de leitura on/kun (人 → ひと em 日本人).
2. **Grafo de confusão pessoal:** cada erro com "escolha errada" adiciona/fortalece uma aresta; o DistractorService usa essas arestas primeiro. Arestas decaem quando o par é discriminado corretamente 3 vezes em formatos diferentes.
3. **Repetição inteligente do erro:** o item errado volta (a) em 2–4 rodadas, (b) no fim da sessão, (c) no dia seguinte — sempre em formato *diferente* do erro, e de preferência *junto* do item com que foi confundido (treino contrastivo).
4. **Drills de pares mínimos automáticos:** pares com ≥ 2 confusões geram uma mini-rodada dedicada (Gêmeos Traiçoeiros, Forja de Diacríticos, Partícula Ninja com só に/で).
5. **Chefe Revanche semanal** (jogo 34) e **inimigos da Masmorra** com nome das confusões ativas — o erro vira personagem e alvo.
6. **Leeches** (≥ 6 lapsos): mudar o tratamento, não repetir mais do mesmo — (a) decompor o kanji em componentes (Alquimia), (b) mostrar mnemônica e frase-âncora, (c) apresentar 3 contextos novos, (d) suspender por 3 dias e reintroduzir como novo, (e) se o problema for um par, ensinar o par explicitamente ("待 *wait* has 彳 *road*: you wait on the road; 持 *hold* has 扌 *hand*").
7. **Consultas viram itens:** palavras consultadas no Explorador/Detetive entram no Scheduler com prioridade proporcional à frequência no corpus.
8. **Erros agregados (com consentimento):** confusões frequentes entre muitos jogadores enriquecem o grafo global e apontam onde o conteúdo/feedback precisa melhorar (ex.: uma frase de Detetive com taxa de acerto muito baixa é revisada ou removida).

### 5.7 Progressão e recompensas que não prejudicam a aprendizagem

**Regra de ouro:** recompensar **evidência de retenção e compreensão**, nunca volume bruto, tempo de tela ou acertos fáceis.

| Mecanismo | Como funciona | Por que é seguro |
|---|---|---|
| **Cartas de kanji/palavra com estágios de retenção** | Cada item vira uma carta que evolui: *bronze* (acertado após 1 dia), *prata* (após 7), *ouro* (após 30), *selo* 印 (após 90 dias). | A única forma de evoluir é acertar depois de intervalos longos — a recompensa *é* a repetição espaçada. |
| **Mapa de domínio** | Grade dos ~650 kanji-alvo (e dos 4.000 vocábulos) que se acende por domínio. | Visualiza progresso real, de longo prazo. |
| **Contador de leitura** | Caracteres lidos (com compreensão verificada) por dia/semana; CPM pessoal. | Métrica autêntica de leitores (como em comunidades de leitura extensiva). |
| **Desbloqueio por prontidão** | Novos jogos/modos abrem quando os critérios da fase são cumpridos. | Divulgação progressiva; novidade como recompensa pela maestria. |
| **Streak gentil** | Dia válido = ≥ 1 min ou ≥ 10 revisões; 2 "congelamentos" por semana; retorno após pausa com "modo boas-vindas" que limita o backlog a 30 itens/dia. | Evita culpa e abandono; não incentiva sessões vazias. |
| **Missões diárias alinhadas ao Scheduler** | "Resolva 15 revisões vencidas", "Leia 1 texto com ≥ 80%", "Vença 3 confusões antigas". | O objetivo do jogo e o objetivo pedagógico coincidem. |
| **Recordes pessoais e "fantasma"** | Comparar-se com o próprio desempenho de 7/30 dias atrás. | Evita rankings globais que favorecem quem chuta rápido ou estuda conteúdo fácil. |
| **Cosméticos** | Temas, skins de esteira, chapéus para o personagem da Masmorra. | Recompensa sem poder: nada que pule aprendizagem. |
| **Pontuação ponderada** | Pontos = Σ (peso da evidência × dificuldade do item × fator de intervalo). Produção > reconhecimento; itens difíceis > fáceis. | Desincentiva farmar itens fáceis e chutes em ○✕. |

**Evitar:** loot boxes e recompensas aleatórias pagas; XP por minuto de tela; punição por pausas (vidas que regeneram com tempo forçam abandono); recompensa por velocidade sem limiar de precisão; badges triviais em excesso (efeito de superjustificação — a motivação deve migrar para "consigo ler isto").

**Momentos de "prova de valor"** (motivação intrínseca): a cada fase, um "texto de formatura" que o aluno não conseguiria ler antes (ex.: fim da fase 2: um cardápio real inteiro; fim da fase 5: uma placa de estação + aviso; fim da fase 7: um conto curto de 400 caracteres; fim da fase 8: uma notícia simplificada).

---

## 6. Apêndices

### 6.1 Riscos globais do ecossistema e mitigação

| Risco | Mitigação |
|---|---|
| Jogos viram "cascas" de flashcards | Regra P12 (MC ≤ 30%); revisão periódica da distribuição de formatos por sessão. |
| Backlog de revisões explode e o aluno abandona | Limite de novos itens condicionado ao backlog; modo boas-vindas; Scheduler prioriza por valor (frequência × atraso). |
| Conteúdo gerado errado (frases agramaticais, leituras erradas) | Templates com slots tipados, re-tokenização na build, revisão humana amostral, botão "report" em cada rodada. |
| Ilusão de competência (acertar no jogo, não ler no mundo real) | Critérios de prontidão exigem textos reais/graduados; textos de formatura. |
| Variedade de jogos dispersa a atenção | Modo "sessão" que encadeia jogos automaticamente por déficit de faceta. |
| Japonês "de app" sem naturalidade | Frases curadas e do corpus a partir da fase 6; templates só para cenas e instruções. |

### 6.2 Métricas de validação

- **Aprendizagem:** retenção a 7/30/90 dias por faceta (testes surpresa em formato de produção); CPM com compreensão; cobertura medida em textos externos.
- **Engajamento:** D1/D7/D30, minutos voluntários por jogo, taxa de sessões terminadas.
- **Saúde do Scheduler:** backlog médio, % de revisões feitas no prazo, taxa de leeches.
- **A/B por jogo:** ganho de estabilidade por minuto de jogo (quanto cada minuto de cada jogo aumenta a retenção prevista) — a métrica que decide quais jogos merecem investimento.

### 6.3 Plano de prototipagem do MVP (sugestão de 6 semanas)

1. **Semana 1:** pipeline de conteúdo para kana + 300 palavras + 120 kanji + 2.000 frases; formato JSON definitivo.
2. **Semana 2:** LearnerModel, Scheduler, DistractorService, IndexedDB; Chuva de Kana como primeiro cliente.
3. **Semana 3:** Fatiador, Katakana Café, Esteira.
4. **Semana 4:** Tríades, Cena Relâmpago (com TemplateEngine).
5. **Semana 5:** Detetive de Contexto, Sobrevivência + Revanche, ErrorAnalyzer.
6. **Semana 6:** PWA/offline, modo sessão, cartas de retenção, telemetria local; teste com 5–10 aprendizes reais.

---

*Fim do documento.*
