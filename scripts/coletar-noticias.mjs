/* ==========================================================================
   Coletor de notícias — Basquete Carioca
   Roda no GitHub Actions, sem nenhuma dependência externa.

   ESCOPO: basquete em geral, de fonte confiável, com o carioca em destaque.
   A rede é larga para a seção nunca esvaziar; o foco no Rio é preservado
   pelo selo nos cards e pelo destaque, que só aceita item do Rio de verdade.

   Como funciona:
   1. consulta o Google Notícias em dois níveis (núcleo e extra)
   2. aceita apenas item publicado por veículo da lista aprovada
   3. marca com selo o que é do Rio ou de rua/3x3
   4. preenche as vagas sobrando com o nível extra
   5. grava dados/noticias.json — e não mexe no arquivo se não achar nada

   Rodar na mão:  node scripts/coletar-noticias.mjs
   ========================================================================== */

import { writeFile, readFile, mkdir } from 'node:fs/promises';

/* ==========================================================================
   1. FONTES APROVADAS
   A ordem importa: vale a primeira que casar. O segundo campo é o nome curto
   que aparece no card; null significa "usa o nome que o Google mandou".
   ========================================================================== */

const FONTES = [
  // --- grandes jornais esportivos ---
  [/ge\.globo|globo esporte/i,            'ge',                  'jornal'],
  [/lance!?/i,                            'LANCE!',              'jornal'],
  [/\bespn\b/i,                           'ESPN',                'jornal'],
  [/\buol\b/i,                            'UOL Esporte',         'jornal'],
  [/estad(ã|a)o/i,                        'Estadão',             'jornal'],
  [/folha de s|folhapress/i,              'Folha',               'jornal'],
  [/^o globo|jornal o globo/i,            'O Globo',             'jornal'],
  [/gazeta esportiva/i,                   'Gazeta Esportiva',    'jornal'],
  [/cnn brasil/i,                         'CNN Brasil',          'jornal'],
  [/\bterra\b/i,                          'Terra',               'jornal'],
  [/metr(ó|o)poles/i,                     'Metrópoles',          'jornal'],

  // --- oficiais do basquete ---
  [/confedera(ç|c)(ã|a)o brasileira de bask|\bcbb\b/i, 'CBB',    'oficial'],
  [/liga nacional de basquete|\blnb\b/i,  'LNB',                 'oficial'],
  [/\bnbb\b/i,                            'NBB',                 'oficial'],
  [/\bfiba\b/i,                           'FIBA',                'oficial'],
  [/\bnba\b/i,                            'NBA',                 'oficial'],

  // --- imprensa do Rio ---
  [/di(á|a)rio do rio/i,                  'Diário do Rio',       'rio'],
  [/^o dia|odia\b/i,                      'O Dia',               'rio'],
  [/extra\.globo|extra online/i,          'Extra',               'rio'],
  [/prefeitura(\.| do )rio/i,             'Prefeitura do Rio',   'rio'],
  [/voz das comunidades/i,                'Voz das Comunidades', 'rio'],
  [/super\s?esportes/i,                   'Superesportes',       'rio'],

  // --- especializados em basquete (qualquer veículo com o tema no nome) ---
  [/basquete|basketball|hoop|draft brasil/i, null,               'especializado'],
];

/* ==========================================================================
   2. CONSULTAS
   nucleo = o assunto do site. extra = reserva, só preenche vaga que sobrou.
   ========================================================================== */

const CONSULTAS = [
  // núcleo: o assunto do site, com prioridade na ordenação
  { nivel: 'nucleo', peso: 6, q: '"basquete de rua" Rio de Janeiro' },
  { nivel: 'nucleo', peso: 6, q: 'basquete 3x3 Rio de Janeiro carioca' },
  { nivel: 'nucleo', peso: 6, q: '"Campeonato Carioca" basquete' },
  { nivel: 'nucleo', peso: 5, q: 'quadra de basquete Rio de Janeiro' },
  { nivel: 'nucleo', peso: 5, q: 'basquete Flamengo Botafogo Vasco Fluminense' },
  { nivel: 'nucleo', peso: 4, q: 'CBB Confederação Brasileira de Basketball' },
  { nivel: 'nucleo', peso: 4, q: 'NBB Liga Nacional de Basquete' },
  { nivel: 'nucleo', peso: 3, q: 'seleção brasileira de basquete' },
  { nivel: 'nucleo', peso: 3, q: 'NBA basquete brasileiro' },

  // extra: reserva que só ocupa vaga sobrando
  { nivel: 'extra',  peso: 1, q: 'polêmica basquete NBA NBB declaração' },
  { nivel: 'extra',  peso: 1, q: 'ex-jogador de basquete aposentado hoje' },
  { nivel: 'extra',  peso: 1, q: 'celebridade rapper dono time basquete NBA' },
];

const MAX_ITENS = 9;    // cards que a home exibe
const MAX_DIAS  = 30;   // ignora notícia mais velha que isso
const DESTINO   = 'dados/noticias.json';

// só passa quem fala de basquete — barra o Flamengo do futebol
const EH_BASQUETE = /basquete|basket|streetball|\bnbb\b|\bnba\b|3x3|cestinha|enterrada|\bwnba\b/i;

// origem carioca
// Lugares, bairros e clubes do Rio. Os clubes entram porque o basquete do
// Flamengo é basquete carioca — e o filtro de tema já barrou o futebol antes.
const EH_RIO = /rio de janeiro|carioca|madureira|aterro|tijuca|maracan|rocinha|jacarezinho|niter(ó|o)i|baixada|parque ol(í|i)mpico|zona (sul|norte|oeste)|flamengo|botafogo|vasco|fluminense/i;

// rua / 3x3
const EH_RUA = /basquete de rua|streetball|3x3|quadra p(ú|u)blica|pelada|rach(ã|a)o|quadra da comunidade/i;

/* ==========================================================================
   3. UTILIDADES
   ========================================================================== */

const limpar = t => t
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const pegar = (bloco, tag) => {
  const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? limpar(m[1]) : '';
};

const semAcento = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = t => semAcento(t.toLowerCase()).replace(/[^a-z0-9]/g, '').slice(0, 55);

/**
 * O Google Notícias entrega o título como "Manchete - Veículo".
 * Tira esse sufixo, preferindo casar com o nome que veio no campo <source>.
 */
function separarTitulo(bruto, veiculo) {
  if (veiculo) {
    const alvo = ` - ${veiculo}`;
    if (bruto.endsWith(alvo)) return bruto.slice(0, -alvo.length).trim();
    // às vezes o sufixo é só o começo do nome do veículo
    const corte = bruto.lastIndexOf(' - ');
    if (corte > 20 && veiculo.toLowerCase().startsWith(bruto.slice(corte + 3).toLowerCase().slice(0, 8))) {
      return bruto.slice(0, corte).trim();
    }
  }
  const corte = bruto.lastIndexOf(' - ');
  return corte > 20 ? bruto.slice(0, corte).trim() : bruto;
}

/** Confere se o veículo está aprovado. Devolve {nome, grupo} ou null. */
function aprovar(veiculo) {
  if (!veiculo) return null;
  for (const [padrao, nome, grupo] of FONTES) {
    if (padrao.test(veiculo)) return { nome: nome || veiculo, grupo };
  }
  return null;
}

/* ==========================================================================
   4. COLETA
   ========================================================================== */

async function buscar({ q, peso, nivel }) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try {
    const resposta = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PeladaCarioca/2.0)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!resposta.ok) {
      console.warn(`  HTTP ${resposta.status} — ${q}`);
      return [];
    }

    const xml = await resposta.text();
    const blocos = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    return blocos.map(bloco => {
      const veiculo = pegar(bloco, 'source');
      return {
        titulo: separarTitulo(pegar(bloco, 'title'), veiculo),
        veiculo,
        link: pegar(bloco, 'link'),
        data: pegar(bloco, 'pubDate'),
        peso,
        nivel,
      };
    });
  } catch (erro) {
    console.warn(`  erro em "${q}": ${erro.message}`);
    return [];
  }
}

/* ==========================================================================
   5. PROGRAMA
   ========================================================================== */

async function principal() {
  console.log('Coletando notícias...\n');

  const lotes = await Promise.all(CONSULTAS.map(async c => {
    const r = await buscar(c);
    console.log(`  ${String(r.length).padStart(3)} brutos  [${c.nivel}]  ${c.q}`);
    return r;
  }));

  const limite = Date.now() - MAX_DIAS * 864e5;
  const vistos = new Set();
  const aceitos = [];
  const descartes = { fora_do_tema: 0, fonte_nao_aprovada: [], velho: 0, repetido: 0 };

  for (const item of lotes.flat()) {
    if (!item.titulo || !item.link) continue;

    if (!EH_BASQUETE.test(item.titulo)) { descartes.fora_do_tema++; continue; }

    const quando = new Date(item.data);
    if (isNaN(quando) || quando.getTime() < limite) { descartes.velho++; continue; }

    const k = chave(item.titulo);
    if (vistos.has(k)) { descartes.repetido++; continue; }

    const fonte = aprovar(item.veiculo);
    if (!fonte) { descartes.fonte_nao_aprovada.push(item.veiculo || '(sem fonte)'); continue; }

    vistos.add(k);

    const texto = `${item.titulo} ${item.veiculo}`;
    const rio = EH_RIO.test(texto);
    const rua = EH_RUA.test(texto);

    aceitos.push({
      titulo: item.titulo,
      fonte: fonte.nome,
      grupo: fonte.grupo,
      link: item.link,
      quando: quando.toISOString(),
      selo: rio ? 'rio' : (rua ? 'rua' : null),
      nivel: item.nivel,
      peso: item.peso,
      rio,
    });
  }

  // mais recente primeiro, com preferência leve para o que é do nosso tema
  const ordenar = (a, b) => (b.peso - a.peso) * 0.3 * 864e5 + (new Date(b.quando) - new Date(a.quando));

  const nucleo = aceitos.filter(i => i.nivel === 'nucleo').sort(ordenar);
  const extra  = aceitos.filter(i => i.nivel === 'extra').sort(ordenar);

  // o destaque só existe se for do Rio de verdade — 3x3 em outro estado não conta
  // o destaque continua exigindo Rio de verdade — 3x3 em outro estado não conta
  const destaque = nucleo.find(i => i.rio) || null;

  const lista = nucleo.filter(i => i !== destaque);
  const vagas = Math.max(0, MAX_ITENS - lista.length);
  const escolhidos = [...lista, ...extra.slice(0, vagas)].slice(0, MAX_ITENS);

  /* ---------- relatório no log, que é como a gente calibra ---------- */
  console.log('\n--- descartes ---');
  console.log(`  fora do tema:  ${descartes.fora_do_tema}`);
  console.log(`  velho demais:  ${descartes.velho}`);
  console.log(`  repetido:      ${descartes.repetido}`);
  console.log(`  fonte fora da lista: ${descartes.fonte_nao_aprovada.length}`);

  const contagem = {};
  for (const v of descartes.fonte_nao_aprovada) contagem[v] = (contagem[v] || 0) + 1;
  Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([v, n]) => console.log(`      ${String(n).padStart(2)}x  ${v}`));

  console.log('\n--- aprovados ---');
  console.log(`  núcleo: ${nucleo.length}   extra: ${extra.length}   publicados: ${escolhidos.length}` +
              `   (do Rio: ${aceitos.filter(i => i.rio).length})`);
  escolhidos.forEach(i => console.log(`  [${(i.selo || '-').padEnd(4)}] ${i.fonte.padEnd(20)} ${i.titulo.slice(0, 62)}`));
  console.log(destaque ? `\nDestaque carioca: ${destaque.titulo}` : '\nSem destaque do Rio — a home usa conteúdo próprio.');

  /* ---------- não estraga o que já existe ---------- */
  if (!escolhidos.length) {
    console.log('\nNenhuma notícia aprovada nesta rodada. Arquivo anterior mantido.');
    return;
  }

  const enxugar = ({ titulo, fonte, grupo, link, quando, selo }) =>
    ({ titulo, fonte, grupo, link, quando, selo });

  await mkdir('dados', { recursive: true });
  await writeFile(DESTINO, JSON.stringify({
    atualizadoEm: new Date().toISOString(),
    destaque: destaque && enxugar(destaque),
    itens: escolhidos.map(enxugar),
  }, null, 2) + '\n', 'utf8');

  console.log(`\n${escolhidos.length} notícias gravadas em ${DESTINO}`);
}

principal().catch(erro => { console.error(erro); process.exit(1); });
