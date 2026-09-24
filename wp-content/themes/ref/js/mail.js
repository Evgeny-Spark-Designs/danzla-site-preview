document.addEventListener("DOMContentLoaded", function () {
  const signUpModal = document.querySelector(".sing-up");

  if (sessionStorage.getItem("subscribed")) {
    if (signUpModal) {
      signUpModal.classList.remove("visible");
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (signUpModal.classList.contains("visible")) {
            signUpModal.classList.remove("visible");
          }
        });
      });
      observer.observe(signUpModal, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  const signUpForm = document.querySelector(".sing-up__form");
  if (signUpForm) {
    const emailInput = signUpForm.querySelector('input[name="email"]');
    const errorMsg = signUpForm.querySelector(".input__error");

    emailInput.addEventListener("input", function () {
      if (this.value.trim() !== "" && !validateEmail(this.value)) {
        if (errorMsg) errorMsg.style.display = "block";
      } else {
        if (errorMsg) errorMsg.style.display = "none";
      }
    });

    signUpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = emailInput.value;

      if (!validateEmail(email)) {
        if (errorMsg) errorMsg.style.display = "block";
        return;
      }

      const formData = new FormData();
      formData.append("action", "send_subscribe_form");
      formData.append("email", email);

      fetch(ajaxUrl, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            signUpForm.reset();
            if (signUpModal) signUpModal.classList.remove("visible");
            sessionStorage.setItem("subscribed", "true");
          }
        });
    });
  }

  const footerForm = document.querySelector(".footer__form");
  if (footerForm) {
    const emailInput = footerForm.querySelector('input[name="email"]');
    const errorMsg = footerForm.querySelector(".input__error");

    emailInput.addEventListener("input", function () {
      if (this.value.trim() !== "" && !validateEmail(this.value)) {
        if (errorMsg) errorMsg.style.display = "block";
      } else {
        if (errorMsg) errorMsg.style.display = "none";
      }
    });

    footerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = emailInput.value;

      if (!validateEmail(email)) {
        if (errorMsg) errorMsg.style.display = "block";
        return;
      }

      const formData = new FormData();
      formData.append("action", "send_subscribe_form");
      formData.append("email", email);

      fetch(ajaxUrl, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            footerForm.reset();
            sessionStorage.setItem("subscribed", "true");

              const successModal = document.querySelector(".success--send");
              if (successModal) successModal.classList.add("visible");
          }
        });
    });
  }

  const form = document.querySelector(".contact-modal__form");
  if (!form) return;

  const fullNameInput = form.querySelector('input[name="full_name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const submitBtn = form.querySelector(".contact-modal__button");
  const emailError = emailInput.closest("label").querySelector(".input__error");
  const successModal = document.querySelector(".success--send");
  const successCloseBtns = document.querySelectorAll(
    ".success__close, .success__button",
  );

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function checkForm() {
    const isNameFilled = fullNameInput.value.trim() !== "";
    const isEmailValid = validateEmail(emailInput.value);

    if (isNameFilled && isEmailValid) {
      submitBtn.classList.remove("disable");
    } else {
      submitBtn.classList.add("disable");
    }
  }

  emailInput.addEventListener("input", function () {
    if (this.value.trim() !== "" && !validateEmail(this.value)) {
      emailError.style.display = "block";
    } else {
      emailError.style.display = "none";
    }
    checkForm();
  });

  fullNameInput.addEventListener("input", checkForm);

  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitBtn.classList.contains("disable")) return;

    const formData = new FormData(form);
    formData.append("action", "send_contact_form");

    fetch(ajaxUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          form.reset();
          const dropdownText = form.querySelector(".dropdown__header p");
          if (dropdownText) {
            dropdownText.textContent = "select question";
          }
          checkForm();
          if (successModal) successModal.classList.add("visible");
        }
      });
  });

  successCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (successModal) successModal.classList.remove("visible");
    });
  });
});
