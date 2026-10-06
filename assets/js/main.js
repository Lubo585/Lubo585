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
