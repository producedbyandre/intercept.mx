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

  const prompts = [
    "¿Qué empresas de seguridad recomiendas en CDMX?",
    "¿Cuáles son las mejores proteínas vegetales en México?",
    "¿Qué software recomiendas para administrar una pyme?",
  ];
  let promptIndex = 0;

  function animatePrompt() {
    const prompt = prompts[promptIndex];
    query.textContent = "";
    aiDemo.classList.remove("is-complete");
    aiDemo.classList.add("is-animating", "is-typing");

    window.requestAnimationFrame((startTime) => {
      function type(currentTime) {
        const progress = Math.min((currentTime - startTime) / 1450, 1);
        query.textContent = prompt.slice(0, Math.ceil(prompt.length * progress));

        if (progress < 1) {
          window.requestAnimationFrame(type);
          return;
        }

        aiDemo.classList.remove("is-typing");
        window.setTimeout(() => {
          aiDemo.classList.remove("is-animating");
          aiDemo.classList.add("is-complete");
          promptIndex = (promptIndex + 1) % prompts.length;
          window.setTimeout(animatePrompt, 3400);
        }, 900);
      }

      window.requestAnimationFrame(type);
    });
  }

  animatePrompt();
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
