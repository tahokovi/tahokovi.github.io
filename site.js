/* tahokovi.github.io — hash router + command strip ("The Pipe" design).
   The command is a transition, never the control: links work without any of this. */
(function () {
  "use strict";

  var VIEWS = {
    home:     { hash: "top", fn: "home", label: "Home" },
    research: { hash: "research", fn: "research", label: "Research" },
    about:    { hash: "about", fn: "about", label: "About" },
    cv:       { hash: "cv", fn: "cv", label: "Curriculum vitae" },
    contact:  { hash: "contact", fn: "contact", label: "Contact" }
  };

  var FILTERS = {
    all:       { cmd: null, say: "Showing all research." },
    authored:  { arg: "authored", say: "Showing authored work." },
    progress:  { arg: "in progress", say: "Showing works in progress." },
    supported: { arg: "supported", say: "Showing research assistance." }
  };

  var body = document.body;
  var cmdEl = document.querySelector(".console .cmd");
  var statusEl = document.getElementById("route-status");
  var research = document.getElementById("research");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-view-link]"));
  var motionOK = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  var typeToken = 0;
  var internalHash = null;

  /* Router hashes are slash-prefixed ("#/research") so the browser never
     auto-scrolls to the section and hides the masthead + command strip.
     Bare ids ("#research", from the skip link or no-JS bookmarks) still work. */
  function parseHash(h) {
    var id = (h || "").replace(/^#\/?/, "");
    if (!id || id === "top") return "home";
    return VIEWS.hasOwnProperty(id) ? id : "home";
  }

  function cmdMarkup(view) {
    return 'site |> <span class="fn">' + VIEWS[view].fn + "</span>()";
  }
  function cmdText(view) {
    return "site |> " + VIEWS[view].fn + "()";
  }

  function setConsole(view, showHomeCommand) {
    if (view === "home" && !showHomeCommand) {
      cmdEl.textContent = "";
      return;
    }
    cmdEl.innerHTML = cmdMarkup(view);
  }

  function typeInto(text, done) {
    var token = ++typeToken;
    var i = 0;
    var step = Math.max(8, Math.min(16, 340 / text.length));
    cmdEl.classList.add("typing");
    (function tick() {
      if (token !== typeToken) return; /* interrupted */
      i += 1;
      cmdEl.textContent = text.slice(0, i);
      if (i < text.length) {
        window.setTimeout(tick, step);
      } else {
        cmdEl.classList.remove("typing");
        done();
      }
    })();
  }

  function applyView(view, opts) {
    opts = opts || {};
    body.setAttribute("data-view", view);
    navLinks.forEach(function (a) {
      var isCurrent = a.getAttribute("data-view-link") === view && view !== "home";
      if (isCurrent) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    setConsole(view, opts.showCommand);
    if (view !== "home") {
      var section = document.getElementById(view);
      if (opts.animate && motionOK) {
        section.classList.remove("entering");
        void section.offsetWidth;
        section.classList.add("entering");
        window.setTimeout(function () { section.classList.remove("entering"); }, 500);
      }
      if (opts.focus) {
        var heading = section.querySelector("h2");
        if (heading) heading.focus({ preventScroll: true });
      }
      statusEl.textContent = VIEWS[view].label + " — opened.";
    } else {
      statusEl.textContent = "Home.";
    }
  }

  function commit(view, opts) {
    var target = view === "home" ? "/" : "/" + VIEWS[view].hash;
    if (window.location.hash.replace(/^#/, "") !== target) {
      internalHash = view;
      window.location.hash = target;
    }
    applyView(view, opts);
    window.scrollTo({ top: 0, behavior: motionOK ? "smooth" : "auto" });
  }

  function goto(view) {
    typeToken += 1; /* interrupt any in-flight command */
    cmdEl.classList.remove("typing");
    /* An explicit navigation click always runs the command, including
       revisits and clicks on the section that is already open. */
    if (motionOK) {
      typeInto(cmdText(view), function () {
        cmdEl.innerHTML = cmdMarkup(view); /* the function name "runs" */
        commit(view, { focus: view !== "home", animate: true, showCommand: true });
      });
    } else {
      commit(view, { focus: view !== "home", animate: true, showCommand: true });
    }
  }

  navLinks.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      goto(a.getAttribute("data-view-link"));
    });
  });

  window.addEventListener("hashchange", function () {
    var view = parseHash(window.location.hash);
    if (internalHash === view) { internalHash = null; return; }
    typeToken += 1;
    cmdEl.classList.remove("typing");
    /* a bare id means the skip link or a typed anchor: focus the heading */
    var bareId = /^#[a-z]/.test(window.location.hash);
    applyView(view, { focus: bareId && view !== "home", animate: true });
  });

  /* Research filters extend the pipe */
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filters button"));
  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-filter");
      filterButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      if (key === "all") {
        research.removeAttribute("data-filter");
        setConsole("research");
      } else {
        research.setAttribute("data-filter", key);
        cmdEl.innerHTML = 'research() |> <span class="fn">subset</span>(type == "' + FILTERS[key].arg + '")';
      }
      statusEl.textContent = FILTERS[key].say;
    });
  });

  /* Initial route: deep links open instantly, no typing, no focus steal */
  applyView(parseHash(window.location.hash), { focus: false, animate: false });
})();
