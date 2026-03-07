/**
 * Multi-Layered Web Audio API Alert System
 * 
 * Creates a rich, attention-commanding notification sound similar to PickMe/Uber driver alerts
 * Uses three overlapping oscillators at different frequencies with ADSR envelopes:
 * - High-frequency attack tone (1200 Hz) - cuts through ambient noise
 * - Mid-frequency body tone (880 Hz) - carries the alert's presence
 * - Low-frequency bass pulse (220 Hz) - provides physical vibration feel
 * 
 * The sequence repeats twice in rapid succession for maximum attention.
 * Volume is programmatically maximized using GainNode.
 */

class DriverAlertSound {
    constructor() {
        // Initialize Web Audio API context
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
    }

    /**
     * Initialize audio context (must be called after user interaction due to browser policy)
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            
            // Set to maximum volume (1.0 = 100%)
            this.masterGain.gain.value = 1.0;
            
            this.isInitialized = true;
            console.log('🔊 Driver Alert Sound System initialized');
        } catch (error) {
            console.error('❌ Failed to initialize audio context:', error);
        }
    }

    /**
     * Play a single tone with ADSR envelope
     * @param {number} frequency - Frequency in Hz
     * @param {number} startTime - When to start (in audio context time)
     * @param {number} duration - Total duration in seconds
     * @param {number} attack - Attack time in seconds
     * @param {number} decay - Decay time in seconds
     * @param {number} sustain - Sustain level (0-1)
     * @param {number} release - Release time in seconds
     * @param {number} volume - Peak volume (0-1)
     */
    playTone(frequency, startTime, duration, attack, decay, sustain, release, volume) {
        if (!this.isInitialized) {
            console.warn('⚠️  Audio context not initialized. Call initialize() first.');
            return;
        }

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine'; // Smooth sine wave
        oscillator.frequency.value = frequency;

        // Create gain node for this specific tone
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;

        // Connect: oscillator → gain → master gain → speakers
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // ADSR Envelope
        const now = this.audioContext.currentTime;
        const attackEnd = startTime + attack;
        const decayEnd = attackEnd + decay;
        const sustainEnd = startTime + duration - release;
        const releaseEnd = sustainEnd + release;

        // Attack: 0 → peak volume
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, attackEnd);

        // Decay: peak → sustain level
        gainNode.gain.linearRampToValueAtTime(volume * sustain, decayEnd);

        // Sustain: hold at sustain level
        gainNode.gain.setValueAtTime(volume * sustain, sustainEnd);

        // Release: sustain → 0
        gainNode.gain.linearRampToValueAtTime(0, releaseEnd);

        // Start and stop oscillator
        oscillator.start(startTime);
        oscillator.stop(releaseEnd);
    }

    /**
     * Play the complete multi-layered alert sequence
     * Fires three tones simultaneously, repeated twice
     */
    playAlert() {
        if (!this.isInitialized) {
            console.warn('⚠️  Audio not initialized. Attempting to initialize...');
            this.initialize();
            if (!this.isInitialized) return;
        }

        const now = this.audioContext.currentTime;

        // Tone configuration
        const tones = [
            { freq: 1200, volume: 0.6, attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.1 }, // High attack
            { freq: 880, volume: 0.7, attack: 0.02, decay: 0.08, sustain: 0.8, release: 0.12 },  // Mid body
            { freq: 220, volume: 0.5, attack: 0.03, decay: 0.1, sustain: 0.6, release: 0.15 }   // Low bass
        ];

        const sequenceDuration = 0.3; // Each sequence lasts 300ms
        const sequenceGap = 0.1;      // 100ms gap between sequences

        // Play first sequence
        tones.forEach(tone => {
            this.playTone(
                tone.freq,
                now + 0.05, // Small delay to ensure context is ready
                sequenceDuration,
                tone.attack,
                tone.decay,
                tone.sustain,
                tone.release,
                tone.volume
            );
        });

        // Play second sequence (repeat)
        const secondSequenceStart = now + 0.05 + sequenceDuration + sequenceGap;
        tones.forEach(tone => {
            this.playTone(
                tone.freq,
                secondSequenceStart,
                sequenceDuration,
                tone.attack,
                tone.decay,
                tone.sustain,
                tone.release,
                tone.volume
            );
        });

        console.log('🔔 Driver alert sound played');
    }

    /**
     * Test the alert sound
     */
    test() {
        console.log('🧪 Testing driver alert sound...');
        this.initialize();
        this.playAlert();
    }
}

// Export singleton instance
export const driverAlertSound = new DriverAlertSound();
