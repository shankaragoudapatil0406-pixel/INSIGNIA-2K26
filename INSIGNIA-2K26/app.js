/* ============================================================
   INSIGNIA — AI Interview Preparation Suite
   Application Logic
   ============================================================ */

// ==================== STATE ====================
const AppState = {
    profile: JSON.parse(localStorage.getItem('insignia_profile') || 'null'),
    stats: JSON.parse(localStorage.getItem('insignia_stats') || '{"resumes":0,"questions":0,"topics":0,"mocks":0}'),
    mockSession: null,
    mockTimer: null,
    mockSeconds: 0,
    studyProgress: JSON.parse(localStorage.getItem('insignia_study_progress') || '{}'),
};

// ==================== INIT ====================
let _appInitialized = false;

function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('fade-out');
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
}

// Hard fail-safe: if app hasn't initialized within 1.5s, force-show the auth screen
setTimeout(() => {
    if (!_appInitialized) {
        console.warn('App init timeout — forcing auth screen');
        hideLoadingScreen();
        // Show auth screen so the user isn't stuck on a blank loader
        const authScreen = document.getElementById('auth-screen');
        const appWrapper = document.getElementById('app-wrapper');
        if (authScreen && authScreen.style.display !== 'flex') {
            // Only override if nothing has been shown yet
            if (!appWrapper || appWrapper.style.display === 'none' || !appWrapper.classList.contains('authenticated')) {
                if (authScreen) authScreen.style.display = 'flex';
            }
        }
    }
}, 1500);

window.addEventListener('DOMContentLoaded', async () => {
    try {
        setupNavigation();
        loadProfile();
        updateStats();
        updateReadiness();
        setupOTPInputs();

        // Check auth state with graceful fallback
        await checkAuthState();
    } catch (err) {
        console.error('App initialization error:', err);
        // On any error, fall back to showing auth screen
        try { showAuthScreen(); } catch(e2) {}
    } finally {
        _appInitialized = true;
        hideLoadingScreen();
    }
});

// ==================== NAVIGATION ====================
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
}

function navigateTo(page) {
    const currentPage = document.querySelector('.page.active')?.id?.replace('page-', '');

    // Side effects: LEAVING a page
    if (currentPage === 'mock' && AppState.mockTimer) {
        clearInterval(AppState.mockTimer);
        AppState.mockTimer = null;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('page-' + page)?.classList.add('active');
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    // Side effects: ENTERING a page
    if (page === 'skillconnect') {
        const scEmailEl = document.getElementById('sc-email');
        const scNameEl = document.getElementById('sc-name');
        if (scEmailEl && !scEmailEl.value && authEmail) scEmailEl.value = authEmail;
        if (scNameEl && !scNameEl.value && authEmail) scNameEl.value = authEmail.split('@')[0];
    }

    // Scroll main content to top
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile sidebar
    closeSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
}

// ==================== TOAST ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==================== PROFILE ====================
const PROFILE_SKILL_SUGGESTIONS_LIST = [
    'JavaScript','TypeScript','Python','Java','C++','C#','Go','Rust','Swift','Kotlin',
    'React','Vue','Angular','Next.js','Node.js','Express','FastAPI','Django','Spring Boot',
    'HTML','CSS','Tailwind CSS','SASS','GraphQL','REST API','PostgreSQL','MySQL','MongoDB',
    'Redis','Docker','Kubernetes','AWS','Azure','GCP','Git','Linux','Figma','Photoshop',
    'Machine Learning','Deep Learning','TensorFlow','PyTorch','Pandas','NumPy','Tableau',
    'Power BI','SQL','Excel','R','Scala','Hadoop','Spark','Kafka','Terraform','Ansible',
    'React Native','Flutter','Dart','OWASP','Cybersecurity','Blockchain','Solidity'
];

let profileSkills = [];

function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    if (AppState.profile) {
        loadProfile();
    } else {
        const emailEl = document.getElementById('profile-email-display');
        if (emailEl && !emailEl.value && authEmail && !authEmail.includes('@guest.local')) {
            emailEl.value = authEmail;
        }
        const nameEl = document.getElementById('profile-name');
        if (nameEl && !nameEl.value && authEmail) {
            nameEl.value = authEmail.split('@')[0];
        }
        updateProfilePreview();
        updateProfileCompleteness();
        renderProfileSkillChips();
    }
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('profile-skill-suggestions').innerHTML = '';
}

function saveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    btn.disabled = true;

    AppState.profile = {
        name:         document.getElementById('profile-name').value.trim(),
        email:        document.getElementById('profile-email-display').value.trim(),
        college:      document.getElementById('profile-college').value.trim(),
        location:     document.getElementById('profile-location').value.trim(),
        bio:          document.getElementById('profile-bio').value.trim(),
        role:         document.getElementById('profile-role').value.trim(),
        level:        document.getElementById('profile-level').value,
        domain:       document.getElementById('profile-domain').value,
        availability: document.getElementById('profile-availability').value,
        skills:       [...profileSkills],
        linkedin:     document.getElementById('profile-linkedin').value.trim(),
        github:       document.getElementById('profile-github').value.trim(),
        portfolio:    document.getElementById('profile-portfolio').value.trim(),
        leetcode:     document.getElementById('profile-leetcode').value.trim()
    };

    localStorage.setItem('insignia_profile', JSON.stringify(AppState.profile));
    applyProfileToUI(AppState.profile);
    closeProfileModal();
    showToast('Profile saved!', 'success');
    btn.disabled = false;
}

function loadProfile() {
    if (!AppState.profile) return;
    const p = AppState.profile;
    profileSkills = p.skills ? [...p.skills] : [];

    // Populate all fields
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('profile-name', p.name);
    set('profile-email-display', p.email || authEmail || '');
    set('profile-college', p.college);
    set('profile-location', p.location);
    set('profile-bio', p.bio);
    set('profile-role', p.role);
    set('profile-level', p.level);
    set('profile-domain', p.domain);
    set('profile-availability', p.availability);
    set('profile-linkedin', p.linkedin);
    set('profile-github', p.github);
    set('profile-portfolio', p.portfolio);
    set('profile-leetcode', p.leetcode);

    applyProfileToUI(p);
    renderProfileSkillChips();
    updateProfilePreview();
    updateProfileCompleteness();
}

function applyProfileToUI(p) {
    // Sidebar display
    const nameEl = document.getElementById('display-user-name');
    const roleEl = document.getElementById('display-user-role');
    if (nameEl) nameEl.textContent = p.name || 'Your Name';
    if (roleEl) roleEl.textContent = p.role || (p.domain ? p.domain : 'Set up profile →');
}

// Live avatar + identity preview
function updateProfilePreview() {
    const name   = document.getElementById('profile-name')?.value?.trim() || '';
    const role   = document.getElementById('profile-role')?.value?.trim() || '';
    const level  = document.getElementById('profile-level')?.value || '';
    const college = document.getElementById('profile-college')?.value?.trim() || '';

    // Initials
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
    const initialsEl = document.getElementById('profile-avatar-initials');
    if (initialsEl) initialsEl.textContent = initials;

    // Name line
    const namePreviewEl = document.getElementById('profile-identity-name');
    if (namePreviewEl) namePreviewEl.textContent = name || 'Your Name';

    // Role line
    const rolePreviewEl = document.getElementById('profile-identity-role');
    const levelLabels = { fresher: 'Fresher', junior: 'Junior', mid: 'Mid-Level', senior: 'Senior' };
    if (rolePreviewEl) {
        const parts = [role, levelLabels[level]].filter(Boolean);
        const collegePart = college ? ` · ${college}` : '';
        rolePreviewEl.textContent = (parts.join(' · ') || 'Target Role · Level') + collegePart;
    }

    updateProfileBadges();
    updateProfileCompleteness();
}

function updateProfileBadges() {
    const domain = document.getElementById('profile-domain')?.value || '';
    const availability = document.getElementById('profile-availability')?.value || '';
    const badgesEl = document.getElementById('profile-identity-badges');
    if (!badgesEl) return;

    const domainColors = {
        technology: '#6C5CE7', data: '#00B894', design: '#FD79A8',
        product: '#FDCB6E', marketing: '#E17055', finance: '#00D2FF', other: '#a29bfe'
    };
    const availColors = { open: '#00B894', active: '#00D2FF', passive: '#FDCB6E', 'not-looking': '#FF6B6B' };
    const availLabels = { open: '🟢 Open', active: '🔵 Active', passive: '🟡 Passive', 'not-looking': '🔴 Not Looking' };

    badgesEl.innerHTML = `
        ${domain ? `<span class="profile-badge" style="background:${domainColors[domain]}22;color:${domainColors[domain]};border-color:${domainColors[domain]}44">${domain.charAt(0).toUpperCase()+domain.slice(1)}</span>` : ''}
        ${availability ? `<span class="profile-badge" style="background:${availColors[availability]}22;color:${availColors[availability]};border-color:${availColors[availability]}44">${availLabels[availability]}</span>` : ''}
    `;
}

function updateProfileCompleteness() {
    const fields = [
        document.getElementById('profile-name')?.value?.trim(),
        document.getElementById('profile-email-display')?.value?.trim(),
        document.getElementById('profile-college')?.value?.trim(),
        document.getElementById('profile-location')?.value?.trim(),
        document.getElementById('profile-bio')?.value?.trim(),
        document.getElementById('profile-role')?.value?.trim(),
        profileSkills.length > 0 ? 'yes' : '',
        document.getElementById('profile-linkedin')?.value?.trim() ||
        document.getElementById('profile-github')?.value?.trim() ||
        document.getElementById('profile-portfolio')?.value?.trim()
    ];
    const filled = fields.filter(Boolean).length;
    const pct = Math.round((filled / fields.length) * 100);

    const bar = document.getElementById('profile-completeness-bar');
    const label = document.getElementById('profile-completeness-label');
    if (bar) {
        bar.style.width = pct + '%';
        bar.style.background = pct < 40 ? 'var(--accent-red)' : pct < 75 ? 'var(--accent-yellow)' : 'var(--accent-green)';
    }
    if (label) {
        const msg = pct === 100 ? '🎉 Perfect profile!' :
                    pct >= 75  ? `${pct}% complete — almost there!` :
                    pct >= 40  ? `${pct}% complete — keep going!` :
                                 `${pct}% complete — fill in more details`;
        label.textContent = msg;
    }
}

// Skill chips
function profileSkillSuggest(val) {
    const q = val.trim().toLowerCase();
    const container = document.getElementById('profile-skill-suggestions');
    if (!container) return;
    if (!q) { container.innerHTML = ''; return; }
    const matches = PROFILE_SKILL_SUGGESTIONS_LIST.filter(s =>
        s.toLowerCase().includes(q) && !profileSkills.includes(s)
    ).slice(0, 6);
    container.innerHTML = matches.map(s =>
        `<button type="button" class="sc-suggestion-chip" onclick="profileAddSkill('${s}')">${s}</button>`
    ).join('');
}

function profileSkillKeydown(e) {
    const input = e.target;
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = input.value.replace(/,$/, '').trim();
        if (val) profileAddSkill(val);
        input.value = '';
        document.getElementById('profile-skill-suggestions').innerHTML = '';
    }
}

function profileAddSkill(skill) {
    const s = skill.trim();
    if (!s || profileSkills.includes(s)) return;
    profileSkills.push(s);
    renderProfileSkillChips();
    const inp = document.getElementById('profile-skills-input');
    if (inp) inp.value = '';
    document.getElementById('profile-skill-suggestions').innerHTML = '';
    updateProfileCompleteness();
}

function profileRemoveSkill(skill) {
    profileSkills = profileSkills.filter(s => s !== skill);
    renderProfileSkillChips();
    updateProfileCompleteness();
}

function renderProfileSkillChips() {
    const container = document.getElementById('profile-skill-chips');
    if (!container) return;
    container.innerHTML = profileSkills.map(s =>
        `<span class="sc-tag">${s}<button type="button" class="sc-tag-remove" onclick="profileRemoveSkill('${s}')">×</button></span>`
    ).join('');
}



// ==================== STATS ====================
function updateStats() {
    document.getElementById('stat-resumes').textContent = AppState.stats.resumes;
    document.getElementById('stat-questions').textContent = AppState.stats.questions;
    document.getElementById('stat-topics').textContent = AppState.stats.topics;
    document.getElementById('stat-mocks').textContent = AppState.stats.mocks;
}

function incrementStat(key, val = 1) {
    AppState.stats[key] = (AppState.stats[key] || 0) + val;
    localStorage.setItem('insignia_stats', JSON.stringify(AppState.stats));
    updateStats();
    updateReadiness();
}

function updateReadiness() {
    const s = AppState.stats;
    const rp = Math.min(s.resumes * 25, 100);
    const qp = Math.min(s.questions * 2, 100);
    const tp = Math.min(s.topics * 5, 100);
    const mp = Math.min(s.mocks * 20, 100);
    const overall = Math.round((rp + qp + tp + mp) / 4);

    document.getElementById('resume-progress').style.width = rp + '%';
    document.getElementById('resume-progress-val').textContent = rp + '%';
    document.getElementById('qa-progress').style.width = qp + '%';
    document.getElementById('qa-progress-val').textContent = qp + '%';
    document.getElementById('topic-progress').style.width = tp + '%';
    document.getElementById('topic-progress-val').textContent = tp + '%';
    document.getElementById('mock-progress').style.width = mp + '%';
    document.getElementById('mock-progress-val').textContent = mp + '%';

    document.getElementById('readiness-value').textContent = overall;
    const circle = document.getElementById('readiness-circle');
    const circumference = 327;
    circle.style.strokeDashoffset = circumference - (circumference * overall / 100);
}

// ==================== RESUME BUILDER ====================
function addEducation() {
    const container = document.getElementById('education-entries');
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `
        <div class="entry-block-header">
            <button type="button" class="btn-delete-entry" onclick="deleteEntryBlock(this)">✕ Remove</button>
        </div>
        <div class="form-grid">
            <div class="form-group"><label>Degree</label><input type="text" class="edu-degree" placeholder="M.S. in Data Science"></div>
            <div class="form-group"><label>Institution</label><input type="text" class="edu-institution" placeholder="Stanford University"></div>
            <div class="form-group"><label>Year</label><input type="text" class="edu-year" placeholder="2024 - 2026"></div>
            <div class="form-group"><label>GPA</label><input type="text" class="edu-gpa" placeholder="3.9 / 4.0"></div>
        </div>`;
    container.appendChild(block);
}

function addExperience() {
    const container = document.getElementById('experience-entries');
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `
        <div class="entry-block-header">
            <button type="button" class="btn-delete-entry" onclick="deleteEntryBlock(this)">✕ Remove</button>
        </div>
        <div class="form-grid">
            <div class="form-group"><label>Job Title</label><input type="text" class="exp-title" placeholder="Software Engineer"></div>
            <div class="form-group"><label>Company</label><input type="text" class="exp-company" placeholder="Amazon"></div>
            <div class="form-group"><label>Duration</label><input type="text" class="exp-duration" placeholder="Jan 2024 - Present"></div>
        </div>
        <div class="form-group"><label>Key Responsibilities</label><textarea class="exp-desc" rows="3" placeholder="Describe contributions..."></textarea></div>`;
    container.appendChild(block);
}

function addProject() {
    const container = document.getElementById('project-entries');
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `
        <div class="entry-block-header">
            <button type="button" class="btn-delete-entry" onclick="deleteEntryBlock(this)">✕ Remove</button>
        </div>
        <div class="form-grid">
            <div class="form-group"><label>Project Name</label><input type="text" class="proj-name" placeholder="Project Name"></div>
            <div class="form-group"><label>Technologies</label><input type="text" class="proj-tech" placeholder="React, Python"></div>
        </div>
        <div class="form-group"><label>Description</label><textarea class="proj-desc" rows="2" placeholder="Brief description..."></textarea></div>`;
    container.appendChild(block);
}

function deleteEntryBlock(btn) {
    btn.closest('.entry-block').remove();
}

function generateResume(e) {
    e.preventDefault();
    const btn = document.getElementById('generate-resume-btn');
    btn.classList.add('loading');

    const data = {
        name: document.getElementById('resume-name').value,
        email: document.getElementById('resume-email').value,
        phone: document.getElementById('resume-phone').value,
        location: document.getElementById('resume-location').value,
        linkedin: document.getElementById('resume-linkedin').value,
        portfolio: document.getElementById('resume-portfolio').value,
        targetRole: document.getElementById('resume-target-role').value,
        level: document.getElementById('resume-experience-level').value,
        summary: document.getElementById('resume-summary').value,
        skills: document.getElementById('resume-skills').value,
        education: [], experience: [], projects: []
    };

    document.querySelectorAll('#education-entries .entry-block').forEach(block => {
        const deg = block.querySelector('.edu-degree')?.value;
        if (deg) data.education.push({ degree: deg, institution: block.querySelector('.edu-institution')?.value || '', year: block.querySelector('.edu-year')?.value || '', gpa: block.querySelector('.edu-gpa')?.value || '' });
    });
    document.querySelectorAll('#experience-entries .entry-block').forEach(block => {
        const t = block.querySelector('.exp-title')?.value;
        if (t) data.experience.push({ title: t, company: block.querySelector('.exp-company')?.value || '', duration: block.querySelector('.exp-duration')?.value || '', desc: block.querySelector('.exp-desc')?.value || '' });
    });
    document.querySelectorAll('#project-entries .entry-block').forEach(block => {
        const n = block.querySelector('.proj-name')?.value;
        if (n) data.projects.push({ name: n, tech: block.querySelector('.proj-tech')?.value || '', desc: block.querySelector('.proj-desc')?.value || '' });
    });

    setTimeout(() => {
        renderResume(data);
        btn.classList.remove('loading');
        document.getElementById('resume-preview-container').style.display = 'block';
        incrementStat('resumes');
        showToast('Resume generated successfully!', 'success');
    }, 1500);
}

function renderResume(d) {
    const enhancedSummary = d.summary || generateSummary(d);
    const skillsArr = d.skills.split(',').map(s => s.trim()).filter(Boolean);

    const expBullets = (desc) => {
        if (!desc) return '';
        const lines = desc.split('\n').filter(l => l.trim());
        return lines.map(l => {
            l = l.replace(/^[-•*]\s*/, '').trim();
            const actionVerbs = ['Developed','Built','Designed','Implemented','Led','Managed','Optimized','Created','Launched','Delivered','Architected','Improved','Reduced','Increased','Spearheaded','Coordinated','Collaborated','Produced','Facilitated','Trained'];
            const hasVerb = actionVerbs.some(v => l.startsWith(v));
            if (!hasVerb && l.length > 3) l = 'Developed ' + l.charAt(0).toLowerCase() + l.slice(1);
            return `<li>${l}</li>`;
        }).join('');
    };

    // Build Key Achievements from experience descriptions
    const achievements = [];
    d.experience.forEach(ex => {
        if (ex.desc) {
            const lines = ex.desc.split('\n').filter(l => l.trim()).slice(0, 1);
            lines.forEach(l => {
                l = l.replace(/^[-•*]\s*/, '').trim();
                if (l) achievements.push({ title: ex.title + ' Achievement', desc: l, company: ex.company });
            });
        }
    });
    if (d.projects.length > 0) {
        d.projects.forEach(p => { if (p.desc) achievements.push({ title: p.name, desc: p.desc, company: p.tech }); });
    }
    if (achievements.length === 0) {
        achievements.push({ title: 'Goal-Oriented Professional', desc: 'Dedicated to delivering high-quality results and continuously improving performance metrics in a dynamic environment.', company: '' });
        achievements.push({ title: 'Continuous Learner', desc: 'Committed to staying current with industry trends and expanding technical expertise to drive innovative solutions.', company: '' });
    }

    // Contacts row
    const contactItems = [];
    if (d.email) contactItems.push(`<span class="cv-contact-item"><span class="cv-contact-icon">✉</span>${d.email}</span>`);
    if (d.linkedin) contactItems.push(`<span class="cv-contact-item"><span class="cv-contact-icon">🔗</span>${d.linkedin}</span>`);
    if (d.portfolio) contactItems.push(`<span class="cv-contact-item"><span class="cv-contact-icon">💼</span>${d.portfolio}</span>`);
    if (d.location) contactItems.push(`<span class="cv-contact-item"><span class="cv-contact-icon">📍</span>${d.location}</span>`);
    if (d.phone) contactItems.push(`<span class="cv-contact-item"><span class="cv-contact-icon">📞</span>${d.phone}</span>`);

    // LEFT: Experience
    let expHtml = '';
    if (d.experience.length) {
        d.experience.forEach(ex => {
            expHtml += `
            <div class="cv-exp-entry">
                <div class="cv-exp-title">${ex.title}</div>
                <div class="cv-exp-company">${ex.company}</div>
                <div class="cv-exp-meta">${ex.duration ? `<span class="cv-exp-icon">📅</span>${ex.duration}` : ''}${d.location ? ` &nbsp;📍 ${d.location}` : ''}</div>
                <ul class="cv-exp-bullets">${expBullets(ex.desc)}</ul>
            </div>`;
        });
    }

    // LEFT: Projects (treated as extra experience)
    let projHtml = '';
    if (d.projects.length) {
        d.projects.forEach(p => {
            projHtml += `
            <div class="cv-exp-entry">
                <div class="cv-exp-title">${p.name}</div>
                <div class="cv-exp-company" style="color:#2ecc71">${p.tech}</div>
                <p class="cv-proj-desc">${p.desc}</p>
            </div>`;
        });
    }

    // RIGHT: Education
    let eduHtml = '';
    if (d.education.length) {
        d.education.forEach(e => {
            eduHtml += `
            <div class="cv-edu-entry">
                <div class="cv-edu-degree">${e.degree}</div>
                <div class="cv-edu-institution">${e.institution}</div>
                <div class="cv-edu-meta">${e.year ? `<span>📅</span> ${e.year}` : ''}${e.gpa ? ` &nbsp; GPA: ${e.gpa}` : ''}</div>
            </div>`;
        });
    }

    // Language bar generator
    const langBar = (level) => {
        const levels = { native: 5, fluent: 4, advanced: 4, intermediate: 3, beginner: 2 };
        const filled = levels[level.toLowerCase()] || 3;
        let bars = '';
        for (let i = 0; i < 5; i++) bars += `<span class="cv-lang-bar ${i < filled ? 'filled' : ''}"></span>`;
        return bars;
    };

    const html = `
    <div class="cv-wrapper">
        <!-- HEADER -->
        <div class="cv-header">
            <div class="cv-header-bg-deco"></div>
            <div class="cv-name">${d.name || 'Your Name'}</div>
            <div class="cv-role">${d.targetRole || 'Professional Title'}</div>
            <div class="cv-contacts">${contactItems.join('')}</div>
        </div>

        <!-- BODY: Two Columns -->
        <div class="cv-body">

            <!-- LEFT COLUMN -->
            <div class="cv-left">

                <!-- SUMMARY -->
                <div class="cv-section">
                    <div class="cv-section-title">SUMMARY</div>
                    <div class="cv-section-line"></div>
                    <p class="cv-summary-text">${enhancedSummary}</p>
                </div>

                <!-- EXPERIENCE -->
                ${d.experience.length ? `
                <div class="cv-section">
                    <div class="cv-section-title">EXPERIENCE</div>
                    <div class="cv-section-line"></div>
                    ${expHtml}
                </div>` : ''}

                <!-- PROJECTS -->
                ${d.projects.length ? `
                <div class="cv-section">
                    <div class="cv-section-title">PROJECTS</div>
                    <div class="cv-section-line"></div>
                    ${projHtml}
                </div>` : ''}

                <!-- LANGUAGES -->
                <div class="cv-section">
                    <div class="cv-section-title">LANGUAGES</div>
                    <div class="cv-section-line"></div>
                    <div class="cv-languages">
                        <div class="cv-lang-item">
                            <div><div class="cv-lang-name">English</div><div class="cv-lang-level">Native</div></div>
                            <div class="cv-lang-bars">${langBar('native')}</div>
                        </div>
                        <div class="cv-lang-item">
                            <div><div class="cv-lang-name">Professional</div><div class="cv-lang-level">Advanced</div></div>
                            <div class="cv-lang-bars">${langBar('advanced')}</div>
                        </div>
                    </div>
                </div>

            </div><!-- end cv-left -->

            <!-- RIGHT COLUMN -->
            <div class="cv-right">

                <!-- KEY ACHIEVEMENTS -->
                <div class="cv-section">
                    <div class="cv-section-title">KEY ACHIEVEMENTS</div>
                    <div class="cv-section-line"></div>
                    ${achievements.slice(0, 4).map(a => `
                    <div class="cv-achievement">
                        <div class="cv-achievement-title">${a.title}</div>
                        <div class="cv-achievement-desc">${a.desc}</div>
                    </div>`).join('')}
                </div>

                <!-- SKILLS -->
                ${skillsArr.length ? `
                <div class="cv-section">
                    <div class="cv-section-title">SKILLS</div>
                    <div class="cv-section-line"></div>
                    <p class="cv-skills-text">${skillsArr.join(', ')}</p>
                </div>` : ''}

                <!-- EDUCATION -->
                ${d.education.length ? `
                <div class="cv-section">
                    <div class="cv-section-title">EDUCATION</div>
                    <div class="cv-section-line"></div>
                    ${eduHtml}
                </div>` : ''}

                <!-- TRAINING / COURSES -->
                <div class="cv-section">
                    <div class="cv-section-title">TRAINING / COURSES</div>
                    <div class="cv-section-line"></div>
                    <div class="cv-training-item">
                        <div class="cv-training-title">${d.targetRole} Fundamentals</div>
                        <div class="cv-training-desc">Industry-standard certification covering core principles and advanced techniques for ${d.targetRole} professionals.</div>
                    </div>
                    <div class="cv-training-item">
                        <div class="cv-training-title">Professional Development</div>
                        <div class="cv-training-desc">Continuous learning through online platforms and industry workshops to stay current with evolving technologies.</div>
                    </div>
                </div>

                <!-- INTERESTS -->
                <div class="cv-section">
                    <div class="cv-section-title">INTERESTS</div>
                    <div class="cv-section-line"></div>
                    <div class="cv-interest-item">
                        <div class="cv-interest-title">Technology Innovation</div>
                        <div class="cv-interest-desc">Passionate about emerging technologies and their potential to solve real-world problems at scale.</div>
                    </div>
                    <div class="cv-interest-item">
                        <div class="cv-interest-title">Continuous Learning</div>
                        <div class="cv-interest-desc">Committed to lifelong growth through courses, open-source contributions, and community engagement.</div>
                    </div>
                </div>

            </div><!-- end cv-right -->
        </div><!-- end cv-body -->

        <!-- FOOTER -->
        <div class="cv-footer">
            <span>Generated by Insignia AI</span>
        </div>
    </div>`;

    document.getElementById('resume-preview').innerHTML = html;
    injectCVStyles();
    generateSuggestions(d);
}

function injectCVStyles() {
    if (document.getElementById('cv-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'cv-injected-styles';
    style.textContent = `
        #resume-preview { background: #fff; border-radius: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a2e; }
        .cv-wrapper { max-width: 780px; margin: 0 auto; background: #fff; }
        /* HEADER */
        .cv-header { padding: 28px 32px 20px; background: #fff; position: relative; overflow: hidden; border-bottom: 1px solid #e8e8e8; }
        .cv-header-bg-deco { position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(108,92,231,0.06) 0%, transparent 70%); pointer-events: none; }
        .cv-name { font-size: 2.1rem; font-weight: 900; letter-spacing: -0.02em; color: #0d0d1a; font-family: 'Arial Black', 'Inter', sans-serif; text-transform: uppercase; line-height: 1.1; }
        .cv-role { font-size: 0.88rem; font-weight: 600; color: #2980b9; margin-top: 4px; letter-spacing: 0.01em; font-family: 'Inter', Arial, sans-serif; }
        .cv-contacts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
        .cv-contact-item { font-size: 0.74rem; color: #555; display: flex; align-items: center; gap: 4px; font-family: 'Inter', Arial, sans-serif; }
        .cv-contact-icon { font-size: 0.72rem; }
        /* BODY */
        .cv-body { display: grid; grid-template-columns: 1fr 0.72fr; gap: 0; }
        /* COLUMNS */
        .cv-left { padding: 20px 28px 24px 32px; border-right: 1px solid #ebebeb; }
        .cv-right { padding: 20px 28px 24px 24px; background: #fafafa; }
        /* SECTION */
        .cv-section { margin-bottom: 18px; }
        .cv-section-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; color: #0d0d1a; font-family: 'Inter', Arial, sans-serif; text-transform: uppercase; }
        .cv-section-line { height: 2px; background: #1a1a2e; margin: 4px 0 10px; }
        /* SUMMARY */
        .cv-summary-text { font-size: 0.78rem; color: #444; line-height: 1.6; margin: 0; }
        /* EXPERIENCE */
        .cv-exp-entry { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #ddd; }
        .cv-exp-entry:last-child { border-bottom: none; }
        .cv-exp-title { font-size: 0.84rem; font-weight: 700; color: #0d0d1a; font-family: 'Inter', Arial, sans-serif; }
        .cv-exp-company { font-size: 0.78rem; font-weight: 600; color: #2980b9; margin: 2px 0; }
        .cv-exp-meta { font-size: 0.7rem; color: #888; margin-bottom: 6px; display: flex; gap: 4px; align-items: center; font-family: 'Inter', Arial, sans-serif; }
        .cv-exp-icon { font-size: 0.68rem; }
        .cv-exp-bullets { padding-left: 16px; margin: 0; }
        .cv-exp-bullets li { font-size: 0.75rem; color: #555; line-height: 1.55; margin-bottom: 3px; }
        .cv-proj-desc { font-size: 0.75rem; color: #555; margin: 6px 0 0; line-height: 1.55; }
        /* LANGUAGES */
        .cv-languages { display: flex; flex-direction: column; gap: 10px; }
        .cv-lang-item { display: flex; justify-content: space-between; align-items: center; }
        .cv-lang-name { font-size: 0.78rem; font-weight: 700; color: #1a1a2e; font-family: 'Inter', Arial, sans-serif; }
        .cv-lang-level { font-size: 0.68rem; color: #888; }
        .cv-lang-bars { display: flex; gap: 3px; }
        .cv-lang-bar { width: 18px; height: 14px; border-radius: 2px; background: #e0e0e0; }
        .cv-lang-bar.filled { background: #2980b9; }
        /* KEY ACHIEVEMENTS */
        .cv-achievement { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; }
        .cv-achievement:last-child { border-bottom: none; }
        .cv-achievement-title { font-size: 0.76rem; font-weight: 700; color: #0d0d1a; font-family: 'Inter', Arial, sans-serif; margin-bottom: 2px; }
        .cv-achievement-desc { font-size: 0.72rem; color: #555; line-height: 1.5; }
        /* SKILLS */
        .cv-skills-text { font-size: 0.74rem; color: #444; line-height: 1.7; margin: 0; }
        /* EDUCATION */
        .cv-edu-entry { margin-bottom: 10px; }
        .cv-edu-degree { font-size: 0.8rem; font-weight: 700; color: #0d0d1a; font-family: 'Inter', Arial, sans-serif; }
        .cv-edu-institution { font-size: 0.75rem; font-weight: 600; color: #2980b9; }
        .cv-edu-meta { font-size: 0.68rem; color: #888; margin-top: 2px; }
        /* TRAINING */
        .cv-training-item { margin-bottom: 9px; }
        .cv-training-title { font-size: 0.76rem; font-weight: 700; color: #2980b9; font-family: 'Inter', Arial, sans-serif; }
        .cv-training-desc { font-size: 0.71rem; color: #555; line-height: 1.5; margin-top: 2px; }
        /* INTERESTS */
        .cv-interest-item { margin-bottom: 9px; }
        .cv-interest-title { font-size: 0.76rem; font-weight: 700; color: #0d0d1a; font-family: 'Inter', Arial, sans-serif; }
        .cv-interest-desc { font-size: 0.71rem; color: #555; line-height: 1.5; margin-top: 2px; }
        /* FOOTER */
        .cv-footer { text-align: right; padding: 8px 28px; font-size: 0.65rem; color: #bbb; border-top: 1px solid #eee; font-family: 'Inter', Arial, sans-serif; }
    `;
    document.head.appendChild(style);
}

function generateSummary(d) {
    const levels = { fresher: 'motivated and detail-oriented', junior: 'results-driven', mid: 'experienced and innovative', senior: 'seasoned and strategic', lead: 'visionary leader and architect' };
    return `${levels[d.level] || 'Motivated'} ${d.targetRole} with a strong foundation in ${d.skills.split(',').slice(0, 3).join(', ')}. Passionate about delivering high-quality solutions and continuously expanding technical expertise. Seeking to leverage skills and knowledge to drive impactful outcomes in a dynamic environment.`;
}

function generateSuggestions(d) {
    const suggestions = [];
    if (!d.summary) suggestions.push('Add a tailored professional summary highlighting your unique value proposition for the target role.');
    if (d.skills.split(',').length < 5) suggestions.push('Include at least 8-10 relevant skills. Add both technical and soft skills for a balanced profile.');
    if (!d.experience.length) suggestions.push('Add work experience or internships. Even academic projects with real-world impact count.');
    if (d.experience.some(e => !e.desc || e.desc.length < 50)) suggestions.push('Strengthen experience bullet points with quantifiable achievements (e.g., "Improved API response time by 40%").');
    if (!d.linkedin) suggestions.push('Add your LinkedIn profile URL. 87% of recruiters use LinkedIn to vet candidates.');
    if (!d.portfolio) suggestions.push('Include a GitHub or portfolio link to showcase your work and projects.');
    suggestions.push('Use strong action verbs: Architected, Optimized, Spearheaded, Implemented, Delivered.');
    suggestions.push('Tailor keyword density to match the job description for better ATS compatibility.');

    const list = document.getElementById('suggestions-list');
    list.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
}

function getResumeCSS() {
    return `
        body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 0; background: #fff; color: #1a1a2e; }
        .cv-wrapper { max-width: 780px; margin: 0 auto; background: #fff; }
        .cv-header { padding: 28px 32px 20px; background: #fff; border-bottom: 1px solid #e8e8e8; }
        .cv-name { font-size: 2.1rem; font-weight: 900; letter-spacing: -0.02em; color: #0d0d1a; font-family: Arial Black, sans-serif; text-transform: uppercase; }
        .cv-role { font-size: 0.88rem; font-weight: 600; color: #2980b9; margin-top: 4px; }
        .cv-contacts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
        .cv-contact-item { font-size: 0.74rem; color: #555; display: flex; align-items: center; gap: 4px; }
        .cv-body { display: grid; grid-template-columns: 1fr 0.72fr; }
        .cv-left { padding: 20px 28px 24px 32px; border-right: 1px solid #ebebeb; }
        .cv-right { padding: 20px 28px 24px 24px; background: #fafafa; }
        .cv-section { margin-bottom: 18px; }
        .cv-section-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; color: #0d0d1a; text-transform: uppercase; }
        .cv-section-line { height: 2px; background: #1a1a2e; margin: 4px 0 10px; }
        .cv-summary-text { font-size: 0.78rem; color: #444; line-height: 1.6; margin: 0; }
        .cv-exp-entry { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #ddd; }
        .cv-exp-title { font-size: 0.84rem; font-weight: 700; color: #0d0d1a; }
        .cv-exp-company { font-size: 0.78rem; font-weight: 600; color: #2980b9; margin: 2px 0; }
        .cv-exp-meta { font-size: 0.7rem; color: #888; margin-bottom: 6px; }
        .cv-exp-bullets { padding-left: 16px; margin: 0; }
        .cv-exp-bullets li { font-size: 0.75rem; color: #555; line-height: 1.55; margin-bottom: 3px; }
        .cv-proj-desc { font-size: 0.75rem; color: #555; margin: 6px 0 0; line-height: 1.55; }
        .cv-languages { display: flex; flex-direction: column; gap: 10px; }
        .cv-lang-item { display: flex; justify-content: space-between; align-items: center; }
        .cv-lang-name { font-size: 0.78rem; font-weight: 700; }
        .cv-lang-level { font-size: 0.68rem; color: #888; }
        .cv-lang-bars { display: flex; gap: 3px; }
        .cv-lang-bar { width: 18px; height: 14px; border-radius: 2px; background: #e0e0e0; }
        .cv-lang-bar.filled { background: #2980b9; }
        .cv-achievement { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; }
        .cv-achievement-title { font-size: 0.76rem; font-weight: 700; margin-bottom: 2px; }
        .cv-achievement-desc { font-size: 0.72rem; color: #555; line-height: 1.5; }
        .cv-skills-text { font-size: 0.74rem; color: #444; line-height: 1.7; margin: 0; }
        .cv-edu-degree { font-size: 0.8rem; font-weight: 700; }
        .cv-edu-institution { font-size: 0.75rem; font-weight: 600; color: #2980b9; }
        .cv-edu-meta { font-size: 0.68rem; color: #888; margin-top: 2px; }
        .cv-training-title { font-size: 0.76rem; font-weight: 700; color: #2980b9; }
        .cv-training-desc { font-size: 0.71rem; color: #555; line-height: 1.5; margin-top: 2px; }
        .cv-interest-title { font-size: 0.76rem; font-weight: 700; }
        .cv-interest-desc { font-size: 0.71rem; color: #555; line-height: 1.5; margin-top: 2px; }
        .cv-footer { text-align: right; padding: 8px 28px; font-size: 0.65rem; color: #bbb; border-top: 1px solid #eee; }
    `;
}

function downloadResume() {
    const content = document.getElementById('resume-preview').innerHTML;
    const blob = new Blob([`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Resume</title><style>${getResumeCSS()}</style></head><body>${content}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'resume.html'; a.click();
    URL.revokeObjectURL(url);
    showToast('Resume downloaded!', 'success');
}

// ==================== Q&A GENERATOR ====================
const QA_DATABASE = {
    technical: {
        'Software Engineer': [
            { q: "Explain the difference between a stack and a queue. When would you use each?", a: "A stack follows LIFO (Last In, First Out) — the last element added is the first removed. A queue follows FIFO (First In, First Out). Use stacks for undo operations, expression parsing, and DFS. Use queues for task scheduling, BFS, and buffering.", criteria: "Understanding of data structure fundamentals, practical application examples" },
            { q: "What is the time complexity of common sorting algorithms, and when would you choose one over another?", a: "Quick Sort: O(n log n) average, O(n²) worst — great general-purpose. Merge Sort: O(n log n) guaranteed — ideal for linked lists and stable sorting. Heap Sort: O(n log n) — good for memory-constrained situations. For small arrays (<10 elements), Insertion Sort can outperform due to low overhead.", criteria: "Algorithmic knowledge, ability to compare trade-offs" },
            { q: "Explain REST API design principles and best practices.", a: "REST APIs should be stateless, use proper HTTP methods (GET, POST, PUT, DELETE), return appropriate status codes, version endpoints, use consistent naming conventions, implement pagination for large datasets, and include proper error handling with meaningful messages.", criteria: "API design understanding, awareness of standards and best practices" },
            { q: "What are SOLID principles in object-oriented design?", a: "S: Single Responsibility — one class, one reason to change. O: Open/Closed — open for extension, closed for modification. L: Liskov Substitution — subtypes must be substitutable. I: Interface Segregation — prefer small, specific interfaces. D: Dependency Inversion — depend on abstractions, not concretions.", criteria: "OOP design understanding, ability to apply in real scenarios" },
            { q: "Describe how a hash table works internally. How do you handle collisions?", a: "A hash table uses a hash function to map keys to array indices. Collisions are handled via chaining (linked lists at each index) or open addressing (probing for next available slot). Load factor affects performance — typically rehash when it exceeds 0.75.", criteria: "Deep understanding of hash tables, collision resolution strategies" }
        ],
        'Frontend Developer': [
            { q: "Explain the Virtual DOM and how React uses it for efficient rendering.", a: "The Virtual DOM is a lightweight JS representation of the actual DOM. React creates a virtual copy, applies changes there first, then diffs (reconciliation) to find minimal DOM updates needed. This batch processing is more efficient than direct DOM manipulation.", criteria: "Understanding of React internals, performance optimization knowledge" },
            { q: "What is the difference between CSS Grid and Flexbox? When would you use each?", a: "Flexbox is one-dimensional (row OR column) — ideal for components, navigation bars, centering. Grid is two-dimensional (rows AND columns) — ideal for page layouts, complex grid systems. They complement each other and can be nested.", criteria: "CSS layout mastery, practical application judgment" },
            { q: "Explain event delegation in JavaScript and why it's useful.", a: "Event delegation uses event bubbling to handle events at a parent level rather than attaching listeners to each child. Benefits: fewer event listeners (better memory), automatically handles dynamically added elements, cleaner code.", criteria: "DOM event model understanding, performance awareness" },
            { q: "What are Web Vitals and how do you optimize for them?", a: "Core Web Vitals: LCP (Largest Contentful Paint <2.5s), FID (First Input Delay <100ms), CLS (Cumulative Layout Shift <0.1). Optimize via: lazy loading, code splitting, image optimization, font preloading, proper element sizing, and efficient JavaScript execution.", criteria: "Performance metrics knowledge, optimization strategies" },
            { q: "Explain closures in JavaScript with a practical example.", a: "A closure is a function that retains access to variables from its outer scope even after the outer function has returned. Example: function createCounter() { let count = 0; return () => ++count; }. The inner function 'closes over' the count variable.", criteria: "Fundamental JS concept understanding, practical demonstration" }
        ],
        'Data Scientist': [
            { q: "Explain the bias-variance tradeoff in machine learning.", a: "Bias is error from overly simple models (underfitting). Variance is error from overly complex models (overfitting). The tradeoff: reducing bias increases variance and vice versa. The goal is finding the sweet spot that minimizes total error. Techniques: cross-validation, regularization, ensemble methods.", criteria: "Core ML theory understanding, practical mitigation strategies" },
            { q: "When would you use Random Forest vs Gradient Boosting?", a: "Random Forest: parallel trees, robust to outliers, less prone to overfitting, faster training. Gradient Boosting: sequential trees, often higher accuracy, requires careful tuning, handles complex patterns better. Use RF for quick baselines; GB (XGBoost/LightGBM) when accuracy is paramount.", criteria: "Algorithm comparison skills, practical decision-making" },
            { q: "How do you handle missing data in a dataset?", a: "Strategies: 1) Remove rows/columns (if <5% missing). 2) Mean/median/mode imputation. 3) KNN imputation. 4) MICE (Multiple Imputation). 5) Domain-specific logic. 6) Create a 'missing' indicator feature. Choice depends on data mechanism (MCAR, MAR, MNAR) and downstream model.", criteria: "Data preprocessing knowledge, statistical understanding" },
            { q: "Explain precision, recall, and F1-score. When is each most important?", a: "Precision = TP/(TP+FP) — when false positives are costly (spam detection). Recall = TP/(TP+FN) — when false negatives are costly (cancer detection). F1 = harmonic mean of both — balanced metric. Use PR-AUC for imbalanced datasets.", criteria: "Metrics understanding, domain-appropriate metric selection" },
            { q: "What is feature engineering and why is it important?", a: "Feature engineering is creating new input features from existing data to improve model performance. Techniques: polynomial features, binning, encoding categoricals, text vectorization, date decomposition, domain-specific aggregations. Often more impactful than algorithm selection.", criteria: "Practical data science skills, creativity in feature creation" }
        ]
    },
    behavioral: [
        { q: "Tell me about a time you faced a challenging technical problem. How did you solve it?", a: "Use the STAR method: Describe the Situation and Task clearly. Detail the specific Actions you took — breaking down the problem, researching solutions, collaborating with team members. Share the Result with measurable outcomes. Emphasize your problem-solving methodology.", criteria: "STAR method, problem-solving approach, persistence" },
        { q: "Describe a situation where you had to work with a difficult team member.", a: "Focus on empathy, communication, and professionalism. Describe how you sought to understand their perspective, found common ground, established clear communication channels, and worked toward shared goals. Emphasize the positive outcome and what you learned about collaboration.", criteria: "Emotional intelligence, conflict resolution, teamwork" },
        { q: "How do you handle tight deadlines and competing priorities?", a: "Discuss prioritization frameworks (Eisenhower matrix), time management techniques, proactive communication with stakeholders about tradeoffs, and examples of successfully delivering under pressure. Show that you can maintain quality while managing time constraints.", criteria: "Time management, prioritization skills, stress handling" },
        { q: "Tell me about a time you made a mistake at work. How did you handle it?", a: "Show accountability — don't deflect. Describe the mistake, how you identified it, immediate steps to mitigate impact, what you communicated to the team, and concrete measures you implemented to prevent recurrence. Focus on growth and learning.", criteria: "Accountability, learning mindset, transparency" },
        { q: "Where do you see yourself in 5 years?", a: "Align your goals with the company's growth trajectory. Show ambition while being realistic. Discuss skill development, leadership aspirations, and desire to make meaningful contributions. Avoid overly specific titles; focus on impact and growth areas.", criteria: "Self-awareness, career planning, alignment with company vision" },
        { q: "Why are you interested in this role/company?", a: "Research the company thoroughly. Connect your skills and passions to the company's mission, products, and culture. Be specific about what excites you. Mention recent company achievements or initiatives that resonate with your values.", criteria: "Research depth, genuine enthusiasm, cultural fit" }
    ],
    situational: [
        { q: "If you discovered a critical bug in production on a Friday evening, what would you do?", a: "Immediately assess severity and impact scope. Communicate to relevant stakeholders (manager, on-call team). If possible, implement a quick fix or rollback. Document the incident. Schedule a post-mortem for root cause analysis. Prioritize user safety and data integrity.", criteria: "Crisis management, communication, technical judgment" },
        { q: "How would you approach learning a completely new technology stack for a project?", a: "Start with official documentation and tutorials. Build a small prototype to get hands-on experience. Join community forums and study best practices. Identify parallels with known technologies. Set learning milestones and seek mentorship. Balance learning with delivery timelines.", criteria: "Learning agility, resourcefulness, structured approach" },
        { q: "If your team disagrees on the technical approach for a feature, how would you resolve it?", a: "Facilitate a structured discussion where each approach is evaluated against objective criteria (performance, maintainability, timeline). Create proof-of-concepts if needed. Consider team expertise and project constraints. Seek consensus but be willing to make a decision and commit.", criteria: "Leadership, objectivity, decision-making" }
    ]
};

function getQuestionsForRole(role, type, count, level) {
    let questions = [];
    const roleKey = Object.keys(QA_DATABASE.technical).find(k => k.toLowerCase().includes(role.toLowerCase())) || Object.keys(QA_DATABASE.technical)[0];
    const techQs = (QA_DATABASE.technical[roleKey] || QA_DATABASE.technical['Software Engineer']).map(q => ({ ...q, type: 'technical' }));
    const behQs = QA_DATABASE.behavioral.map(q => ({ ...q, type: 'behavioral' }));
    const sitQs = QA_DATABASE.situational.map(q => ({ ...q, type: 'situational' }));

    if (type === 'technical') questions = techQs;
    else if (type === 'behavioral') questions = behQs;
    else if (type === 'situational') questions = sitQs;
    else questions = [...techQs, ...behQs, ...sitQs];

    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [questions[i], questions[j]] = [questions[j], questions[i]]; }
    return questions.slice(0, parseInt(count));
}

function generateQuestions() {
    const role = document.getElementById('qa-role').value;
    if (!role) { showToast('Please enter a target role', 'error'); return; }
    const level = document.getElementById('qa-level').value;
    const type = document.getElementById('qa-type').value;
    const count = document.getElementById('qa-count').value;

    const btn = document.getElementById('generate-qa-btn');
    btn.classList.add('loading');

    setTimeout(() => {
        const questions = getQuestionsForRole(role, type, count, level);
        renderQuestions(questions);
        btn.classList.remove('loading');
        incrementStat('questions', questions.length);
        showToast(`Generated ${questions.length} questions for ${role}!`, 'success');
    }, 1200);
}

function renderQuestions(questions) {
    const container = document.getElementById('qa-container');
    container.innerHTML = questions.map((q, i) => `
        <div class="qa-card" id="qa-card-${i}">
            <div class="qa-card-header" onclick="toggleQA(${i})">
                <div class="qa-number">${i + 1}</div>
                <div class="qa-question">${q.q}</div>
                <span class="qa-type-badge ${q.type}">${q.type}</span>
                <div class="qa-toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
            <div class="qa-body">
                <div class="qa-section-label">Model Answer</div>
                <div class="qa-answer">${q.a}</div>
                <div class="qa-section-label">Evaluation Criteria</div>
                <div class="qa-criteria">${q.criteria}</div>
                <div class="qa-section-label">Practice Your Answer</div>
                <div class="qa-practice-area">
                    <textarea id="qa-practice-${i}" placeholder="Type your answer here to get AI feedback..."></textarea>
                    <div class="qa-practice-actions">
                        <button class="btn btn-sm btn-primary" onclick="evaluateAnswer(${i}, '${q.type}')">Get Feedback</button>
                    </div>
                    <div id="qa-feedback-${i}"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleQA(idx) {
    document.getElementById('qa-card-' + idx).classList.toggle('open');
}

function evaluateAnswer(idx, type) {
    const answer = document.getElementById('qa-practice-' + idx).value;
    if (!answer || answer.length < 20) { showToast('Please write a more detailed answer', 'error'); return; }

    const feedbackEl = document.getElementById('qa-feedback-' + idx);
    feedbackEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

    setTimeout(() => {
        const wordCount = answer.split(/\s+/).length;
        let feedback = '';
        const score = Math.min(95, Math.max(40, 50 + wordCount + Math.floor(Math.random() * 20)));

        if (score >= 80) feedback = `<strong>Score: ${score}/100 — Excellent!</strong><br>Your answer demonstrates strong understanding. `;
        else if (score >= 60) feedback = `<strong>Score: ${score}/100 — Good</strong><br>Solid foundation. `;
        else feedback = `<strong>Score: ${score}/100 — Needs Improvement</strong><br>`;

        if (wordCount < 30) feedback += 'Consider expanding your answer with more specific examples and details. ';
        if (type === 'behavioral' && !answer.toLowerCase().includes('result')) feedback += 'Try using the STAR method — include specific Results. ';
        if (type === 'technical' && wordCount < 50) feedback += 'Add more technical depth — mention specific technologies, algorithms, or architectural patterns. ';
        feedback += 'Compare your response with the model answer above to identify gaps.';

        feedbackEl.innerHTML = `<div class="qa-feedback">${feedback}</div>`;
    }, 1500);
}

// ==================== STUDY HUB ====================
const STUDY_DATA = {
    'frontend': {
        title: 'Frontend Developer',
        modules: [
            { title: 'HTML & CSS Fundamentals', topics: [
                { name: 'Semantic HTML5', desc: 'Use semantic elements (article, section, nav, header, footer) for better accessibility and SEO.', points: ['Block vs inline elements and the box model', 'Forms, inputs, and validation', 'Accessibility (ARIA roles, alt text, keyboard nav)'] },
                { name: 'CSS Layout Systems', desc: 'Master modern layout techniques for responsive, maintainable designs.', points: ['Flexbox: alignment, ordering, wrapping', 'CSS Grid: template areas, auto-fit, minmax', 'Responsive design with media queries', 'CSS custom properties (variables)'] },
                { name: 'CSS Animations & Transitions', desc: 'Create smooth, performant animations.', points: ['Transitions vs keyframe animations', 'Transform and opacity for GPU acceleration', 'Reduced motion preferences'] }
            ]},
            { title: 'JavaScript Core', topics: [
                { name: 'ES6+ Features', desc: 'Modern JavaScript syntax and capabilities.', points: ['Arrow functions, destructuring, spread/rest', 'Promises, async/await, error handling', 'Modules (import/export)', 'Optional chaining, nullish coalescing'] },
                { name: 'DOM Manipulation', desc: 'Interact with and modify the document.', points: ['Event handling and delegation', 'DOM traversal and manipulation', 'IntersectionObserver, MutationObserver', 'Web APIs (Fetch, Storage, History)'] },
                { name: 'Closures & Scope', desc: 'Understand execution context.', points: ['Lexical scope and scope chain', 'Closures and practical applications', 'this keyword and binding', 'Event loop and microtasks'] }
            ]},
            { title: 'React Ecosystem', topics: [
                { name: 'React Fundamentals', desc: 'Core React concepts.', points: ['JSX, components, props, state', 'Hooks: useState, useEffect, useRef, useMemo', 'Context API and state management', 'React Router and navigation'] },
                { name: 'State Management', desc: 'Managing complex application state.', points: ['Redux Toolkit and RTK Query', 'Zustand, Jotai, Recoil alternatives', 'Server state: React Query / SWR', 'When to use which approach'] },
                { name: 'Performance Optimization', desc: 'Build fast React applications.', points: ['React.memo, useMemo, useCallback', 'Code splitting and lazy loading', 'Virtual scrolling for large lists', 'Profiling and DevTools usage'] }
            ]},
            { title: 'Build Tools & Testing', topics: [
                { name: 'Module Bundlers', desc: 'Understand build tooling.', points: ['Vite, Webpack, esbuild', 'Tree shaking and code splitting', 'Environment variables and configs'] },
                { name: 'Testing', desc: 'Write reliable tests.', points: ['Jest / Vitest for unit testing', 'React Testing Library', 'E2E with Playwright/Cypress', 'Testing patterns and best practices'] }
            ]}
        ]
    },
    'backend': {
        title: 'Backend Developer',
        modules: [
            { title: 'Server & APIs', topics: [
                { name: 'RESTful API Design', desc: 'Design robust, scalable APIs.', points: ['HTTP methods, status codes, headers', 'Resource naming conventions', 'Pagination, filtering, sorting', 'API versioning strategies'] },
                { name: 'Authentication & Authorization', desc: 'Secure your APIs.', points: ['JWT tokens and refresh flow', 'OAuth 2.0 and OpenID Connect', 'Role-based access control (RBAC)', 'API keys and rate limiting'] }
            ]},
            { title: 'Databases', topics: [
                { name: 'SQL Databases', desc: 'Relational database concepts.', points: ['JOINS, subqueries, CTEs', 'Indexing strategies and query optimization', 'Transactions and ACID properties', 'Database normalization (1NF-3NF)'] },
                { name: 'NoSQL & Caching', desc: 'Non-relational data stores.', points: ['MongoDB document modeling', 'Redis caching strategies', 'When SQL vs NoSQL', 'CAP theorem and consistency models'] }
            ]},
            { title: 'System Design', topics: [
                { name: 'Scalability', desc: 'Design for scale.', points: ['Horizontal vs vertical scaling', 'Load balancing strategies', 'Microservices vs monolith', 'Message queues (Kafka, RabbitMQ)'] },
                { name: 'Design Patterns', desc: 'Common backend patterns.', points: ['Repository, Factory, Observer', 'CQRS and Event Sourcing', 'Circuit Breaker, Retry', 'Dependency Injection'] }
            ]}
        ]
    },
    'data-science': {
        title: 'Data Scientist',
        modules: [
            { title: 'Statistics & Probability', topics: [
                { name: 'Descriptive Statistics', desc: 'Summarize and understand data.', points: ['Central tendency and dispersion', 'Distributions (Normal, Poisson, Binomial)', 'Correlation vs causation', 'Hypothesis testing (t-test, chi-square, ANOVA)'] },
                { name: 'Probability Theory', desc: 'Foundation for ML.', points: ['Bayes theorem and applications', 'Conditional probability', 'Random variables and expectations', 'Central Limit Theorem'] }
            ]},
            { title: 'Machine Learning', topics: [
                { name: 'Supervised Learning', desc: 'Learn from labeled data.', points: ['Linear/Logistic Regression', 'Decision Trees, Random Forest, XGBoost', 'SVM, KNN, Naive Bayes', 'Evaluation metrics and cross-validation'] },
                { name: 'Unsupervised Learning', desc: 'Discover hidden patterns.', points: ['K-Means, DBSCAN clustering', 'PCA and dimensionality reduction', 'Association rules', 'Anomaly detection'] },
                { name: 'Deep Learning', desc: 'Neural network architectures.', points: ['Neural network fundamentals', 'CNNs for computer vision', 'RNNs/LSTMs for sequences', 'Transformers and attention mechanism'] }
            ]},
            { title: 'Data Engineering', topics: [
                { name: 'Data Wrangling', desc: 'Clean and prepare data.', points: ['Pandas and NumPy mastery', 'Handling missing data strategies', 'Feature engineering techniques', 'Data pipeline creation'] }
            ]}
        ]
    },
    'fullstack': {
        title: 'Full Stack Developer',
        modules: [
            { title: 'Frontend Mastery', topics: [
                { name: 'React & TypeScript', desc: 'Build robust UIs with React and TypeScript.', points: ['Component design patterns and reusability', 'TypeScript interfaces, generics, and utility types', 'State management with Zustand or Redux Toolkit', 'Next.js for SSR, SSG, and ISR'] },
                { name: 'Modern CSS', desc: 'Create adaptive, beautiful interfaces.', points: ['Flexbox and CSS Grid mastery', 'Responsive design and mobile-first approach', 'Tailwind CSS vs vanilla CSS trade-offs', 'CSS animations and micro-interactions'] }
            ]},
            { title: 'Backend Development', topics: [
                { name: 'Node.js & APIs', desc: 'Server-side JavaScript development.', points: ['Express.js routing and middleware patterns', 'RESTful and GraphQL API design', 'Authentication: JWT, OAuth2, sessions', 'Input validation, error handling, logging'] },
                { name: 'Databases', desc: 'Connect and query databases effectively.', points: ['SQL with PostgreSQL: joins, indexes, transactions', 'NoSQL with MongoDB and Mongoose ODM', 'ORM tools: Prisma, Sequelize, TypeORM', 'Caching strategies with Redis'] }
            ]},
            { title: 'DevOps & Deployment', topics: [
                { name: 'Full Stack Shipping', desc: 'Deploy and maintain full stack applications.', points: ['Docker for dev/prod environment parity', 'CI/CD pipelines with GitHub Actions', 'Deployment to Vercel, Railway, or AWS', 'Environment variables and secrets management'] }
            ]}
        ]
    },
    'devops': {
        title: 'DevOps Engineer',
        modules: [
            { title: 'Containerization & Orchestration', topics: [
                { name: 'Docker', desc: 'Package and run apps in containers.', points: ['Dockerfile authoring and multi-stage builds', 'Docker Compose for multi-service local dev', 'Image optimization and layer caching', 'Container networking and volume management'] },
                { name: 'Kubernetes', desc: 'Orchestrate containers at scale.', points: ['Pods, Deployments, Services, and Ingress', 'ConfigMaps, Secrets, and Namespaces', 'Horizontal Pod Autoscaling (HPA)', 'Helm charts for package management'] }
            ]},
            { title: 'CI/CD Pipelines', topics: [
                { name: 'Automation', desc: 'Automate build, test, and deploy cycles.', points: ['GitHub Actions workflows and runners', 'Jenkins / GitLab CI pipeline design', 'Blue-green and canary deployment strategies', 'Rollback mechanisms and release gates'] }
            ]},
            { title: 'Infrastructure as Code', topics: [
                { name: 'Terraform & Ansible', desc: 'Define infrastructure programmatically.', points: ['Terraform providers, modules, and remote state', 'State locking with S3 and DynamoDB backend', 'Ansible playbooks and inventory management', 'Idempotent configuration principles'] }
            ]},
            { title: 'Monitoring & Observability', topics: [
                { name: 'Observability Stack', desc: 'Track system health proactively.', points: ['Prometheus metrics collection and exporters', 'Grafana dashboards and alerting rules', 'ELK/EFK stack for centralized log aggregation', 'Distributed tracing with Jaeger or Zipkin'] }
            ]}
        ]
    },
    'mobile': {
        title: 'Mobile Developer',
        modules: [
            { title: 'React Native', topics: [
                { name: 'Core Development', desc: 'Cross-platform mobile with React Native.', points: ['Core components and native APIs', 'React Navigation v6: stack, tab, drawer navigators', 'State management: Context, Redux, Zustand', 'Expo managed vs bare workflow trade-offs'] },
                { name: 'Device Features & Performance', desc: 'Access native capabilities and optimize.', points: ['Camera, GPS, push notifications, biometrics', 'AsyncStorage, SQLite, MMKV for local persistence', 'Performance: FlatList, memo, Hermes JS engine', 'Deep linking and universal links'] }
            ]},
            { title: 'Flutter', topics: [
                { name: 'Dart & Flutter Widgets', desc: 'Build beautiful native UIs with Flutter.', points: ['Dart null safety and async/await patterns', 'Widget tree: stateful vs stateless widgets', 'Material 3 and Cupertino (iOS) design systems', 'State management: Provider, Riverpod, BLoC'] }
            ]},
            { title: 'Publishing', topics: [
                { name: 'App Store Deployment', desc: 'Ship apps to production stores.', points: ['Apple App Store submission and review process', 'Google Play Console and release tracks', 'Code signing, certificates, and provisioning profiles', 'OTA updates with EAS Update or CodePush'] }
            ]}
        ]
    },
    'ml-engineer': {
        title: 'ML Engineer',
        modules: [
            { title: 'ML Algorithms', topics: [
                { name: 'Supervised Learning', desc: 'Learn from labeled data.', points: ['Linear and logistic regression fundamentals', 'Tree-based: Random Forest, XGBoost, LightGBM', 'SVM, KNN, and Naive Bayes classifiers', 'Evaluation: cross-validation, ROC-AUC, PR-AUC'] },
                { name: 'Deep Learning', desc: 'Neural network architectures.', points: ['CNNs for image tasks', 'RNNs and LSTMs for sequential data', 'Transformer and self-attention mechanism', 'Transfer learning and fine-tuning pretrained models'] }
            ]},
            { title: 'MLOps', topics: [
                { name: 'Production ML', desc: 'Productionize and monitor models.', points: ['ML pipelines: Kubeflow, Airflow, ZenML', 'Model versioning with MLflow and DVC', 'Feature stores: Feast, Tecton, Hopsworks', 'Model monitoring and data/concept drift detection'] }
            ]},
            { title: 'Generative AI', topics: [
                { name: 'LLMs & AI Agents', desc: 'Build with large language models.', points: ['Prompt engineering: zero-shot, few-shot, chain-of-thought', 'RAG: vector databases and semantic search', 'Fine-tuning with LoRA/QLoRA (PEFT methods)', 'LangChain, LlamaIndex, and agent frameworks'] }
            ]}
        ]
    },
    'product-manager': {
        title: 'Product Manager',
        modules: [
            { title: 'Product Strategy', topics: [
                { name: 'Vision & Roadmapping', desc: 'Define where the product goes.', points: ['Writing a compelling product vision statement', 'OKRs and KPIs: setting measurable goals', 'Prioritization frameworks: RICE, ICE, MoSCoW', 'Competitive analysis and market positioning'] },
                { name: 'User Research', desc: 'Understand your users deeply.', points: ['User interviews and contextual inquiry', 'Jobs-to-be-done (JTBD) framework', 'Persona creation and empathy mapping', 'Usability testing and think-aloud studies'] }
            ]},
            { title: 'Execution', topics: [
                { name: 'Agile Delivery', desc: 'Ship value iteratively.', points: ['Sprint planning and backlog refinement', 'User story writing: As a... I want... So that...', 'Acceptance criteria and definition of done', 'Managing scope creep and trade-offs'] },
                { name: 'Analytics & Metrics', desc: 'Measure what matters.', points: ['Pirate metrics: AARRR funnel framework', 'Cohort analysis and retention curves', 'A/B testing design and statistical significance', 'DAU/MAU, NPS, LTV, and churn metrics'] }
            ]},
            { title: 'Stakeholder Management', topics: [
                { name: 'Communication & Influence', desc: 'Align teams without authority.', points: ['Executive presentations and storytelling', 'Writing clear PRDs and product specs', 'Managing engineering/design partnerships', 'Negotiating trade-offs and building consensus'] }
            ]}
        ]
    },
    'ux-designer': {
        title: 'UX Designer',
        modules: [
            { title: 'Research & Strategy', topics: [
                { name: 'Design Thinking', desc: 'Human-centered design process.', points: ['5 stages: Empathize → Define → Ideate → Prototype → Test', 'Needfinding through observation and interviews', 'Affinity mapping and insight synthesis', 'How Might We (HMW) ideation technique'] },
                { name: 'UX Research Methods', desc: 'Gather actionable user insights.', points: ['Qualitative vs quantitative research approaches', 'Card sorting and tree testing for IA', 'Moderated and remote usability testing', 'Heuristic evaluation (Nielsen 10 heuristics)'] }
            ]},
            { title: 'UX/UI Craft', topics: [
                { name: 'Figma Mastery', desc: 'Industry-standard design tool.', points: ['Components, variants, and auto-layout', 'Interactive prototyping and micro-animations', 'Design tokens, styles, and variables', 'Dev handoff: inspect mode and redlines'] },
                { name: 'Information Architecture', desc: 'Structure and organize content.', points: ['Navigation patterns: tabs, drawer, hub-and-spoke', 'Wireframing: lo-fi to hi-fi progression', 'Gestalt principles in visual design', 'Accessibility: WCAG 2.1 AA compliance'] }
            ]},
            { title: 'Portfolio & Growth', topics: [
                { name: 'Case Studies', desc: 'Present your design process compellingly.', points: ['Problem → Research → Design → Test → Measure', 'Quantifying design impact with before/after metrics', 'Presenting design decisions and trade-offs', 'Showcasing failures and lessons learned'] }
            ]}
        ]
    },
    'cybersecurity': {
        title: 'Cybersecurity Analyst',
        modules: [
            { title: 'Security Fundamentals', topics: [
                { name: 'Core Concepts', desc: 'CIA triad and foundational security.', points: ['Confidentiality, Integrity, Availability (CIA triad)', 'Authentication, authorization, and access control', 'Symmetric and asymmetric encryption', 'PKI, digital certificates, and TLS/SSL'] },
                { name: 'Network Security', desc: 'Protect network infrastructure.', points: ['Firewalls, WAFs, IDS/IPS configuration', 'Zero Trust architecture principles', 'TCP/IP, DNS, HTTP protocols and attack vectors', 'VPNs and network segmentation strategies'] }
            ]},
            { title: 'Ethical Hacking', topics: [
                { name: 'Penetration Testing', desc: 'Find vulnerabilities before attackers.', points: ['Recon: OSINT, Nmap, Shodan, theHarvester', 'Exploitation: Metasploit, Burp Suite, SQLmap', 'OWASP Top 10 web vulnerabilities', 'Pen test report writing and remediation advice'] }
            ]},
            { title: 'Incident Response', topics: [
                { name: 'SOC & Threat Detection', desc: 'Detect, respond, and recover.', points: ['SIEM tools: Splunk, Microsoft Sentinel', 'Log analysis and event correlation rules', 'IR playbooks aligned to NIST framework', 'Digital forensics and chain of custody'] }
            ]}
        ]
    },
    'cloud-architect': {
        title: 'Cloud Architect',
        modules: [
            { title: 'Cloud Platforms', topics: [
                { name: 'AWS / Azure / GCP Core Services', desc: 'Master the major cloud providers.', points: ['Compute: EC2, Lambda, Azure Functions, Cloud Run', 'Storage: S3, Blob Storage, Cloud Storage, EFS', 'Networking: VPC, subnets, load balancers, Route53', 'IAM: roles, policies, and least-privilege access'] }
            ]},
            { title: 'Architecture Patterns', topics: [
                { name: 'Well-Architected Framework', desc: 'Design for reliability and scale.', points: ['6 pillars: security, reliability, performance, cost, sustainability, operations', 'Serverless and event-driven architecture patterns', 'Microservices design and service mesh (Istio)', 'Multi-region active-active and disaster recovery'] }
            ]},
            { title: 'Cost & Performance', topics: [
                { name: 'FinOps & Optimization', desc: 'Maximize cloud ROI.', points: ['Reserved vs on-demand vs spot instance pricing', 'Auto-scaling and right-sizing workloads', 'Cost allocation with tags, budgets, and alerts', 'CDN strategies and edge caching for performance'] }
            ]},
            { title: 'Certifications', topics: [
                { name: 'Cloud Cert Roadmap', desc: 'Recognized cloud certifications.', points: ['AWS Solutions Architect Associate (SAA-C03)', 'Azure AZ-104: Microsoft Azure Administrator', 'GCP Associate Cloud Engineer (ACE)', 'Kubernetes CKA and CKAD certifications'] }
            ]}
        ]
    },
    'data-analyst': {
        title: 'Data Analyst',
        modules: [
            { title: 'Data Wrangling', topics: [
                { name: 'SQL Mastery', desc: 'Query and analyze relational data.', points: ['SELECT, WHERE, GROUP BY, HAVING, ORDER BY', 'INNER, LEFT, RIGHT, FULL, and CROSS JOINs', 'Window functions: RANK, ROW_NUMBER, LAG, LEAD', 'CTEs, subqueries, and recursive queries'] },
                { name: 'Python for Analysis', desc: 'Automate and scale your analysis.', points: ['Pandas: DataFrames, groupby, merge, pivot_table', 'NumPy for numerical and array operations', 'Data cleaning: nulls, outliers, type coercion', 'EDA workflow and pattern discovery techniques'] }
            ]},
            { title: 'Visualization', topics: [
                { name: 'BI Tools & Reporting', desc: 'Communicate insights visually.', points: ['Power BI: DAX formulas, data models, and slicers', 'Tableau: LOD calculations, sets, and filter actions', 'Matplotlib and Seaborn for Python charts', 'Data storytelling: choosing the right chart type'] }
            ]},
            { title: 'Statistics', topics: [
                { name: 'Applied Business Statistics', desc: 'Use stats to drive decisions.', points: ['Descriptive stats: mean, median, variance, IQR', 'Hypothesis testing: t-test, chi-square, ANOVA', 'Regression analysis and coefficient interpretation', 'Cohort analysis, funnel metrics, and A/B testing'] }
            ]}
        ]
    },
    'marketing': {
        title: 'Marketing Manager',
        modules: [
            { title: 'Digital Marketing', topics: [
                { name: 'SEO & Content Marketing', desc: 'Drive organic growth and authority.', points: ['On-page SEO: title tags, meta descriptions, schema', 'Technical SEO: Core Web Vitals, crawlability, sitemaps', 'Keyword research with Ahrefs and SEMrush', 'Content strategy, editorial calendar, and E-E-A-T'] },
                { name: 'Paid Advertising', desc: 'Performance marketing fundamentals.', points: ['Google Ads: search, display, shopping, YouTube', 'Meta Ads Manager: audiences, creatives, retargeting', 'Campaign KPIs: CTR, CPC, ROAS, and CAC', 'Attribution models: last-click vs data-driven'] }
            ]},
            { title: 'Analytics & CRO', topics: [
                { name: 'Marketing Analytics', desc: 'Measure and optimize performance.', points: ['Google Analytics 4: events, conversions, audiences', 'UTM parameters and campaign attribution', 'A/B testing landing pages and email subject lines', 'Looker Studio dashboards for reporting'] }
            ]},
            { title: 'Brand & Growth', topics: [
                { name: 'Brand Strategy', desc: 'Build lasting brand equity.', points: ['Brand positioning and unique value proposition (UVP)', 'Tone of voice and messaging framework', 'Influencer marketing and strategic partnerships', 'Community building and social media management'] }
            ]}
        ]
    },
    'business-analyst': {
        title: 'Business Analyst',
        modules: [
            { title: 'Requirements Engineering', topics: [
                { name: 'Elicitation Techniques', desc: 'Uncover true business needs.', points: ['Stakeholder interviews, workshops, and surveys', 'Use cases, user stories, and acceptance scenarios', 'BPMN process modeling and swimlane diagrams', 'Gap analysis and root cause analysis (5 Whys)'] }
            ]},
            { title: 'Analysis & Modeling', topics: [
                { name: 'Business Process Analysis', desc: 'Understand and improve processes.', points: ['As-is vs to-be process mapping and redesign', 'SWOT, PESTLE, and Porter Five Forces analysis', 'Cost-benefit analysis and ROI calculation', 'Risk register and mitigation strategy development'] },
                { name: 'Data Analysis', desc: 'Turn data into actionable decisions.', points: ['Excel: VLOOKUP, pivot tables, Power Query, macros', 'SQL queries for business reporting', 'KPI dashboards in Power BI or Tableau', 'Forecasting models and trend analysis'] }
            ]},
            { title: 'Agile BA', topics: [
                { name: 'BA in Agile Teams', desc: 'Contribute effectively in agile environments.', points: ['Writing epics, user stories, and acceptance criteria', 'Backlog refinement and sprint planning participation', 'Product owner collaboration and proxy PO role', 'Definition of done and sprint ceremony facilitation'] }
            ]}
        ]
    }
};

// Generate generic data for roles not in STUDY_DATA
function getGenericStudyData(domain) {
    return { title: domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), modules: [
        { title: 'Core Concepts', topics: [{ name: 'Fundamentals', desc: 'Master the foundational concepts.', points: ['Core principles and terminology', 'Industry standards and best practices', 'Common tools and frameworks', 'Practical applications'] }] },
        { title: 'Advanced Topics', topics: [{ name: 'Advanced Techniques', desc: 'Deep dive into specialized areas.', points: ['Latest industry trends', 'Performance optimization', 'Architecture patterns', 'Case studies and real-world scenarios'] }] },
        { title: 'Interview Preparation', topics: [{ name: 'Common Interview Topics', desc: 'Frequently asked areas.', points: ['System design questions', 'Problem-solving scenarios', 'Behavioral question preparation', 'Portfolio and project discussion'] }] }
    ]};
}

function generateStudyPlan() {
    const domain = document.getElementById('study-domain').value;
    if (!domain) { showToast('Please select a domain', 'error'); return; }
    const data = STUDY_DATA[domain] || getGenericStudyData(domain);
    renderStudyPlan(data);
    showToast(`Study plan generated for ${data.title}!`, 'success');
}

function renderStudyPlan(data) {
    const container = document.getElementById('study-content');
    container.innerHTML = data.modules.map((mod, mi) => `
        <div class="study-module ${mi === 0 ? 'open' : ''}" id="study-mod-${mi}">
            <div class="study-module-header" onclick="toggleStudyModule(${mi})">
                <div class="study-module-number">${mi + 1}</div>
                <div class="study-module-info">
                    <div class="study-module-title">${mod.title}</div>
                    <div class="study-module-meta">${mod.topics.length} topics</div>
                </div>
                <div class="study-module-toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>
            </div>
            <div class="study-module-body">
                ${mod.topics.map((topic, ti) => `
                    <div class="study-topic">
                        <h4>${topic.name}</h4>
                        <p>${topic.desc}</p>
                        <ul class="key-points">${topic.points.map(p => `<li>${p}</li>`).join('')}</ul>
                        <label class="study-check ${isTopicCompleted(mi, ti) ? 'completed' : ''}">
                            <input type="checkbox" ${isTopicCompleted(mi, ti) ? 'checked' : ''} onchange="toggleTopicCompletion(${mi}, ${ti}, this)">
                            Mark as completed
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function toggleStudyModule(idx) { document.getElementById('study-mod-' + idx).classList.toggle('open'); }

function isTopicCompleted(mi, ti) { return AppState.studyProgress[`${mi}-${ti}`] === true; }

function toggleTopicCompletion(mi, ti, el) {
    const key = `${mi}-${ti}`;
    AppState.studyProgress[key] = el.checked;
    localStorage.setItem('insignia_study_progress', JSON.stringify(AppState.studyProgress));
    el.parentElement.classList.toggle('completed', el.checked);
    if (el.checked) incrementStat('topics');
}

// ==================== MOCK INTERVIEW ====================
function startMockInterview() {
    const role = document.getElementById('mock-role').value;
    if (!role) { showToast('Please enter a target role', 'error'); return; }
    const type = document.getElementById('mock-type').value;
    const count = parseInt(document.getElementById('mock-questions-count').value);
    const questions = getQuestionsForRole(role, type === 'mixed' ? 'all' : type, count);

    AppState.mockSession = { role, questions, currentIndex: 0, answers: [], startTime: Date.now() };
    AppState.mockSeconds = 0;

    document.getElementById('mock-setup').style.display = 'none';
    document.getElementById('mock-session').style.display = 'block';
    document.getElementById('mock-results').style.display = 'none';

    startMockTimer();
    showMockQuestion();
}

function startMockTimer() {
    clearInterval(AppState.mockTimer);
    AppState.mockTimer = setInterval(() => {
        AppState.mockSeconds++;
        const mins = Math.floor(AppState.mockSeconds / 60).toString().padStart(2, '0');
        const secs = (AppState.mockSeconds % 60).toString().padStart(2, '0');
        document.getElementById('mock-timer').textContent = `${mins}:${secs}`;
    }, 1000);
}

function showMockQuestion() {
    const s = AppState.mockSession;
    const q = s.questions[s.currentIndex];
    const total = s.questions.length;

    document.getElementById('mock-question-counter').textContent = `Question ${s.currentIndex + 1} of ${total}`;
    document.getElementById('mock-progress-fill').style.width = `${((s.currentIndex) / total) * 100}%`;
    document.getElementById('mock-q-type').textContent = q.type;
    document.getElementById('mock-question-text').textContent = q.q;
    document.getElementById('mock-answer-input').value = '';
    document.getElementById('mock-answer-input').focus();
}

function submitMockAnswer() {
    const answer = document.getElementById('mock-answer-input').value;
    if (!answer.trim()) { showToast('Please type an answer before submitting', 'error'); return; }
    AppState.mockSession.answers.push({ answer, skipped: false });
    advanceMock();
}

function skipMockQuestion() {
    AppState.mockSession.answers.push({ answer: '(Skipped)', skipped: true });
    advanceMock();
}

function advanceMock() {
    const s = AppState.mockSession;
    s.currentIndex++;
    if (s.currentIndex >= s.questions.length) {
        finishMockInterview();
    } else {
        showMockQuestion();
    }
}

function finishMockInterview() {
    clearInterval(AppState.mockTimer);
    document.getElementById('mock-session').style.display = 'none';
    document.getElementById('mock-results').style.display = 'block';

    const s = AppState.mockSession;
    const results = s.questions.map((q, i) => {
        const ans = s.answers[i];
        if (ans.skipped) return { ...q, answer: ans.answer, score: 0, feedback: 'Question was skipped. Attempting all questions shows confidence and willingness to try.' };
        const wc = ans.answer.split(/\s+/).length;
        const score = Math.min(95, Math.max(30, 45 + wc + Math.floor(Math.random() * 25)));
        let feedback = '';
        if (score >= 80) feedback = 'Excellent response! Demonstrates strong knowledge and clear communication. ';
        else if (score >= 60) feedback = 'Good effort. ';
        else feedback = 'Needs more depth. ';
        if (wc < 25) feedback += 'Try to elaborate more with specific examples. ';
        if (q.type === 'behavioral' && !ans.answer.toLowerCase().match(/result|outcome|impact/)) feedback += 'Include specific outcomes and measurable results using the STAR method. ';
        if (q.type === 'technical' && wc < 40) feedback += 'Add more technical details, mention specific tools/algorithms/patterns. ';
        feedback += 'Review the model answer for this question to strengthen your response.';
        return { ...q, answer: ans.answer, score, feedback };
    });

    const totalScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const answered = results.filter(r => !r.answer.includes('Skipped')).length;
    const goodAnswers = results.filter(r => r.score >= 70).length;

    // Animate score ring
    const ring = document.getElementById('mock-score-ring');
    const circumference = 327;
    setTimeout(() => { ring.style.strokeDashoffset = circumference - (circumference * totalScore / 100); }, 100);
    document.getElementById('mock-final-score').textContent = totalScore;

    document.getElementById('mock-score-breakdown').innerHTML = `
        <div class="score-metric"><div class="score-metric-label">Questions Answered</div><div class="score-metric-value">${answered}/${results.length}</div></div>
        <div class="score-metric"><div class="score-metric-label">Strong Answers</div><div class="score-metric-value">${goodAnswers}</div></div>
        <div class="score-metric"><div class="score-metric-label">Time Taken</div><div class="score-metric-value">${document.getElementById('mock-timer').textContent}</div></div>
        <div class="score-metric"><div class="score-metric-label">Avg Score</div><div class="score-metric-value">${totalScore}/100</div></div>
    `;

    document.getElementById('mock-feedback-list').innerHTML = results.map((r, i) => {
        const badge = r.score >= 70 ? 'good' : r.score >= 50 ? 'average' : 'poor';
        const badgeLabel = r.score >= 70 ? '✓ Strong' : r.score >= 50 ? '~ Average' : '✗ Weak';
        return `<div class="mock-feedback-item">
            <div class="question-label">Question ${i + 1} — ${r.type}</div>
            <div class="score-badge ${badge}">${badgeLabel} (${r.score}/100)</div>
            <div class="question-text">${r.q}</div>
            <div class="answer-text">"${r.answer}"</div>
            <div class="feedback-text">${r.feedback}</div>
        </div>`;
    }).join('');

    incrementStat('mocks');
    showToast('Mock interview completed! Review your performance.', 'success');
}

function resetMockInterview() {
    AppState.mockSession = null;
    clearInterval(AppState.mockTimer);
    document.getElementById('mock-setup').style.display = 'flex';
    document.getElementById('mock-session').style.display = 'none';
    document.getElementById('mock-results').style.display = 'none';
    // Reset score ring
    document.getElementById('mock-score-ring').style.strokeDashoffset = 327;
}

// Profile button click
document.getElementById('user-profile-btn')?.addEventListener('click', showProfileModal);

// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://vllflvfnuohxhnqbazct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbGZsdmZudW9oeGhucWJhemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NzY5ODAsImV4cCI6MjEwMDQ1Mjk4MH0.BadUiVFwwZ8-3361AA9Da2KoXlxrz4xPzzIjSWSSPpw';
let supabase;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn('Supabase SDK createClient not available, fallback to offline mode.');
    }
} catch (e) {
    console.warn('Supabase SDK initialization error, Skill Connect will work in offline mode:', e);
}

// ==================== AUTH (Email OTP) ====================
let authEmail = '';

async function checkAuthState() {
    if (!supabase) {
        // No Supabase client — go directly to auth screen (guest mode available)
        showAuthScreen();
        return;
    }

    try {
        // Race against a 2-second timeout so network lag doesn't block startup
        const sessionPromise = supabase.auth.getSession();
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase timeout')), 2000)
        );
        const result = await Promise.race([sessionPromise, timeout]);
        const session = result?.data?.session;

        if (session && session.user) {
            authEmail = session.user.email;
            showApp();
            updateUserDisplay(session.user.email);
        } else {
            showAuthScreen();
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                authEmail = session.user.email;
                showApp();
                updateUserDisplay(session.user.email);
            } else if (event === 'SIGNED_OUT') {
                authEmail = '';
                showAuthScreen();
            }
        });
    } catch (err) {
        console.error('Auth check error:', err);
        // If Supabase is unreachable or times out, fall back to auth screen (guest option is there)
        showAuthScreen();
    }
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-wrapper').classList.add('authenticated');
    document.getElementById('app-wrapper').style.display = '';
}

function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-wrapper').classList.remove('authenticated');
    document.getElementById('app-wrapper').style.display = 'none';
}

// ==================== GUEST / OFFLINE MODE ====================
function continueAsGuest() {
    const nameInput = document.getElementById('guest-name-input');
    const guestName = nameInput?.value?.trim() || 'Guest';

    // Don't use Supabase auth — just set a local identity
    authEmail = `${guestName.toLowerCase().replace(/\s+/g, '.')}@guest.local`;

    // Update sidebar user display
    const nameEl = document.getElementById('display-user-name');
    const roleEl = document.getElementById('display-user-role');
    if (nameEl) nameEl.textContent = guestName;
    if (roleEl) roleEl.textContent = 'Guest Mode';

    // Pre-fill Skill Connect form
    const scNameEl = document.getElementById('sc-name');
    const scEmailEl = document.getElementById('sc-email');
    if (scNameEl && !scNameEl.value) scNameEl.value = guestName;
    if (scEmailEl && !scEmailEl.value) scEmailEl.value = authEmail;

    showApp();
    showToast(`Welcome, ${guestName}! Running in offline mode.`, 'success');
}

function updateUserDisplay(email) {
    const nameEl = document.getElementById('display-user-name');
    const roleEl = document.getElementById('display-user-role');
    if (nameEl) nameEl.textContent = email.split('@')[0];
    if (roleEl) roleEl.textContent = email;

    // Auto-fill Skill Connect email & name from authenticated user
    const scEmailInput = document.getElementById('sc-email');
    const scNameInput = document.getElementById('sc-name');
    if (scEmailInput && !scEmailInput.value) scEmailInput.value = email;
    if (scNameInput && !scNameInput.value) scNameInput.value = email.split('@')[0];
}

function switchAuthTab(tab) {
    const signinTab = document.getElementById('tab-signin');
    const signupTab = document.getElementById('tab-signup');
    const signinForm = document.getElementById('auth-form-signin');
    const signupForm = document.getElementById('auth-form-signup');

    if (tab === 'signin') {
        signinTab?.classList.add('active');
        signupTab?.classList.remove('active');
        if (signinForm) signinForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
    } else {
        signupTab?.classList.add('active');
        signinTab?.classList.remove('active');
        if (signupForm) signupForm.style.display = 'block';
        if (signinForm) signinForm.style.display = 'none';
    }
}

function togglePasswordVisibility(inputId, eyeIconId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

async function signInWithPassword() {
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const email = emailInput?.value?.trim();
    const password = passInput?.value;

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    if (!password) {
        showToast('Please enter your password', 'error');
        return;
    }

    const btn = document.getElementById('auth-signin-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="typing-indicator" style="justify-content:center"><span></span><span></span><span></span></div> Signing in...`;

    try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showToast('Sign in failed: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        authEmail = data.user.email;
        showToast(`Welcome back, ${authEmail.split('@')[0]}! 🎉`, 'success');
        showApp();
        updateUserDisplay(authEmail);

    } catch (err) {
        console.error('Sign in error:', err);
        showToast('Network error or server unavailable', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
}

async function signUpWithPassword() {
    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passInput = document.getElementById('signup-password');
    const confirmInput = document.getElementById('signup-confirm');

    const name = nameInput?.value?.trim();
    const email = emailInput?.value?.trim();
    const password = passInput?.value;
    const confirm = confirmInput?.value;

    if (!name) {
        showToast('Please enter your name', 'error');
        return;
    }
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const btn = document.getElementById('auth-signup-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="typing-indicator" style="justify-content:center"><span></span><span></span><span></span></div> Creating account...`;

    try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) {
            showToast('Sign up failed: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        if (data.session) {
            authEmail = data.user.email;
            showToast(`Account created! Welcome, ${name}! 🎉`, 'success');
            showApp();
            updateUserDisplay(authEmail);
        } else {
            showToast('Account created! Please check your email to confirm registration.', 'info');
            switchAuthTab('signin');
        }

    } catch (err) {
        console.error('Sign up error:', err);
        showToast('Network error or server unavailable', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
}

async function sendPasswordReset() {
    const emailInput = document.getElementById('auth-email');
    const email = emailInput?.value?.trim();

    if (!email || !email.includes('@')) {
        showToast('Please enter your email address in the field first', 'error');
        return;
    }

    try {
        if (!supabase) throw new Error('Supabase client not initialized');
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            showToast('Reset failed: ' + error.message, 'error');
        } else {
            showToast('Password reset link sent to ' + email, 'success');
        }
    } catch (err) {
        showToast('Could not send reset link', 'error');
    }
}

async function logoutUser() {
    if (!supabase) return;

    try {
        await supabase.auth.signOut();
        authEmail = '';
        localStorage.removeItem('sc_profile');
        showToast('Signed out successfully', 'info');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function setupOTPInputs() {
    const boxes = [1,2,3,4,5,6].map(i => document.getElementById(`otp-${i}`));
    if (!boxes[0]) return;

    boxes.forEach((box, idx) => {
        // Only allow digits
        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val;
            if (val) {
                e.target.classList.add('filled');
                // Auto-advance to next box
                if (idx < 5) boxes[idx + 1].focus();
            } else {
                e.target.classList.remove('filled');
            }

            // Auto-submit when all filled
            if (boxes.every(b => b.value.length === 1)) {
                setTimeout(() => verifyOTP(), 300);
            }
        });

        // Handle backspace
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && idx > 0) {
                boxes[idx - 1].focus();
                boxes[idx - 1].value = '';
                boxes[idx - 1].classList.remove('filled');
            }
        });

        // Handle paste (full OTP paste)
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
            if (pasted.length >= 6) {
                pasted.split('').forEach((digit, i) => {
                    if (boxes[i]) {
                        boxes[i].value = digit;
                        boxes[i].classList.add('filled');
                    }
                });
                boxes[5].focus();
                setTimeout(() => verifyOTP(), 300);
            }
        });

        // Allow Enter to submit
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyOTP();
        });
    });

    // Also allow Enter on email input
    const emailInput = document.getElementById('auth-email');
    if (emailInput) {
        emailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendOTP();
        });
    }
}


// ==================== SKILL CONNECT ====================
const SKILL_SUGGESTIONS = [
    'Python', 'JavaScript', 'Java', 'C++', 'TypeScript', 'React', 'Angular', 'Vue.js',
    'Node.js', 'Django', 'Flask', 'Spring Boot', 'Express.js', 'Next.js', 'HTML/CSS',
    'SQL', 'MongoDB', 'PostgreSQL', 'Firebase', 'Supabase',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch',
    'Data Analysis', 'Pandas', 'NumPy', 'Power BI', 'Tableau', 'Excel',
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'DevOps',
    'Git', 'Linux', 'REST APIs', 'GraphQL', 'Microservices',
    'Flutter', 'React Native', 'Swift', 'Kotlin', 'Android', 'iOS',
    'Figma', 'UI/UX Design', 'Adobe XD', 'Photoshop',
    'Blockchain', 'Solidity', 'Web3', 'Cybersecurity', 'Ethical Hacking',
    'DSA', 'System Design', 'DBMS', 'Networking', 'Operating Systems',
    'Communication', 'Leadership', 'Problem Solving', 'Agile', 'Scrum'
];

// State for Skill Connect
const SCState = {
    teachSkills: [],
    learnSkills: [],
    profile: JSON.parse(localStorage.getItem('sc_profile') || 'null'),
    matches: [],
    currentFilter: 'all',
    mailTarget: null,
    loading: false,
};

// Init Skill Connect when page loads
window.addEventListener('DOMContentLoaded', () => {
    initSkillConnect();
});

function initSkillConnect() {
    // Setup tag input handlers
    setupTagInput('sc-teach-input', 'sc-teach-tags', 'sc-teach-suggestions', 'teach');
    setupTagInput('sc-learn-input', 'sc-learn-tags', 'sc-learn-suggestions', 'learn');

    // Auto-fill from auth if available (Bug 1 & 6 fix)
    const scEmailInput = document.getElementById('sc-email');
    const scNameInput = document.getElementById('sc-name');
    if (scEmailInput && !scEmailInput.value && authEmail) {
        scEmailInput.value = authEmail;
    }
    if (scNameInput && !scNameInput.value && authEmail) {
        scNameInput.value = authEmail.split('@')[0];
    }

    // Load saved profile from localStorage first (fast)
    if (SCState.profile) {
        SCState.teachSkills = SCState.profile.teach || [];
        SCState.learnSkills = SCState.profile.learn || [];
        document.getElementById('sc-name').value = SCState.profile.name || '';
        // Prefer saved email but fall back to authEmail
        document.getElementById('sc-email').value = SCState.profile.email || authEmail || '';
        renderTags('sc-teach-tags', SCState.teachSkills, 'teach');
        renderTags('sc-learn-tags', SCState.learnSkills, 'learn');

        // Auto-sync profile to Supabase in background if client is ready
        if (supabase && SCState.profile.email && SCState.profile.name) {
            supabase.from('skill_profiles').upsert({
                name: SCState.profile.name,
                email: SCState.profile.email,
                teach_skills: SCState.teachSkills,
                learn_skills: SCState.learnSkills,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'email' }).catch(err => console.warn('Background profile sync warning:', err));
        }

        showMatchesView();
        return;
    }

    // Show suggestions for fresh setup
    showSuggestions('sc-teach-suggestions', 'teach');
    showSuggestions('sc-learn-suggestions', 'learn');
}

function setupTagInput(inputId, tagsContainerId, suggestionsId, type) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = input.value.trim().replace(/,$/, '');
            if (value) {
                addSkillTag(value, type);
                input.value = '';
                showSuggestions(suggestionsId, type);
            }
        }
        if (e.key === 'Backspace' && !input.value) {
            const arr = type === 'teach' ? SCState.teachSkills : SCState.learnSkills;
            if (arr.length) {
                arr.pop();
                renderTags(tagsContainerId, arr, type);
                showSuggestions(suggestionsId, type);
            }
        }
    });

    input.addEventListener('input', () => {
        showSuggestions(suggestionsId, type, input.value);
    });
}

function addSkillTag(skill, type) {
    const normalizedSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
    const arr = type === 'teach' ? SCState.teachSkills : SCState.learnSkills;
    if (arr.find(s => s.toLowerCase() === normalizedSkill.toLowerCase())) {
        showToast(`"${normalizedSkill}" is already added`, 'error');
        return;
    }
    arr.push(normalizedSkill);
    const containerId = type === 'teach' ? 'sc-teach-tags' : 'sc-learn-tags';
    renderTags(containerId, arr, type);
}

function removeSkillTag(skill, type) {
    const arr = type === 'teach' ? SCState.teachSkills : SCState.learnSkills;
    const idx = arr.findIndex(s => s.toLowerCase() === skill.toLowerCase());
    if (idx > -1) arr.splice(idx, 1);
    const containerId = type === 'teach' ? 'sc-teach-tags' : 'sc-learn-tags';
    const suggestionsId = type === 'teach' ? 'sc-teach-suggestions' : 'sc-learn-suggestions';
    renderTags(containerId, arr, type);
    showSuggestions(suggestionsId, type);
}

function renderTags(containerId, skills, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = skills.map(s =>
        `<span class="sc-tag ${type}">
            ${s}
            <span class="sc-tag-remove" onclick="removeSkillTag('${s.replace(/'/g, "\\'")}', '${type}')">&times;</span>
        </span>`
    ).join('');
}

function showSuggestions(containerId, type, filter = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const existing = type === 'teach' ? SCState.teachSkills : SCState.learnSkills;
    let available = SKILL_SUGGESTIONS.filter(s =>
        !existing.find(e => e.toLowerCase() === s.toLowerCase())
    );
    if (filter) {
        available = available.filter(s => s.toLowerCase().includes(filter.toLowerCase()));
    }
    const show = available.slice(0, 8);
    container.innerHTML = show.map(s =>
        `<span class="sc-suggestion-chip" onclick="addSuggestion('${s.replace(/'/g, "\\'")}', '${type}', '${containerId}')">${s}</span>`
    ).join('');
}

function addSuggestion(skill, type, suggestionsContainerId) {
    addSkillTag(skill, type);
    const inputId = type === 'teach' ? 'sc-teach-input' : 'sc-learn-input';
    document.getElementById(inputId).value = '';
    showSuggestions(suggestionsContainerId, type);
}

// ==================== SUPABASE SAVE & FETCH ====================
async function saveSkillProfile() {
    const name = document.getElementById('sc-name').value.trim();
    const email = document.getElementById('sc-email').value.trim();

    if (!name) { showToast('Please enter your name', 'error'); return; }
    if (!email) { showToast('Please enter your Gmail address', 'error'); return; }
    if (!email.includes('@')) { showToast('Please enter a valid email', 'error'); return; }
    if (SCState.teachSkills.length === 0 && SCState.learnSkills.length === 0) {
        showToast('Add at least one skill to teach or learn', 'error'); return;
    }

    const btn = document.getElementById('sc-save-btn');
    btn.classList.add('loading');

    if (!supabase) {
        // Offline fallback — save locally only
        SCState.profile = { name, email, teach: [...SCState.teachSkills], learn: [...SCState.learnSkills] };
        localStorage.setItem('sc_profile', JSON.stringify(SCState.profile));
        showToast('Profile saved locally (database unavailable)', 'info');
        btn.classList.remove('loading');
        setTimeout(() => { showMatchesView(); }, 400);
        return;
    }

    try {
        // Upsert profile to Supabase (insert or update based on email)
        const { data, error } = await supabase
            .from('skill_profiles')
            .upsert({
                name,
                email,
                teach_skills: [...SCState.teachSkills],
                learn_skills: [...SCState.learnSkills],
                updated_at: new Date().toISOString(),
            }, { onConflict: 'email' })
            .select();

        if (error) {
            console.error('Supabase error:', error);
            // Bug 9 fix: always remove loading on error path
            btn.classList.remove('loading');
            showToast('Error saving profile: ' + error.message, 'error');
            // Still save locally so UI continues working
            SCState.profile = { name, email, teach: [...SCState.teachSkills], learn: [...SCState.learnSkills] };
            localStorage.setItem('sc_profile', JSON.stringify(SCState.profile));
            setTimeout(() => { showMatchesView(); }, 400);
            return;
        }

        // Save locally too for fast loading
        SCState.profile = {
            name,
            email,
            teach: [...SCState.teachSkills],
            learn: [...SCState.learnSkills],
        };
        localStorage.setItem('sc_profile', JSON.stringify(SCState.profile));

        showToast('Profile saved! Finding your matches...', 'success');

        btn.classList.remove('loading');
        setTimeout(() => { showMatchesView(); }, 400);

    } catch (err) {
        console.error('Save error:', err);
        // Save locally so feature still works
        SCState.profile = { name, email, teach: [...SCState.teachSkills], learn: [...SCState.learnSkills] };
        localStorage.setItem('sc_profile', JSON.stringify(SCState.profile));
        showToast('Saved locally. Network issue — matches may be limited.', 'info');
        btn.classList.remove('loading');
        setTimeout(() => { showMatchesView(); }, 400);
    }
}

async function showMatchesView() {
    document.getElementById('sc-setup').style.display = 'none';
    document.getElementById('sc-matches-section').style.display = 'block';

    renderProfileBanner();
    await computeMatches();
    renderMatches();
}

function editSkillProfile() {
    // Bug 4 fix: use explicit display value so element is visible
    document.getElementById('sc-setup').style.display = 'block';
    document.getElementById('sc-matches-section').style.display = 'none';

    // Restore form fields from current state
    if (SCState.profile) {
        document.getElementById('sc-name').value = SCState.profile.name || '';
        document.getElementById('sc-email').value = SCState.profile.email || authEmail || '';
    }

    // Re-render tags and suggestions
    renderTags('sc-teach-tags', SCState.teachSkills, 'teach');
    renderTags('sc-learn-tags', SCState.learnSkills, 'learn');
    showSuggestions('sc-teach-suggestions', 'teach');
    showSuggestions('sc-learn-suggestions', 'learn');
}

function renderProfileBanner() {
    const p = SCState.profile;
    const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const allSkills = [...p.teach.map(s => ({ s, type: 'teach' })), ...p.learn.map(s => ({ s, type: 'learn' }))];

    document.getElementById('sc-profile-banner').innerHTML = `
        <div class="sc-banner-avatar">${initials}</div>
        <div class="sc-banner-info">
            <div class="sc-banner-name">${p.name}</div>
            <div class="sc-banner-email">${p.email}</div>
            <div class="sc-banner-skills">
                ${allSkills.map(({ s, type }) => `<span class="sc-tag ${type}">${s}</span>`).join('')}
            </div>
        </div>
        <div class="sc-banner-stats">
            <div>
                <div class="sc-banner-stat-val">${p.teach.length}</div>
                <div class="sc-banner-stat-label">Can Teach</div>
            </div>
            <div>
                <div class="sc-banner-stat-val">${p.learn.length}</div>
                <div class="sc-banner-stat-label">Want to Learn</div>
            </div>
            <div>
                <div class="sc-banner-stat-val" id="sc-match-count">${SCState.matches.length || '—'}</div>
                <div class="sc-banner-stat-label">Matches</div>
            </div>
        </div>
    `;
}

async function computeMatches() {
    const me = SCState.profile;
    SCState.matches = [];

    // Show loading state in grid
    const grid = document.getElementById('sc-matches-grid');
    grid.innerHTML = `<div class="sc-empty">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
        <h3>Finding matches from database...</h3>
    </div>`;

    if (!supabase) {
        // Bug 5 fix: Generate demo matches offline so the feature is usable
        SCState.matches = generateOfflineMatches(me);
        const countEl = document.getElementById('sc-match-count');
        if (countEl) countEl.textContent = SCState.matches.length;
        return;
    }

    try {
        // Fetch all profiles from Supabase
        const { data: allUsers, error } = await supabase
            .from('skill_profiles')
            .select('*');

        if (error) {
            console.error('Fetch error:', error);
            showToast('Error fetching matches: ' + error.message, 'error');
            return;
        }

        // Filter out current user case-insensitively
        const users = (allUsers || []).filter(u =>
            u.email && me.email && u.email.toLowerCase() !== me.email.toLowerCase()
        );

        if (users.length === 0) {
            // Fall back to demo matches if no other users registered in DB yet
            SCState.matches = generateOfflineMatches(me);
            const countEl = document.getElementById('sc-match-count');
            if (countEl) countEl.textContent = SCState.matches.length + ' (demo)';
            return;
        }

        // Compute matches against real DB users
        users.forEach(user => {
            const userTeach = user.teach_skills || [];
            const userLearn = user.learn_skills || [];

            // Skills they teach that I want to learn
            const canTeachMe = userTeach.filter(s =>
                me.learn.find(l => l.toLowerCase() === s.toLowerCase())
            );
            // Skills I teach that they want to learn
            const wantsFromMe = userLearn.filter(s =>
                me.teach.find(t => t.toLowerCase() === s.toLowerCase())
            );

            let score = 25; // Base community match score
            let reason = `${user.name.split(' ')[0]} is a registered member of the Skill Connect network.`;

            if (canTeachMe.length > 0 || wantsFromMe.length > 0) {
                const matchScore = (canTeachMe.length + wantsFromMe.length) * 100 /
                    Math.max(1, me.learn.length + me.teach.length);
                score = Math.min(99, Math.round(matchScore * 2.5 + 25));

                if (canTeachMe.length > 0 && wantsFromMe.length > 0) {
                    reason = `${user.name.split(' ')[0]} can teach you ${canTeachMe.join(', ')} and wants to learn ${wantsFromMe.join(', ')} from you — a perfect mutual exchange!`;
                } else if (canTeachMe.length > 0) {
                    reason = `${user.name.split(' ')[0]} is proficient in ${canTeachMe.join(', ')} which you want to learn.`;
                } else {
                    reason = `${user.name.split(' ')[0]} wants to learn ${wantsFromMe.join(', ')} — something you can teach!`;
                }
            }

            SCState.matches.push({
                name: user.name,
                email: user.email,
                teach: userTeach,
                learn: userLearn,
                canTeachMe,
                wantsFromMe,
                score,
                reason,
                matchType: canTeachMe.length > 0 && wantsFromMe.length > 0 ? 'mutual' :
                            canTeachMe.length > 0 ? 'canTeach' : 'wantsToLearn',
            });
        });

        // Sort by score descending
        SCState.matches.sort((a, b) => b.score - a.score);

        // Update banner count
        const countEl = document.getElementById('sc-match-count');
        if (countEl) countEl.textContent = SCState.matches.length;

    } catch (err) {
        console.error('Match computation error:', err);
        showToast('Using demo matches — database error: ' + err.message, 'info');
        // Bug 5 fix: fall back to offline demo matches on any error
        SCState.matches = generateOfflineMatches(me);
        const countEl = document.getElementById('sc-match-count');
        if (countEl) countEl.textContent = SCState.matches.length + ' (demo)';
    }
}

// ==================== OFFLINE DEMO MATCHES ====================
function generateOfflineMatches(me) {
    const demoUsers = [
        { name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', teach: ['Python', 'Machine Learning', 'TensorFlow', 'Pandas'], learn: ['React', 'Node.js', 'TypeScript'] },
        { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', teach: ['React', 'TypeScript', 'Next.js', 'Figma'], learn: ['Python', 'Data Analysis', 'SQL'] },
        { name: 'Rohan Gupta', email: 'rohan.gupta@gmail.com', teach: ['Java', 'Spring Boot', 'Microservices', 'Docker'], learn: ['React Native', 'Flutter', 'Kubernetes'] },
        { name: 'Sneha Patel', email: 'sneha.patel@gmail.com', teach: ['SQL', 'Power BI', 'Excel', 'Data Analysis'], learn: ['Python', 'Machine Learning', 'Tableau'] },
        { name: 'Vikram Rao', email: 'vikram.rao@gmail.com', teach: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], learn: ['React', 'GraphQL', 'Flutter'] },
        { name: 'Isha Jain', email: 'isha.jain@gmail.com', teach: ['UI/UX Design', 'Figma', 'Adobe XD'], learn: ['HTML/CSS', 'JavaScript', 'React'] },
        { name: 'Dev Kapoor', email: 'dev.kapoor@gmail.com', teach: ['Flutter', 'Kotlin', 'Android', 'Swift'], learn: ['AWS', 'Firebase', 'Node.js'] },
        { name: 'Anjali Singh', email: 'anjali.singh@gmail.com', teach: ['DSA', 'System Design', 'C++', 'Problem Solving'], learn: ['Machine Learning', 'TensorFlow', 'PyTorch'] },
    ];

    const myTeach = (me.teach || []).map(s => s.toLowerCase());
    const myLearn = (me.learn || []).map(s => s.toLowerCase());
    const matches = [];

    demoUsers.forEach(user => {
        const userTeach = user.teach;
        const userLearn = user.learn;

        const canTeachMe = userTeach.filter(s => myLearn.includes(s.toLowerCase()));
        const wantsFromMe = userLearn.filter(s => myTeach.includes(s.toLowerCase()));

        // Always show some demo matches even if no skill overlap
        if (canTeachMe.length === 0 && wantsFromMe.length === 0 && matches.length >= 3) return;

        const score = canTeachMe.length === 0 && wantsFromMe.length === 0
            ? Math.floor(Math.random() * 25 + 20)
            : Math.min(99, (canTeachMe.length + wantsFromMe.length) * 20 + 35);

        let reason = '';
        if (canTeachMe.length > 0 && wantsFromMe.length > 0) {
            reason = `${user.name.split(' ')[0]} can teach you ${canTeachMe.join(', ')} and wants to learn ${wantsFromMe.join(', ')} from you — a perfect skill swap!`;
        } else if (canTeachMe.length > 0) {
            reason = `${user.name.split(' ')[0]} is proficient in ${canTeachMe.join(', ')} — exactly what you want to learn.`;
        } else if (wantsFromMe.length > 0) {
            reason = `${user.name.split(' ')[0]} wants to learn ${wantsFromMe.join(', ')} — skills you can teach!`;
        } else {
            reason = `${user.name.split(' ')[0]} has a complementary tech stack. Great opportunity to expand your network!`;
        }

        matches.push({
            name: user.name,
            email: user.email,
            teach: userTeach,
            learn: userLearn,
            canTeachMe,
            wantsFromMe,
            score,
            reason,
            matchType: canTeachMe.length > 0 && wantsFromMe.length > 0 ? 'mutual'
                        : canTeachMe.length > 0 ? 'canTeach' : 'wantsToLearn',
        });
    });

    matches.sort((a, b) => b.score - a.score);
    return matches;
}

function getAvatarGradient(index) {
    const gradients = [
        'linear-gradient(135deg, #6C5CE7, #a29bfe)',
        'linear-gradient(135deg, #00B4DB, #00D2FF)',
        'linear-gradient(135deg, #FD79A8, #fdcbdd)',
        'linear-gradient(135deg, #FDCB6E, #f9e7a1)',
        'linear-gradient(135deg, #00B894, #55efc4)',
        'linear-gradient(135deg, #e17055, #fab1a0)',
        'linear-gradient(135deg, #0984e3, #74b9ff)',
        'linear-gradient(135deg, #6c5ce7, #fd79a8)',
    ];
    return gradients[index % gradients.length];
}

function filterMatches(filter, btn) {
    SCState.currentFilter = filter;
    document.querySelectorAll('.sc-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderMatches();
}

function renderMatches() {
    const container = document.getElementById('sc-matches-grid');
    let filtered = SCState.matches;

    if (SCState.currentFilter === 'canTeach') {
        filtered = filtered.filter(m => m.canTeachMe.length > 0);
    } else if (SCState.currentFilter === 'wantsToLearn') {
        filtered = filtered.filter(m => m.wantsFromMe.length > 0);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="sc-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h3>No matches found</h3>
                <p>Try adding more skills to teach or learn to discover connections.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((m, i) => {
        const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const scoreClass = m.score >= 70 ? 'high' : m.score >= 45 ? 'medium' : 'low';
        const gradient = getAvatarGradient(i);

        return `
            <div class="sc-match-card" style="animation-delay: ${i * 0.08}s">
                <div class="sc-match-header">
                    <div class="sc-match-avatar" style="background: ${gradient}">${initials}</div>
                    <div>
                        <div class="sc-match-name">${m.name}</div>
                        <div class="sc-match-email">${m.email}</div>
                    </div>
                    <div class="sc-match-score ${scoreClass}">${m.score}%</div>
                </div>

                <div class="sc-match-reason">${m.reason}</div>

                ${m.canTeachMe.length > 0 ? `
                    <div class="sc-match-section">
                        <div class="sc-match-label">Can Teach You</div>
                        <div class="sc-match-tags">
                            ${m.canTeachMe.map(s => `<span class="sc-match-tag highlight">★ ${s}</span>`).join('')}
                            ${m.teach.filter(s => !m.canTeachMe.find(c => c.toLowerCase() === s.toLowerCase())).map(s => `<span class="sc-match-tag normal">${s}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${m.wantsFromMe.length > 0 ? `
                    <div class="sc-match-section">
                        <div class="sc-match-label">Wants to Learn From You</div>
                        <div class="sc-match-tags">
                            ${m.wantsFromMe.map(s => `<span class="sc-match-tag want">✦ ${s}</span>`).join('')}
                            ${m.learn.filter(s => !m.wantsFromMe.find(c => c.toLowerCase() === s.toLowerCase())).map(s => `<span class="sc-match-tag normal">${s}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="sc-match-footer">
                    <button class="btn btn-outline btn-sm" onclick="openMailModal(${i})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Message via Gmail
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== GMAIL MESSAGING ====================
function openMailModal(matchIndex) {
    const filtered = getFilteredMatches();
    const match = filtered[matchIndex];
    if (!match) return;
    SCState.mailTarget = match;

    const initials = match.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('sc-mail-title').textContent = `Message ${match.name}`;
    document.getElementById('sc-mail-recipient').innerHTML = `
        <div class="sc-mail-recipient-avatar">${initials}</div>
        <div class="sc-mail-recipient-info">
            <div class="sc-mail-recipient-name">${match.name}</div>
            <div class="sc-mail-recipient-email">${match.email}</div>
        </div>
    `;

    // Pre-fill subject and body
    const myName = SCState.profile.name;
    let subject = '';
    let body = '';

    if (match.canTeachMe.length > 0 && match.wantsFromMe.length > 0) {
        subject = `Skill Exchange: ${match.canTeachMe[0]} ↔ ${match.wantsFromMe[0]}`;
        body = `Hi ${match.name.split(' ')[0]},\n\nI found your profile on Insignia Skill Connect! I noticed you're skilled in ${match.canTeachMe.join(', ')} — which is exactly what I'm looking to learn.\n\nIn return, I can help you with ${match.wantsFromMe.join(', ')} since I have experience in those areas.\n\nWould you be open to a skill exchange session? We could set up a time that works for both of us.\n\nLooking forward to hearing from you!\n\nBest regards,\n${myName}`;
    } else if (match.canTeachMe.length > 0) {
        subject = `Learning ${match.canTeachMe[0]} — From Insignia Skill Connect`;
        body = `Hi ${match.name.split(' ')[0]},\n\nI found your profile on Insignia Skill Connect and I'm impressed by your expertise in ${match.canTeachMe.join(', ')}.\n\nI'm currently looking to learn ${match.canTeachMe.join(' and ')} and would love the opportunity to learn from you. Would you be open to a mentoring session or a quick chat?\n\nThanks!\n\nBest regards,\n${myName}`;
    } else {
        subject = `I Can Help You Learn ${match.wantsFromMe[0]} — Insignia Skill Connect`;
        body = `Hi ${match.name.split(' ')[0]},\n\nI came across your profile on Insignia Skill Connect and noticed you're interested in learning ${match.wantsFromMe.join(', ')}.\n\nI have experience in those areas and would be happy to help! Whether it's a quick walkthrough, pair programming, or sharing resources — I'm open to however you'd like to learn.\n\nLet me know if you're interested!\n\nBest regards,\n${myName}`;
    }

    document.getElementById('sc-mail-subject').value = subject;
    document.getElementById('sc-mail-body').value = body;

    document.getElementById('sc-mail-modal').style.display = 'flex';
}

function closeMailModal() {
    document.getElementById('sc-mail-modal').style.display = 'none';
    SCState.mailTarget = null;
}

function sendViaGmail() {
    const target = SCState.mailTarget;
    if (!target) return;

    const subject = document.getElementById('sc-mail-subject').value;
    const body = document.getElementById('sc-mail-body').value;

    // Open Gmail compose in a new tab
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(target.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank');

    closeMailModal();
    showToast(`Gmail opened to message ${target.name}!`, 'success');
}

function getFilteredMatches() {
    let filtered = SCState.matches;
    if (SCState.currentFilter === 'canTeach') {
        filtered = filtered.filter(m => m.canTeachMe.length > 0);
    } else if (SCState.currentFilter === 'wantsToLearn') {
        filtered = filtered.filter(m => m.wantsFromMe.length > 0);
    }
    return filtered;
}
