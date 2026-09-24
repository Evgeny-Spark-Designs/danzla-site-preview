(function () {
  "use strict";

  function handleAddToCart() {
    document.addEventListener("click", function (e) {
      const button = e.target.closest(".product-section__button.button--black");
      if (!button || button.classList.contains("disable")) return;

      const productId = button.dataset.productId;
      if (!productId) return;

      e.preventDefault();
      const productContainer =
        button.closest(".product-section") ||
        document.querySelector(".product-section") ||
        document;
      const sizeInput = productContainer.querySelector(
        'input[name="size"]:checked',
      );
      const selectedSize = sizeInput ? sizeInput.value : null;

      if (!selectedSize) {
        alert("Please select a size");
        return;
      }

      const colorInput = productContainer.querySelector(
        'input[name="color"]:checked',
      );
      const selectedColor = colorInput ? colorInput.value : null;

      let cart = JSON.parse(localStorage.getItem("cart") || "{}");
      cart[productId] = {
        id: parseInt(productId),
        qty: 1,
        size: selectedSize,
        color: selectedColor,
      };
      localStorage.setItem("cart", JSON.stringify(cart));

      loadCart();
      renderCart();
      updateCartTotals();

      const cartEl = document.querySelector(".cart");
      if (cartEl) {
        cartEl.classList.add("visible");
        if (window.lenis && typeof window.lenis.stop === "function")
          window.lenis.stop();
      }
    });
  }

  function handleAddToFavorites() {
    document.addEventListener("click", function (e) {
      const button = e.target.closest(".product-section__link");
      if (!button || !button.dataset.productId) return;

      e.preventDefault();
      const productId = parseInt(button.dataset.productId);
      if (isNaN(productId)) return;

      const productContainer =
        button.closest(".product-section") ||
        button.closest(".swiper-slide") ||
        button.closest(".item-card") ||
        button.closest(".card");

      const product = getProductById(productId);
      if (!product) return;

      const sizeInput = productContainer
        ? productContainer.querySelector('input[name="size"]:checked')
        : null;
      const colorInput = productContainer
        ? productContainer.querySelector('input[name="color"]:checked')
        : null;

      const selectedSize = sizeInput
        ? sizeInput.value
        : getFallbackValue(product, "size");
      const selectedColor = colorInput
        ? colorInput.value
        : getFallbackValue(product, "color");
      const quantity = product ? product.quantity : null;

      if (!favorites[productId]) {
        favorites[productId] = {
          id: productId,
          qty: 1,
          quantity: quantity,
          size: selectedSize,
          color: selectedColor,
        };
        saveFavorites();
        renderFavorites();

        const successModal = document.querySelector(
          ".success.success--favorites",
        );
        if (successModal) {
          setTimeout(() => {
            successModal.classList.add("visible");
          }, 0);
        }
      }
    });
  }

  let cartList,
    emptyCartBlock,
    cartInner,
    totalCountEl,
    totalSumEl,
    bagButton,
    checkoutButton,
    checkoutList,
    checkoutSubtotalEl,
    checkoutDiscountEl,
    checkoutShippingEl,
    checkoutTotalEl,
    favoritesList,
    favoritesEmptyBlock,
    favoritesCountEl,
    headerFavoritesBtn;

  let allProducts = [];
  let cart = {};
  let favorites = {};

  let currentDiscountPercent = 0;

  function fetchDiscount() {
    const token = localStorage.getItem("discount_token");
    if (!token) {
      currentDiscountPercent = 0;
      updateCheckoutTotals();
      return;
    }

    fetch("/wp-content/themes/ref/inc/discount.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          currentDiscountPercent = parseFloat(data.discount_percent);
        } else {
          currentDiscountPercent = 0;
        }
        updateCheckoutTotals();
      })
      .catch((err) => console.error(err));
  }

  function initCartDisplay() {
    cartList = document.querySelector(".cart__list");
    emptyCartBlock = document.querySelector(".cart__empty");
    cartInner = document.querySelector(".cart__inner");
    totalCountEl = document.querySelector(".cart__top-count");
    totalSumEl = document.querySelector(
      ".cart__bottom-price span:nth-child(2)",
    );
    bagButton = Array.from(
      document.querySelectorAll("button[hover-link] span[text-split]"),
    ).find((el) => el && el.textContent.trim().includes("Bag"));
    checkoutButton = document.querySelector(".cart__button.button--black");
    checkoutList = document.querySelector(".checkout__summary-list");
    checkoutSubtotalEl = document.querySelector(
      ".checkout__count-list li:first-child .checkout__count-price",
    );
    checkoutDiscountEl = document.querySelector(
      ".checkout__count-list li:nth-child(2) .checkout__count-price",
    );
    checkoutShippingEl = document.querySelector(
      ".checkout__count-list li:nth-child(3) .checkout__count-text",
    );
    checkoutTotalEl = document.querySelector(
      ".checkout__total-price span:nth-child(2)",
    );
    favoritesList = document.querySelector(".favorites__list");
    favoritesEmptyBlock = document.querySelector(".favorites__not");
    favoritesCountEl = document.querySelector(".favorites__count");
    headerFavoritesBtn = Array.from(
      document.querySelectorAll("button[hover-link] span[text-split]"),
    ).find(
      (el) => el && el.textContent.trim().toLowerCase().includes("favorites"),
    );

    const productsScript = document.getElementById("all-products-data");
    if (!productsScript) return;

    try {
      allProducts = JSON.parse(productsScript.textContent);
    } catch (e) {
      return;
    }

    loadCart();
    loadFavorites();
    renderCart();
    renderFavorites();
    bindCartEvents();
    renderCheckout();
    bindCheckoutEvents();
    bindFavoritesEvents();
    bindSuccessModalEvents();
    bindFormSuccessEvents();

    fetchDiscount();
    window.addEventListener("discount_updated", fetchDiscount);
    window.addEventListener("shipping_updated", updateCheckoutTotals);
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem("cart");
      cart = saved ? JSON.parse(saved) : {};
    } catch (e) {
      cart = {};
    }
  }

  function loadFavorites() {
    try {
      const saved = localStorage.getItem("favorites");
      const parsed = saved ? JSON.parse(saved) : {};
      if (Array.isArray(parsed)) {
        favorites = {};
        parsed.forEach((id) => {
          favorites[id] = {
            id: id,
            qty: 1,
            quantity: null,
            size: null,
            color: null,
          };
        });
      } else {
        favorites = parsed;
      }
    } catch (e) {
      favorites = {};
    }
  }

  function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
    updateFavoritesCount();
  }

  function updateFavoritesCount() {
    const count = Object.keys(favorites).length;
    if (favoritesCountEl) {
      favoritesCountEl.innerHTML = `<strong>[ </strong>${count} - Items<strong> ]</strong>`;
    }
    if (headerFavoritesBtn) {
      headerFavoritesBtn.textContent = `Favorites.${count}`;
    }
    if (favoritesEmptyBlock) {
      favoritesEmptyBlock.style.display = count === 0 ? "flex" : "none";
    }
    if (favoritesList) {
      favoritesList.style.display = count === 0 ? "none" : "";
    }
  }

  function getProductById(id) {
    return allProducts.find((p) => p.id === id);
  }

  function getFallbackValue(product, field) {
    if (!product) return "—";

    const keys = [field, field + "s", "product_" + field, "pa_" + field];

    for (const key of keys) {
      const value = product[key];
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      } else if (
        typeof value === "string" &&
        value.trim() !== "" &&
        value !== "—"
      ) {
        return value;
      }
    }
    return "—";
  }

  function renderCart() {
    if (!cartList) return;

    let html = "";
    let totalItems = 0;
    let totalSum = 0;

    for (const id in cart) {
      const item = cart[id];
      const productId = parseInt(id);
      const product = getProductById(productId);

      if (!product) continue;

      const qty = item.qty || 1;
      const isDecreaseDisabled = qty <= 1;
      const size = item.size || getFallbackValue(product, "size");
      const color = item.color || getFallbackValue(product, "color");

      const price =
        product.basePrice && product.basePrice > 0
          ? product.basePrice
          : product.price;
      const subtotal = price * qty;

      totalItems += qty;
      totalSum += subtotal;

      const firstImage =
        product.images?.[0]?.[0] ||
        "/wp-content/themes/ref/img/menu_img_1.webp";

      html += `
                <li data-product-id="${productId}">
                    <div class="cart-card">
                        <picture class="cart-card__img">
                            <img src="${firstImage}" alt="${product.title}">
                        </picture>
                        <div class="cart-card__info">
                            <div class="cart-card__top">
                                <p class="cart-card__title">${product.title}</p>
                                <div class="cart-card__prices">
                                    <p class="cart-card__price ${product.basePrice ? "cart-card__price--sale" : ""}">${formatPrice(subtotal)}</p>
                                    ${product.basePrice ? `<p class="cart-card__price cart-card__price--base">${formatPrice(product.basePrice)}</p>` : ""}
                                </div>
                            </div>
                            <div class="cart-card__mid">
                                <p class="cart-card__tag"><strong>[ </strong>${size}<strong> ]</strong></p>
                                <p class="cart-card__tag"><strong>[ </strong>${color}<strong> ]</strong></p>
                            </div>
                            <div class="cart-card__bottom">
                                <div class="cart-card__count">
                                    <span>[</span>
                                    <button class="decrease ${isDecreaseDisabled ? "disabled" : ""}" data-id="${productId}">−</button>
                                    <span>${qty}</span>
                                    <button class="increase" data-id="${productId}">+</button>
                                    <span>]</span>
                                </div>
                                <button class="cart-card__button remove" data-id="${productId}" hover-link>
                                    <span data-hover-lottie="/wp-content/themes/ref/lottie/LOTTIE_MARKER_v1.json" hover-lottie></span>
                                    <span text-split>RemovE</span>
                                </button>
                                <button class="cart-card__button add-to-favorites" data-id="${productId}" hover-link>
                                    <span data-hover-lottie="/wp-content/themes/ref/lottie/LOTTIE_MARKER_v1.json" hover-lottie></span>
                                    <span text-split>Add to favorites</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </li>
            `;
    }

    cartList.innerHTML = html;

    if (totalItems === 0) {
      if (emptyCartBlock) {
        emptyCartBlock.style.display = "block";
        emptyCartBlock.style.alignContent = "center";
        emptyCartBlock.style.textAlign = "center";
      }
      if (checkoutButton) checkoutButton.classList.add("disable");
      if (cartList) cartList.style.display = "none";
      if (cartInner) cartInner.style.display = "none";
    } else {
      if (emptyCartBlock) emptyCartBlock.style.display = "none";
      if (checkoutButton) checkoutButton.classList.remove("disable");
      if (cartList) cartList.style.display = "";
      if (cartInner) cartInner.style.display = "";
    }

    if (totalCountEl) {
      totalCountEl.innerHTML = `<strong>[</strong> ${totalItems} - Items <strong>]</strong>`;
    }
    if (totalSumEl) {
      totalSumEl.textContent = formatPrice(totalSum);
    }
    if (bagButton) {
      bagButton.textContent = `Bag.${totalItems}`;
    }
  }

  function renderFavorites() {
    if (!favoritesList) return;

    let html = "";

    for (const id in favorites) {
      const item = favorites[id];
      const product = getProductById(item.id);
      if (!product) continue;

      const firstImage =
        product.images?.[0]?.[0] ||
        "/wp-content/themes/ref/img/menu_img_1.webp";
      const size = item.size || getFallbackValue(product, "size");
      const color = item.color || getFallbackValue(product, "color");
      const qty = item.qty || 1;
      const subtotal = product.price * qty;
      const price = formatPrice(subtotal);
      const productLink = product.href || "#";
      const quantity =
        typeof item.quantity !== "undefined" && item.quantity !== null
          ? parseInt(item.quantity, 10) || 0
          : typeof product.quantity !== "undefined" && product.quantity !== null
            ? parseInt(product.quantity, 10) || 0
            : 0;
      const isOutOfStock = quantity <= 0;
      const isDecreaseDisabled = qty <= 1;

      html += `
                <li>
                    <div class="cart-card">
                        <a href="${productLink}" class="cart-card__img-wrapper">
                            <picture class="cart-card__img">
                                <img src="${firstImage}" alt="${product.title}">
                            </picture>
                        </a>
                        <div class="cart-card__info">
                            <div class="cart-card__top">
                                <a href="${productLink}" class="cart-card__title-link"><p class="cart-card__title">${product.title}</p></a>
                                <div class="cart-card__prices">
                                    <p class="cart-card__price ${product.basePrice ? "cart-card__price--sale" : ""}">${formatPrice(subtotal)}</p>
                                    ${product.basePrice ? `<p class="cart-card__price cart-card__price--base">${formatPrice(product.basePrice)}</p>` : ""}
                                </div>
                            </div>
                            <div class="cart-card__mid">
                                <p class="cart-card__tag"><strong>[ </strong>${size}<strong> ]</strong></p>
                                <p class="cart-card__tag"><strong>[ </strong>${color}<strong> ]</strong></p>
                            </div>
                            <div class="cart-card__bottom">
                                <div class="cart-card__count ">
                                    <span>[</span>
                                    <button class="decrease ${isDecreaseDisabled ? "disabled" : ""}" data-id="${item.id}">                    
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="1" viewBox="0 0 11 1" fill="none">
                                        <path d="M6 1V0H11V1H6Z" fill="currentColor"/>
                                        <path d="M0 1V0H5V1H0Z" fill="currentColor"/>
                                      </svg>          
                                    </button>
                                    <span>${qty}</span>
                                    <button class="increase" data-id="${item.id}">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
                                        <path d="M5 0H6V5H5V0Z" fill="currentColor"/>
                                        <path d="M5 6H6V11H5V6Z" fill="currentColor"/>
                                        <path d="M6 6V5H11V6H6Z" fill="currentColor"/>
                                        <path d="M0 6V5H5V6H0Z" fill="currentColor"/>
                                      </svg>
                                    </button>
                                    <span>]</span>
                                </div>
                                <button class="cart-card__button " hover-link data-action="remove" data-id="${item.id}">
                                  <span data-hover-lottie="/wp-content/themes/ref/lottie/LOTTIE_MARKER_v1.json" hover-lottie></span>
                                  <span text-split>RemovE</span>
                                </button>
                                
                                <button class="cart-card__button ${isOutOfStock ? "out-stock" : ""}" hover-link data-action="add" data-id="${item.id}">
                                  <span data-hover-lottie="/wp-content/themes/ref/lottie/LOTTIE_MARKER_v1.json" hover-lottie></span>
                                  <span text-split>${isOutOfStock ? "Out of stock" : "Add to bag"}</span>
                                </button>

                            </div>
                        </div>
                    </div>
                    <div class="favorites__line">
                        <img src="/wp-content/themes/ref/img/grey-line-icon.svg" alt="">
                    </div>
                </li>
            `;
    }

    favoritesList.innerHTML = html;
    updateFavoritesCount();
  }

  function updateCartTotals() {
    let totalItems = 0;
    let totalSum = 0;

    for (const id in cart) {
      const item = cart[id];
      const product = getProductById(parseInt(id));
      if (!product) continue;

      const qty = item.qty || 1;
      totalItems += qty;
      // totalSum += product.price * qty;
      const effectivePrice =
        product.basePrice && product.basePrice > 0
          ? product.basePrice
          : product.price;
      totalSum += effectivePrice * qty;
    }

    if (totalCountEl) {
      totalCountEl.innerHTML = `<strong>[</strong> ${totalItems} - Items <strong>]</strong>`;
    }
    if (totalSumEl) {
      totalSumEl.textContent = formatPrice(totalSum);
    }
    if (bagButton) {
      bagButton.textContent = `Bag.${totalItems}`;
    }

    if (totalItems === 0) {
      if (emptyCartBlock) {
        emptyCartBlock.style.display = "block";
        emptyCartBlock.style.alignContent = "center";
        emptyCartBlock.style.textAlign = "center";
      }
      if (checkoutButton) checkoutButton.classList.add("disable");
      if (cartList) cartList.style.display = "none";
      if (cartInner) cartInner.style.display = "none";
    } else {
      if (emptyCartBlock) emptyCartBlock.style.display = "none";
      if (checkoutButton) checkoutButton.classList.remove("disable");
      if (cartList) cartList.style.display = "";
      if (cartInner) cartInner.style.display = "";
    }
  }

  function formatPrice(value) {
    return (
      new Intl.NumberFormat("de-DE", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
        .format(value)
        .replace(/\s/g, " ") + ""
    );
  }

  function bindCartEvents() {
    if (!cartList) return;

    cartList.addEventListener("click", function (e) {
      let target = e.target;
      if (target.nodeType === 3) target = target.parentNode;
      const removeBtn = target.closest(".remove");
      const addToFavoritesBtn = target.closest(".add-to-favorites");
      const qtyBtn = target.closest(".increase, .decrease");

      if (removeBtn) {
        e.preventDefault();
        const id = parseInt(removeBtn.dataset.id);
        if (isNaN(id)) return;

        const cartItemElement = removeBtn.closest("li[data-product-id]");
        if (cartItemElement) {
          cartItemElement.classList.add("hide");
          setTimeout(() => {
            delete cart[id];
            saveCart();
            cartItemElement.remove();
            updateCartTotals();
            updateCheckoutTotals();
          }, 500);
        } else {
          delete cart[id];
          saveCart();
          updateCartTotals();
          renderCheckout();
        }
      } else if (addToFavoritesBtn) {
        e.preventDefault();
        const id = parseInt(addToFavoritesBtn.dataset.id);
        if (isNaN(id)) return;

        const cartItem = cart[id];
        if (cartItem && !favorites[id]) {
          const product = getProductById(id);
          favorites[id] = {
            id: id,
            qty: cartItem.qty || 1,
            quantity: product ? product.quantity : null,
            size: cartItem.size,
            color: cartItem.color,
          };
          saveFavorites();
          renderFavorites();
        }

        const successModal = document.querySelector(
          ".success.success--favorites",
        );
        if (successModal) {
          setTimeout(() => {
            successModal.classList.add("visible");
          }, 0);
        }
      } else if (qtyBtn) {
        e.preventDefault();
        const id = parseInt(qtyBtn.dataset.id);
        if (isNaN(id) || !cart[id]) return;

        const product = getProductById(id);
        if (!product) return;

        const change = qtyBtn.classList.contains("increase") ? 1 : -1;
        const currentQty = cart[id].qty;
        const newQty = Math.max(1, currentQty + change);

        if (currentQty === newQty) return;

        cart[id].qty = newQty;
        saveCart();

        const cartItemElement = qtyBtn.closest("li[data-product-id]");
        if (cartItemElement) {
          cartItemElement.querySelector(
            ".cart-card__count span:nth-child(3)",
          ).textContent = newQty;
          // cartItemElement.querySelector(".cart-card__price").textContent =
          //   formatPrice(product.price * newQty);
          const effectivePrice =
            product.basePrice && product.basePrice > 0
              ? product.basePrice
              : product.price;
          cartItemElement.querySelector(".cart-card__price").textContent =
            formatPrice(effectivePrice * newQty);
        }
        if (cartItemElement) {
          const decreaseBtn = cartItemElement.querySelector(".decrease");
          if (decreaseBtn) {
            decreaseBtn.classList.toggle("disabled", newQty <= 1);
          }
        }
        updateCartTotals();
        renderCheckout();
      }
    });

    if (checkoutButton) {
      checkoutButton.addEventListener("click", function (e) {
        if (checkoutButton.classList.contains("disable")) {
          e.preventDefault();
          return;
        }
        window.location.href = "../../../../checkout/index.html";
      });
    }
  }

  function renderCheckout() {
    if (!checkoutList) return;

    let html = "";
    let totalSum = 0;

    for (const id in cart) {
      const item = cart[id];
      const productId = parseInt(id);
      const product = getProductById(productId);

      if (!product) continue;

      const qty = item.qty || 1;
      const isDecreaseDisabled = qty <= 1;
      const size = item.size || getFallbackValue(product, "size");
      const color = item.color || getFallbackValue(product, "color");
      const price = product.price;
      const subtotal = price * qty;

      totalSum += subtotal;

      const firstImage =
        product.images?.[0]?.[0] ||
        "/wp-content/themes/ref/img/menu_img_1.webp";

      html += `
                <li data-product-id="${productId}">
                    <div class="cart-card cart-card--checkout">
                        <picture class="cart-card__img">
                            <img src="${firstImage}" alt="${product.title}">
                        </picture>
                        <div class="cart-card__info">
                            <div class="cart-card__top">
                                <p class="cart-card__title">${product.title}</p>
                                <div class="cart-card__prices">
                                    <p class="cart-card__price ${product.basePrice ? "cart-card__price--sale" : ""}">${formatPrice(subtotal)}</p>
                                    ${product.basePrice ? `<p class="cart-card__price cart-card__price--base">${formatPrice(product.basePrice)}</p>` : ""}
                                </div>
                            </div>
                            <div class="cart-card__mid">
                                <p class="cart-card__tag"><strong>[ </strong>${size}<strong> ]</strong></p>
                                <p class="cart-card__tag"><strong>[ </strong>${color}<strong> ]</strong></p>
                            </div>
                            <div class="cart-card__bottom">
                                <div class="cart-card__count">
                                    <span>[</span>
                                    <button class="decrease ${isDecreaseDisabled ? "disabled" : ""}" data-id="${productId}">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="1" viewBox="0 0 11 1" fill="none">
                                        <path d="M6 1V0H11V1H6Z" fill="currentColor"/>
                                        <path d="M0 1V0H5V1H0Z" fill="currentColor"/>
                                      </svg>
                                    </button>
                                    <span>${qty}</span>
                                    <button class="increase" data-id="${productId}">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
                                        <path d="M5 0H6V5H5V0Z" fill="currentColor"/>
                                        <path d="M5 6H6V11H5V6Z" fill="currentColor"/>
                                        <path d="M6 6V5H11V6H6Z" fill="currentColor"/>
                                        <path d="M0 6V5H5V6H0Z" fill="currentColor"/>
                                      </svg>
                                    </button>
                                    <span>]</span>
                                </div>
                               <button type="button" class="cart-card__button remove" hover-link data-id="${productId}">
                                  <span data-hover-lottie="/wp-content/themes/ref/lottie/LOTTIE_MARKER_v1.json"  hover-lottie></span>
                                  <span text-split>RemovE</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <img src="/wp-content/themes/ref/img/grey-line-icon.svg" alt="">
                </li>
            `;
    }

    checkoutList.innerHTML = html;
    updateCheckoutTotals();
  }

  function updateCheckoutTotals() {
    if (!checkoutSubtotalEl) return;

    let totalSum = 0;
    for (const id in cart) {
      const item = cart[id];
      const product = getProductById(parseInt(id));
      if (product) {
        // totalSum += product.price * (item.qty || 1);
        const effectivePrice =
          product.basePrice && product.basePrice > 0
            ? product.basePrice
            : product.price;
        totalSum += effectivePrice * (item.qty || 1);
      }
    }

    checkoutSubtotalEl.innerHTML = `<strong>[</strong> ${formatPrice(totalSum)} <strong>]</strong>`;

    let discountAmount = 0;
    if (currentDiscountPercent > 0) {
      discountAmount = totalSum * (currentDiscountPercent / 100);
    }

    console.log("discount percent:", currentDiscountPercent);
    console.log("discount amount:", discountAmount);
    console.log("total:", totalSum);

    if (checkoutDiscountEl) {
      const displayDiscount =
        discountAmount > 0 ? `-${formatPrice(discountAmount)}` : `0,00`;
      checkoutDiscountEl.innerHTML = `<strong>[</strong> ${displayDiscount} <strong>]</strong>`;
    }

    if (checkoutTotalEl) {
      const parsePrice = (str) => {
        if (!str) return 0;
        let clean = str.replace(/[\[\]\s]/g, "");
        clean = clean.replace(/\./g, "");
        clean = clean.replace(/,/g, ".");
        return parseFloat(clean) || 0;
      };

      const shipping = checkoutShippingEl
        ? parsePrice(checkoutShippingEl.textContent)
        : 0;

      const finalTotal = Math.max(0, totalSum - discountAmount + shipping);
      checkoutTotalEl.textContent = formatPrice(finalTotal);
    }
  }

  function bindCheckoutEvents() {
    if (!checkoutList) return;

    checkoutList.addEventListener("click", function (e) {
      let target = e.target;
      if (target.nodeType === 3) target = target.parentNode;
      const targetBtn = target.closest("button");
      if (!targetBtn) return;

      e.preventDefault();

      const id = parseInt(targetBtn.dataset.id);
      if (isNaN(id)) return;

      if (targetBtn.classList.contains("remove")) {
        const li = targetBtn.closest("li");
        if (li) {
          li.classList.add("hide");
          setTimeout(() => {
            delete cart[id];
            saveCart();
            li.remove();
            updateCheckoutTotals();
            updateCartTotals();
          }, 500);
        } else {
          delete cart[id];
          saveCart();
          updateCheckoutTotals();
          updateCartTotals();
        }
      } else if (
        targetBtn.classList.contains("increase") ||
        targetBtn.classList.contains("decrease")
      ) {
        const product = getProductById(id);
        if (!product) return;

        const change = targetBtn.classList.contains("increase") ? 1 : -1;
        const currentQty = cart[id].qty;
        const newQty = Math.max(1, currentQty + change);

        if (currentQty === newQty) return;

        cart[id].qty = newQty;
        saveCart();

        const li = targetBtn.closest("li");
        if (li) {
          li.querySelector(".cart-card__count span:nth-child(3)").textContent =
            newQty;
          // li.querySelector(".cart-card__price").textContent = formatPrice(
          //   product.price * newQty,
          // );
          const effectivePrice =
            product.basePrice && product.basePrice > 0
              ? product.basePrice
              : product.price;
          li.querySelector(".cart-card__price").textContent = formatPrice(
            effectivePrice * newQty,
          );
        }
        if (li) {
          const decreaseBtn = li.querySelector(".decrease");
          if (decreaseBtn) {
            decreaseBtn.classList.toggle("disabled", newQty <= 1);
          }
        }
        updateCheckoutTotals();
        updateCartTotals();
      }
    });
  }

  function bindFavoritesEvents() {
    if (!favoritesList) return;

    favoritesList.addEventListener("click", function (e) {
      let target = e.target;
      if (target.nodeType === 3) target = target.parentNode;
      const btn = target.closest(".cart-card__button");
      const qtyBtn = target.closest(".increase, .decrease");

      if (btn) {
        const id = parseInt(btn.dataset.id);
        if (isNaN(id)) return;
        const action = btn.dataset.action;

        if (action === "remove") {
          const li = btn.closest("li");
          if (li) {
            li.classList.add("hide");
            setTimeout(() => {
              delete favorites[id];
              saveFavorites();
              li.remove();
            }, 500);
          } else {
            delete favorites[id];
            saveFavorites();
            renderFavorites();
          }
        } else if (action === "add") {
          const favItem = favorites[id];
          if (!favItem) return;

          if (!cart[id]) {
            cart[id] = { ...favItem };
          } else {
            cart[id].qty += favItem.qty;
          }
          saveCart();
          renderCart();
          updateCartTotals();
          const successModal = document.querySelector(".success.success--cart");
          if (successModal) {
            setTimeout(() => {
              successModal.classList.add("visible");
            }, 0);
          }
        }
      } else if (qtyBtn) {
        const id = parseInt(qtyBtn.dataset.id);
        if (isNaN(id) || !favorites[id]) return;

        const change = qtyBtn.classList.contains("increase") ? 1 : -1;
        const currentQty = favorites[id].qty || 1;
        const newQty = Math.max(1, currentQty + change);
        const listItem = qtyBtn.closest("li");

        if (currentQty !== newQty) {
          favorites[id].qty = newQty;
          saveFavorites();

          const product = getProductById(id);
          if (product && listItem) {
            const qtySpan = listItem.querySelector(
              ".cart-card__count span:nth-child(3)",
            );
            if (qtySpan) qtySpan.textContent = newQty;

            const priceEl = listItem.querySelector(".cart-card__price");
            if (priceEl)
              priceEl.textContent = formatPrice(product.price * newQty);
          }
        }

        if (listItem) {
          const decreaseBtn = listItem.querySelector(".decrease");
          if (decreaseBtn) {
            decreaseBtn.classList.toggle("disabled", newQty <= 1);
          }
        }
      }
    });
  }

  function bindSuccessModalEvents() {
    document.addEventListener("click", function (e) {
      const closeBtn = e.target.closest(".success__close, .success__button");
      if (!closeBtn) return;

      const successModal = closeBtn.closest(".success");
      if (!successModal) return;

      e.preventDefault();
      successModal.classList.remove("visible");
    });
  }

  function bindFormSuccessEvents() {
    const openSendSuccessModal = () => {
      const successModal = document.querySelector(".success.success--send");
      if (!successModal) return;

      document.querySelectorAll(".success.visible").forEach((modal) => {
        modal.classList.remove("visible");
      });

      setTimeout(() => {
        successModal.classList.add("visible");
      }, 0);
    };

    document.addEventListener("wpcf7mailsent", openSendSuccessModal);
    document.addEventListener("form_sent_success", openSendSuccessModal);
  }

  handleAddToCart();
  handleAddToFavorites();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCartDisplay);
  } else {
    initCartDisplay();
  }
})();
