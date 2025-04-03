
console.log('MeetAssist content script loaded');

// State management
let state = {
  isAuthenticated: false,
  user: null,
  meetingId: null,
  isRecording: false,
  recordingStartTime: 0,
  recordingDuration: 0,
  chunks: [],
  currentChunk: 0,
  settings: {
    enableTranscription: true,
    enableAssistant: true,
    enableSummary: true,
    deleteAfter24h: true,
    chunking30min: true
  },
  transcript: [],
  mediaRecorder: null
};

// Initialize the app
async function init() {
  // Generate a unique ID for this meeting
  state.meetingId = generateMeetingId();
  
  // Check authentication status
  checkAuthStatus();
  
  // Set up message listeners
  setupMessageListeners();
  
  // Wait for the Google Meet UI to fully load
  await waitForMeetElements();
  
  // Initialize the UI
  initializeUI();
}

// Check user's authentication status
async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    state.isAuthenticated = response.isAuthenticated;
    state.user = response.user;
    
    if (state.isAuthenticated && state.user) {
      console.log('User authenticated:', state.user.email);
    } else {
      console.log('User not authenticated');
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    state.isAuthenticated = false;
    state.user = null;
  }
}

// Set up Chrome runtime message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'startRecording') {
      startRecording();
      sendResponse({ success: true });
    }
    
    if (request.action === 'stopRecording') {
      stopRecording();
      sendResponse({ success: true });
    }
    
    if (request.action === 'getRecordingStatus') {
      sendResponse({
        isRecording: state.isRecording,
        duration: calculateRecordingDuration()
      });
    }
    
    if (request.action === 'updateSettings') {
      state.settings = { ...state.settings, ...request.settings };
      updateUI();
      sendResponse({ success: true });
    }
    
    if (request.action === 'meetingDetected') {
      state.isAuthenticated = request.isAuthenticated;
      if (request.settings) {
        state.settings = { ...state.settings, ...request.settings };
      }
      updateUI();
      sendResponse({ success: true });
    }
  });
}

// Wait for Google Meet UI elements to load
function waitForMeetElements() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Check for the Google Meet bottom toolbar
      const bottomBar = document.querySelector('[data-allocation-index="0"]');
      if (bottomBar) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
    
    // Timeout after 30 seconds to prevent infinite waiting
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 30000);
  });
}

// Initialize the MeetAssist UI components
function initializeUI() {
  // Create the main container for our UI
  const meetAssistContainer = document.createElement('div');
  meetAssistContainer.id = 'meet-assist-container';
  meetAssistContainer.className = 'meet-assist-container';
  
  // Create the transcription panel
  const transcriptionPanel = createTranscriptionPanel();
  meetAssistContainer.appendChild(transcriptionPanel);
  
  // Create the assistant panel
  const assistantPanel = createAssistantPanel();
  meetAssistContainer.appendChild(assistantPanel);
  
  // Add our container to the Google Meet UI
  document.body.appendChild(meetAssistContainer);
  
  // Create the control button in the Google Meet toolbar
  injectControlButton();
  
  // Update UI based on current state
  updateUI();
}

// Create the transcription panel
function createTranscriptionPanel() {
  const panel = document.createElement('div');
  panel.id = 'meet-assist-transcription';
  panel.className = 'meet-assist-panel meet-assist-transcription';
  
  const header = document.createElement('div');
  header.className = 'panel-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Live Transcription';
  header.appendChild(title);
  
  const controls = document.createElement('div');
  controls.className = 'panel-controls';
  
  const toggleButton = document.createElement('button');
  toggleButton.id = 'transcription-toggle-btn';
  toggleButton.textContent = 'Start';
  toggleButton.className = 'control-button primary';
  toggleButton.addEventListener('click', toggleRecording);
  controls.appendChild(toggleButton);
  
  header.appendChild(controls);
  panel.appendChild(header);
  
  const content = document.createElement('div');
  content.id = 'transcription-content';
  content.className = 'panel-content';
  panel.appendChild(content);
  
  return panel;
}

// Create the assistant panel
function createAssistantPanel() {
  const panel = document.createElement('div');
  panel.id = 'meet-assist-assistant';
  panel.className = 'meet-assist-panel meet-assist-assistant';
  
  const header = document.createElement('div');
  header.className = 'panel-header';
  
  const title = document.createElement('h3');
  title.textContent = 'AI Assistant';
  header.appendChild(title);
  panel.appendChild(header);
  
  const content = document.createElement('div');
  content.id = 'assistant-content';
  content.className = 'panel-content';
  
  const messages = document.createElement('div');
  messages.id = 'assistant-messages';
  messages.className = 'assistant-messages';
  content.appendChild(messages);
  
  const inputContainer = document.createElement('div');
  inputContainer.className = 'assistant-input-container';
  
  const input = document.createElement('input');
  input.id = 'assistant-input';
  input.type = 'text';
  input.placeholder = 'Ask your AI assistant...';
  inputContainer.appendChild(input);
  
  const sendButton = document.createElement('button');
  sendButton.id = 'assistant-send';
  sendButton.textContent = 'Send';
  sendButton.className = 'control-button primary small';
  sendButton.addEventListener('click', () => sendAssistantMessage(input.value));
  inputContainer.appendChild(sendButton);
  
  content.appendChild(inputContainer);
  panel.appendChild(content);
  
  return panel;
}

// Inject the MeetAssist toggle button into the Google Meet toolbar
function injectControlButton() {
  const checkInterval = setInterval(() => {
    // Find the Google Meet bottom bar
    const bottomBar = document.querySelector('[data-allocation-index="0"]');
    if (!bottomBar) return;
    
    clearInterval(checkInterval);
    
    // Create our button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'meet-assist-button-container';
    
    // Create the button
    const button = document.createElement('button');
    button.id = 'meet-assist-toggle';
    button.className = 'meet-assist-toggle-button';
    button.title = 'Toggle MeetAssist';
    button.textContent = 'MA';
    button.addEventListener('click', toggleMeetAssist);
    
    buttonContainer.appendChild(button);
    
    // Add button to the bottom bar
    bottomBar.appendChild(buttonContainer);
  }, 1000);
}

// Toggle the visibility of MeetAssist panels
function toggleMeetAssist() {
  const container = document.getElementById('meet-assist-container');
  if (container) {
    const isHidden = container.classList.contains('hidden');
    container.classList.toggle('hidden', !isHidden);
    
    // Update the toggle button appearance
    const toggleButton = document.getElementById('meet-assist-toggle');
    if (toggleButton) {
      toggleButton.classList.toggle('active', !isHidden);
    }
  }
}

// Update the UI based on the current state
function updateUI() {
  // Update transcription button
  const transcriptionButton = document.getElementById('transcription-toggle-btn');
  if (transcriptionButton) {
    transcriptionButton.textContent = state.isRecording ? 'Stop' : 'Start';
    transcriptionButton.className = state.isRecording 
      ? 'control-button destructive' 
      : 'control-button primary';
  }
  
  // Update authentication-related UI
  const container = document.getElementById('meet-assist-container');
  if (container) {
    if (state.isAuthenticated) {
      container.classList.remove('not-authenticated');
    } else {
      container.classList.add('not-authenticated');
      
      // Show auth message if not already present
      let authMessage = document.getElementById('auth-required-message');
      if (!authMessage) {
        authMessage = document.createElement('div');
        authMessage.id = 'auth-required-message';
        authMessage.className = 'auth-message';
        authMessage.innerHTML = `
          <p>Please sign in to use MeetAssist</p>
          <button id="auth-signin" class="control-button primary">Sign In</button>
        `;
        container.appendChild(authMessage);
        
        document.getElementById('auth-signin')?.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'openAuthPage', type: 'login' });
        });
      }
    }
  }
  
  // Update feature visibility based on settings
  if (!state.settings.enableTranscription) {
    document.getElementById('meet-assist-transcription')?.classList.add('hidden');
  } else {
    document.getElementById('meet-assist-transcription')?.classList.remove('hidden');
  }
  
  if (!state.settings.enableAssistant) {
    document.getElementById('meet-assist-assistant')?.classList.add('hidden');
  } else {
    document.getElementById('meet-assist-assistant')?.classList.remove('hidden');
  }
}

// Toggle recording state
function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start recording the meeting
async function startRecording() {
  if (state.isRecording) return;
  
  try {
    // Get audio stream from the meeting
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Initialize media recorder
    const options = { mimeType: 'audio/webm' };
    state.mediaRecorder = new MediaRecorder(stream, options);
    
    // Set up data handling
    state.mediaRecorder.ondataavailable = handleAudioData;
    state.mediaRecorder.onstop = handleRecordingStop;
    
    // Start recording
    state.mediaRecorder.start(1000); // Collect data in 1-second chunks
    state.isRecording = true;
    state.recordingStartTime = Date.now();
    state.chunks = [];
    state.currentChunk = 0;
    
    console.log('Recording started');
    
    // Update UI
    updateUI();
    
    // Start the chunk timer if 30-minute chunking is enabled
    if (state.settings.chunking30min) {
      startChunkTimer();
    }
    
    // Start the transcript update interval
    startTranscriptUpdateInterval();
    
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Failed to start recording. Please check microphone permissions.');
  }
}

// Stop the current recording
function stopRecording() {
  if (!state.isRecording || !state.mediaRecorder) return;
  
  state.mediaRecorder.stop();
  state.isRecording = false;
  state.recordingDuration += calculateRecordingDuration();
  
  // Stop all tracks in the stream to release the microphone
  if (state.mediaRecorder.stream) {
    state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  console.log('Recording stopped');
  
  // Update UI
  updateUI();
}

// Handle audio data from media recorder
function handleAudioData(event) {
  if (event.data.size > 0) {
    state.chunks.push(event.data);
    
    // Process audio in batches to avoid overwhelming the API
    if (state.chunks.length >= 5) { // Process every ~5 seconds
      processAudioChunk();
    }
  }
}

// Process the collected audio chunks
async function processAudioChunk() {
  if (state.chunks.length === 0) return;
  
  try {
    // Create a blob from the chunks
    const audioBlob = new Blob(state.chunks, { type: 'audio/webm' });
    
    // Reset chunks array
    state.chunks = [];
    
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // Send to background script for processing
    chrome.runtime.sendMessage({
      action: 'processAudio',
      audioData: base64Audio,
      meetingId: state.meetingId,
      chunkIndex: state.currentChunk
    }, (response) => {
      if (response.error) {
        console.error('Error processing audio:', response.error);
      } else if (response.transcript) {
        updateTranscript(response.transcript);
      }
    });
    
  } catch (error) {
    console.error('Error processing audio chunk:', error);
  }
}

// Handle recording stop event
function handleRecordingStop() {
  // Process any remaining chunks
  processAudioChunk();
}

// Convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Update the transcript display with new segments
function updateTranscript(newSegments) {
  if (!newSegments || newSegments.length === 0) return;
  
  // Add new segments to the state
  state.transcript = [...state.transcript, ...newSegments];
  
  // Update the UI
  const transcriptionContent = document.getElementById('transcription-content');
  if (!transcriptionContent) return;
  
  // Clear existing content if this is a new chunk
  if (newSegments[0].isNewChunk) {
    transcriptionContent.innerHTML = '';
  }
  
  // Add new segments to the display
  newSegments.forEach(segment => {
    const segmentElement = document.createElement('div');
    segmentElement.className = 'transcript-segment';
    
    const speakerElement = document.createElement('span');
    speakerElement.className = 'segment-speaker';
    speakerElement.textContent = segment.speaker || 'Speaker';
    
    const timeElement = document.createElement('span');
    timeElement.className = 'segment-time';
    timeElement.textContent = segment.timestamp || '00:00';
    
    const textElement = document.createElement('div');
    textElement.className = 'segment-text';
    textElement.textContent = segment.text;
    
    segmentElement.appendChild(speakerElement);
    segmentElement.appendChild(timeElement);
    segmentElement.appendChild(textElement);
    
    transcriptionContent.appendChild(segmentElement);
  });
  
  // Auto-scroll to the bottom
  transcriptionContent.scrollTop = transcriptionContent.scrollHeight;
}

// Send a message to the AI assistant
async function sendAssistantMessage(message) {
  if (!message || message.trim() === '') return;
  
  // Clear the input field
  const input = document.getElementById('assistant-input');
  if (input) input.value = '';
  
  // Display user message
  addAssistantMessage('user', message);
  
  // Show typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.id = 'typing-indicator';
  typingIndicator.className = 'assistant-message assistant-typing';
  typingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  document.getElementById('assistant-messages')?.appendChild(typingIndicator);
  
  try {
    // Send the message to the background script
    chrome.runtime.sendMessage({
      action: 'assistantQuery',
      message: message,
      transcript: state.transcript,
      meetingId: state.meetingId
    }, (response) => {
      // Remove typing indicator
      document.getElementById('typing-indicator')?.remove();
      
      if (response.error) {
        console.error('Assistant error:', response.error);
        addAssistantMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      } else {
        addAssistantMessage('assistant', response.reply);
      }
    });
  } catch (error) {
    console.error('Error sending assistant message:', error);
    // Remove typing indicator
    document.getElementById('typing-indicator')?.remove();
    addAssistantMessage('assistant', 'Sorry, I encountered an error. Please try again.');
  }
}

// Add a message to the assistant chat
function addAssistantMessage(sender, message) {
  const messagesContainer = document.getElementById('assistant-messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `assistant-message ${sender}-message`;
  messageElement.textContent = message;
  
  messagesContainer.appendChild(messageElement);
  
  // Auto-scroll to the bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Start a timer to chunk recordings every 30 minutes
function startChunkTimer() {
  if (!state.settings.chunking30min) return;
  
  // 30 minutes in milliseconds
  const chunkInterval = 30 * 60 * 1000;
  
  setTimeout(() => {
    if (state.isRecording) {
      // Stop the current recording
      state.mediaRecorder.stop();
      
      // Process any remaining chunks
      processAudioChunk();
      
      // Increment chunk counter
      state.currentChunk++;
      
      // Start a new recording
      setTimeout(() => {
        if (state.isRecording) {
          startRecording();
        }
      }, 1000);
    }
  }, chunkInterval);
}

// Start an interval to update the transcript periodically
function startTranscriptUpdateInterval() {
  // Update every 10 seconds
  const updateInterval = setInterval(() => {
    if (!state.isRecording) {
      clearInterval(updateInterval);
      return;
    }
    
    // Process any available chunks
    if (state.chunks.length > 0) {
      processAudioChunk();
    }
    
  }, 10000);
}

// Calculate the current recording duration in seconds
function calculateRecordingDuration() {
  if (!state.isRecording || !state.recordingStartTime) return 0;
  
  const durationMs = Date.now() - state.recordingStartTime;
  return Math.floor(durationMs / 1000);
}

// Generate a unique ID for the current meeting
function generateMeetingId() {
  // Extract meeting ID from URL if possible
  const meetUrl = window.location.href;
  const meetingCodeMatch = meetUrl.match(/\/([a-zA-Z0-9-]{10,})\??/);
  const meetingCode = meetingCodeMatch ? meetingCodeMatch[1] : '';
  
  // Combine with timestamp for uniqueness
  return `${meetingCode}-${Date.now()}`;
}

// Initialize the content script
init();
