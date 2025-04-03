
// Background service worker for MeetAssist Chrome Extension
console.log('MeetAssist background service worker initialized');

// Listen for installation event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('Extension installed');
    // Open onboarding page
    chrome.tabs.create({
      url: 'https://yourappurl.com/welcome?source=extension'
    });
    
    // Initialize default settings
    chrome.storage.local.set({
      meetAssistSettings: {
        enableTranscription: true,
        enableAssistant: true,
        enableSummary: true,
        deleteAfter24h: true,
        chunking30min: true
      }
    });
  } else if (details.reason === 'update') {
    // Extension was updated
    console.log('Extension updated');
  }
});

// Listen for auth changes from web app
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (sender.url.startsWith('https://yourappurl.com')) {
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

// Function to process audio for transcription
async function processAudioForTranscription(audioData, meetingId) {
  try {
    const authData = await chrome.storage.local.get('authData');
    if (!authData || !authData.token) {
      console.error('User not authenticated');
      return { error: 'User not authenticated' };
    }
    
    // Send to backend for processing
    const response = await fetch('https://yourappurl.com/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        audioData,
        meetingId
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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processAudio') {
    processAudioForTranscription(request.audioData, request.meetingId)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
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
});
