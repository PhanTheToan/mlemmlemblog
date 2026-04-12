let copyTimeout;

document.addEventListener("DOMContentLoaded", function () {
  initHeaderState();
  initMenuToggle();
  initEmailCopy();
  initCodeCopy();
});

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
    const currentParent = pre.parentElement;
    if (!currentParent || currentParent.classList.contains("code-block-wrap")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrap";
    currentParent.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "Copy code block");
    wrapper.appendChild(button);

    let buttonTimeout;

    const setButtonState = (text, copied) => {
      clearTimeout(buttonTimeout);
      button.textContent = text;
      button.classList.toggle("copied", copied);
      buttonTimeout = setTimeout(() => {
        button.textContent = "Copy";
        button.classList.remove("copied");
      }, 1400);
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
      const code = pre.innerText || "";
      if (!code.trim()) {
        setButtonState("No code", false);
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

      setButtonState(copied ? "Copied" : "Failed", copied);
    });
  });
}
