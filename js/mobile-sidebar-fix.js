/* Mobile sidebar: close/minimize when tapping outside or selecting a page. */
(function () {
  'use strict';

  const MOBILE_MAX = 900;
  let backdrop = null;

  const isMobile = () => window.matchMedia(`(max-width:${MOBILE_MAX}px)`).matches;
  const sidebar = () => document.querySelector('.sidebar');
  const menu = () => document.querySelector('#menu');

  function ensureBackdrop() {
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'pmMobileSidebarBackdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeSidebar);
    return backdrop;
  }

  function openSidebar() {
    const el = sidebar();
    if (!el || !isMobile()) return;
    el.classList.add('open');
    ensureBackdrop().classList.add('show');
    document.body.classList.add('pm-sidebar-open');
    menu()?.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    const el = sidebar();
    if (!el) return;
    el.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('pm-sidebar-open');
    menu()?.setAttribute('aria-expanded', 'false');
  }

  function toggleSidebar() {
    const el = sidebar();
    if (!el || !isMobile()) return;
    el.classList.contains('open') ? closeSidebar() : openSidebar();
  }

  function install() {
    ensureBackdrop();

    // Capture the menu button so no other script can leave the drawer stuck open.
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('#menu')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleSidebar();
        return;
      }

      // Selecting any navigation item should immediately minimize the drawer.
      if (target.closest('.sidebar .nav')) {
        closeSidebar();
        return;
      }

      // On mobile, tapping the content area/header (outside the drawer) closes it.
      const el = sidebar();
      if (isMobile() && el?.classList.contains('open') && !target.closest('.sidebar')) {
        closeSidebar();
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSidebar();
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) closeSidebar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  window.pmOpenSidebar = openSidebar;
  window.pmCloseSidebar = closeSidebar;
})();
