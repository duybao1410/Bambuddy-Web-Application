const sortSelect = document.getElementById("sortSelect");
const sortForm = document.getElementById("sortForm");
const sortOrderInput = document.getElementById("sortOrderInput");

sortSelect.addEventListener("change", function () {
  const [sortBy, sortOrder] = this.value.split("|");
  sortOrderInput.value = sortOrder || "asc";
  sortForm.submit();
});

const searchInput = document.querySelector('input[name="search"]');
const resultsBox = document.getElementById("autocomplete-results");
let debounceTimer;

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  clearTimeout(debounceTimer);
  if (!query) {
    resultsBox.innerHTML = "";
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/search?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        resultsBox.innerHTML = data.data
          .map(
            (item) => `
                <li class="list-group-item list-group-item-action" role="option" onclick="selectSuggestion('${item.title}')">
                  <strong>${item.title}</strong><br>
                  <small>${item.location.city}</small>
                </li>
              `
          )
          .join("");
      } else {
        resultsBox.innerHTML =
          '<li class="list-group-item" role="option">No results found</li>';
      }
    } catch (err) {
      console.error("Autocomplete fetch failed:", err);
      resultsBox.innerHTML =
        '<li class="list-group-item" role="option">Error fetching results</li>';
    }
  }, 300);
});

function selectSuggestion(value) {
  searchInput.value = value;
  resultsBox.innerHTML = "";
  searchInput.closest("form").submit();
}

document.addEventListener("click", (e) => {
  if (!resultsBox.contains(e.target) && e.target !== searchInput) {
    resultsBox.innerHTML = "";
  }
});

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

// Tour Comparison Functionality - Slot Based System with Persistence
let tourSlots = [null, null]; // Two fixed slots
let isMinimized = false;
const MAX_TOURS = 2;
const STORAGE_KEY = "tourComparisonSlots";
const MINIMIZED_KEY = "comparisonMinimized";

// Load saved comparison data from localStorage
function loadComparisonFromStorage() {
  try {
    const savedSlots = localStorage.getItem(STORAGE_KEY);
    const savedMinimized = localStorage.getItem(MINIMIZED_KEY);

    if (savedSlots) {
      tourSlots = JSON.parse(savedSlots);
    }

    if (savedMinimized) {
      isMinimized = JSON.parse(savedMinimized);
    }
  } catch (error) {
    console.log("Error loading comparison data:", error);
    tourSlots = [null, null];
    isMinimized = false;
  }
}

// Save comparison data to localStorage
function saveComparisonToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tourSlots));
    localStorage.setItem(MINIMIZED_KEY, JSON.stringify(isMinimized));
  } catch (error) {
    console.log("Error saving comparison data:", error);
  }
}

// Clear comparison data from localStorage
function clearComparisonStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MINIMIZED_KEY);
  } catch (error) {
    console.log("Error clearing comparison data:", error);
  }
}

function updateComparisonBox() {
  const comparisonBox = document.getElementById("comparisonBox");
  const compareButton = document.getElementById("compareButton");
  const statusText = document.getElementById("statusText");

  // Count selected tours
  const selectedCount = tourSlots.filter((slot) => slot !== null).length;

  // Show/hide box based on selection
  if (selectedCount === 0) {
    comparisonBox.style.display = "none";
    // Update button states before hiding (fix for Issue 2)
    updateCompareButtonStates();
    // Clear storage when no tours selected
    clearComparisonStorage();
    return;
  }

  if (comparisonBox.style.display === "none") {
    comparisonBox.style.display = "block";
    comparisonBox.classList.add("show-animation");
    setTimeout(() => comparisonBox.classList.remove("show-animation"), 400);
  }

  // Update each slot
  tourSlots.forEach((tour, index) => {
    const slotId = `tourSlot${index + 1}`;
    const slot = document.getElementById(slotId);

    if (tour) {
      // Show tour card
      slot.innerHTML = `
            <div class="card tour-card h-100">
              <img src="/uploads/tours/${tour.image}" class="card-img-top" alt="${tour.title}">
              <button type="button" class="btn btn-sm remove-btn" 
                      onclick="removeTourFromSlot(${index})" title="Remove">
                <i class="bi bi-x"></i>
              </button>
              <div class="card-body">
                <h6 class="card-title">${tour.title}</h6>
              </div>
            </div>
          `;
    } else {
      // Show placeholder
      slot.innerHTML = `
            <div class="placeholder-card">
              <div class="placeholder-icon">
                <i class="bi bi-plus-circle text-muted"></i>
              </div>
              <small class="text-muted">Select a tour to compare</small>
            </div>
          `;
    }
  });

  // Update status and buttons
  statusText.textContent = `Selected ${selectedCount} tour`;
  compareButton.disabled = selectedCount !== MAX_TOURS;

  // Update + button states on tour cards
  updateCompareButtonStates();

  // Save to localStorage after updating
  saveComparisonToStorage();
}

function toggleComparisonBox() {
  const comparisonBox = document.getElementById("comparisonBox");
  const comparisonContent = document.getElementById("comparisonContent");
  const minimizedContent = document.getElementById("minimizedContent");

  isMinimized = !isMinimized;

  if (isMinimized) {
    comparisonBox.classList.add("minimized");
    comparisonContent.style.display = "none";
    minimizedContent.style.display = "block";
  } else {
    comparisonBox.classList.remove("minimized");
    comparisonContent.style.display = "block";
    minimizedContent.style.display = "none";
  }

  // Save minimized state
  saveComparisonToStorage();
}

function addTourToSlot(tourId, tourTitle, tourImage) {
  // Find first empty slot
  const emptySlotIndex = tourSlots.findIndex((slot) => slot === null);

  if (emptySlotIndex === -1) {
    showNotification("Compare up to 2 tours only.", "info");
    return;
  }

  // Check if tour already exists in any slot
  const existingSlotIndex = tourSlots.findIndex(
    (slot) => slot && slot.id === tourId
  );
  if (existingSlotIndex !== -1) {
    // Remove from existing slot instead
    removeTourFromSlot(existingSlotIndex);
    return;
  }

  // Add to empty slot
  tourSlots[emptySlotIndex] = {
    id: tourId,
    title: tourTitle,
    image: tourImage,
  };

  updateComparisonBox();
  showNotification(`${tourTitle} is added to compare`, "success");
}

function removeTourFromSlot(slotIndex) {
  if (tourSlots[slotIndex]) {
    const removedTour = tourSlots[slotIndex];
    tourSlots[slotIndex] = null;
    updateComparisonBox();
    showNotification(
      `${removedTour.title} is deleted from comparison box`,
      "info"
    );
  }
}

function updateCompareButtonStates() {
  const compareButtons = document.querySelectorAll(".compare-tour-btn");
  compareButtons.forEach((button) => {
    const tourId = button.getAttribute("data-tour-id");
    const isSelected = tourSlots.some((slot) => slot && slot.id === tourId);
    const hasEmptySlot = tourSlots.some((slot) => slot === null);
    const isDisabled = !isSelected && !hasEmptySlot;

    button.disabled = isDisabled;

    if (isSelected) {
      button.classList.remove("text-success");
      button.classList.add("text-warning");
      button.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
      button.setAttribute(
        "aria-label",
        `Remove ${button.getAttribute("data-tour-title")} from comparison`
      );
    } else {
      button.classList.remove("text-warning");
      button.classList.add("text-success");
      button.innerHTML = '<i class="bi bi-plus-circle"></i>';
      button.setAttribute(
        "aria-label",
        `Add ${button.getAttribute("data-tour-title")} to comparison`
      );
    }

    if (isDisabled) {
      button.classList.add("text-muted");
    } else {
      button.classList.remove("text-muted");
    }
  });
}

function compareTours() {
  const selectedTours = tourSlots.filter((slot) => slot !== null);
  if (selectedTours.length !== MAX_TOURS) {
    showNotification("Compare up to 2 tours only.", "error");
    return;
  }

  const tourIds = selectedTours.map((tour) => tour.id).join(",");
  window.location.href = `/compareTours?tours=${tourIds}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const saveButtons = document.querySelectorAll(".save-tour-btn");
  const compareButtons = document.querySelectorAll(".compare-tour-btn");
  const isLoggedIn = document.body.getAttribute("data-logged-in") === "true";
  const userRole = document.body.getAttribute("data-user-role");

  // Initialize comparison data from localStorage (Fix for Issue 1)
  loadComparisonFromStorage();

  // Restore comparison box state if data exists
  const selectedCount = tourSlots.filter((slot) => slot !== null).length;
  if (selectedCount > 0) {
    updateComparisonBox();

    // Restore minimized state if it was minimized
    if (isMinimized) {
      const comparisonBox = document.getElementById("comparisonBox");
      const comparisonContent = document.getElementById("comparisonContent");
      const minimizedContent = document.getElementById("minimizedContent");

      comparisonBox.classList.add("minimized");
      comparisonContent.style.display = "none";
      minimizedContent.style.display = "block";
    }
  }

  // Handle compare button clicks
  compareButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const tourId = button.getAttribute("data-tour-id");
      const tourTitle = button.getAttribute("data-tour-title");
      const tourImage = button.getAttribute("data-tour-image");
      addTourToSlot(tourId, tourTitle, tourImage);
    });
  });

  // Handle comparison box controls
  document
    .getElementById("compareButton")
    .addEventListener("click", compareTours);
  document
    .getElementById("minimizeButton")
    .addEventListener("click", toggleComparisonBox);

  // Make minimized box clickable to expand
  document
    .getElementById("minimizedContent")
    .addEventListener("click", toggleComparisonBox);

  // Initialize comparison button states
  updateCompareButtonStates();

  //Check saved status for all tours on page load (only if logged in)
  if (isLoggedIn) {
    saveButtons.forEach(async (button) => {
      const tourId = button.getAttribute("data-tour-id");
      try {
        const response = await fetch(`/user/check-saved-tour/${tourId}`);
        const result = await response.json();

        if (result.success && result.isSaved) {
          //Mark as saved
          const icon = button.querySelector(".save-icon");
          icon.classList.remove("bi-bookmark");
          icon.classList.add("bi-bookmark-fill");
          button.classList.add("saved");
        }
      } catch (err) {
        console.log("Error checking saved status:", err);
      }
    });
  }

  //Handle save/unsave click
  saveButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();

      // Check if user is logged in
      if (!isLoggedIn) {
        window.location.href = "/auth/login";
        return;
      }

      // Check if user role is admin or tourguide
      if (userRole === "admin" || userRole === "tourguide") {
        showNotification("This role cannot save tours", "error");
        return;
      }

      const tourId = button.getAttribute("data-tour-id");
      const icon = button.querySelector(".save-icon");
      const isSaved = button.classList.contains("saved");

      //Prevent multiple clicks
      button.disabled = true;

      if (isSaved) {
        // Change to unsaved state immediately
        icon.classList.remove("bi-bookmark-fill");
        icon.classList.add("bi-bookmark");
        button.classList.remove("saved");
      } else {
        // Change to saved state immediately
        icon.classList.remove("bi-bookmark");
        icon.classList.add("bi-bookmark-fill");
        button.classList.add("saved");
      }

      try {
        let response, result;

        if (isSaved) {
          //Remove from saved
          response = await fetch(`/user/remove-saved-tour/${tourId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          result = await response.json();

          if (result.success) {
            showNotification("Tour removed from wishlist", "info");
          } else {
            icon.classList.remove("bi-bookmark");
            icon.classList.add("bi-bookmark-fill");
            button.classList.add("saved");
            showNotification(result.error || "Failed to remove tour", "error");
          }
        } else {
          //Added to saved
          response = await fetch(`/user/save-tour/${tourId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          result = await response.json();

          if (result.success) {
            showNotification("Tour saved to wishlist!", "success");
          } else {
            icon.classList.remove("bi-bookmark-fill");
            icon.classList.add("bi-bookmark");
            button.classList.remove("saved");
            showNotification(result.error || "Failed to save tour", "error");
          }
        }

        if (!result.success) {
          showNotification(result.error || "Something went wrong", "error");
        }
      } catch (err) {
        console.error("Error saving/removing tour:", err);
        // **REVERT UI CHANGE** on network error
        if (isSaved) {
          // Revert back to saved state
          icon.classList.remove("bi-bookmark");
          icon.classList.add("bi-bookmark-fill");
          button.classList.add("saved");
        } else {
          // Revert back to unsaved state
          icon.classList.remove("bi-bookmark-fill");
          icon.classList.add("bi-bookmark");
          button.classList.remove("saved");
        }
        showNotification("Network error. Please try again.", "error");
      } finally {
        button.disabled = false;
      }
    });
  });
});

// Make functions globally accessible for onclick events
window.removeTourFromSlot = removeTourFromSlot;
