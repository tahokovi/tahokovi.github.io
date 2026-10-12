/* Small enhancements shared by the homepage and standalone CV.
   Content and ordinary navigation remain available without JavaScript. */
(function () {
  "use strict";
  var isCV = !!document.querySelector("main.cv");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function upgradeLegacyHash() {
    if (isCV) return;
    if (location.hash === "#cv" || location.hash === "#/cv") {
      location.replace("cv.html?v=20261011");
      return;
    }
    var match = /^#\/([a-z]*)$/.exec(location.hash);
    if (match) {
      var id = ["research", "about", "contact"].includes(match[1]) ? match[1] : "top";
      location.replace("#" + id);
    }
  }
  upgradeLegacyHash();
  window.addEventListener("hashchange", upgradeLegacyHash);

  var research = document.getElementById("research");
  var filters = research && research.querySelector(".filters");
  if (filters) {
    var buttons = Array.from(filters.querySelectorAll("button[data-filter]"));
    var blocks = Array.from(research.querySelectorAll(".block[data-block]"));
    var status = document.getElementById("filter-status");
    buttons.forEach(function (btn) {
      var key = btn.dataset.filter;
      var entries = key === "all" ? research.querySelectorAll(".work") :
        research.querySelectorAll('.block[data-block="' + key + '"] .work');
      var count = document.createElement("span");
      count.className = "filter-count";
      count.textContent = entries.length;
      btn.appendChild(document.createTextNode(" "));
      btn.appendChild(count);
      btn.addEventListener("click", function () {
        if (btn.getAttribute("aria-pressed") === "true") return;
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        if (key === "all") research.removeAttribute("data-filter");
        else research.dataset.filter = key;
        status.textContent = btn.dataset.status.replace(/\.$/, "") + ": " + entries.length +
          (entries.length === 1 ? " entry." : " entries.");
        blocks.forEach(function (block) { block.classList.remove("is-entering"); });
        if (!reducedMotion.matches) {
          // Restart only the short, user-triggered reveal; default content is visible.
          void research.offsetWidth;
          blocks.filter(function (block) { return key === "all" || block.dataset.block === key; })
            .forEach(function (block, i) {
              block.style.setProperty("--i", i);
              block.classList.add("is-entering");
            });
        }
        window.dispatchEvent(new Event("resize"));
      });
    });
    blocks.forEach(function (block) {
      block.addEventListener("animationend", function () { block.classList.remove("is-entering"); });
    });
    filters.hidden = false;
  }

  // At most one update per rendered frame, and only after scrolling or layout changes.
  // Reading the handful of section positions also handles open disclosures and filter changes.
  document.querySelectorAll("nav[data-spy]").forEach(function (nav) {
    var links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    var items = links.map(function (link) {
      return { link: link, section: document.getElementById(link.hash.slice(1)) };
    }).filter(function (item) { return item.section; });
    if (!items.length) return;
    var pending = false;
    var destination = null;
    var settleTimer;

    function showCurrent(item) {
      items.forEach(function (entry) {
        if (entry === item) entry.link.setAttribute("aria-current", "location");
        else entry.link.removeAttribute("aria-current");
      });
      if (item) {
        nav.dataset.active = item.section.id;
        var rect = item.link.getBoundingClientRect();
        nav.style.setProperty("--y", (rect.top - nav.getBoundingClientRect().top + rect.height / 2 - 3) + "px");
      } else nav.removeAttribute("data-active");
    }
    function update() {
      pending = false;
      if (destination) { showCurrent(destination); return; }
      var current = null;
      var line = innerHeight * 0.3;
      items.forEach(function (item) {
        if (item.section.getBoundingClientRect().top <= line) current = item;
      });
      // Contact cannot reach the reading line on shorter pages; page end still selects it.
      if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 3) {
        current = items[items.length - 1];
      }
      showCurrent(current);
    }
    function schedule() {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }
    function release() { clearTimeout(settleTimer); destination = null; schedule(); }
    window.addEventListener("scroll", function () {
      schedule();
      if (destination) { clearTimeout(settleTimer); settleTimer = setTimeout(release, 160); }
    }, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pageshow", schedule);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", function (event) {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) release();
    });
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.querySelector("main"));
    document.fonts.ready.then(schedule);

    // Also cover the introductory Research link, not just the navigation menu.
    document.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search) return;
      var item = items.find(function (entry) { return entry.link.hash === link.hash; });
      if (!item) return;
      destination = item;
      showCurrent(item);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(release, 1500);
      if (location.hash === link.hash && !reducedMotion.matches) {
        var heading = item.section.querySelector("h2");
        heading.style.animation = "none";
        void heading.offsetWidth;
        heading.style.animation = "";
      }
    });
    schedule();
  });
})();
