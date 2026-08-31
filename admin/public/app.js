let map;
let marker;
let currentWidePhoto = null;
let currentClosePhoto = null;
let photoGroups = [];

const els = {
    gallery: document.getElementById('gallery'),
    inboxCount: document.getElementById('inbox-count'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnPublish: document.getElementById('btn-publish'),
    imgWide: document.getElementById('img-wide'),
    imgClose: document.getElementById('img-close'),
    form: document.getElementById('building-form'),
    inputYear: document.getElementById('input-year'),
    inputLat: document.getElementById('input-lat'),
    inputLng: document.getElementById('input-lng'),
    inputCity: document.getElementById('input-city'),
    inputCountry: document.getElementById('input-country'),
    inputExternal: document.getElementById('input-external'),
    inputNotes: document.getElementById('input-notes'),
    btnSave: document.getElementById('btn-save'),
    dupWarning: document.getElementById('duplicate-warning'),
    toast: document.getElementById('toast'),
    overlay: document.getElementById('loading-overlay'),
    overlayText: document.getElementById('loading-text')
};

function showToast(msg, type = 'success') {
    els.toast.textContent = msg;
    els.toast.className = `toast show ${type}`;
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, 3000);
}

function showLoading(msg) {
    els.overlayText.textContent = msg;
    els.overlay.style.display = 'flex';
}

function hideLoading() {
    els.overlay.style.display = 'none';
}

async function initGoogleMaps() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        if (!config.GOOGLE_MAPS_API_KEY) {
            console.warn('No Google Maps API key provided');
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        window.initMap = function() {
            map = new google.maps.Map(document.getElementById('map-container'), {
                center: { lat: 51.505, lng: -0.09 },
                zoom: 13,
                mapTypeId: 'roadmap',
                mapTypeControl: true,
                fullscreenControl: true,
                streetViewControl: false
            });

            map.addListener('click', (e) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                els.inputLat.value = lat;
                els.inputLng.value = lng;
                updateMapMarker(lat, lng);
                geocode(lat, lng);
            });
        };
        
        document.head.appendChild(script);
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

function updateMapMarker(lat, lng) {
    const position = { lat: parseFloat(lat), lng: parseFloat(lng) };
    if (!marker) {
        marker = new google.maps.Marker({
            position: position,
            map: map
        });
    } else {
        marker.setPosition(position);
    }
    if (map) {
        map.setCenter(position);
        map.setZoom(16);
    }
}

async function loadInbox() {
    try {
        const res = await fetch('/api/inbox');
        const data = await res.json();
        photoGroups = data.groups;
        renderGallery();
    } catch (e) {
        showToast('Error loading inbox', 'error');
    }
}

function renderGallery() {
    els.gallery.innerHTML = '';
    els.inboxCount.textContent = photoGroups.length;

    photoGroups.forEach((group, index) => {
        const div = document.createElement('div');
        div.className = 'gallery-group';
        
        // Show first photo as thumbnail
        const img = document.createElement('img');
        img.src = `/repo/photos/inbox/${group[0].filename}`;
        
        const meta = document.createElement('div');
        meta.className = 'group-meta';
        meta.textContent = `${group.length} photo(s)`;
        if (group[0].datetime) {
            const date = new Date(group[0].datetime);
            meta.textContent += ` • ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        div.appendChild(img);
        div.appendChild(meta);
        
        div.addEventListener('click', () => selectGroup(group, div));
        els.gallery.appendChild(div);
    });
}

function selectGroup(group, element) {
    document.querySelectorAll('.gallery-group').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // Reset form
    els.form.reset();
    els.imgWide.style.display = 'none';
    els.imgClose.style.display = 'none';
    els.dupWarning.style.display = 'none';
    currentWidePhoto = null;
    currentClosePhoto = null;
    
    // Assign photos
    currentWidePhoto = group[0].filename;
    els.imgWide.src = `/repo/photos/inbox/${currentWidePhoto}`;
    els.imgWide.style.display = 'block';
    
    if (group.length > 1) {
        currentClosePhoto = group[1].filename;
        els.imgClose.src = `/repo/photos/inbox/${currentClosePhoto}`;
        els.imgClose.style.display = 'block';
    }

    // Auto-fill coords from first photo
    if (group[0].lat && group[0].lng) {
        els.inputLat.value = group[0].lat;
        els.inputLng.value = group[0].lng;
        updateMapMarker(group[0].lat, group[0].lng);
        geocode(group[0].lat, group[0].lng);
    }
    
    els.btnSave.disabled = false;
}

async function geocode(lat, lng) {
    try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (data.city && data.country) {
            els.inputCity.value = data.city;
            els.inputCountry.value = data.country;
            checkYear();
        } else {
            els.inputCity.value = '';
            els.inputCountry.value = '';
            showToast('No configured city found for these coordinates', 'error');
        }
    } catch (e) {
        console.error(e);
    }
}

async function checkYear() {
    const year = els.inputYear.value;
    const city = els.inputCity.value;
    const country = els.inputCountry.value;
    
    if (year && city && country && year.length >= 4) {
        const res = await fetch(`/api/check-year?country=${country}&city=${city}&year=${year}`);
        const data = await res.json();
        els.dupWarning.style.display = data.exists ? 'block' : 'none';
    }
}

els.inputYear.addEventListener('input', checkYear);

els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentWidePhoto) return;
    
    const payload = {
        year: els.inputYear.value,
        lat: parseFloat(els.inputLat.value),
        lng: parseFloat(els.inputLng.value),
        city: els.inputCity.value,
        country: els.inputCountry.value,
        external: els.inputExternal.value,
        notes: els.inputNotes.value,
        widePhoto: currentWidePhoto,
        closePhoto: currentClosePhoto
    };
    
    showLoading('Saving building...');
    try {
        const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            showToast('Building saved!');
            els.form.reset();
            els.imgWide.style.display = 'none';
            els.imgClose.style.display = 'none';
            els.btnSave.disabled = true;
            await loadInbox();
        } else {
            showToast(data.error, 'error');
        }
    } catch (e) {
        showToast('Save failed', 'error');
    } finally {
        hideLoading();
    }
});

els.btnRefresh.addEventListener('click', loadInbox);

els.btnPublish.addEventListener('click', async () => {
    if (!confirm('Run make build, commit to a branch, create PR, and upload photos?')) return;
    
    showLoading('Publishing batch... this might take a while.');
    try {
        const res = await fetch('/api/publish', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Batch published successfully!');
            console.log(data.output);
        } else {
            showToast('Publish failed, check console', 'error');
            console.error(data.output);
        }
    } catch (e) {
        showToast('Publish request failed', 'error');
    } finally {
        hideLoading();
    }
});

// Init
initGoogleMaps();
loadInbox();
