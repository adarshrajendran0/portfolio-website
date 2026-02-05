// Main JavaScript for Portfolio Website
const firebaseConfig = {
    apiKey: "AIzaSyDSUrdCcffwob-fQLolHgXbmRRGlXBG8CM",
    authDomain: "adarsh-portfolio-28430.firebaseapp.com",
    projectId: "adarsh-portfolio-28430",
    storageBucket: "adarsh-portfolio-28430.firebasestorage.app",
    messagingSenderId: "998179272542",
    appId: "1:998179272542:web:09c1931649504b0f0dc1cf"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth();

let isPrivateUnlocked = false;

// CACHE includes 'settings' for Resume URL
let dataCache = { projects: [], experience: [], education: [], skills: [], references: [], settings: [], personal: [] };

document.addEventListener('DOMContentLoaded', () => {
    initializeScrollAnimations();
    initializeSmoothScroll();
    initializeNavigation();
    checkVisitorLock();
    initializeHeroParallax();

    // FETCH ALL COLLECTIONS (Including Settings)
    ['projects', 'experience', 'education', 'skills', 'references', 'settings', 'personal'].forEach(col => fetchCollection(col));

    // SAFETY NET: Hide loader after 1.5s max to prevent infinite spinner
    setTimeout(() => {
        const loader = document.getElementById('globalLoader');
        if (loader && loader.style.display !== 'none') { // Check if still visible
            hideGlobalLoader();
        }
    }, 1500);
});

function renderHero() {
    const config = dataCache.settings.find(item => item.docId === 'config');
    if (!config) return;

    if (config.heroTitle) document.getElementById('heroTitle').innerHTML = config.heroTitle;
    if (config.heroDesc) document.getElementById('heroDesc').textContent = config.heroDesc;
    if (config.heroBadge) {
        document.getElementById('heroBadge').innerHTML = `
            <span class="material-symbols-rounded">engineering</span>
            ${config.heroBadge}
        `;
    }

    if (config.stat1Num) document.getElementById('stat1Num').textContent = config.stat1Num;
    if (config.stat1Label) document.getElementById('stat1Label').textContent = config.stat1Label;

    if (config.stat2Num) document.getElementById('stat2Num').textContent = config.stat2Num;
    if (config.stat2Label) document.getElementById('stat2Label').textContent = config.stat2Label;

    if (config.stat3Num) document.getElementById('stat3Num').textContent = config.stat3Num;
    if (config.stat3Label) document.getElementById('stat3Label').textContent = config.stat3Label;
}

// Helper for Animations (Open/Close)
// Helper for Animations (Open/Close)
let modalTriggers = new Map(); // Store trigger element for each modal ID

function openModal(modalId, triggerElement = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Store trigger for closing animation
    if (triggerElement) {
        modalTriggers.set(modalId, triggerElement);
    } else {
        // Fallback: If no trigger passed, check if we have one stored (e.g. from previous open) based on context? 
        // Better: Reset if no trigger, so we don't animate to random spot
        // But for things like "Private Projects" which might be called recursively, keep existing?
        // Let's rely on explicit passing.
    }

    modal.classList.add('active');

    // iOS-Style Expansion Animation (FLIP)
    if (triggerElement) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            animateOpen(content, triggerElement, modal);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('closing');

    const content = modal.querySelector('.modal-content');
    const trigger = modalTriggers.get(modalId);

    if (trigger && content && document.contains(trigger)) {
        animateClose(content, trigger, modal);
    } else {
        // Default Fade Out if no trigger source
        setTimeout(() => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
            modal.style.opacity = ''; // Reset inline styles
        }, 300);
    }
}

function animateOpen(destination, source, modalWrapper) {
    // 1. FIRST: Get starting state
    const srcRect = source.getBoundingClientRect();

    // 2. LAST: Get final state (need to be visible/layouted)
    // Modal is already 'display: flex' due to .active class
    const destRect = destination.getBoundingClientRect();

    // 3. INVERT: Calculate changes
    const scaleX = srcRect.width / destRect.width;
    const scaleY = srcRect.height / destRect.height;

    // Calculate center-to-center translation
    const srcCenterX = srcRect.left + srcRect.width / 2;
    const srcCenterY = srcRect.top + srcRect.height / 2;
    const destCenterX = destRect.left + destRect.width / 2;
    const destCenterY = destRect.top + destRect.height / 2;

    const translateX = srcCenterX - destCenterX;
    const translateY = srcCenterY - destCenterY;

    // 4. PLAY: Apply transforms

    // Start at Source Source
    destination.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    destination.style.transformOrigin = 'center center';
    destination.style.opacity = '0'; // Start faded out slightly? Or just transition opacity
    modalWrapper.style.opacity = '0'; // Fade in background

    // Force Reflow
    destination.offsetHeight;

    // Animate to Final State
    destination.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
    modalWrapper.style.transition = 'opacity 0.3s ease';

    destination.style.transform = 'translate(0, 0) scale(1, 1)';
    destination.style.opacity = '1';
    modalWrapper.style.opacity = '1';

    // Clean up after animation
    setTimeout(() => {
        destination.style.transition = '';
        destination.style.transform = '';
        destination.style.transformOrigin = '';
        destination.style.opacity = '';
        modalWrapper.style.transition = '';
        modalWrapper.style.opacity = '';
    }, 500);
}

function animateClose(destination, source, modalWrapper) {
    // 1. Current State (Full Size)
    // 2. Dest State (Source Rect)
    const srcRect = source.getBoundingClientRect();
    const destRect = destination.getBoundingClientRect();

    const scaleX = srcRect.width / destRect.width;
    const scaleY = srcRect.height / destRect.height;
    const srcCenterX = srcRect.left + srcRect.width / 2;
    const srcCenterY = srcRect.top + srcRect.height / 2;
    const destCenterX = destRect.left + destRect.width / 2;
    const destCenterY = destRect.top + destRect.height / 2;

    const translateX = srcCenterX - destCenterX;
    const translateY = srcCenterY - destCenterY;

    // Apply Transition
    destination.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
    modalWrapper.style.transition = 'opacity 0.4s ease';

    destination.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    destination.style.opacity = '0';
    modalWrapper.style.opacity = '0';

    setTimeout(() => {
        modalWrapper.classList.remove('active');
        modalWrapper.classList.remove('closing');

        // Reset styles
        destination.style.transition = '';
        destination.style.transform = '';
        destination.style.opacity = '';
        modalWrapper.style.transition = '';
        modalWrapper.style.opacity = ''; // Reset wrapper opacity
    }, 400);
}

function convertGoogleDriveLink(url) {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;

    // Handle /d/VERSION
    let idMatch = url.match(/\/d\/(.+?)\//);
    if (idMatch && idMatch[1]) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;

    // Handle id=VERSION
    idMatch = url.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;

    return url;
}

// LOADER LOGIC
let loadingCollections = new Set(['projects', 'experience', 'education', 'skills', 'references', 'settings', 'personal']);
function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.opacity = '0';
    setTimeout(() => { if (loader) loader.style.display = 'none'; }, 500);
}

function fetchCollection(collectionName) {
    db.collection(collectionName).onSnapshot((snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            const item = doc.data();
            item.docId = doc.id;
            items.push(item);
        });
        // Sort only if it's not settings
        if (collectionName !== 'settings') {
            items.sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                return (b.id || 0) - (a.id || 0);
            });
        }

        dataCache[collectionName] = items;

        if (collectionName === 'projects') renderProjects();
        if (collectionName === 'experience') renderExperience();
        if (collectionName === 'education') renderEducation();
        if (collectionName === 'skills') renderSkills();
        if (collectionName === 'references') renderReferencesModal();
        if (collectionName === 'settings') {
            renderSettings(); // Update Resume
            renderHero(); // Update Hero
        }
        if (collectionName === 'personal') {
            BlogApp.init(items);
        }

        // Remove from loading set
        loadingCollections.delete(collectionName);
        if (loadingCollections.size === 0) hideGlobalLoader();

    }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        // Even if error, remove from loading so we don't get stuck
        loadingCollections.delete(collectionName);
        if (loadingCollections.size === 0) hideGlobalLoader();
    });
}

// RENDER RESUME BUTTON
function renderSettings() {
    const config = dataCache.settings.find(item => item.docId === 'config');
    if (config && config.resumeUrl) {
        const btn = document.getElementById('resumeBtn');
        if (btn) {
            let url = config.resumeUrl;
            let downloadUrl = url;

            // Try to convert to direct download if it's a Drive link
            if (url.includes('drive.google.com')) {
                const idMatch = url.match(/\/d\/(.+?)\//);
                if (idMatch && idMatch[1]) {
                    downloadUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
                }
            }

            btn.href = downloadUrl;
            btn.target = "_blank";
            btn.style.cursor = 'pointer';

            // Remove any previous click handlers that might prevent default
            btn.onclick = null;
        }
    }
}

// Function openResumeModal is no longer needed but kept safe or removed if preferred.
function openResumeModal(url) {
    // Deprecated in favor of direct download
}

function renderProjects() {
    const container = document.getElementById('publicProjects'); if (!container) return;
    const publicProjects = dataCache.projects.filter(p => p.visibility === 'public');
    container.innerHTML = '';
    publicProjects.forEach(project => container.appendChild(createProjectCard(project, false)));
    if (isPrivateUnlocked) renderPrivateProjects();
}
function renderPrivateProjects() {
    const container = document.getElementById('privateProjects'); if (!container) return;
    const privateProjects = dataCache.projects.filter(p => p.visibility === 'private');
    container.innerHTML = '';
    privateProjects.forEach(project => container.appendChild(createProjectCard(project, true)));
}
function renderExperience() {
    const container = document.getElementById('experienceList'); if (!container) return;
    container.innerHTML = '';
    dataCache.experience.forEach((exp, i) => {
        const markerClass = i === 0 ? 'timeline-marker current' : 'timeline-marker';
        const highlights = (exp.highlights || []).map(h => {
            const isObj = typeof h === 'object' && h !== null;
            const text = isObj ? h.point : h;
            const story = isObj ? (h.story || '') : '';

            // Encode story for attribute
            const safeStory = story.replace(/"/g, '&quot;');
            const clickAttr = story ? `onclick="openExperienceStory(this)" data-story="${safeStory}"` : '';
            const classes = `highlight-item ${story ? 'interactive' : ''}`;

            return `<div class="${classes}" ${clickAttr}><span class="material-symbols-rounded">arrow_right</span><div>${text}</div></div>`;
        }).join('');
        container.innerHTML += `<div class="timeline-item" data-animate><div class="${markerClass}"></div><div class="timeline-content"><div class="experience-card"><div class="exp-header"><div><h3 class="exp-title">${exp.role}</h3><p class="exp-company">${exp.company}</p></div><div class="exp-period"><span class="material-symbols-rounded">schedule</span>${exp.period}</div></div><div class="exp-highlights">${highlights}</div></div></div></div>`;
    });
}
function openExperienceStory(trigger) {
    const modal = document.getElementById('experienceStoryModal');
    const content = document.getElementById('expStoryContent');
    const story = trigger ? trigger.getAttribute('data-story') : '';

    if (!modal || !content) return;

    content.innerHTML = story; // Render HTML (Rich Text)

    // Use the iOS expand animation
    openModal('experienceStoryModal', trigger);
}
function renderEducation() {
    const container = document.getElementById('educationList'); if (!container) return;
    container.innerHTML = '';
    dataCache.education.forEach(edu => {
        container.innerHTML += `<div class="education-card" data-animate onclick="openEducationDetail('${edu.docId}')" style="cursor:pointer;"><div class="edu-icon"><span class="material-symbols-rounded">school</span></div><h3>${edu.degree}</h3><p class="edu-field">${edu.field}</p><p class="edu-institution">${edu.institution}</p><p class="edu-year">${edu.year}</p></div>`;
    });
}
function openEducationDetail(docId) {
    let item;
    if (dataCache && dataCache.education) {
        item = dataCache.education.find(i => i.docId === docId);
    }

    if (!item) return;

    // 1. Check for Nested Stories (Education Stories)
    const nestedStories = (dataCache.edu_stories || []).filter(s => s.parentId === docId);

    if (nestedStories.length > 0) {
        // --- MODE A: Nested Portfolio (Gallery) ---
        // Reuse BlogApp to show these stories
        BlogApp.init(nestedStories);
        BlogApp.open();

        // Optional: We could update the modal title to "${item.degree} Gallery" if BlogApp allows
        return;
    }

    // --- MODE B: Standard Deep Dive (Reader) ---
    const reader = document.getElementById('blogReader');
    const content = document.getElementById('blogReaderContent');
    if (!reader || !content) return;

    reader.classList.add('active');

    // Build Content
    let html = `
        <div class="reader-header">
            <span class="reader-category">${item.year}</span>
            <h1>${item.degree}</h1>
            <h2 style="font-size:1.2rem; margin-top:0.5rem; color:var(--primary);">${item.institution}</h2>
        </div>
    `;

    if (item.contentBlocks && item.contentBlocks.length > 0) {
        html += '<div class="reader-body">';
        item.contentBlocks.forEach(block => {
            if (block.type === 'header') html += `<h3>${block.text}</h3>`;
            if (block.type === 'paragraph') html += `<p>${block.text}</p>`;
            if (block.type === 'quote') html += `<blockquote>${block.text}</blockquote>`;
            if (block.type === 'image') html += `<img src="${convertGoogleDriveLink(block.text)}" class="block-img">`;
        });
        html += '</div>';
    } else {
        html += `
        <div class="reader-body">
            <p><strong>Field of Study:</strong> ${item.field}</p>
        </div>`;
    }

    content.innerHTML = html;
    reader.scrollTop = 0;
}
function renderSkills() {
    const container = document.getElementById('skillsList'); if (!container) return;
    container.innerHTML = '';
    dataCache.skills.forEach(cat => {
        const items = (cat.items || []).map(s => `<li>${s}</li>`).join('');
        container.innerHTML += `<div class="skill-category" data-animate><div class="category-icon"><span class="material-symbols-rounded">${cat.icon || 'star'}</span></div><h3>${cat.category}</h3><ul class="skill-list">${items}</ul></div>`;
    });
}
function renderReferencesModal() {
    const container = document.getElementById('referencesListModal'); if (!container) return;
    container.innerHTML = '';
    if (dataCache.references.length === 0) { container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">References not listed yet.</p>'; return; }

    dataCache.references.forEach(ref => {
        const card = document.createElement('div'); card.className = 'reference-card';
        const safeImage = convertGoogleDriveLink(ref.image);
        let avatarHTML = safeImage && safeImage.trim() !== "" ? `<div class="ref-avatar"><img src="${safeImage}" alt="${ref.name}"></div>` : `<div class="ref-avatar placeholder">${ref.name ? ref.name.charAt(0) : '?'}</div>`;
        let quoteHTML = (ref.quote && ref.quote.trim() !== "") ? `<div class="ref-quote">"${ref.quote}"</div>` : '';
        card.innerHTML = `${avatarHTML}${quoteHTML}<div class="ref-name">${ref.name}</div><div class="ref-role">${ref.role}</div><div class="ref-company">${ref.company}</div><div class="ref-relation-badge">${ref.relation}</div><div class="ref-actions">${ref.linkedin ? `<a href="${ref.linkedin}" target="_blank" class="ref-btn linkedin"><span class="material-symbols-rounded">link</span></a>` : ''}${ref.email ? `<a href="mailto:${ref.email}" class="ref-btn email"><span class="material-symbols-rounded">mail</span></a>` : ''}</div>`;
        container.appendChild(card);
    });
}

function createProjectCard(project, isPrivate) {
    const card = document.createElement('div');
    card.className = `project-card ${project.highlight ? 'highlight' : ''}`;
    card.onclick = (e) => openProjectDetails(project, e.currentTarget);
    card.innerHTML = `<div class="project-header"><div class="project-icon"><span class="material-symbols-rounded">${project.icon || 'work'}</span></div><div class="project-status ${isPrivate ? 'private' : ''}">${project.status}</div></div><div><h3 class="project-title">${project.title}</h3><p class="project-description">${project.description}</p><div class="project-tags">${(project.tags || []).slice(0, 3).map(t => `<span class="project-tag">${t}</span>`).join('')}</div></div>`;
    return card;
}

// [Restored Helper Functions]
// [Restored Helper Functions]
function initializeNavigation() {
    const navLinksContainer = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-link, .nav-link-special');

    links.forEach(l => l.addEventListener('click', () => {
        // Active State Logic
        if (l.classList.contains('nav-link')) {
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            l.classList.add('active');
        }

        // Auto-close mobile menu (Robust Fix)
        if (navLinksContainer.classList.contains('active')) {
            navLinksContainer.classList.remove('active');
        }
    }));
}
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            // Ensure menu closes (redundant but safe)
            document.querySelector('.nav-links').classList.remove('active');
        }
    }));
}
function initializeScrollAnimations() { const obs = new IntersectionObserver(e => e.forEach(en => { if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'translateY(0)'; } })); document.querySelectorAll('[data-animate]').forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(30px)'; el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'; obs.observe(el); }); }
function toggleMobileMenu() { document.querySelector('.nav-links').classList.toggle('active'); }
function checkVisitorLock() { }

// Personal Logic is below (Verified)

// CAROUSEL LOGIC
let currentSlideIndex = 0;
let currentProjectImages = [];

function openProjectDetails(p, trigger = null) {
    const m = document.getElementById('projectDetailModal');
    document.getElementById('detailTitle').textContent = p.title;
    document.getElementById('detailIcon').textContent = p.icon || 'work';
    document.getElementById('detailDescription').innerHTML = p.details || p.description; // HTML Rendering
    document.getElementById('detailTags').innerHTML = (p.tags || []).map(t => `<span class="project-tag">${t}</span>`).join('');
    document.getElementById('detailLinkContainer').innerHTML = `<a href="${p.link || '#'}" target="_blank" class="btn-primary" style="width:100%;justify-content:center;">More Info <span class="material-symbols-rounded">open_in_new</span></a>`;

    // Carousel Setup
    const carouselContainer = document.getElementById('carouselContainer');
    carouselContainer.innerHTML = '';

    if (p.images && p.images.length > 0) {
        currentProjectImages = p.images;
        currentSlideIndex = 0;

        let slidesHTML = p.images.map((img, index) => `
            <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                <div class="carousel-loader"></div>
                <img src="${convertGoogleDriveLink(img)}" 
                     onload="this.parentElement.querySelector('.carousel-loader').style.display='none'; this.style.opacity='1'" 
                     onerror="this.parentElement.querySelector('.carousel-loader').style.display='none'; this.parentElement.innerHTML='<div style=\'color:white;text-align:center;padding:2rem;\'>Image failed to load.<br>Check link permissions.</div>'"
                     referrerpolicy="no-referrer">
            </div>`).join('');
        let navHTML = '';

        if (p.images.length > 1) {
            navHTML = `
                <button class="carousel-prev" onclick="moveSlide(-1)">&#10094;</button>
                <button class="carousel-next" onclick="moveSlide(1)">&#10095;</button>
                <div class="carousel-dots">
                    ${p.images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="setSlide(${i})"></span>`).join('')}
                </div>
            `;
        }

        carouselContainer.innerHTML = `<div class="carousel">${slidesHTML}${navHTML}</div>`;
    }

    openModal('projectDetailModal', trigger);
}

function moveSlide(n) {
    showSlide(currentSlideIndex += n);
}

function setSlide(n) {
    showSlide(currentSlideIndex = n);
}

function showSlide(n) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;

    if (n >= slides.length) currentSlideIndex = 0;
    if (n < 0) currentSlideIndex = slides.length - 1;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[currentSlideIndex].classList.add('active');
    if (dots.length > 0) dots[currentSlideIndex].classList.add('active');
}

function closeProjectDetails() { closeModal('projectDetailModal'); }
function showReferences(trigger = null) { openModal('referencesModal', trigger); }
function closeReferences() { closeModal('referencesModal'); }
function showPrivateProjects() { openModal('privateProjectsModal'); if (isPrivateUnlocked) { document.getElementById('passwordSection').style.display = 'none'; document.getElementById('privateProjectsContent').style.display = 'block'; renderPrivateProjects(); } }
function closePrivateProjects() { closeModal('privateProjectsModal'); }
// HASHING HELPER
async function hashPassword(password) {
    const SALT = "adarsh-portfolio-2025"; // Shared with admin.js
    const msgBuffer = new TextEncoder().encode(password + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// RATE LIMITING STATE
let passwordAttempts = 0;
let lockoutUntil = 0;

async function verifyVisitorPassword() {
    const input = document.getElementById('privatePassword').value;

    // 1. Check Rate Limit
    if (Date.now() < lockoutUntil) {
        const waitTime = Math.ceil((lockoutUntil - Date.now()) / 1000);
        alert(`Too many attempts. Please try again in ${waitTime} seconds.`);
        return;
    }

    if (!input) { alert("Please enter a password"); return; }

    const config = dataCache.settings.find(item => item.docId === 'config');

    // 2. Hash Input
    let inputHash;
    try {
        inputHash = await hashPassword(input);
    } catch (e) {
        alert("Security Error: Hashing failed (Requires HTTPS/Localhost)");
        return;
    }

    // 3. Compare
    // Fallback: If no password set, use default hash of "mechanical2025" for migration
    // (Optional: remove fallback once you set a new password)
    const storedHash = config?.visitorPasswordHash;

    // Hardcoded hash for "mechanical2025" + SALT ("adarsh-portfolio-2025")
    // Let's assume for now if not set, we might default or block. 
    // Implementing strictly as requested: Verify against Stored.

    if (storedHash && inputHash === storedHash) {
        isPrivateUnlocked = true;
        showPrivateProjects();
        passwordAttempts = 0; // Reset
    } else {
        passwordAttempts++;
        if (passwordAttempts >= 3) {
            lockoutUntil = Date.now() + 30000; // 30s Lockout
            alert("Too many failed attempts. Locked for 30 seconds.");
        } else {
            alert("Wrong Password");
        }
    }
}
function handlePasswordEnter(e) { if (e.key === 'Enter') verifyVisitorPassword(); }

window.addEventListener('click', e => { if (e.target === document.getElementById('privateProjectsModal')) closePrivateProjects(); if (e.target === document.getElementById('projectDetailModal')) closeProjectDetails(); if (e.target === document.getElementById('referencesModal')) closeReferences(); });

// ==========================================
//  ROBUST MAGNETIC HERO CARDS
//  (Fixes coordinate offset issues)
// ==========================================
function initializeHeroParallax() {
    const heroSection = document.getElementById('hero');
    const cards = document.querySelectorAll('.visual-card');

    if (!heroSection || cards.length === 0) return;

    // Track mouse position relative to the viewport
    let mouseX = -1000;
    let mouseY = -1000;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        const time = Date.now() / 1000;

        cards.forEach((card, index) => {
            // Calculate the center of the card relative to the viewport
            // We subtract the current transform to get the "resting" position
            // otherwise the card chases itself and glitches
            const rect = card.getBoundingClientRect();
            const style = window.getComputedStyle(card);
            const matrix = new DOMMatrix(style.transform);

            const cardCenterX = rect.left + (rect.width / 2) - matrix.m41;
            const cardCenterY = rect.top + (rect.height / 2) - matrix.m42;

            // 3. Distance to Mouse
            const distX = mouseX - cardCenterX;
            const distY = mouseY - cardCenterY;
            const distance = Math.sqrt(distX * distX + distY * distY);

            // 4. Configuration
            const interactionRange = 500;
            let magneticX = 0;
            let magneticY = 0;
            let floatScale = 1;

            // 5. Calculate Forces
            if (distance < interactionRange) {
                const intensity = 1 - (distance / interactionRange);
                const pullStrength = intensity * intensity;

                magneticX = distX * pullStrength * 0.9;
                magneticY = distY * pullStrength * 0.9;

                floatScale = 1 - intensity;
            }

            // 6. Inherent Floating
            const floatY = Math.sin(time * 1.5 + index) * 12 * floatScale;
            const floatX = Math.cos(time * 1.2 + index) * 8 * floatScale;

            // 7. Apply Combined Movement
            card.style.transform = `translate(${floatX + magneticX}px, ${floatY + magneticY}px)`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// =========================================
//  PERSONAL INTERESTS (BEYOND RESUME) LOGIC
// =========================================

// 1. The Missing "Open" Function
function openPersonalModal() {
    const modal = document.getElementById('personalModal');
    if (modal) {
        modal.style.display = 'flex'; // This makes the popup appear
        renderPersonalTabs(); // Refresh tabs
        renderPersonalGrid('All'); // Show all cards
    } else {
        console.error("Error: 'personalModal' div is missing in HTML");
    }
}

function closePersonalModal() {
    const modal = document.getElementById('personalModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 2. The Logic to Render Categories (Tabs)
function renderPersonalTabs() {
    const container = document.getElementById('personalTabs');
    if (!container) return;

    // Get unique categories from data
    const categories = ['All', ...new Set(dataCache.personal.map(item => item.category))];

    container.innerHTML = categories.map(cat => `
        <button class="category-tab ${cat === 'All' ? 'active' : ''}" 
                onclick="filterPersonalGrid('${cat}', this)">
            ${cat}
        </button>
    `).join('');
}

// 3. The Logic to Render Cards
function filterPersonalGrid(category, btnElement) {
    // Update Active Tab UI
    if (btnElement) {
        document.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    renderPersonalGrid(category);
}

function renderPersonalGrid(category) {
    const grid = document.getElementById('personalGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Filter Data
    const items = category === 'All'
        ? dataCache.personal
        : dataCache.personal.filter(item => item.category === category);

    if (items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#666; width:100%;">No stories yet.</p>';
        return;
    }

    // Render Cards
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'personal-card'; // We need to style this class
        card.onclick = () => openPersonalDetail(item);

        const thumbUrl = item.thumbnail || convertGoogleDriveLink(item.image) || '';
        const thumbHTML = thumbUrl ? `<img src="${thumbUrl}" class="personal-thumb" loading="lazy">` : `<div class="personal-thumb" style="background:var(--tertiary-container); display:flex; align-items:center; justify-content:center; color:var(--primary); font-weight:bold;">${item.category || 'Blog'}</div>`;

        card.innerHTML = `
            ${thumbHTML}
            <div class="personal-info">
                <div class="personal-category-badge">${item.category}</div>
                <div class="personal-title">${item.title}</div>
                <div class="personal-summary">${item.summary || ''}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openPersonalDetail(item) {
    const container = document.getElementById('personalDynamicContent');
    const modal = document.getElementById('personalDetailModal');

    // BUILD CONTENT
    let html = '';

    // Header Image
    if (item.thumbnail) {
        html += `<img src="${item.thumbnail}" class="blog-header-image">`;
    }

    html += `<div class="blog-content">
                <h2 class="blog-title">${item.title}</h2>
                <div class="blog-meta">
                    <span class="material-symbols-rounded" style="font-size:1.1rem;">category</span> ${item.category}
                </div>`;

    // Dynamic Blocks
    if (item.contentBlocks && Array.isArray(item.contentBlocks)) {
        item.contentBlocks.forEach(block => {
            if (block.type === 'header') {
                html += `<h3 class="blog-block-header">${block.text}</h3>`;
            } else if (block.type === 'paragraph') {
                html += `<p class="blog-block-paragraph">${block.text}</p>`;
            } else if (block.type === 'quote') {
                html += `<blockquote class="blog-block-quote">${block.text}</blockquote>`;
            } else if (block.type === 'image') {
                // Check if text is a URL
                const url = convertGoogleDriveLink(block.text);
                html += `<img src="${url}" class="blog-block-image" loading="lazy">`;
            }
        });
    } else {
        // Fallback for simple description if no blocks
        if (item.description) html += `<p class="blog-block-paragraph">${item.description}</p>`;
    }

    html += `</div>`; // Close blog-content

    container.innerHTML = html;
    modal.classList.add('active');
}

function closePersonalDetail() {
    closeModal('personalDetailModal');
}

// =========================================
//  PERSONAL INTERESTS 2.0 (BlogApp Module)
// =========================================
const BlogApp = {
    data: [],
    activeCategory: 'All',

    init: function (data) {
        this.data = data || [];
        if (document.getElementById('blogModal') && document.getElementById('blogModal').classList.contains('active')) {
            this.renderTabs();
            this.renderGrid();
        }
    },

    open: function (trigger = null) {
        const modal = document.getElementById('blogModal');
        if (modal) {
            openModal('blogModal', trigger);
            this.renderTabs();
            this.renderGrid();
        } else {
            console.error("Blog Modal not found in DOM");
        }
    },

    close: function () {
        closeModal('blogModal');
        setTimeout(() => this.closeReader(), 300);
    },

    renderTabs: function () {
        const container = document.getElementById('blogTabs');
        if (!container) return;
        const categories = ['All', ...new Set(this.data.map(item => item.category))];
        container.innerHTML = categories.map(cat => `
            <button class="category-tab ${cat === this.activeCategory ? 'active' : ''}" 
                    onclick="BlogApp.setCategory('${cat}')">
                ${cat}
            </button>
        `).join('');
    },

    setCategory: function (cat) {
        this.activeCategory = cat;
        this.renderTabs();
        this.renderGrid();
    },

    renderGrid: function () {
        const container = document.getElementById('blogGrid');
        if (!container) return;

        const items = this.activeCategory === 'All'
            ? this.data
            : this.data.filter(item => item.category === this.activeCategory);

        if (items.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:2rem; width:100%; color:var(--on-surface-variant);">
                <span class="material-symbols-rounded" style="font-size:3rem; opacity:0.5;">library_books</span>
                <p>No stories found in this category.</p>
            </div>`;
            return;
        }

        container.innerHTML = items.map(item => {
            // Revert to Single Thumbnail Only
            let thumbUrl = item.thumbnail;
            if (!thumbUrl && item.images && item.images.length > 0) {
                // Handle legacy string URL vs new Object
                const firstImg = item.images[0];
                thumbUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
            }
            // Fallback for google drive links
            thumbUrl = convertGoogleDriveLink(thumbUrl);

            const thumbHTML = thumbUrl
                ? `<div class="card-image"><img src="${thumbUrl}" loading="lazy" alt="${item.title}"></div>`
                : `<div class="card-image"><div class="placeholder-thumb">${item.category.charAt(0)}</div></div>`;

            return `
            <div class="personal-card" onclick="BlogApp.openReader('${item.docId}', this)">
                ${thumbHTML}
                <div class="card-content">
                    <span class="status-badge">${item.category}</span>
                    <h3>${item.title}</h3>
                    <p>${item.summary || ''}</p>
                </div>
            </div>`;
        }).join('');
    },

    openReader: function (docId, trigger = null) {
        const item = this.data.find(i => i.docId === docId);
        if (!item) return;

        const reader = document.getElementById('blogReader');
        const content = document.getElementById('blogReaderContent');
        if (!reader || !content) return;

        reader.classList.add('active');

        // Build Content
        let html = `
            <div class="reader-header">
                <span class="reader-category">${item.category}</span>
                <h1>${item.title}</h1>
            </div>
        `;

        // Reader Gallery (Horizontal Scroll)
        // FILTER: Only show images where inCarousel is NOT false (Default true)
        let galleryImages = [];
        if (item.images && Array.isArray(item.images)) {
            galleryImages = item.images.filter(img => {
                if (typeof img === 'string') return true;
                return img.inCarousel !== false;
            }).map(img => typeof img === 'string' ? img : img.url);
        }

        if (galleryImages.length > 0) {
            const imagesHTML = galleryImages.map((url, idx) => `
                <img src="${convertGoogleDriveLink(url)}" 
                     onclick="openLightboxForStory('${item.docId}', ${idx}, true)"
                     style="min-width:100%; height:300px; object-fit:cover; cursor:zoom-in;">
             `).join('');

            html += `
                <div class="scrolling-image-container" style="height:300px; margin-bottom:20px;">
                    ${imagesHTML}
                </div>`;
        } else if (item.thumbnail) {
            html += `<img src="${item.thumbnail}" class="reader-hero-img">`;
        }

        if (item.contentBlocks && item.contentBlocks.length > 0) {
            html += '<div class="reader-body">';
            item.contentBlocks.forEach(block => {
                if (block.type === 'header') html += `<h3>${block.text}</h3>`;
                if (block.type === 'paragraph') html += `<p>${block.text}</p>`;
                if (block.type === 'quote') html += `<blockquote>${block.text}</blockquote>`;
                if (block.type === 'image') html += `<img src="${convertGoogleDriveLink(block.text)}" class="block-img">`;
            });
            html += '</div>';
        } else {
            if (item.description) html += `<p>${item.description}</p>`;
        }

        content.innerHTML = html;
        reader.scrollTop = 0;
    },

    closeReader: function () {
        const reader = document.getElementById('blogReader');
        if (reader) reader.classList.remove('active');
    }
};

// =========================================
//  LIGHTBOX UTILITY (Global)
// =========================================
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(images, index = 0) {
    if (!images || images.length === 0) return;
    lightboxImages = images;
    lightboxIndex = index;

    document.getElementById('lightboxModal').style.display = "block";
    updateLightboxUI();

    // Keyboard Nav
    document.addEventListener('keydown', handleLightboxKey);
}

function openLightboxForStory(docId, index = 0) {
    // Find item
    let item = BlogApp.data.find(i => i.docId === docId);
    if (!item && dataCache && dataCache.personal) {
        item = dataCache.personal.find(i => i.docId === docId);
    }

    if (item && item.images && item.images.length > 0) {
        // Filter images just like the Reader does
        const filteredImages = item.images.filter(img => {
            if (typeof img === 'string') return true;
            return img.inCarousel !== false;
        }).map(img => convertGoogleDriveLink(typeof img === 'string' ? img : img.url));

        if (filteredImages.length > 0) {
            openLightbox(filteredImages, index);
        }
    } else if (item && item.thumbnail) {
        openLightbox([item.thumbnail], 0);
    }
}

function closeLightbox() {
    document.getElementById('lightboxModal').style.display = "none";
    document.removeEventListener('keydown', handleLightboxKey);
}

function changeLightboxImage(n) {
    let newIndex = lightboxIndex + n;
    if (newIndex >= lightboxImages.length) newIndex = 0;
    if (newIndex < 0) newIndex = lightboxImages.length - 1;
    lightboxIndex = newIndex;
    updateLightboxUI();
}

function updateLightboxUI() {
    const img = document.getElementById('lightboxImage');
    img.src = lightboxImages[lightboxIndex];

    const caption = document.getElementById('lightboxCaption');
    if (lightboxImages.length > 1) {
        caption.innerText = `${lightboxIndex + 1} / ${lightboxImages.length}`;
    } else {
        caption.innerText = "";
    }
}

function handleLightboxKey(e) {
    if (e.key === "ArrowLeft") changeLightboxImage(-1);
    if (e.key === "ArrowRight") changeLightboxImage(1);
    if (e.key === "Escape") closeLightbox();
}

// Make Globally Available
window.BlogApp = BlogApp;
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');

    // Update Icon
    updateThemeIcon(isDark);

    // Save Preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = isDark ? 'dark_mode' : 'light_mode';
    }
}

// Load Theme on Start
(function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        // Wait for DOM to update icon
        document.addEventListener('DOMContentLoaded', () => updateThemeIcon(true));
    } else {
        document.addEventListener('DOMContentLoaded', () => updateThemeIcon(false));
    }
})();
console.log("Script.js Loaded Successfully");
// alert("System Loaded"); // Uncomment this if you need visual validation