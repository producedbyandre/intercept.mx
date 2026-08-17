document.documentElement.classList.add("js");

const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CAMPAIGN_STORAGE_KEY = "intercept_visibilidad_ia_campaign";
const form = document.querySelector("[data-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = form?.querySelector("[type='submit']");
const confirmation = document.querySelector("[data-confirmation]");
const header = document.querySelector("[data-header]");

let formStarted = false;
let isSubmitting = false;

function trackEvent(eventName, details = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, page_offer: "diagnostico_express", ...details });
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
    // El formulario sigue funcionando si sessionStorage no está disponible.
  }

  CAMPAIGN_KEYS.forEach((key) => {
    const input = form?.elements.namedItem(key);
    if (input) input.value = campaign[key] || "";
  });

  return campaign;
}

const campaign = captureCampaign();

document.querySelectorAll("[data-track-cta]").forEach((cta) => {
  cta.addEventListener("click", () => {
    trackEvent("lp_cta_click", {
      cta_location: cta.dataset.ctaLocation || "unknown",
      cta_destination: cta.getAttribute("href") || "unknown",
      ...campaign,
    });
  });
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
  if (!String(data.get("company") || "").trim()) errors.company = "Escribe el nombre de tu empresa.";

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

  if (!String(data.get("priority") || "").trim()) errors.priority = "Escribe el producto o servicio que quieres priorizar.";
  if (!data.get("investment_intent")) errors.investment_intent = "Selecciona una opción.";
  if (!data.get("implementation_intent")) errors.implementation_intent = "Selecciona una opción.";
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
  payload.terms_acknowledgment = data.has("terms_acknowledgment");
  payload.page_url = window.location.href;
  payload.referrer = document.referrer;
  payload.submitted_at = new Date().toISOString();
  payload.submission_id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return payload;
}

form?.addEventListener("input", () => {
  if (formStarted) return;
  formStarted = true;
  trackEvent("form_start", { form_name: "diagnostico_express", ...campaign });
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
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
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

    trackEvent("diagnostico_express_submit", { form_name: "diagnostico_express", ...campaign });
    trackEvent("form_submit", { form_name: "diagnostico_express", ...campaign });
    trackEvent("generate_lead", { form_name: "diagnostico_express", currency: "MXN", value: 12900, ...campaign });

    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", { content_name: "Revisión Inicial de Visibilidad IA" });
    }

    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
    window.setTimeout(() => window.location.assign("/visibilidad-ia/gracias/"), 350);
  } catch (error) {
    formStatus.textContent = "No pudimos enviar tu solicitud. Tus datos siguen aquí; revisa tu conexión e inténtalo de nuevo.";
    console.error("Revisión Inicial form submission failed:", error);
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
document.querySelectorAll("[data-year]").forEach((element) => { element.textContent = new Date().getFullYear(); });
trackEvent("view_landing", { ...campaign });
