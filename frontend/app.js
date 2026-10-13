// Aura Clinical Portal - Core Frontend Application
const CONFIG = {
    apiBase: 'http://localhost:8000',
    wsBase: 'ws://localhost:8000'
};

// Application State Store
const state = {
    token: localStorage.getItem('aura_token') || null,
    currentUser: null,
    patients: [],
    filteredPatients: [],
    doctors: [],
    users: [], // Admin only
    chatContacts: [],
    activeTab: 'patients',
    sortField: '',
    sortOrder: 'asc',
    searchQuery: '',
    
    // Live Chat State
    ws: null,
    selectedContactId: null,
    chatMessages: {}, // Format: { [userId]: [{sender: 'me'|'them'|'system', text: string, timestamp: Date}] }
    lastRecipientId: null,
    unreadCounts: {}  // Format: { [userId]: number }
};

// Initialize Application on Load
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Primary Initialization Routine
async function initApp() {
    // Render default icons
    lucide.createIcons();
    
    if (state.token) {
        const success = await fetchUserProfile();
        if (success) {
            transitionToDashboard();
        } else {
            handleLogout();
        }
    } else {
        transitionToAuth();
    }
}

// ----------------------------------------------------
// UI UTILITIES & ROUTING
// ----------------------------------------------------

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-msg">${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');
    
    if (tab === 'login') {
        loginForm.classList.add('active-form');
        regForm.classList.remove('active-form');
        loginBtn.classList.add('active');
        regBtn.classList.remove('active');
    } else {
        loginForm.classList.remove('active-form');
        regForm.classList.add('active-form');
        loginBtn.classList.remove('active');
        regBtn.classList.add('active');
    }
}

function transitionToAuth() {
    document.getElementById('auth-view').classList.add('active');
    document.getElementById('main-view').classList.remove('active');
    document.body.className = 'clinical-theme';
    closeWebSocket();
}

function transitionToDashboard() {
    document.getElementById('auth-view').classList.remove('active');
    document.getElementById('main-view').classList.add('active');
    
    // Set body role class for CSS hiding/showing rules
    const role = state.currentUser.role.toLowerCase();
    document.body.className = `clinical-theme role-${role}`;
    
    // Update Sidebar User Display
    const fullName = `${state.currentUser.first_name} ${state.currentUser.last_name || ''}`.trim();
    document.getElementById('user-display-name').textContent = fullName;
    document.getElementById('user-display-role').textContent = state.currentUser.role;
    document.getElementById('user-avatar-initials').textContent = (state.currentUser.first_name ? state.currentUser.first_name[0] : '') + (state.currentUser.last_name ? state.currentUser.last_name[0] : '');
    
    // Set Connection Badge
    const statusBadge = document.getElementById('connection-status');
    statusBadge.className = "connection-status-badge online";
    statusBadge.querySelector('.status-label').textContent = "Network Connected";

    // Setup active tab
    switchMainTab('patients');
    
    // Load initial data sets
    loadDashboardData();
    
    // Establish WebSocket Chat Connection
    connectWebSocket();
}

function switchMainTab(tabName) {
    state.activeTab = tabName;
    
    // Toggle active navigation styles
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const targetNav = document.getElementById(`nav-${tabName}`);
    if (targetNav) targetNav.classList.add('active');
    
    // Toggle active tab sections
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    
    // Customize page header text based on section
    const titleText = document.getElementById('page-title');
    const subtitleText = document.getElementById('page-subtitle');
    
    if (tabName === 'patients') {
        titleText.textContent = "Patients Index";
        subtitleText.textContent = state.currentUser.role.toLowerCase() === 'doctor' 
            ? "Your assigned patient records & comments dashboard" 
            : "Centralized database of clinical records";
    } else if (tabName === 'admin-users') {
        titleText.textContent = "User Management";
        subtitleText.textContent = "Configure portal user privileges and register employees";
    } else if (tabName === 'admin-doctors') {
        titleText.textContent = "Establish Doctor Credentials";
        subtitleText.textContent = "Assign medical profiles linking login credentials with practitioner identities";
    }
}

// Modal Helpers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    // Clear forms inside if relevant
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// ----------------------------------------------------
// API REQUEST HELPERS
// ----------------------------------------------------

function getHeaders(isMultipart = false) {
    const headers = {};
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Decode failed", e);
        return null;
    }
}

async function fetchUserProfile() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/auth/me`, {
            headers: getHeaders()
        });
        if (!res.ok) return false;
        const data = await res.json();
        
        // Decrypt/decode JWT token to extract roles and user ID
        const decoded = decodeToken(state.token);
        if (!decoded) return false;
        
        const userEmail = decoded.sub || (typeof data.logged_in_user === 'string' ? data.logged_in_user : data.logged_in_user.email);
        
        state.currentUser = {
            id: decoded.user_id,
            email: userEmail,
            role: decoded.role || 'user',
            first_name: '',
            last_name: ''
        };
        
        // Parse email prefix as a beautiful fallback name
        const emailParts = userEmail.split('@')[0].split(/[._-]/);
        state.currentUser.first_name = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
        state.currentUser.last_name = emailParts[1] ? (emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1)) : '';
        
        return true;
    } catch (err) {
        console.error("Profile Fetch Failure:", err);
        return false;
    }
}

// ----------------------------------------------------
// LOGIN & REGISTRATION FLOWS
// ----------------------------------------------------

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    // FastAPI's login expects a standard URLSearchParams payload (multipart form format)
    const bodyData = new URLSearchParams();
    bodyData.append('username', email);
    bodyData.append('password', pass);
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyData
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Authentication denied");
        }
        
        const data = await res.json();
        state.token = data.access_token;
        localStorage.setItem('aura_token', state.token);
        
        const profileFetched = await fetchUserProfile();
        if (profileFetched) {
            showToast('success', 'Portal Authorized', `Welcome back, ${state.currentUser.first_name}!`);
            transitionToDashboard();
        } else {
            throw new Error("Failed to capture user profile detail");
        }
        
    } catch (err) {
        showToast('error', 'Login Failed', err.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const firstName = document.getElementById('reg-first-name').value;
    const lastName = document.getElementById('reg-last-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = 'user';
    
    const regPayload = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        role: role
    };
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/auth/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(regPayload)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Registration rejected");
        }
        
        showToast('success', 'Account Created', 'Registration successful. You can now Sign In!');
        switchAuthTab('login');
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').focus();
    } catch (err) {
        showToast('error', 'Registration Failed', err.message);
    }
}

function handleLogout() {
    state.token = null;
    state.currentUser = null;
    state.patients = [];
    state.filteredPatients = [];
    state.doctors = [];
    state.users = [];
    localStorage.removeItem('aura_token');
    showToast('info', 'Session Terminated', 'Secure log out completed successfully.');
    transitionToAuth();
}

// ----------------------------------------------------
// DASHBOARD DATA RETRIEVAL
// ----------------------------------------------------

async function loadDashboardData() {
    await fetchDoctors();
    
    // Refine names based on database profiles
    const role = state.currentUser.role.toLowerCase();
    if (role === 'doctor') {
        const docProfile = state.doctors.find(d => d.user_id === state.currentUser.id);
        if (docProfile) {
            state.currentUser.first_name = docProfile.doctor_name;
            state.currentUser.last_name = '';
            document.getElementById('user-display-name').textContent = docProfile.doctor_name;
            document.getElementById('user-avatar-initials').textContent = docProfile.doctor_name.split(' ').map(n => n[0]).join('').substring(0, 2);
        }
    }

    await fetchPatients();
    
    if (role === 'admin') {
        await fetchUsers();
        const adminProfile = state.users.find(u => u.id === state.currentUser.id);
        if (adminProfile) {
            state.currentUser.first_name = adminProfile.first_name;
            state.currentUser.last_name = adminProfile.last_name;
            const adminFullName = `${adminProfile.first_name} ${adminProfile.last_name || ''}`.trim();
            document.getElementById('user-display-name').textContent = adminFullName;
            document.getElementById('user-avatar-initials').textContent = (adminProfile.first_name ? adminProfile.first_name[0] : '') + (adminProfile.last_name ? adminProfile.last_name[0] : '');
        }
    }
    
    updateStatsKPIs();
    buildChatContacts();
}

async function fetchDoctors() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/doctor/all-doctors`, {
            headers: getHeaders()
        });
        if (res.ok) {
            state.doctors = await res.json();
        }
    } catch (err) {
        console.error("Doctors Fetch Error:", err);
    }
}

async function fetchPatients() {
    try {
        const role = state.currentUser.role.toLowerCase();
        let endpoint = `${CONFIG.apiBase}/patients/views`;
        
        if (role === 'doctor') {
            endpoint = `${CONFIG.apiBase}/doctor/my-patients`;
        }
        
        const res = await fetch(endpoint, {
            headers: getHeaders()
        });
        
        if (res.ok) {
            state.patients = await res.json();
            state.filteredPatients = [...state.patients];
            renderPatientsTable();
        } else {
            showToast('error', 'Data Sync Failure', 'Could not sync patients record from database.');
        }
    } catch (err) {
        console.error("Patients Fetch Error:", err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/users/`, {
            headers: getHeaders()
        });
        if (res.ok) {
            state.users = await res.json();
            renderUsersTable();
        }
    } catch (err) {
        console.error("Users Fetch Error:", err);
    }
}

// Update Top KPI Cards
function updateStatsKPIs() {
    document.getElementById('stat-patient-count').textContent = state.patients.length;
    document.getElementById('stat-doctor-count').textContent = state.doctors.length;
    
    const scopeBadge = document.getElementById('stat-scope-badge');
    const role = state.currentUser.role.toLowerCase();
    
    if (role === 'admin') {
        scopeBadge.textContent = "Global Admin Scope";
        scopeBadge.style.background = 'var(--purple-dim)';
        scopeBadge.style.color = 'var(--purple)';
    } else if (role === 'doctor') {
        scopeBadge.textContent = "Clinician Assigned Scope";
        scopeBadge.style.background = 'var(--cyan-dim)';
        scopeBadge.style.color = 'var(--cyan)';
    } else {
        scopeBadge.textContent = "Registrar Access";
        scopeBadge.style.background = 'var(--emerald-dim)';
        scopeBadge.style.color = 'var(--emerald)';
    }
}

// ----------------------------------------------------
// PATIENTS DIRECTORY CONTROLLERS
// ----------------------------------------------------

function renderPatientsTable() {
    const tbody = document.getElementById('patients-table-body');
    tbody.innerHTML = '';
    
    if (state.filteredPatients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i data-lucide="folder-open" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 0.5rem; display: block; margin-left: auto; margin-right: auto;"></i>
                    No patient records matching active filters.
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    state.filteredPatients.forEach(p => {
        // Calculate BMI dynamically
        const heightMtrs = p.height;
        const weightKg = p.weight;
        const bmiVal = (weightKg / (heightMtrs * heightMtrs)).toFixed(1);
        
        let bmiClass = 'bmi-normal';
        let bmiLabel = 'Normal';
        if (bmiVal < 18.5) { bmiClass = 'bmi-underweight'; bmiLabel = 'Underweight'; }
        else if (bmiVal >= 25 && bmiVal < 30) { bmiClass = 'bmi-overweight'; bmiLabel = 'Overweight'; }
        else if (bmiVal >= 30) { bmiClass = 'bmi-obese'; bmiLabel = 'Obese'; }
        
        // Find assigned doctor name
        const docProfile = state.doctors.find(d => d.id === p.doctor_id);
        const docName = docProfile ? docProfile.doctor_name : `Dr. ID #${p.doctor_id}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="patient-id-badge">${p.id}</span></td>
            <td><span class="patient-name-cell">${p.name}</span></td>
            <td>
                <span class="patient-gender-badge gender-${p.gender.toLowerCase()}">${p.gender}</span>
                <span style="margin-left: 0.5rem; color: var(--text-secondary);">${p.age} Yrs</span>
            </td>
            <td>
                <span style="font-weight: 500;">${heightMtrs} m</span>
                <span style="color: var(--text-muted); margin: 0 0.25rem;">/</span>
                <span style="font-weight: 500;">${weightKg} kg</span>
            </td>
            <td>
                <span class="patient-bmi-badge ${bmiClass}">${bmiVal} (${bmiLabel})</span>
            </td>
            <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${p.city}</span></td>
            <td>
                <span class="doctor-badge">
                    <i data-lucide="stethoscope"></i>
                    <span>${docName}</span>
                </span>
            </td>
            <td class="text-right">
                <div class="actions-cell-group">
                    <button class="btn-table-action action-view" onclick="viewPatientDetails('${p.id}')" title="Clinical History & Comments">
                        <i data-lucide="clipboard-list"></i>
                    </button>
                    <button class="btn-table-action action-edit doctor-hide" onclick="openEditPatientModal('${p.id}')" title="Edit Patient Info">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-table-action action-delete doctor-hide" onclick="deletePatientRecord('${p.id}')" title="Remove Record">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function filterPatients() {
    const q = document.getElementById('patient-search').value.toLowerCase().trim();
    state.searchQuery = q;
    
    if (!q) {
        state.filteredPatients = [...state.patients];
    } else {
        state.filteredPatients = state.patients.filter(p => {
            return p.name.toLowerCase().includes(q) || 
                   p.id.toLowerCase().includes(q) || 
                   p.city.toLowerCase().includes(q);
        });
    }
    renderPatientsTable();
}

async function sortPatients() {
    const select = document.getElementById('patient-sort');
    const field = select.value;
    state.sortField = field;
    
    if (!field) {
        await fetchPatients();
        return;
    }
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/patients/sort?sort_by=${field}&sort_order=${state.sortOrder}`, {
            headers: getHeaders()
        });
        if (res.ok) {
            state.patients = await res.json();
            // Apply filtering overlay on sorted data
            filterPatients();
        }
    } catch (err) {
        console.error("Sorting Error:", err);
    }
}

function toggleSortOrder() {
    const btn = document.getElementById('sort-order-btn');
    const icon = document.getElementById('sort-order-icon');
    
    if (state.sortOrder === 'asc') {
        state.sortOrder = 'desc';
        icon.setAttribute('data-lucide', 'arrow-down-wide-narrow');
    } else {
        state.sortOrder = 'asc';
        icon.setAttribute('data-lucide', 'arrow-up-narrow-wide');
    }
    lucide.createIcons();
    if (state.sortField) {
        sortPatients();
    }
}

// ----------------------------------------------------
// PATIENT SAVE & CRUD OPERATIONS
// ----------------------------------------------------

function populateDoctorDropdown(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="" disabled selected>Choose Care Clinician...</option>';
    
    state.doctors.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.doctor_name} (${d.specialization})`;
        if (selectedId && d.id === selectedId) opt.selected = true;
        select.appendChild(opt);
    });
}

function openCreatePatientModal() {
    document.getElementById('patient-modal-title').textContent = "Register Patient Record";
    document.getElementById('patient-form-mode').value = 'create';
    document.getElementById('pat-id').disabled = false;
    
    populateDoctorDropdown('pat-doctor');
    openModal('patient-modal');
}

function openEditPatientModal(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;
    
    document.getElementById('patient-modal-title').textContent = "Modify Patient Profile";
    document.getElementById('patient-form-mode').value = 'edit';
    
    document.getElementById('pat-id').value = patient.id;
    document.getElementById('pat-id').disabled = true; // Lock identifier
    document.getElementById('pat-name').value = patient.name;
    document.getElementById('pat-age').value = patient.age;
    document.getElementById('pat-gender').value = patient.gender.toLowerCase();
    document.getElementById('pat-city').value = patient.city;
    document.getElementById('pat-height').value = patient.height;
    document.getElementById('pat-weight').value = patient.weight;
    
    populateDoctorDropdown('pat-doctor', patient.doctor_id);
    openModal('patient-modal');
}

async function handleSavePatient(event) {
    event.preventDefault();
    const mode = document.getElementById('patient-form-mode').value;
    const id = document.getElementById('pat-id').value;
    const name = document.getElementById('pat-name').value;
    const age = parseInt(document.getElementById('pat-age').value);
    const gender = document.getElementById('pat-gender').value.toLowerCase(); // Backend Literal expectations (male/female/others)
    const city = document.getElementById('pat-city').value;
    const height = parseFloat(document.getElementById('pat-height').value);
    const weight = parseFloat(document.getElementById('pat-weight').value);
    const doctorId = parseInt(document.getElementById('pat-doctor').value);
    
    const payload = {
        id: id,
        name: name,
        age: age,
        gender: gender,
        city: city,
        height: height,
        weight: weight,
        doctor_id: doctorId
    };
    
    try {
        let res;
        if (mode === 'create') {
            res = await fetch(`${CONFIG.apiBase}/patients/create-patient`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
        } else {
            // Update uses PatientsUpdate schema (does not contain ID)
            const updatePayload = { ...payload };
            delete updatePayload.id;
            res = await fetch(`${CONFIG.apiBase}/patients/update-patient/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updatePayload)
            });
        }
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Error committing record changes");
        }
        
        showToast('success', 'Database Updated', `Patient record ${id} committed successfully.`);
        closeModal('patient-modal');
        loadDashboardData();
        
    } catch (err) {
        showToast('error', 'Operation Failed', err.message);
    }
}

async function deletePatientRecord(patientId) {
    if (!confirm(`Are you absolutely sure you want to delete patient record ${patientId}? This cannot be undone.`)) {
        return;
    }
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/patients/delete-patient/${patientId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Error deleting record");
        }
        
        showToast('success', 'Record Purged', `Patient Reference ${patientId} successfully removed.`);
        loadDashboardData();
    } catch (err) {
        showToast('error', 'Purge Failed', err.message);
    }
}

// ----------------------------------------------------
// PATIENT DETAILS & COMMENTS VIEWS
// ----------------------------------------------------

async function viewPatientDetails(patientId) {
    try {
        // Fetch detailed profile + comments
        const res = await fetch(`${CONFIG.apiBase}/patients/patient-details/${patientId}`, {
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Cannot load profile details");
        }
        
        const data = await res.json();
        const p = data.patient;
        const comments = data.comments;
        
        // Fill Details Panel
        document.getElementById('det-name').textContent = p.name;
        document.getElementById('det-id').textContent = `ID: ${p.id}`;
        document.getElementById('det-age-gender').textContent = `${p.gender} / ${p.age} Years`;
        document.getElementById('det-height').textContent = `${p.height} m`;
        document.getElementById('det-weight').textContent = `${p.weight} kg`;
        document.getElementById('det-city').textContent = p.city;
        
        const bmiVal = (p.weight / (p.height * p.height)).toFixed(1);
        let bmiLabel = 'Normal';
        let bmiClass = 'bmi-normal';
        if (bmiVal < 18.5) { bmiClass = 'bmi-underweight'; bmiLabel = 'Underweight'; }
        else if (bmiVal >= 25 && bmiVal < 30) { bmiClass = 'bmi-overweight'; bmiLabel = 'Overweight'; }
        else if (bmiVal >= 30) { bmiClass = 'bmi-obese'; bmiLabel = 'Obese'; }
        
        const bmiNode = document.getElementById('det-bmi');
        bmiNode.textContent = `${bmiVal} (${bmiLabel})`;
        bmiNode.className = `val ${bmiClass}`;
        
        // Doctor details
        const docProfile = state.doctors.find(d => d.id === p.doctor_id);
        const docLabel = docProfile ? `${docProfile.doctor_name} (${docProfile.specialization})` : `Doctor ID #${p.doctor_id}`;
        document.getElementById('det-doctor-id').textContent = docLabel;
        
        // Setup commenting details
        document.getElementById('comment-patient-id').value = p.id;
        document.getElementById('comment-textarea').value = '';
        
        // Render Comments List
        renderCommentsList(comments);
        
        // Enforce comment input rules: only clinicians (doctors) can append clinical comments
        const commentForm = document.getElementById('comment-form');
        if (state.currentUser.role.toLowerCase() === 'doctor') {
            // Check if patient is assigned to this specific doctor
            const activeDocProfile = state.doctors.find(d => d.user_id === state.currentUser.id);
            if (activeDocProfile && p.doctor_id === activeDocProfile.id) {
                commentForm.style.display = 'flex';
            } else {
                commentForm.style.display = 'none'; // Lock commenting for unassigned patients
            }
        } else {
            commentForm.style.display = 'none'; // Lock commenting for admin / standard user registrar
        }
        
        openModal('patient-details-modal');
        
    } catch (err) {
        showToast('error', 'Retrieval Error', err.message);
    }
}

function renderCommentsList(comments) {
    const container = document.getElementById('det-comments-box');
    container.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-size: 0.85rem;">
                No comments registered for this patient profile.
            </div>
        `;
        return;
    }
    
    // Sort comments by timestamp desc
    comments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    comments.forEach(c => {
        // Retrieve commenter name
        const docProfile = state.doctors.find(d => d.id === c.doctor_id);
        const docLabel = docProfile ? docProfile.doctor_name : `Doctor ID #${c.doctor_id}`;
        
        const dateStr = new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        
        const card = document.createElement('div');
        card.className = 'comment-card';
        card.innerHTML = `
            <div class="comment-header">
                <span class="commenter-name">${docLabel}</span>
                <span class="comment-date">${dateStr}</span>
            </div>
            <div class="comment-body">${c.comment}</div>
        `;
        container.appendChild(card);
    });
}

async function handleAddComment(event) {
    event.preventDefault();
    const patientId = document.getElementById('comment-patient-id').value;
    const commentText = document.getElementById('comment-textarea').value.trim();
    
    if (!commentText) return;
    
    const payload = {
        patient_id: patientId,
        comment: commentText
    };
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/comments/add-comment`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Unauthorized to comment on this record");
        }
        
        showToast('success', 'Assessment Logged', 'Clinical comment appended to patient history.');
        
        // Reload details modal content
        viewPatientDetails(patientId);
        
    } catch (err) {
        showToast('error', 'Submission Rejected', err.message);
    }
}

// ----------------------------------------------------
// USER ACCOUNTS MANAGEMENT (ADMIN ONLY)
// ----------------------------------------------------

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    state.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="patient-id-badge">${u.id}</span></td>
            <td><span class="patient-name-cell">${u.first_name} ${u.last_name}</span></td>
            <td><span>${u.email}</span></td>
            <td>
                <span class="patient-bmi-badge ${u.role === 'admin' ? 'bmi-underweight' : 'bmi-normal'}">
                    ${u.role}
                </span>
            </td>
            <td class="text-right">
                <button class="btn-table-action action-delete" onclick="deleteUserAccount(${u.id}, '${u.email}')" title="Revoke Authorization">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function openCreateUserModal() {
    openModal('user-modal');
}

async function handleCreateUserFromAdmin(event) {
    event.preventDefault();
    const first = document.getElementById('admin-user-first').value;
    const last = document.getElementById('admin-user-last').value;
    const email = document.getElementById('admin-user-email').value;
    const pass = document.getElementById('admin-user-pass').value;
    const role = document.getElementById('admin-user-role').value;
    
    const payload = {
        first_name: first,
        last_name: last,
        email: email,
        password: pass,
        role: role
    };
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/users/create-user`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Account provisioning failed");
        }
        
        showToast('success', 'User Authorized', `Credentials established for ${email}.`);
        closeModal('user-modal');
        loadDashboardData();
    } catch (err) {
        showToast('error', 'Provisioning Failed', err.message);
    }
}

async function deleteUserAccount(userId, email) {
    if (userId === state.currentUser.id) {
        showToast('error', 'Prohibited Operation', 'You cannot revoke your own administrative session.');
        return;
    }
    
    if (!confirm(`Are you absolutely sure you want to revoke system privileges for account ${email}?`)) {
        return;
    }
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            const errData = await res.json();
            if (res.status === 400 && errData.detail && errData.detail.includes("patients are assigned")) {
                showToast('error', 'Revocation Denied', 'Cannot delete user: this doctor has active assigned patients.');
                return;
            }
            throw new Error(errData.detail || "Revocation failed");
        }
        
        showToast('success', 'Access Revoked', 'Authorized credentials removed from registry.');
        loadDashboardData();
    } catch (err) {
        showToast('error', 'Revocation Failed', err.message);
    }
}

// ----------------------------------------------------
// DOCTOR SPECIALIZATION CREATION (ADMIN ONLY)
// ----------------------------------------------------

async function handleCreateDoctor(event) {
    event.preventDefault();
    const first = document.getElementById('doc-first-name').value;
    const last = document.getElementById('doc-last-name').value;
    const email = document.getElementById('doc-email').value;
    const pass = document.getElementById('doc-password').value;
    const docName = document.getElementById('doc-name').value;
    const spec = document.getElementById('doc-specialization').value;
    
    const payload = {
        first_name: first,
        last_name: last,
        email: email,
        password: pass,
        doctor_name: docName,
        specialization: spec
    };
    
    try {
        const res = await fetch(`${CONFIG.apiBase}/doctor/create`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Specialist creation rejected");
        }
        
        showToast('success', 'Specialist Established', `Assigned clinical profile for ${docName}.`);
        document.getElementById('create-doctor-form').reset();
        switchMainTab('patients');
        loadDashboardData();
    } catch (err) {
        showToast('error', 'Authorization Failed', err.message);
    }
}

let chatSearchBlurTimeout = null;

function handleChatSearchFocus() {
    clearTimeout(chatSearchBlurTimeout);
    const dropdown = document.getElementById('chat-search-dropdown');
    dropdown.classList.add('active');
    handleChatSearchInput(document.getElementById('chat-quick-add-id').value);
}

function handleChatSearchBlur() {
    // Delay hiding dropdown so click event can fire on suggestion items
    chatSearchBlurTimeout = setTimeout(() => {
        const dropdown = document.getElementById('chat-search-dropdown');
        dropdown.classList.remove('active');
    }, 200);
}

function handleChatSearchInput(query) {
    const dropdown = document.getElementById('chat-search-dropdown');
    dropdown.innerHTML = '';
    
    // Assemble all potential known accounts
    const options = [];
    
    // 1. Doctors (public)
    state.doctors.forEach(d => {
        if (d.user_id === state.currentUser.id) return;
        options.push({
            id: d.user_id,
            name: d.doctor_name,
            role: 'Doctor'
        });
    });
    
    // 2. Users (fetched if Admin)
    if (state.currentUser.role.toLowerCase() === 'admin' && state.users) {
        state.users.forEach(u => {
            if (u.id === state.currentUser.id) return;
            // Avoid duplicate doctor listings
            if (!options.some(opt => opt.id === u.id)) {
                options.push({
                    id: u.id,
                    name: `${u.first_name} ${u.last_name}`,
                    role: u.role
                });
            }
        });
    }
    
    // Filter options based on query
    const filtered = options.filter(opt => {
        const q = query.toLowerCase();
        return opt.name.toLowerCase().includes(q) || opt.id.toString().includes(q) || opt.role.toLowerCase().includes(q);
    });
    
    if (filtered.length === 0 && query.trim() === '') {
        dropdown.innerHTML = `<span style="color: var(--text-muted); font-size: 0.75rem; padding: 0.5rem 1rem; text-align: center; display: block;">Type to search accounts...</span>`;
        return;
    }
    
    filtered.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'chat-search-item';
        div.onclick = () => {
            if (!state.chatMessages[opt.id]) {
                state.chatMessages[opt.id] = [];
            }
            selectChatContact(opt.id);
            document.getElementById('chat-quick-add-id').value = '';
            dropdown.classList.remove('active');
        };
        
        div.innerHTML = `
            <div class="item-details">
                <span class="item-name">${opt.name}</span>
                <span class="item-role">${opt.role}</span>
            </div>
            <span class="item-id-badge">ID: ${opt.id}</span>
        `;
        dropdown.appendChild(div);
    });
    
    // If the query is a number, offer to start chat directly with that User ID
    const targetId = parseInt(query);
    if (!isNaN(targetId) && targetId > 0 && targetId !== state.currentUser.id) {
        // If not already in filtered options, append direct chat option
        if (!filtered.some(opt => opt.id === targetId)) {
            const div = document.createElement('div');
            div.className = 'chat-search-item special-add';
            div.onclick = () => {
                if (!state.chatMessages[targetId]) {
                    state.chatMessages[targetId] = [];
                }
                selectChatContact(targetId);
                document.getElementById('chat-quick-add-id').value = '';
                dropdown.classList.remove('active');
            };
            div.innerHTML = `
                <div class="item-details">
                    <span class="item-name">+ Chat with User ID #${targetId}</span>
                    <span class="item-role">Direct Message Connection</span>
                </div>
                <span class="item-id-badge">ID: ${targetId}</span>
            `;
            dropdown.appendChild(div);
        }
    }
}

function toggleChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    drawer.classList.toggle('active');
    
    if (drawer.classList.contains('active')) {
        // Clear unread counts for whatever is currently active
        if (state.selectedContactId) {
            state.unreadCounts[state.selectedContactId] = 0;
            renderChatDrawerBadges();
        }
        buildChatContacts();
    }
}

function buildChatContacts() {
    const container = document.getElementById('chat-contacts-list');
    container.innerHTML = '';
    
    // Assemble chat list based on roles.
    // Admin has access to state.users and state.doctors
    // Doctors/Users have access to state.doctors, and we append any virtual user who texted them!
    const contactsMap = new Map();
    
    // 1. Load clinical specialist profiles
    state.doctors.forEach(d => {
        // Don't show current doctor user in contacts list
        if (state.currentUser.role.toLowerCase() === 'doctor') {
            if (d.user_id === state.currentUser.id) return;
        }
        contactsMap.set(d.user_id, {
            id: d.user_id,
            name: d.doctor_name,
            role: 'Doctor',
            online: false // Updated if WS receives status or active connection
        });
    });
    
    // 2. Load system users (Admin only)
    if (state.currentUser.role.toLowerCase() === 'admin') {
        state.users.forEach(u => {
            if (u.id === state.currentUser.id) return;
            // Avoid duplicate overrides
            if (!contactsMap.has(u.id)) {
                contactsMap.set(u.id, {
                    id: u.id,
                    name: `${u.first_name} ${u.last_name}`,
                    role: u.role,
                    online: false
                });
            }
        });
    }
    
    // 3. Append virtual nodes from active chat histories (for standard users/doctors messaging each other)
    Object.keys(state.chatMessages).forEach(strId => {
        const id = parseInt(strId);
        if (id === state.currentUser.id) return;
        if (!contactsMap.has(id)) {
            // Check if this ID belongs to a known doctor or user
            const knownDoc = state.doctors.find(d => d.user_id === id);
            let name = `User ID #${id}`;
            let role = 'Registrar User';
            if (knownDoc) {
                name = knownDoc.doctor_name;
                role = 'Doctor';
            } else if (state.currentUser.role.toLowerCase() === 'admin' && state.users) {
                const knownUser = state.users.find(u => u.id === id);
                if (knownUser) {
                    name = `${knownUser.first_name} ${knownUser.last_name}`;
                    role = knownUser.role;
                }
            }
            
            contactsMap.set(id, {
                id: id,
                name: name,
                role: role,
                online: false
            });
        }
    });
    
    state.chatContacts = Array.from(contactsMap.values());
    
    if (state.chatContacts.length === 0) {
        container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem 0;">No active contacts found.</span>`;
        return;
    }
    
    state.chatContacts.forEach(c => {
        const unread = state.unreadCounts[c.id] || 0;
        const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        
        const badge = document.createElement('div');
        badge.className = `chat-contact-badge ${state.selectedContactId === c.id ? 'active' : ''}`;
        badge.setAttribute('title', `${c.name} (${c.role})`);
        badge.onclick = () => selectChatContact(c.id);
        badge.innerHTML = `
            <div class="chat-contact-avatar">
                <span>${initials}</span>
                ${unread > 0 ? `<div class="badge badge-pulse" style="position: absolute; top: -5px; right: -5px; font-size: 0.65rem; padding: 0.1rem 0.35rem; margin-left: 0;">${unread}</div>` : ''}
            </div>
            <span class="contact-label-name">${c.name}</span>
        `;
        container.appendChild(badge);
    });
}

function selectChatContact(userId) {
    state.selectedContactId = userId;
    state.unreadCounts[userId] = 0; // Clear unreads
    
    // Update active indicators
    buildChatContacts();
    renderChatDrawerBadges();
    
    // Show window panels
    document.getElementById('chat-window-empty').classList.remove('active');
    const activeWin = document.getElementById('chat-window-active');
    activeWin.classList.add('active');
    
    const contact = state.chatContacts.find(c => c.id === userId);
    document.getElementById('chat-recipient-name').textContent = contact ? contact.name : `User ID #${userId}`;
    document.getElementById('chat-recipient-role').textContent = contact ? contact.role : 'User';
    
    renderChatMessages();
}

function renderChatMessages() {
    const box = document.getElementById('chat-messages-box');
    box.innerHTML = '';
    
    const messages = state.chatMessages[state.selectedContactId] || [];
    
    if (messages.length === 0) {
        box.innerHTML = `
            <div class="system-chat-message" style="background: transparent; color: var(--text-muted); border: none;">
                Safe Connection Established. Messages are fully encrypted.
            </div>
        `;
        return;
    }
    
    messages.forEach(m => {
        if (m.sender === 'system') {
            const row = document.createElement('div');
            row.className = 'system-chat-message';
            row.textContent = m.text;
            box.appendChild(row);
        } else {
            const row = document.createElement('div');
            row.className = `chat-msg-row ${m.sender}`;
            const timeStr = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            row.innerHTML = `
                <div class="chat-msg-bubble">${m.text}</div>
                <span class="msg-timestamp">${timeStr}</span>
            `;
            box.appendChild(row);
        }
    });
    
    // Auto Scroll to bottom
    box.scrollTop = box.scrollHeight;
}

function renderChatDrawerBadges() {
    let totalUnread = 0;
    Object.values(state.unreadCounts).forEach(c => totalUnread += c);
    
    const badge = document.getElementById('chat-badge');
    badge.textContent = totalUnread;
    if (totalUnread > 0) {
        badge.classList.add('badge-pulse');
        badge.style.display = 'block';
    } else {
        badge.classList.remove('badge-pulse');
        badge.style.display = 'none';
    }
}

// ----------------------------------------------------
// WEBSOCKET LOGIC HANDLER
// ----------------------------------------------------

function connectWebSocket() {
    if (state.ws) return;
    
    const token = state.token;
    // Connect WebSocket passing token query parameter as required by backend chat_controller
    const wsUrl = `${CONFIG.wsBase.replace('http', 'ws')}/ws/chat?token=${token}`;
    
    state.ws = new WebSocket(wsUrl);
    
    state.ws.onopen = () => {
        console.log("Universal Live Chat Connected");
        document.getElementById('chat-status-text').textContent = "Online";
        document.getElementById('chat-status-text').previousElementSibling.className = "indicator-dot chat-online";
    };
    
    state.ws.onmessage = (event) => {
        const text = event.data;
        console.log("WS Msg Received:", text);
        
        if (text === "User is offline") {
            // Append system message to last sent contact
            if (state.lastRecipientId) {
                appendChatMessage(state.lastRecipientId, 'system', "Recipient clinician/user is offline right now.");
            }
        } else {
            // Regex to parse backend formatting: f"User {user_id}: {message}"
            const match = text.match(/^User (\d+): (.*)$/);
            if (match) {
                const senderId = parseInt(match[1]);
                const messageContent = match[2];
                
                appendChatMessage(senderId, 'received', messageContent);
                
                // If drawer is closed or active conversation is different, increment unread
                if (!document.getElementById('chat-drawer').classList.contains('active') || state.selectedContactId !== senderId) {
                    state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
                    showToast('info', 'Secure Message Received', `New chat message from User #${senderId}.`);
                    renderChatDrawerBadges();
                    buildChatContacts();
                }
            } else {
                console.warn("Unparsed WebSocket payload format:", text);
            }
        }
    };
    
    state.ws.onclose = () => {
        console.warn("Universal Live Chat Disconnected");
        document.getElementById('chat-status-text').textContent = "Offline";
        document.getElementById('chat-status-text').previousElementSibling.className = "indicator-dot chat-offline";
        state.ws = null;
        
        // Reconnection attempt after 5 seconds if authenticated
        if (state.token) {
            setTimeout(connectWebSocket, 5000);
        }
    };
    
    state.ws.onerror = (err) => {
        console.error("WS Socket Error:", err);
    };
}

function closeWebSocket() {
    if (state.ws) {
        state.ws.close();
        state.ws = null;
    }
}

function appendChatMessage(contactId, direction, text) {
    if (!state.chatMessages[contactId]) {
        state.chatMessages[contactId] = [];
    }
    
    state.chatMessages[contactId].push({
        sender: direction === 'received' ? 'them' : direction === 'sent' ? 'sent' : 'system',
        text: text,
        timestamp: new Date()
    });
    
    // Re-render conversation details if currently viewing
    if (state.selectedContactId === contactId) {
        renderChatMessages();
    }
}

function handleSendDirectMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-message-input');
    const msg = input.value.trim();
    
    if (!msg || !state.selectedContactId || !state.ws) return;
    
    try {
        const payload = {
            receiver_id: state.selectedContactId,
            message: msg
        };
        
        state.ws.send(JSON.stringify(payload));
        state.lastRecipientId = state.selectedContactId;
        
        // Append to my message history
        appendChatMessage(state.selectedContactId, 'sent', msg);
        
        input.value = '';
        input.focus();
    } catch (err) {
        showToast('error', 'Transmission Failed', 'WebSocket link interrupted.');
    }
}
