(function () {
    const article = document.querySelector(".blog-markdown");
    if (!article) return;

    const allHeadings = Array.from(article.querySelectorAll("h1, h2, h3"));
    const headings = allHeadings.some((h) => h.tagName !== "H1")
        ? allHeadings.filter((h) => h.tagName !== "H1")
        : allHeadings;
    if (headings.length === 0) return;

    if (!article.parentElement || article.parentElement.classList.contains("blog-post-layout")) {
        return;
    }

    const slugify = (text) => {
        return text
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };

    const nextUniqueId = (base, fallbackIndex) => {
        let id = base || `section-${fallbackIndex + 1}`;
        let suffix = 1;
        while (document.getElementById(id)) {
            id = `${base || `section-${fallbackIndex + 1}`}-${suffix++}`;
        }
        return id;
    };

    const layout = document.createElement("div");
    layout.className = "blog-post-layout";
    article.parentNode.insertBefore(layout, article);
    layout.appendChild(article);

    const aside = document.createElement("aside");
    aside.className = "blog-toc-wrap";
    aside.innerHTML = `
        <div class="blog-toc-title">Mục lục</div>
        <nav class="blog-toc" aria-label="Table of contents"></nav>
    `;
    layout.appendChild(aside);

    const toc = aside.querySelector(".blog-toc");
    const linksById = new Map();

    headings.forEach((heading, index) => {
        const level = Math.min(parseInt(heading.tagName.slice(1), 10), 3);
        if (!heading.id) {
            heading.id = nextUniqueId(slugify(heading.textContent || ""), index);
        }

        const link = document.createElement("a");
        link.className = `toc-link level-${level}`;
        link.href = `#${heading.id}`;
        link.textContent = (heading.textContent || "").trim();
        link.setAttribute("data-target", heading.id);
        toc.appendChild(link);
        linksById.set(heading.id, link);
    });

    const setActive = (id) => {
        linksById.forEach((link) => link.classList.remove("active"));
        const active = linksById.get(id);
        if (active) {
            active.classList.add("active");
        }
    };

    toc.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-target]");
        if (!link) return;
        event.preventDefault();
        const targetId = link.getAttribute("data-target");
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${targetId}`);
        setActive(targetId);
    });

    const updateActiveByScroll = () => {
        const offset = 120;
        let currentId = headings[0].id;
        for (let i = 0; i < headings.length; i += 1) {
            const heading = headings[i];
            if (heading.getBoundingClientRect().top - offset <= 0) {
                currentId = heading.id;
            } else {
                break;
            }
        }
        setActive(currentId);
    };

    let ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                updateActiveByScroll();
                ticking = false;
            });
        },
        { passive: true }
    );

    window.addEventListener("hashchange", () => {
        const targetId = window.location.hash.replace("#", "");
        if (linksById.has(targetId)) {
            setActive(targetId);
        }
    });

    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && linksById.has(initialHash)) {
        setActive(initialHash);
    } else {
        updateActiveByScroll();
    }
})();
