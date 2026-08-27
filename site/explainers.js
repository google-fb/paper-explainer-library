(function () {
  var catalog = window.EXPLAINERS_CATALOG || { papers: [] };
  var papers = catalog.papers || [];
  var bySlug = {};
  papers.forEach(function (paper) {
    bySlug[paper.slug] = paper;
  });

  var page = document.body;
  var shelfEl = document.getElementById("shelf-grid");
  var emptyEl = document.getElementById("shelf-empty");
  var countEl = document.getElementById("shelf-count");
  var searchEl = document.getElementById("library-search");
  var readerTitle = document.getElementById("reader-title");
  var readerSubtitle = document.getElementById("reader-subtitle");
  var readerImg = document.getElementById("reader-slide");
  var readerCounter = document.getElementById("reader-counter");
  var thumbsEl = document.getElementById("reader-thumbs");
  var notesEl = document.getElementById("reader-notes");
  var prevBtns = document.querySelectorAll("[data-reader-prev]");
  var nextBtns = document.querySelectorAll("[data-reader-next]");
  var closeBtns = document.querySelectorAll("[data-reader-close]");

  var state = { slug: null, index: 0, lastFocus: null };
  var HASH_RE = /^#\/([^/]+)(?:\/(\d+))?\/?$/;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseHash() {
    var match = HASH_RE.exec(location.hash || "");
    if (!match) return null;
    var slug = decodeURIComponent(match[1]);
    var n = match[2] ? parseInt(match[2], 10) : 1;
    if (!bySlug[slug]) return null;
    if (!n || n < 1) n = 1;
    if (n > bySlug[slug].slides.length) n = bySlug[slug].slides.length;
    return { slug: slug, index: n - 1 };
  }

  function setHash(slug, index, replace) {
    var next = "#/" + encodeURIComponent(slug) + "/" + (index + 1);
    if (location.hash === next) return;
    if (replace && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search + next);
    } else {
      location.hash = next;
    }
  }

  function clearHash() {
    if (history.pushState) {
      history.pushState("", document.title, location.pathname + location.search);
    } else {
      location.hash = "";
    }
  }

  function matchesQuery(paper, query) {
    if (!query) return true;
    var hay = [paper.title, paper.short_title, paper.takeaway, paper.slug]
      .join(" ")
      .toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function renderShelf() {
    var query = ((searchEl && searchEl.value) || "").trim().toLowerCase();
    var shown = papers.filter(function (paper) {
      return matchesQuery(paper, query);
    });
    if (countEl) {
      countEl.textContent = query
        ? "找到 " + shown.length + " / " + papers.length + " 篇"
        : "書架上有 " + papers.length + " 篇圖解";
    }
    if (!shelfEl) return;
    if (!shown.length) {
      shelfEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    shelfEl.innerHTML = shown
      .map(function (paper) {
        var subtitle =
          paper.short_title && paper.short_title !== paper.title
            ? '<p class="book-subtitle">' + escapeHtml(paper.title) + "</p>"
            : "";
        return (
          '<li>' +
          '<a class="book-card" href="#/' +
          encodeURIComponent(paper.slug) +
          '/1" aria-label="開啟《' +
          escapeHtml(paper.short_title || paper.title) +
          "》閱覽室，共 " +
          paper.slide_count +
          ' 張投影片">' +
          '<div class="book-cover">' +
          '<img src="' +
          escapeHtml(paper.cover) +
          '" alt="" width="640" height="360" loading="lazy">' +
          '<span class="book-badge">' +
          paper.slide_count +
          " 張</span>" +
          "</div>" +
          '<div class="book-body">' +
          "<h2>" +
          escapeHtml(paper.short_title || paper.title) +
          "</h2>" +
          subtitle +
          (paper.takeaway
            ? '<p class="book-takeaway">' + escapeHtml(paper.takeaway) + "</p>"
            : "") +
          '<div class="book-go">打開閱覽室 →</div>' +
          "</div>" +
          "</a>" +
          "</li>"
        );
      })
      .join("");
  }

  function preload(url) {
    if (!url) return;
    var img = new Image();
    img.src = url;
  }

  function renderThumbs(paper, index) {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = paper.slides
      .map(function (src, i) {
        return (
          '<button type="button" class="reader-thumb" data-thumb-index="' +
          i +
          '" aria-label="第 ' +
          (i + 1) +
          " 張，共 " +
          paper.slide_count +
          ' 張" aria-current="' +
          (i === index ? "true" : "false") +
          '">' +
          '<img src="' +
          escapeHtml(src) +
          '" alt="" width="160" height="90" loading="lazy">' +
          "</button>"
        );
      })
      .join("");
    var current = thumbsEl.querySelector('[aria-current="true"]');
    if (current && current.scrollIntoView) {
      current.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }

  function renderReader(paper, index) {
    var title = paper.short_title || paper.title;
    if (readerTitle) readerTitle.textContent = title;
    if (readerSubtitle) {
      readerSubtitle.textContent =
        paper.short_title && paper.short_title !== paper.title ? paper.title : "";
      readerSubtitle.hidden = !readerSubtitle.textContent;
    }
    if (readerImg) {
      readerImg.src = paper.slides[index];
      readerImg.alt = title + " 第 " + (index + 1) + " 張，共 " + paper.slide_count + " 張";
    }
    if (readerCounter) {
      readerCounter.textContent = index + 1 + " / " + paper.slide_count;
    }
    prevBtns.forEach(function (btn) {
      btn.disabled = index <= 0;
    });
    nextBtns.forEach(function (btn) {
      btn.disabled = index >= paper.slide_count - 1;
    });
    if (notesEl) {
      if (paper.html_href) {
        notesEl.innerHTML =
          '<a class="reader-link" href="' +
          escapeHtml(paper.html_href) +
          '">開啟對應精讀頁 →</a>';
        notesEl.hidden = false;
      } else {
        notesEl.innerHTML = "";
        notesEl.hidden = true;
      }
    }
    renderThumbs(paper, index);
    document.title = title + " · 圖解圖書館 · Tuco 論文改進調查";
    preload(paper.slides[index + 1]);
    preload(paper.slides[index - 1]);
  }

  function openReader(slug, index) {
    var paper = bySlug[slug];
    if (!paper) return closeReader(true);
    var wasOpen = page.classList.contains("is-reading");
    if (!wasOpen) state.lastFocus = document.activeElement;
    state.slug = slug;
    state.index = index;
    page.classList.add("is-reading");
    if (document.getElementById("content")) {
      document.getElementById("content").setAttribute("aria-hidden", "true");
    }
    var reader = document.getElementById("reader");
    if (reader) reader.removeAttribute("aria-hidden");
    renderReader(paper, index);
    var closeBtn = document.getElementById("reader-close");
    if (closeBtn && !wasOpen) closeBtn.focus();
  }

  function closeReader(replaceHash) {
    state.slug = null;
    state.index = 0;
    page.classList.remove("is-reading");
    if (document.getElementById("content")) {
      document.getElementById("content").removeAttribute("aria-hidden");
    }
    var reader = document.getElementById("reader");
    if (reader) reader.setAttribute("aria-hidden", "true");
    document.title = "圖解圖書館 · Tuco 論文改進調查";
    if (location.hash) {
      if (replaceHash && history.replaceState) {
        history.replaceState("", document.title, location.pathname + location.search);
      } else {
        clearHash();
      }
    }
    if (state.lastFocus && state.lastFocus.focus) {
      state.lastFocus.focus();
    }
  }

  function go(delta) {
    if (!state.slug) return;
    var paper = bySlug[state.slug];
    var next = state.index + delta;
    if (next < 0 || next >= paper.slides.length) return;
    setHash(state.slug, next);
  }

  function syncFromLocation() {
    var parsed = parseHash();
    if (!parsed) {
      if (page.classList.contains("is-reading")) closeReader(true);
      return;
    }
    openReader(parsed.slug, parsed.index);
  }

  if (shelfEl) renderShelf();
  if (searchEl) {
    searchEl.addEventListener("input", renderShelf);
  }
  if (thumbsEl) {
    thumbsEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-thumb-index]");
      if (!btn || !state.slug) return;
      setHash(state.slug, parseInt(btn.getAttribute("data-thumb-index"), 10));
    });
  }
  prevBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(-1);
    });
  });
  nextBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      go(1);
    });
  });
  closeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeReader(false);
    });
  });
  if (readerImg) {
    readerImg.addEventListener("click", function () {
      go(1);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!page.classList.contains("is-reading")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeReader(false);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  });

  window.addEventListener("hashchange", syncFromLocation);
  window.addEventListener("popstate", syncFromLocation);
  syncFromLocation();
})();
