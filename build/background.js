
// Background service worker for MeetAssist Chrome Extension
console.log('MeetAssist background service worker initialized');

// Initialize Google Cloud configuration
const GCP_CONFIG = {
  projectId: 'meetassist-extension',
  apiEndpoint: 'https://meetassist.app/api',
  region: 'us-central1'
};

// Language support configuration
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'hi-IN', name: 'Hindi' }
];

// Listen for installation event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('Extension installed');
    // Open onboarding page
    chrome.tabs.create({
      url: 'https://meetassist.app/welcome?source=extension'
    });
    
    // Initialize default settings
    chrome.storage.local.set({
      meetAssistSettings: {
        enableTranscription: true,
        enableAssistant: true,
        enableSummary: true,
        deleteAfter24h: true,
        chunking30min: true,
        preferredLanguage: 'en-US',
        enableVoiceCommands: true,
        collaborationTools: {
          googleDocs: true,
          notion: false
        },
        analyticsConsent: true
      }
    });
    
    // Set up compatibility check schedule
    scheduleCompatibilityCheck();
  } else if (details.reason === 'update') {
    // Extension was updated
    console.log('Extension updated');
    // Check for compatibility issues
    checkGoogleMeetCompatibility();
  }
});

// Schedule regular compatibility checks
function scheduleCompatibilityCheck() {
  // Check every 3 days
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  
  chrome.alarms.create('compatibilityCheck', {
    delayInMinutes: 60, // First check after 1 hour
    periodInMinutes: THREE_DAYS_MS / (60 * 1000) // Convert ms to minutes
  });
}

// Listen for scheduled alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'compatibilityCheck') {
    checkGoogleMeetCompatibility();
  }
});

// Check Google Meet compatibility with our extension
async function checkGoogleMeetCompatibility() {
  try {
    console.log('Checking Google Meet compatibility...');
    
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/compatibility-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.needsUpdate) {
      // Notify user about compatibility issues
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'MeetAssist Update Required',
        message: data.message || 'Google Meet has been updated. Please update MeetAssist extension for continued functionality.',
        priority: 2
      });
      
      // Store compatibility status
      chrome.storage.local.set({
        compatibilityStatus: {
          isCompatible: false,
          lastChecked: new Date().toISOString(),
          message: data.message
        }
      });
    } else {
      // Store positive compatibility status
      chrome.storage.local.set({
        compatibilityStatus: {
          isCompatible: true,
          lastChecked: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error checking compatibility:', error);
  }
}

// Listen for auth changes from web app
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (sender.url.startsWith('https://meetassist.app')) {
      if (request.action === 'setAuthData' && request.authData) {
        chrome.storage.local.set({ authData: request.authData });
        sendResponse({ status: 'success' });
      } else if (request.action === 'clearAuthData') {
        chrome.storage.local.remove('authData');
        sendResponse({ status: 'success' });
      }
    }
    return true;
  }
);

// Listen for tab updates to detect when user joins a Google Meet
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('meet.google.com')) {
    // Check if the MeetAssist should be auto-injected
    chrome.storage.local.get(['authData', 'meetAssistSettings'], (data) => {
      // Send message to content script that a meeting was detected
      chrome.tabs.sendMessage(tabId, { 
        action: 'meetingDetected',
        isAuthenticated: !!data.authData,
        settings: data.meetAssistSettings || {}
      });
    });
  }
});

// Function to process audio for multi-language transcription
async function processAudioForTranscription(audioData, meetingId, languageCode = 'en-US') {
  try {
    const authData = await chrome.storage.local.get('authData');
    if (!authData || !authData.token) {
      console.error('User not authenticated');
      return { error: 'User not authenticated' };
    }
    
    // Send to backend for processing with language specification
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        audioData,
        meetingId,
        languageCode
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error processing audio:', error);
    return { error: error.message };
  }
}

// Function to export transcript to collaboration tools
async function exportToCollaborationTool(transcript, tool, title) {
  try {
    const authData = await chrome.storage.local.get('authData');
    if (!authData || !authData.token) {
      return { error: 'User not authenticated' };
    }
    
    // Format content based on tool
    let formattedContent;
    if (tool === 'googleDocs') {
      formattedContent = formatForGoogleDocs(transcript, title);
    } else if (tool === 'notion') {
      formattedContent = formatForNotion(transcript, title);
    } else {
      return { error: 'Unsupported collaboration tool' };
    }
    
    // Send to backend for processing
    const response = await fetch(`${GCP_CONFIG.apiEndpoint}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        content: formattedContent,
        tool,
        title
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error exporting transcript:', error);
    return { error: error.message };
  }
}

// Helper function to format transcript for Google Docs
function formatForGoogleDocs(transcript, title) {
  let content = `# ${title}\n\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;
  content += '## Transcript\n\n';
  
  transcript.forEach(segment => {
    content += `**${segment.speaker}** (${segment.timestamp}): ${segment.text}\n\n`;
  });
  
  return content;
}

// Helper function to format transcript for Notion
function formatForNotion(transcript, title) {
  return {
    title,
    date: new Date().toISOString(),
    blocks: [
      {
        type: 'heading_1',
        content: title
      },
      {
        type: 'paragraph',
        content: `Date: ${new Date().toLocaleDateString()}`
      },
      {
        type: 'heading_2',
        content: 'Transcript'
      },
      ...transcript.map(segment => ({
        type: 'paragraph',
        content: `**${segment.speaker}** (${segment.timestamp}): ${segment.text}`
      }))
    ]
  };
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processAudio') {
    // Get preferred language from settings
    chrome.storage.local.get(['meetAssistSettings'], (data) => {
      const settings = data.meetAssistSettings || {};
      const languageCode = settings.preferredLanguage || 'en-US';
      
      processAudioForTranscription(request.audioData, request.meetingId, languageCode)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
    });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'checkAuth') {
    chrome.storage.local.get('authData', (data) => {
      sendResponse({
        isAuthenticated: !!data.authData,
        user: data.authData || null
      });
    });
    return true;
  }
  
  if (request.action === 'exportTranscript') {
    exportToCollaborationTool(request.transcript, request.tool, request.title)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === 'getSupportedLanguages') {
    sendResponse({ languages: SUPPORTED_LANGUAGES });
    return true;
  }
  
  if (request.action === 'logAnalytics') {
    // Get analytics consent from settings
    chrome.storage.local.get(['meetAssistSettings'], (data) => {
      const settings = data.meetAssistSettings || {};
      
      if (settings.analyticsConsent) {
        // Log analytics event to backend
        fetch(`${GCP_CONFIG.apiEndpoint}/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request.event)
        }).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Error logging analytics:', error);
          sendResponse({ error: error.message });
        });
      } else {
        sendResponse({ skipped: true, reason: 'Analytics consent not given' });
      }
    });
    return true;
  }
});
