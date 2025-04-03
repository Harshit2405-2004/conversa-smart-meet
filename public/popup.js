// Cache DOM elements
const elements = {
  // Containers
  loginContainer: document.getElementById('login-container'),
  mainContainer: document.getElementById('main-container'),
  meetingStatus: document.getElementById('meeting-status'),
  
  // User info
  userName: document.getElementById('user-name'),
  planBadge: document.getElementById('plan-badge'),
  transcriptionMinutes: document.getElementById('transcription-minutes'),
  aiQueries: document.getElementById('ai-queries'),
  
  // Buttons
  signinButton: document.getElementById('signin-button'),
  signupButton: document.getElementById('signup-button'),
  signoutButton: document.getElementById('signout-button'),
  openDashboard: document.getElementById('open-dashboard'),
  startRecording: document.getElementById('start-recording'),
  stopRecording: document.getElementById('stop-recording'),
  
  // Toggles
  transcriptionToggle: document.getElementById('transcription-toggle'),
  assistantToggle: document.getElementById('assistant-toggle'),
  summaryToggle: document.getElementById('summary-toggle'),
  
  // Meeting info
  meetingDuration: document.getElementById('meeting-duration'),
  recordingStatus: document.getElementById('recording-status'),
  
  // Links
  upgradeLink: document.getElementById('upgrade-link'),
  helpLink: document.getElementById('help-link')
};

// State management
let state = {
  isAuthenticated: false,
  user: null,
  activeTab: null,
  isInMeeting: false,
  isRecording: false,
  recordingDuration: 0,
  settings: {
    enableTranscription: true,
    enableAssistant: true,
    enableSummary: true
  }
};

// Initialize app
async function initApp() {
  await checkAuthState();
  await checkActiveTab();
  loadSettings();
  setupEventListeners();
  updateUI();
}

// Check if user is authenticated
async function checkAuthState() {
  try {
    const data = await chrome.storage.local.get('authData');
    if (data.authData) {
      state.isAuthenticated = true;
      state.user = data.authData;
    } else {
      state.isAuthenticated = false;
      state.user = null;
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    state.isAuthenticated = false;
    state.user = null;
  }
}

// Check if current tab is a Google Meet
async function checkActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  state.activeTab = tabs[0];
  state.isInMeeting = state.activeTab?.url?.includes('meet.google.com');
  
  if (state.isInMeeting) {
    // Check if recording is active
    chrome.tabs.sendMessage(state.activeTab.id, { action: 'getRecordingStatus' }, (response) => {
      if (response) {
        state.isRecording = response.isRecording;
        state.recordingDuration = response.duration || 0;
        updateUI();
      }
    });
  }
}

// Load user settings from storage
function loadSettings() {
  chrome.storage.local.get('meetAssistSettings', (data) => {
    if (data.meetAssistSettings) {
      state.settings = { ...state.settings, ...data.meetAssistSettings };
    }
  });
}

// Save user settings to storage
function saveSettings() {
  chrome.storage.local.set({ meetAssistSettings: state.settings });
}

// Set up event listeners
function setupEventListeners() {
  // Auth buttons
  elements.signinButton?.addEventListener('click', handleSignIn);
  elements.signupButton?.addEventListener('click', handleSignUp);
  elements.signoutButton?.addEventListener('click', handleSignOut);
  
  // Feature toggles
  elements.transcriptionToggle?.addEventListener('change', (e) => {
    state.settings.enableTranscription = e.target.checked;
    saveSettings();
    sendSettingsToContentScript();
  });
  
  elements.assistantToggle?.addEventListener('change', (e) => {
    state.settings.enableAssistant = e.target.checked;
    saveSettings();
    sendSettingsToContentScript();
  });
  
  elements.summaryToggle?.addEventListener('change', (e) => {
    state.settings.enableSummary = e.target.checked;
    saveSettings();
    sendSettingsToContentScript();
  });
  
  // Recording controls
  elements.startRecording?.addEventListener('click', startRecording);
  elements.stopRecording?.addEventListener('click', stopRecording);
  
  // Other actions
  elements.openDashboard?.addEventListener('click', openDashboard);
  elements.upgradeLink?.addEventListener('click', openUpgradePage);
  elements.helpLink?.addEventListener('click', openHelpPage);
}

// Send current settings to content script
function sendSettingsToContentScript() {
  if (state.isInMeeting && state.activeTab) {
    chrome.tabs.sendMessage(state.activeTab.id, { 
      action: 'updateSettings',
      settings: state.settings
    });
  }
}

// Update UI based on current state
function updateUI() {
  // Show/hide containers based on auth state
  if (elements.loginContainer) elements.loginContainer.style.display = state.isAuthenticated ? 'none' : 'block';
  if (elements.mainContainer) elements.mainContainer.style.display = state.isAuthenticated ? 'block' : 'none';
  
  // Show/hide meeting status based on whether in a meeting
  if (elements.meetingStatus) elements.meetingStatus.style.display = (state.isAuthenticated && state.isInMeeting) ? 'block' : 'none';
  
  // Update user info
  if (state.isAuthenticated && state.user) {
    if (elements.userName) elements.userName.textContent = state.user.name || state.user.email;
    if (elements.planBadge) {
      elements.planBadge.textContent = state.user.plan || 'Free';
      elements.planBadge.style.backgroundColor = state.user.plan === 'premium' ? '#10b981' : '#6366f1';
    }
    if (elements.transcriptionMinutes) elements.transcriptionMinutes.textContent = state.user.remainingTranscription || '0';
    if (elements.aiQueries) elements.aiQueries.textContent = state.user.remainingAIQueries || '0';
  }
  
  // Update toggles
  if (elements.transcriptionToggle) elements.transcriptionToggle.checked = state.settings.enableTranscription;
  if (elements.assistantToggle) elements.assistantToggle.checked = state.settings.enableAssistant;
  if (elements.summaryToggle) elements.summaryToggle.checked = state.settings.enableSummary;
  
  // Update recording UI
  if (elements.startRecording) elements.startRecording.style.display = state.isRecording ? 'none' : 'block';
  if (elements.stopRecording) elements.stopRecording.style.display = state.isRecording ? 'block' : 'none';
  if (elements.recordingStatus) elements.recordingStatus.textContent = state.isRecording ? 'Recording' : 'Not Recording';
  if (elements.recordingStatus) elements.recordingStatus.style.color = state.isRecording ? 'var(--success-color)' : 'var(--text-color)';
  
  if (state.isRecording && elements.meetingDuration) {
    const minutes = Math.floor(state.recordingDuration / 60);
    const seconds = state.recordingDuration % 60;
    elements.meetingDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Authentication handlers
async function handleSignIn() {
  openAuthPage('login');
}

async function handleSignUp() {
  openAuthPage('signup');
}

async function handleSignOut() {
  try {
    await chrome.storage.local.remove('authData');
    state.isAuthenticated = false;
    state.user = null;
    updateUI();
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// Open auth page in a new tab
function openAuthPage(type) {
  const baseUrl = 'https://yourappurl.com/auth';
  const url = `${baseUrl}?action=${type}&source=extension`;
  chrome.tabs.create({ url });
}

// Recording handlers
function startRecording() {
  if (state.isInMeeting && state.activeTab) {
    chrome.tabs.sendMessage(state.activeTab.id, { action: 'startRecording' });
    state.isRecording = true;
    updateUI();
  }
}

function stopRecording() {
  if (state.isInMeeting && state.activeTab) {
    chrome.tabs.sendMessage(state.activeTab.id, { action: 'stopRecording' });
    state.isRecording = false;
    updateUI();
  }
}

// Navigation handlers
function openDashboard() {
  const dashboardUrl = 'https://yourappurl.com';
  chrome.tabs.create({ url: dashboardUrl });
}

function openUpgradePage() {
  const upgradeUrl = 'https://yourappurl.com/subscription';
  chrome.tabs.create({ url: upgradeUrl });
}

function openHelpPage() {
  const helpUrl = 'https://yourappurl.com/help';
  chrome.tabs.create({ url: helpUrl });
}

// Initialize timer for recording duration
let durationTimer;
function startDurationTimer() {
  clearInterval(durationTimer);
  durationTimer = setInterval(() => {
    if (state.isRecording) {
      state.recordingDuration++;
      updateUI();
    }
  }, 1000);
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
startDurationTimer();
