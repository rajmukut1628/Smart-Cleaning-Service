export function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 0;
  // Explicit positioning avoids adding scroll-padding and scroll-margin together.
  window.scrollTo({
    top: Math.max(0, section.getBoundingClientRect().top + window.scrollY - headerHeight - 8),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}
