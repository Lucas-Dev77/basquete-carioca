/* ==========================================================================
   Basquete Carioca — comportamento da página
   1. Cabeçalho que muda ao rolar
   2. Menu mobile
   3. Carrossel (dots, setas, teclado, autoplay)
   4. Link ativo conforme a seção visível
   5. Revelar elementos ao rolar
   6. Lightbox da galeria
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 1. Cabeçalho ---------- */
  const cabecalho = document.getElementById('cabecalho');

  const paginaInterna = document.body.classList.contains('pagina-interna');

  const atualizarCabecalho = () => {
    cabecalho.classList.toggle('solido', paginaInterna || window.scrollY > 60);
  };
  atualizarCabecalho();
  window.addEventListener('scroll', atualizarCabecalho, { passive: true });

  /* ---------- 2. Menu mobile ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');

  const fecharMenu = () => {
    nav.classList.remove('aberto');
    menuBtn.classList.remove('aberto');
    menuBtn.setAttribute('aria-expanded', 'false');
  };

  menuBtn.addEventListener('click', () => {
    const aberto = nav.classList.toggle('aberto');
    menuBtn.classList.toggle('aberto', aberto);
    menuBtn.setAttribute('aria-expanded', String(aberto));
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', fecharMenu));

  /* ---------- 3. Carrossel ---------- */
  const slides = [...document.querySelectorAll('.slide')];
  const dotsBox = document.getElementById('sliderDots');
  let atual = 0;
  let timer = null;

  if (slides.length && dotsBox) {

    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'dot' + (i === 0 ? ' ativo' : '');
      b.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
      b.addEventListener('click', () => { irPara(i); reiniciarAutoplay(); });
      dotsBox.appendChild(b);
    });

    const dots = [...dotsBox.children];

    function irPara(i) {
      atual = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('ativo', k === atual));
      dots.forEach((d, k) => d.classList.toggle('ativo', k === atual));
    }

    const proximo = () => irPara(atual + 1);
    const anterior = () => irPara(atual - 1);

    document.getElementById('slideNext')
      ?.addEventListener('click', () => { proximo(); reiniciarAutoplay(); });
    document.getElementById('slidePrev')
      ?.addEventListener('click', () => { anterior(); reiniciarAutoplay(); });

    document.addEventListener('keydown', e => {
      if (document.getElementById('lightbox')?.classList.contains('aberto')) return;
      if (e.key === 'ArrowRight') { proximo(); reiniciarAutoplay(); }
      if (e.key === 'ArrowLeft')  { anterior(); reiniciarAutoplay(); }
    });

    function reiniciarAutoplay() {
      clearInterval(timer);
      timer = setInterval(proximo, 7000);
    }

    const palco = document.querySelector('.slider__palco');
    palco.addEventListener('mouseenter', () => clearInterval(timer));
    palco.addEventListener('mouseleave', reiniciarAutoplay);

    reiniciarAutoplay();
  }

  /* ---------- 4. Link ativo por seção ---------- */
  const secoes = [...document.querySelectorAll('section[id]')];
  const links = [...document.querySelectorAll('.nav__link')];

  if (!paginaInterna) {
    const observadorSecao = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      links.forEach(l => l.classList.toggle('ativo', l.getAttribute('href') === `#${id}`));
    });
    }, { rootMargin: '-45% 0px -50% 0px' });

    secoes.forEach(s => observadorSecao.observe(s));
  }

  /* ---------- 5. Revelar ao rolar ---------- */
  const observadorRevelar = new IntersectionObserver((entradas, obs) => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visivel');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.revelar').forEach(el => observadorRevelar.observe(el));

  /* ---------- 6. Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  if (lightbox && lightboxImg) {

  const abrirLightbox = src => {
    lightboxImg.src = src;
    lightbox.classList.add('aberto');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const fecharLightbox = () => {
    lightbox.classList.remove('aberto');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.galeria__item img').forEach(img => {
    img.addEventListener('click', () => abrirLightbox(img.src));
  });

  document.getElementById('lightboxFechar').addEventListener('click', fecharLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) fecharLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharLightbox(); });

  }

  /* ---------- 7. Notícias coletadas pelo robô ---------- */
  const listaNoticias = document.getElementById('listaNoticias');
  const caixaDestaque = document.getElementById('destaqueCarioca');

  // Conteúdo da casa: entra no lugar do destaque quando o robô
  // não encontra nada do Rio ou de rua na rodada.
  const DA_CASA = [
    {
      rotulo: 'Da nossa quadra',
      titulo: 'Aterro do Flamengo — onde o basquete do Rio se mede',
      texto: 'Quadra cheia, fila de time esperando vaga e jogo em ritmo de decisão. Manhã de fim de semana é o horário nobre.',
      link: '#peladas',
      cta: 'Ver a ficha da pelada',
    },
    {
      rotulo: 'Do guia de preparo',
      titulo: 'Dez minutos que evitam a entorse',
      texto: 'Equilíbrio em uma perna e ensaio de aterrissagem são os dois passos que mais protegem. Cabem no tempo de espera da quadra.',
      link: 'vamos-jogar.html',
      cta: 'Ver o aquecimento',
    },
    {
      rotulo: 'Da nossa quadra',
      titulo: 'Parque de Madureira — a quadra grafitada',
      texto: 'A mais fotogênica da cidade, com piso bom, iluminação e etapas do Carioca de 3x3 no currículo.',
      link: '#peladas',
      cta: 'Ver a ficha da pelada',
    },
  ];

  if (listaNoticias) carregarNoticias();

  async function carregarNoticias() {
    try {
      const resposta = await fetch('dados/noticias.json', { cache: 'no-cache' });
      if (!resposta.ok) return;                  // mantém o conteúdo estático do HTML

      const dados = await resposta.json();
      if (!Array.isArray(dados.itens)) return;

      // A curadoria é estreita de propósito: semana sem notícia do escopo
      // mostra um aviso honesto, não um espaço em branco.
      listaNoticias.innerHTML = dados.itens.length
        ? dados.itens.slice(0, 6).map(cardNoticia).join('')
        : cardVazio();

      if (caixaDestaque) {
        caixaDestaque.innerHTML = dados.destaque
          ? cardDestaque(dados.destaque)
          : cardDaCasa();
      }

      const linhaData = document.getElementById('atualizado');
      if (linhaData && dados.atualizadoEm) {
        linhaData.textContent = `Notícias atualizadas automaticamente em ${formatarData(dados.atualizadoEm)}.`;
      }
    } catch (erro) {
      /* Silêncio proposital: se algo falhar, o HTML estático continua valendo. */
    }
  }

  /* --- montagem dos cards --- */

  const esc = t => String(t ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // só aceita links http(s), para o conteúdo externo não injetar nada estranho
  const linkSeguro = u => /^https?:\/\//i.test(u || '') ? esc(u) : '#';

  const formatarData = iso => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const marcaSelo = selo =>
    selo === 'rio' ? '<span class="selo selo--rio">Rio</span>'
    : selo === 'rua' ? '<span class="selo selo--rua">Rua &middot; 3x3</span>'
    : '';

  function cardNoticia(n) {
    const url = linkSeguro(n.link);
    return `
      <article class="noticia revelar visivel">
        <div class="noticia__meta">
          ${marcaSelo(n.selo)}
          ${n.fonte ? `<span class="noticia__fonte">${esc(n.fonte)}</span>` : ''}
          <span class="noticia__data">${formatarData(n.quando)}</span>
        </div>
        <h3 class="noticia__titulo"><a href="${url}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
        <a class="link-saiba" href="${url}" target="_blank" rel="noopener">Ler na fonte</a>
      </article>`;
  }

  function cardDestaque(n) {
    const url = linkSeguro(n.link);
    return `
      <a class="destaque" href="${url}" target="_blank" rel="noopener">
        <p class="destaque__rotulo">Da cena carioca</p>
        <h3 class="destaque__titulo">${esc(n.titulo)}</h3>
        <p class="destaque__meta">${esc(n.fonte || 'fonte externa')} &middot; ${formatarData(n.quando)}</p>
      </a>`;
  }

  function cardVazio() {
    return `
      <div class="vazio">
        <p class="vazio__titulo">Semana sem novidade do nosso assunto</p>
        <p>Só publicamos aqui basquete carioca e o oficial brasileiro. Quando não
           sai nada que se encaixe, a seção fica quieta em vez de encher espaço.</p>
        <a class="botao" href="#peladas">Ver as quadras do Rio</a>
      </div>`;
  }

  function cardDaCasa() {
    const dia = Math.floor(Date.now() / 86400000);
    const c = DA_CASA[dia % DA_CASA.length];
    return `
      <a class="destaque destaque--casa" href="${c.link}">
        <p class="destaque__rotulo">${esc(c.rotulo)}</p>
        <h3 class="destaque__titulo">${esc(c.titulo)}</h3>
        <p class="destaque__texto">${esc(c.texto)}</p>
        <span class="destaque__cta">${esc(c.cta)}</span>
      </a>`;
  }

  /* ---------- 8. Vídeo nos cards de pelada ---------- */
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.video-controle').forEach(botao => {
    const video = document.getElementById(botao.dataset.alvo);
    if (!video) return;

    let pausadoPeloUsuario = false;

    const refletirEstado = () => {
      botao.dataset.estado = video.paused ? 'pausado' : 'tocando';
      botao.setAttribute('aria-label', video.paused ? 'Tocar vídeo' : 'Pausar vídeo');
    };

    const tentarTocar = () => { video.play().catch(() => {}); };

    botao.addEventListener('click', () => {
      if (video.paused) { pausadoPeloUsuario = false; tentarTocar(); }
      else { pausadoPeloUsuario = true; video.pause(); }
    });

    video.addEventListener('play', refletirEstado);
    video.addEventListener('pause', refletirEstado);

    // O controle só aparece se o arquivo existir de verdade. Sem vídeo na
    // pasta, o visitante vê apenas o poster e nenhum botão quebrado.
    // Escuta os dois eventos porque a ordem varia entre navegadores — e
    // vídeo que toca sozinho sem como pausar é barreira de acessibilidade.
    const revelarControle = () => {
      if (!botao.hidden) return;
      botao.hidden = false;
      refletirEstado();
    };

    video.addEventListener('loadedmetadata', () => {
      revelarControle();
      if (!menosMovimento) tentarTocar();
    });
    video.addEventListener('playing', revelarControle);

    // O script roda no fim da página, então o vídeo pode já ter carregado
    // antes destes ouvintes existirem — nesse caso o evento nunca mais vem.
    // Por isso olhamos também o estado atual, em vez de só esperar o futuro.
    if (video.readyState >= 1) {
      revelarControle();
      if (!menosMovimento) tentarTocar();
    }

    // Fora da tela, o vídeo pausa — não faz sentido gastar bateria e dados
    // de quem está lendo outra seção.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entradas => {
        entradas.forEach(e => {
          if (menosMovimento || pausadoPeloUsuario) return;
          if (e.isIntersecting) tentarTocar();
          else video.pause();
        });
      }, { threshold: 0.25 }).observe(video);
    }
  });

});
