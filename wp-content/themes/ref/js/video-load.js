class LazyVideoManager {
  constructor() {
    this.isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    this.scrollDirection = "down";
    this.lastScrollY = window.scrollY;
    this.campaignVideo = null;
    this.motionVideo = null;
    this.arrivalsSection = document.querySelector(".arrivals-section");
    this.bestSection = document.querySelector(".best-section");

    this.menuItemObservers = new Map();
    this.activeMenuItems = new Map();

    this.initScrollDirection();
    this.initPageVideos();
    this.initMenuVideos();
    this.setupMarkerObservers();

    if (this.isIOS) {
      this.initIOSMenuFix();
    }
  }

  initScrollDirection() {
    window.addEventListener("scroll", () => {
      const currentScrollY = window.scrollY;
      this.scrollDirection = currentScrollY > this.lastScrollY ? "down" : "up";
      this.lastScrollY = currentScrollY;
    });
  }

  initPageVideos() {
    const campaignVideo = document.querySelector(
      ".campaign-section__bg video.lazy-video-section",
    );
    const motionVideo = document.querySelector(
      ".motion-section__video.lazy-video-section",
    );

    if (campaignVideo) {
      this.campaignVideo = campaignVideo;
      this.activePageVideos = new Map();
    }
    if (motionVideo) {
      this.motionVideo = motionVideo;
      if (!this.activePageVideos) this.activePageVideos = new Map();
    }
  }

  setupMarkerObservers() {
    if (!this.arrivalsSection && !this.bestSection) return;

    const options = {
      threshold: 0.1,
    };

    if (this.arrivalsSection) {
      this.arrivalsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.handleArrivalsVisible();
          }
        });
      }, options);
      this.arrivalsObserver.observe(this.arrivalsSection);
    }

    if (this.bestSection) {
      this.bestObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.handleBestVisible();
          }
        });
      }, options);
      this.bestObserver.observe(this.bestSection);
    }
  }

  handleArrivalsVisible() {
    if (this.scrollDirection === "down" && this.campaignVideo) {
      this.loadPageVideo(this.campaignVideo);
    }
    if (this.scrollDirection === "up" && this.campaignVideo) {
      this.schedulePageUnload(this.campaignVideo);
    }
  }

  handleBestVisible() {
    if (this.scrollDirection === "down" && this.motionVideo) {
      this.loadPageVideo(this.motionVideo);
    }
    if (this.scrollDirection === "up" && this.motionVideo) {
      this.schedulePageUnload(this.motionVideo);
    }
    if (this.scrollDirection === "down" && this.campaignVideo) {
      this.schedulePageUnload(this.campaignVideo);
    }
    if (this.scrollDirection === "up" && this.campaignVideo) {
      this.loadPageVideo(this.campaignVideo);
    }
  }

  loadPageVideo(video) {
    if (this.activePageVideos.has(video)) return;

    const videoUrl = video.dataset.videoUrl;
    const posterUrl = video.dataset.poster;

    if (!videoUrl) {
      console.warn("No video URL for lazy-video-section", video);
      return;
    }

    const oldSource = video.querySelector("source");
    if (oldSource) oldSource.remove();

    const source = document.createElement("source");
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("loop", "");
    video.setAttribute("autoplay", "");
    video.preload = this.isIOS ? "auto" : "metadata";
    video.load();
    video.play().catch(() => {});
    video.style.opacity = "0";

    const showVideo = () => {
      video.style.opacity = "1";
      video.removeEventListener("loadeddata", showVideo);
      video.removeEventListener("play", showVideo);
    };
    video.addEventListener("loadeddata", showVideo);
    video.addEventListener("play", showVideo);

    video.addEventListener("error", () => {
      console.error("Video load failed:", videoUrl);
      this.unloadPageVideo(video, true);
    });

    this.activePageVideos.set(video, {
      video,
      timeout: null,
    });
    console.log("Page video loaded:", videoUrl);
  }

  schedulePageUnload(video) {
    const entry = this.activePageVideos.get(video);
    if (!entry) return;

    if (entry.timeout) clearTimeout(entry.timeout);
    entry.timeout = setTimeout(() => {
      this.fadeOutAndUnloadPage(video);
    }, 2000);
  }

  fadeOutAndUnloadPage(video) {
    const entry = this.activePageVideos.get(video);
    if (!entry) return;

    video.style.transition = "opacity 0.4s ease";
    video.style.opacity = "0";

    setTimeout(() => {
      this.unloadPageVideo(video, false);
    }, 400);
  }

  unloadPageVideo(video, force = false) {
    const entry = this.activePageVideos.get(video);
    if (!entry) return;

    video.pause();
    const source = video.querySelector("source");
    if (source) source.remove();
    video.removeAttribute("src");
    video.load();
    video.style.opacity = "1";

    this.activePageVideos.delete(video);
    console.log("Page video unloaded");
  }

  initMenuListObservers() {
    const listItems = document.querySelectorAll(".menu__item-list li");

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        const li = entry.target;
        const img = li.querySelector("img");
        const videoUrl =
          li.querySelector("[data-video]")?.dataset.video ||
          img?.closest("[data-video]")?.dataset.video;

        if (!videoUrl) return;

        if (entry.isIntersecting) {
          if (this.activeMenuItems.has(li)) {
            clearTimeout(this.activeMenuItems.get(li));
            this.activeMenuItems.delete(li);
          }

          if (!li.querySelector("video")) {
            this.createAndInsertVideo(li, videoUrl);
          }
        } else {
          const timeoutId = setTimeout(() => {
            this.removeVideoFromItem(li);
            this.activeMenuItems.delete(li);
          }, 3000);

          this.activeMenuItems.set(li, timeoutId);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    listItems.forEach((li) => {
      observer.observe(li);
    });
  }

  createAndInsertVideo(container, videoUrl) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = this.isIOS ? "auto" : "metadata";
    video.style.width = "100%";
    video.style.height = "auto";
    video.style.display = "block";

    const source = document.createElement("source");
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);

    container.innerHTML = "";
    container.appendChild(video);

    video.play().catch(() => {
      /* ignore */
    });

    if (this.isIOS) {
      this.loadIOSVideo(video);
    }
  }

  removeVideoFromItem(container) {
    const video = container.querySelector("video");
    if (!video) return;

    video.pause();
    container.innerHTML = "";

    const posterUrl = "/wp-content/themes/ref/img/menu_video_poster.webp";
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "";
    img.loading = "lazy";
    container.appendChild(img);
  }

  initMenuVideos() {
    this.menus = document.querySelectorAll(".menu--menu, .menu--categories");
    if (!this.menus.length) return;

    this.initMenuListObservers();

    this.mainVideos = [];
    this.activeMenus = new Set();

    const observer = new MutationObserver(() => {
      this.menus.forEach((menu) => {
        const isActive = menu.classList.contains("active");
        const wasActive = this.activeMenus.has(menu);

        if (isActive && !wasActive) {
          this.onMenuOpen(menu);
          this.activeMenus.add(menu);
        } else if (!isActive && wasActive) {
          this.onMenuClose(menu);
          this.activeMenus.delete(menu);
        }
      });
    });

    this.menus.forEach((menu) => {
      observer.observe(menu, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });
  }

  onMenuOpen(menu) {
    const mainVideos = menu.querySelectorAll(".menu__item-main video");
    mainVideos.forEach((video) => {
      if (!this.mainVideos.includes(video)) {
        this.mainVideos.push(video);
        if (this.isIOS) {
          this.loadIOSVideo(video);
        } else {
          video.preload = "metadata";
          video.load();
        }
      }
    });
  }

  onMenuClose(menu) {
    setTimeout(() => {
      this.mainVideos.forEach((video) => {
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
      });
      this.mainVideos = [];
    }, 2000);
  }

  loadIOSVideo(video) {
    if (!video || video.hasAttribute("data-ios-loaded")) return;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;

    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("preload", "auto");

    video.load();
    video.setAttribute("data-ios-loaded", "true");

    const playAttempt = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("iOS video play blocked:", error);
          const retry = () => {
            video.play().catch((e) => console.log("Retry failed:", e));
            document.removeEventListener("touchstart", retry);
            document.removeEventListener("click", retry);
          };
          document.addEventListener("touchstart", retry, { once: true });
          document.addEventListener("click", retry, { once: true });
        });
      }
    };

    playAttempt();
    setTimeout(playAttempt, 500);
  }

  initIOSMenuFix() {
    const loadMenuVideos = () => {
      const menuVideos = document.querySelectorAll(
        ".menu--menu .menu__item-main video, .menu--menu .menu__item-list video, .menu--categories .menu__item-main video, .menu--categories .menu__item-list video",
      );

      menuVideos.forEach((video) => {
        let videoSrc = video.src;

        if (!videoSrc) {
          const source = video.querySelector("source");
          if (source && source.src) {
            videoSrc = source.src;
            video.src = videoSrc;
          }
        }

        if (videoSrc && !video.hasAttribute("data-ios-loaded")) {
          video.muted = true;
          video.playsInline = true;
          video.loop = true;
          video.autoplay = true;

          video.setAttribute("muted", "");
          video.setAttribute("playsinline", "");
          video.setAttribute("webkit-playsinline", "");
          video.setAttribute("x5-playsinline", "");
          video.setAttribute("preload", "auto");

          video.load();
          video.setAttribute("data-ios-loaded", "true");

          setTimeout(() => {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                const retryPlay = () => {
                  video.play().catch(() => {});
                  document.removeEventListener("touchstart", retryPlay);
                  document.removeEventListener("click", retryPlay);
                };
                document.addEventListener("touchstart", retryPlay, {
                  once: true,
                });
                document.addEventListener("click", retryPlay, { once: true });
              });
            }
          }, 100);
        }
      });
    };

    loadMenuVideos();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadMenuVideos);
    }
    window.addEventListener("load", loadMenuVideos);

    document.addEventListener("touchstart", loadMenuVideos, { once: true });
    document.addEventListener("click", loadMenuVideos, { once: true });
  }

  cleanup() {
    this.cleanupPageVideos();
    this.onMenuClose?.();

    this.activeMenuItems.forEach((timeout) => clearTimeout(timeout));
    this.activeMenuItems.clear();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new LazyVideoManager();
});
