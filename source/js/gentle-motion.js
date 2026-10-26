// Progressive enhancement: content stays visible if motion or JavaScript is unavailable.
(() => {
  function init() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const candidates = document.querySelectorAll('.post-card, .notebook-section, .post-block, #page, #archive, #tag, #category');
    if ('IntersectionObserver' in window && Element.prototype.animate) {
      const observer = new IntersectionObserver(entries => {
        let index = 0;
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          if (reduced.matches) return;
          entry.target.animate([
            { opacity: 0, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 650, delay: Math.min(index++ * 85, 255), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' });
        });
      }, { threshold: 0.06 });
      candidates.forEach(el => observer.observe(el));
      reduced.addEventListener('change', () => {
        if (reduced.matches) {
          observer.disconnect();
          document.getAnimations().forEach(animation => animation.cancel());
        }
      }, { once: true });
    }
    const article = document.querySelector('.post-block');
    if (!article) return;
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
    let pending = false;
    const update = () => {
      const bounds = article.getBoundingClientRect();
      const distance = bounds.height - window.innerHeight;
      const fraction = distance <= 0 ? 1 : Math.max(0, Math.min(1, -bounds.top / distance));
      progress.style.transform = `scaleX(${fraction})`;
      pending = false;
    };
    window.addEventListener('scroll', () => {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
