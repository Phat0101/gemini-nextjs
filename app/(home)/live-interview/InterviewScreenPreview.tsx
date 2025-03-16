"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "../../../components/ui/button";
import { ScreenShare, Loader2, StopCircle, Mic } from "lucide-react";
import { InterviewGeminiWebSocket } from '../../services/interviewGeminiWebSocket';
import { Base64 } from 'js-base64';

interface ScreenCameraPreviewProps {
  onTranscription: (text: string) => void;
  onModelResponse: (text: string) => void;
  onStatusChange?: (status: { isStreaming: boolean; isScreenSharing: boolean; isAudioOnly: boolean }) => void;
  userCredits?: number;
  onCreditUpdate?: (newCredits: number) => void;
}

export default function InterviewScreenPreview({ 
  onTranscription, 
  onModelResponse, 
  onStatusChange,
  userCredits = 0,
  onCreditUpdate
}: ScreenCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const geminiWsRef = useRef<InterviewGeminiWebSocket | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const setupInProgressRef = useRef(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const imageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isCaptureSupported, setIsCaptureSupported] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  // Credit tracking state
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [lastDeductionMinute, setLastDeductionMinute] = useState(0);
  const creditDeductionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the browser supports screen capture
    if (typeof navigator !== 'undefined' && 
        typeof navigator.mediaDevices !== 'undefined' && 
        !navigator.mediaDevices.getDisplayMedia) {
      setIsCaptureSupported(false);
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const cleanupWebSocket = useCallback(() => {
    if (geminiWsRef.current) {
      geminiWsRef.current.disconnect();
      geminiWsRef.current = null;
    }
  }, []);

  // Send audio data to the WebSocket
  const sendAudioData = (b64Data: string) => {
    if (!geminiWsRef.current) return;
    geminiWsRef.current.sendMediaChunk(b64Data, "audio/pcm");
  };

  // Start an interview session by calling the API
  const startInterviewSession = async () => {
    try {
      // First try to find or create a job preparation
      const prepResponse = await fetch('/api/job-preparation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'General Interview Practice',
          company: 'Practice Session',
          description: 'General interview practice session',
          notes: 'Auto-created for interview practice'
        }),
      });
      
      if (!prepResponse.ok) {
        console.error('Failed to create job preparation');
        setCreditError('Failed to set up interview. Please try again.');
        return null;
      }
      
      const prepData = await prepResponse.json();
      const jobPreparationId = prepData.data.id;
      
      // Now start the interview session with the created job preparation
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobPreparationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to start interview session:', errorData);
        setCreditError(errorData.error || 'Failed to start interview');
        return null;
      }

      const data = await response.json();
      sessionStartTimeRef.current = new Date();
      return data.data.sessionId;
    } catch (error) {
      console.error('Error starting interview session:', error);
      setCreditError('Failed to start interview. Please try again.');
      return null;
    }
  };

  // End the interview session and get final credit usage
  const endInterviewSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/interview', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      if (!response.ok) {
        console.error('Failed to end interview session');
        return;
      }

      const data = await response.json();
      console.log('Interview session ended:', data);
      
      // Update credits in parent component
      if (onCreditUpdate && typeof data.data.remainingCredits === 'number') {
        onCreditUpdate(data.data.remainingCredits);
      }
      
      setSessionId(null);
      sessionStartTimeRef.current = null;
      setInterviewDuration(0);
      setLastDeductionMinute(0);
    } catch (error) {
      console.error('Error ending interview session:', error);
    }
  };

  // Deduct credits for the time used
  const deductCreditsForTime = async (minutes: number) => {
    try {
      if (minutes <= 0) return;
      
      const response = await fetch('/api/interview', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minutes,
        }),
      });

      if (response.status === 402) {
        // Payment required - user has run out of credits
        setCreditError('You have run out of credits. The interview will end shortly.');
        setTimeout(stopStreaming, 5000); // Give user 5 seconds to read the message
        return;
      }
      
      if (!response.ok) {
        console.error('Failed to deduct credits');
        return;
      }

      const data = await response.json();
      console.log(`Deducted credits for ${minutes} minutes:`, data);
      
      // Update credits in parent component
      if (onCreditUpdate && typeof data.data.remainingCredits === 'number') {
        onCreditUpdate(data.data.remainingCredits);
      }
    } catch (error) {
      console.error('Error deducting credits:', error);
    }
  };

  // Track interview time and deduct credits
  useEffect(() => {
    if (!isStreaming || !sessionId) return;

    // Set up timer to track interview duration and deduct credits every minute
    const timer = setInterval(() => {
      if (!sessionStartTimeRef.current) return;
      
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - sessionStartTimeRef.current.getTime()) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      
      setInterviewDuration(elapsedMinutes);
      
      // Deduct credits every minute
      if (elapsedMinutes > lastDeductionMinute) {
        const minutesToDeduct = elapsedMinutes - lastDeductionMinute;
        setLastDeductionMinute(elapsedMinutes);
        deductCreditsForTime(minutesToDeduct);
      }
    }, 10000); // Check every 10 seconds
    
    creditDeductionTimerRef.current = timer;
    
    return () => {
      if (creditDeductionTimerRef.current) {
        clearInterval(creditDeductionTimerRef.current);
        creditDeductionTimerRef.current = null;
      }
    };
  }, [isStreaming, sessionId, lastDeductionMinute]);

  const startAudioOnly = async () => {
    if (userCredits <= 0) {
      setCreditError('You do not have enough credits to start an interview');
      return;
    }
    
    setCreditError(null);
    const newSessionId = await startInterviewSession();
    if (!newSessionId) {
      console.error('Failed to start session');
      return;
    }
    
    setSessionId(newSessionId);
    
    try {
      // Request audio only
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });

      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      setStream(audioStream);
      setIsStreaming(true);
      setIsScreenSharing(false);
      setIsAudioOnly(true);
    } catch (err) {
      console.error('Error accessing audio devices:', err);
      cleanupAudio();
      // Cleanup the session if we fail to get audio
      if (newSessionId) {
        endInterviewSession();
      }
    }
  };

  const startScreenAndAudio = async () => {
    if (userCredits <= 0) {
      setCreditError('You do not have enough credits to start an interview');
      return;
    }
    
    setCreditError(null);
    const newSessionId = await startInterviewSession();
    if (!newSessionId) {
      console.error('Failed to start session');
      return;
    }
    
    setSessionId(newSessionId);
    
    try {
      // Request screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          displaySurface: 'monitor', // Try to capture the entire screen, not just a tab
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 5 } // Lower framerate to reduce bandwidth
        }
      });

      // Request audio separately
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });

      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
        videoRef.current.muted = true;
      }

      // Combine screen and audio into one stream
      const combinedStream = new MediaStream([
        ...displayStream.getTracks(),
        ...audioStream.getTracks()
      ]);

      // Handle the case when user stops screen sharing via the browser UI
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopStreaming(); // This will clean up everything
      });

      setStream(combinedStream);
      setIsStreaming(true);
      setIsScreenSharing(true);
      setIsAudioOnly(false);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      
      // Check if this is a permission error (user cancelled) vs. a support error
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        // User denied permission or cancelled the selection - don't mark device as unsupported
        console.log('User cancelled screen sharing selection');
      } else {
        // This might be a true capability issue
        setIsCaptureSupported(false);
      }
      
      cleanupAudio();
      
      // Cleanup the session if we fail to get media
      if (newSessionId) {
        endInterviewSession();
      }
    }
  };

  const stopStreaming = () => {
    // End the interview session and deduct final credits
    if (sessionId) {
      endInterviewSession();
    }
    
    setIsStreaming(false);
    setIsScreenSharing(false);
    setIsAudioOnly(false);
    cleanupWebSocket();
    cleanupAudio();
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    }
    
    // Clear any timers
    if (creditDeductionTimerRef.current) {
      clearInterval(creditDeductionTimerRef.current);
      creditDeductionTimerRef.current = null;
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isStreaming) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    geminiWsRef.current = new InterviewGeminiWebSocket(
      (text) => {
        // Handle model text responses
        console.log("Received text from AI:", text);
        onModelResponse(text);
      },
      () => {
        console.log("[Screen] WebSocket setup complete, starting media capture");
        setIsWebSocketReady(true);
        setConnectionStatus('connected');
      },
      onTranscription
    );
    geminiWsRef.current.connect();

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
      cleanupWebSocket();
      setIsWebSocketReady(false);
      setConnectionStatus('disconnected');
    };
  }, [isStreaming, onTranscription, onModelResponse, cleanupWebSocket]);

  // Start image capture only after WebSocket is ready
  useEffect(() => {
    if (!isStreaming || !isWebSocketReady || isAudioOnly) return;

    console.log("[Screen] Starting screen capture interval");
    imageIntervalRef.current = setInterval(captureAndSendImage, 2000); // Send screen image every 2 seconds

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
    };
  }, [isStreaming, isWebSocketReady, isAudioOnly]);

  // Update audio processing setup
  useEffect(() => {
    if (!isStreaming || !stream || !audioContextRef.current || 
        !isWebSocketReady || isAudioSetup || setupInProgressRef.current) return;

    let isActive = true;
    setupInProgressRef.current = true;
    
    console.log("[Screen] Setting up audio processing");

    const setupAudioProcessing = async () => {
      try {
        const ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed' || !isActive) {
          setupInProgressRef.current = false;
          return;
        }

        // Disconnect any existing nodes
        if (audioWorkletNodeRef.current) {
          audioWorkletNodeRef.current.disconnect();
          audioWorkletNodeRef.current = null;
        }

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        await ctx.audioWorklet.addModule('/worklets/audio-processor.js');

        if (!isActive) {
          setupInProgressRef.current = false;
          return;
        }

        audioWorkletNodeRef.current = new AudioWorkletNode(ctx, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            sampleRate: 16000,
            bufferSize: 4096,
          },
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(stream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isActive) return;
          const { pcmData, level } = event.data;
          setAudioLevel(level);

          const pcmArray = new Uint8Array(pcmData);
          const b64Data = Base64.fromUint8Array(pcmArray);
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
        setIsAudioSetup(true);
        setupInProgressRef.current = false;
        console.log("[Screen] Audio processing setup complete");

        return () => {
          source.disconnect();
          if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
          }
          setIsAudioSetup(false);
        };
      } catch (error) {
        console.error("Error setting up audio processing:", error);
        if (isActive) {
          cleanupAudio();
          setIsAudioSetup(false);
        }
        setupInProgressRef.current = false;
      }
    };

    console.log("[Screen] Starting audio processing setup");
    setupAudioProcessing();

    return () => {
      isActive = false;
      setIsAudioSetup(false);
      setupInProgressRef.current = false;
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
    };
  }, [isStreaming, stream, isWebSocketReady]);

  // Capture and send screen image
  const captureAndSendImage = () => {
    if (!videoRef.current || !videoCanvasRef.current || !geminiWsRef.current || isAudioOnly) return;

    const canvas = videoCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to base64 and send (with lower quality to reduce bandwidth)
    const imageData = canvas.toDataURL('image/jpeg', 0.6);
    const b64Data = imageData.split(',')[1];
    geminiWsRef.current.sendMediaChunk(b64Data, "image/jpeg");
  };

  // Emit status changes to parent component
  useEffect(() => {
    onStatusChange?.({ isStreaming, isScreenSharing, isAudioOnly });
  }, [isStreaming, isScreenSharing, isAudioOnly, onStatusChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isStreaming && sessionId) {
        endInterviewSession();
      }
      
      if (creditDeductionTimerRef.current) {
        clearInterval(creditDeductionTimerRef.current);
      }
    };
  }, [isStreaming, sessionId]);

  if (!isCaptureSupported) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-red-50 rounded-lg border border-red-200 text-center">
        <div className="text-red-500 text-xl font-medium">Screen capture not supported</div>
        <p className="text-red-700">Your browser doesn&apos;t support the screen capture features needed for this app.</p>
        <Button onClick={() => setIsCaptureSupported(true)} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[640px]">
      <div className="relative bg-black rounded-lg overflow-hidden shadow-lg aspect-video">
        {isAudioOnly ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-700">
            <div className="text-center">
              <Mic className="h-12 w-12 text-white mx-auto mb-2 opacity-80" />
              <h3 className="text-white text-lg font-semibold mb-1">Audio-Only Mode</h3>
              <p className="text-white/80 text-sm max-w-xs mx-auto">
                Your microphone is active. Speak clearly to get interview help.
              </p>
              {interviewDuration > 0 && (
                <div className="mt-3 text-white/90 text-sm font-medium">
                  Interview time: {interviewDuration} minutes
                </div>
              )}
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        
        {/* Credit Error Message */}
        {creditError && (
          <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center rounded-lg backdrop-blur-sm z-30">
            <div className="text-center p-4 bg-white/10 backdrop-blur-md rounded-lg max-w-xs mx-auto">
              <p className="text-white font-medium">{creditError}</p>
            </div>
          </div>
        )}
        
        {/* Connection Status Overlay */}
        {isStreaming && connectionStatus !== 'connected' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <Loader2 className="animate-spin h-8 w-8 text-white mx-auto" />
              <p className="text-white font-medium">
                {connectionStatus === 'connecting' ? 'Connecting to AI...' : 'Disconnected'}
              </p>
              <p className="text-white/70 text-sm px-4">
                Please wait while we establish a secure connection
              </p>
            </div>
          </div>
        )}

        {/* Interview duration display */}
        {isStreaming && interviewDuration > 0 && connectionStatus === 'connected' && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-white text-xs z-20">
            {interviewDuration} min
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3 z-20">
          {isStreaming ? (
            <Button
              onClick={stopStreaming}
              size="icon"
              className="rounded-full w-14 h-14 shadow-lg bg-red-500 hover:bg-red-600 text-white"
            >
              <StopCircle className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                onClick={startAudioOnly}
                disabled={userCredits <= 0}
                className="rounded-full h-12 px-4 shadow-lg bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="h-5 w-5" />
                <span>Audio Only</span>
              </Button>
              <Button
                onClick={startScreenAndAudio}
                disabled={userCredits <= 0}
                className="rounded-full h-12 px-4 shadow-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ScreenShare className="h-5 w-5" />
                <span>Screen + Audio</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Audio level indicator */}
      {isStreaming && (
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-blue-400 to-blue-600"
            style={{ 
              width: `${audioLevel}%`,
              transition: 'width 100ms ease-out'
            }}
          />
        </div>
      )}

      <div className="text-sm text-center text-zinc-500">
        {!isStreaming ? (
          userCredits <= 0 ? 
          "You need to purchase more credits to start an interview." :
          "Choose a mode to get started with your interview."
        ) : isAudioOnly ? (
          "Audio-only mode is active. Speak clearly to get interview help."
        ) : isScreenSharing ? (
          "Screen sharing is active. Share your interview questions for better assistance."
        ) : (
          "Audio streaming is active. Please share your screen to continue."
        )}
      </div>
      
      <canvas ref={videoCanvasRef} className="hidden" />
    </div>
  );
} 