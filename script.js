document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");
const aiDemo = document.querySelector("[data-ai-demo]");

if (year) year.textContent = new Date().getFullYear();

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactViewport = window.matchMedia("(max-width: 900px)").matches;

function initAiDemo() {
  if (!aiDemo || reduceMotion || compactViewport) return;

  const query = aiDemo.querySelector("[data-ai-query]");
  if (!query) return;

  const fullText = query.textContent.trim();
  query.textContent = "";
  aiDemo.classList.add("is-animating", "is-typing");

  window.requestAnimationFrame((startTime) => {
    function type(currentTime) {
      const progress = Math.min((currentTime - startTime) / 1450, 1);
      query.textContent = fullText.slice(0, Math.ceil(fullText.length * progress));

      if (progress < 1) {
        window.requestAnimationFrame(type);
        return;
      }

      aiDemo.classList.remove("is-typing");
      window.setTimeout(() => {
        aiDemo.classList.remove("is-animating");
        aiDemo.classList.add("is-complete");
      }, 900);
    }

    window.requestAnimationFrame(type);
  });
}

initAiDemo();

const revealElements = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

  revealElements.forEach((element) => observer.observe(element));
}
