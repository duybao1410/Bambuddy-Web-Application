function showReviews(event) {
    event.preventDefault();
    const reviewSection = document.getElementById('reviewSection');
    reviewSection.classList.remove('d-none');
    reviewSection.scrollIntoView({ behavior: 'smooth' });
}

function toggleCategories(event) {
    const extras = document.querySelectorAll('.extra-category');
    extras.forEach(el => el.classList.toggle('d-none'));

    const btn = event.target;
    if (btn.innerText === 'See More') {
        btn.innerText = 'Show Less';
    } else {
        btn.innerText = 'See More';
    }
}

// Initialize map with coordinates from data attribute
function initMap() {
    if (typeof google === "undefined" || !google.maps) {
        console.error("Google Maps API not loaded!");
        return;
    }

    const mapDiv = document.getElementById("map");
    if (!mapDiv) {
        console.error("Map container not found!");
        return;
    }

    // Get coordinates from data attributes
    const lat = parseFloat(mapDiv.dataset.lat);
    const lng = parseFloat(mapDiv.dataset.lng);
    const address = mapDiv.dataset.address;

    const tourLocation = { lat, lng };
    
    if (isNaN(tourLocation.lat) || isNaN(tourLocation.lng)) {
        console.error("Invalid coordinates:", tourLocation);
        return;
    }

    const map = new google.maps.Map(mapDiv, {
        center: tourLocation,
        zoom: 14,
    });

    const marker = new google.maps.Marker({
        position: tourLocation,
        map: map,
        title: address,
    });

}
function showImageModal(src){
    const modalImg = document.getElementById('modalImage');
    modalImg.src =   src
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();

}