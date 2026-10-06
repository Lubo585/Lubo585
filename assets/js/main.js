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

  // Jahr im Footer
  const y = document.querySelector("#jahr");
  if (y) y.textContent = new Date().getFullYear();
})();
