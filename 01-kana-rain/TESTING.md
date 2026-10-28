# Testes do Kana Rain

## Prévia de otimização — 1.12.1-local.1

`save-batching.test.cjs` acrescenta cinco cenários: acerto e referências visuais/sonoras com journal imediato e uma consolidação enfileirada; fechamento antes de obter o lock; fatos novos e aliases mutáveis durante a transação; rejeição do lock/quota com revisão de erro correta e nova tentativa; cópias privadas com semântica JSON equivalente à 1.12.0 fixada. As regressões diferenciais anteriores continuam ativas.

`reduced-effects.test.cjs` cobre efeitos normais no desktop/toque, modo reduzido e preferência do sistema: acertos/expirações permanecem iguais, enquanto splash/ripple desativados nem geram nós. `pnpm test:smoother-saving` confirma a única escrita principal em IndexedDB real por acerto+feedback, filtros e marcadores no PC/celular, preferência de movimento atualizada durante a partida e duas abas com 4.000 respostas/25.000 referências, fechando uma com o lock bloqueado. Todos os fatos sintéticos antigos são comparados após recarga. Nenhum perfil pessoal ou produção é acessado.

Verificação local em 2026-10-28: **292/292 testes de código**, build e as 15 suítes de navegador passaram: smoother-saving, Journey, smoke geral, katakana, quick wins, sound pad, apresentação e ritmo de novidades, melhorias de aprendizado, efeitos, música, atualização online/offline, armazenamento, convivência entre versões e importação. O resultado agregado está em `.release/smoother-saving-20261028/checks.json`. A cópia de progresso da demonstração permanece isolada em localhost; não houve publicação nem alteração do progresso de produção.

Diagnóstico antes/depois nesta máquina, Chromium headless 151.0.7922.34, quatro amostras medidas após aquecimento, um perfil por vez, sem outros testes pesados em paralelo:

| Histórico sintético grande | Maior tempo até consolidação terminar, antes → depois | Maior intervalo entre callbacks de animação, antes → depois |
|---|---:|---:|
| CPU normal, efeitos normais, sem áudio | 312 → 104 ms | 117 → 67 ms |
| CPU 4× limitada, efeitos reduzidos, sem áudio | 1.160 → 459 ms | 467 → 400 ms |
| CPU 4× limitada, efeitos reduzidos, com áudio | 1.256 → 500 ms | 467 → 400 ms |

O custo JSON por resposta no perfil lento sem áudio caiu de cerca de 597–637 ms para 112–137 ms; são somas de execução durante as consolidações, não latência de um único callback. Permanecem pausas perceptíveis no cenário extremo: a leitura/desserialização nativa de snapshots grandes e a consolidação continuam na thread da página. Esses intervalos não medem pixels apresentados nem garantem FPS em hardware real. Os relatórios privados desta rodada estão em `.release/smoother-saving-20261028/`; não são conteúdo publicado nem gates de tempo do CI.

## Journey — prévia local de 2026-10-27

`tests/journey.test.cjs` cobre o início sem katakana, transição dentro da partida no último acerto qualificante de hiragana, passagem das cinco vogais de katakana para a mistura, distribuição entre alfabetos, continuidade das apresentações, freios por erro/expiração, precisão por alfabeto, duas formas homófonas visíveis, teclado/sound pad, revisão de ambos, recarga, preservação de eventos e modos antigos, exploração sem ganhar grupos e acesso misto que só é removido pelo reset explícito.

`pnpm build` seguido de `pnpm test:journey` executa o pacote real em Chromium descartável: transição por resposta real, PC 1366×768, celulares 390×844 e 360×640 e paisagem 844×390, controles compartilhados e geometria sem sobreposição, duas abas que gravam e fecham, e recarga/jogo/gravação offline com o service worker real. A suíte usa apenas dados sintéticos; capturas e relatório ficam em `tests/artifacts/journey/`. As suítes anteriores continuam sendo regressões dos modos separados e da persistência.

O servidor opcional `scripts/preview-journey.cjs` usa um export privado somente em localhost, através do importador aditivo validado. Ele é excluído da distribuição. Dados pessoais nunca entram em fixtures ou commits. A demonstração tem uma origem diferente da produção e confirma IndexedDB antes de recarregar.

Verificação local em 2026-10-27: 283 testes de código passaram, incluindo os 11 novos casos de Journey. Build e todas as suítes de navegador passaram: Journey (7 cenários), smoke geral, melhorias de aprendizado, apresentação/ritmo de novidades, sound pad, Katakana, quick wins, efeitos, música, atualização, armazenamento, convivência entre versões e importação. Os relatórios privados desta rodada ficam em `.release/journey/` no repositório; isso descreve cobertura funcional, sem percentual de cobertura de linhas.

## Consolidação 1.11.2 — comparação com a 1.11.1

A otimização conserva o schema, todos os eventos e o journal síncrono. O cache de normalização compara o conteúdo JSON completo de cada snapshot do IndexedDB; contadores, vetores e timestamps iguais não bastam. O snapshot durável é privado e a memória pública mantém uma cópia independente. A reconciliação ao concluir a transação continua sendo executada.

`consolidation-regressions.test.cjs` compara exports completos com a fixture publicada 1.11.1 em 12 cenários: appends ordenados/retroativos, mesmas revisões com fatos ou baselines diferentes, aliases mutáveis antes/durante a gravação, semântica JSON, referências de ajuda, duas abas, journals reconhecidos com fatos ausentes, importação/reset, v1/v2 com timestamp legado ausente e recuperação por checkpoint. A suíte nativa `test:mixed-version-storage` acrescenta `protected-runtime-concurrent-close`: uma aba da 1.11.1 e uma otimizada gravam na mesma chave protegida; a antiga fecha enquanto o Web Lock está bloqueado, deixando resposta e referência no journal, e a atual preserva tudo em ambos os backends e após reload. Os quatro casos anteriores com a 1.10.2 continuam presentes.

Baseline e candidato foram medidos sequencialmente em Chromium headless 151.0.7922.34, Windows x64/Node 24.20.0, sem outros testes pesados em paralelo. Mesmos históricos, sete amostras medidas e um aquecimento por aba. Todos os seis cenários de cada versão preservaram hashes exatos dos eventos, configurações e fatos pendentes ao fechar/recarregar.

| Respostas / referências | p95 de commit, uma aba: antes → depois | p95 de commit, duas abas: antes → depois |
|---|---:|---:|
| 100 / 1.000 | 11,3 → 9,2 ms | 52,7 → 45,2 ms |
| 1.000 / 10.000 | 138,2 → 92,8 ms | 615,6 → 450,1 ms |
| 5.000 / 50.000 | 406,7 → 315,3 ms | 1.488,6 → 1.314,5 ms |

No maior histórico, a mediana caiu de 352,3 para 266,5 ms em uma aba (24,4%) e de 1.153,4 para 1.062,0 ms em duas (7,9%). As tarefas longas medidas em duas abas caíram de 42 para 36. O p95 ainda supera um segundo nesse cenário: há espaço para otimizações posteriores. O perfil maior excedeu a quota nativa do localStorage nas duas versões, com retenção pelo IndexedDB. Esses percentis são descritivos de poucas amostras, não medem FPS ou apresentação de pixels e não garantem os mesmos ganhos em um telefone real.

Fixture baseline SHA-256 normalizado: `cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72`. Fonte candidata medida: `11c250e1e483920d2e2dff3ed64bdcbf6fa3fd3fe65b7fbf43de147f21f7688d`. Reproduzir com `pnpm benchmark:save --baseline` e depois `pnpm benchmark:save`. Os relatórios ficam separados em `tests/artifacts/save-performance/baseline/` e `candidate/`; o comparativo local fica em `comparison.json`. As medições não são um limite de tempo aplicado no CI.

## Otimização 1.11.1 — 26 de outubro de 2026

Medição nesta máquina Windows x64, Node 24.20.0 e Chromium headless 151.0.7922.34, sem limitação artificial de CPU e sem outras suítes de navegador em paralelo. Os percentis abaixo descrevem somente sete amostras por aba (mais um aquecimento); com essa amostragem, p95 coincide com o maior valor de uma aba. Não são garantia de desempenho no aparelho do jogador.

| Histórico sintético inicial | JSON | p95 de commit completo, uma aba | p95 de commit completo, duas abas |
|---|---:|---:|---:|
| 100 respostas / 1.000 referências | 0,23 MiB | 10,7 ms | 47,8 ms |
| 1.000 respostas / 10.000 referências | 2,30 MiB | 111,2 ms | 563,0 ms |
| 5.000 respostas / 50.000 referências | 11,58 MiB | 359,8 ms | 1.498,2 ms |

Os seis cenários preservaram todos os eventos e configurações, inclusive ao fechar com gravação pendente e recarregar. O p95 do registro+journal síncrono foi de até 0,8 ms; a consolidação posterior produziu tarefas longas nos históricos médio/grande. A primeira oportunidade de RAF pode acontecer antes dessas tarefas, portanto não serve como prova de fluidez. O perfil maior excedeu naturalmente a quota do localStorage: o IndexedDB manteve os snapshots e os journals pequenos protegeram fatos pendentes quando disponíveis. O backend efetivo de cada amostra consta do relatório. A fonte do learner manteve o SHA-256 `cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72`; otimizar essa consolidação é uma etapa posterior, com o protocolo de proteção preservado.

`pnpm test:effects` exercita o build publicado em perfis novos de desktop e celular: preparação depois da cena crítica, menu/entrada disponíveis enquanto decode está pendente, uma imagem secundária por tarefa, ocultação/descarte, falhas de rede/decode e fallback sem as APIs opcionais. As imagens e as regras da partida permanecem iguais. `cache-install.test.cjs` verifica a escolha de shell de produção/fonte, URLs sem duplicação, páginas/estilos/104 áudios e falhas sem ativação ou remoção do cache anterior. `test:update` confirma isso no CacheStorage nativo, com jogo online/offline e saves históricos.

`pnpm benchmark:save` é um diagnóstico optativo, sem limite de tempo que aprove/reprove desempenho. Usa apenas páginas locais com o learner, IndexedDB/localStorage/Web Locks reais e seis perfis descartáveis: 100/1.000, 1.000/10.000 e 5.000/50.000 respostas/referências, em uma ou duas abas. Cada aba faz um aquecimento e sete amostras medidas. O relatório em `tests/artifacts/save-performance/` inclui inicialização, custo síncrono de registro/journal, commit completo, JSON, escritas, tarefas longas e a próxima oportunidade de requestAnimationFrame. Essa oportunidade não mede apresentação de pixels, e páginas sem o renderizador não medem FPS da partida. Os hashes de todos os eventos sintéticos iniciais, respostas novas, configurações, encerramento pendente e releitura são verificados; quota e backend efetivo são relatados. Não usa exports pessoais e não modifica o protocolo do learner.

Atualização de 23 de outubro de 2026: proteção contra retrocesso de saves validada na prévia 1.10.4-local.1 e promovida para 1.10.4, sem restauração de progresso pessoal. As auditorias históricas abaixo partiram da 1.10.2 e acompanharam a promoção da 1.10.3. Escopo: somente este jogo; não inclui os testes de `japanese-core`, arquivos históricos ou outros repositórios.

O pacote 1.10.4 usa o cache `kana-rain-v43-release-1.10.4`. A prévia validada usava `kana-rain-v43-local-save-guard` e a versão anterior usava `kana-rain-v42-release-1.10.3`. As evidências históricas conservam o identificador usado naquela validação. A suíte nova de versões misturadas cobre a escrita de um runtime antigo ainda em memória; a suíte anterior de duas abas, sozinha, não cobria esse caso.

## Como interpretar a cobertura

O projeto tem **232 casos executáveis em 20 arquivos de testes Node** e **dez comandos de testes de navegador no CI**. Alguns casos percorrem todos os kanas ou várias combinações, por isso contar casos não mede a proporção do jogo testada. Os comandos também compartilham cenários; não são dez áreas independentes de cobertura. As regressões de sobrescrita entre abas têm verificações específicas, incluindo encerramento durante escrita e quota nativa.

## Proteção contra snapshots antigos e versões misturadas

`pnpm test:mixed-version-storage` usa o learner original da 1.10.2, fixado pelo commit `6bdf542` e por SHA-256, junto do código atual. As páginas mínimas carregam apenas o learner e as regras de novidade, em contextos Chromium descartáveis com localhost, dados sintéticos, service workers bloqueados e nenhuma requisição externa. Os quatro cenários verificam:

- uma aba antiga responde e fecha depois de a atual já ter salvo novas respostas;
- os dois armazenamentos antigos são sobrescritos enquanto todas as abas atuais estão fechadas, preservando a chave protegida;
- cópias protegidas inválidas são recuperadas por um checkpoint real, escrito após o commit principal;
- um reset explícito permanece vazio diante da escrita atrasada de uma versão antiga.

`snapshot-recovery.test.cjs` acrescenta 17 casos em memória para snapshots divergentes, revisão enganosa, v1 e v2 mínimos, conquistas, operação já reconhecida com fatos ausentes, metadados inválidos, referências de ajuda, contadores históricos e fronteiras de reset/importação. Entre eles está o caso que motivou a correção: um snapshot menor com vetor de revisão não pode descartar um histórico legado maior, independentemente do timestamp. Contadores criados depois de parte do histórico não podem contar essa parte retroativamente.

A chave `jp-learner-v1` continua sendo lida, mas as gravações atuais usam `jp-learner-v1:protected:v1` nos dois destinos. O checkpoint `jp-learner-v1:checkpoint:v1` é limitado a uma cópia no IndexedDB e usa uma transação opcional separada. Testes de atualização leem a chave correspondente ao runtime histórico ou atual, sem forçar um flush para esconder falhas de autosave. Relatórios ficam em `tests/artifacts/mixed-version-storage/` e `tests/artifacts/save-guard/`.

Essas proteções não constituem backup remoto, nem cobrem remoção de todos os dados do site, perda do aparelho ou falha física do disco. Os testes não utilizam o progresso pessoal para validar a correção.

Ainda não existe um relatório confiável de cobertura de linhas, funções e decisões, nem um limite mínimo aplicado no CI. Não é correto atribuir uma porcentagem geral de cobertura. Vários testes Node executam scripts em `vm` com DOM, relógio, áudio e armazenamento simulados; instrumentar apenas os arquivos normalmente importados deixaria parte importante do código de fora da medição.

As avaliações abaixo descrevem **cobertura funcional observada**, não certificação de ausência de defeitos. Elas resultam da leitura das asserções e dos fluxos de teste.

## O que já existe

| Tipo / área | O que é verificado | Alcance e limite atual |
|---|---|---|
| Catálogo e conteúdo | Leituras canônicas, aliases de romaji, 104 pares reversíveis hiragana/katakana, arquivos de áudio e caminho de duas etapas do sound pad para as 208 formas. | Exaustivo para os itens do catálogo nesses contratos; não avalia qualidade da pronúncia nem aprendizagem real. |
| Regras de partida e contagens | Acertos, múltiplos erros, correções, expirações, corações, fim manual/tempo, reinício e preservação de recordes antigos. | Boa cobertura dos casos de borda conhecidos, combinando runtime simulado e navegador; não percorre todas as sequências possíveis. |
| Progressão e freios | Espaçamento de estreias, pausas após falhas, janelas dos três níveis, erros/expirações, histerese, persistência e mudança de dificuldade. | Forte nas regressões já encontradas. Os cenários usam histórias sintéticas e várias sequências determinísticas. |
| Katakana | Bloqueio inicial, conclusão dos 104 hiraganas, acesso legado, progressão na mesma partida, pressão separada por alfabeto e ausência de revelações prematuras em correções/resultados/revisão. | Forte nas falhas históricas, incluindo fixture sintética dos 29 acertos presos em ア. Não há uma jornada integral dos dois alfabetos pelo navegador. |
| Evidência e persistência | Tentativas/exposições, assistência, IDs duplicados, migração v1/v2, importação/exportação, reload, snapshots, quota nativa, fallback, fechamento/reabertura durante escrita e duas abas. | Dez cenários nativos e dez novos casos Node de mesclagem, contagens, freios, referências vivas, gerações de reset/importação e migração v1 exclusiva do IndexedDB. Não cobre queda de energia, encerramento forçado do processo ou todos os mecanismos de concorrência. |
| Entrada e pausa | Romaji, aliases, ambiguidade `n`/`nn`/`ne`, Enter, composição IME simulada, sound pad, bounce de toque, deslize cancelado, foco, countdown e pausa. | Boa cobertura desktop/toque em Chromium. Teclado virtual do sistema e tecnologias assistivas reais não são substituídos pela emulação. |
| Interface responsiva | Menus, HUD/corações, área das gotas, alvos de toque, sobreposição, orientação, diálogos e ações dos resultados. | Matriz do HUD com 14 tamanhos, menu com 11 e pad com oito tamanhos de celular. Capturas e asserções geométricas; não há comparação automática de pixels nem comprovação em aparelhos físicos. |
| Áudio | Correspondência com 104 gravações, cache, mute sincronizado, preferência após reload, indisponibilidade do manifesto e cancelamento de tons. | Parcial: não escuta os arquivos e não valida toda a matriz de autoplay, interrupções do sistema, Bluetooth ou saída real do dispositivo. |
| Offline e atualização | Shell, navegação, 104 gravações em cache, áudio acessível offline, respostas HTML redirecionadas, atualização real 1.10.1→candidato e falha/repetição da instalação. | Atualização com aba aberta em Chromium desktop/celular emulado. Confere hashes dos arquivos e preservação de progresso nos dois armazenamentos; não cobre encerramento do navegador, múltiplas abas ou todas as versões antigas. |
| Analytics e privacidade | Consentimento, hosts permitidos, DNT/GPC, retirada do consentimento, allowlist de eventos, URLs saneadas e ausência de dados do aluno nos payloads. | Ampla cobertura do contrato local com ambiente simulado; não valida ingestão real no Google nem representa auditoria geral de segurança. |
| Desempenho e empacotamento | RAF parado durante pausa, leituras de geometria limitadas, atualizações de DOM, serialização, ordem do bundle, estilos inline, orçamento de sprite e lista de arquivos de produção. | Bons guardrails de implementação. Benchmark de navegador é opcional e não tem um limite estável de FPS/memória em aparelho fraco aplicado no CI. |

## Comandos e automação

`pnpm test` executa a suíte Node, inclusive os testes de analytics, desempenho, concorrência e importação. `test:analytics` e `test:performance` são subconjuntos; não devem ser somados como novos testes.

Os comandos de navegador são:

| Comando | Foco |
|---|---|
| `pnpm test:browser` | Fluxo geral, prefixos de digitação (`input.browser.cjs` é chamado aqui), contagens, pausa, resultados, responsividade e offline. |
| `pnpm test:improvements` | Correções, armazenamento indisponível, exportação, detalhes de aprendizagem e Settings. |
| `pnpm test:novelty-presentation` | Admissão/recuperação de novos kanas, HUD e tamanho/caminho das gotas. |
| `pnpm test:novelty-pace` | Três dificuldades, persistência, controles bloqueados durante partida e menu responsivo. |
| `pnpm test:sound-pad` | Geometria, duas etapas, toque, bounce, cancelamento, teclado e evidência preservada. |
| `pnpm test:katakana-bridge` | Desbloqueio, progressão contínua, saves legados, entrada, homófonos e proteção contra revelação prematura. |
| `pnpm test:music` | Música do menu: silêncio antes do gesto, só na tela de título, botões de som, aba oculta, abaixamento sob efeitos e pronúncias, celular, níveis medidos e junções do loop. |
| `pnpm test:quick-wins` | Ações dos resultados, foco do pad e áudio sincronizado sobre o **build de produção**, conferindo que `dist/` corresponde às fontes. |
| `pnpm test:update` | Atualização de um build histórico fixado para o candidato no mesmo endereço, preservação dos dados, jogo online/offline e recuperação após instalação interrompida. |
| `pnpm test:storage` | Dez cenários: quota nativa, fallback/exportação, fechamento/reabertura, abas alternadas, 24 respostas simultâneas, fechamento de aba pendente e concorrência com IndexedDB cheio. |
| `pnpm test:mixed-version-storage` | Runtime antigo e atual na mesma origem, gravação/fechamento da aba antiga, proteção da cópia principal, checkpoint e limite de reset. |
| `pnpm test:import` | Escolha real de arquivo, backup, prévia/cancelamento, rejeição de arquivos inválidos, mesclagem sem duplicação, estimativas de familiaridade, quota, reload e controles responsivos. |

O CI em `.github/workflows/kana-rain.yml` usa Linux, Node 22 e Chromium. Executa testes Node, sete suítes de navegador sobre as fontes, build e cinco suítes sobre `dist/`, incluindo importação. O navegador de celular é emulado. O benchmark opcional `node tests/runtime-browser.benchmark.cjs` não está no CI e sua comparação pública depende da disponibilidade e da versão publicada.

Todos os testes devem usar dados sintéticos e perfis descartáveis. Os cenários offline precisam permitir service workers no seu contexto isolado. Não usar o progresso pessoal como fixture. Artefatos de testes ficam ignorados pelo Git e fora do pacote publicado.

## Testes ausentes ou que precisam ser ampliados

| Prioridade | Proposta | Defeito que ajudaria a detectar |
|---|---|---|
| Alta | Ampliar os testes de atualização existentes para mais versões de origem, múltiplas abas e encerramento/reabertura do navegador durante instalação. | Regressões fora do caminho já testado 1.10.1→candidato, com aba aberta e instalação concluída ou falhando por download. |
| Alta | Ampliar concorrência para encerramento forçado, muitas abas, limpeza de journals órfãos e convivência com uma aba que ainda executa o runtime antigo. | A união dos eventos/contagens entre duas abas atuais está coberta, inclusive no fechamento pendente e fallback de quota. Esses testes não equivalem a uma atualização com duas versões diferentes escrevendo juntas. |
| Alta | Smoke em Firefox/WebKit e roteiro em Android/Chrome e iPhone/Safari físicos, incluindo rotação e teclado nativo. | Diferenças de layout, toque, foco, armazenamento, áudio e ciclo de vida que Chromium emulado não reproduz. |
| Alta | Expandir os fluxos sobre `dist/` para desbloqueios completos, revisão dirigida e recuperação dos freios. A suíte de atualização já joga hiragana/katakana e verifica offline sobre o build. | Defeitos de empacotamento que aparecem em regras mais longas, além do fluxo principal já coberto. |
| Média | Regressão visual com referências aprovadas para menu, HUD, correção e resultados; controlar fontes, relógio e aleatoriedade. | Desalinhamento ou mudança de escala que ainda satisfaz os limites geométricos atuais. As screenshots existentes são evidências, não comparação automática. |
| Média | Acessibilidade automatizada e avaliação manual com leitor de tela, teclado completo, zoom e movimento reduzido do sistema. | Foco perdido/preso, nomes inacessíveis e estados mal anunciados. Os testes atuais de foco/ARIA cobrem apenas parte disso. Não implica implementar a alteração de movimento reduzido adiada. |
| Média | Jornadas longas e testes baseados em sequências geradas, com sementes reproduzíveis e invariantes de progressão, contagens e preservação de dados. | Travamentos que aparecem após muitas partidas ou combinações de falha, pausa, revisão e troca de alfabeto. Já há loops e aleatoriedade controlada em testes específicos; falta uma campanha abrangente. |
| Média | Desempenho com histórico grande, aparelho fraco e rede limitada; medir frame time, memória, inicialização, exportação e reload com orçamento definido. | Jogo que passa nos contadores internos, mas engasga ou demora depois de meses de uso. |
| Média | Áudio real: decodificação das 104 gravações, falhas/lentidão por arquivo, autoplay bloqueado, alternância de aba e interrupções no celular; escuta humana por amostragem. | Som ausente, sobreposto, atrasado ou incorreto apesar do manifesto válido. |
| Complementar | Sessões observadas com iniciantes, incluindo recuperação após erros e transição para katakana. | Carga cognitiva, instruções confusas e ritmo inadequado que testes técnicos não conseguem medir. |

Uma medição instrumentada de linhas/funções/decisões seria útil para orientar essas adições. Ela deve reconhecer os scripts executados em `vm` e o runtime no navegador; definir um percentual antes disso daria uma falsa sensação de segurança. Testes de mutação nas regras de progressão também ajudariam a avaliar se as asserções detectam alterações erradas, em vez de somente executar o código.

## Escopo da auditoria inicial

Na auditoria inicial, a única mudança de comportamento foi `.drop { cursor:default; }`. A correção de concorrência descrita abaixo é uma entrega local posterior. Os dois outros quick wins discutidos — estado efetivo de movimento reduzido e estabilidade do botão de exportação em falhas repetidas — permanecem adiados.

## Verificação executada nesta auditoria

Ambiente local: Windows, Node 24.20.0, pnpm 11.25.0 e Chromium headless do Playwright instalado. Isso não equivale a uma nova execução do CI em Linux/Node 22.

- `pnpm test`: **205 passaram**, zero falhas ou casos ignorados.
- As **sete suítes completas de navegador passaram**, incluindo offline na suíte geral e verificação do build na suíte de quick wins.
- `pnpm build` e `node scripts/build.cjs --check`: passaram; pacote com 141 arquivos e 104 gravações.
- Verificação pontual do cursor no build a 1366×768 e 390×844: gota, glifo e dica com cursor normal; botões com cursor de clique; clique na gota não muda alvo, contagens ou exportação; resposta aceita uma vez pela digitação no desktop e pelo pad no celular. Zero erros de página ou requisições externas nesses dois contextos. Capturas revisadas visualmente.
- Prévia das fontes disponível em `http://127.0.0.1:4193/`; confirmado que serve o CSS alterado. Não foi acessado o perfil pessoal nem o progresso do jogador. Não houve publicação.

Logs e verificação pontual: `tests/artifacts/test-audit-2026-10-22/`. O relatório de `test:quick-wins` fica em `../.release/quick-wins-20261021/verification.json`, conforme o caminho definido pela suíte. Ambos são artefatos locais ignorados pelo Git, não conteúdo de produção.

## Suíte de atualização entre versões

Executar `pnpm build` e `pnpm test:update`. A suíte lê os bytes reais do build candidato e rejeita arquivos desatualizados. Sua origem é a versão **1.10.1**, commit `4e02aee67272e21111875087e6a7a033fed5e4b7`, com cache `kana-rain-v38-release-1.10.1`. O destino é o candidato local baseado em **1.10.2**, agora com cache `kana-rain-v41-local-storage-concurrency`. Essa origem é fixada, não uma consulta à produção nem uma cobertura automática de todas as versões anteriores.

São três cenários, com dez pontos de verificação reportados:

1. **Desktop:** instalar e jogar a versão antiga; atualizar no mesmo endereço; jogar katakana online e hiragana offline; recarregar, navegar para a página About, decodificar um MP3 offline e reconectar.
2. **Celular emulado:** repetir o fluxo usando o sound pad a 390×844. Não equivale a um iPhone/Android físico.
3. **Instalação interrompida:** responder HTTP 503 para uma gravação durante a instalação do candidato; exigir estado `redundant` do worker que falhou, manter a versão antiga jogável offline, salvar uma resposta nesse intervalo e completar a atualização numa nova tentativa.

O save é criado com a API histórica e contém 221 eventos sintéticos, incluindo respostas independentes, uma resposta assistida no formato antigo, correção, expiração, exposição, acesso a katakana, recordes legados e estados dos freios. A comparação exige tentativas antigas idênticas e na mesma ordem, exposições preservadas, ausência de duplicações, agregados por kana e campos protegidos intactos durante a atualização. Novas respostas devem acrescentar exatamente um evento, preservar os dados antigos e sobreviver a reload.

As verificações **não chamam `Learner.flush()` para ajudar o jogo a salvar**: aguardam o estado de salvamento do aplicativo e leem localStorage e IndexedDB reais, comparando ambos com a exportação em memória. A instalação também deve guardar os bytes exatos do candidato, incluindo as 104 gravações. Uma ativação bem-sucedida remove o cache antigo do jogo e mantém um cache alheio usado como sentinela.

Durante offline, além de `context.setOffline(true)`, o servidor encerra conexões sem entregar bytes. Isso cobre as consultas de atualização de service worker feitas pelo próprio navegador, que podem escapar da emulação offline da página. Os testes não apagam/resemeiam dados após o primeiro carregamento e não usam `/?all` para liberar conteúdo artificialmente.

A suíte passou os dez pontos com três contextos criados/fechados, zero erros de página e zero requisições externas. Os 205 testes Node também passaram novamente. Dois controles negativos locais, executados com alterações somente em memória no teste, falharam como esperado: bundle antigo na instalação nova e remoção de uma tentativa do histórico sintético. Esses controles comprovaram as asserções; não são casos adicionais dos 205 testes nem alteram o jogo.

Relatório e capturas: `tests/artifacts/update/verification.json` e arquivos PNG na mesma pasta. Controles negativos: `tests/artifacts/update-negative-stale-runtime/` e `tests/artifacts/update-negative-lost-progress/`. Foi adicionada uma etapa para a suíte no CI; a execução desta entrega ocorreu localmente em Windows/Node 24, sem publicar ou disparar o CI remoto. Não houve mudança no código de salvamento, no service worker do jogo ou no progresso pessoal.

## Armazenamento concorrente e falhas nativas

Executar `pnpm build` e `pnpm test:storage`. Um cenário específico pode ser selecionado pelo nome: por exemplo, `pnpm test:storage simultaneous-tabs-close-pending`. Falhas nas asserções continuam produzindo código 1; nenhum caso foi ignorado ou convertido em sucesso esperado.

| Cenário | Resultado observado |
|---|---|
| `local-quota` | Passou: preencher localStorage até `QuotaExceededError` faz o jogo salvar no IndexedDB. A resposta sobrevive a reload; liberar espaço e recarregar restaura os dois armazenamentos sem perder histórico. |
| `indexeddb-quota` | Passou: quota nativa insuficiente aborta uma transação real com `QuotaExceededError`. O journal em localStorage preserva a resposta, inclusive após reload; remover o limite restaura a gravação em ambos. |
| `both-quotas` | Passou: falhando os dois destinos, o estado é `unsaved`, o aviso aparece e a exportação pela interface contém a resposta nova que ficou em memória. Depois de liberar espaço, outra partida faz o próprio jogo persistir tudo; os dados sobrevivem a reload. |
| `browser-close-committed` | Passou: após confirmação dos dois destinos, fechar o processo do Chromium de teste e reabri-lo com o mesmo perfil preserva a resposta e o histórico. |
| `browser-close-pending` | Passou: uma transação real mantém o store ocupado enquanto o jogo escreve o journal e aguarda o IndexedDB. Fechar/reabrir o navegador preserva a resposta por meio do journal. O IndexedDB contém um snapshot completo observado; a inicialização reconcilia os destinos. |
| `two-tabs` | A e B, abertas antes das respostas, salvam por caminhos reais da interface. Journal e IndexedDB precisam conter os eventos exatos das duas abas, inclusive após reload. |
| `stale-tab-close` | Repete as duas respostas e fecha a aba antiga. Exige a união dos eventos nos dois destinos antes e depois de recarregar. |
| `simultaneous-tabs` | Dois renderizadores submetem 24 respostas no mesmo prazo, sem aguardar as gravações entre chamadas. Exige IDs distintos, união dos eventos, contagens/sessões somadas uma vez, linhas e preferências preservadas. |
| `simultaneous-tabs-close-pending` | Bloqueia uma transação nativa, observa os dois journals com as 24 respostas e fecha uma aba antes de permitir o commit. A outra aba e o reload precisam recuperar tudo sem duplicação. |
| `simultaneous-tabs-indexeddb-quota` | Repete a concorrência com quota nativa insuficiente no IndexedDB. O journal deve preservar as 24 respostas e contagens; liberar quota e recarregar restaura os dois destinos. |

Antes da correção, dois dos sete cenários originais falhavam por **sobrescrita de snapshots completos entre abas**, inclusive em `pagehide`. Agora cada aba grava alterações imutáveis em uma chave própria antes do commit. Web Locks serializam a consolidação, e a transação de IndexedDB lê/mescla/grava atomicamente. Vetores de revisão impedem reaplicação; tentativas e exposições são unidas por ID, contagens por delta, linhas conquistadas por máximo e preferências somente quando editadas. Os objetos de jogo/freios são reconciliados mantendo as referências usadas pela partida. Reset/importação recebem uma geração nova para uma aba antiga não ressuscitar o estado descartado.

O fechamento não depende de uma Promise completar: o journal da aba é escrito de forma síncrona e recuperado na próxima inicialização. Só o proprietário remove operações confirmadas; um journal de aba encerrada durante escrita pode permanecer como evidência idempotente. Sem Web Locks, os journals são retidos para reconciliação. Os nove casos de `concurrent-storage.test.cjs` verificam essas regras com armazenamento compartilhado e cenários de commit bloqueado/falhando, incluindo uma nova falha de katakana em aba com pausa desatualizada; a suíte de navegador comprova a concorrência/quota/ciclo de vida no mecanismo real.

Os testes usam somente a fixture sintética existente (`cold-katakana-legacy29.json`), com 90 eventos iniciais e marcadores de preservação; nenhuma exportação pessoal foi lida. São executados sobre o build validado, em servidor localhost com requisições externas bloqueadas e service workers desativados. Os casos de quota/reabertura usam perfis de disco exclusivos sob `tests/artifacts/storage/`; as duas abas compartilham o mesmo contexto para compartilhar armazenamento de verdade.

Para localStorage, o teste grava chaves próprias até esgotar o limite real, reduzindo os blocos finais para evitar espaço sobrando. Para IndexedDB, usa a [quota nativa por origem do protocolo DevTools](https://chromedevtools.github.io/devtools-protocol/tot/Storage/#method-overrideQuotaForOrigin), limitada a um byte, abaixo do uso real já existente. Uma escrita de 128 KiB precisa falhar com `DOMException`/`QuotaExceededError` antes de testar a gravação do jogo. Isso testa falta de quota no mecanismo real do navegador **sem encher o disco físico**. Não substitui `setItem`, `indexedDB`, transações ou funções de salvamento por mocks. O teste espera 31 segundos para expirar a [reserva de escrita de 30 segundos do Chromium](https://chromium.googlesource.com/chromium/src/+/c0811f657d5ae8c42a9fb827e7e36e7e58a16bab/content/browser/indexed_db/instance/bucket_context.h); definir o limite sem essa espera ainda permitia escritas pela reserva anterior.

O fechamento pendente é provocado mantendo uma transação `readwrite` ativa em uma página de apoio. O teste observa a resposta no journal próprio da aba e o IndexedDB ainda pendente antes de fechar o navegador. Após reabertura, uma página sem o jogo lê o disco primeiro, para a inicialização não mascarar o resultado: o journal pendente deve conter o evento exato; depois o próprio aplicativo o recupera e consolida com as contagens. O IndexedDB deve conter um snapshot inteiro realmente observado, nunca dados parcialmente escritos. Esse cenário é fechamento normal do processo, **não** queda de energia, disco defeituoso ou encerramento forçado pelo sistema operacional.

Evidências locais da correção: `tests/artifacts/storage/verification.json`, `tests/artifacts/concurrent-storage-final.log`, `tests/artifacts/concurrent-unit-final.log`, `tests/artifacts/concurrent-update-final.log` e capturas nas pastas de relatórios. O JSON registra os erros nativos de quota, os eventos preservados, o estado antes do fechamento e as verificações de contagens/IDs. O progresso pessoal e a produção permanecem intocados. A prévia continua em `http://127.0.0.1:4193/`; o cache do candidato local passou a `kana-rain-v41-local-storage-concurrency` para permitir atualização/offline desse runtime.

Verificação final da correção em Windows/Node 24/Chromium: **215/215 testes Node, 10/10 cenários nativos de armazenamento, 10 verificações de atualização e as sete suítes restantes do navegador passaram**, sem casos ignorados. O build e `git diff --check` também passaram. Nos testes nativos, 12 contextos foram criados/fechados, os cinco perfis temporários foram removidos após fechamento, e houve zero erros de página e zero requisições externas. Revisadas as capturas do aviso de falha dupla e da recuperação após fechamento pendente. O resumo `tests/artifacts/concurrent-verification.json` confere o mesmo SHA-256 do runtime validado nas suítes de armazenamento e atualização. Leitura dos journals não depende de uma escrita de sondagem: a recuperação funciona mesmo quando a quota está cheia. Nenhuma publicação ou acesso ao perfil/progresso pessoal foi realizado.
