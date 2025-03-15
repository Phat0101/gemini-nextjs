// app/components/CameraPreview.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
// import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Video, VideoOff, FlipHorizontal, Loader2 } from "lucide-react";
import { GeminiWebSocket } from '../../services/chatGeminiWebSocket';
import { Base64 } from 'js-base64';
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface CameraPreviewProps {
  onTranscription: (text: string) => void;
}

export default function ChatCameraPreview({ onTranscription }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const geminiWsRef = useRef<GeminiWebSocket | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const setupInProgressRef = useRef(false);
  const [isWebSocketReady, setIsWebSocketReady] = useState(false);
  const imageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [outputAudioLevel, setOutputAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraSupported, setIsCameraSupported] = useState(true);

  // Check if device has multiple cameras
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  useEffect(() => {
    // Check if the device is likely a mobile device with multiple cameras
    if (typeof navigator !== 'undefined' && 
        typeof navigator.mediaDevices !== 'undefined' && 
        navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        })
        .catch(err => {
          console.error("Error checking camera devices:", err);
        });
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

  // Simplify sendAudioData to just send continuously
  const sendAudioData = (b64Data: string) => {
    if (!geminiWsRef.current) return;
    geminiWsRef.current.sendMediaChunk(b64Data, "audio/pcm");
  };

  const flipCamera = async () => {
    if (!isStreaming || !stream) return;
    
    // Stop all current tracks
    stream.getTracks().forEach(track => track.stop());
    
    // Toggle facing mode
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    try {
      // Get new video stream with flipped camera
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      // Create new audio stream with the desired settings
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });
      
      // Create new combined stream with both video and audio
      const combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...audioStream.getTracks()
      ]);
      
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.muted = true;
      }
      
      setStream(combinedStream);
      
      // Reset audio processing to ensure it uses the new stream
      setIsAudioSetup(false);
      
    } catch (err) {
      console.error('Error flipping camera:', err);
      setIsCameraSupported(false);
    }
  };

  const toggleCamera = async () => {
    if (isStreaming && stream) {
      setIsStreaming(false);
      cleanupWebSocket();
      cleanupAudio();
      stream.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

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
          videoRef.current.srcObject = videoStream;
          videoRef.current.muted = true;
        }

        const combinedStream = new MediaStream([
          ...videoStream.getTracks(),
          ...audioStream.getTracks()
        ]);

        setStream(combinedStream);
        setIsStreaming(true);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setIsCameraSupported(false);
        cleanupAudio();
      }
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isStreaming) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    geminiWsRef.current = new GeminiWebSocket(
      (text) => {
        console.log("Received from AI:", text);
      },
      () => {
        console.log("[Camera] WebSocket setup complete, starting media capture");
        setIsWebSocketReady(true);
        setConnectionStatus('connected');
      },
      (isPlaying) => {
        setIsModelSpeaking(isPlaying);
      },
      (level) => {
        setOutputAudioLevel(level);
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
  }, [isStreaming, onTranscription, cleanupWebSocket]);

  // Start image capture only after WebSocket is ready
  useEffect(() => {
    if (!isStreaming || !isWebSocketReady) return;

    console.log("[Camera] Starting image capture interval");
    imageIntervalRef.current = setInterval(captureAndSendImage, 1000);

    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
        imageIntervalRef.current = null;
      }
    };
  }, [isStreaming, isWebSocketReady]);

  // Update audio processing setup
  useEffect(() => {
    if (!isStreaming || !stream || !audioContextRef.current || 
        !isWebSocketReady || isAudioSetup || setupInProgressRef.current) return;

    let isActive = true;
    setupInProgressRef.current = true;
    
    console.log("[Camera] Setting up audio processing with facing mode:", facingMode);

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
            bufferSize: 4096,  // Larger buffer size like original
          },
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        });

        const source = ctx.createMediaStreamSource(stream);
        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isActive || isModelSpeaking) return;
          const { pcmData, level } = event.data;
          setAudioLevel(level);

          const pcmArray = new Uint8Array(pcmData);
          const b64Data = Base64.fromUint8Array(pcmArray);
          sendAudioData(b64Data);
        };

        source.connect(audioWorkletNodeRef.current);
        setIsAudioSetup(true);
        setupInProgressRef.current = false;
        console.log("[Camera] Audio processing setup complete for facing mode:", facingMode);

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

    console.log("[Camera] Starting audio processing setup");
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
  }, [isStreaming, stream, isWebSocketReady, isModelSpeaking, facingMode]);

  // Capture and send image
  const captureAndSendImage = () => {
    if (!videoRef.current || !videoCanvasRef.current || !geminiWsRef.current) return;

    const canvas = videoCanvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert to base64 and send
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const b64Data = imageData.split(',')[1];
    geminiWsRef.current.sendMediaChunk(b64Data, "image/jpeg");
  };

  if (!isCameraSupported) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-red-50 rounded-lg border border-red-200 text-center">
        <div className="text-red-500 text-xl font-medium">Camera not supported</div>
        <p className="text-red-700">Your device doesn&apos;t support the camera features needed for this app.</p>
        <Button onClick={() => setIsCameraSupported(true)} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[640px]">
      <div className="relative sm:aspect-video aspect-[7/8] bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        
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

        {/* Camera controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4 z-20">
          {/* Main camera toggle button */}
          <Button
            onClick={toggleCamera}
            size="icon"
            className={`rounded-full w-14 h-14 shadow-lg transition-colors
              ${isStreaming 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
          >
            {isStreaming ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
          
          {/* Camera flip button - only show when streaming and device has multiple cameras */}
          {isStreaming && hasMultipleCameras && (
            <Button
              onClick={flipCamera}
              size="icon"
              className="rounded-full w-10 h-10 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-white shadow-lg"
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Audio level indicator */}
      {isStreaming && (
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-400 to-emerald-600"
            style={{ 
              width: `${isModelSpeaking ? outputAudioLevel : audioLevel}%`,
              transition: 'width 100ms ease-out'
            }}
          />
        </div>
      )}
      
      <canvas ref={videoCanvasRef} className="hidden" />
    </div>
  );
}
