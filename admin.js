// Admin JavaScript for Portfolio Website

// 1. Firebase Configuration & Initialization
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
const storage = firebase.storage();

// 2. State & Cache
let currentAdminTab = 'projects';
let dataCache = { projects: [], experience: [], education: [], skills: [], references: [], settings: [], personal: [] };
let currentCropTarget = null; // 'references', 'personal', etc.
let croppedBlob = null;
let quillInstances = new Map(); // Store Quill instances by ID

// 3. Initialization
// 24. Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check for Redirect Result (Mobile Login Flow)
    auth.getRedirectResult()
        .then((result) => {
            if (result.user) {
                console.log("Logged in via Redirect:", result.user.email);
            }
        })
        .catch((error) => {
            console.error("Redirect Login Error:", error);
            const errorMsg = document.getElementById('loginError');
            if (errorMsg) {
                errorMsg.textContent = "Login Failed: " + error.message;
                errorMsg.style.display = 'block';
            }
        });

    // Auth Listener
    auth.onAuthStateChanged((user) => {
        const loginSection = document.getElementById('adminLoginSection');
        const contentSection = document.getElementById('adminContent');
        const userEmailDisplay = document.getElementById('userEmailDisplay');

        if (user) {
            // SECURITY: Whitelist Check
            const ALLOWED_EMAIL = "adarshrajendran0@gmail.com";
            if (user.email !== ALLOWED_EMAIL) {
                alert("Access Denied: " + user.email + " is not authorized.");
                auth.signOut();
                return;
            }

            if (loginSection) loginSection.style.display = 'none';
            if (contentSection) contentSection.style.display = 'block';
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;

            // Start Fetching Data ONLY when logged in
            ['projects', 'experience', 'education', 'skills', 'references', 'settings', 'personal'].forEach(col => fetchCollection(col));
            switchAdminTab(currentAdminTab);
        } else {
            if (loginSection) loginSection.style.display = 'flex'; // Flex for centering
            if (contentSection) contentSection.style.display = 'none';
        }
    });
});

// 4. Auth Functions
function adminLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    // Detect Mobile (Simple regex check)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Use Redirect for Mobile
        auth.signInWithRedirect(provider);
    } else {
        // Use Popup for Desktop
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log("Logged in as:", result.user.email);
                // onAuthStateChanged will handle the UI switch automatically
            })
            .catch((error) => {
                console.error("Login Error:", error);
                const errorMsg = document.getElementById('loginError');
                if (errorMsg) {
                    errorMsg.textContent = "Login Failed: " + error.message;
                    errorMsg.style.display = 'block';
                } else {
                    alert("Login Failed: " + error.message);
                }
            });
    }
}

// 5. Data Fetching (Read for List)
function fetchCollection(collectionName) {
    db.collection(collectionName).onSnapshot((snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            const item = doc.data();
            item.docId = doc.id;
            items.push(item);
        });

        // Sort
        if (collectionName !== 'settings') {
            items.sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                return (b.id || 0) - (a.id || 0);
            });
        }

        dataCache[collectionName] = items;
        if (currentAdminTab === collectionName) {
            if (collectionName === 'settings') {
                // Re-render settings form if it's open
                const existingConfig = items.find(i => i.docId === 'config');
                // Only re-render if the modal is actually open/visible to avoid side effects
                if (document.getElementById('adminModal').style.display === 'flex') {
                    document.getElementById('editItemId').value = 'config';
                    document.getElementById('dynamicFormFields').innerHTML = generateFormFields('settings', existingConfig || {});
                }
            } else {
                renderAdminList();
            }
        }
    });
}

// 6. UI Logic
function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="switchAdminTab('${tab}')"]`);
    if (btn) btn.classList.add('active');

    if (tab === 'settings') {
        const existingConfig = dataCache.settings.find(i => i.docId === 'config');
        document.getElementById('adminList').innerHTML = '';
        // Use Modal for Settings too
        showAddItemForm(true); // Special flag for settings
        document.getElementById('editItemId').value = 'config';
        document.getElementById('dynamicFormFields').innerHTML = generateFormFields('settings', existingConfig || {});

        // Hide add button
        const addBtn = document.querySelector('.admin-actions button');
        if (addBtn) addBtn.style.display = 'none';
    } else {
        document.getElementById('adminModal').style.display = 'none';
        const addBtn = document.querySelector('.admin-actions button');
        if (addBtn) addBtn.style.display = 'inline-flex';
        renderAdminList();
    }
}

function renderAdminList() {
    const container = document.getElementById('adminList');
    const items = dataCache[currentAdminTab] || [];
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `<p style="padding:1rem; text-align:center; color:#666;">No items found in ${currentAdminTab}.</p>`;
        return;
    }

    items.forEach((item, index) => {
        let title = item.name || item.title || item.role || item.degree || item.category;
        let subtitle = item.company || item.institution || item.relation || item.status || "";

        // Disable move buttons at ends
        const upDisabled = index === 0 ? 'opacity:0.3; pointer-events:none;' : '';
        const downDisabled = index === items.length - 1 ? 'opacity:0.3; pointer-events:none;' : '';

        container.innerHTML += `
            <div class="admin-project-item">
                <div style="flex-grow:1; padding-right:1rem;">
                    <strong>${title}</strong>
                    <div style="font-size:0.8rem; color:#666;">${subtitle}</div>
                </div>
                <div class="admin-btn-group">
                    <button class="btn-move" onclick="moveItem('${item.docId}', -1)" style="${upDisabled}">↑</button>
                    <button class="btn-move" onclick="moveItem('${item.docId}', 1)" style="${downDisabled}">↓</button>
                    <div style="width:1px;height:20px;background:#ddd;margin:0 5px;"></div>
                    <button class="btn-edit" onclick="editItem('${item.docId}')">Edit</button>
                    <button class="btn-delete" onclick="deleteItem('${item.docId}')">Delete</button>
                </div>
            </div>`;
    });
}



function showAddItemForm(isSettings = false) {
    document.getElementById('adminModal').style.display = 'flex';
    if (!isSettings) {
        document.getElementById('editItemId').value = '';
        document.getElementById('dynamicFormFields').innerHTML = generateFormFields(currentAdminTab);

        // Initialize rich text editors if present
        document.querySelectorAll('.quill-editor-container').forEach(el => {
            initQuill(el, el.dataset.content || '');
        });
    }
}

function cancelAddItem() {
    document.getElementById('adminModal').style.display = 'none';
    if (currentAdminTab === 'settings') switchAdminTab('projects'); // Go back to default if canceling settings
}

function editItem(docId) {
    const item = dataCache[currentAdminTab].find(i => i.docId === docId);
    if (!item) return;

    document.getElementById('adminModal').style.display = 'flex';
    document.getElementById('editItemId').value = docId;
    document.getElementById('dynamicFormFields').innerHTML = generateFormFields(currentAdminTab, item);

    // Initialize rich text editors if present
    document.querySelectorAll('.quill-editor-container').forEach(el => {
        initQuill(el, el.dataset.content || '');
    });
}

function generateFormFields(type, data = {}) {
    const v = (key) => data[key] || '';

    if (type === 'settings') {
        return `<h4 style="margin-bottom:10px; color:#333;">Resume</h4>
                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <label style="flex-grow:1;">
                        <span style="font-size:0.8rem; display:block; margin-bottom:4px;">Resume URL</span>
                        <input type="text" id="inp_resumeUrl" value="${v('resumeUrl')}" style="width:100%; margin:0;">
                    </label>
                    <div style="align-self: flex-end;">
                        <button class="btn-secondary" onclick="document.getElementById('inp_resume_file').click()">Upload New</button>
                        <input type="file" id="inp_resume_file" accept=".pdf,.doc,.docx" style="display:none;" onchange="uploadResume(this)">
                    </div>
                </div>

        <hr style="margin:20px 0; border:0; border-top:1px solid #ddd;">
        
        <h4 style="margin-bottom:10px; color:#333;">Visitor Access (Private Portfolio)</h4>
        <div style="background:var(--tertiary-container); padding:15px; border-radius:8px; margin-bottom:15px;">
            <p style="margin:0 0 10px 0; font-size:0.9rem; color:var(--on-tertiary-container);">
                Status: <strong>${data.visitorPasswordHash ? '✅ Password Set' : '⚠️ Not Set (Default Active)'}</strong>
            </p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <label>
                    <span style="font-size:0.8rem; display:block; margin-bottom:4px;">New Password (min 8 chars)</span>
                    <input type="password" id="inp_visitorPwd" placeholder="Leave empty to keep current">
                </label>
                <label>
                    <span style="font-size:0.8rem; display:block; margin-bottom:4px;">Confirm Password</span>
                    <input type="password" id="inp_visitorPwdConfirm" placeholder="Retype to confirm">
                </label>
            </div>
        </div>

        <hr style="margin:20px 0; border:0; border-top:1px solid #ddd;">
        
        <h4 style="margin-bottom:10px; color:#333;">Hero Section (Home)</h4>
        
        <label style="display:block;margin-bottom:5px;">Badge Text</label>
        <input type="text" id="inp_heroBadge" placeholder="Available for R&D Roles" value="${v('heroBadge')}">

        <label style="display:block;margin-bottom:5px;">Title</label>
        <textarea id="inp_heroTitle" rows="2" placeholder="Title with <br> tags">${v('heroTitle')}</textarea>

        <label style="display:block;margin-bottom:5px;">Description</label>
        <textarea id="inp_heroDesc" rows="3" placeholder="Mechanical R&D Engineer...">${v('heroDesc')}</textarea>

        <label style="display:block;margin-bottom:5px; font-weight:600;">Stats</label>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:5px;">
            <input type="text" id="inp_stat1Num" placeholder="3+" value="${v('stat1Num')}">
            <input type="text" id="inp_stat1Label" placeholder="Years R&D" value="${v('stat1Label')}">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:5px;">
            <input type="text" id="inp_stat2Num" placeholder="AIR 2" value="${v('stat2Num')}">
            <input type="text" id="inp_stat2Label" placeholder="National Rank" value="${v('stat2Label')}">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <input type="text" id="inp_stat3Num" placeholder="10+" value="${v('stat3Num')}">
            <input type="text" id="inp_stat3Label" placeholder="Projects" value="${v('stat3Label')}">
        </div>`;
    }

    if (type === 'projects') {
        const existingImages = data.images || [];
        const existingImagesHTML = existingImages.map(url => `
                                                <div class="existing-image" style="display:flex; align-items:center; gap:10px; margin-bottom:5px; background:#f5f5f5; padding:5px; border-radius:6px;">
                                                    <img src="${url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                                                        <input type="text" class="inp_existing_image" value="${url}" readonly style="flex-grow:1; font-size:0.8rem; border:none; background:transparent;">
                                                            <button onclick="this.parentElement.remove()" style="color:red; cursor:pointer; border:none; background:transparent;">&times;</button>
                                                        </div>
                                                        `).join('');

        return `
                                                        <input type="text" id="inp_title" placeholder="Project Title" value="${v('title')}">
                                                            <input type="text" id="inp_desc" placeholder="Short Description" value="${v('description')}">
                                                            <label style="display:block;margin-top:10px;margin-bottom:5px;font-weight:600;">Project Story / Details</label>
                                                            <div id="inp_details" class="quill-editor-container" data-content="${v('details').replace(/"/g, '&quot;')}" style="margin-bottom:15px;"></div>
                                                                <input type="text" id="inp_link" placeholder="Project Link (URL)" value="${v('link')}">
                                                                    <input type="text" id="inp_tags" placeholder="Tags (comma separated)" value="${(data.tags || []).join(',')}">

                                                                        <label style="display:block;margin-top:10px;margin-bottom:5px;font-weight:600;">Project Images</label>

                                                                        <!-- Existing Images List -->
                                                                        <div id="existingImagesList">${existingImagesHTML}</div>

                                                                        <!-- File Upload -->
                                                                        <div style="background:#e3f2fd; padding:15px; border-radius:8px; border:2px dashed #90caf9; text-align:center; margin-top:10px;">
                                                                            <p style="margin-bottom:10px; font-weight:500; color:#1565c0;">Upload New Images</p>
                                                                            <input type="file" id="inp_files" multiple accept="image/*" style="display:block; margin:auto;">
                                                                                <div id="uploadPreview" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; justify-content:center;"></div>
                                                                        </div>

                                                                        <select id="inp_visibility" style="margin-top:15px;">
                                                                            <option value="public" ${v('visibility') === 'public' ? 'selected' : ''}>Public</option>
                                                                            <option value="private" ${v('visibility') === 'private' ? 'selected' : ''}>Private</option>
                                                                        </select>
                                                                        <label style="display:flex;align-items:center;gap:10px;margin-top:10px;">
                                                                            <input type="checkbox" id="inp_highlight" ${v('highlight') ? 'checked' : ''} style="width:auto;margin:0;">
                                                                                Highlight (Show bigger card)
                                                                        </label>`;
    }

    if (type === 'experience') return `
                                                                        <input type="text" id="inp_role" placeholder="Role / Position" value="${v('role')}">
                                                                    <input type="text" id="inp_company" placeholder="Company Name" value="${v('company')}">
                                                                            <input type="text" id="inp_period" placeholder="Duration (e.g. Jan 2023 - Present)" value="${v('period')}">
                                                                            
                                                                            <label style="display:block;margin-top:10px;margin-bottom:5px;font-weight:600;">Experience Points & Stories</label>
                                                                            <div id="highlightsContainer" style="margin-bottom:10px;">
                                                                                ${(data.highlights || []).map((h, index) => {
        const point = typeof h === 'string' ? h : h.point;
        const story = typeof h === 'string' ? '' : h.story;
        // Use unique ID for Quill
        const editorId = `quill_exp_${Date.now()}_${index}`;
        // Store content in data attribute for initialization
        return `
                                                                                        <div class="highlight-row" style="background:#f9f9f9; padding:10px; border:1px solid #ddd; border-radius:6px; margin-bottom:10px;">
                                                                                            <div style="display:flex; gap:10px; margin-bottom:5px;">
                                                                                                <input type="text" class="inp_highlight_point" placeholder="Bullet Point (Brief)" value="${point}" style="flex-grow:1; font-weight:500;">
                                                                                                <button onclick="this.parentElement.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;" title="Remove Point">&times;</button>
                                                                                            </div>
                                                                                            <div id="${editorId}" class="quill-editor-container" data-content="${story.replace(/"/g, '&quot;')}"></div>
                                                                                        </div>
                                                                                    `;
    }).join('')}
                                                                            </div>
                                                                            <button type="button" class="btn-secondary" onclick="addHighlightRow()">+ Add Point</button>
                                                                            
                                                                            <script>
                                                                                // This script will NOT run via innerHTML, we handle init in renderAdminTab
                                                                            </script>`;

    if (type === 'education') return `
                                                                                    <input type="text" id="inp_degree" placeholder="Degree" value="${v('degree')}">
                                                                                        <input type="text" id="inp_field" placeholder="Field of Study" value="${v('field')}">
                                                                                            <input type="text" id="inp_institution" placeholder="Institution" value="${v('institution')}">
                                                                                                <input type="text" id="inp_year" placeholder="Year / Duration" value="${v('year')}">`;

    if (type === 'skills') return `
                                                                                                    <input type="text" id="inp_category" placeholder="Category Name" value="${v('category')}">
                                                                                                        <input type="text" id="inp_icon" placeholder="Material Icon Name (e.g. code)" value="${v('icon')}">
                                                                                                            <textarea id="inp_items" placeholder="Skills (comma separated)" rows="3">${(data.items || []).join(',')}</textarea>`;

    if (type === 'references') return `
                                                                                                            <input type="text" id="inp_name" placeholder="Name" value="${v('name')}">
                                                                                                                <input type="text" id="inp_role" placeholder="Position / Role" value="${v('role')}">
                                                                                                                    <input type="text" id="inp_company" placeholder="Company" value="${v('company')}">
                                                                                                                        <input type="text" id="inp_relation" placeholder="Relation (e.g. Manager)" value="${v('relation')}">

                                                                                                                            <label style="display:block;margin-top:10px;margin-bottom:5px;font-weight:600;">Reference Image</label>
                                                                                                                            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                                                                                                                                ${v('image') ? `<img src="${v('image')}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">` : ''}
                                                                                                                                <input type="text" id="inp_image" placeholder="Image URL" value="${v('image')}" style="flex-grow:1; margin:0;" readonly>
                                                                                                                            </div>
                                                                                                                            <button class="btn-secondary" onclick="document.getElementById('inp_ref_file').click()" style="margin-bottom:10px; font-size:0.8rem;">Upload & Crop Image</button>
                                                                                                                            <input type="file" id="inp_ref_file" accept="image/*" style="display:none;" onchange="startCrop(this)">
                                                                                                                                <div id="crop_preview_msg" style="color:green; font-weight:bold; font-size:0.8rem; display:none;">Image Cropped & Ready to Upload!</div>

                                                                                                                                <textarea id="inp_quote" placeholder="Quote / Testimonial" rows="3">${v('quote')}</textarea>
                                                                                                                                <input type="text" id="inp_linkedin" placeholder="LinkedIn URL" value="${v('linkedin')}">
                                                                                                                                    <input type="text" id="inp_email" placeholder="Email Address" value="${v('email')}">`;


    if (type === 'personal') {
        const existingImages = data.images || [];
        const existingImagesHTML = existingImages.map(url => `
            <div class="existing-image" style="display:flex; align-items:center; gap:10px; margin-bottom:5px; background:#f5f5f5; padding:5px; border-radius:6px;">
                <img src="${url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                <input type="text" class="inp_existing_image" value="${url}" readonly style="flex-grow:1; font-size:0.8rem; border:none; background:transparent;">
                <button onclick="this.parentElement.remove()" style="color:red; cursor:pointer; border:none; background:transparent;">&times;</button>
            </div>`).join('');

        const blocksHtml = (data.contentBlocks || []).map((b, idx) => {
            const isRich = b.type === 'paragraph';
            const uniqueId = `quill_exist_${Date.now()}_${idx}`;

            const inputField = isRich
                ? `<div id="${uniqueId}" class="quill-editor-container" data-content="${(b.text || '').replace(/"/g, '&quot;')}" style="background:white;"></div>`
                : `<input class="form-input block-content" placeholder="Enter content or URL..." value="${b.text}" style="width:100%; border:1px solid #ccc; padding:5px; font-family:inherit;">`;

            return `
            <div class="block-item" data-type="${b.type}" style="background:#f9f9f9; padding:10px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span class="block-label" style="font-size:0.71rem; font-weight:bold; color:#555; text-transform:uppercase;">${b.type}</span>
                    <button onclick="this.parentElement.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
                </div>
                ${inputField}
            </div>`;
        }).join('');

        return `
            <input type="text" id="inp_perCategory" placeholder="Category (e.g. Travel, Photography)" value="${v('category')}">
            <input type="text" id="inp_perTitle" placeholder="Card Title" value="${v('title')}">
            <input type="text" id="inp_perSummary" placeholder="Short Summary" value="${v('summary')}">
            
            <label style="display:block;margin-top:10px;margin-bottom:5px;font-weight:600;">Thumbnail Image (Cover)</label>
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                ${v('thumbnail') ? `<img src="${v('thumbnail')}" style="width:50px; height:50px; border-radius:6px; object-fit:cover;">` : ''}
                <input type="text" id="inp_perThumbnail" placeholder="Image URL" value="${v('thumbnail')}" style="flex-grow:1; margin:0;" readonly>
            </div>
             <button class="btn-secondary" onclick="document.getElementById('inp_per_file').click()" style="margin-bottom:10px; font-size:0.8rem;">Upload & Crop Thumbnail</button>
             <input type="file" id="inp_per_file" accept="image/*" style="display:none;" onchange="startCrop(this)">
             <div id="crop_preview_msg" style="color:green; font-weight:bold; font-size:0.8rem; display:none;">Thumbnail Cropped!</div>

             <label style="display:block;margin-top:20px;margin-bottom:5px;font-weight:600;">Gallery Images (Multiple)</label>
             <div id="existingImagesList">${existingImagesHTML}</div>
             <div style="background:#e3f2fd; padding:15px; border-radius:8px; border:2px dashed #90caf9; text-align:center; margin-top:10px;">
                <p style="margin-bottom:10px; font-weight:500; color:#1565c0;">Upload Gallery Images</p>
                <input type="file" id="inp_per_gallery_files" multiple accept="image/*" style="display:block; margin:auto;">
             </div>

            <hr style="margin:20px 0; border:0; border-top:1px solid #ddd;">
            <h4 style="margin-bottom:10px;">Deep Dive Content (Builder)</h4>
            <div id="contentBlocksContainer" style="margin-bottom:15px; max-height:300px; overflow-y:auto; border:1px dashed #ccc; padding:10px;">
                ${blocksHtml}
            </div>
            <div class="builder-controls" style="display:flex; gap:10px; flex-wrap:wrap;">
                <button type="button" class="btn-secondary" onclick="addContentBlock('header')">+ Header</button>
                <button type="button" class="btn-secondary" onclick="addContentBlock('paragraph')">+ Paragraph</button>
                <button type="button" class="btn-secondary" onclick="addContentBlock('quote')">+ Quote</button>
                <button type="button" class="btn-secondary" onclick="addContentBlock('image')">+ Image URL</button>
            </div>
        `;
    }

    return '';
}





// HASHING UTILITY
async function hashPassword(password) {
    const SALT = "adarsh-portfolio-2025"; // Must match script.js
    const msgBuffer = new TextEncoder().encode(password + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 7. CRUD Operations
async function saveItemToFirebase() {
    const docId = document.getElementById('editItemId').value;
    const currentItems = dataCache[currentAdminTab] || [];

    // Auto-order for new items
    const maxOrder = currentItems.reduce((max, item) => Math.max(max, item.order || 0), 0);

    let data = { id: Date.now() };
    if (!docId) data.order = maxOrder + 1;

    // Settings Special Case
    if (currentAdminTab === 'settings') {
        const resumeUrl = document.getElementById('inp_resumeUrl').value;

        const heroData = {
            heroBadge: document.getElementById('inp_heroBadge').value,
            heroTitle: document.getElementById('inp_heroTitle').value,
            heroDesc: document.getElementById('inp_heroDesc').value,
            stat1Num: document.getElementById('inp_stat1Num').value,
            stat1Label: document.getElementById('inp_stat1Label').value,
            stat2Num: document.getElementById('inp_stat2Num').value,
            stat2Label: document.getElementById('inp_stat2Label').value,
            stat3Num: document.getElementById('inp_stat3Num').value,
            stat3Label: document.getElementById('inp_stat3Label').value,
            resumeUrl: resumeUrl
        };

        // PASSWORD LOGIC
        const newPwd = document.getElementById('inp_visitorPwd').value;
        const confirmPwd = document.getElementById('inp_visitorPwdConfirm').value;

        if (newPwd) {
            if (newPwd.length < 8) {
                alert("Password must be at least 8 characters.");
                return;
            }
            if (newPwd !== confirmPwd) {
                alert("Passwords do not match.");
                return;
            }
            try {
                heroData.visitorPasswordHash = await hashPassword(newPwd);
            } catch (e) {
                alert("Hashing failed. Check HTTPS.");
                return;
            }
        }

        db.collection('settings').doc('config').set(heroData, { merge: true })
            .then(() => { alert("Settings Updated!"); })
            .catch(err => alert("Error: " + err.message));
        return;
    }

    // Collect Data based on Tab
    if (currentAdminTab === 'projects') {
        const title = document.getElementById('inp_title').value;
        if (!title) { alert("Title is required"); return; }

        // Show Loading State
        const saveBtn = document.querySelector('#adminModal .btn-primary');
        const originalText = saveBtn.innerText;
        saveBtn.innerText = "Uploading & Saving...";
        saveBtn.disabled = true;

        // 1. Collect Existing URLs
        const existingInputs = document.querySelectorAll('.inp_existing_image');
        let finalImages = Array.from(existingInputs).map(inp => inp.value);

        // 2. Upload New Files
        const fileInput = document.getElementById('inp_files');
        if (fileInput.files.length > 0) {
            try {
                const uploadPromises = Array.from(fileInput.files).map((file, index) => {
                    const uniqueName = `projects/${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}_${index}`;
                    return uploadFileToStorage(file, uniqueName);
                });

                const newUrls = await Promise.all(uploadPromises);
                finalImages = [...finalImages, ...newUrls];
            } catch (error) {
                alert("Upload Failed: " + error.message);
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
                return;
            }
        }

        data.title = title;
        data.description = document.getElementById('inp_desc').value;

        // Get Rich Details
        if (quillInstances.has('inp_details')) {
            data.details = quillInstances.get('inp_details').root.innerHTML;
        } else {
            data.details = document.getElementById('inp_details').innerHTML;
        }

        data.link = document.getElementById('inp_link').value;
        data.tags = document.getElementById('inp_tags').value.split(',').map(s => s.trim()).filter(s => s);
        data.images = finalImages;

        data.visibility = document.getElementById('inp_visibility').value;
        data.highlight = document.getElementById('inp_highlight').checked;
        data.status = 'Active';
        data.icon = 'work';
    }
    else if (currentAdminTab === 'experience') {
        data.role = document.getElementById('inp_role').value;
        data.company = document.getElementById('inp_company').value;
        data.period = document.getElementById('inp_period').value;

        // Scrape Dynamic Highlights
        const highlightRows = document.querySelectorAll('.highlight-row');
        const highlights = Array.from(highlightRows).map(row => {
            const point = row.querySelector('.inp_highlight_point').value;

            // Get Quill Content
            const quillContainer = row.querySelector('.quill-editor-container');
            let story = '';
            if (quillContainer && quillContainer.id && quillInstances.has(quillContainer.id)) {
                const q = quillInstances.get(quillContainer.id);
                // check if empty
                if (q.getText().trim().length > 0) {
                    story = q.root.innerHTML;
                }
            } else {
                // Fallback if somehow not initialized (should not happen)
                story = quillContainer ? quillContainer.innerHTML : '';
            }

            if (point.trim()) return { point, story };
            return null;
        }).filter(h => h !== null);

        data.highlights = highlights;
    }
    else if (currentAdminTab === 'education') {
        data.degree = document.getElementById('inp_degree').value;
        data.field = document.getElementById('inp_field').value;
        data.institution = document.getElementById('inp_institution').value;
        data.year = document.getElementById('inp_year').value;
    }
    else if (currentAdminTab === 'skills') {
        data.category = document.getElementById('inp_category').value;
        data.icon = document.getElementById('inp_icon').value;
        data.items = document.getElementById('inp_items').value.split(',').map(s => s.trim()).filter(s => s);
    }
    else if (currentAdminTab === 'references') {
        data.name = document.getElementById('inp_name').value;
        if (!data.name) { alert("Name is required"); return; }

        if (croppedBlob) {
            const saveBtn = document.querySelector('#adminModal .btn-primary');
            saveBtn.innerText = "Uploading Crop...";
            saveBtn.disabled = true;
            try {
                const uniqueName = `references/${data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.jpg`;
                const url = await uploadFileToStorage(croppedBlob, uniqueName);
                data.image = url;
            } catch (e) {
                alert("Crop Upload Failed: " + e.message);
                saveBtn.innerText = "Save Changes";
                saveBtn.disabled = false;
                return;
            }
        } else {
            data.image = document.getElementById('inp_image').value;
        }

        data.role = document.getElementById('inp_role').value;
        data.company = document.getElementById('inp_company').value;
        data.relation = document.getElementById('inp_relation').value;
        data.quote = document.getElementById('inp_quote').value;
        data.linkedin = document.getElementById('inp_linkedin').value;
        data.email = document.getElementById('inp_email').value;

        // Clear blob
        croppedBlob = null;
    }
    else if (currentAdminTab === 'personal') {
        data.category = document.getElementById('inp_perCategory').value;
        data.title = document.getElementById('inp_perTitle').value;
        data.summary = document.getElementById('inp_perSummary').value;
        if (!data.title) { alert("Title is required"); return; }

        // --- 1. Thumbnail Upload ---
        if (croppedBlob) {
            const saveBtn = document.querySelector('#adminModal .btn-primary');
            saveBtn.innerText = "Uploading Thumbnail...";
            saveBtn.disabled = true;
            try {
                const uniqueName = `personal/${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.jpg`;
                const url = await uploadFileToStorage(croppedBlob, uniqueName);
                data.thumbnail = url;
            } catch (e) {
                alert("Upload Failed: " + e.message);
                saveBtn.innerText = "Save Changes";
                saveBtn.disabled = false;
                return;
            }
        } else {
            // Keep existing or empty
            data.thumbnail = document.getElementById('inp_perThumbnail').value;
        }

        // --- 2. Gallery Images Upload ---
        const existingInputs = document.querySelectorAll('.inp_existing_image');
        let finalImages = Array.from(existingInputs).map(inp => inp.value);

        const galleryInput = document.getElementById('inp_per_gallery_files');
        if (galleryInput && galleryInput.files.length > 0) {
            const saveBtn = document.querySelector('#adminModal .btn-primary');
            saveBtn.innerText = "Uploading Gallery...";
            saveBtn.disabled = true;
            try {
                const uploadPromises = Array.from(galleryInput.files).map((file, index) => {
                    const uniqueName = `personal_gallery/${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}_${index}`;
                    return uploadFileToStorage(file, uniqueName);
                });
                const newUrls = await Promise.all(uploadPromises);
                finalImages = [...finalImages, ...newUrls];
            } catch (e) {
                alert("Gallery Upload Failed: " + e.message);
                saveBtn.innerText = "Save Changes";
                saveBtn.disabled = false;
                return;
            }
        }
        data.images = finalImages;


        data.contentBlocks = getBlocksFromUI();
        croppedBlob = null;
    }


    if (docId) {
        db.collection(currentAdminTab).doc(docId).update(data)
            .then(() => {
                alert("Updated!");
                document.getElementById('adminModal').style.display = 'none';
            })
            .catch(err => alert("Error updating: " + err.message));
    } else {
        db.collection(currentAdminTab).add(data)
            .then(() => {
                alert("Item Added!");
                document.getElementById('adminModal').style.display = 'none';

            })
            .catch(err => alert("Error creating: " + err.message));
    }
}

async function deleteItem(docId) {
    if (confirm("Are you sure you want to delete this item?")) {
        db.collection(currentAdminTab).doc(docId).delete()
            .catch(err => alert("Error deleting: " + err.message));
    }
}

async function moveItem(docId, dir) {
    const items = [...dataCache[currentAdminTab]];
    const idx = items.findIndex(i => i.docId === docId);
    if (idx === -1) return;

    const tIdx = idx + dir;
    if (tIdx < 0 || tIdx >= items.length) return;

    // Swap Order Values
    // Note: This relies on the sort being stable by order
    // Ideally we should just swap the 'order' fields of the two items

    // Simplified logic: 
    // 1. Get current order values
    // 2. Swap them
    // 3. Update both docs

    const itemA = items[idx];
    const itemB = items[tIdx];

    const orderA = itemA.order || 0;
    const orderB = itemB.order || 0;

    const batch = db.batch();

    // Swap orders
    // If orders are same (bad data), increment one
    let newOrderA = orderB;
    let newOrderB = orderA;

    if (newOrderA === newOrderB) {
        newOrderA = idx + 1 + dir;
        newOrderB = idx + 1;
    }

    batch.update(db.collection(currentAdminTab).doc(itemA.docId), { order: newOrderA });
    batch.update(db.collection(currentAdminTab).doc(itemB.docId), { order: newOrderB });

    await batch.commit().catch(err => console.error(err));
}

// ==========================================
// NEW: HELPER FUNCTIONS FOR UPLOAD & CROP
// ==========================================

function uploadFileToStorage(file, path) {
    const ref = storage.ref(path);
    return ref.put(file).then(snapshot => snapshot.ref.getDownloadURL());
}

async function uploadResume(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const btn = input.previousElementSibling;
        const originalText = btn.innerText;
        btn.innerText = "Uploading...";
        btn.disabled = true;

        try {
            const path = `resumes/${Date.now()}_${file.name}`;
            const ref = storage.ref(path);
            const metadata = {
                contentDisposition: 'attachment; filename="' + file.name + '"'
            };
            const snapshot = await ref.put(file, metadata);
            const url = await snapshot.ref.getDownloadURL();
            document.getElementById('inp_resumeUrl').value = url;
            alert("Resume Uploaded!");
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

function startCrop(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Use the universal cropper
        if (window.universalCropper) {
            window.universalCropper.start(file)
                .then(blob => {
                    croppedBlob = blob;

                    // Update UI feedback
                    // In the HTML structure, the preview message is usually the next element or close by
                    // References: input -> div#crop_preview_msg
                    // Personal: input -> div#crop_preview_msg

                    // Let's find the message element relative to input
                    const parent = input.parentElement;
                    const msg = parent.querySelector('#crop_preview_msg') || input.nextElementSibling;

                    if (msg) {
                        msg.style.display = 'block';
                        msg.textContent = "Image Cropped & Ready to Upload!";
                        msg.style.color = 'green';
                    }
                })
                .catch(err => {
                    console.log("Crop cancelled or failed:", err);
                    input.value = ''; // Reset input to allow re-selecting
                    croppedBlob = null;

                    const parent = input.parentElement;
                    const msg = parent.querySelector('#crop_preview_msg') || input.nextElementSibling;
                    if (msg) msg.style.display = 'none';
                });
        } else {
            console.error("UniversalCropper not initialized");
            alert("Error: Cropper not ready. Please refresh.");
        }
    }
}

// Note: cancelCrop and finishCrop are no longer needed as global functions 
// because the UniversalCropper class and the buttons in HTML handle the flow.
// The finish action resolves the promise in startCrop, which sets the global croppedBlob.


// ==========================================
// NEW: CONTENT BUILDER HELPERS
// ==========================================

function addContentBlock(type, value = '') {
    const container = document.getElementById('contentBlocksContainer');
    const div = document.createElement('div');
    const uniqueId = `quill_block_${Date.now()}`;
    div.className = 'block-item';
    div.dataset.type = type;
    div.style.cssText = "background:#f9f9f9; padding:10px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;";

    let inputField = '';
    if (type === 'paragraph') {
        inputField = `<div id="${uniqueId}" class="quill-editor-container" style="background:white;"></div>`;
    } else {
        inputField = `<input class="form-input block-content" placeholder="Enter ${type} content..." value="${value.replace(/"/g, '&quot;')}" style="width:100%; border:1px solid #ccc; padding:5px; font-family:inherit;">`;
    }

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span class="block-label" style="font-size:0.71rem; font-weight:bold; color:#555; text-transform:uppercase;">${type}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
        </div>
        ${inputField}
    `;
    container.appendChild(div);

    if (type === 'paragraph') {
        initQuill(document.getElementById(uniqueId), value);
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function getBlocksFromUI() {
    const blocks = [];
    document.querySelectorAll('.block-item').forEach(div => {
        const type = div.dataset.type;
        let text = '';

        if (type === 'paragraph') {
            const quillDiv = div.querySelector('.quill-editor-container');
            if (quillDiv && quillDiv.id && quillInstances.has(quillDiv.id)) {
                text = quillInstances.get(quillDiv.id).root.innerHTML;
            } else {
                text = quillDiv ? quillDiv.innerHTML : '';
            }
        } else {
            const input = div.querySelector('.block-content');
            text = input ? input.value : '';
        }

        blocks.push({
            type: type,
            text: text
        });
    });
    return blocks;
}

// HELPER FOR EXPERIENCE FORM
function addHighlightRow() {
    const container = document.getElementById('highlightsContainer');
    const div = document.createElement('div');
    const uniqueId = `quill_exp_${Date.now()}`;
    div.className = 'highlight-row';
    div.style = "background:#f9f9f9; padding:10px; border:1px solid #ddd; border-radius:6px; margin-bottom:10px;";
    div.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:5px;">
            <input type="text" class="inp_highlight_point" placeholder="Bullet Point (Brief)" style="flex-grow:1; font-weight:500;">
            <button onclick="this.parentElement.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;" title="Remove Point">&times;</button>
        </div>
        <div id="${uniqueId}" class="quill-editor-container" style="background:white;"></div>
    `;
    container.appendChild(div);

    // Init Quill
    initQuill(document.getElementById(uniqueId));
}

// HELPER FOR RICH TEXT
function initQuill(selectorOrElement, content = '') {
    const element = typeof selectorOrElement === 'string'
        ? document.querySelector(selectorOrElement)
        : selectorOrElement;

    if (!element) return null;

    // Check if already initialized
    if (element.classList.contains('ql-container')) return null;

    const quill = new Quill(element, {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'clean']
            ]
        }
    });

    if (content) {
        quill.clipboard.dangerouslyPasteHTML(content);
    }

    // Store reference using ID
    if (element.id) {
        quillInstances.set(element.id, quill);
    }

    return quill;
}
