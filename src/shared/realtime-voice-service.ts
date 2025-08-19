import { VoiceSettings, SpeechRecognitionSettings } from '../types/api';

export class RealtimeVoiceService {
  private static instance: RealtimeVoiceService | null = null;
  
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private isListening = false;
  private isSpeaking = false;
  private apiKey: string = '';
  private sessionId: string = '';

  // Singleton pattern to prevent multiple instances
  static getInstance(): RealtimeVoiceService {
    if (!RealtimeVoiceService.instance) {
      RealtimeVoiceService.instance = new RealtimeVoiceService();
    }
    return RealtimeVoiceService.instance;
  }
  
  // Audio streaming
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  
  // Voice Activity Detection
  private vadEnabled = true;
  private speechStartThreshold = 0.01;
  private speechEndTimeout = 1000; // 1 second of silence to stop
  private speechEndTimer: NodeJS.Timeout | null = null;
  
  // Event handlers
  private onSpeechResult?: (text: string, isFinal: boolean) => void;
  private onSpeechError?: (error: string) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onSpeakStart?: () => void;
  private onSpeakEnd?: () => void;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 // OpenAI Realtime uses 24kHz
      });
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('LeetMentor Realtime: Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  // Configuration
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Event listeners
  setEventHandlers(handlers: {
    onSpeechResult?: (text: string, isFinal: boolean) => void;
    onSpeechError?: (error: string) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onSpeakStart?: () => void;
    onSpeakEnd?: () => void;
  }) {
    this.onSpeechResult = handlers.onSpeechResult;
    this.onSpeechError = handlers.onSpeechError;
    this.onSpeechStart = handlers.onSpeechStart;
    this.onSpeechEnd = handlers.onSpeechEnd;
    this.onSpeakStart = handlers.onSpeakStart;
    this.onSpeakEnd = handlers.onSpeakEnd;
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.isConnected || this.websocket?.readyState === WebSocket.CONNECTING) {
      console.log('LeetMentor Realtime: Already connected or connecting');
      return;
    }
    
    try {
      console.log('LeetMentor Realtime: Connecting to backend proxy...');
      
      // Connect to our backend proxy server
      const proxyUrl = this.getProxyUrl();
      console.log(`LeetMentor Realtime: Connecting to ${proxyUrl}`);
      
      this.websocket = new WebSocket(proxyUrl);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - is backend server running?'));
        }, 10000); // 10 second timeout

        this.websocket!.onopen = () => {
          clearTimeout(timeout);
          console.log('LeetMentor Realtime: Connected to backend proxy');
          
          // Send connect message to proxy
          this.websocket!.send(JSON.stringify({ type: 'connect' }));
          resolve();
        };

        this.websocket!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connection_status' && data.status === 'connected') {
              console.log('LeetMentor Realtime: Backend connected to OpenAI!');
              this.isConnected = true;
              // Small delay to ensure session is fully ready
              setTimeout(() => {
                this.initializeSession();
                resolve();
              }, 500);
            } else if (data.type === 'connection_status' && data.status === 'disconnected') {
              console.warn('LeetMentor Realtime: Upstream disconnected:', data.message);
              this.isConnected = false;
              this.sessionConfigurationStage = 'minimal'; // Reset configuration stage
              // Pause audio capture immediately
              if (this.isListening) {
                this.stopListening();
                console.log('LeetMentor Realtime: Audio capture paused due to upstream disconnect');
              }
            } else if (data.type === 'connection_status' && data.status === 'failed') {
              console.error('LeetMentor Realtime: Connection failed permanently:', data.message);
              this.isConnected = false;
              this.sessionConfigurationStage = 'minimal'; // Reset configuration stage
              this.onSpeechError?.(data.message || 'Connection failed after multiple attempts');
              // Stop trying to use the service
              if (this.isListening) {
                this.stopListening();
              }
            } else if (data.type === 'connection_status' && data.status === 'replaced') {
              console.warn('LeetMentor Realtime: Connection replaced by newer instance:', data.message);
              this.isConnected = false;
              this.sessionConfigurationStage = 'minimal'; // Reset configuration stage
              // Gracefully handle being replaced - don't show error to user
              if (this.isListening) {
                this.stopListening();
              }
            } else if (data.type === 'error') {
              console.error('LeetMentor Realtime: Backend error:', data.error);
              reject(new Error(data.error));
            } else {
              // Handle regular OpenAI messages
              this.handleWebSocketMessage(data);
            }
          } catch (e) {
            // Handle binary/non-JSON messages (audio data)
            this.handleWebSocketMessage(event.data);
          }
        };

        this.websocket!.onclose = () => {
          clearTimeout(timeout);
          console.log('LeetMentor Realtime: Disconnected from backend proxy');
          this.isConnected = false;
          this.sessionConfigurationStage = 'minimal'; // Reset configuration stage on disconnect
        };

        this.websocket!.onerror = (error) => {
          clearTimeout(timeout);
          console.error('LeetMentor Realtime: WebSocket error:', error);
          reject(new Error('Failed to connect to backend proxy'));
        };
      });

    } catch (error) {
      console.error('Failed to connect to Realtime API proxy:', error);
      throw error;
    }
  }

  private getProxyUrl(): string {
    // Try different backend locations
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.protocol === 'chrome-extension:';
    
    if (isDevelopment) {
      return 'ws://localhost:8080';
    } else {
      // Production deployment URL (we'll update this when deployed)
      return 'wss://your-app.railway.app'; // Will be updated
    }
  }

  private initializeSession() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Start with MINIMAL configuration to avoid immediate 1000 closure
    const minimalSessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful AI assistant for coding interview practice. Be conversational and encouraging.'
        // INTENTIONALLY minimal - we'll add more after confirming stability
      }
    };

    console.log('LeetMentor Realtime: Sending minimal session configuration...');
    this.websocket.send(JSON.stringify(minimalSessionConfig));
    console.log('LeetMentor Realtime: Minimal session configuration sent - waiting for confirmation');
  }

  private sendEnhancedSessionConfig() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Enhanced configuration sent AFTER we confirm the minimal one works
    const enhancedSessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful AI assistant for coding interview practice. Be conversational and encouraging.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        temperature: 0.8
      }
    };

    console.log('LeetMentor Realtime: Sending enhanced session configuration...');
    this.websocket.send(JSON.stringify(enhancedSessionConfig));
    console.log('LeetMentor Realtime: Enhanced session configuration sent');
  }

  private sessionConfigurationStage: 'minimal' | 'enhanced' | 'complete' = 'minimal';

  private handleWebSocketMessage(message: any) {
    console.log('LeetMentor Realtime: Received message type:', message.type);
    
    switch (message.type) {
      case 'session.created':
        this.sessionId = message.session.id;
        console.log('LeetMentor Realtime: Session created successfully:', this.sessionId);
        break;
        
      case 'session.updated':
        console.log('LeetMentor Realtime: Session updated successfully, stage:', this.sessionConfigurationStage);
        
        // Progressive enhancement after confirming each stage works
        if (this.sessionConfigurationStage === 'minimal') {
          console.log('LeetMentor Realtime: Minimal config successful, sending enhanced config...');
          this.sessionConfigurationStage = 'enhanced';
          // Wait a bit to ensure the minimal config is fully processed
          setTimeout(() => {
            this.sendEnhancedSessionConfig();
          }, 100);
        } else if (this.sessionConfigurationStage === 'enhanced') {
          console.log('LeetMentor Realtime: Enhanced config successful, session fully ready!');
          this.sessionConfigurationStage = 'complete';
        }
        break;
        
      case 'error':
        console.error('LeetMentor Realtime: OpenAI error:', message);
        this.onSpeechError?.(`OpenAI error: ${message.error?.message || 'Unknown error'}`);
        break;

      case 'input_audio_buffer.speech_started':
        console.log('LeetMentor Realtime: Speech started');
        this.isListening = true;
        this.onSpeechStart?.();
        // Stop any current AI speech (barge-in)
        this.interruptSpeech();
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('LeetMentor Realtime: Speech stopped');
        this.isListening = false;
        this.onSpeechEnd?.();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const transcript = message.transcript;
        console.log('LeetMentor Realtime: Transcript:', transcript);
        this.onSpeechResult?.(transcript, true);
        break;

      case 'response.audio.delta':
        // Streaming audio chunks!
        this.handleAudioDelta(message.delta);
        break;

      case 'response.audio.done':
        console.log('LeetMentor Realtime: Audio response complete');
        this.isSpeaking = false;
        this.onSpeakEnd?.();
        break;

      case 'response.done':
        console.log('LeetMentor Realtime: Response complete');
        break;

      case 'error':
        console.error('LeetMentor Realtime: Error:', message.error);
        this.onSpeechError?.(message.error.message);
        break;

      default:
        // console.log('LeetMentor Realtime: Unhandled message:', message.type);
    }
  }

  // Audio streaming (the magic!)
  private handleAudioDelta(deltaBase64: string) {
    if (!this.audioContext || !this.gainNode) return;

    try {
      // Decode base64 audio data
      const binaryString = atob(deltaBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Float32Array (PCM16 to Float32)
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }

      // Queue audio for immediate playback
      this.audioQueue.push(float32);
      
      if (!this.isPlaying) {
        this.startAudioPlayback();
      }

    } catch (error) {
      console.error('Error processing audio delta:', error);
    }
  }

  private startAudioPlayback() {
    if (!this.audioContext || !this.gainNode || this.isPlaying) return;

    this.isPlaying = true;
    this.isSpeaking = true;
    this.onSpeakStart?.();

    const playNextChunk = () => {
      if (this.audioQueue.length === 0) {
        this.isPlaying = false;
        if (!this.isSpeaking) {
          this.onSpeakEnd?.();
        }
        return;
      }

      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.audioContext!.createBuffer(1, audioData.length, 24000);
      audioBuffer.copyToChannel(new Float32Array(audioData), 0);

      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);
      
      source.onended = () => {
        playNextChunk();
      };

      source.start();
    };

    playNextChunk();
  }

  // Voice Activity Detection & Recording
  async startListening(settings: SpeechRecognitionSettings) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log('LeetMentor Realtime: Requesting microphone access...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Check microphone permissions first
      try {
        const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('LeetMentor Realtime: Microphone permission state:', permissions.state);
        
        if (permissions.state === 'denied') {
          throw new Error('Microphone permission denied. Please allow microphone access in browser settings.');
        }
      } catch (permError) {
        console.warn('LeetMentor Realtime: Could not check permissions:', permError);
      }
      
      // Get microphone access with detailed error handling
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }).catch(error => {
        console.error('LeetMentor Realtime: Microphone access failed:', error);
        let errorMessage = 'Failed to access microphone: ';
        
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Permission denied. Please allow microphone access.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Microphone does not meet the required constraints.';
        } else {
          errorMessage += error.message;
        }
        
        throw new Error(errorMessage);
      });
      
      console.log('LeetMentor Realtime: Microphone access granted successfully');

      if (!this.audioContext) return;

      // Create audio processing pipeline
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create simple VAD using ScriptProcessorNode (deprecated but works)
      const processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Simple VAD based on RMS energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // Send audio to OpenAI (convert to PCM16)
        this.sendAudioToRealtime(inputData);
        
        // Voice activity detection
        if (this.vadEnabled) {
          if (rms > this.speechStartThreshold) {
            if (this.speechEndTimer) {
              clearTimeout(this.speechEndTimer);
              this.speechEndTimer = null;
            }
          } else {
            if (!this.speechEndTimer && this.isListening) {
              this.speechEndTimer = setTimeout(() => {
                // Silence detected
                this.sendSilenceToRealtime();
              }, this.speechEndTimeout);
            }
          }
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      console.log('LeetMentor Realtime: Microphone activated with VAD');

    } catch (error) {
      console.error('Failed to start realtime listening:', error);
      // Pass through the specific error message for better user feedback
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      this.onSpeechError?.(errorMessage);
    }
  }

  private sendAudioToRealtime(float32Data: Float32Array) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Convert Float32 to PCM16
    const pcm16 = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
    }

    // Convert to base64
    const bytes = new Uint8Array(pcm16.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: base64
    };

    this.websocket.send(JSON.stringify(audioMessage));
  }

  private sendSilenceToRealtime() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Commit the audio buffer (tells OpenAI to process what we've sent)
    const commitMessage = {
      type: 'input_audio_buffer.commit'
    };

    this.websocket.send(JSON.stringify(commitMessage));
    console.log('LeetMentor Realtime: Audio committed for processing');
  }

  // Barge-in support
  interruptSpeech() {
    if (!this.isSpeaking) return;

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.isSpeaking = false;

    // Stop current response
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const cancelMessage = {
        type: 'response.cancel'
      };
      this.websocket.send(JSON.stringify(cancelMessage));
    }

    console.log('LeetMentor Realtime: Speech interrupted (barge-in)');
  }

  stopListening() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    console.log('LeetMentor Realtime: Stopped listening');
  }

  stopSpeaking() {
    this.interruptSpeech();
  }

  // Send text message (for when user types instead of speaks)
  sendTextMessage(message: string) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    const textMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: message
          }
        ]
      }
    };

    this.websocket.send(JSON.stringify(textMessage));

    // Trigger response
    const responseMessage = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };

    this.websocket.send(JSON.stringify(responseMessage));
  }

  // Cleanup
  disconnect() {
    this.stopListening();
    this.stopSpeaking();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.sessionConfigurationStage = 'minimal'; // Reset configuration stage
    console.log('LeetMentor Realtime: Disconnected and cleaned up');
  }

  // Static method to reset singleton (useful for testing or full resets)
  static resetInstance() {
    if (RealtimeVoiceService.instance) {
      RealtimeVoiceService.instance.disconnect();
      RealtimeVoiceService.instance = null;
      console.log('LeetMentor Realtime: Singleton instance reset');
    }
  }

  // Status getters
  getIsConnected(): boolean {
    return this.isConnected;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
