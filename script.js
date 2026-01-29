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
let currentAdminTab = 'projects'; 
let dataCache = { projects: [], experience: [], education: [], skills: [], references: [] };

document.addEventListener('DOMContentLoaded', () => {
    initializeScrollAnimations();
    initializeSmoothScroll();
    initializeNavigation();
    checkVisitorLock();
    
    ['projects', 'experience', 'education', 'skills', 'references'].forEach(col => fetchCollection(col));
    
    auth.onAuthStateChanged((user) => {
        const loginSection = document.getElementById('adminLoginSection');
        const contentSection = document.getElementById('adminContent');
        if (user) {
            if(loginSection) loginSection.style.display = 'none';
            if(contentSection) { contentSection.style.display = 'block'; switchAdminTab(currentAdminTab); }
        } else {
            if(loginSection) loginSection.style.display = 'block';
            if(contentSection) contentSection.style.display = 'none';
        }
    });
});

// Helper for Animations (Open/Close)
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('active');
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
    const idMatch = url.match(/\/d\/(.+?)\//);
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
        items.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            return (b.id || 0) - (a.id || 0);
        });
        dataCache[collectionName] = items;
        if (collectionName === 'projects') renderProjects();
        if (collectionName === 'experience') renderExperience();
        if (collectionName === 'education') renderEducation();
        if (collectionName === 'skills') renderSkills();
        if (collectionName === 'references') renderReferencesModal();
        if(document.getElementById('adminModal').classList.contains('active')) renderAdminList();
    });
}

function renderProjects() {
    const container = document.getElementById('publicProjects'); if(!container) return;
    const publicProjects = dataCache.projects.filter(p => p.visibility === 'public');
    container.innerHTML = '';
    publicProjects.forEach(project => container.appendChild(createProjectCard(project, false)));
    if(isPrivateUnlocked) renderPrivateProjects();
}
function renderPrivateProjects() {
    const container = document.getElementById('privateProjects'); if(!container) return;
    const privateProjects = dataCache.projects.filter(p => p.visibility === 'private');
    container.innerHTML = '';
    privateProjects.forEach(project => container.appendChild(createProjectCard(project, true)));
}
function renderExperience() {
    const container = document.getElementById('experienceList'); if(!container) return;
    container.innerHTML = '';
    dataCache.experience.forEach((exp, i) => {
        const markerClass = i === 0 ? 'timeline-marker current' : 'timeline-marker';
        const highlights = (exp.highlights || []).map(h => `<div class="highlight-item"><span class="material-symbols-rounded">arrow_right</span><div>${h}</div></div>`).join('');
        container.innerHTML += `<div class="timeline-item" data-animate><div class="${markerClass}"></div><div class="timeline-content"><div class="experience-card"><div class="exp-header"><div><h3 class="exp-title">${exp.role}</h3><p class="exp-company">${exp.company}</p></div><div class="exp-period"><span class="material-symbols-rounded">schedule</span>${exp.period}</div></div><div class="exp-highlights">${highlights}</div></div></div></div>`;
    });
}
function renderEducation() {
    const container = document.getElementById('educationList'); if(!container) return;
    container.innerHTML = '';
    dataCache.education.forEach(edu => {
        container.innerHTML += `<div class="education-card" data-animate><div class="edu-icon"><span class="material-symbols-rounded">school</span></div><h3>${edu.degree}</h3><p class="edu-field">${edu.field}</p><p class="edu-institution">${edu.institution}</p><p class="edu-year">${edu.year}</p></div>`;
    });
}
function renderSkills() {
    const container = document.getElementById('skillsList'); if(!container) return;
    container.innerHTML = '';
    dataCache.skills.forEach(cat => {
        const items = (cat.items || []).map(s => `<li>${s}</li>`).join('');
        container.innerHTML += `<div class="skill-category" data-animate><div class="category-icon"><span class="material-symbols-rounded">${cat.icon||'star'}</span></div><h3>${cat.category}</h3><ul class="skill-list">${items}</ul></div>`;
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
    card.innerHTML = `<div class="project-header"><div class="project-icon"><span class="material-symbols-rounded">${project.icon||'work'}</span></div><div class="project-status ${isPrivate?'private':''}">${project.status}</div></div><div><h3 class="project-title">${project.title}</h3><p class="project-description">${project.description}</p><div class="project-tags">${(project.tags||[]).slice(0,3).map(t=>`<span class="project-tag">${t}</span>`).join('')}</div></div>`;
    return card;
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="switchAdminTab('${tab}')"]`);
    if(btn) btn.classList.add('active');
    renderAdminList();
}

function renderAdminList() {
    const container = document.getElementById('adminList'); const items = dataCache[currentAdminTab] || []; container.innerHTML = '';
    if (items.length === 0) { container.innerHTML = `<p style="padding:1rem;">No items.</p>`; return; }
    items.forEach((item, index) => {
        let title = item.name || item.title || item.role || item.degree || item.category;
        let subtitle = item.company || item.institution || item.relation || item.status || "";
        const upDisabled = index === 0 ? 'opacity:0.3; pointer-events:none;' : '';
        const downDisabled = index === items.length - 1 ? 'opacity:0.3; pointer-events:none;' : '';
        container.innerHTML += `<div class="admin-project-item"><div style="flex-grow:1; padding-right:1rem;"><strong>${title}</strong><div style="font-size:0.8rem; color:#666;">${subtitle}</div></div><div class="admin-btn-group"><button class="btn-move" onclick="moveItem('${item.docId}', -1)" style="${upDisabled}">↑</button><button class="btn-move" onclick="moveItem('${item.docId}', 1)" style="${downDisabled}">↓</button><div style="width:1px;height:20px;background:#ddd;"></div><button class="btn-edit" onclick="editItem('${item.docId}')">Edit</button><button class="btn-delete" onclick="deleteItem('${item.docId}')">Delete</button></div></div>`;
    });
}

function showAddItemForm() { document.getElementById('addItemForm').style.display = 'block'; document.getElementById('editItemId').value = ''; document.getElementById('dynamicFormFields').innerHTML = generateFormFields(currentAdminTab); }
function editItem(docId) { const item = dataCache[currentAdminTab].find(i => i.docId === docId); if (!item) return; document.getElementById('addItemForm').style.display = 'block'; document.getElementById('editItemId').value = docId; document.getElementById('dynamicFormFields').innerHTML = generateFormFields(currentAdminTab, item); }
function generateFormFields(type, data = {}) {
    const v = (key) => data[key] || '';
    if (type === 'projects') return `<input type="text" id="inp_title" placeholder="Title" value="${v('title')}"><input type="text" id="inp_desc" placeholder="Desc" value="${v('description')}"><textarea id="inp_details" placeholder="Details" rows="3">${v('details')}</textarea><input type="text" id="inp_link" placeholder="Link" value="${v('link')}"><input type="text" id="inp_tags" placeholder="Tags" value="${(data.tags||[]).join(',')}"><select id="inp_visibility"><option value="public">Public</option><option value="private">Private</option></select><label><input type="checkbox" id="inp_highlight" ${v('highlight')?'checked':''}> Highlight</label>`;
    if (type === 'experience') return `<input type="text" id="inp_role" placeholder="Role" value="${v('role')}"><input type="text" id="inp_company" placeholder="Company" value="${v('company')}"><input type="text" id="inp_period" placeholder="Period" value="${v('period')}"><textarea id="inp_highlights" placeholder="Highlights" rows="5">${(data.highlights||[]).join('\n')}</textarea>`;
    if (type === 'education') return `<input type="text" id="inp_degree" placeholder="Degree" value="${v('degree')}"><input type="text" id="inp_field" placeholder="Field" value="${v('field')}"><input type="text" id="inp_institution" placeholder="Inst" value="${v('institution')}"><input type="text" id="inp_year" placeholder="Year" value="${v('year')}">`;
    if (type === 'skills') return `<input type="text" id="inp_category" placeholder="Cat" value="${v('category')}"><input type="text" id="inp_icon" placeholder="Icon" value="${v('icon')}"><textarea id="inp_items" placeholder="Items" rows="3">${(data.items||[]).join(',')}</textarea>`;
    if (type === 'references') return `<input type="text" id="inp_name" placeholder="Name" value="${v('name')}"><input type="text" id="inp_role" placeholder="Role" value="${v('role')}"><input type="text" id="inp_company" placeholder="Company" value="${v('company')}"><input type="text" id="inp_relation" placeholder="Relation" value="${v('relation')}"><input type="text" id="inp_image" placeholder="Image URL (Drive/GitHub)" value="${v('image')}"><textarea id="inp_quote" placeholder="Quote" rows="2">${v('quote')}</textarea><input type="text" id="inp_linkedin" placeholder="LinkedIn" value="${v('linkedin')}"><input type="text" id="inp_email" placeholder="Email" value="${v('email')}">`;
}
function saveItemToFirebase() {
    const docId = document.getElementById('editItemId').value;
    const currentItems = dataCache[currentAdminTab] || [];
    const maxOrder = currentItems.reduce((max, item) => Math.max(max, item.order || 0), 0);
    let data = { id: Date.now() }; if(!docId) data.order = maxOrder + 1;
    if (currentAdminTab === 'projects') { data.title = document.getElementById('inp_title').value; data.description = document.getElementById('inp_desc').value; data.details = document.getElementById('inp_details').value; data.link = document.getElementById('inp_link').value; data.tags = document.getElementById('inp_tags').value.split(','); data.visibility = document.getElementById('inp_visibility').value; data.highlight = document.getElementById('inp_highlight').checked; data.status='Active'; data.icon='work'; }
    else if (currentAdminTab === 'experience') { data.role = document.getElementById('inp_role').value; data.company = document.getElementById('inp_company').value; data.period = document.getElementById('inp_period').value; data.highlights = document.getElementById('inp_highlights').value.split('\n'); }
    else if (currentAdminTab === 'education') { data.degree = document.getElementById('inp_degree').value; data.field = document.getElementById('inp_field').value; data.institution = document.getElementById('inp_institution').value; data.year = document.getElementById('inp_year').value; }
    else if (currentAdminTab === 'skills') { data.category = document.getElementById('inp_category').value; data.icon = document.getElementById('inp_icon').value; data.items = document.getElementById('inp_items').value.split(','); }
    else if (currentAdminTab === 'references') { data.name = document.getElementById('inp_name').value; data.role = document.getElementById('inp_role').value; data.company = document.getElementById('inp_company').value; data.relation = document.getElementById('inp_relation').value; data.image = document.getElementById('inp_image').value; data.quote = document.getElementById('inp_quote').value; data.linkedin = document.getElementById('inp_linkedin').value; data.email = document.getElementById('inp_email').value; }
    if (docId) db.collection(currentAdminTab).doc(docId).update(data).then(() => { alert("Updated!"); document.getElementById('addItemForm').style.display = 'none'; });
    else db.collection(currentAdminTab).add(data).then(() => { alert("Created!"); document.getElementById('addItemForm').style.display = 'none'; });
}
function deleteItem(docId) { if(confirm("Delete?")) db.collection(currentAdminTab).doc(docId).delete(); }
function cancelAddItem() { document.getElementById('addItemForm').style.display = 'none'; }
async function moveItem(docId, dir) { const items = [...dataCache[currentAdminTab]]; const idx = items.findIndex(i=>i.docId===docId); if(idx===-1)return; const tIdx=idx+dir; if(tIdx<0||tIdx>=items.length)return; [items[idx], items[tIdx]] = [items[tIdx], items[idx]]; const batch=db.batch(); items.forEach((it,i)=>batch.update(db.collection(currentAdminTab).doc(it.docId),{order:i+1})); await batch.commit(); }
function initializeNavigation() { document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); l.classList.add('active'); })); }
function initializeSmoothScroll() { document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'}); })); }
function initializeScrollAnimations() { const obs = new IntersectionObserver(e => e.forEach(en => { if(en.isIntersecting) { en.target.style.opacity='1'; en.target.style.transform='translateY(0)'; } })); document.querySelectorAll('[data-animate]').forEach(el => { el.style.opacity='0'; el.style.transform='translateY(30px)'; el.style.transition='opacity 0.6s ease, transform 0.6s ease'; obs.observe(el); }); }
function toggleMobileMenu() { document.querySelector('.nav-links').classList.toggle('active'); }
function checkVisitorLock() {}
function openProjectDetails(p) { const m=document.getElementById('projectDetailModal'); document.getElementById('detailTitle').textContent=p.title; document.getElementById('detailIcon').textContent=p.icon||'work'; document.getElementById('detailDescription').textContent=p.details||p.description; document.getElementById('detailTags').innerHTML=(p.tags||[]).map(t=>`<span class="project-tag">${t}</span>`).join(''); document.getElementById('detailLinkContainer').innerHTML=`<a href="${p.link||'#'}" target="_blank" class="btn-primary" style="width:100%;justify-content:center;">More Info <span class="material-symbols-rounded">open_in_new</span></a>`; openModal('projectDetailModal'); }
function closeProjectDetails() { closeModal('projectDetailModal'); }
function showReferences() { openModal('referencesModal'); }
function closeReferences() { closeModal('referencesModal'); }
function showPrivateProjects() { openModal('privateProjectsModal'); if(isPrivateUnlocked) { document.getElementById('passwordSection').style.display='none'; document.getElementById('privateProjectsContent').style.display='block'; renderPrivateProjects(); } }
function closePrivateProjects() { closeModal('privateProjectsModal'); }
function showAdminPanel() { openModal('adminModal'); }
function closeAdminPanel() { closeModal('adminModal'); }
function verifyVisitorPassword() { if(document.getElementById('privatePassword').value==="mechanical2025") { isPrivateUnlocked=true; showPrivateProjects(); } else alert("Wrong Password"); }
function handlePasswordEnter(e) { if(e.key==='Enter') verifyVisitorPassword(); }

window.addEventListener('click', e => { if(e.target===document.getElementById('privateProjectsModal')) closePrivateProjects(); if(e.target===document.getElementById('adminModal')) closeAdminPanel(); if(e.target===document.getElementById('projectDetailModal')) closeProjectDetails(); if(e.target===document.getElementById('referencesModal')) closeReferences(); });