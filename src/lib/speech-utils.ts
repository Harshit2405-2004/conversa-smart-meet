
import { speechRecognition } from "@/services/speech-recognition-service";
import { processSpeechResult, processAudioData, blobToBase64 } from "@/utils/speech-processor";

// Re-export everything
export {
  speechRecognition,
  processSpeechResult,
  processAudioData,
  blobToBase64
};
