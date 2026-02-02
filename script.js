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
let dataCache = { projects: [], experience: [], education: [], skills: [], references: [], settings: [] };

document.addEventListener('DOMContentLoaded', () => {
    initializeScrollAnimations();
    initializeSmoothScroll();
    initializeNavigation();
    checkVisitorLock();
    initializeHeroParallax();

    // FETCH ALL COLLECTIONS (Including Settings)
    ['projects', 'experience', 'education', 'skills', 'references', 'settings'].forEach(col => fetchCollection(col));
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
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
    }, 280);
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
        const highlights = (exp.highlights || []).map(h => `<div class="highlight-item"><span class="material-symbols-rounded">arrow_right</span><div>${h}</div></div>`).join('');
        container.innerHTML += `<div class="timeline-item" data-animate><div class="${markerClass}"></div><div class="timeline-content"><div class="experience-card"><div class="exp-header"><div><h3 class="exp-title">${exp.role}</h3><p class="exp-company">${exp.company}</p></div><div class="exp-period"><span class="material-symbols-rounded">schedule</span>${exp.period}</div></div><div class="exp-highlights">${highlights}</div></div></div></div>`;
    });
}
function renderEducation() {
    const container = document.getElementById('educationList'); if (!container) return;
    container.innerHTML = '';
    dataCache.education.forEach(edu => {
        container.innerHTML += `<div class="education-card" data-animate><div class="edu-icon"><span class="material-symbols-rounded">school</span></div><h3>${edu.degree}</h3><p class="edu-field">${edu.field}</p><p class="edu-institution">${edu.institution}</p><p class="edu-year">${edu.year}</p></div>`;
    });
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
    card.onclick = () => openProjectDetails(project);
    card.innerHTML = `<div class="project-header"><div class="project-icon"><span class="material-symbols-rounded">${project.icon || 'work'}</span></div><div class="project-status ${isPrivate ? 'private' : ''}">${project.status}</div></div><div><h3 class="project-title">${project.title}</h3><p class="project-description">${project.description}</p><div class="project-tags">${(project.tags || []).slice(0, 3).map(t => `<span class="project-tag">${t}</span>`).join('')}</div></div>`;
    return card;
}

// [Restored Helper Functions]
function initializeNavigation() { document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); l.classList.add('active'); })); }
function initializeSmoothScroll() { document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' }); })); }
function initializeScrollAnimations() { const obs = new IntersectionObserver(e => e.forEach(en => { if (en.isIntersecting) { en.target.style.opacity = '1'; en.target.style.transform = 'translateY(0)'; } })); document.querySelectorAll('[data-animate]').forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(30px)'; el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'; obs.observe(el); }); }
function toggleMobileMenu() { document.querySelector('.nav-links').classList.toggle('active'); }
function checkVisitorLock() { }

// CAROUSEL LOGIC
let currentSlideIndex = 0;
let currentProjectImages = [];

function openProjectDetails(p) {
    const m = document.getElementById('projectDetailModal');
    document.getElementById('detailTitle').textContent = p.title;
    document.getElementById('detailIcon').textContent = p.icon || 'work';
    document.getElementById('detailDescription').textContent = p.details || p.description;
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

    openModal('projectDetailModal');
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
function showReferences() { openModal('referencesModal'); }
function closeReferences() { closeModal('referencesModal'); }
function showPrivateProjects() { openModal('privateProjectsModal'); if (isPrivateUnlocked) { document.getElementById('passwordSection').style.display = 'none'; document.getElementById('privateProjectsContent').style.display = 'block'; renderPrivateProjects(); } }
function closePrivateProjects() { closeModal('privateProjectsModal'); }
function verifyVisitorPassword() { if (document.getElementById('privatePassword').value === "mechanical2025") { isPrivateUnlocked = true; showPrivateProjects(); } else alert("Wrong Password"); }
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
            // FIX: Get the EXACT position of the card on the screen right now
            const rect = card.getBoundingClientRect();

            // Calculate the center of the card relative to the viewport
            // We subtract the current transform to get the "resting" position
            // otherwise the card chases itself and glitches
            const currentTransform = new WebKitCSSMatrix(window.getComputedStyle(card).transform);
            const cardCenterX = rect.left + (rect.width / 2) - currentTransform.m41;
            const cardCenterY = rect.top + (rect.height / 2) - currentTransform.m42;

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