/* tahokovi.github.io — small enhancements for the single-page site.
   Every section and link works without this file. */
(function () {
  "use strict";

  var SECTIONS = ["research", "about", "contact"];

  /* The earlier JavaScript-routed site used "#/research"-style hashes,
     and "#/" for home. Rewrite them to the ordinary anchors in place, so
     old links and bookmarks land on the right section without adding a
     history entry. */
  function upgradeLegacyHash() {
    if (window.location.hash === "#cv" || window.location.hash === "#/cv") {
      // Use a fresh cache key: the old cv.html redirects back to #cv.
      window.location.replace("cv.html?v=20261011");
      return;
    }
    var match = /^#\/([a-z]*)$/.exec(window.location.hash);
    if (!match) return;
    var id = SECTIONS.indexOf(match[1]) >= 0 ? match[1] : "top";
    window.location.replace("#" + id);
  }
  upgradeLegacyHash();
  window.addEventListener("hashchange", upgradeLegacyHash);

  /* Research filters: hidden in the HTML, shown only when this script runs. */
  var research = document.getElementById("research");
  var filters = research && research.querySelector(".filters");
  var status = document.getElementById("filter-status");
  if (!filters) return;

  var buttons = Array.prototype.slice.call(filters.querySelectorAll("button[data-filter]"));
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-filter");
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      if (key === "all") research.removeAttribute("data-filter");
      else research.setAttribute("data-filter", key);
      status.textContent = btn.getAttribute("data-status");
    });
  });
  filters.hidden = false;
})();
