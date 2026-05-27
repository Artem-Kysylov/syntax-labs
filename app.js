(() => {
  'use strict';

  const isTouchDevice = () =>
    window.matchMedia('(max-width: 768px)').matches ||
    ('ontouchstart' in window);

  if (!isTouchDevice()) return;

  const cards = document.querySelectorAll('.bento-card');

  if (!cards.length) return;

  /*
   * rootMargin: negative top/bottom margins shrink the detection zone
   * to the central ~40% of the viewport — the natural reading focus
   * on mobile. Cards glow as they scroll into this sweet spot and
   * fade as they leave it.
   */
  const focusObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        } else {
          entry.target.classList.remove('in-view');
        }
      });
    },
    {
      root: null,
      rootMargin: '-28% 0px -28% 0px',
      threshold: 0,
    }
  );

  cards.forEach((card) => focusObserver.observe(card));
})();
