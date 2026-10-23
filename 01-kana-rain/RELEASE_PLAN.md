# Plano para a versão final do Kana Rain

**Estudo: 21 de outubro de 2026. Base: jogo 1.10.1, commit `235d450`. Estado atualizado em 22 de outubro: três quick wins entregues na versão 1.10.2; demais propostas pendentes.**

Este é o plano de trabalho atual. Quando uma proposta for entregue, atualizar seu estado aqui e documentar o comportamento definitivo no [README](README.md), na [especificação](SPECIFICATION.md) e no [changelog](CHANGELOG.md). Os contratos de desenvolvimento e aprendizagem continuam em [DEVELOPMENT](DEVELOPMENT.md) e [LEARNING_DESIGN](LEARNING_DESIGN.md).

### Quick wins entregues

Os quick wins **1, 2 e 3** abaixo foram aprovados na prévia local e entregues na versão **1.10.2**: ações dos resultados visíveis no celular, foco do sound pad por teclado e áudio em Settings. O comportamento está descrito no README e no changelog. Música, novos efeitos e as demais propostas continuam pendentes.

Em 22 de outubro, o quick win **6** (cursor das gotas) foi implementado e verificado somente na prévia local, ainda sem publicação. Os quick wins **4 e 5** foram adiados por decisão do usuário. O inventário, os limites de cobertura e as prioridades de testes estão em [TESTING](TESTING.md).

A auditoria de armazenamento real reproduziu perda de respostas entre duas abas e sobrescrita ao fechar uma aba com estado antigo. Os dois testes de regressão permanecem falhando; corrigir a concorrência de gravação antes da próxima publicação. Os testes de quota e fechamento/reabertura do navegador passaram. Esta etapa acrescenta testes e diagnóstico, sem publicar ou alterar o salvamento do jogador.

## Recomendação

1. Corrigir pequenas fricções de resultados, teclado e configurações antes de acrescentar efeitos.
2. Adicionar uma única música instrumental opcional ao menu, com controle próprio e prioridade absoluta para as pronúncias.
3. Refinar as animações existentes: transições curtas, efeitos proporcionais às gotas e estados coerentes durante a pausa.
4. Fazer uma rodada final de regressão, dispositivos reais e preservação de saves. O objetivo é acabamento e confiança, mantendo o loop de aprendizagem atual.

## Base que já funciona

O jogo já possui pop e splash no acerto, ripple na expiração, reação do mascote, coração perdido, indicação de perigo, celebrações de sequência e desbloqueio. Há redução de efeitos manual e por preferência do sistema. A chuva usa transform, o RAF é suspenso durante pausa/aba oculta e as dimensões são observadas fora do loop. O teclado de sons tem posições estáveis; o HUD e as gotas já foram compactados no celular.

Esses recursos precisam ser preservados. A etapa final não pede reescrever o motor, trocar a arte ou acrescentar uma biblioteca de animação. Também não altera contagens, chuva adaptativa, freios de novos kanas, progressão, evidências de assistência, pronúncias nem os campos antigos dos saves.

Referências de implementação: [game.js](src/game.js), [style.css](src/style.css), [audio.js](src/audio.js), [sfx.js](src/sfx.js), [novelty.js](src/novelty.js), [build](scripts/build.cjs) e [service worker](sw.js).

## Evidência do estudo

Foi usada uma cópia local do build, com **141/141 hashes iguais ao manifesto da versão publicada 1.10.1**. A revisão visual cobriu 1440×900, 1366×768, 390×844, 360×640 e 568×320, além de uma verificação da preferência de movimento reduzido. Foram exercitados menu, configurações, contagem, chuva, erro, correção, expiração, pausa, resultados e Garden.

Os seis contextos eram novos, sem perfil do usuário, com service workers bloqueados e requisições externas negadas. Todos foram fechados, assim como o navegador e os servidores próprios. Não houve erro de página nem requisição externa. A posição das gotas foi controlada para reproduzir estados; isso não é uma medição natural de dificuldade ou desempenho. Não foram feitas audição crítica, avaliação pedagógica com estudantes, teste offline completo ou teste em iPhone real nesta revisão.

As capturas, medidas e reprodução estão em `.release/final-study-20261021/`, ignorada pelo Git. As conclusões úteis ficam neste documento; os relatórios gerados não entram no código ou no build.

### Achados reproduzidos

| Achado | Reprodução e impacto | Próxima mudança |
|---|---|---|
| **P2 — ações dos resultados fora da primeira tela no celular pequeno** | No cenário de um acerto após correção, um erro e uma expiração: em 360×640, conteúdo de aproximadamente 834 px em painel de 604 px; em 568×320, aproximadamente 817/284 px. Revisar, jogar novamente e voltar ao menu exigem rolagem. Em 1366×768 e 1440×900, as três ações ficam visíveis. | Reservar uma área de ações sempre visível; permitir rolagem apenas no conteúdo dos resultados. Usar composição específica para paisagem curta. |
| **P2 — perda de foco no sound pad** | Em 390×844, ativar uma família com Enter muda para os sons e deixa `document.activeElement` no BODY. A seleção por toque funciona. | Transferir o foco para o primeiro som habilitado quando a transição veio do teclado; Back devolve à família anterior. Preservar a experiência por toque e não focar o campo de texto no celular. |
| **P3 — áudio pouco encontrável em Settings** | O texto é substituído por uma nota genérica e não há controle de áudio dentro do modal; o botão externo fica indisponível enquanto o diálogo está aberto. | Incluir o mute sincronizado no painel e explicar os controles de música/voz com texto curto. |
| **P3 — mascote abandona o estado de pausa** | Após pausar, a pose sleep volta para idle depois de cerca de 1,05 s. A contagem permanece corretamente congelada. | Separar poses persistentes de reações temporárias e cancelar timers de sessões anteriores. |

Não foi encontrado bloqueio crítico nesses percursos. Isso não substitui a regressão automatizada completa. O primeiro carregamento de `drop-stained` ocorreu no primeiro erro, mas **não houve flicker observado**: antecipar a decodificação é uma oportunidade preventiva, não um defeito visual confirmado nesta revisão.

## Música do menu

### Direção e tamanho da primeira entrega

Criar uma faixa original renderizada em arquivo, com loop de aproximadamente **30–40 segundos**, 60–72 BPM como ponto de partida, piano suave e notas pinçadas discretas. Sem voz, batida insistente ou ataques agudos que disputem atenção com as pronúncias. Os valores são propostas para audição; não são parâmetros de aprendizagem validados.

Recomendo essa opção pela possibilidade de revisar timbre, transição do loop e identidade musical antes de integrar. Síntese procedural tem poucos bytes e pode ser determinística, mas transfere composição, repetição e gerenciamento de vozes para o runtime. Não é a primeira escolha para este acabamento.

| Trabalho | Estimativa inicial, sem compromisso de prazo |
|---|---|
| Composição/edição interna da faixa renderizada | 2–6 h; depende da qualidade do material inicial. Não inclui contratação externa. |
| Alternativa procedural | 4–10 h de desenho sonoro, mais verificação de CPU e vozes. |
| Integração da música renderizada | 8–16 h. |
| QA específico de áudio e ciclo de vida | 4–6 h, com acesso aos dispositivos necessários. |

Um arquivo de 30–40 s a 96 kbps teria aproximadamente 360–480 kB, antes de overhead; o tamanho final deve ser medido. Um buffer estéreo decodificado ocupa aproximadamente 11–15 MB a 44,1–48 kHz. Avaliar mono ou outra duração se a audição e a medição justificarem. Manter o master editável, autoria, licença, instrumentos/amostras utilizados, ferramentas e hash do export. A licença das pronúncias não se estende automaticamente à música.

### Controles e estados

**Music desligado por padrão**, com ativação explícita e preferência lembrada. O `gd.sound` existente continua sendo o mute geral: um save mudo não deve passar a emitir música. Adicionar apenas preferências novas, como habilitação e volume de música, sem modificar tentativas, linhas ou pressão de novidade.

O controle identificado como Music pode aparecer no menu e em Settings; não ocupa espaço no HUD da partida. O mute geral também precisa estar disponível dentro de Settings. Estado solicitado, carregamento, permissão do navegador e reprodução efetiva são coisas distintas.

| Tela/situação | Comportamento proposto |
|---|---|
| Menu, música habilitada e áudio liberado | Um único loop, com entrada suave de aproximadamente 500 ms. |
| Settings aberto a partir do menu | Pode continuar; o mute e o controle de música ficam dentro do painel. |
| Help ou Garden abertos a partir do menu | Silêncio musical. Evita adicionar controles a esses painéis e mantém as pronúncias livres de competição. Ao fechar, reavaliar o retorno ao menu. |
| Contagem para começar ou retomar | Encerrar a música em até aproximadamente 250 ms, sem atrasar a contagem ou o input. |
| Partida, pausa da partida, resultados | Silêncio musical. Abrir Settings a partir da pausa não liga a trilha. |
| Aba oculta, descarte ou mute geral | Parar/suspender imediatamente; não deixar reprodução atrasada aguardando um gesto futuro. |
| Retorno ao menu | Reavaliar tela, preferência e permissão; nunca criar um segundo loop. |
| Download, decode ou reprodução recusados | O jogo continua; o controle permite tentar novamente e não afirma estar tocando. |

Chrome aplica políticas de autoplay também ao Web Audio. A liberação deve começar diretamente no clique de ativação, antes de esperar downloads; falhas precisam ser tratadas. O WebKit também distingue gesto direto de callbacks posteriores. Isso exige uma ação clara para ligar música, não uma tentativa de contornar o navegador. [Chrome](https://developer.chrome.com/blog/autoplay/), [MDN: autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), [WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/).

### Integração técnica

- Criar um controlador pequeno de música, separado de `KanaAudio.play()`: o canal atual interrompe a pronúncia anterior a cada reprodução. Não inserir a faixa em `byKana` nem no conjunto das 104 gravações.
- Preferir buffer decodificado e ganho próprio para controlar loop e fades, sem polling no RAF. Um `AudioBufferSourceNode` novo é necessário a cada reprodução; o buffer pode ser reutilizado e os pontos de loop definidos explicitamente. [MDN: AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode).
- Usar estado explícito de tela/origem do painel; `!running()` também inclui resultados. Empregar tokens de cancelamento: um download que termina após Start não pode iniciar música.
- Expor notificações pequenas de início/fim/cancelamento das pronúncias para a prioridade da voz, preservando as interfaces e a evidência atuais. A música não constitui ajuda de leitura e não grava exposição.
- Tratar interrupção e retomada do contexto, incluindo `interrupted` em Safari iOS; aba oculta suspende o canal e a volta respeita o contexto atual. [MDN: estado do áudio](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state), [visibilidade](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event).
- Incluir a faixa na allowlist de produção, carregar após ativação e cachear como recurso opcional. Não colocá-la entre as dependências obrigatórias de instalação do `SHELL`: erro na música não pode impedir o jogo offline.
- Separar disponibilidade de pronúncia e música. Hoje `game.js` desabilita Sound quando o manifesto de voz falha; esse caminho deve ser revisto para não declarar todos os canais indisponíveis.

O controle precisa funcionar com teclado e ter nome/estado claros. O W3C explica os controles para áudio automático superior a três segundos e o risco de mascarar leitores de tela; isso não constitui uma declaração de conformidade do jogo. [W3C: Audio Control](https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html).

Aceite específico: save antigo mudo permanece mudo; alternância rápida não sobrepõe loops; iniciar durante download cancela reprodução; voz é inteligível; falha de música é independente; cache ausente/presente não muda a instalação do jogo; troca de aba e bloqueio de tela funcionam em iPhone real. Não usar streaming externo, playlists, música adaptativa ou música de partida nesta primeira entrega.

## Animações: refinar a linguagem atual

A direção permanece jardim em teal, marfim e dourado, água e movimentos breves. O kana precisa continuar estável e legível durante a leitura. Acerto, erro, expiração e desbloqueio devem ser distinguíveis sem acrescentar movimento constante.

| Superfície | Refinamento proposto | Limite de aceite |
|---|---|---|
| Menu e painéis | Entrada por opacity de aproximadamente 120–160 ms, sem modificar layout. Começar pela abertura; manter fechamento/foco imediato e previsível. | Sem bloquear clique, Enter ou Escape; não criar um RAF permanente no menu. |
| Acerto e expiração | Manter pop/splash/ripple; ajustar origem e escala ao tamanho real da gota. Hoje `.effect` usa 145×105 px em todos os tamanhos, enquanto as gotas variam. | Efeito centrado no evento e proporcional no celular, sem cobrir a leitura vizinha; verificar em captura e dispositivo. |
| Mascote | Poses sleep/idle como estado persistente; happy/worried como reações temporárias canceláveis. | Pausa longa mantém sleep e timers antigos não alteram a próxima sessão. |
| Recompensas e perigo | Conservar as celebrações e sinais atuais; ajustar duração/posição apenas onde a inspeção demonstrar disputa com texto. | Uma hierarquia clara; nenhum novo kana aparece por causa de um efeito ou recompensa. |

As durações são propostas para teste visual. Favorecer transform/opacity, medir o custo de outras propriedades e usar `will-change` com parcimônia, conforme [web.dev: animações de alto desempenho](https://web.dev/articles/animations-guide). Não animar posição da simulação e apresentação no mesmo transform sem preservar a posição da gota. Manter a política de redução manual e do sistema e não acrescentar flashes ou tremor da câmera.

## Quick wins priorizados

**P** significa poucas horas; **M**, aproximadamente meio dia a um dia e meio. São estimativas provisórias, incluem verificação focada e não são somáveis sem considerar trabalho compartilhado. A ordem abaixo é prioridade de implementação, distinta da gravidade dos achados.

| Ordem | Item e evidência | Esforço / risco | Critério de aceite |
|---|---|---|---|
| 1 | Ações dos resultados acessíveis em celular pequeno; reproduzido. | M / médio | Jogar novamente e voltar ao menu visíveis em 360×640 e 568×320; Review visível quando aplicável; apenas detalhes rolam. Preservar o desktop atual. |
| 2 | Destino de foco entre família/sons/Back; reproduzido. | P–M / médio | Tab, Enter e Space completam o percurso sem foco artificial no teste. Não abrir teclado nativo nem mudar slots. |
| 3 | Mute em Settings e texto coerente; reproduzido. | P / baixo | Controle utilizável dentro do modal, sincronizado com o botão geral, sem duplicar preferências. Preparar espaço para Music. |
| 4 | Estado efetivo de movimento reduzido; lacuna confirmada no código. O botão pode dizer Off enquanto o sistema já reduz animações. | P / baixo | Mostrar origem/estado efetivo e preservar a preferência manual; verificar mudanças da preferência do sistema. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). |
| 5 | Botão de exportação estável durante falha de storage; risco identificado na leitura de `storageNotice.innerHTML`, não reproduzido neste QA. | P / baixo | Falhas/publicações repetidas mantêm o mesmo botão e seu foco; export contém a evidência mais recente; aviso continua visível. |
| 6 | Remover cursor de clique das gotas, cujo clique não executa seleção; confirmado no código. | P / mínimo | Cursor coerente, com typing, pad e alvo prioritário inalterados. |
| 7 | Preparar/decode dos sprites de feedback após os recursos críticos; prevenção, sem flicker reproduzido. | P / baixo | Primeiro erro/acerto em contexto frio mostra a imagem completa; falha não bloqueia jogo e não compete com o jardim inicial. [MDN: decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode). |
| 8 | Poses e timers coerentes com pausa/descarte; pose incorreta reproduzida. | M / médio | Política definida para reações transitórias; pausa congela a simulação e preserva sleep; nenhum efeito de uma sessão reaparece em outra. |

O pad já foi dimensionado com alvos de pelo menos 36 px. Preservar esse limite do projeto e melhorar controles secundários quando houver espaço. WCAG 2.2 define mínimo de 24×24 CSS px com exceções; alvos maiores podem facilitar o uso. Não converter isso em uma exigência indiscriminada de 44 px nem reduzir o campo para caber novos controles. [W3C: Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Valor adicional, com escopo próprio

**Restaurar um backup pela interface** é útil antes de chamar a versão de final: há exportação e `Learner.import()`, mas não um fluxo de importação para o jogador. Não é um quick win de risco mínimo. Exige validar o arquivo, mostrar o que será restaurado, preservar uma cópia do estado atual, esclarecer substituição versus mesclagem e testar persistência/erros com saves sintéticos. Tratar como entrega separada de esforço médio; não inventar mesclagem de históricos nem alterar o save atual durante uma prévia de importação.

Reduzir módulos duplicados entre bundle e cache, consolidar breakpoints e otimizar imagens sociais são trabalhos técnicos posteriores, dependentes de medição. A galeria já carrega arte-fonte sob demanda. Nenhum desses itens deve anteceder fricções observáveis só por reduzir contagem de arquivos.

## Sequência de entrega

| Etapa | Entrega | Saída esperada |
|---|---|---|
| A — navegação e confiança | Quick wins 1–6, verificações de pausa e resultados | Prévia local com percurso teclado/celular completo e comparações visuais. |
| B — identidade sonora | Faixa revisada, controlador, preferências e cache opcional | Prévia com estados de áudio e falhas cobertos, sem mudar a leitura. |
| C — acabamento de movimento | Transições e escala/origem dos efeitos; concluir timers | Comparação desktop/celular com movimento normal e reduzido. |
| D — candidata final | Regressão completa, offline, saves e dispositivos reais | Release identificada, backup/rollback e lista explícita de limitações verificadas. |

Ordem de grandeza para A–D: **5–9 dias úteis de trabalho**, após haver uma faixa utilizável e acesso aos dispositivos de QA. É uma faixa de planejamento, não uma data de lançamento. Autoria externa, iterações musicais e um fluxo seguro de importação podem ampliar o escopo.

## Critérios da candidata final

- Executar a sequência completa de testes/CI descrita no README e em DEVELOPMENT; acrescentar testes significativos para estados de música, foco e falhas efetivamente alterados.
- Fazer migração/reload com fixtures de saves antigos e atuais: mesmas tentativas, exposições, linhas conquistadas, acesso a Katakana e freios; preferências novas são aditivas.
- Confirmar ausência de novos kanas em correções/revisão antes da apresentação e conservar chuva adaptativa, duas etapas do pad, contagens e ambiguidade do `n`.
- Verificar a primeira tela dos resultados, foco e áreas de toque nos cinco tamanhos deste estudo, rotação, teclado virtual e safe areas; incluir Safari em iPhone e Chrome em Android reais.
- Testar falha e sucesso de música/voz de forma independente, mute antigo, reprodução recusada, troca de aba, interrupção de áudio e alternância rápida entre telas.
- Testar instalação/atualização offline em contexto descartável: com e sem música cacheada, sem rede e sem depender de endpoints externos.
- Comparar custo de renderização no mesmo aparelho/build/dados: sem novas leituras de layout por frame, vazamento de fontes/timers ou RAF de decoração persistente durante pausa/menu. Não prometer FPS de aparelho não medido.
- Manter controles de exportação e aviso de falha de armazenamento funcionais; não usar perfil real de produção como dado de teste.
- Publicar uma candidata identificada apenas após a prévia ser avaliada; manter a versão anterior recuperável e atualizar documentação/cache junto dos arquivos efetivamente alterados.

Ficam fora desta etapa: motor novo, contas/sincronização, ranking, pontos, mudanças de dificuldade, playlists, trilha adaptativa, novos alfabetos, expansão do catálogo e alegações de eficácia pedagógica não medidas. A versão final deve ser mais agradável e previsível sem aumentar a carga de leitura.
