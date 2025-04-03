
// Audio recording and processing utilities
export interface RecordingOptions {
  onDataAvailable?: (blob: Blob) => void;
  onStart?: () => void;
  onStop?: (audioBlob: Blob, durationSeconds: number) => void;
  onError?: (error: string) => void;
}

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(options: RecordingOptions = {}): Promise<void> {
    try {
      this.audioChunks = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (options.onDataAvailable) {
            options.onDataAvailable(event.data);
          }
        }
      });
      
      this.mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const durationSeconds = (Date.now() - this.startTime) / 1000;
        
        // Stop all tracks in the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        if (options.onStop) {
          options.onStop(audioBlob, durationSeconds);
        }
      });
      
      this.mediaRecorder.start(1000); // Capture in 1 second chunks
      this.startTime = Date.now();
      
      if (options.onStart) {
        options.onStart();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      if (options.onError) {
        options.onError('Failed to access microphone. Please ensure microphone permissions are granted.');
      }
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

export const audioRecorder = new AudioRecorder();

/**
 * Converts an audio blob to a base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
