let copyTimeout;

document.addEventListener("DOMContentLoaded", function () {
  initHeaderState();
  initMenuToggle();
  initBlogFilters();
  initVisitCounter();
  initEmailCopy();
  initCodeCopy();
});

function initVisitCounter() {
  const footerMeta = document.querySelector(".footer .copyright");
  if (!footerMeta) return;

  const counter = document.createElement("div");
  counter.className = "visit-counter";
  counter.setAttribute("aria-live", "polite");
  counter.innerHTML = `
    <span class="visit-counter-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 5C6.5 5 2.03 8.11.25 12c1.78 3.89 6.25 7 11.75 7s9.97-3.11 11.75-7C21.97 8.11 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"></path>
      </svg>
    </span>
    <div class="visit-counter-label">Total</div>
    <div class="visit-counter-value" data-visit="total">...</div>
    <div class="visit-counter-divider" aria-hidden="true"></div>
    <div class="visit-counter-label">This page</div>
    <div class="visit-counter-value" data-visit="page">...</div>
  `;
  footerMeta.appendChild(counter);

  const totalEl = counter.querySelector('[data-visit="total"]');
  const pageEl = counter.querySelector('[data-visit="page"]');
  if (!totalEl || !pageEl) return;

  const hostname = (window.location.hostname || "local").toLowerCase();
  const namespace = `phantoan-${hostname.replace(/[^a-z0-9-]/g, "-") || "site"}`;
  const path = (window.location.pathname || "/").toLowerCase();
  const pageKey = `page-${path.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "home"}`;

  const formatCount = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "--";
    return new Intl.NumberFormat("en-US").format(value);
  };

  const updateCount = async (key, target) => {
    const endpoint = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      target.textContent = formatCount(payload && payload.value);
    } catch (_) {
      target.textContent = "--";
    }
  };

  updateCount("total-visits", totalEl);
  updateCount(pageKey, pageEl);
}

function initBlogFilters() {
  const blogList = document.querySelector(".blog .blog-list");
  const tagFilter = document.querySelector(".blog-filter-toolbar .blog-tag-filter");
  const sortFilter = document.querySelector(".blog-filter-toolbar .blog-sort-filter");
  if (!blogList || !tagFilter || !sortFilter) return;

  const items = Array.from(blogList.querySelectorAll(".item"));
  const tagLinks = Array.from(tagFilter.querySelectorAll(".blog-tag[data-tag]"));
  const sortLinks = Array.from(sortFilter.querySelectorAll(".blog-sort-chip[data-sort]"));
  if (!items.length || !tagLinks.length || !sortLinks.length) return;

  const allowedSortValues = new Set(["newest", "oldest"]);
  const url = new URL(window.location.href);
  let activeTag = (url.searchParams.get("tag") || "all").trim();
  let activeSort = (url.searchParams.get("sort") || "newest").trim();

  if (!tagLinks.some((link) => link.dataset.tag === activeTag)) {
    activeTag = "all";
  }
  if (!allowedSortValues.has(activeSort)) {
    activeSort = "newest";
  }

  const parseDate = (value) => {
    const source = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return null;
    const parsed = new Date(`${source}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const itemTags = (item) => {
    const raw = item.getAttribute("data-tags") || "";
    return raw
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  };

  const itemDate = (item) => {
    const fromData = parseDate(item.getAttribute("data-date"));
    if (fromData) return fromData;
    const fromText = item.querySelector(".info-time")?.textContent || "";
    return parseDate(fromText);
  };

  const setActiveTagUI = () => {
    tagLinks.forEach((link) => {
      const isActive = link.dataset.tag === activeTag;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "true" : "false");
    });
  };

  const setActiveSortUI = () => {
    sortLinks.forEach((link) => {
      const isActive = link.dataset.sort === activeSort;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "true" : "false");
    });
  };

  const syncTagHrefs = () => {
    tagLinks.forEach((link) => {
      const tag = (link.dataset.tag || "all").trim();
      const target = new URL(window.location.pathname, window.location.origin);
      if (tag !== "all") target.searchParams.set("tag", tag);
      if (activeSort !== "newest") target.searchParams.set("sort", activeSort);
      link.setAttribute("href", `${target.pathname}${target.search}`);
    });
  };

  const syncSortHrefs = () => {
    sortLinks.forEach((link) => {
      const sort = (link.dataset.sort || "newest").trim();
      const target = new URL(window.location.pathname, window.location.origin);
      if (activeTag !== "all") target.searchParams.set("tag", activeTag);
      if (sort !== "newest") target.searchParams.set("sort", sort);
      link.setAttribute("href", `${target.pathname}${target.search}`);
    });
  };

  const sortItemsByDate = () => {
    const sorted = [...items].sort((a, b) => {
      const aDate = itemDate(a);
      const bDate = itemDate(b);
      const aTime = aDate ? aDate.getTime() : 0;
      const bTime = bDate ? bDate.getTime() : 0;
      if (activeSort === "oldest") return aTime - bTime;
      return bTime - aTime;
    });

    sorted.forEach((item) => {
      blogList.appendChild(item);
    });
  };

  const applyFilters = () => {
    sortItemsByDate();

    items.forEach((item) => {
      const tags = itemTags(item);
      const matchesTag = activeTag === "all" || tags.includes(activeTag);
      item.hidden = !matchesTag;
    });

    setActiveTagUI();
    setActiveSortUI();
    syncTagHrefs();
    syncSortHrefs();

    const next = new URL(window.location.href);
    if (activeTag === "all") {
      next.searchParams.delete("tag");
    } else {
      next.searchParams.set("tag", activeTag);
    }
    if (activeSort === "newest") {
      next.searchParams.delete("sort");
    } else {
      next.searchParams.set("sort", activeSort);
    }
    const nextUrl = `${next.pathname}${next.search}${next.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  tagLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const clickedTag = (link.dataset.tag || "all").trim();
      activeTag = clickedTag || "all";
      applyFilters();
    });
  });

  sortLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const clickedSort = (link.dataset.sort || "newest").trim();
      activeSort = allowedSortValues.has(clickedSort) ? clickedSort : "newest";
      applyFilters();
    });
  });

  applyFilters();
}

function initHeaderState() {
  const header = document.querySelector(".head");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 12);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMenuToggle() {
  const menuExpand = document.getElementById("menu-expand");
  const menuPanel = document.getElementById("menu-panel");
  if (!menuExpand || !menuPanel) return;

  const mobileMedia = window.matchMedia("(max-width: 768px)");
  let isMenuOpen = false;

  const syncMenuPanel = () => {
    if (!mobileMedia.matches) {
      isMenuOpen = false;
      menuPanel.hidden = true;
      menuPanel.classList.remove("is-open");
      return;
    }

    menuPanel.hidden = !isMenuOpen;
    menuPanel.classList.toggle("is-open", isMenuOpen);
  };

  const openMenu = () => {
    isMenuOpen = true;
    menuExpand.classList.add("active");
    syncMenuPanel();
  };

  const closeMenu = () => {
    isMenuOpen = false;
    menuExpand.classList.remove("active");
    syncMenuPanel();
  };

  menuExpand.addEventListener("click", function (event) {
    event.stopPropagation();
    if (isMenuOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  menuPanel.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    if (isMenuOpen) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isMenuOpen) {
      closeMenu();
    }
  });

  window.addEventListener("resize", syncMenuPanel);
  syncMenuPanel();
}

function initEmailCopy() {
  const emailText = document.getElementById("emailCopied");
  if (!emailText) return;

  const copiedHint = document.querySelector(".copied");
  const emailContainer = document.getElementById("email");

  const showCopiedState = () => {
    if (!copiedHint) return;
    clearTimeout(copyTimeout);
    copiedHint.style.opacity = "1";
    copyTimeout = setTimeout(function () {
      copiedHint.style.opacity = "0";
    }, 1200);
  };

  const copyEmail = async () => {
    const text = (emailText.textContent || "").trim();
    if (!text) return;

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {
        copied = false;
      }
    }

    if (!copied) {
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand("copy");
      document.body.removeChild(input);
    }

    if (copied) {
      showCopiedState();
    }
  };

  emailText.addEventListener("click", function (event) {
    event.preventDefault();
    copyEmail();
  });

  if (emailContainer) {
    emailContainer.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      copyEmail();
    });
  }
}

function initCodeCopy() {
  const codeBlocks = Array.from(document.querySelectorAll(".blog-markdown pre"));
  if (!codeBlocks.length) return;

  codeBlocks.forEach((pre) => {
    const codeElement = pre.querySelector("code") || pre;
    const rawCode = normalizeLineBreaks(codeElement.textContent || pre.innerText || "");
    const language = detectCodeLanguage(pre, codeElement, rawCode);
    const languageLabel = getLanguageLabel(language);

    if (rawCode) {
      codeElement.innerHTML = highlightCodeByLanguage(rawCode, language);
      codeElement.classList.add("is-syntax-highlighted");
    }

    pre.dataset.rawCode = rawCode;
    pre.dataset.codeLang = language;

    const currentParent = pre.parentElement;
    if (!currentParent || currentParent.classList.contains("code-block-wrap")) return;

    const wrapper = document.createElement("div");
    wrapper.className = `code-block-wrap code-lang-${language}`;
    currentParent.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const badge = document.createElement("span");
    badge.className = "code-lang-badge";
    badge.textContent = languageLabel;
    wrapper.appendChild(badge);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");
    button.title = "Copy code block";
    wrapper.appendChild(button);

    let buttonTimeout;

    const resetButtonState = () => {
      button.classList.remove("copied", "failed");
      button.setAttribute("aria-label", "Copy code block");
      button.title = "Copy code block";
    };

    const setButtonState = (state) => {
      clearTimeout(buttonTimeout);

      if (state === "copied") {
        button.classList.add("copied");
        button.classList.remove("failed");
        button.setAttribute("aria-label", "Copied");
        button.title = "Copied";
        buttonTimeout = setTimeout(resetButtonState, 1400);
        return;
      }

      if (state === "failed") {
        button.classList.add("failed");
        button.classList.remove("copied");
        button.setAttribute("aria-label", "Copy failed");
        button.title = "Copy failed";
        buttonTimeout = setTimeout(resetButtonState, 1400);
        return;
      }

      if (state === "empty") {
        button.classList.add("failed");
        button.classList.remove("copied");
        button.setAttribute("aria-label", "No code to copy");
        button.title = "No code to copy";
        buttonTimeout = setTimeout(resetButtonState, 1400);
        return;
      }

      resetButtonState();
    };

    const fallbackCopy = (text) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    };

    button.addEventListener("click", async () => {
      const code = pre.dataset.rawCode || pre.innerText || "";
      if (!code.trim()) {
        setButtonState("empty");
        return;
      }

      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          copied = true;
        } catch (_) {
          copied = false;
        }
      }

      if (!copied) {
        copied = fallbackCopy(code);
      }

      setButtonState(copied ? "copied" : "failed");
    });
  });
}

function normalizeLineBreaks(text) {
  return (text || "").replace(/\r\n?/g, "\n");
}

function detectCodeLanguage(pre, codeElement, sourceCode) {
  const hintedLanguage = extractLanguageHint(codeElement) || extractLanguageHint(pre);
  if (hintedLanguage) {
    return normalizeLanguageName(hintedLanguage);
  }
  return normalizeLanguageName(detectLanguageByContent(sourceCode));
}

function extractLanguageHint(element) {
  if (!element) return "";

  const directHint = element.getAttribute("data-language") || element.getAttribute("data-lang") || element.getAttribute("lang");
  if (directHint) return directHint;

  const className = element.className || "";
  const classMatch = className.match(/\b(?:language|lang)-([a-z0-9#+-]+)\b/i);
  if (classMatch && classMatch[1]) return classMatch[1];

  if (/\b(command-line|shell-session|terminal)\b/i.test(className)) return "commandline";
  return "";
}

function normalizeLanguageName(language) {
  if (!language) return "plain";
  const normalized = String(language).toLowerCase().trim().replace(/[\s_]+/g, "-");
  const compact = normalized.replace(/[^a-z]/g, "");
  const languageMap = {
    bash: "commandline",
    shell: "commandline",
    sh: "commandline",
    zsh: "commandline",
    terminal: "commandline",
    console: "commandline",
    cmd: "commandline",
    powershell: "commandline",
    ps: "commandline",
    psone: "commandline",
    commandline: "commandline",
    commandlinebash: "commandline",
    commandlinezsh: "commandline",
    commandlineps: "commandline",
    commandlinecmd: "commandline",
    commandlinepowershell: "commandline",
    commandlinefish: "commandline",
    commandlineksh: "commandline",
    "command-line": "commandline",
    "shell-session": "commandline",
    text: "plain",
    txt: "plain",
    plaintext: "plain",
    plain: "plain",
    json: "json",
    js: "javascript",
    javascript: "javascript",
    node: "javascript",
    nodejs: "javascript",
    ts: "javascript",
    typescript: "javascript",
    py: "python",
    python: "python",
    java: "java",
    html: "html",
    xml: "html",
    markup: "html",
    php: "php",
  };

  return languageMap[normalized] || languageMap[compact] || "plain";
}

function detectLanguageByContent(sourceCode) {
  const code = normalizeLineBreaks(sourceCode).trim();
  if (!code) return "plain";

  if (looksLikeJson(code)) return "json";
  if (looksLikeHtml(code)) return "html";
  if (looksLikePhp(code)) return "php";
  if (looksLikeCommandLine(code)) return "commandline";
  if (looksLikePython(code)) return "python";
  if (looksLikeJava(code)) return "java";
  if (looksLikeJavascript(code)) return "javascript";

  return "plain";
}

function looksLikeJson(code) {
  if (!code || !(code.startsWith("{") || code.startsWith("["))) return false;
  try {
    JSON.parse(code);
    return true;
  } catch (_) {
    return false;
  }
}

function looksLikeHtml(code) {
  return /<\/?[a-z][\s\S]*?>/i.test(code);
}

function looksLikePhp(code) {
  const hasPhpSignal = /<\?php|->|::|\$[a-zA-Z_]\w*/.test(code);
  const hasPhpKeywords = /\b(?:echo|function|namespace|class|public|private|protected|foreach|require|include)\b/.test(code);
  return hasPhpSignal && hasPhpKeywords;
}

function looksLikeCommandLine(code) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return false;
  if (lines.some((line) => /^\$\s+\S+/.test(line))) return true;

  let score = 0;
  lines.slice(0, 8).forEach((line) => {
    if (/^(?:\$|#|>|PS>|C:\\>)/i.test(line)) {
      score += 2;
    }

    const normalizedLine = line.replace(/^(?:\$|#|>|PS>|C:\\>)\s*/i, "");
    if (/^(?:sudo|npm|yarn|pnpm|apt|brew|git|cd|ls|mkdir|rm|cp|mv|curl|wget|docker|kubectl|python|php|java|node|adb|fastboot|ssh|chmod|chown|cat|echo|touch)\b/i.test(normalizedLine)) {
      score += 2;
    }

    if (/\s-{1,2}[a-zA-Z]/.test(normalizedLine)) {
      score += 1;
    }
  });

  return score >= 3;
}

function looksLikePython(code) {
  return /^\s*(?:def|class)\s+[A-Za-z_]\w*[\(:]/m.test(code) || /^\s*import\s+[A-Za-z_]/m.test(code) || /if __name__ == ["']__main__["']/.test(code);
}

function looksLikeJava(code) {
  const hasKeywords = /\b(?:public|private|protected|class|interface|extends|implements|static|void|new)\b/.test(code);
  const hasStructure = /[;{}]/.test(code);
  return hasKeywords && hasStructure;
}

function looksLikeJavascript(code) {
  return /\b(?:const|let|var|function|=>|console\.log|document\.|window\.|import\s+.+\s+from)\b/.test(code);
}

function getLanguageLabel(language) {
  const labels = {
    commandline: "commandLine",
    json: "json",
    python: "python",
    java: "java",
    javascript: "javascript",
    html: "html",
    php: "php",
    plain: "text",
  };
  return labels[language] || "text";
}

function highlightCodeByLanguage(sourceCode, language) {
  const escapedCode = escapeHtml(normalizeLineBreaks(sourceCode));
  switch (language) {
    case "commandline":
      return highlightCommandLine(escapedCode);
    case "json":
      return highlightJson(escapedCode);
    case "python":
      return highlightPython(escapedCode);
    case "java":
      return highlightJava(escapedCode);
    case "javascript":
      return highlightJavascript(escapedCode);
    case "html":
      return highlightHtml(escapedCode);
    case "php":
      return highlightPhp(escapedCode);
    default:
      return escapedCode;
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapToken(className, value) {
  return `<span class="${className}">${value}</span>`;
}

function applyTokenRules(code, rules) {
  let segments = [{ kind: "text", value: code }];

  rules.forEach((rule) => {
    const updatedSegments = [];
    segments.forEach((segment) => {
      if (segment.kind !== "text") {
        updatedSegments.push(segment);
        return;
      }

      const segmentText = segment.value;
      let lastIndex = 0;
      let match;
      rule.pattern.lastIndex = 0;

      while ((match = rule.pattern.exec(segmentText)) !== null) {
        const fullMatch = match[0];
        if (!fullMatch) {
          rule.pattern.lastIndex += 1;
          continue;
        }

        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
          updatedSegments.push({ kind: "text", value: segmentText.slice(lastIndex, matchIndex) });
        }

        const rendered = typeof rule.render === "function" ? rule.render(match) : wrapToken(rule.className, fullMatch);
        updatedSegments.push({ kind: "token", value: rendered });
        lastIndex = matchIndex + fullMatch.length;
      }

      if (lastIndex < segmentText.length) {
        updatedSegments.push({ kind: "text", value: segmentText.slice(lastIndex) });
      }
    });

    segments = updatedSegments;
  });

  return segments.map((segment) => segment.value).join("");
}

function highlightCommandLine(code) {
  return code
    .split("\n")
    .map((line) => highlightCommandLineLine(line))
    .join("\n");
}

function highlightCommandLineLine(line) {
  if (!line.trim()) return line;

  let remaining = line;
  let promptMarkup = "";
  let commentMarkup = "";

  const promptMatch = remaining.match(/^(\s*(?:\$|#|>|PS&gt;|PS>|C:\\\\&gt;|C:\\\\>)\s*)/i);
  if (promptMatch) {
    promptMarkup = wrapToken("tok-prompt", promptMatch[1]);
    remaining = remaining.slice(promptMatch[1].length);
  }

  const commentIndex = remaining.search(/\s#/);
  if (commentIndex !== -1) {
    commentMarkup = wrapToken("tok-comment", remaining.slice(commentIndex));
    remaining = remaining.slice(0, commentIndex);
  }

  const leadingWhitespace = (remaining.match(/^\s*/) || [""])[0];
  const commandPart = remaining.slice(leadingWhitespace.length);
  if (!commandPart) return `${promptMarkup}${leadingWhitespace}${commentMarkup}`;

  const commandMatch = commandPart.match(/^([^\s]+)/);
  if (!commandMatch) return `${promptMarkup}${leadingWhitespace}${commandPart}${commentMarkup}`;

  const commandToken = wrapToken("tok-command", commandMatch[1]);
  const rest = commandPart.slice(commandMatch[1].length);

  const highlightedRest = applyTokenRules(rest, [
    { pattern: /(&quot;.*?&quot;|&#39;.*?&#39;)/g, className: "tok-string" },
    { pattern: /\b([A-Z_][A-Z0-9_]*)(=)/g, render: (match) => `${wrapToken("tok-key", match[1])}${wrapToken("tok-operator", match[2])}` },
    { pattern: /(^|\s)(-{1,2}[a-zA-Z0-9][\w-]*)/g, render: (match) => `${match[1]}${wrapToken("tok-option", match[2])}` },
    { pattern: /(^|\s)(~?\/[^\s]+|\.[/][^\s]+)/g, render: (match) => `${match[1]}${wrapToken("tok-path", match[2])}` },
  ]);

  return `${promptMarkup}${leadingWhitespace}${commandToken}${highlightedRest}${commentMarkup}`;
}

function highlightJson(code) {
  return applyTokenRules(code, [
    { pattern: /(&quot;(?:\\.|[^"\\])*&quot;)(?=\s*:)/g, className: "tok-key" },
    { pattern: /(:\s*)(&quot;(?:\\.|[^"\\])*&quot;)/g, render: (match) => `${match[1]}${wrapToken("tok-string", match[2])}` },
    { pattern: /\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, className: "tok-number" },
    { pattern: /\b(?:true|false)\b/g, className: "tok-boolean" },
    { pattern: /\bnull\b/g, className: "tok-null" },
    { pattern: /[{}\[\],]/g, className: "tok-punctuation" },
  ]);
}

function highlightPython(code) {
  return applyTokenRules(code, [
    { pattern: /#.*/g, className: "tok-comment" },
    { pattern: /(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;(?:\\.|[^"\\])*&quot;|&#39;(?:\\.|[^'\\])*&#39;)/g, className: "tok-string" },
    {
      pattern: /\b(?:def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|lambda|yield|pass|break|continue|in|is|and|or|not|None|True|False)\b/g,
      className: "tok-keyword",
    },
    { pattern: /\b(?:print|len|range|dict|list|set|str|int|float|bool|open|enumerate|zip)\b/g, className: "tok-function" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, className: "tok-number" },
    { pattern: /@[A-Za-z_][\w.]*/g, className: "tok-annotation" },
  ]);
}

function highlightJava(code) {
  return applyTokenRules(code, [
    { pattern: /(?:\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: "tok-comment" },
    { pattern: /(&quot;(?:\\.|[^"\\])*&quot;|&#39;(?:\\.|[^'\\])*&#39;)/g, className: "tok-string" },
    {
      pattern: /\b(?:public|private|protected|class|interface|extends|implements|static|final|void|new|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|throws|package|import|this|super)\b/g,
      className: "tok-keyword",
    },
    { pattern: /@[A-Za-z_][\w.]*/g, className: "tok-annotation" },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, className: "tok-class" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, className: "tok-number" },
  ]);
}

function highlightJavascript(code) {
  return applyTokenRules(code, [
    { pattern: /(?:\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: "tok-comment" },
    { pattern: /(`(?:\\.|[^`])*`|&quot;(?:\\.|[^"\\])*&quot;|&#39;(?:\\.|[^'\\])*&#39;)/g, className: "tok-string" },
    {
      pattern: /\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|class|new|this|async|await|import|from|export|default|throw)\b/g,
      className: "tok-keyword",
    },
    { pattern: /\b(?:true|false|null|undefined)\b/g, className: "tok-boolean" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, className: "tok-number" },
    { pattern: /\b[A-Za-z_$][\w$]*(?=\s*\()/g, className: "tok-function" },
  ]);
}

function highlightHtml(code) {
  return applyTokenRules(code, [
    { pattern: /&lt;!--[\s\S]*?--&gt;/g, className: "tok-comment" },
    { pattern: /&lt;!DOCTYPE[\s\S]*?&gt;/gi, className: "tok-keyword" },
    { pattern: /(&lt;\/?)([a-zA-Z][\w:-]*)/g, render: (match) => `${wrapToken("tok-punctuation", match[1])}${wrapToken("tok-tag", match[2])}` },
    {
      pattern: /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(=)(&quot;[^"]*&quot;|&#39;[^']*&#39;)/g,
      render: (match) => `${wrapToken("tok-attr", match[1])}${wrapToken("tok-operator", match[2])}${wrapToken("tok-value", match[3])}`,
    },
    { pattern: /\/?&gt;/g, className: "tok-punctuation" },
  ]);
}

function highlightPhp(code) {
  return applyTokenRules(code, [
    { pattern: /&lt;\?php|\?&gt;/g, className: "tok-keyword" },
    { pattern: /(?:\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, className: "tok-comment" },
    { pattern: /(&quot;(?:\\.|[^"\\])*&quot;|&#39;(?:\\.|[^'\\])*&#39;)/g, className: "tok-string" },
    {
      pattern: /\b(?:function|class|public|private|protected|static|new|return|if|else|elseif|foreach|while|for|try|catch|throw|namespace|use|require|include|echo)\b/g,
      className: "tok-keyword",
    },
    { pattern: /\$[a-zA-Z_]\w*/g, className: "tok-variable" },
    { pattern: /\b[A-Za-z_]\w*(?=\s*\()/g, className: "tok-function" },
    { pattern: /\b\d+(?:\.\d+)?\b/g, className: "tok-number" },
  ]);
}
