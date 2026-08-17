document.querySelectorAll("[data-site-header]").forEach((header) => {
  const toggle = header.querySelector("[data-nav-toggle]");
  const panel = header.querySelector("[data-nav-panel]");
  const label = toggle?.querySelector("[data-nav-label]");
  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function setOpen(open, { restoreFocus = false } = {}) {
    const shouldOpen = Boolean(open && mobileQuery.matches);
    header.classList.toggle("nav-open", shouldOpen);
    document.body.classList.toggle("site-nav-open", shouldOpen);
    toggle?.setAttribute("aria-expanded", String(shouldOpen));
    toggle?.setAttribute("aria-label", shouldOpen ? "Cerrar menú" : "Abrir menú");
    if (label) label.textContent = shouldOpen ? "Cerrar" : "Menú";
    if (restoreFocus) toggle?.focus();
  }

  toggle?.addEventListener("click", () => {
    setOpen(!header.classList.contains("nav-open"));
  });

  panel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("nav-open") && !header.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("nav-open")) {
      setOpen(false, { restoreFocus: true });
    }
  });

  mobileQuery.addEventListener?.("change", () => setOpen(false));

  function normalizePath(path) {
    const normalized = path.replace(/\/+$/, "");
    return normalized ? `${normalized}/` : "/";
  }

  const currentPath = normalizePath(window.location.pathname);
  panel?.querySelectorAll(".site-nav a").forEach((link) => {
    link.removeAttribute("aria-current");
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    const isCurrentSection = linkPath !== "/" && currentPath.startsWith(linkPath);
    if (currentPath === linkPath || isCurrentSection) link.setAttribute("aria-current", "page");
  });

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
});
