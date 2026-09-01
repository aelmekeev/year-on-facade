let map;
let marker;
let currentWidePhoto = null;
let currentClosePhoto = null;
let currentGroupId = null;
let photoGroups = [];

const els = {
    gallery: document.getElementById('gallery'),
    inboxCount: document.getElementById('inbox-count'),
    btnReset: document.getElementById('btn-reset'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnPublish: document.getElementById('btn-publish'),
    imgWide: document.getElementById('img-wide'),
    imgClose: document.getElementById('img-close'),
    form: document.getElementById('building-form'),
    inputYear: document.getElementById('input-year'),
    inputLat: document.getElementById('input-lat'),
    inputLng: document.getElementById('input-lng'),
    inputCity: document.getElementById('input-city'),
    selectCity: document.getElementById('select-city'),
    inputCountry: document.getElementById('input-country'),
    inputExternal: document.getElementById('input-external'),
    inputNotes: document.getElementById('input-notes'),
    btnSave: document.getElementById('btn-save'),
    dupWarning: document.getElementById('duplicate-warning'),
    linkStreetview: document.getElementById('link-streetview'),
    toast: document.getElementById('toast'),
    overlay: document.getElementById('loading-overlay'),
    overlayText: document.getElementById('loading-text'),
    modal: document.getElementById('photo-modal'),
    modalImg: document.getElementById('modal-img'),
    wideSlot: document.getElementById('wide-slot'),
    closeSlot: document.getElementById('close-slot')
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
                mapTypeId: 'satellite',
                mapTypeControl: false,
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
                saveState();
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
        map.setZoom(19);
    }
}

function saveCustomGroups() {
    const custom = photoGroups.map(g => g.map(p => p.filename));
    localStorage.setItem('customGroups', JSON.stringify(custom));
}

async function loadInbox() {
    try {
        const res = await fetch('/api/inbox');
        const data = await res.json();
        
        let allPhotos = [];
        data.groups.forEach(g => allPhotos.push(...g));
        
        const savedGroupsStr = localStorage.getItem('customGroups');
        if (savedGroupsStr) {
            const savedGroups = JSON.parse(savedGroupsStr);
            const newPhotoGroups = [];
            
            savedGroups.forEach(filenames => {
                const group = [];
                filenames.forEach(f => {
                    const photo = allPhotos.find(p => p.filename === f);
                    if (photo) {
                        group.push(photo);
                        allPhotos = allPhotos.filter(p => p.filename !== f);
                    }
                });
                if (group.length > 0) newPhotoGroups.push(group);
            });
            
            // Add any remaining photos as single groups (new photos added since last save)
            allPhotos.forEach(p => newPhotoGroups.push([p]));
            
            photoGroups = newPhotoGroups;
            saveCustomGroups(); // clean up dead files
        } else {
            photoGroups = data.groups;
        }
        
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
        meta.textContent = `(${group.length})`;
        if (group[0].datetime) {
            const date = new Date(group[0].datetime);
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String(date.getFullYear()).slice(-2);
            meta.textContent += ` • ${d}/${m}/${y} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        div.appendChild(img);
        div.appendChild(meta);
        
        if (group.length === 2) {
            const btn = document.createElement('button');
            btn.className = 'btn-ungroup';
            btn.innerHTML = '&#8644;'; // switch icon or similar, unicode arrows
            btn.title = 'Ungroup';
            btn.onclick = (e) => {
                e.stopPropagation();
                const p2 = group.pop();
                photoGroups.splice(index + 1, 0, [p2]);
                saveCustomGroups();
                renderGallery();
            };
            div.appendChild(btn);
        }
        
        div.addEventListener('click', () => selectGroup(group, div));
        
        // Make gallery group draggable for manual grouping
        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'gallery', filename: group[0].filename, groupIndex: index }));
        });
        
        // Make gallery group droppable for merging
        div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
        div.addEventListener('dragleave', e => div.classList.remove('drag-over'));
        div.addEventListener('drop', e => {
            e.preventDefault();
            div.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'gallery' && data.groupIndex !== index) {
                    if (photoGroups[index].length + photoGroups[data.groupIndex].length > 2) {
                        showToast('Cannot group more than 2 photos', 'error');
                        return;
                    }
                    photoGroups[index] = [...photoGroups[index], ...photoGroups[data.groupIndex]];
                    photoGroups.splice(data.groupIndex, 1);
                    saveCustomGroups();
                    renderGallery();
                }
            } catch (err) {}
        });
        
        els.gallery.appendChild(div);
    });
}

function saveState() {
    if (!currentGroupId) return;
    const state = {
        year: els.inputYear.value,
        lat: els.inputLat.value,
        lng: els.inputLng.value,
        city: els.inputCity.value,
        country: els.inputCountry.value,
        external: els.inputExternal.value,
        notes: els.inputNotes.value,
        widePhoto: currentWidePhoto,
        closePhoto: currentClosePhoto
    };
    localStorage.setItem('state_' + currentGroupId, JSON.stringify(state));
    updateStreetViewLink();
}

function updateStreetViewLink() {
    const lat = els.inputLat.value;
    const lng = els.inputLng.value;
    if (lat && lng) {
        els.linkStreetview.href = `https://www.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=12,0,0,0,-15`;
        els.linkStreetview.style.display = 'inline-block';
    } else {
        els.linkStreetview.style.display = 'none';
    }
}

function loadState() {
    if (!currentGroupId) return false;
    const saved = localStorage.getItem('state_' + currentGroupId);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            els.inputYear.value = state.year || '';
            els.inputLat.value = state.lat || '';
            els.inputLng.value = state.lng || '';
            els.inputCity.value = state.city || '';
            els.inputCountry.value = state.country || '';
            els.inputExternal.value = state.external || '';
            els.inputNotes.value = state.notes || '';
            
            // Only override if both are present to prevent duplicating photos from old state format
            if (state.widePhoto !== undefined && state.closePhoto !== undefined) {
                currentWidePhoto = state.widePhoto;
                currentClosePhoto = state.closePhoto;
            }
            
            if (state.lat && state.lng) {
                updateMapMarker(state.lat, state.lng);
            }
            if (state.year && state.city && state.country) {
                checkYear();
            }
            return true;
        } catch(e) {}
    }
    return false;
}

function updateSlotImages() {
    if (currentWidePhoto) {
        els.imgWide.src = `/repo/photos/inbox/${currentWidePhoto}`;
        els.imgWide.style.display = 'block';
    } else {
        els.imgWide.style.display = 'none';
    }
    
    if (currentClosePhoto) {
        els.imgClose.src = `/repo/photos/inbox/${currentClosePhoto}`;
        els.imgClose.style.display = 'block';
    } else {
        els.imgClose.style.display = 'none';
    }
    els.btnSave.disabled = !currentWidePhoto;
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
    currentGroupId = group[0].filename;
    
    if (group.length > 1) {
        currentClosePhoto = group[0].filename; // earlier photo
        currentWidePhoto = group[1].filename; // later photo
    } else {
        currentWidePhoto = group[0].filename;
        currentClosePhoto = null;
    }
    
    // Attempt to load saved state
    const hasSavedState = loadState();
    
    updateSlotImages();

    if (!hasSavedState) {
        // Auto-fill coords from first photo
        if (group[0].lat && group[0].lng) {
            els.inputLat.value = group[0].lat;
            els.inputLng.value = group[0].lng;
            updateMapMarker(group[0].lat, group[0].lng);
            geocode(group[0].lat, group[0].lng);
        }
    }
    
    updateStreetViewLink();
    els.btnSave.disabled = false;
}

async function geocode(lat, lng) {
    try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        
        els.inputCity.style.display = 'block';
        els.selectCity.style.display = 'none';
        els.selectCity.innerHTML = '';
        els.selectCity.onchange = null;
        
        if (data.matches && data.matches.length === 1) {
            els.inputCity.value = data.matches[0].city;
            els.inputCountry.value = data.matches[0].country;
            checkYear();
        } else if (data.matches && data.matches.length > 1) {
            showToast('Multiple matching regions found. Please select one.', 'warning');
            els.inputCity.style.display = 'none';
            els.inputCity.value = '';
            els.inputCountry.value = '';
            
            els.selectCity.style.display = 'block';
            els.selectCity.innerHTML = '<option value="" disabled selected>Select region...</option>';
            data.matches.forEach(m => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(m);
                opt.textContent = `${m.city}, ${m.country}`;
                els.selectCity.appendChild(opt);
            });
            
            els.selectCity.onchange = (e) => {
                const selected = JSON.parse(e.target.value);
                els.inputCity.value = selected.city;
                els.inputCountry.value = selected.country;
                checkYear();
                saveState();
            };
        } else {
            if (els.selectCity.style.display !== 'none' && els.selectCity.value) {
                // If they already selected one, keep it
            } else {
                els.inputCity.value = '';
                els.inputCountry.value = '';
                els.selectCity.style.display = 'none';
                els.inputCity.style.display = 'block';
                checkYear();
            }
            showToast('No configured city found for these coordinates', 'error');
        }
    } catch (e) {
        console.error(e);
    }
}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function checkYear(options = {}) {
    const year = els.inputYear.value;
    const city = els.inputCity.value;
    const country = els.inputCountry.value;
    
    if (year && city && country && year.length >= 4) {
        const res = await fetch(`/api/check-year?country=${country}&city=${city}&year=${year}`);
        const data = await res.json();
        
        if (data.exists && data.data && data.data.notes === 'TODO') {
            const currentLat = parseFloat(els.inputLat.value);
            const currentLng = parseFloat(els.inputLng.value);
            const todoLat = parseFloat(data.data.latitude);
            const todoLng = parseFloat(data.data.longitude);
            
            if (!isNaN(currentLat) && !isNaN(currentLng) && !isNaN(todoLat) && !isNaN(todoLng)) {
                const dist = getDistanceFromLatLonInM(currentLat, currentLng, todoLat, todoLng);
                if (dist <= 500) {
                    els.dupWarning.style.display = 'none';
                    
                    if (options.autoFill) {
                        els.inputExternal.value = data.data.external || '';
                        els.inputLat.value = data.data.latitude;
                        els.inputLng.value = data.data.longitude;
                        
                        if (els.inputNotes.value === '' || els.inputNotes.value === 'TODO') {
                            els.inputNotes.value = '';
                        }
                        
                        updateMapMarker(todoLat, todoLng);
                        updateStreetViewLink();
                        saveState();
                        showToast(`Loaded TODO data for ${year}`);
                    }
                    return;
                }
            }
        }
        
        if (data.exists) {
            els.dupWarning.style.display = 'block';
            const dupLink = document.getElementById('dup-link');
            if (dupLink) {
                dupLink.href = `https://year-on-facade.uk/item/?city=${encodeURIComponent(city)}&year=${encodeURIComponent(year)}`;
            }
        } else {
            els.dupWarning.style.display = 'none';
        }
    } else {
        els.dupWarning.style.display = 'none';
    }
}

els.inputYear.addEventListener('input', () => {
    checkYear({ autoFill: true });
    saveState();
});
['inputLat', 'inputLng', 'inputCity', 'inputCountry', 'inputExternal', 'inputNotes'].forEach(key => {
    els[key].addEventListener('input', saveState);
});

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
            localStorage.removeItem('state_' + currentGroupId);
            els.form.reset();
            updateStreetViewLink();
            els.imgWide.style.display = 'none';
            els.imgClose.style.display = 'none';
            els.btnSave.disabled = true;
            currentGroupId = null;
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

els.btnReset.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved state and manual grouping?')) {
        localStorage.clear();
        location.reload();
    }
});

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

// Setup Drag and Drop for slots
function setupSlotDrop(slotElement, slotName) {
    slotElement.addEventListener('dragover', e => {
        e.preventDefault();
        slotElement.classList.add('drag-over');
    });
    slotElement.addEventListener('dragleave', e => {
        slotElement.classList.remove('drag-over');
    });
    slotElement.addEventListener('drop', e => {
        e.preventDefault();
        slotElement.classList.remove('drag-over');
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (data.type === 'slot') {
                if (data.slot !== slotName) {
                    // Swap
                    const temp = currentWidePhoto;
                    currentWidePhoto = currentClosePhoto;
                    currentClosePhoto = temp;
                    updateSlotImages();
                    saveState();
                }
            } else if (data.type === 'gallery') {
                // Manual assign from gallery
                if (slotName === 'wide') {
                    currentWidePhoto = data.filename;
                } else {
                    currentClosePhoto = data.filename;
                }
                updateSlotImages();
                saveState();
            }
        } catch (err) {}
    });
}

setupSlotDrop(els.wideSlot, 'wide');
setupSlotDrop(els.closeSlot, 'close');

// Make images in slots draggable for swapping
els.imgWide.draggable = true;
els.imgClose.draggable = true;

els.imgWide.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot', slot: 'wide' }));
});
els.imgClose.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot', slot: 'close' }));
});

// Modal Logic
function openModal(src) {
    els.modalImg.src = src;
    els.modal.style.display = 'flex';
}

els.modal.addEventListener('click', () => {
    els.modal.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.modal.style.display === 'flex') {
        els.modal.style.display = 'none';
    }
});

els.wideSlot.addEventListener('click', (e) => {
    // Only open modal if we didn't start a drag
    if (currentWidePhoto) openModal(els.imgWide.src);
});

els.closeSlot.addEventListener('click', (e) => {
    if (currentClosePhoto) openModal(els.imgClose.src);
});

// Init
initGoogleMaps();
loadInbox();

