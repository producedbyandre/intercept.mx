document.documentElement.classList.add("js");

const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CAMPAIGN_STORAGE_KEY = "intercept_visibilidad_ia_campaign";
const header = document.querySelector("[data-header]");
const aiDemo = document.querySelector("[data-ai-demo]");
const dialog = document.querySelector("[data-dialog]");
const form = document.querySelector("[data-form]");
const formContent = document.querySelector("[data-form-content]");
const confirmation = document.querySelector("[data-confirmation]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = form?.querySelector("[type='submit']");
const stickyCta = document.querySelector("[data-sticky-cta]");
const heroCta = document.querySelector("[data-hero-cta]");
const finalCta = document.querySelector("[data-final-cta]");

let lastTrigger = null;
let formStarted = false;
let isSubmitting = false;
let heroCtaVisible = true;
let finalCtaVisible = false;

function trackEvent(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, page_offer: "visibilidad_ia_para_marcas", ...details });
}

function captureCampaign() {
  const params = new URLSearchParams(window.location.search);
  const current = Object.fromEntries(
    CAMPAIGN_KEYS.map((key) => [key, params.get(key) || ""]).filter(([, value]) => value),
  );

  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(CAMPAIGN_STORAGE_KEY) || "{}");
  } catch {
    stored = {};
  }

  const campaign = { ...stored, ...current };
  try {
    sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(campaign));
  } catch {
    // Form submission still works when session storage is unavailable.
  }

  CAMPAIGN_KEYS.forEach((key) => {
    const input = form?.elements.namedItem(key);
    if (input) input.value = campaign[key] || "";
  });

  return campaign;
}

const campaign = captureCampaign();

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactViewport = window.matchMedia("(max-width: 720px)").matches;

function initAiDemo() {
  if (!aiDemo || reduceMotion || compactViewport) return;
  const query = aiDemo.querySelector("[data-ai-query]");
  if (!query) return;

  const fullText = query.textContent.trim();
  query.textContent = "";
  aiDemo.classList.add("is-animating", "is-typing");

  window.requestAnimationFrame((startTime) => {
    function type(currentTime) {
      const progress = Math.min((currentTime - startTime) / 1650, 1);
      query.textContent = fullText.slice(0, Math.ceil(fullText.length * progress));

      if (progress < 1) {
        window.requestAnimationFrame(type);
        return;
      }

      aiDemo.classList.remove("is-typing");
      window.setTimeout(() => {
        aiDemo.classList.remove("is-animating");
        aiDemo.classList.add("is-complete");
      }, 850);
    }

    window.requestAnimationFrame(type);
  });
}

initAiDemo();

const revealElements = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealElements.forEach((element) => revealObserver.observe(element));
}

function updateStickyCta() {
  if (!stickyCta) return;
  const shouldShow = !heroCtaVisible && !finalCtaVisible && !dialog?.open;
  stickyCta.hidden = false;
  stickyCta.classList.toggle("is-visible", shouldShow);
}

if ("IntersectionObserver" in window && heroCta && finalCta) {
  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === heroCta) heroCtaVisible = entry.isIntersecting;
      if (entry.target === finalCta) finalCtaVisible = entry.isIntersecting;
    });
    updateStickyCta();
  }, { threshold: 0.12 });

  ctaObserver.observe(heroCta);
  ctaObserver.observe(finalCta);
}

function openDialog(event) {
  event.preventDefault();
  lastTrigger = event.currentTarget;
  trackEvent("lp_cta_click", { cta_location: lastTrigger.dataset.ctaLocation || "unknown", ...campaign });
  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.classList.add("is-fallback-modal");
  }

  document.body.classList.add("dialog-open");
  updateStickyCta();
  window.setTimeout(() => {
    const focusTarget = confirmation?.hidden ? form?.elements.name : confirmation;
    focusTarget?.focus();
  }, 0);
}

function closeDialog() {
  if (!dialog?.open) return;
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
    dialog.classList.remove("is-fallback-modal");
    dialog.dispatchEvent(new Event("close"));
  }
}

document.querySelectorAll(".js-open-form").forEach((button) => button.addEventListener("click", openDialog));
document.querySelectorAll(".js-diagnostic-cta").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("lp_cta_click", {
      cta_location: link.dataset.ctaLocation || "unknown",
      cta_destination: link.getAttribute("href") || "unknown",
      ...campaign,
    });
  });
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeDialog));

dialog?.addEventListener("close", () => {
  dialog.classList.remove("is-fallback-modal");
  document.body.classList.remove("dialog-open");
  updateStickyCta();
  lastTrigger?.focus();
});

dialog?.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) closeDialog();
});

function clearErrors() {
  formStatus.textContent = "";
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
}

function showFieldError(name, message) {
  const field = form.elements.namedItem(name);
  const elements = field instanceof RadioNodeList ? [...field] : [field];
  elements.filter(Boolean).forEach((element) => element.setAttribute("aria-invalid", "true"));
  const error = document.getElementById(`${name}-error`);
  if (error) error.textContent = message;
}

function validateForm() {
  clearErrors();
  const data = new FormData(form);
  const errors = {};

  if (!String(data.get("name") || "").trim()) errors.name = "Escribe tu nombre.";
  if (!String(data.get("company") || "").trim()) errors.company = "Escribe el nombre de la marca o empresa.";
  if (!String(data.get("category") || "").trim()) errors.category = "Escribe la categoría o producto principal.";

  const website = String(data.get("website") || "").trim();
  if (!website) {
    errors.website = "Escribe el sitio web de la marca.";
  } else {
    try {
      const parsed = new URL(website);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
    } catch {
      errors.website = "Usa una URL completa, por ejemplo: https://tumarca.com";
    }
  }

  const whatsapp = String(data.get("whatsapp") || "").trim();
  if (!whatsapp) {
    errors.whatsapp = "Escribe tu número de WhatsApp.";
  } else if (whatsapp.replace(/\D/g, "").length < 7) {
    errors.whatsapp = "Revisa el número de WhatsApp.";
  }

  if (!data.get("buying_authority")) errors.buying_authority = "Selecciona una opción.";
  if (!data.get("implementation_intent")) errors.implementation_intent = "Confirma tu interés en implementar mejoras.";
  if (!data.get("terms_acknowledgment")) errors.terms_acknowledgment = "Confirma que entiendes los límites del servicio.";

  Object.entries(errors).forEach(([name, message]) => showFieldError(name, message));
  if (!Object.keys(errors).length) return true;

  const firstField = form.elements.namedItem(Object.keys(errors)[0]);
  const focusTarget = firstField instanceof RadioNodeList ? firstField[0] : firstField;
  focusTarget?.focus();
  return false;
}

function formPayload() {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  delete payload.company_fax;
  payload.implementation_intent = data.has("implementation_intent");
  payload.terms_acknowledgment = data.has("terms_acknowledgment");
  payload.page_url = window.location.href;
  payload.referrer = document.referrer;
  payload.submitted_at = new Date().toISOString();
  payload.submission_id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return payload;
}

function showConfirmation() {
  formContent.hidden = true;
  confirmation.hidden = false;
  confirmation.focus();
}

form?.addEventListener("input", () => {
  if (formStarted) return;
  formStarted = true;
  trackEvent("form_start", { form_name: "diagnostico_visibilidad_marcas", ...campaign });
});

form?.addEventListener("change", (event) => {
  const field = event.target;
  if (!field.name) return;
  const error = document.getElementById(`${field.name}-error`);
  if (error) error.textContent = "";
  field.removeAttribute("aria-invalid");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting || !validateForm()) return;

  if (form.elements.company_fax.value) {
    showConfirmation();
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  const originalLabel = submitButton.textContent;
  submitButton.textContent = "Enviando…";
  formStatus.textContent = "";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(formPayload()),
      credentials: "same-origin",
    });

    if (!response.ok) throw new Error(`Lead endpoint returned ${response.status}`);
    trackEvent("form_submit", { form_name: "diagnostico_visibilidad_marcas", ...campaign });
    trackEvent("generate_lead", { form_name: "diagnostico_visibilidad_marcas", ...campaign });
    if (typeof window.fbq === "function") window.fbq("track", "Lead", { content_name: "Diagnóstico de Visibilidad IA para Marcas" });
    showConfirmation();
  } catch (error) {
    formStatus.textContent = "No pudimos enviar tu solicitud. Tus datos siguen aquí; revisa tu conexión e inténtalo de nuevo.";
    console.error("Brand visibility form submission failed:", error);
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

trackEvent("view_landing", { ...campaign });
