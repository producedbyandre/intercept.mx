const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CAMPAIGN_STORAGE_KEY = "intercept_visibilidad_ia_campaign";

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
  window.dataLayer.push({
    event: eventName,
    page_offer: "sprint_visibilidad_ia",
    ...details,
  });
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

function updateStickyCta() {
  if (!stickyCta) return;
  const shouldShow = !heroCtaVisible && !finalCtaVisible && !dialog?.open;
  stickyCta.hidden = false;
  stickyCta.classList.toggle("is-visible", shouldShow);
}

function openDialog(event) {
  lastTrigger = event.currentTarget;
  trackEvent("lp_cta_click", {
    cta_location: lastTrigger.dataset.ctaLocation || "unknown",
    ...campaign,
  });

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

document.querySelectorAll(".js-open-form").forEach((button) => {
  button.addEventListener("click", openDialog);
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", closeDialog);
});

dialog?.addEventListener("close", () => {
  dialog.classList.remove("is-fallback-modal");
  document.body.classList.remove("dialog-open");
  updateStickyCta();
  lastTrigger?.focus();
});

dialog?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog();
    return;
  }

  if (event.key === "Tab" && dialog.classList.contains("is-fallback-modal")) {
    const focusable = [...dialog.querySelectorAll("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])")]
      .filter((element) => !element.disabled && !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
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
  form.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
  });
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

  const website = String(data.get("website") || "").trim();
  if (!website) {
    errors.website = "Escribe el sitio web de tu negocio.";
  } else {
    try {
      const parsed = new URL(website);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
    } catch {
      errors.website = "Usa una URL completa, por ejemplo: https://tu-negocio.mx";
    }
  }

  if (!String(data.get("market") || "").trim()) errors.market = "Escribe tu ciudad o mercado principal.";

  const whatsapp = String(data.get("whatsapp") || "").trim();
  if (!whatsapp) {
    errors.whatsapp = "Escribe tu número de WhatsApp.";
  } else if (whatsapp.replace(/\D/g, "").length < 7) {
    errors.whatsapp = "Revisa el número de WhatsApp.";
  }

  if (!data.get("buying_authority")) errors.buying_authority = "Selecciona una opción.";
  if (!data.get("implementation_intent")) errors.implementation_intent = "Confirma tu intención de implementación.";
  if (!data.get("terms_acknowledgment")) errors.terms_acknowledgment = "Confirma que revisaste el precio y los términos.";

  Object.entries(errors).forEach(([name, message]) => showFieldError(name, message));

  if (Object.keys(errors).length) {
    const firstName = Object.keys(errors)[0];
    const firstField = form.elements.namedItem(firstName);
    const focusTarget = firstField instanceof RadioNodeList ? firstField[0] : firstField;
    focusTarget?.focus();
    return false;
  }

  return true;
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
  trackEvent("form_start", { form_name: "chequeo_express", ...campaign });
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

    trackEvent("form_submit", { form_name: "chequeo_express", ...campaign });
    trackEvent("generate_lead", { form_name: "chequeo_express", currency: "MXN", value: 12900, ...campaign });

    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", { content_name: "Chequeo Express de Visibilidad IA" });
    }

    showConfirmation();
  } catch (error) {
    formStatus.textContent = "No pudimos enviar tu solicitud. Tus datos siguen aquí; revisa tu conexión e inténtalo de nuevo.";
    console.error("Qualification form submission failed:", error);
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

form?.addEventListener("change", (event) => {
  const field = event.target;
  if (!field.name) return;
  const error = document.getElementById(`${field.name}-error`);
  if (error) error.textContent = "";
  field.removeAttribute("aria-invalid");
});

document.querySelectorAll(".faq details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    trackEvent("faq_open", { faq_question: item.querySelector("summary")?.textContent.trim() || "unknown" });
  });
});

if ("IntersectionObserver" in window && heroCta && finalCta) {
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === heroCta) heroCtaVisible = entry.isIntersecting;
      if (entry.target === finalCta) finalCtaVisible = entry.isIntersecting;
    });
    updateStickyCta();
  }, { threshold: 0.12 });

  visibilityObserver.observe(heroCta);
  visibilityObserver.observe(finalCta);
}

const header = document.querySelector("[data-header]");
function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 10);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

trackEvent("view_landing", { ...campaign });
