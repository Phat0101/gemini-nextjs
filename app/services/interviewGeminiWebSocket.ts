import { TranscriptionService } from './chatTranscriptionService';
import { pcmToWav } from '../utils/audioUtils';

const MODEL = "models/gemini-2.0-flash-exp";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

export class InterviewGeminiWebSocket {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isSetupComplete: boolean = false;
  private onResponseCallback: ((text: string) => void) | null = null;
  private onSetupCompleteCallback: (() => void) | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private transcriptionService: TranscriptionService;
  private accumulatedPcmData: string[] = [];
  private accumulatedResponse: string = "";

  constructor(
    onResponse: (text: string) => void, 
    onSetupComplete: () => void,
    onTranscription: (text: string) => void
  ) {
    this.onResponseCallback = onResponse;
    this.onSetupCompleteCallback = onSetupComplete;
    this.onTranscriptionCallback = onTranscription;
    this.transcriptionService = new TranscriptionService();
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.sendInitialSetup();
    };

    this.ws.onmessage = async (event) => {
      try {
        let messageText: string;
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          messageText = new TextDecoder('utf-8').decode(bytes);
        } else {
          messageText = event.data;
        }
        
        await this.handleMessage(messageText);
      } catch (error) {
        console.error("[WebSocket] Error processing message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      
      // Only attempt to reconnect if we haven't explicitly called disconnect
      if (!event.wasClean && this.isSetupComplete) {
        setTimeout(() => this.connect(), 1000);
      }
    };
  }

  private sendInitialSetup() {
    const setupMessage = {
      setup: {
        model: MODEL,
        generation_config: {
          response_modalities: ["TEXT"] 
        },
        system_instruction: {
          parts: [
            {
              text: `You are an AI interview assistant helping users to pass job interviews. 
              Your role is to provide CONCISE, ACTIONABLE interview answers. Follow these guidelines:
              1. ONLY RESPOND TO ACTUAL INTERVIEW QUESTIONS. If the user says something like "Tell me about yourself" or "What are your weaknesses?", provide an answer.
              2. DO NOT provide answers when the user is practicing their own response. If they start speaking in paragraphs or giving their own answers, just listen without responding or acknowledge briefly with "I'm listening to your answer" or "Good point".
              3. Use scannable bullet points with **bold keywords**, reasonable length, and concise. Use **bold keywords** at the beginning of each bullet point.
              4. Provide structured answers with clear headings and subheadings and bullet points.
              5. Limit responses to 3-5 bullet points maximum
              6. Focus on memorable phrases the user can quickly recall
              The difference between questions and answers:
              - Questions typically end with a question mark or use question phrasing ("Can you tell me...", "How would you...", "What is...")
              - Answers are typically longer, more detailed, and presented as statements rather than questions
              If in doubt, only generate substantive responses to clear interview questions.`
            }
          ]
        }
      }
    };
    this.ws?.send(JSON.stringify(setupMessage));
  }

  sendMediaChunk(b64Data: string, mimeType: string) {
    if (!this.isConnected || !this.ws || !this.isSetupComplete) return;

    const message = {
      realtime_input: {
        media_chunks: [{
          mime_type: mimeType === "audio/pcm" ? "audio/pcm" : mimeType,
          data: b64Data
        }]
      }
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[WebSocket] Error sending media chunk:", error);
    }
  }

  private async handleMessage(message: string) {
    try {
      const messageData = JSON.parse(message);
      
      if (messageData.setupComplete) {
        this.isSetupComplete = true;
        this.onSetupCompleteCallback?.();
        return;
      }

      // Handle text responses
      if (messageData.serverContent?.modelTurn?.parts) {
        const parts = messageData.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.text) {
            // For text responses, we'll append to the accumulated response
            // and notify the callback of the new text
            this.accumulatedResponse += part.text;
            this.onResponseCallback?.(this.accumulatedResponse);
          }
        }
      }

      // Handle audio for transcription
      if (messageData.serverContent?.modelTurn?.parts) {
        const parts = messageData.serverContent.modelTurn.parts;
        for (const part of parts) {
          if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
            this.accumulatedPcmData.push(part.inlineData.data);
          }
        }
      }

      // Handle turn completion separately
      if (messageData.serverContent?.turnComplete === true) {
        // Reset accumulated response for the next turn
        this.accumulatedResponse = "";
        
        if (this.accumulatedPcmData.length > 0) {
          try {
            const fullPcmData = this.accumulatedPcmData.join('');
            const wavData = await pcmToWav(fullPcmData, 24000);
            
            const transcription = await this.transcriptionService.transcribeAudio(
              wavData,
              "audio/wav"
            );
            console.log("[Transcription]:", transcription);

            this.onTranscriptionCallback?.(transcription);
            this.accumulatedPcmData = []; // Clear accumulated data
          } catch (error) {
            console.error("[WebSocket] Transcription error:", error);
          }
        }
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  }

  disconnect() {
    this.isSetupComplete = false;
    if (this.ws) {
      this.ws.close(1000, "Intentional disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.accumulatedPcmData = [];
    this.accumulatedResponse = "";
  }
} 