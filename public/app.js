// State management
let allEmails = [];
let currentEmail = null;
let currentFilter = 'all';
let isGenerating = false;
let currentUser = null;
let presetUsers = [];
let copilotConfig = {
  connected: false,
  model: 'gpt-4o',
  statusMessage: 'Checking...'
};

// DOM Elements - Navigation & Inbox
const emailListEl = document.getElementById('emailList');
const unreadCountEl = document.getElementById('unreadCount');
const searchInput = document.getElementById('searchInput');

// Detail Pane Elements
const emptyStateEl = document.getElementById('emptyState');
const detailContentEl = document.getElementById('detailContent');
const viewSubject = document.getElementById('viewSubject');
const viewSender = document.getElementById('viewSender');
const viewEmail = document.getElementById('viewEmail');
const viewDate = document.getElementById('viewDate');
const viewAvatar = document.getElementById('viewAvatar');
const viewBody = document.getElementById('viewBody');
const statusTags = document.getElementById('statusTags');

// Response Editor Elements
const replyToAddress = document.getElementById('replyToAddress');
const replyFromAddress = document.getElementById('replyFromAddress');
const replyTextarea = document.getElementById('replyTextarea');
const toneSelect = document.getElementById('toneSelect');
const customInstructionInput = document.getElementById('customInstructionInput');
const btnApplyInstruction = document.getElementById('btnApplyInstruction');
const btnRefreshAi = document.getElementById('btnRefreshAi');
const btnSendReply = document.getElementById('btnSendReply');
const btnCopyReply = document.getElementById('btnCopyReply');
const aiModelIndicator = document.getElementById('aiModelIndicator');
const aiUserSignatureHint = document.getElementById('aiUserSignatureHint');
const saveStatus = document.getElementById('saveStatus');

// Auth & Profile Elements
const authSection = document.getElementById('authSection');
const signInModal = document.getElementById('signInModal');
const btnCloseSignIn = document.getElementById('btnCloseSignIn');
const tabQuickSignIn = document.getElementById('tabQuickSignIn');
const tabCustomSignIn = document.getElementById('tabCustomSignIn');
const quickSignInSection = document.getElementById('quickSignInSection');
const customSignInForm = document.getElementById('customSignInForm');
const presetUserGrid = document.getElementById('presetUserGrid');
const btnSubmitCustomSignIn = document.getElementById('btnSubmitCustomSignIn');
const btnCancelCustomSignIn = document.getElementById('btnCancelCustomSignIn');

const profileModal = document.getElementById('profileModal');
const btnCloseProfile = document.getElementById('btnCloseProfile');
const btnCancelProfile = document.getElementById('btnCancelProfile');
const btnSaveProfile = document.getElementById('btnSaveProfile');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileRole = document.getElementById('profileRole');

// Copilot Config Elements
const btnConfigModal = document.getElementById('btnConfigModal');
const configModal = document.getElementById('configModal');
const btnCloseConfig = document.getElementById('btnCloseConfig');
const btnCancelConfig = document.getElementById('btnCancelConfig');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const copilotModelSelect = document.getElementById('copilotModelSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const keyStatusText = document.getElementById('keyStatusText');
const copilotConnectionStatus = document.getElementById('copilotConnectionStatus');
const btnTestCopilot = document.getElementById('btnTestCopilot');
const testResultText = document.getElementById('testResultText');

// Simulation Modal Elements
const btnNewSimulation = document.getElementById('btnNewSimulation');
const simModal = document.getElementById('simModal');
const btnCloseSim = document.getElementById('btnCloseSim');
const btnCancelSim = document.getElementById('btnCancelSim');
const btnSubmitSim = document.getElementById('btnSubmitSim');
const toastNotification = document.getElementById('toastNotification');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await checkCopilotConfig();
  await fetchEmails();
  setupEventListeners();
});

// ==================== AUTHENTICATION & PROFILES ====================

async function initAuth() {
  try {
    const res = await fetch('/api/auth/current-user');
    const data = await res.json();
    presetUsers = data.presets || [];

    // Check localStorage for preferred logged-in user
    const savedUserJson = localStorage.getItem('assistant_current_user');
    if (savedUserJson) {
      try {
        currentUser = JSON.parse(savedUserJson);
      } catch (e) {
        currentUser = data.user;
      }
    } else {
      currentUser = data.user || presetUsers[0];
    }
  } catch (err) {
    console.error('Failed to load user session:', err);
    currentUser = {
      id: 'user_default',
      name: 'Diamond Mutua',
      email: 'diamondmutua07@gmail.com',
      role: 'Full-Stack AI Architect',
      avatarColor: '#0284c7',
      initials: 'DM'
    };
  }
  renderAuthUI();
  renderPresetGrid();
}

function renderAuthUI() {
  if (!currentUser) {
    authSection.innerHTML = `
      <button class="btn btn-primary btn-signin" id="btnSignInModal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Sign In</span>
      </button>
    `;
    const btnSignIn = document.getElementById('btnSignInModal');
    if (btnSignIn) {
      btnSignIn.addEventListener('click', () => openSignInModal());
    }
    if (replyFromAddress) replyFromAddress.textContent = 'Not signed in';
    if (aiUserSignatureHint) aiUserSignatureHint.textContent = 'Sign in to customize response signature';
    return;
  }

  const initials = currentUser.initials || currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColor = currentUser.avatarColor || '#0284c7';

  authSection.innerHTML = `
    <div class="user-menu-wrapper" id="userMenuWrapper">
      <button class="user-profile-btn" id="btnUserProfile" title="View Account Details">
        <div class="user-avatar" id="headerAvatar" style="background-color: ${avatarColor};">${initials}</div>
        <div class="user-profile-meta">
          <span class="user-name-label" id="headerUserName">${escapeHtml(currentUser.name)}</span>
          <span class="user-role-sublabel" id="headerUserRole">${escapeHtml(currentUser.role || 'Member')}</span>
        </div>
        <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-header">
          <div class="dropdown-avatar-large" style="background-color: ${avatarColor};">${initials}</div>
          <div class="dropdown-details">
            <div class="dropdown-name">${escapeHtml(currentUser.name)}</div>
            <div class="dropdown-email">${escapeHtml(currentUser.email)}</div>
            <div class="dropdown-badge">${escapeHtml(currentUser.role || 'Verified User')}</div>
          </div>
        </div>

        <div class="dropdown-copilot-pill">
          <span class="pulse-indicator"></span>
          <span>Copilot: <strong id="dropdownCopilotStatus">${copilotConfig.connected ? 'Active (' + copilotConfig.model + ')' : 'Smart Local Mode'}</strong></span>
        </div>

        <div class="dropdown-actions">
          <button class="dropdown-action-btn" id="btnEditProfile">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Edit Profile & Signature</span>
          </button>
          <button class="dropdown-action-btn" id="btnSwitchAccount">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span>Switch Account / Sign In</span>
          </button>
          <button class="dropdown-action-btn action-danger" id="btnSignOut">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  `;

  if (replyFromAddress) {
    replyFromAddress.textContent = `${currentUser.name} <${currentUser.email}>`;
  }
  if (aiUserSignatureHint) {
    aiUserSignatureHint.textContent = `Signing as ${currentUser.name}`;
  }

  // Attach dropdown toggle & action handlers
  const userMenuWrapper = document.getElementById('userMenuWrapper');
  const btnUserProfile = document.getElementById('btnUserProfile');
  if (btnUserProfile) {
    btnUserProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenuWrapper.classList.toggle('open');
    });
  }

  const btnEditProfile = document.getElementById('btnEditProfile');
  if (btnEditProfile) {
    btnEditProfile.addEventListener('click', () => {
      userMenuWrapper.classList.remove('open');
      openProfileModal();
    });
  }

  const btnSwitchAccount = document.getElementById('btnSwitchAccount');
  if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', () => {
      userMenuWrapper.classList.remove('open');
      openSignInModal();
    });
  }

  const btnSignOut = document.getElementById('btnSignOut');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', handleSignOut);
  }
}

function renderPresetGrid() {
  if (!presetUserGrid) return;
  presetUserGrid.innerHTML = presetUsers.map(user => {
    const isActive = currentUser && currentUser.email === user.email;
    return `
      <div class="preset-user-card ${isActive ? 'active-user' : ''}" onclick="selectPresetUser('${user.id}')">
        <div class="preset-card-left">
          <div class="preset-avatar" style="background-color: ${user.avatarColor || '#0284c7'};">
            ${user.initials}
          </div>
          <div class="preset-info">
            <span class="preset-name">${escapeHtml(user.name)}</span>
            <span class="preset-email">${escapeHtml(user.email)}</span>
            <span class="preset-role">${escapeHtml(user.role || '')}</span>
          </div>
        </div>
        <div class="preset-badge">
          ${user.provider === 'github' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg> Copilot Linked' : 'Standard'}
        </div>
      </div>
    `;
  }).join('');
}

async function selectPresetUser(userId) {
  const selected = presetUsers.find(u => u.id === userId);
  if (!selected) return;

  try {
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected)
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('assistant_current_user', JSON.stringify(currentUser));
      signInModal.classList.remove('open');
      renderAuthUI();
      renderPresetGrid();
      showToast(`Welcome back, ${currentUser.name}!`, 'success');
      if (currentEmail) generateRecommendation(currentEmail);
    }
  } catch (err) {
    showToast('Failed to switch user');
  }
}

async function handleCustomSignIn(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('customName').value.trim();
  const email = document.getElementById('customEmail').value.trim();
  const role = document.getElementById('customRole').value.trim() || 'Professional';
  const githubUsername = document.getElementById('customGithub').value.trim();

  if (!name || !email) {
    showToast('Name and email are required');
    return;
  }

  try {
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, githubUsername, provider: 'custom' })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('assistant_current_user', JSON.stringify(currentUser));
      signInModal.classList.remove('open');
      renderAuthUI();
      renderPresetGrid();
      showToast(`Signed in as ${currentUser.name}`, 'success');
      if (currentEmail) generateRecommendation(currentEmail);
    }
  } catch (err) {
    showToast('Sign-in failed');
  }
}

async function handleSignOut() {
  try {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    currentUser = null;
    localStorage.removeItem('assistant_current_user');
    renderAuthUI();
    renderPresetGrid();
    showToast('Signed out of Email Assistant');
    if (currentEmail) generateRecommendation(currentEmail);
  } catch (err) {
    showToast('Error signing out');
  }
}

function openSignInModal() {
  signInModal.classList.add('open');
  renderPresetGrid();
}

function openProfileModal() {
  if (!currentUser) return;
  profileName.value = currentUser.name || '';
  profileEmail.value = currentUser.email || '';
  profileRole.value = currentUser.role || '';
  profileModal.classList.add('open');
}

async function saveProfile() {
  const name = profileName.value.trim();
  const email = profileEmail.value.trim();
  const role = profileRole.value.trim();

  if (!name || !email) {
    showToast('Name and email cannot be empty');
    return;
  }

  currentUser.name = name;
  currentUser.email = email;
  currentUser.role = role;
  currentUser.initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  localStorage.setItem('assistant_current_user', JSON.stringify(currentUser));
  await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentUser)
  });

  profileModal.classList.remove('open');
  renderAuthUI();
  showToast('Profile updated!', 'success');
  if (currentEmail) generateRecommendation(currentEmail);
}

// ==================== COPILOT CONFIGURATION ====================

async function checkCopilotConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    copilotConfig = data;

    if (copilotModelSelect) copilotModelSelect.value = data.model || 'gpt-4o';

    if (data.connected) {
      copilotConnectionStatus.textContent = 'Copilot Connected (' + data.model + ')';
      copilotConnectionStatus.className = 'copilot-connection-badge';
      keyStatusText.textContent = 'Active GitHub token verified for ' + (data.githubAccount || 'user') + ' (' + data.maskedToken + ')';
      keyStatusText.style.color = 'var(--accent-teal)';
    } else if (data.hasToken) {
      copilotConnectionStatus.textContent = 'Token Configured';
      copilotConnectionStatus.className = 'copilot-connection-badge';
      keyStatusText.textContent = data.statusMessage || 'Token configured.';
      keyStatusText.style.color = '#38bdf8';
    } else {
      copilotConnectionStatus.textContent = 'Offline Mode';
      copilotConnectionStatus.className = 'copilot-connection-badge offline';
      keyStatusText.textContent = 'No key set. Using smart local assistant.';
      keyStatusText.style.color = 'var(--text-muted)';
    }

    const dropdownStatus = document.getElementById('dropdownCopilotStatus');
    if (dropdownStatus) {
      dropdownStatus.textContent = data.connected ? 'Active (' + data.model + ')' : 'Smart Local Mode';
    }
  } catch (e) {
    console.error('Failed to check Copilot config:', e);
  }
}

async function saveCopilotConfig() {
  const apiKey = apiKeyInput.value.trim();
  const model = copilotModelSelect.value;
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model })
    });
    await res.json();
    configModal.classList.remove('open');
    showToast('Copilot settings saved!', 'success');
    await checkCopilotConfig();
    if (currentEmail) generateRecommendation(currentEmail);
  } catch (e) {
    showToast('Error saving settings');
  }
}

async function testCopilotConnection() {
  testResultText.textContent = 'Pinging GitHub Copilot API...';
  testResultText.style.color = '#38bdf8';
  btnTestCopilot.disabled = true;

  try {
    const res = await fetch('/api/copilot/test', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      testResultText.textContent = `Online (${data.latencyMs}ms) • Model: ${data.model}`;
      testResultText.style.color = 'var(--accent-teal)';
      showToast('Copilot connection confirmed!', 'success');
      await checkCopilotConfig();
    } else {
      testResultText.textContent = `Error: ${data.error}`;
      testResultText.style.color = 'var(--accent-rose)';
    }
  } catch (err) {
    testResultText.textContent = 'Connection test failed';
    testResultText.style.color = 'var(--accent-rose)';
  } finally {
    btnTestCopilot.disabled = false;
  }
}

// ==================== EMAILS & COPILOT DRAFTS ====================

async function fetchEmails() {
  try {
    const res = await fetch('/api/emails');
    allEmails = await res.json();
    renderEmailList();

    if (!currentEmail && allEmails.length > 0) {
      const firstUnread = allEmails.find(e => e.unread) || allEmails[0];
      selectEmail(firstUnread.id);
    }
  } catch (err) {
    console.error('Failed to load emails:', err);
    showToast('Failed to load emails from local server');
  }
}

function renderEmailList() {
  const query = searchInput.value.toLowerCase().trim();
  let filtered = allEmails.filter(email => {
    const matchesFilter = currentFilter === 'all' || (currentFilter === 'unread' && email.unread);
    const matchesQuery = !query || 
      (email.sender && email.sender.toLowerCase().includes(query)) ||
      (email.subject && email.subject.toLowerCase().includes(query)) ||
      (email.body && email.body.toLowerCase().includes(query));
    return matchesFilter && matchesQuery;
  });

  const unreadTotal = allEmails.filter(e => e.unread).length;
  unreadCountEl.textContent = unreadTotal + ' unread';

  if (filtered.length === 0) {
    emailListEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No emails match your view</div>';
    return;
  }

  emailListEl.innerHTML = filtered.map(email => {
    const isSelected = currentEmail && currentEmail.id === email.id;
    const initials = (email.sender || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
      <div class="mail-item ${email.unread ? 'unread' : ''} ${isSelected ? 'selected' : ''}" onclick="selectEmail('${email.id}')">
        ${email.unread ? '<div class="unread-dot"></div>' : ''}
        <div class="mail-avatar" style="background-color: ${email.avatarColor || '#0284c7'}">
          ${initials}
        </div>
        <div class="mail-info">
          <div class="mail-info-top">
            <span class="mail-sender">${escapeHtml(email.sender)}</span>
            <span class="mail-date">${escapeHtml(email.date)}</span>
          </div>
          <div class="mail-subject">${escapeHtml(email.subject)}</div>
          <div class="mail-snippet">${escapeHtml((email.body || '').substring(0, 60))}...</div>
          ${email.replied ? '<div class="replied-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Replied</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function selectEmail(id) {
  const email = allEmails.find(e => e.id === id);
  if (!email) return;

  currentEmail = email;
  renderEmailList();

  if (email.unread) {
    email.unread = false;
    fetch('/api/emails/' + id + '/read', { method: 'POST' });
    renderEmailList();
  }

  emptyStateEl.style.display = 'none';
  detailContentEl.style.display = 'flex';

  viewSubject.textContent = email.subject;
  viewSender.textContent = email.sender;
  viewEmail.textContent = email.email;
  viewDate.textContent = email.date;
  viewBody.textContent = email.body;

  const initials = (email.sender || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  viewAvatar.textContent = initials;
  viewAvatar.style.backgroundColor = email.avatarColor || '#0284c7';

  replyToAddress.textContent = email.email;
  if (currentUser) {
    replyFromAddress.textContent = `${currentUser.name} <${currentUser.email}>`;
  }

  let tagsHtml = '';
  if (email.unread) tagsHtml += '<span class="badge" style="background:#0284c7;color:#fff;">New</span>';
  if (email.replied) tagsHtml += '<span class="badge" style="background:#10b981;color:#fff;">Replied</span>';
  statusTags.innerHTML = tagsHtml;

  generateRecommendation(email);
}

async function generateRecommendation(email) {
  if (isGenerating) return;
  isGenerating = true;

  replyTextarea.value = 'GitHub Copilot is drafting a contextual response...';
  replyTextarea.disabled = true;
  btnSendReply.disabled = true;
  aiModelIndicator.textContent = 'Copilot analyzing email context...';

  const tone = toneSelect.value;
  const instructions = customInstructionInput.value.trim();

  try {
    const res = await fetch('/api/recommend-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        tone,
        instructions,
        userProfile: currentUser
      })
    });

    const data = await res.json();
    replyTextarea.value = data.recommendation;

    if (data.source === 'github-copilot') {
      aiModelIndicator.textContent = `Drafted with GitHub Copilot (${data.model || 'GPT-4o'})`;
    } else {
      aiModelIndicator.textContent = 'Drafted with Smart Contextual Assistant';
    }

    if (currentUser) {
      aiUserSignatureHint.textContent = `Signed as ${currentUser.name}`;
    }

    if (data.notice) {
      saveStatus.textContent = data.notice;
    } else {
      saveStatus.textContent = 'Draft ready to review & send';
    }
  } catch (err) {
    console.error('Error generating recommendation:', err);
    const signName = currentUser ? currentUser.name : 'Diamond Mutua';
    replyTextarea.value = `Hi ${(email.sender || 'there').split(' ')[0]},\n\nThank you for reaching out regarding "${email.subject}".\n\nI am reviewing the deliverables with the team and will follow up shortly.\n\nBest regards,\n${signName}`;
    aiModelIndicator.textContent = 'Draft created (Offline fallback)';
  } finally {
    isGenerating = false;
    replyTextarea.disabled = false;
    btnSendReply.disabled = false;
  }
}

async function handleSendReply() {
  if (!currentEmail) return;

  const body = replyTextarea.value.trim();
  if (!body) {
    showToast('Reply message cannot be empty');
    return;
  }

  btnSendReply.disabled = true;
  btnSendReply.innerHTML = 'Sending...';

  try {
    const res = await fetch('/api/send-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: currentEmail.id,
        to: currentEmail.email,
        subject: currentEmail.subject,
        body: body,
        senderUser: currentUser
      })
    });

    const data = await res.json();
    showToast(`Response sent to ${currentEmail.sender}!`, 'success');
    currentEmail.replied = true;
    renderEmailList();
    statusTags.innerHTML = '<span class="badge" style="background:#10b981;color:#fff;">Replied</span>';
  } catch (err) {
    showToast('Failed to send reply');
  } finally {
    btnSendReply.disabled = false;
    btnSendReply.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      <span>Review & Send Reply</span>
    `;
  }
}

async function submitSimulatedEmail() {
  const sender = document.getElementById('simSender').value.trim();
  const email = document.getElementById('simEmail').value.trim();
  const subject = document.getElementById('simSubject').value.trim();
  const body = document.getElementById('simBody').value.trim();

  if (!sender || !subject || !body) {
    showToast('Please fill out all fields');
    return;
  }

  try {
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, email, subject, body })
    });

    const data = await res.json();
    simModal.classList.remove('open');
    showToast('Simulated email arrived!', 'success');
    await fetchEmails();
    if (data.email) selectEmail(data.email.id);
  } catch (err) {
    showToast('Failed to add simulated email');
  }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Global click to close dropdowns
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('userMenuWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      wrapper.classList.remove('open');
    }
  });

  // Search
  searchInput.addEventListener('input', () => renderEmailList());

  // Filter tabs
  document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tabs .tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.getAttribute('data-filter');
      renderEmailList();
    });
  });

  // AI Controls
  btnRefreshAi.addEventListener('click', () => {
    if (currentEmail) generateRecommendation(currentEmail);
  });

  toneSelect.addEventListener('change', () => {
    if (currentEmail) generateRecommendation(currentEmail);
  });

  btnApplyInstruction.addEventListener('click', () => {
    if (currentEmail) generateRecommendation(currentEmail);
  });

  btnCopyReply.addEventListener('click', () => {
    navigator.clipboard.writeText(replyTextarea.value);
    showToast('Draft copied to clipboard!', 'success');
  });

  btnSendReply.addEventListener('click', handleSendReply);

  replyTextarea.addEventListener('input', () => {
    saveStatus.textContent = 'Draft edited';
    setTimeout(() => {
      saveStatus.textContent = 'Ready to send';
    }, 1500);
  });

  // Auth / Sign In Modal
  btnCloseSignIn.addEventListener('click', () => signInModal.classList.remove('open'));
  tabQuickSignIn.addEventListener('click', () => {
    tabQuickSignIn.classList.add('active');
    tabCustomSignIn.classList.remove('active');
    quickSignInSection.style.display = 'block';
    customSignInForm.style.display = 'none';
  });
  tabCustomSignIn.addEventListener('click', () => {
    tabCustomSignIn.classList.add('active');
    tabQuickSignIn.classList.remove('active');
    quickSignInSection.style.display = 'none';
    customSignInForm.style.display = 'block';
  });
  btnCancelCustomSignIn.addEventListener('click', () => {
    tabQuickSignIn.click();
  });
  btnSubmitCustomSignIn.addEventListener('click', handleCustomSignIn);

  // Profile Modal
  btnCloseProfile.addEventListener('click', () => profileModal.classList.remove('open'));
  btnCancelProfile.addEventListener('click', () => profileModal.classList.remove('open'));
  btnSaveProfile.addEventListener('click', saveProfile);

  // Copilot Settings Modal
  btnConfigModal.addEventListener('click', () => {
    checkCopilotConfig();
    configModal.classList.add('open');
  });
  btnCloseConfig.addEventListener('click', () => configModal.classList.remove('open'));
  btnCancelConfig.addEventListener('click', () => configModal.classList.remove('open'));
  btnSaveConfig.addEventListener('click', saveCopilotConfig);
  btnTestCopilot.addEventListener('click', testCopilotConnection);

  // Simulation Modal
  btnNewSimulation.addEventListener('click', () => simModal.classList.add('open'));
  btnCloseSim.addEventListener('click', () => simModal.classList.remove('open'));
  btnCancelSim.addEventListener('click', () => simModal.classList.remove('open'));
  btnSubmitSim.addEventListener('click', submitSimulatedEmail);
}

// Toast helper
function showToast(message, type = '') {
  toastNotification.textContent = message;
  toastNotification.className = 'toast show ' + type;
  setTimeout(() => {
    toastNotification.className = 'toast';
  }, 3500);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
