(function () {
  "use strict";

  var data = window.__BRAND__ || {};

  function $(sel, scope) { return (scope || document).querySelector(sel); }
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------
     Mount: WhatsApp RSVP links (hero CTA + cierre final)
     --------------------------------------------------------- */
  function mountRSVPLinks() {
    var wa = data.whatsapp;
    if (!wa) return;
    var url = "https://wa.me/" + wa.number + "?text=" + encodeURIComponent(wa.message);
    $$("[data-rsvp-link]").forEach(function (a) {
      if (a.getAttribute("href") && a.getAttribute("href") !== "#") return; // idempotente
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  /* ---------------------------------------------------------
     Nav: fondo y padding al hacer scroll
     --------------------------------------------------------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 40) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------
     Reveal on scroll — threshold bajo + timeout de seguridad
     --------------------------------------------------------- */
  function initReveals() {
    var targets = $$("[data-reveal]");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 90 + "ms";
      io.observe(el);
    });

    // Seguridad: a los 6s, revela todo lo que siga visible en pantalla y siga oculto
    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-revealed") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-revealed");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Hero: vídeo de YouTube de fondo, autoplay silencioso y en
     bucle. Mudo es obligatorio para que el navegador permita el
     autoplay. Sin controles ni botón de sonido.
     --------------------------------------------------------- */
  function initHeroVideo() {
    var mount = $("[data-hero-video]");
    if (!mount || mount.children.length > 0) return;          // idempotente
    if (!data.videos || !data.videos.hero) return;
    var id = data.videos.hero.youtubeId;
    var params = [
      "autoplay=1", "mute=1", "controls=0", "loop=1", "playlist=" + id,
      "rel=0", "playsinline=1", "modestbranding=1", "iv_load_policy=3"
    ].join("&");
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube.com/embed/" + id + "?" + params;
    iframe.title = data.videos.hero.label || "Vídeo de cabecera";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("tabindex", "-1");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    mount.appendChild(iframe);
  }

  /* ---------------------------------------------------------
     Hero: parallax con GSAP ScrollTrigger (fallback sin GSAP)
     --------------------------------------------------------- */
  function initHeroParallax() {
    var bg = $(".hero__bg");
    if (!bg) return;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(bg, {
        yPercent: 18,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });
    } else {
      var ticking = false;
      function update() {
        var shift = Math.min(window.scrollY * 0.12, 80);
        bg.style.transform = "scale(1.06) translateY(" + shift + "px)";
        ticking = false;
      }
      window.addEventListener("scroll", function () {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
      }, { passive: true });
    }
  }

  /* ---------------------------------------------------------
     Galería: aparición escalonada con GSAP
     --------------------------------------------------------- */
  function initGalleryAnimation() {
    if (!window.gsap || !window.ScrollTrigger) return;
    var items = $$(".gallery__item");
    if (!items.length) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(items, {
      opacity: 0,
      y: 40,
      duration: 0.9,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".gallery__grid",
        start: "top 85%",
        once: true
      }
    });
    // Quitar el reveal manual en items de galería para evitar conflicto
    items.forEach(function(el) { el.classList.remove("reveal"); el.removeAttribute("data-reveal"); });
  }

  /* ---------------------------------------------------------
     Concept: número animado con GSAP
     --------------------------------------------------------- */
  function initConceptAnimation() {
    if (!window.gsap || !window.ScrollTrigger) return;
    var num = $(".concept__num");
    var text = $(".concept__text");
    if (!num || !text) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.from([num, text], {
      opacity: 0,
      x: function(i) { return i === 0 ? -30 : 30; },
      duration: 1.1,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".concept",
        start: "top 80%",
        once: true
      }
    });
    [num, text].forEach(function(el) { el.classList.remove("reveal"); el.removeAttribute("data-reveal"); });
  }

  /* ---------------------------------------------------------
     Vídeo facade: carga el iframe de YouTube solo al hacer clic.
     Funciona para cualquier elemento [data-video-frame]: hero,
     revive y los dos testimonios. Con sonido (no muted) porque
     se activa con un clic explícito, no en autoplay.
     --------------------------------------------------------- */
  function initVideoFacades() {
    var frames = $$("[data-video-frame]");
    if (!frames.length || !data.videos) return;
    frames.forEach(function (frame) {
      var key = frame.getAttribute("data-video-id");
      var video = data.videos[key];
      if (!video) return;
      function play() {
        var id = video.youtubeId;
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
        iframe.title = video.label || "Video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        frame.innerHTML = "";
        frame.appendChild(iframe);
        frame.removeEventListener("click", play);
        frame.removeEventListener("keydown", onKey);
      }
      function onKey(e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
      }
      frame.addEventListener("click", play);
      frame.addEventListener("keydown", onKey);
    });
  }

  /* ---------------------------------------------------------
     Autoplay al entrar en pantalla: inyecta el iframe de YouTube
     en silencio (autoplay obligatorio en mute) y con controles,
     para cualquier [data-autoplay-frame] (p.ej. el replay).
     --------------------------------------------------------- */
  function initAutoplayFrames() {
    var frames = $$("[data-autoplay-frame]");
    if (!frames.length || !data.videos) return;

    function inject(frame) {
      if (frame.querySelector("iframe")) return;            // idempotente
      var key = frame.getAttribute("data-video-id");
      var video = data.videos[key];
      if (!video) return;
      var id = video.youtubeId;
      var params = [
        "autoplay=1", "mute=1", "controls=1", "loop=1", "playlist=" + id,
        "rel=0", "playsinline=1", "modestbranding=1", "iv_load_policy=3"
      ].join("&");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + id + "?" + params;
      iframe.title = video.label || "Vídeo";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      iframe.setAttribute("frameborder", "0");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.innerHTML = "";
      frame.appendChild(iframe);
    }

    if (!("IntersectionObserver" in window)) {
      frames.forEach(inject);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { inject(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    frames.forEach(function (f) { io.observe(f); });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    safe(mountRSVPLinks, "mountRSVPLinks");
    safe(initNav, "initNav");
    safe(initGalleryAnimation, "initGalleryAnimation");
    safe(initConceptAnimation, "initConceptAnimation");
    safe(initReveals, "initReveals");
    safe(initHeroVideo, "initHeroVideo");
    safe(initHeroParallax, "initHeroParallax");
    safe(initVideoFacades, "initVideoFacades");
    safe(initAutoplayFrames, "initAutoplayFrames");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
