/* SX Workforce – kleine Interaktionen */
(function () {
  "use strict";

  // Mobile Navigation
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scroll-Fortschrittsleiste
  const bar = document.createElement("div");
  bar.className = "progress-bar";
  document.body.appendChild(bar);
  const header = document.querySelector(".header");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Staffelung: Index für Kinder in Rastern setzen (--i)
  document.querySelectorAll(".services, .advantages, .process, .gallery, .fleet, .team-lead, .office__media, .tags").forEach((grid) => {
    [...grid.children].forEach((child, i) => child.style.setProperty("--i", i));
  });

  // Scroll-Reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Zähler in der Kennzahlen-Leiste
  const stats = document.querySelectorAll(".stat");
  if (stats.length && "IntersectionObserver" in window && !reduceMotion) {
    const countUp = (el) => {
      const strong = el.querySelector("strong");
      const text = strong.textContent.trim();
      const m = text.match(/^(\d+)(.*)$/);
      if (!m) { el.classList.add("is-counted"); return; }
      const target = parseInt(m[1], 10), suffix = m[2];
      const start = performance.now(), dur = 1400;
      const from = target > 100 ? Math.max(0, target - 60) : 0;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        strong.textContent = Math.round(from + (target - from) * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick); else el.classList.add("is-counted");
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    stats.forEach((s) => co.observe(s));
  }

  // Sanfter Parallax für Hero-Text und Bilder
  const parallaxEls = [...document.querySelectorAll(".hero__inner, .about__media, .office__media")];
  if (parallaxEls.length && !reduceMotion) {
    parallaxEls.forEach((el) => el.setAttribute("data-parallax", ""));
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const center = r.top + r.height / 2 - vh / 2;
        const factor = el.classList.contains("hero__inner") ? 0.18 : 0.06;
        el.style.transform = `translateY(${(-center * factor).toFixed(1)}px)`;
      });
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Galerie-Lightbox
  const lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    const img = lightbox.querySelector("img");
    const cap = lightbox.querySelector(".lightbox__caption");
    const close = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    };
    document.querySelectorAll(".gallery figure").forEach((fig) => {
      fig.addEventListener("click", () => {
        const src = fig.dataset.full || fig.querySelector("img").src;
        img.src = src;
        img.alt = fig.querySelector("img").alt;
        cap.textContent = fig.querySelector("figcaption")?.textContent || "";
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
      });
    });
    lightbox.querySelector(".lightbox__close").addEventListener("click", close);
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  // Kontaktformular (mailto-Fallback – kann später an ein Backend angebunden werden)
  const form = document.querySelector("#kontaktformular");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const betreff = encodeURIComponent(`Anfrage über die Website – ${data.get("anliegen") || "Allgemein"}`);
      const body = encodeURIComponent(
        `Name: ${data.get("name")}\n` +
        `Firma: ${data.get("firma") || "-"}\n` +
        `E-Mail: ${data.get("email")}\n` +
        `Telefon: ${data.get("telefon") || "-"}\n` +
        `Anliegen: ${data.get("anliegen")}\n\n` +
        `${data.get("nachricht")}`
      );
      const mailto = `mailto:info@sxworkforce.de?subject=${betreff}&body=${body}`;
      form.dataset.lastMailto = mailto;
      window.location.href = mailto;
      const ok = form.querySelector(".form__success");
      if (ok) ok.style.display = "block";
      form.reset();
    });
  }

  // Cookie-Hinweis
  const cookie = document.querySelector(".cookie");
  if (cookie) {
    let stored = null;
    try { stored = localStorage.getItem("sx-cookie-consent"); } catch (_) {}
    if (!stored) cookie.classList.add("is-visible");
    cookie.querySelectorAll("[data-consent]").forEach((btn) =>
      btn.addEventListener("click", () => {
        try { localStorage.setItem("sx-cookie-consent", btn.dataset.consent); } catch (_) {}
        cookie.classList.remove("is-visible");
      })
    );
  }

  // Rechtliche Overlays (Impressum / Datenschutz) – per Hash erreichbar (#impressum, #datenschutz)
  const modals = document.querySelectorAll(".modal");
  if (modals.length) {
    const openModal = (id) => {
      const m = document.getElementById(id);
      if (!m) return false;
      modals.forEach((x) => (x.hidden = true));
      m.hidden = false;
      m.scrollTop = 0;
      document.body.classList.add("modal-open");
      return true;
    };
    const closeModals = () => {
      modals.forEach((x) => (x.hidden = true));
      document.body.classList.remove("modal-open");
      if (location.hash === "#impressum" || location.hash === "#datenschutz") {
        history.replaceState(null, "", location.pathname + location.search);
      }
    };
    document.querySelectorAll('a[href="#impressum"], a[href="#datenschutz"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const id = a.getAttribute("href").slice(1);
        openModal(id);
        history.replaceState(null, "", "#" + id);
      })
    );
    modals.forEach((m) => {
      m.querySelector(".modal__close").addEventListener("click", closeModals);
      m.addEventListener("click", (e) => { if (e.target === m) closeModals(); });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });
    const fromHash = () => {
      const id = location.hash.slice(1);
      if (id === "impressum" || id === "datenschutz") openModal(id);
    };
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  // Aktiven Menüpunkt beim Scrollen markieren
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]:not(.btn)')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const setActive = (id) => navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
    const so = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => so.observe(s));
  }

  // Jahr im Footer
  const y = document.querySelector("#jahr");
  if (y) y.textContent = new Date().getFullYear();
})();
