//Notification
function showNotification(message, type = "success") {
  //Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  //Create new notification
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  //Show notifiation
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  //Auto hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

//Date Slot Logic
const dateSlots = [];

// Set minimum date to today and initialize existing slots
document.addEventListener("DOMContentLoaded", function () {
  const today = new Date().toISOString().split("T")[0];
  const dateSlotInput = document.getElementById("dateSlotInput");
  if (dateSlotInput) {
    dateSlotInput.setAttribute("min", today);
  }

  // Initialize existing slots from the EJS template
  initializeExistingSlots();
});

function initializeExistingSlots() {
  const existingSlots = document.querySelectorAll(
    "#dateSlotGroup .date-slot-item"
  );

  existingSlots.forEach((slot) => {
    const dateValue = slot.getAttribute("data-date");
    if (dateValue && !dateSlots.includes(dateValue)) {
      dateSlots.push(dateValue);
    }
  });
  updateHiddenInput();
}

function addDateSlot() {
  const dateInput = document.getElementById("dateSlotInput");
  const selectedDate = dateInput.value;

  if (!selectedDate) {
    showNotification("Please select a date", "error");
    return;
  }

  // Check if date already exists in slots array
  if (dateSlots.includes(selectedDate)) {
    showNotification("This date is already added", "error");
    dateInput.value = "";
    return;
  }

  // Check if date is in the past
  const today = new Date().toISOString().split("T")[0];
  if (selectedDate < today) {
    showNotification("Cannot add past dates", "error");
    dateInput.value = "";
    return;
  }

  dateSlots.push(selectedDate);
  updateDateSlotUI();
  dateInput.value = ""; // reset input
}

// Function to remove date slot (compatible with edit tour page)
function removeDateSlot(buttonElement) {
  const slotItem = buttonElement.closest(".date-slot-item");
  if (!slotItem) return;

  const dateValue = slotItem.getAttribute("data-date");
  if (dateValue) {
    // Remove from dateSlots array
    const index = dateSlots.indexOf(dateValue);
    if (index > -1) {
      dateSlots.splice(index, 1);
    }
  }

  // Remove the slot item from UI
  slotItem.remove();

  // Update hidden input
  updateHiddenInput();
}

function updateDateSlotUI() {
  const div = document.getElementById("dateSlotGroup");
  if (!div) return;

  // Clear all and rebuild
  div.innerHTML = "";

  // Sort dates chronologically
  const sortedDates = [...dateSlots].sort(); //Create new array of dateSlots and sort it into sortedDates

  sortedDates.forEach((date) => {
    const slotItem = document.createElement("div");
    slotItem.className = "date-slot-item";
    slotItem.setAttribute("data-date", date);

    const dateSpan = document.createElement("span");
    dateSpan.textContent = new Date(date).toLocaleDateString();

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => removeDateSlot(removeBtn);

    slotItem.appendChild(dateSpan);
    slotItem.appendChild(removeBtn);
    div.appendChild(slotItem);
  });

  updateHiddenInput();
}

function updateHiddenInput() {
  const hiddenInput = document.getElementById("dateSlotHidden");
  if (!hiddenInput) return;

  // Format as JSON array with availability objects
  const availabilityArray = dateSlots.map((date) => ({
    date: date,
    isBooked: false,
  }));
  hiddenInput.value = JSON.stringify(availabilityArray); //Convert array/obj data into JSON string to value input
}

//Image validation configuration + Tour image preview
document.addEventListener("DOMContentLoaded", function () {
  const IMAGE_CONFIG = {
    REQUIRED_COUNT: 5,
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/jpg"],
  };

  const imageInput = document.getElementById("tour-images");
  const previewGrid = document.getElementById("imagePreviewGrid");
  const helpEl = document.getElementById("image-help");
  const validationContainer = document.getElementById(
    "imageValidationMessages"
  );

  if (!imageInput || !previewGrid) return;

  let validFiles = [];

  function validateSingleFile(file) {
    //Check file type
    if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        message: "Invalid file type. Only JPG and PNG files are allowed.",
      };
    }

    //Check file size
    if (file.size > IMAGE_CONFIG.MAX_SIZE_BYTES) {
      return {
        isValid: false,
        message: `File size too large. Maximum ${IMAGE_CONFIG.MAX_SIZE_MB}MB allowed.`,
      };
    }

    return { isValid: true };
  }

  function showValidationMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `alert alert-${
      type === "error" ? "danger" : "info"
    } py-2 mb-1`;
    messageDiv.textContent = message;

    validationContainer.appendChild(messageDiv);
    validationContainer.style.display = "block";
  }

  function clearValidationMessages() {
    validationContainer.innerHTML = "";
    validationContainer.style.display = "none";
  }

  function updateCount(count) {
    if (helpEl) {
      helpEl.textContent = `${count}/${IMAGE_CONFIG.REQUIRED_COUNT} selected (required ${IMAGE_CONFIG.REQUIRED_COUNT})`;
      helpEl.className =
        count === IMAGE_CONFIG.REQUIRED_COUNT
          ? "form-text text-success"
          : "form-text text-danger";
    }
  }

  function updateSubmitButton() {
    const submitButton = document.querySelector('button[type="submit"]');
    const isValid = validFiles.length === IMAGE_CONFIG.REQUIRED_COUNT;

    if (submitButton) {
      submitButton.disabled = !isValid;

      if (!isValid) {
        submitButton.title = `Please upload exactly ${IMAGE_CONFIG.REQUIRED_COUNT} valid images`;
      } else {
        submitButton.title = "";
      }
    }
  }

  function renderPreviews() {
    previewGrid.innerHTML = "";
    validFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);

      const card = document.createElement("div");
      card.className = "image-preview-card d-flex flex-row position-relative";

      const img = document.createElement("img");
      img.src = url;
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(url);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "image-remove-btn";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
      removeBtn.onclick = () => {
        validFiles.splice(index, 1);
        updateFileInput();
        renderPreviews();
        updateCount(validFiles.length);
        updateSubmitButton();
      };

      // Add file size display
      const sizeDisplay = document.createElement("small");
      sizeDisplay.className = "d-block text-center mt-1";
      sizeDisplay.textContent = `${Math.round(file.size / 1024)}KB`;

      card.appendChild(img);
      card.appendChild(removeBtn);
      card.appendChild(sizeDisplay);
      previewGrid.appendChild(card);
    });
  }

  function updateFileInput() {
    const dt = new DataTransfer();
    validFiles.forEach((file) => dt.items.add(file));
    imageInput.files = dt.files;
  }

  imageInput.addEventListener("change", function () {
    const files = Array.from(imageInput.files);
    clearValidationMessages();

    //Validation each file
    const validationResults = files.map((file) => validateSingleFile(file));
    const newValidFiles = files.filter(
      (file, index) => validationResults[index].isValid
    );

    //Check total count
    if (files.length !== IMAGE_CONFIG.REQUIRED_COUNT) {
      showValidationMessage(
        `You must select exactly ${IMAGE_CONFIG.REQUIRED_COUNT} images. Currently selected: ${files.length}`,
        "error"
      );
    }

    //Display validation errors for individual files
    validationResults.forEach((result, index) => {
      if (!result.isValid) {
        showValidationMessage(
          `${files[index].name}: ${result.message}`,
          "error"
        );
      }
    });

    //Update valid files
    validFiles = newValidFiles;
    renderPreviews();
    updateCount(validFiles.length);
    updateSubmitButton();
  });

  //Initial setup
  updateCount(0);
  updateSubmitButton();
});

// Location Autocomplete Logic
document.addEventListener("DOMContentLoaded", function () {
  const locationInput = document.getElementById("tour-location-input");
  const suggestionsContainer = document.getElementById("location-suggestions");
  if (!locationInput || !suggestionsContainer) return;

  let debounceTimer = null;
  let selectedLocation = null;

  // Check if we're in edit mode and initialize selectedLocation
  function initializeEditModeLocation() {
    const addressField = document.getElementById("location-address");
    const cityField = document.getElementById("location-city");
    const latField = document.getElementById("location-lat");
    const lngField = document.getElementById("location-lng");

    if (
      addressField &&
      cityField &&
      latField &&
      lngField &&
      addressField.value &&
      cityField.value &&
      latField.value &&
      lngField.value
    ) {
      // We're in edit mode with existing location data
      selectedLocation = {
        address: addressField.value,
        city: cityField.value,
        coordinates: {
          lat: parseFloat(latField.value),
          lng: parseFloat(lngField.value),
        },
        placeId: document.getElementById("location-place-id")?.value || "",
      };
      updateLocationInputStyle();
    }
  }

  // Initialize edit mode location data
  initializeEditModeLocation();

  // Form validation for location selection
  const tourForm = document.querySelector(".tour-creation-form");
  if (tourForm) {
    tourForm.addEventListener("submit", function (e) {
      if (!selectedLocation) {
        e.preventDefault();
        showNotification(
          "Please select location from our suggestion list below!",
          "error"
        );
        locationInput.focus();
        return false;
      }
    });
  }

  locationInput.addEventListener("input", function () {
    const query = this.value.trim();
    
    // Clear selected location when user types again
    selectedLocation = null;
    updateLocationInputStyle();

    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    // Debounce API calls
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchLocations(query);
    }, 300);
  });

  locationInput.addEventListener("blur", function () {
    // Delay hiding to allow for suggestion clicks
    setTimeout(() => {
      hideSuggestions();
    }, 200);
  });

  async function searchLocations(query) {
    try {
      const response = await fetch(
        `/search-locations?input=${encodeURIComponent(query)}`
      );
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        showSuggestions(result.data);
      } else {
        hideSuggestions();
      }
    } catch (error) {
      console.error("Error searching locations:", error);
      hideSuggestions();
    }
  }

  function showSuggestions(suggestions) {
    suggestionsContainer.innerHTML = "";

    if (suggestions.length === 0) {
      hideSuggestions();
      return;
    }

    suggestions.forEach((suggestion) => {
      const suggestionItem = document.createElement("a");
      suggestionItem.className = "dropdown-item";
      suggestionItem.href = "#";
      suggestionItem.innerHTML = `
        <div class="fw-bold">${suggestion.mainText || suggestion.text || ""}</div>
        <small class="text-muted">${suggestion.secondaryText || ""}</small>
      `;

      suggestionItem.addEventListener("mousedown", function (e) {
        e.preventDefault();
        selectLocation(suggestion);
      });
      
      suggestionItem.addEventListener("click", function (e) {
        e.preventDefault();
        selectLocation(suggestion);
      });

      suggestionsContainer.appendChild(suggestionItem);
    });

    suggestionsContainer.style.display = "block";
  }

  function hideSuggestions() {
    suggestionsContainer.style.display = "none";
  }


  function updateLocationInputStyle() {
    const feedbackEl = document.getElementById("location-feedback");

    if (selectedLocation) {
      locationInput.classList.add("is-valid");
      locationInput.classList.remove("is-invalid");
      if (feedbackEl) {
        feedbackEl.textContent =
          "✓ Location selected from the suggestion list.";
        feedbackEl.className = "form-text text-success";
      }
    } else {
      locationInput.classList.remove("is-valid");
      if (locationInput.value.length > 0) {
        locationInput.classList.add("is-invalid");
        if (feedbackEl) {
          feedbackEl.textContent =
            "Please select a location from the suggestion list below.";
          feedbackEl.className = "form-text text-danger";
        }
      } else {
        locationInput.classList.remove("is-invalid");
        if (feedbackEl) {
          feedbackEl.textContent =
            "Enter the location name and select from the suggestion list.";
          feedbackEl.className = "form-text text-muted";
        }
      }
    }
  }

  async function selectLocation(suggestion) {
    try {
      const displayText =
        suggestion.text ||
        [suggestion.mainText, suggestion.secondaryText]
          .filter(Boolean)
          .join(" — ");
      locationInput.value = displayText;
      hideSuggestions();

      // Get detailed place information
      const response = await fetch(`/place-details/${suggestion.placeId}`);
      const result = await response.json();
      if (!(result.success && result.data)) {
        console.error('Failed to get place details:', result);
        showNotification('Failed to get location details', 'error');
        return;
      }

      const place = result.data;
      selectedLocation = place;

      // Fill hidden form fields
      document.getElementById("location-address").value = place.address || "";
      document.getElementById("location-city").value = place.city || "";
      document.getElementById("location-lat").value =
        place.coordinates?.lat ?? "";
      document.getElementById("location-lng").value =
        place.coordinates?.lng ?? "";
      document.getElementById("location-place-id").value = place.placeId || "";

      // Update input styling to show valid selection
      updateLocationInputStyle();
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  }
});

//Change the Profile Photo
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("profilePhoto");
  const changeBtn = document.getElementById("changePhotoBtn");
  const preview = document.getElementById("profilePicturePreview");
  const error = document.getElementById("profilePhotoError");

  function showError(msg) {
    if (!error) return;
    error.textContent = msg;
    error.style.display = "block";
  }

  function clearError() {
    if (!error) return;
    error.textContent = "";
    error.style.display = "none";
  }

  if (changeBtn && input) {
    changeBtn.addEventListener("click", () => input.click());
  }

  if (input && preview) {
    input.addEventListener("change", () => {
      clearError();
      const file = input.files[0];
      if (!file) return;

      //2MB size limit
      if (file.size > 2 * 1024 * 1024) {
        showError("File is too large (max 2MB).");
        input.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.onload = () => URL.revokeObjectURL(url);
    });
  }
});

//Button Function
document.addEventListener("DOMContentLoaded", () => {
  //Handle create tour button
  document.querySelectorAll(".user-createtour-button").forEach((button) => {
    button.addEventListener("click", function () {
      window.location.href = "/createTour";
    });
  });

  //Handle edit button
  document.querySelectorAll(".btn-edit").forEach((button) => {
    button.addEventListener("click", function () {
      const tourId = this.getAttribute("data-tour-id");
      window.location.href = `/editTour/${tourId}`;
    });
  });

  //Handle delete button (soft delete)
  document.querySelectorAll(".btn-delete").forEach((button) => {
    button.addEventListener("click", function () {
      const tourId = this.getAttribute("data-tour-id");
      const tourTitle = this.closest(".service-card")
        .querySelector(".service-card-title")
        .textContent.trim();

      if (
        confirm(
          `Are you sure you want to delete "${tourTitle}"? This tour will be moved to the deleted section.`
        )
      ) {
        fetch(`/deleteTour/${tourId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              location.reload();
            } else {
              showNotification("Error deleting tour:" + data.message, "error");
            }
          })
          .catch((error) => {
            showNotification("Error deleting tour", "error");
          });
      }
    });
  });

  //Handle restore button
  document.querySelectorAll(".btn-restore").forEach((button) => {
    button.addEventListener("click", function () {
      const tourId = this.getAttribute("data-tour-id");
      const tourTitle = this.closest(".service-card")
        .querySelector(".service-card-title")
        .textContent.trim();

      if (
        confirm(
          `Are you sure you want to restore "${tourTitle}"? This tour will be moved back to your active section.`
        )
      ) {
        fetch(`/restoreTour/${tourId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              location.reload();
            } else {
              showNotification("Error restoring tour:" + data.message, "error");
            }
          })
          .catch((error) => {
            showNotification("Error restoring tour", "error");
          });
      }
    });
  });
});

// Handle certification upload button
document.addEventListener("DOMContentLoaded", function () {
  const certInput = document.getElementById("certificateInput");
  const certUploadHelpEl = document.getElementById("certUploadHelpEl");

  const CERT_CONFIG = {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  };

  function showCertError(message) {
    if (certUploadHelpEl) {
      certUploadHelpEl.innerHTML = `<span class="text-danger">${message}</span>`;
    }
  }

  function clearCertError() {
    if (certUploadHelpEl) {
      certUploadHelpEl.innerHTML = "";
    }
  }

  if (certInput) {
    certInput.addEventListener("change", function (e) {
      const uploadBtn = document.getElementById("uploadBtn");
      const file = e.target.files && e.target.files[0];

      clearCertError();

      if (!file) {
        uploadBtn.style.display = "none";
        if (certUploadHelpEl) {
          certUploadHelpEl.textContent = "(No file selected)";
        }
        return;
      }

      // Validate file type
      if (!CERT_CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showCertError(
          "Invalid file type. Only PDF, JPG, and PNG files are allowed."
        );
        certInput.value = "";
        uploadBtn.style.display = "none";
        return;
      }

      // Validate file size
      if (file.size > CERT_CONFIG.MAX_SIZE_BYTES) {
        showCertError(
          `File size too large. Maximum ${CERT_CONFIG.MAX_SIZE_MB}MB allowed.`
        );
        certInput.value = "";
        uploadBtn.style.display = "none";
        return;
      }

      // File is valid
      uploadBtn.style.display = "inline-block";
      if (certUploadHelpEl) {
        const fileSizeKB = Math.round(file.size / 1024);
        certUploadHelpEl.innerHTML = `<span class="text-success">(${file.name} - ${fileSizeKB}KB)</span>`;
      }
    });
  }
});
