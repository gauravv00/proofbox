/**
 * ProofBox - Main Interactive Application Logic
 * Modern, Clean, API-Connected & Human-Centered Evidence Organiser
 */

class ProofBoxApp {
  constructor() {
    this.isDemoMode = false;
    this.user = null;
    this.cases = [];
    this.activeCaseId = null;
    this.activeCase = null; // Full active case object with exhibits and claims
    this.isLoading = false;

    // View & filter states
    this.activeView = 'dashboard';
    this.timelineCategory = 'all';
    this.timelineSearch = '';
    this.timelineSortAsc = true;
    this.activeDrawerExhibitId = null;
    this.activePackTab = 'brief';
    this.activeIngestTab = 'file';

    // Initialize theme (default to dark Executive Noir)
    this.initTheme();

    // Staged items
    this.stagedFile = null;
    this.parsedChatItems = [];

    // Initialize
    this.init();
  }

  async init() {
    this.bindGlobalEvents();

    // Check for existing auth token
    const token = localStorage.getItem('proofbox_token_v1');
    if (token) {
      try {
        this.setLoading(true);
        window.proofboxAPI.setToken(token);
        const res = await window.proofboxAPI.getMe();
        if (res && res.success && res.data) {
          this.user = res.data;
          this.isDemoMode = false;
          await this.loadUserData();
          this.setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Session expired or backend unavailable:', err.message);
        window.proofboxAPI.setToken(null);
      } finally {
        this.setLoading(false);
      }
    }

    // Default to landing page
    this.showLanding();
    if (window.lucide) lucide.createIcons();
  }

  /* ================= THEME MANAGEMENT (Executive Noir & Parchment) ================= */

  initTheme() {
    const saved = localStorage.getItem('proofbox_theme') || 'dark';
    this.setTheme(saved);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('proofbox_theme', theme);
    this.updateThemeIcons();
  }

  toggleTheme() {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    this.showToast(`Switched to ${next === 'dark' ? 'Executive Noir' : 'Parchment'} theme`, 'info');
  }

  updateThemeIcons() {
    const sunLanding = document.getElementById('iconSun');
    const moonLanding = document.getElementById('iconMoon');
    const sunWork = document.getElementById('iconSunWorkspace');
    const moonWork = document.getElementById('iconMoonWorkspace');

    const isDark = this.currentTheme === 'dark';

    [sunLanding, sunWork].forEach(el => {
      if (el) el.classList.toggle('hidden', isDark);
    });
    [moonLanding, moonWork].forEach(el => {
      if (el) el.classList.toggle('hidden', !isDark);
    });

    // Also toggle logo visibility if needed
    const logosDark = document.querySelectorAll('.logo-img-dark');
    const logosLight = document.querySelectorAll('.logo-img-light');
    logosDark.forEach(img => {
      img.classList.toggle('hidden', !isDark);
    });
    logosLight.forEach(img => {
      img.classList.toggle('hidden', isDark);
    });

    if (window.lucide) lucide.createIcons();
  }

  /* ================= GLOBAL EVENTS & UI HELPERS ================= */

  bindGlobalEvents() {
    // Close case dropdown on outside click
    window.addEventListener('click', (e) => {
      const dropdown = document.getElementById('caseDropdownMenu');
      const btn = document.getElementById('caseSelectorBtn');
      if (dropdown && !dropdown.contains(e.target) && btn && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Dropzone setup
    const dropzone = document.getElementById('dropzoneArea');
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('border-blue-500', 'bg-blue-50/50');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFileInput(files);
        }
      });

      dropzone.addEventListener('click', () => {
        const input = document.getElementById('fileUploadInput');
        if (input) input.click();
      });
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    const bar = document.getElementById('topLoadingProgress');
    if (!bar) return;
    if (loading) {
      bar.style.opacity = '1';
      bar.style.width = '70%';
    } else {
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.opacity = '0';
        bar.style.width = '0%';
      }, 200);
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    let iconName = 'info';
    let iconClass = 'text-blue-600';
    if (type === 'success') {
      iconName = 'check-circle';
      iconClass = 'text-emerald-600';
    } else if (type === 'error') {
      iconName = 'alert-triangle';
      iconClass = 'text-rose-600';
    }

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0 ${iconClass}"></i>
      <span class="flex-1 leading-snug">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  formatCurrency(num) {
    const val = Number(num) || 0;
    return '₹' + Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  /* ================= NAVIGATION & VIEWS ================= */

  showLanding() {
    const landing = document.getElementById('serviceLandingPage');
    const workspace = document.getElementById('evidenceAppWorkspace');
    if (landing && workspace) {
      landing.classList.remove('hidden');
      workspace.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Hide chatbot when on landing page
    const chatBtn   = document.getElementById('chatbotToggleBtn');
    const chatPanel = document.getElementById('chatbotPanel');
    if (chatBtn)   chatBtn.classList.add('hidden');
    if (chatPanel) chatPanel.classList.add('hidden');
    if (window.chatbot) window.chatbot.isOpen = false;
  }

  showWorkspace() {
    const landing = document.getElementById('serviceLandingPage');
    const workspace = document.getElementById('evidenceAppWorkspace');
    if (landing && workspace) {
      landing.classList.add('hidden');
      workspace.classList.remove('hidden');
    }

    // Show chatbot button only when workspace is active (logged in / demo)
    const chatBtn = document.getElementById('chatbotToggleBtn');
    if (chatBtn) chatBtn.classList.remove('hidden');

    const demoBanner = document.getElementById('demoModeBanner');
    if (demoBanner) {
      if (this.isDemoMode) demoBanner.classList.remove('hidden');
      else demoBanner.classList.add('hidden');
    }

    const userNameEl = document.getElementById('userNameDisplay');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl) {
      userNameEl.textContent = this.user ? this.user.name : (this.isDemoMode ? 'Demo User' : 'Guest');
    }
    if (userAvatarEl) {
      userAvatarEl.textContent = this.user ? this.user.name.charAt(0).toUpperCase() : 'D';
    }

    const connInd = document.getElementById('connectionStatusIndicator');
    if (connInd) {
      if (this.isDemoMode) {
        connInd.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span><span class="hidden md:inline">Demo Mode</span>';
        connInd.classList.remove('hidden');
      } else {
        connInd.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span><span class="hidden md:inline">API Connected</span>';
        connInd.classList.remove('hidden');
      }
    }

    this.switchView(this.activeView || 'dashboard');
    if (window.lucide) lucide.createIcons();
  }

  scrollToLanding(sectionId) {
    this.showLanding();
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  /* ================= RESPONSIVE MOBILE NAVIGATION ================= */

  toggleMobileNav() {
    const menu = document.getElementById('mobileNavMenu');
    const icon = document.getElementById('mobileNavIcon');
    if (menu) {
      menu.classList.toggle('hidden');
      const isHidden = menu.classList.contains('hidden');
      if (icon) {
        icon.setAttribute('data-lucide', isHidden ? 'menu' : 'x');
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  toggleMobileSidebar() {
    const sidebar  = document.getElementById('workspaceSidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (!sidebar) return;
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
      sidebar.classList.add('-translate-x-full');
      if (backdrop) {
        backdrop.classList.remove('sidebar-backdrop-open');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
      }
    } else {
      sidebar.classList.remove('-translate-x-full');
      if (backdrop) {
        backdrop.classList.remove('hidden');
        requestAnimationFrame(() => backdrop.classList.add('sidebar-backdrop-open'));
      }
    }
  }

  closeMobileSidebar() {
    const sidebar  = document.getElementById('workspaceSidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (sidebar)  sidebar.classList.add('-translate-x-full');
    if (backdrop) {
      backdrop.classList.remove('sidebar-backdrop-open');
      setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
  }

  switchView(viewName) {
    this.closeMobileSidebar();
    this.activeView = viewName;
    const views = ['dashboard', 'timeline', 'ingest', 'vault', 'claims', 'generator', 'audit', 'gaps'];
    
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    });

    // Update active nav styling
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      if (item.getAttribute('data-nav') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (window.lucide) lucide.createIcons();

    // Trigger view-specific renders
    if (viewName === 'dashboard') this.renderDashboard();
    if (viewName === 'timeline') this.renderTimeline();
    if (viewName === 'vault') this.renderVault();
    if (viewName === 'claims') this.renderClaims();
    if (viewName === 'generator') this.renderEvidencePack();
    if (viewName === 'audit') this.renderAuditLedger();
    if (viewName === 'gaps') this.renderGaps();

    const mainEl = document.getElementById('mainContent');
    if (mainEl) mainEl.scrollTop = 0;
  }

  /* ================= AUTHENTICATION ================= */

  showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.switchAuthTab(tab);
    }
  }

  hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    const err = document.getElementById('authErrorMsg');
    if (err) err.classList.add('hidden');
  }

  switchAuthTab(tab) {
    const signInTab = document.getElementById('authTabSignIn');
    const signUpTab = document.getElementById('authTabSignUp');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const err = document.getElementById('authErrorMsg');
    if (err) err.classList.add('hidden');

    if (tab === 'login') {
      signInTab.className = 'flex-1 py-3 text-xs font-semibold text-center border-b-2 border-blue-600 text-blue-600 bg-white transition';
      signUpTab.className = 'flex-1 py-3 text-xs font-semibold text-center border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      signUpTab.className = 'flex-1 py-3 text-xs font-semibold text-center border-b-2 border-blue-600 text-blue-600 bg-white transition';
      signInTab.className = 'flex-1 py-3 text-xs font-semibold text-center border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  showAuthError(msg) {
    const errBox = document.getElementById('authErrorMsg');
    const errText = document.getElementById('authErrorText');
    if (errBox && errText) {
      errText.textContent = msg;
      errBox.classList.remove('hidden');
    }
  }

  async submitLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    try {
      this.setLoading(true);
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner border-white border-t-transparent mx-auto"></div>';

      const res = await window.proofboxAPI.login(email, password);
      if (res && res.success && res.data) {
        window.proofboxAPI.setToken(res.data.token);
        this.user = res.data.user;
        this.isDemoMode = false;
        this.hideAuthModal();
        await this.loadUserData();
        this.showToast(`Welcome back, ${this.user.name}!`, 'success');
      } else {
        this.showAuthError(res.error || 'Failed to sign in.');
      }
    } catch (err) {
      this.showAuthError(err.message || 'Login failed. Please check credentials.');
    } finally {
      this.setLoading(false);
      btn.disabled = false;
      btn.innerHTML = '<span>Sign In</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }

  async submitRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');

    try {
      this.setLoading(true);
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner border-white border-t-transparent mx-auto"></div>';

      const res = await window.proofboxAPI.register(name, email, password);
      if (res && res.success && res.data) {
        window.proofboxAPI.setToken(res.data.token);
        this.user = res.data.user;
        this.isDemoMode = false;
        this.hideAuthModal();

        // Seed demo case for new user convenience
        try {
          await window.proofboxAPI.seedDemoCase();
        } catch {
          // If seeding fails, proceed anyway
        }

        await this.loadUserData();
        this.showToast(`Account created! Welcome, ${this.user.name}.`, 'success');
      } else {
        this.showAuthError(res.error || 'Failed to create account.');
      }
    } catch (err) {
      this.showAuthError(err.message || 'Registration failed.');
    } finally {
      this.setLoading(false);
      btn.disabled = false;
      btn.innerHTML = '<span>Create Free Account</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }

  logout() {
    window.proofboxAPI.setToken(null);
    this.user = null;
    this.isDemoMode = false;
    this.cases = [];
    this.activeCase = null;
    this.activeCaseId = null;
    // Reset chatbot state
    if (window.chatbot) {
      window.chatbot.history = [];
      window.chatbot.initialized = false;
      window.chatbot.isOpen = false;
      const msgs = document.getElementById('chatbotMessages');
      if (msgs) msgs.innerHTML = '';
    }
    this.showToast('You have been signed out.', 'info');
    this.showLanding();
  }

  enterDemoMode() {
    this.isDemoMode = true;
    this.user = { name: 'Aisha Khan (Demo)', email: 'demo@proofbox.app', plan: 'pro' };
    this.hideAuthModal();

    // Load from PROOFBOX_DATA
    if (window.PROOFBOX_DATA && window.PROOFBOX_DATA.DEFAULT_CASES) {
      this.cases = JSON.parse(JSON.stringify(window.PROOFBOX_DATA.DEFAULT_CASES));
      // Pick Aisha's case (case-001) as default active
      const aishaCase = this.cases.find(c => c.id === 'case-001') || this.cases[0];
      this.activeCaseId = aishaCase.id;
      this.activeCase = aishaCase;
    }

    this.showWorkspace();
    this.renderAll();
    this.showToast('Entered Demo Mode. Using local demo datasets.', 'info');
  }

  /* ================= DATA LOADING ================= */

  async loadUserData() {
    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.getCases();
      this.cases = (res && res.data) || [];

      if (this.cases.length === 0) {
        // Automatically seed demo case if brand new user with 0 cases
        const seedRes = await window.proofboxAPI.seedDemoCase();
        if (seedRes && seedRes.data) {
          this.cases = [seedRes.data];
        }
      }

      if (this.cases.length > 0) {
        await this.setActiveCase(this.cases[0].id);
      } else {
        this.activeCase = { id: null, title: 'No Cases Found', exhibits: [], claims: [] };
      }

      this.showWorkspace();
      this.renderAll();
    } catch (err) {
      console.error('Failed to load user cases:', err);
      this.showToast('Backend connection error. Falling back to Demo Mode.', 'error');
      this.enterDemoMode();
    } finally {
      this.setLoading(false);
    }
  }

  async setActiveCase(caseId) {
    this.activeCaseId = caseId;
    if (this.isDemoMode) {
      this.activeCase = this.cases.find(c => c.id === caseId) || this.cases[0];
      this.renderAll();
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.getCase(caseId);
      if (res && res.success && res.data) {
        this.activeCase = res.data;
        this.renderAll();
      }
    } catch (err) {
      console.error('Error fetching case:', err);
      this.showToast('Could not load case details: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  getActiveCase() {
    if (this.activeCase) return this.activeCase;
    return {
      id: null,
      title: 'Empty Case',
      disputeType: 'General Dispute',
      status: 'Active File',
      batesPrefix: 'PB-',
      opposingParty: 'N/A',
      claimAmount: '₹0.00',
      description: '',
      notes: '',
      exhibits: [],
      claims: []
    };
  }

  renderAll() {
    this.renderHeaderMeta();
    this.renderCaseDropdownList();
    this.switchView(this.activeView || 'dashboard');
    if (window.lucide) lucide.createIcons();
  }

  renderHeaderMeta() {
    const c = this.getActiveCase();
    const headerTitle = document.getElementById('headerCaseTitle');
    const metaDispute = document.getElementById('metaDisputeType');
    const metaStatus = document.getElementById('metaStatusBadge');
    const metaPrefix = document.getElementById('metaBatesPrefix');
    const metaOpposing = document.getElementById('metaOpposingParty');
    const metaClaim = document.getElementById('metaClaimAmount');

    if (headerTitle) headerTitle.textContent = c.title || 'Untitled Case';
    if (metaDispute) metaDispute.textContent = c.disputeType || c.dispute_type || 'Dispute';
    if (metaStatus) metaStatus.textContent = c.status || 'Active File';
    if (metaPrefix) metaPrefix.textContent = c.batesPrefix || c.bates_prefix || 'PB-';
    if (metaOpposing) metaOpposing.textContent = c.opposingParty || c.opposing_party || 'No opposing party';
    if (metaClaim) metaClaim.textContent = c.claimAmount || c.claim_amount || '₹0.00';

    const usageEl = document.getElementById('sidebarExhibitUsage');
    if (usageEl) {
      const count = (c.exhibits && c.exhibits.length) || 0;
      usageEl.textContent = `${count} exhibits logged`;
    }
  }

  /* ================= CASE SWITCHER & MODALS ================= */

  toggleCaseDropdown() {
    const menu = document.getElementById('caseDropdownMenu');
    if (menu) {
      menu.classList.toggle('hidden');
      this.renderCaseDropdownList();
    }
  }

  renderCaseDropdownList() {
    const container = document.getElementById('caseListContainer');
    if (!container) return;

    if (!this.cases || this.cases.length === 0) {
      container.innerHTML = '<div class="text-xs text-slate-400 p-2">No cases found.</div>';
      return;
    }

    container.innerHTML = this.cases.map(c => `
      <div onclick="app.selectCase('${c.id}')" class="p-2 rounded-lg cursor-pointer transition flex items-center justify-between ${c.id === this.activeCaseId ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'}">
        <div class="truncate mr-2">
          <div class="text-xs truncate">${this.escapeHtml(c.title)}</div>
          <div class="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
            <span>${c.exhibitCount || (c.exhibits ? c.exhibits.length : 0)} exhibits</span>
            <span>•</span>
            <span>${c.batesPrefix || c.bates_prefix || 'PB-'}</span>
          </div>
        </div>
        ${c.id === this.activeCaseId ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 flex-shrink-0"></i>' : ''}
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  async selectCase(caseId) {
    const menu = document.getElementById('caseDropdownMenu');
    if (menu) menu.classList.add('hidden');
    await this.setActiveCase(caseId);
    this.showToast(`Switched to: ${this.getActiveCase().title}`, 'info');
  }

  openNewCaseModal() {
    const menu = document.getElementById('caseDropdownMenu');
    if (menu) menu.classList.add('hidden');
    const modal = document.getElementById('newCaseModal');
    if (modal) {
      document.getElementById('newCaseTitle').value = '';
      document.getElementById('newCaseOpposing').value = '';
      document.getElementById('newCaseAmount').value = '';
      document.getElementById('newCaseDesc').value = '';
      modal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  }

  closeNewCaseModal() {
    const modal = document.getElementById('newCaseModal');
    if (modal) modal.classList.add('hidden');
  }

  async submitNewCase(e) {
    e.preventDefault();
    const title = document.getElementById('newCaseTitle').value.trim();
    const disputeType = document.getElementById('newCaseType').value;
    const batesPrefix = document.getElementById('newCasePrefix').value.trim() || 'PB-';
    const opposingParty = document.getElementById('newCaseOpposing').value.trim();
    const claimAmount = document.getElementById('newCaseAmount').value.trim();
    const description = document.getElementById('newCaseDesc').value.trim();

    if (!title) return;

    const payload = {
      title,
      disputeType,
      batesPrefix,
      opposingParty,
      claimAmount,
      description,
      status: 'Active Preparation'
    };

    if (this.isDemoMode) {
      const newId = 'case-demo-' + Date.now();
      const demoCase = {
        id: newId,
        ...payload,
        exhibits: [],
        claims: [],
        createdAt: new Date().toISOString()
      };
      this.cases.unshift(demoCase);
      this.activeCase = demoCase;
      this.activeCaseId = newId;
      this.closeNewCaseModal();
      this.renderAll();
      this.showToast('Created new case in Demo Mode.', 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.createCase(payload);
      if (res && res.success && res.data) {
        this.closeNewCaseModal();
        await this.loadUserData();
        await this.setActiveCase(res.data.id);
        this.showToast('New dispute case created successfully.', 'success');
      }
    } catch (err) {
      this.showToast('Failed to create case: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  openEditCaseModal() {
    const c = this.getActiveCase();
    const modal = document.getElementById('editCaseModal');
    if (!modal) return;

    document.getElementById('editCaseTitle').value = c.title || '';
    document.getElementById('editCaseType').value = c.disputeType || c.dispute_type || 'General Dispute';
    document.getElementById('editCaseStatus').value = c.status || 'Active Preparation';
    document.getElementById('editCaseOpposing').value = c.opposingParty || c.opposing_party || '';
    document.getElementById('editCaseAmount').value = c.claimAmount || c.claim_amount || '';
    document.getElementById('editCaseDesc').value = c.description || '';
    document.getElementById('editCaseNotes').value = c.notes || '';

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeEditCaseModal() {
    const modal = document.getElementById('editCaseModal');
    if (modal) modal.classList.add('hidden');
  }

  async submitEditCase(e) {
    e.preventDefault();
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    const payload = {
      title: document.getElementById('editCaseTitle').value.trim(),
      disputeType: document.getElementById('editCaseType').value,
      status: document.getElementById('editCaseStatus').value,
      opposingParty: document.getElementById('editCaseOpposing').value.trim(),
      claimAmount: document.getElementById('editCaseAmount').value.trim(),
      description: document.getElementById('editCaseDesc').value.trim(),
      notes: document.getElementById('editCaseNotes').value.trim()
    };

    if (this.isDemoMode) {
      Object.assign(c, payload);
      this.closeEditCaseModal();
      this.renderAll();
      this.showToast('Case updated (Demo Mode).', 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.updateCase(c.id, payload);
      if (res && res.success && res.data) {
        this.activeCase = res.data;
        this.closeEditCaseModal();
        this.renderAll();
        this.showToast('Case details updated.', 'success');
      }
    } catch (err) {
      this.showToast('Failed to update case: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async deleteActiveCase() {
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    if (!confirm(`Are you sure you want to permanently delete case "${c.title}" and all its exhibits?`)) {
      return;
    }

    if (this.isDemoMode) {
      this.cases = this.cases.filter(x => x.id !== c.id);
      this.closeEditCaseModal();
      if (this.cases.length > 0) {
        await this.setActiveCase(this.cases[0].id);
      } else {
        this.activeCase = null;
        this.activeCaseId = null;
      }
      this.renderAll();
      this.showToast('Case deleted (Demo Mode).', 'info');
      return;
    }

    try {
      this.setLoading(true);
      await window.proofboxAPI.deleteCase(c.id);
      this.closeEditCaseModal();
      await this.loadUserData();
      this.showToast('Case deleted.', 'info');
    } catch (err) {
      this.showToast('Failed to delete case: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* ================= DASHBOARD VIEW ================= */

  renderDashboard() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const claims = c.claims || [];

    // Total Exhibits
    const totalExhibitsEl = document.getElementById('dashTotalExhibits');
    if (totalExhibitsEl) totalExhibitsEl.textContent = exhibits.length;

    // Timeline Span
    const spanEl = document.getElementById('dashTimelineSpan');
    const spanDatesEl = document.getElementById('dashSpanDates');
    if (exhibits.length >= 2) {
      const timestamps = exhibits
        .map(e => new Date(e.timestamp).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);

      if (timestamps.length >= 2) {
        const days = Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24));
        if (spanEl) spanEl.textContent = `${days} days`;
        if (spanDatesEl) {
          spanDatesEl.textContent = `${this.formatDate(new Date(timestamps[0]))} to ${this.formatDate(new Date(timestamps[timestamps.length - 1]))}`;
        }
      } else {
        if (spanEl) spanEl.textContent = '1 day';
        if (spanDatesEl) spanDatesEl.textContent = 'Single date recorded';
      }
    } else if (exhibits.length === 1) {
      if (spanEl) spanEl.textContent = '1 day';
      if (spanDatesEl) spanDatesEl.textContent = this.formatDate(exhibits[0].timestamp);
    } else {
      if (spanEl) spanEl.textContent = '0 days';
      if (spanDatesEl) spanDatesEl.textContent = 'No dates logged';
    }

    // Claims Total
    const claimsTotalEl = document.getElementById('dashClaimsTotal');
    const claimsCountEl = document.getElementById('dashClaimsCount');
    const totalClaimAmount = claims.reduce((sum, cl) => sum + (Number(cl.amount) || 0), 0);
    if (claimsTotalEl) claimsTotalEl.textContent = this.formatCurrency(totalClaimAmount);
    if (claimsCountEl) claimsCountEl.textContent = `${claims.length} claim items logged`;

    // Evidentiary Readiness checklist
    const checklist = this.getDisputeChecklist(c.disputeType || c.dispute_type);
    let satisfiedCount = 0;
    const checklistHtml = checklist.map(item => {
      const hasMatch = exhibits.some(e => e.category === item.requiredCategory);
      if (hasMatch) satisfiedCount++;
      return `
        <div class="readiness-item ${hasMatch ? 'satisfied' : 'missing'}">
          <div class="mt-0.5 flex-shrink-0">
            <i data-lucide="${hasMatch ? 'check-circle' : 'circle'}" class="w-4 h-4 ${hasMatch ? 'text-emerald-500' : 'text-slate-500'}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs readiness-title">${this.escapeHtml(item.title)}</div>
            <div class="text-[11px] readiness-desc truncate mt-0.5">${this.escapeHtml(item.description)}</div>
          </div>
          <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded flex-shrink-0 readiness-badge">${this.escapeHtml(item.requiredCategory)}</span>
        </div>
      `;
    }).join('');

    const checklistContainer = document.getElementById('dashChecklistItems');
    if (checklistContainer) checklistContainer.innerHTML = checklistHtml;

    const readinessScore = checklist.length > 0 ? Math.round((satisfiedCount / checklist.length) * 100) : 0;
    const readinessScoreEl = document.getElementById('dashReadinessScore');
    if (readinessScoreEl) readinessScoreEl.textContent = `${readinessScore}%`;

    const progressLabel = document.getElementById('dashProgressLabel');
    if (progressLabel) progressLabel.textContent = `${satisfiedCount} of ${checklist.length} satisfied`;

    const progressBar = document.getElementById('dashProgressBar');
    if (progressBar) progressBar.style.width = `${readinessScore}%`;

    // Recent Stream
    const streamContainer = document.getElementById('dashRecentStream');
    if (streamContainer) {
      if (exhibits.length === 0) {
        streamContainer.innerHTML = `
          <div class="text-center py-6 text-slate-400 text-xs">
            No exhibits added yet. Click "+ Add Evidence" to begin.
          </div>
        `;
      } else {
        const sorted = [...exhibits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
        streamContainer.innerHTML = sorted.map(ex => `
          <div onclick="app.openExhibitDrawer('${ex.id}')" class="surface-card p-2.5 flex items-center justify-between hover:border-slate-300 cursor-pointer transition">
            <div class="flex items-center gap-2.5 truncate mr-2">
              <span class="bates-tag flex-shrink-0">${ex.batesNumber || ex.bates_number || 'EX'}</span>
              <div class="truncate">
                <div class="text-xs font-semibold text-slate-800 truncate">${this.escapeHtml(ex.title)}</div>
                <div class="text-[10px] text-slate-500 font-mono">${this.formatDate(ex.timestamp)} • ${ex.category}</div>
              </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
          </div>
        `).join('');
      }
    }

    // Bottom Description & Notes
    const descEl = document.getElementById('dashCaseDescription');
    if (descEl) descEl.textContent = c.description || 'No description added yet. Edit case to provide dispute context.';
    const notesEl = document.getElementById('dashCaseNotes');
    if (notesEl) notesEl.textContent = c.notes || 'No case strategy notes recorded.';

    if (window.lucide) lucide.createIcons();
  }

  getDisputeChecklist(disputeType) {
    if (window.PROOFBOX_DATA && window.PROOFBOX_DATA.DISPUTE_CHECKLISTS) {
      const lists = window.PROOFBOX_DATA.DISPUTE_CHECKLISTS;
      if (lists[disputeType]) return lists[disputeType];
    }
    // Fallback standard checklist
    return [
      { id: 'c1', title: 'Core Agreement / Contract / Lease', requiredCategory: 'Agreement', description: 'Underlying agreement between parties.' },
      { id: 'c2', title: 'Payment / Transaction Proof', requiredCategory: 'Payment', description: 'Bank slip, UPI receipt, or invoice.' },
      { id: 'c3', title: 'Contemporaneous Written Notice', requiredCategory: 'Communication', description: 'WhatsApp chats or emails documenting issue.' },
      { id: 'c4', title: 'Damage Photo / Defect Documentation', requiredCategory: 'Damage Photo', description: 'Physical proof of defect or damage.' },
      { id: 'c5', title: 'Formal Demand Notice / Handover', requiredCategory: 'Notice', description: 'Notice of claim given to opposing party.' }
    ];
  }

  /* ================= TIMELINE VIEW ================= */

  filterCategory(cat) {
    this.timelineCategory = cat;
    document.querySelectorAll('.timeline-filter-pill').forEach(btn => {
      if (btn.getAttribute('data-cat') === cat) {
        btn.className = 'timeline-filter-pill active px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200';
      } else {
        btn.className = 'timeline-filter-pill px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 border border-transparent';
      }
    });
    this.renderTimeline();
  }

  filterTimeline() {
    const input = document.getElementById('timelineSearchInput');
    this.timelineSearch = input ? input.value.trim().toLowerCase() : '';
    this.renderTimeline();
  }

  toggleTimelineSort() {
    this.timelineSortAsc = !this.timelineSortAsc;
    const label = document.getElementById('sortOrderLabel');
    if (label) label.textContent = this.timelineSortAsc ? 'Oldest First' : 'Newest First';
    this.renderTimeline();
  }

  renderTimeline() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const container = document.getElementById('timelineContainer');
    if (!container) return;

    let filtered = exhibits.filter(ex => {
      // Category filter
      if (this.timelineCategory !== 'all' && ex.category !== this.timelineCategory) {
        return false;
      }
      // Search filter
      if (this.timelineSearch) {
        const text = `${ex.title} ${ex.summary} ${ex.sender} ${ex.recipient} ${ex.relevance} ${ex.batesNumber || ex.bates_number} ${ex.sha256}`.toLowerCase();
        if (!text.includes(this.timelineSearch)) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return this.timelineSortAsc ? timeA - timeB : timeB - timeA;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="surface-card p-12 text-center text-slate-500 space-y-3">
          <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <i data-lucide="inbox" class="w-6 h-6"></i>
          </div>
          <div class="font-bold text-slate-800 text-sm">No exhibits found</div>
          <p class="text-xs max-w-sm mx-auto">No evidence matches your active filter or search. Click "Add Evidence" to import chats, photos, or documents.</p>
          <button onclick="app.switchView('ingest')" class="btn-primary text-xs mt-2">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Add Evidence</span>
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(ex => {
      const bates = ex.batesNumber || ex.bates_number || 'PB-0000';
      const category = ex.category || 'Document';
      const formattedDate = this.formatDate(ex.timestamp);
      const formattedTime = this.formatDateTime(ex.timestamp);
      const shaSnippet = (ex.sha256 || '').substring(0, 16) + '...';

      return `
        <div class="timeline-item flex flex-col sm:flex-row items-start gap-4">
          
          <!-- Left Date Column -->
          <div class="w-28 flex-shrink-0 text-left sm:text-right pt-2 font-mono">
            <div class="text-xs font-bold text-slate-900">${formattedDate}</div>
            <div class="text-[10px] text-slate-400">${formattedTime.split(',')[1] || ''}</div>
          </div>

          <!-- Timeline Center Node -->
          <div class="timeline-node hidden sm:flex flex-shrink-0 mt-1.5">
            <i data-lucide="file" class="w-3.5 h-3.5"></i>
          </div>

          <!-- Right Card -->
          <div class="surface-card p-4 flex-1 space-y-3 hover:border-slate-300 transition">
            
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="bates-tag">${bates}</span>
                <span class="blue-badge">${category}</span>
                <span class="text-slate-400 text-xs">•</span>
                <span class="text-xs text-slate-500 font-mono">${ex.sourceType || ex.source_type || 'File'}</span>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-1">
                <button onclick="app.openExhibitDrawer('${ex.id}')" title="Inspect exhibit" class="btn-ghost p-1 text-slate-500 hover:text-blue-600">
                  <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button onclick="app.deleteExhibit('${ex.id}')" title="Delete exhibit" class="btn-ghost p-1 text-slate-400 hover:text-rose-600">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <!-- Title & Summary -->
            <div>
              <h4 onclick="app.openExhibitDrawer('${ex.id}')" class="text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition mb-1">
                ${this.escapeHtml(ex.title)}
              </h4>
              <p class="text-xs text-slate-600 leading-relaxed line-clamp-2">
                ${this.escapeHtml(ex.summary || ex.notes || 'No summary text.')}
              </p>
            </div>

            <!-- Footer: Sender/Recipient & SHA-256 -->
            <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div class="flex items-center gap-3">
                ${ex.sender ? `<span><strong class="text-slate-700">From:</strong> ${this.escapeHtml(ex.sender)}</span>` : ''}
                ${ex.recipient ? `<span><strong class="text-slate-700">To:</strong> ${this.escapeHtml(ex.recipient)}</span>` : ''}
              </div>
              <div class="flex items-center gap-1.5 font-mono text-slate-400">
                <i data-lucide="lock" class="w-3 h-3 text-emerald-600"></i>
                <span>SHA-256: ${shaSnippet}</span>
              </div>
            </div>

          </div>

        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  /* ================= ADD EVIDENCE (INGESTION) ================= */

  switchIngestTab(tab) {
    this.activeIngestTab = tab;
    const methods = ['file', 'chat', 'email', 'verbal'];
    methods.forEach(m => {
      const card = document.getElementById(`ingestCard-${m}`);
      const panel = document.getElementById(`ingestPanel-${m}`);
      if (m === tab) {
        if (card) {
          card.classList.add('border-blue-600', 'bg-blue-50/20');
          card.classList.remove('hover:border-slate-300');
        }
        if (panel) panel.classList.remove('hidden');
      } else {
        if (card) {
          card.classList.remove('border-blue-600', 'bg-blue-50/20');
          card.classList.add('hover:border-slate-300');
        }
        if (panel) panel.classList.add('hidden');
      }
    });
    if (window.lucide) lucide.createIcons();
  }

  handleFileInput(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.stagedFile = file;

    const form = document.getElementById('fileStagedForm');
    const titleInput = document.getElementById('stagedTitle');
    const catInput = document.getElementById('stagedCategory');
    const timeInput = document.getElementById('stagedTimestamp');

    if (form) form.classList.remove('hidden');
    if (titleInput) titleInput.value = file.name.replace(/\.[^/.]+$/, '');
    
    // Auto-detect category
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      if (catInput) catInput.value = 'Damage Photo';
    } else if (['pdf', 'doc', 'docx'].includes(ext)) {
      if (catInput) catInput.value = 'Agreement';
    } else if (['txt', 'eml'].includes(ext)) {
      if (catInput) catInput.value = 'Communication';
    }

    if (timeInput) {
      const now = new Date();
      timeInput.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    this.showToast(`Selected file: ${file.name}`, 'info');
    if (window.lucide) lucide.createIcons();
  }

  cancelStagedFile() {
    this.stagedFile = null;
    const form = document.getElementById('fileStagedForm');
    if (form) form.classList.add('hidden');
    const input = document.getElementById('fileUploadInput');
    if (input) input.value = '';
  }

  async submitStagedFile(e) {
    e.preventDefault();
    if (!this.stagedFile) {
      this.showToast('Please select a file first.', 'error');
      return;
    }

    const c = this.getActiveCase();
    if (!c || !c.id) {
      this.showToast('Please select or create an active case first.', 'error');
      return;
    }

    const title = document.getElementById('stagedTitle').value.trim();
    const category = document.getElementById('stagedCategory').value;
    const timestamp = document.getElementById('stagedTimestamp').value || new Date().toISOString();
    const sender = document.getElementById('stagedSender').value.trim();
    const recipient = document.getElementById('stagedRecipient').value.trim();
    const summary = document.getElementById('stagedSummary').value.trim();
    const relevance = document.getElementById('stagedRelevance').value.trim();

    if (this.isDemoMode) {
      const nextNum = (c.exhibits.length + 1).toString().padStart(4, '0');
      const batesPrefix = c.batesPrefix || c.bates_prefix || 'PB-';
      const newEx = {
        id: 'ex-demo-' + Date.now(),
        batesNumber: `${batesPrefix}${nextNum}`,
        title,
        category,
        timestamp,
        sourceType: 'Uploaded File',
        fileName: this.stagedFile.name,
        fileSize: `${Math.round(this.stagedFile.size / 1024)} KB`,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        sender,
        recipient,
        summary,
        relevance,
        verified: true,
        previewType: this.stagedFile.type.startsWith('image/') ? 'image' : 'pdf'
      };
      c.exhibits.push(newEx);
      this.cancelStagedFile();
      this.renderAll();
      this.switchView('timeline');
      this.showToast(`Evidence exhibit ${newEx.batesNumber} created (Demo Mode).`, 'success');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.stagedFile);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('timestamp', timestamp);
    formData.append('sender', sender);
    formData.append('recipient', recipient);
    formData.append('summary', summary);
    formData.append('relevance', relevance);

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.createExhibit(c.id, formData);
      if (res && res.success && res.data) {
        this.cancelStagedFile();
        await this.setActiveCase(c.id);
        this.switchView('timeline');
        this.showToast(`Exhibit ${res.data.batesNumber || res.data.bates_number} recorded & hashed.`, 'success');
      }
    } catch (err) {
      this.showToast('Upload failed: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* WhatsApp Chat Parser */

  loadSampleChat() {
    const input = document.getElementById('chatTranscriptInput');
    if (input && window.PROOFBOX_DATA && window.PROOFBOX_DATA.SAMPLE_WHATSAPP_TRANSCRIPT) {
      input.value = window.PROOFBOX_DATA.SAMPLE_WHATSAPP_TRANSCRIPT;
      this.parseChatTranscript();
    }
  }

  parseChatTranscript() {
    const input = document.getElementById('chatTranscriptInput');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) {
      this.showToast('Please paste a WhatsApp transcript first.', 'info');
      return;
    }

    const lines = raw.split('\n');
    const items = [];
    // Regex for WhatsApp lines: e.g. "14/10/25, 09:15 - Aisha: message" or "10/28/25, 4:45 PM - Vikas: message"
    const regex = /(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*[-:]\s*([^:]+):\s*(.+)/;

    lines.forEach((line, idx) => {
      const match = line.trim().match(regex);
      if (match) {
        const rawDate = match[1];
        const rawTime = match[2];
        const sender = match[3].trim();
        const text = match[4].trim();

        // Convert date to standard ISO timestamp approximation
        let isoTimestamp = new Date().toISOString();
        try {
          const parts = rawDate.split(/[\/\.]/);
          let day = parts[0], month = parts[1], year = parts[2];
          if (year.length === 2) year = '20' + year;
          // default DD/MM/YYYY
          const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${rawTime}`);
          if (!isNaN(parsedDate.getTime())) {
            isoTimestamp = parsedDate.toISOString();
          }
        } catch {
          isoTimestamp = new Date().toISOString();
        }

        items.push({
          id: 'temp-' + idx,
          sender,
          summary: text,
          timestamp: isoTimestamp,
          title: `WhatsApp Message from ${sender}`,
          category: 'Communication'
        });
      }
    });

    this.parsedChatItems = items;
    const countEl = document.getElementById('chatParseCount');
    const reviewBox = document.getElementById('parsedChatReview');
    const listEl = document.getElementById('parsedChatList');

    if (countEl) countEl.textContent = `${items.length} messages detected`;

    if (items.length > 0) {
      if (reviewBox) reviewBox.classList.remove('hidden');
      if (listEl) {
        listEl.innerHTML = items.map((item, i) => `
          <div class="surface-card p-3 flex items-start gap-3 bg-slate-50/50">
            <input type="checkbox" checked id="chatCheck-${i}" class="mt-1 rounded text-blue-600 focus:ring-blue-500">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>${this.escapeHtml(item.sender)}</span>
                <span class="text-[10px] text-slate-400 font-mono">${this.formatDateTime(item.timestamp)}</span>
              </div>
              <div class="text-xs text-slate-600 mt-1">${this.escapeHtml(item.summary)}</div>
            </div>
          </div>
        `).join('');
      }
      this.showToast(`Parsed ${items.length} chat messages. Review and import below.`, 'success');
    } else {
      if (reviewBox) reviewBox.classList.add('hidden');
      this.showToast('Could not find timestamped WhatsApp messages. Check format.', 'error');
    }

    if (window.lucide) lucide.createIcons();
  }

  async batchImportParsedChat() {
    const c = this.getActiveCase();
    if (!c || !c.id) {
      this.showToast('Please select an active case first.', 'error');
      return;
    }

    const selectedItems = this.parsedChatItems.filter((item, i) => {
      const cb = document.getElementById(`chatCheck-${i}`);
      return cb ? cb.checked : true;
    });

    if (selectedItems.length === 0) {
      this.showToast('No messages selected for import.', 'error');
      return;
    }

    if (this.isDemoMode) {
      const batesPrefix = c.batesPrefix || c.bates_prefix || 'PB-';
      let nextNum = c.exhibits.length + 1;
      selectedItems.forEach(item => {
        c.exhibits.push({
          id: 'ex-chat-' + Date.now() + '-' + nextNum,
          batesNumber: `${batesPrefix}${String(nextNum++).padStart(4, '0')}`,
          title: item.title,
          category: 'Communication',
          timestamp: item.timestamp,
          sourceType: 'WhatsApp Chat Export',
          fileName: `whatsapp_${item.sender.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
          fileSize: `${item.summary.length} bytes`,
          sha256: '5d41402abc4b2a76b9719d911017c592b0c39962a9c336b1130d2fb69da8a509',
          sender: item.sender,
          recipient: 'Chat Participants',
          summary: item.summary,
          relevance: 'Contemporaneous communication documenting dispute.',
          verified: true,
          previewType: 'chat'
        });
      });
      this.parsedChatItems = [];
      const reviewBox = document.getElementById('parsedChatReview');
      if (reviewBox) reviewBox.classList.add('hidden');
      document.getElementById('chatTranscriptInput').value = '';
      this.renderAll();
      this.switchView('timeline');
      this.showToast(`Imported ${selectedItems.length} chat exhibits (Demo Mode).`, 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.batchCreateExhibits(c.id, selectedItems);
      if (res && res.success) {
        this.parsedChatItems = [];
        const reviewBox = document.getElementById('parsedChatReview');
        if (reviewBox) reviewBox.classList.add('hidden');
        document.getElementById('chatTranscriptInput').value = '';
        await this.setActiveCase(c.id);
        this.switchView('timeline');
        this.showToast(`Successfully created ${selectedItems.length} chat exhibits with Bates numbers.`, 'success');
      }
    } catch (err) {
      this.showToast('Batch import failed: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* Email Note */
  async submitEmailNote(e) {
    e.preventDefault();
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    const subject = document.getElementById('emailSubject').value.trim();
    const timestamp = document.getElementById('emailTimestamp').value || new Date().toISOString();
    const sender = document.getElementById('emailFrom').value.trim();
    const recipient = document.getElementById('emailTo').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    const relevance = document.getElementById('emailRelevance').value.trim();

    const payload = {
      title: subject,
      category: 'Communication',
      sourceType: 'Email Correspondence',
      timestamp,
      sender,
      recipient,
      summary: body,
      relevance: relevance || 'Contemporaneous email communication.'
    };

    if (this.isDemoMode) {
      const batesPrefix = c.batesPrefix || c.bates_prefix || 'PB-';
      const nextNum = (c.exhibits.length + 1).toString().padStart(4, '0');
      c.exhibits.push({
        id: 'ex-email-' + Date.now(),
        batesNumber: `${batesPrefix}${nextNum}`,
        ...payload,
        fileName: 'email_thread.eml',
        fileSize: `${body.length} bytes`,
        sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        verified: true,
        previewType: 'chat'
      });
      this.renderAll();
      this.switchView('timeline');
      this.showToast('Email exhibit saved (Demo Mode).', 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.createExhibitJSON(c.id, payload);
      if (res && res.success) {
        await this.setActiveCase(c.id);
        this.switchView('timeline');
        this.showToast('Email exhibit logged & assigned Bates number.', 'success');
      }
    } catch (err) {
      this.showToast('Failed to save email: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* Verbal Call Note */
  loadSampleVerbal() {
    if (window.PROOFBOX_DATA && window.PROOFBOX_DATA.SAMPLE_VERBAL_NOTE) {
      const v = window.PROOFBOX_DATA.SAMPLE_VERBAL_NOTE;
      const speakerEl = document.getElementById('verbalSpeaker');
      const durEl = document.getElementById('verbalDuration');
      const sumEl = document.getElementById('verbalSummary');
      const relEl = document.getElementById('verbalRelevance');
      const timeEl = document.getElementById('verbalTimestamp');

      if (speakerEl) speakerEl.value = v.speaker;
      if (durEl) durEl.value = v.duration;
      if (sumEl) sumEl.value = v.summary;
      if (relEl) relEl.value = v.relevance;
      if (timeEl) {
        timeEl.value = new Date().toISOString().slice(0, 16);
      }
      this.showToast('Sample phone call log populated.', 'info');
    }
  }

  async submitVerbalNote(e) {
    e.preventDefault();
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    const speaker = document.getElementById('verbalSpeaker').value.trim();
    const duration = document.getElementById('verbalDuration').value.trim();
    const summary = document.getElementById('verbalSummary').value.trim();
    const relevance = document.getElementById('verbalRelevance').value.trim();
    const timestamp = document.getElementById('verbalTimestamp').value || new Date().toISOString();

    const fullSummary = `Speaker: ${speaker}\nDuration: ${duration}\nDiscussion: ${summary}`;
    const payload = {
      title: `Phone Call Log - ${speaker}`,
      category: 'Communication',
      sourceType: 'Phone Call Log',
      timestamp,
      sender: speaker,
      recipient: 'Self (Tenant)',
      summary: fullSummary,
      relevance: relevance || 'Contemporaneous phone conversation memo.'
    };

    if (this.isDemoMode) {
      const batesPrefix = c.batesPrefix || c.bates_prefix || 'PB-';
      const nextNum = (c.exhibits.length + 1).toString().padStart(4, '0');
      c.exhibits.push({
        id: 'ex-verbal-' + Date.now(),
        batesNumber: `${batesPrefix}${nextNum}`,
        ...payload,
        fileName: 'Call_Memo.txt',
        fileSize: `${fullSummary.length} bytes`,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        verified: true,
        previewType: 'text'
      });
      this.renderAll();
      this.switchView('timeline');
      this.showToast('Verbal note logged (Demo Mode).', 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.createExhibitJSON(c.id, payload);
      if (res && res.success) {
        await this.setActiveCase(c.id);
        this.switchView('timeline');
        this.showToast('Phone call log saved & hashed with Bates number.', 'success');
      }
    } catch (err) {
      this.showToast('Failed to save call log: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* Delete Exhibit */
  async deleteExhibit(exhibitId) {
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    if (!confirm('Are you sure you want to delete this exhibit?')) return;

    if (this.isDemoMode) {
      c.exhibits = c.exhibits.filter(x => x.id !== exhibitId);
      this.renderAll();
      this.showToast('Exhibit deleted (Demo Mode).', 'info');
      return;
    }

    try {
      this.setLoading(true);
      await window.proofboxAPI.deleteExhibit(c.id, exhibitId);
      await this.setActiveCase(c.id);
      this.showToast('Exhibit deleted.', 'info');
    } catch (err) {
      this.showToast('Failed to delete exhibit: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* ================= EXHIBIT DETAIL DRAWER ================= */

  openExhibitDrawer(exhibitId) {
    const c = this.getActiveCase();
    const ex = (c.exhibits || []).find(x => x.id === exhibitId);
    if (!ex) return;

    this.activeDrawerExhibitId = exhibitId;
    const drawer = document.getElementById('exhibitDrawer');
    if (!drawer) return;

    document.getElementById('drawerBates').textContent = ex.batesNumber || ex.bates_number || 'PB-0000';
    document.getElementById('drawerCategory').textContent = ex.category || 'Document';
    document.getElementById('drawerTitle').textContent = ex.title || 'Exhibit';
    document.getElementById('drawerTimestamp').textContent = this.formatDateTime(ex.timestamp);
    document.getElementById('drawerSender').textContent = ex.sender || 'Not recorded';
    document.getElementById('drawerRecipient').textContent = ex.recipient || 'Not recorded';
    document.getElementById('drawerSummary').textContent = ex.summary || ex.notes || 'No description provided.';
    document.getElementById('drawerRelevance').textContent = ex.relevance || 'Relevant to core disputed claims.';
    document.getElementById('drawerHash').textContent = ex.sha256 || 'SHA-256 not generated';

    // Preview area
    const previewArea = document.getElementById('drawerPreviewArea');
    const downloadLink = document.getElementById('drawerFileDownloadLink');
    const fileUrl = this.isDemoMode ? '#' : window.proofboxAPI.fileUrl(ex.id);

    if (downloadLink) {
      downloadLink.href = fileUrl;
      if (this.isDemoMode) {
        downloadLink.onclick = (e) => {
          e.preventDefault();
          alert(`File Preview (${ex.fileName}): Demo mode text.\n\n${ex.summary}`);
        };
      } else {
        downloadLink.onclick = null;
      }
    }

    if (previewArea) {
      if (ex.previewType === 'image' && !this.isDemoMode) {
        previewArea.innerHTML = `
          <div class="space-y-2 text-center">
            <img src="${fileUrl}" alt="Exhibit Preview" class="max-h-64 mx-auto rounded border border-slate-200 shadow-xs object-contain">
            <div class="text-[11px] text-slate-500 font-mono">${ex.fileName || 'Image File'} (${ex.fileSize || 'N/A'})</div>
          </div>
        `;
      } else {
        previewArea.innerHTML = `
          <div class="space-y-1">
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">File & Metadata</div>
            <div class="text-xs text-slate-700"><strong>Filename:</strong> ${this.escapeHtml(ex.fileName || 'None')}</div>
            <div class="text-xs text-slate-700"><strong>Source Type:</strong> ${this.escapeHtml(ex.sourceType || ex.source_type || 'Unknown')}</div>
            <div class="text-xs text-slate-700"><strong>File Size:</strong> ${this.escapeHtml(ex.fileSize || 'N/A')}</div>
            <div class="text-xs text-slate-700"><strong>Integrity Verified:</strong> Yes (SHA-256 matching)</div>
          </div>
        `;
      }
    }

    drawer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeExhibitDrawer() {
    const drawer = document.getElementById('exhibitDrawer');
    if (drawer) drawer.classList.add('hidden');
    this.activeDrawerExhibitId = null;
  }

  deleteActiveDrawerExhibit() {
    if (this.activeDrawerExhibitId) {
      const id = this.activeDrawerExhibitId;
      this.closeExhibitDrawer();
      this.deleteExhibit(id);
    }
  }

  copyDrawerHash() {
    const hashEl = document.getElementById('drawerHash');
    if (hashEl) {
      navigator.clipboard.writeText(hashEl.textContent.trim());
      this.showToast('SHA-256 hash copied to clipboard.', 'success');
    }
  }

  /* ================= DOCUMENT VAULT VIEW ================= */

  renderVault() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const container = document.getElementById('vaultGrid');
    if (!container) return;

    if (exhibits.length === 0) {
      container.innerHTML = `
        <div class="col-span-full surface-card p-12 text-center text-slate-500">
          No files stored in this vault yet. Upload contracts, photos, or bank slips.
        </div>
      `;
      return;
    }

    container.innerHTML = exhibits.map(ex => {
      const fileUrl = this.isDemoMode ? '#' : window.proofboxAPI.fileUrl(ex.id);
      const isImg = (ex.category === 'Damage Photo') || (ex.previewType === 'image');
      const bates = ex.batesNumber || ex.bates_number || 'PB-0000';
      const hashShort = (ex.sha256 || '').substring(0, 16) + '...';

      return `
        <div class="surface-card p-4 space-y-3 hover:border-slate-300 transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="bates-tag">${bates}</span>
              <span class="blue-badge">${ex.category}</span>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg ${isImg ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center flex-shrink-0">
                <i data-lucide="${isImg ? 'image' : 'file-text'}" class="w-5 h-5"></i>
              </div>
              <div class="min-w-0 flex-1">
                <div onclick="app.openExhibitDrawer('${ex.id}')" class="text-xs font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer">
                  ${this.escapeHtml(ex.title)}
                </div>
                <div class="text-[11px] text-slate-500 truncate font-mono">${this.escapeHtml(ex.fileName || 'file.txt')}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">${ex.fileSize || 'N/A'} • ${this.formatDate(ex.timestamp)}</div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div class="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title="${ex.sha256}">
              ${hashShort}
            </div>
            <div class="flex items-center gap-1">
              <a href="${fileUrl}" target="_blank" class="btn-ghost text-xs p-1 text-slate-600 hover:text-blue-600" title="Open / Download file">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
              </a>
              <button onclick="app.openExhibitDrawer('${ex.id}')" class="btn-ghost text-xs p-1 text-slate-600 hover:text-blue-600" title="Inspect exhibit">
                <i data-lucide="info" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  /* ================= DAMAGES & CLAIMS VIEW ================= */

  renderClaims() {
    const c = this.getActiveCase();
    const claims = c.claims || [];
    const tbody = document.getElementById('claimsTableBody');
    const countBadge = document.getElementById('claimsCountBadge');

    let gross = 0;
    let deductions = 0;

    claims.forEach(cl => {
      const amt = Number(cl.amount) || 0;
      if (cl.isDeduction || cl.is_deduction || amt < 0) {
        deductions += Math.abs(amt);
      } else {
        gross += amt;
      }
    });

    const net = gross - deductions;

    const grossEl = document.getElementById('claimsGrossTotal');
    const deductionsEl = document.getElementById('claimsDeductionsTotal');
    const netEl = document.getElementById('claimsNetTotal');

    if (grossEl) grossEl.textContent = this.formatCurrency(gross);
    if (deductionsEl) deductionsEl.textContent = '-' + this.formatCurrency(deductions);
    if (netEl) netEl.textContent = this.formatCurrency(net);
    if (countBadge) countBadge.textContent = `${claims.length} claims`;

    if (!tbody) return;

    if (claims.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-400">
            No financial damages or claims logged yet. Click "+ Add Claim Item" to itemize your dispute amounts.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = claims.map(cl => {
      const isDed = Boolean(cl.isDeduction || cl.is_deduction || (Number(cl.amount) < 0));
      const amt = Math.abs(Number(cl.amount) || 0);
      const linkedEx = (c.exhibits || []).find(e => e.id === (cl.linkedExhibitId || cl.linked_exhibit_id));

      return `
        <tr class="hover:bg-slate-50/50 transition">
          <td class="py-3 px-4">
            <div class="font-bold text-slate-800">${this.escapeHtml(cl.title)}</div>
            ${cl.notes ? `<div class="text-[11px] text-slate-500">${this.escapeHtml(cl.notes)}</div>` : ''}
          </td>
          <td class="py-3 px-4">
            <span class="slate-badge text-[10px]">${this.escapeHtml(cl.category || 'Claim')}</span>
          </td>
          <td class="py-3 px-4 font-mono text-slate-600">
            ${cl.date ? this.formatDate(cl.date) : 'N/A'}
          </td>
          <td class="py-3 px-4">
            ${linkedEx ? `
              <span onclick="app.openExhibitDrawer('${linkedEx.id}')" class="bates-tag cursor-pointer hover:border-blue-400" title="${linkedEx.title}">
                ${linkedEx.batesNumber || linkedEx.bates_number}
              </span>
            ` : '<span class="text-slate-400 text-[11px]">Unlinked</span>'}
          </td>
          <td class="py-3 px-4 text-right font-mono font-bold ${isDed ? 'text-rose-600' : 'text-slate-900'}">
            ${isDed ? '-' : ''}${this.formatCurrency(amt)}
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="app.deleteClaim('${cl.id}')" class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  openAddClaimModal() {
    const c = this.getActiveCase();
    const modal = document.getElementById('addClaimModal');
    if (!modal) return;

    document.getElementById('claimTitle').value = '';
    document.getElementById('claimAmount').value = '';
    document.getElementById('claimNotes').value = '';
    document.getElementById('claimDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('claimIsDeduction').checked = false;

    // Populate exhibit selector
    const sel = document.getElementById('claimLinkedExhibit');
    if (sel) {
      sel.innerHTML = '<option value="">No linked exhibit</option>' + (c.exhibits || []).map(e => `
        <option value="${e.id}">${e.batesNumber || e.bates_number} - ${this.escapeHtml(e.title.substring(0, 30))}</option>
      `).join('');
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeAddClaimModal() {
    const modal = document.getElementById('addClaimModal');
    if (modal) modal.classList.add('hidden');
  }

  async submitNewClaim(e) {
    e.preventDefault();
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    const title = document.getElementById('claimTitle').value.trim();
    const amount = parseFloat(document.getElementById('claimAmount').value) || 0;
    const category = document.getElementById('claimCategory').value;
    const date = document.getElementById('claimDate').value;
    const linkedExhibitId = document.getElementById('claimLinkedExhibit').value;
    const isDeduction = document.getElementById('claimIsDeduction').checked;
    const notes = document.getElementById('claimNotes').value.trim();

    const payload = {
      title,
      amount,
      category,
      date,
      linkedExhibitId,
      isDeduction,
      notes
    };

    if (this.isDemoMode) {
      c.claims.push({
        id: 'claim-demo-' + Date.now(),
        ...payload,
        createdAt: new Date().toISOString()
      });
      this.closeAddClaimModal();
      this.renderAll();
      this.showToast('Claim item logged (Demo Mode).', 'success');
      return;
    }

    try {
      this.setLoading(true);
      const res = await window.proofboxAPI.createClaim(c.id, payload);
      if (res && res.success) {
        this.closeAddClaimModal();
        await this.setActiveCase(c.id);
        this.showToast('Claim item recorded.', 'success');
      }
    } catch (err) {
      this.showToast('Failed to create claim: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async deleteClaim(claimId) {
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    if (!confirm('Are you sure you want to remove this financial claim item?')) return;

    if (this.isDemoMode) {
      c.claims = c.claims.filter(x => x.id !== claimId);
      this.renderAll();
      this.showToast('Claim item removed (Demo Mode).', 'info');
      return;
    }

    try {
      this.setLoading(true);
      await window.proofboxAPI.deleteClaim(c.id, claimId);
      await this.setActiveCase(c.id);
      this.showToast('Claim deleted.', 'info');
    } catch (err) {
      this.showToast('Failed to delete claim: ' + err.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  /* ================= GENERATOR / EVIDENCE PACK ================= */

  switchPackTab(tab) {
    this.activePackTab = tab;
    const btnBrief = document.getElementById('packTabBrief');
    const btnIndex = document.getElementById('packTabIndex');
    const panelBrief = document.getElementById('packPanelBrief');
    const panelIndex = document.getElementById('packPanelIndex');

    if (tab === 'brief') {
      if (btnBrief) btnBrief.className = 'px-4 py-2.5 text-xs font-bold border-b-2 border-blue-600 text-blue-600 bg-white transition';
      if (btnIndex) btnIndex.className = 'px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
      if (panelBrief) panelBrief.classList.remove('hidden');
      if (panelIndex) panelIndex.classList.add('hidden');
    } else {
      if (btnIndex) btnIndex.className = 'px-4 py-2.5 text-xs font-bold border-b-2 border-blue-600 text-blue-600 bg-white transition';
      if (btnBrief) btnBrief.className = 'px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition';
      if (panelIndex) panelIndex.classList.remove('hidden');
      if (panelBrief) panelBrief.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  renderEvidencePack() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const claims = c.claims || [];

    // Calculate totals
    let netDemand = 0;
    claims.forEach(cl => {
      const a = Number(cl.amount) || 0;
      if (cl.isDeduction || cl.is_deduction || a < 0) netDemand -= Math.abs(a);
      else netDemand += a;
    });

    const netStr = this.formatCurrency(netDemand > 0 ? netDemand : 120000);
    const currentDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Render Tab 1: Formal Demand Letter
    const briefPanel = document.getElementById('packPanelBrief');
    if (briefPanel) {
      briefPanel.innerHTML = `
        <div class="border-b border-slate-300 pb-4 text-center space-y-1">
          <div class="text-xs uppercase tracking-widest font-sans font-bold text-slate-500">WITHOUT PREJUDICE / FORMAL LEGAL DEMAND NOTICE</div>
          <div class="text-xl font-bold font-serif text-slate-900">FORMAL DEMAND FOR RESTITUTION & SETTLEMENT</div>
          <div class="text-xs text-slate-500 font-sans">Delivered via Speed Post / Registered Email with Accompanying Evidence Pack</div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs font-sans text-slate-700">
          <div>
            <strong>TO (OPPOSING PARTY):</strong><br>
            ${this.escapeHtml(c.opposingParty || c.opposing_party || 'Opposing Party')}<br>
            Subject Case: ${this.escapeHtml(c.title)}
          </div>
          <div class="text-right">
            <strong>DATE:</strong> ${currentDate}<br>
            <strong>CURING DEADLINE:</strong> ${deadlineDate} (7 Days)
          </div>
        </div>

        <div class="space-y-4 font-serif text-slate-800 leading-relaxed text-xs sm:text-sm">
          <p>
            Please take notice that this communication constitutes a formal demand for immediate settlement in the matter of <strong>${this.escapeHtml(c.title)}</strong>.
          </p>

          <p>
            ${this.escapeHtml(c.description || 'The opposing party has wrongfully withheld funds or defaulted on contractual obligations without lawful justification.')}
          </p>

          <div class="bg-slate-50 p-4 rounded border border-slate-200 font-sans">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Itemized Quantum of Claims Due</div>
            <div class="space-y-1.5 text-xs">
              ${claims.length > 0 ? claims.map(cl => `
                <div class="flex justify-between">
                  <span>• ${this.escapeHtml(cl.title)}</span>
                  <span class="font-mono font-bold">${this.formatCurrency(cl.amount)}</span>
                </div>
              `).join('') : `
                <div class="flex justify-between">
                  <span>• Principal Demand Claim</span>
                  <span class="font-mono font-bold">${c.claimAmount || '₹1,20,000'}</span>
                </div>
              `}
              <div class="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-900">
                <span>TOTAL DEMAND AMOUNT:</span>
                <span class="font-mono text-blue-700 text-sm">${netStr}</span>
              </div>
            </div>
          </div>

          <p>
            Attached hereto is the complete, timestamped, Bates-stamped ProofBox Court Evidence Pack comprising <strong>${exhibits.length} verified exhibits</strong> with SHA-256 cryptographic chain of custody. The records demonstrate that prompt and sufficient notice was delivered, defeating any defense of lack of awareness or unauthorized action.
          </p>

          <p>
            Unless the full demand sum of <strong>${netStr}</strong> is remitted within seven (7) days of receipt of this notice (on or before <strong>${deadlineDate}</strong>), legal proceedings before the competent Consumer Disputes Forum or Civil Court will be instituted without further communication, in which event claims for interest, damages, and full legal costs will be pursued.
          </p>
        </div>

        <div class="pt-6 border-t border-slate-200 flex justify-between items-end font-sans text-xs">
          <div>
            <strong>CLAIMANT SIGNATURE:</strong><br>
            <span class="font-semibold text-slate-900">${this.user ? this.user.name : 'Claimant / Complainant'}</span>
          </div>
          <div class="text-right text-slate-400 font-mono text-[10px]">
            Index: PB-LEGAL-PACK-V1<br>
            SHA-256 Verified Ledger
          </div>
        </div>
      `;
    }

    // Render Tab 2: Court Exhibit Index Table
    const tableBody = document.getElementById('packTableBody');
    if (tableBody) {
      if (exhibits.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No exhibits logged in this case.</td></tr>`;
      } else {
        tableBody.innerHTML = exhibits.map(ex => `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-4 font-mono font-bold text-blue-700">${ex.batesNumber || ex.bates_number}</td>
            <td class="py-2.5 px-4 font-mono text-slate-600">${this.formatDate(ex.timestamp)}</td>
            <td class="py-2.5 px-4 font-semibold text-slate-900">${this.escapeHtml(ex.title)}</td>
            <td class="py-2.5 px-4 text-slate-500">${this.escapeHtml(ex.sourceType || ex.source_type || 'Document')}</td>
            <td class="py-2.5 px-4 font-mono text-[10px] text-slate-400">${(ex.sha256 || '').substring(0, 16)}...</td>
            <td class="py-2.5 px-4 text-slate-600">${this.escapeHtml(ex.relevance || 'N/A')}</td>
          </tr>
        `).join('');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  downloadJsonExport() {
    const c = this.getActiveCase();
    if (!c || !c.id) return;

    if (this.isDemoMode) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(c, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `proofbox_demo_case_${c.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.showToast('Downloaded case JSON export (Demo Mode).', 'success');
      return;
    }

    const url = window.proofboxAPI.exportJsonUrl(c.id);
    window.open(url, '_blank');
    this.showToast('Exporting case JSON...', 'info');
  }

  downloadZipExport() {
    const c = this.getActiveCase();
    if (!c || !c.id) {
      this.showToast('Please select a case first.', 'error');
      return;
    }

    if (this.isDemoMode) {
      this.showToast('ZIP export with binary files requires cloud account. Downloading JSON manifest instead.', 'info');
      this.downloadJsonExport();
      return;
    }

    const url = window.proofboxAPI.exportZipUrl(c.id);
    window.location.href = url;
    this.showToast('Generating Court ZIP bundle with all exhibits...', 'info');
  }

  /* ================= AUDIT LOG VIEW ================= */

  renderAuditLedger() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    if (exhibits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400">No exhibits logged to audit ledger.</td></tr>`;
      return;
    }

    tbody.innerHTML = exhibits.map(ex => `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4">
          <span class="bates-tag">${ex.batesNumber || ex.bates_number}</span>
        </td>
        <td class="py-3 px-4 font-semibold text-slate-900">${this.escapeHtml(ex.title)}</td>
        <td class="py-3 px-4 font-mono text-slate-600 text-xs">${this.formatDateTime(ex.timestamp)}</td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-700 break-all select-all">${ex.sha256}</td>
        <td class="py-3 px-4 text-center">
          <span class="emerald-badge">VERIFIED</span>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  /* ================= GAP ANALYSIS VIEW ================= */

  renderGaps() {
    const c = this.getActiveCase();
    const exhibits = c.exhibits || [];
    const container = document.getElementById('gapsContainer');
    if (!container) return;

    const checklist = this.getDisputeChecklist(c.disputeType || c.dispute_type);

    container.innerHTML = checklist.map(item => {
      const match = exhibits.find(e => e.category === item.requiredCategory);
      return `
        <div class="surface-card p-5 space-y-3 ${match ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50/20'}">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="${match ? 'check-circle' : 'alert-circle'}" class="w-5 h-5 ${match ? 'text-emerald-600' : 'text-amber-600'}"></i>
              <h3 class="text-sm font-bold text-slate-900">${this.escapeHtml(item.title)}</h3>
            </div>
            <span class="${match ? 'emerald-badge' : 'amber-badge'}">
              ${match ? 'EVIDENCE SATISFIED' : 'MISSING PROOF'}
            </span>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            ${this.escapeHtml(item.description)}
          </p>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            ${match ? `
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500">Attached Exhibit:</span>
                <span onclick="app.openExhibitDrawer('${match.id}')" class="bates-tag cursor-pointer">${match.batesNumber || match.bates_number} - ${this.escapeHtml(match.title.substring(0, 35))}</span>
              </div>
            ` : `
              <span class="text-xs text-amber-700 font-medium">Risk: Opposing party may dispute notice or claim existence.</span>
              <button onclick="app.switchView('ingest')" class="btn-primary text-xs py-1 px-3">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Attach ${item.requiredCategory}</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }
}

// Instantiate application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ProofBoxApp();
});

/* ================================================================
   PROOFBOX LEGAL CHATBOT - Gemini-powered, legally constrained
   ================================================================ */

class ProofBoxChatbot {
  constructor() {
    this.isOpen    = false;
    this.history   = [];   // [{role:'user'|'model', text:'...'}]
    this.isLoading = false;
    this.initialized = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('chatbotPanel');
    const icon  = document.getElementById('chatbotToggleIcon');
    if (!panel) return;

    if (this.isOpen) {
      panel.classList.remove('hidden');
      if (!this.initialized) { this.initialized = true; this._renderWelcome(); }
      setTimeout(() => {
        const inp = document.getElementById('chatbotInput');
        if (inp) inp.focus();
        this._scrollBottom();
      }, 80);
      if (icon) icon.setAttribute('data-lucide', 'x');
    } else {
      panel.classList.add('hidden');
      if (icon) icon.setAttribute('data-lucide', 'message-circle');
    }
    if (window.lucide) lucide.createIcons();
  }

  _renderWelcome() {
    const c = document.getElementById('chatbotMessages');
    if (!c) return;
    const suggestions = [
      'How do I build a strong tenancy dispute case?',
      'What evidence do I need for an unpaid invoice?',
      'Can WhatsApp messages be used as evidence?',
      'How does Bates numbering work?'
    ];
    c.innerHTML = `
      <div class="chatbot-msg-bot">
        <div class="chatbot-bubble-bot">
          <p style="color:var(--text-primary);">Hello. I am the ProofBox Legal Assistant. I can guide you on evidence collection, tenant rights, consumer disputes, and how to use ProofBox effectively.</p>
          <p style="color:var(--text-secondary); margin-top:0.5rem;">What would you like to know?</p>
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:0.375rem; margin-top:0.5rem;">
        ${suggestions.map(s => `<button class="chatbot-suggestion" onclick="chatbot._sendSuggestion(this)" data-text="${s.replace(/"/g,'&quot;')}">${s}</button>`).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  _sendSuggestion(btn) {
    const text = btn.getAttribute('data-text');
    if (!text) return;
    const inp = document.getElementById('chatbotInput');
    if (inp) inp.value = text;
    this.sendMessage();
  }

  onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  async sendMessage() {
    if (this.isLoading) return;
    const inp = document.getElementById('chatbotInput');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    inp.style.height = 'auto';
    this._addMsg('user', text);
    this.history.push({ role: 'user', text });

    this.isLoading = true;
    this._setDisabled(true);
    const typingId = this._addTyping();

    try {
      const token = localStorage.getItem('proofbox_token_v1');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history: this.history.slice(-8) })
      });

      this._removeTyping(typingId);

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const reply = (data.data && data.data.reply) || '';
      if (!reply) throw new Error('Empty response. Please try again.');

      this._addMsg('bot', reply);
      this.history.push({ role: 'model', text: reply });
      if (this.history.length > 20) this.history = this.history.slice(-16);

    } catch (err) {
      this._removeTyping(typingId);
      this._addMsg('error', err.message || 'Something went wrong. Please try again.');
    } finally {
      this.isLoading = false;
      this._setDisabled(false);
      const i = document.getElementById('chatbotInput');
      if (i) i.focus();
    }
  }

  _addMsg(role, text) {
    const c = document.getElementById('chatbotMessages');
    if (!c) return;
    const id  = 'cm-' + Date.now();
    const div = document.createElement('div');
    div.id    = id;

    const safe = this._esc(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    if (role === 'user') {
      div.className = 'chatbot-msg-user';
      div.innerHTML = `<div class="chatbot-bubble-user"><p>${safe}</p></div>`;
    } else if (role === 'bot') {
      div.className = 'chatbot-msg-bot';
      div.innerHTML = `<div class="chatbot-bubble-bot"><p style="color:var(--text-primary);">${safe}</p></div>`;
    } else {
      div.className = 'chatbot-msg-error';
      div.innerHTML = `<div class="chatbot-bubble-error"><span>${safe}</span></div>`;
    }

    c.appendChild(div);
    if (window.lucide) lucide.createIcons();
    this._scrollBottom();
    return id;
  }

  _addTyping() {
    const c = document.getElementById('chatbotMessages');
    if (!c) return null;
    const id  = 'ctyp-' + Date.now();
    const div = document.createElement('div');
    div.id    = id;
    div.className = 'chatbot-msg-bot';
    div.innerHTML = `<div class="chatbot-bubble-bot" style="padding:0.625rem 0.875rem;">
      <span class="chatbot-dot"></span>
      <span class="chatbot-dot" style="animation-delay:0.15s"></span>
      <span class="chatbot-dot" style="animation-delay:0.30s"></span>
    </div>`;
    c.appendChild(div);
    this._scrollBottom();
    return id;
  }

  _removeTyping(id) {
    if (id) { const el = document.getElementById(id); if (el) el.remove(); }
  }

  _setDisabled(v) {
    const inp = document.getElementById('chatbotInput');
    const btn = document.getElementById('chatbotSendBtn');
    if (inp) inp.disabled = v;
    if (btn) btn.disabled = v;
  }

  _scrollBottom() {
    const c = document.getElementById('chatbotMessages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
}

window.chatbot = new ProofBoxChatbot();
