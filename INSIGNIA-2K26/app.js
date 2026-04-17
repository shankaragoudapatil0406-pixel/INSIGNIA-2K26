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
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('fade-out');
    }, 2000);
    setupNavigation();
    loadProfile();
    updateStats();
    updateReadiness();
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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');
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
function showProfileModal() { document.getElementById('profile-modal').style.display = 'flex'; }
function closeProfileModal() { document.getElementById('profile-modal').style.display = 'none'; }

function saveProfile(e) {
    e.preventDefault();
    AppState.profile = {
        name: document.getElementById('profile-name').value,
        role: document.getElementById('profile-role').value,
        level: document.getElementById('profile-level').value,
        domain: document.getElementById('profile-domain').value
    };
    localStorage.setItem('insignia_profile', JSON.stringify(AppState.profile));
    loadProfile();
    closeProfileModal();
    showToast('Profile saved successfully!', 'success');
}

function loadProfile() {
    if (AppState.profile) {
        document.getElementById('display-user-name').textContent = AppState.profile.name;
        document.getElementById('display-user-role').textContent = AppState.profile.role || 'No role set';
        document.getElementById('profile-name').value = AppState.profile.name || '';
        document.getElementById('profile-role').value = AppState.profile.role || '';
        document.getElementById('profile-level').value = AppState.profile.level || 'fresher';
        document.getElementById('profile-domain').value = AppState.profile.domain || 'technology';
    }
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
    const idx = container.children.length;
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `<div class="form-grid"><div class="form-group"><label>Degree</label><input type="text" class="edu-degree" placeholder="M.S. in Data Science"></div><div class="form-group"><label>Institution</label><input type="text" class="edu-institution" placeholder="Stanford University"></div><div class="form-group"><label>Year</label><input type="text" class="edu-year" placeholder="2024 - 2026"></div><div class="form-group"><label>GPA</label><input type="text" class="edu-gpa" placeholder="3.9 / 4.0"></div></div>`;
    container.appendChild(block);
}

function addExperience() {
    const container = document.getElementById('experience-entries');
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `<div class="form-grid"><div class="form-group"><label>Job Title</label><input type="text" class="exp-title" placeholder="Software Engineer"></div><div class="form-group"><label>Company</label><input type="text" class="exp-company" placeholder="Amazon"></div><div class="form-group"><label>Duration</label><input type="text" class="exp-duration" placeholder="Jan 2024 - Present"></div></div><div class="form-group"><label>Key Responsibilities</label><textarea class="exp-desc" rows="3" placeholder="Describe contributions..."></textarea></div>`;
    container.appendChild(block);
}

function addProject() {
    const container = document.getElementById('project-entries');
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `<div class="form-grid"><div class="form-group"><label>Project Name</label><input type="text" class="proj-name" placeholder="Project Name"></div><div class="form-group"><label>Technologies</label><input type="text" class="proj-tech" placeholder="React, Python"></div></div><div class="form-group"><label>Description</label><textarea class="proj-desc" rows="2" placeholder="Brief description..."></textarea></div>`;
    container.appendChild(block);
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
        return desc.split('\n').filter(Boolean).map(l => {
            l = l.replace(/^[-•]\s*/, '');
            if (!/^\d/.test(l) && !/ed |ing |ized /.test(l)) l = 'Spearheaded ' + l.charAt(0).toLowerCase() + l.slice(1);
            return `<li>${l}</li>`;
        }).join('');
    };

    let html = `<h1>${d.name}</h1><div class="contact-info">${[d.email, d.phone, d.location, d.linkedin, d.portfolio].filter(Boolean).join(' | ')}</div>`;
    html += `<h2>Professional Summary</h2><p>${enhancedSummary}</p>`;

    if (d.education.length) {
        html += '<h2>Education</h2>';
        d.education.forEach(e => { html += `<h3>${e.degree} — ${e.institution}</h3><p>${[e.year, e.gpa ? 'GPA: ' + e.gpa : ''].filter(Boolean).join(' | ')}</p>`; });
    }

    if (d.experience.length) {
        html += '<h2>Professional Experience</h2>';
        d.experience.forEach(ex => { html += `<h3>${ex.title} — ${ex.company}</h3><p>${ex.duration}</p><ul>${expBullets(ex.desc)}</ul>`; });
    }

    if (d.projects.length) {
        html += '<h2>Projects</h2>';
        d.projects.forEach(p => { html += `<h3>${p.name} <span style="font-weight:400;color:#888;font-size:0.8em">[${p.tech}]</span></h3><p>${p.desc}</p>`; });
    }

    if (skillsArr.length) {
        html += '<h2>Technical Skills</h2><ul class="skills-list">';
        skillsArr.forEach(s => { html += `<li>${s}</li>`; });
        html += '</ul>';
    }

    document.getElementById('resume-preview').innerHTML = html;
    generateSuggestions(d);
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

function downloadResume() {
    const content = document.getElementById('resume-preview').innerHTML;
    const blob = new Blob([`<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:2rem;max-width:800px;margin:0 auto;color:#1a1a2e}h1{font-size:1.5rem;margin-bottom:0.25rem}h2{font-size:0.95rem;color:#6C5CE7;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #6C5CE7;padding-bottom:0.3rem;margin:1rem 0 0.5rem}h3{font-size:0.85rem;color:#333}p{color:#555;margin-bottom:0.35rem;font-size:0.82rem}.contact-info{color:#666;font-size:0.75rem;margin-bottom:0.75rem}ul{padding-left:1.25rem;color:#555;font-size:0.82rem}.skills-list{display:flex;flex-wrap:wrap;gap:0.35rem;list-style:none;padding:0}.skills-list li{background:#f0ecff;color:#6C5CE7;padding:0.2rem 0.6rem;border-radius:4px;font-size:0.72rem}</style></head><body>${content}</body></html>`], { type: 'text/html' });
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
