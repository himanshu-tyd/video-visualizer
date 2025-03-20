const fileAudioEl = document.getElementById("audio");
const canvasEl = document.getElementById("canvas");
const stopButtonEl = document.getElementById('stop');
const startButtonEl = document.getElementById('start');

// Store references to audio context and buffer for reuse
let globalAudioBuffer = null;
let globalAudioContext = null;
let currentSource = null;
let analyser = null;
let animationId = null;
let isPlaying = false;

// Variables for smooth transitions and effects
let previousFrequencyData = [];
let bassEnergy = 0;
let midEnergy = 0;
let trebleEnergy = 0;
let waveHistory = [];
const HISTORY_LENGTH = 20; // Store multiple frames for wave effect
let colorCycle = 0; // For dynamic color cycling

// Set up canvas dimensions
function setupCanvas() {
  canvasEl.width = window.innerWidth;
  canvasEl.height = window.innerHeight;
  initWaveHistory();
}

function initWaveHistory() {
  waveHistory = [];
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    waveHistory.push(new Array(128).fill(128));
  }
}

// Initialize on load
window.addEventListener('load', setupCanvas);
window.addEventListener('resize', setupCanvas);

fileAudioEl.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Stop any currently playing audio
  if (currentSource) {
    stopAudio();
  }

  const reader = new FileReader(file);

  reader.addEventListener("load", (e) => {
    const arrayBuffer = e.target.result;
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();

    globalAudioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
      //audio buffer that is digital representation of the audio file analog signals
      globalAudioBuffer = audioBuffer;
      visualize(audioBuffer, globalAudioContext);
    });
  });

  reader.readAsArrayBuffer(file);
});

function stopAudio() {
  if (currentSource) {
    currentSource.stop();
    cancelAnimationFrame(animationId);
    isPlaying = false;
    stopButtonEl.disabled = true;
    startButtonEl.disabled = false;
  }
}

function startAudio() {
  if (globalAudioBuffer && globalAudioContext && !isPlaying) {
    visualize(globalAudioBuffer, globalAudioContext);
    isPlaying = true;
    startButtonEl.disabled = true;
    stopButtonEl.disabled = false;
  }
}

function visualize(audioBuffer, audioCtx) {
  const ctx = canvasEl.getContext("2d");
  canvasEl.width = canvasEl.clientWidth;
  canvasEl.height = window.innerHeight;

  analyser = audioCtx.createAnalyser();

  // Increase FFT size for more detailed frequency data
  analyser.fftSize = 2048; // Higher resolution for better wave details
  analyser.smoothingTimeConstant = 0.85;

  const frequencyBufferLength = analyser.frequencyBinCount;
  const frequencyData = new Uint8Array(frequencyBufferLength);
  previousFrequencyData = new Uint8Array(frequencyBufferLength);

  // Time domain data for waveform
  const timeData = new Uint8Array(frequencyBufferLength);

  // Connect source and analyser
  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = audioBuffer;
  currentSource.connect(analyser);
  analyser.connect(audioCtx.destination);
  currentSource.start();

  startButtonEl.disabled = true;
  stopButtonEl.disabled = false;
  isPlaying = true;

  // Set up button event handlers
  stopButtonEl.onclick = stopAudio;
  startButtonEl.onclick = startAudio;

  // Handle source ended event
  currentSource.onended = function() {
    if (isPlaying) {
      stopAudio();
    }
  };

  // Calculate energy levels for different frequency ranges
  function calculateEnergyLevels(frequencyData) {
    const bassRange = Math.floor(frequencyData.length * 0.1); // First 10% - bass
    const midRange = Math.floor(frequencyData.length * 0.3); // Next 20% - mids
    const trebleRange = Math.floor(frequencyData.length * 0.6); // Last 30% - treble
    
    let bassTotal = 0;
    let midTotal = 0;
    let trebleTotal = 0;
    
    // Calculate bass energy
    for (let i = 0; i < bassRange; i++) {
      bassTotal += frequencyData[i];
    }
    
    // Calculate mid energy
    for (let i = bassRange; i < bassRange + midRange; i++) {
      midTotal += frequencyData[i];
    }
    
    // Calculate treble energy
    for (let i = bassRange + midRange; i < bassRange + midRange + trebleRange; i++) {
      trebleTotal += frequencyData[i];
    }
    
    return {
      bass: Math.min(1, bassTotal / (255 * bassRange * 0.8)),
      mid: Math.min(1, midTotal / (255 * midRange * 0.8)),
      treble: Math.min(1, trebleTotal / (255 * trebleRange * 0.8))
    };
  }

  // Generate dynamic colors based on audio energy
  function getDynamicColors(bassEnergy, midEnergy, trebleEnergy) {
    // Increment color cycle (0-360 degrees)
    colorCycle = (colorCycle + 0.5) % 360;
    
    // Base hues - dynamic with audio response
    const redHue = (colorCycle) % 360;
    const blueHue = (colorCycle + 180) % 360;
    const accentHue = (colorCycle + 90) % 360;
    
    // Calculate saturations and brightnesses based on audio energy
    const bassSat = 70 + bassEnergy * 30;
    const midBright = 50 + midEnergy * 50;
    const trebleAlpha = 0.6 + trebleEnergy * 0.4;
    
    return {
      red: `hsla(${redHue}, ${bassSat}%, ${midBright}%, ${trebleAlpha})`,
      blue: `hsla(${blueHue}, ${bassSat}%, ${midBright}%, ${trebleAlpha})`,
      accent: `hsla(${accentHue}, ${bassSat}%, ${midBright}%, ${trebleAlpha * 0.7})`
    };
  }

  function draw() {
    if (isPlaying) {
      animationId = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);
      
      // Calculate energy levels from different frequency ranges
      const energy = calculateEnergyLevels(frequencyData);
      bassEnergy = energy.bass * 1.2; // Boost bass for more dramatic effect
      midEnergy = energy.mid;
      trebleEnergy = energy.treble;
      
      // Update wave history
      waveHistory.unshift(Array.from(timeData.slice(0, 128)));
      if (waveHistory.length > HISTORY_LENGTH) {
        waveHistory.pop();
      }
      
      // Clear the canvas - dark blue background like in the image
      ctx.fillStyle = '#001525';
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      
      // Draw filled background circle (80% opacity as requested)
      drawBackgroundCircle();
      
      // Draw the circular waves
      drawCircularWaves(timeData, frequencyData);
    }
  }

  function drawBackgroundCircle() {
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    const baseRadius = Math.min(canvasEl.width, canvasEl.height) * 0.3;
    
    // Create a radial gradient for the background circle
    const gradient = ctx.createRadialGradient(
      centerX, centerY, baseRadius * 0.1,
      centerX, centerY, baseRadius * 0.9
    );
    
    // Use dynamic colors for the gradient
    const colors = getDynamicColors(bassEnergy, midEnergy, trebleEnergy);
    
    // Background circle with 80% opacity as requested
    gradient.addColorStop(0, 'rgba(10, 20, 40, 0.8)');
    gradient.addColorStop(0.5, `rgba(20, 40, 80, ${0.5 + bassEnergy * 0.3})`);
    gradient.addColorStop(1, 'rgba(5, 15, 35, 0.8)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * (0.9 + bassEnergy * 0.1), 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add pulsating inner glow
    const innerRadius = baseRadius * (0.3 + bassEnergy * 0.2);
    const innerGlow = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, innerRadius
    );
    
    innerGlow.addColorStop(0, `rgba(${100 + trebleEnergy * 155}, ${150 + midEnergy * 105}, ${255}, 0.3)`);
    innerGlow.addColorStop(1, 'rgba(50, 100, 200, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
  }

  function drawCircularWaves(timeData, frequencyData) {
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    
    // Set up parameters to match the image
    const baseRadius = Math.min(canvasEl.width, canvasEl.height) * 0.3;
    const rotationSpeed = 0.0005; // Slow rotation over time
    const currentTime = Date.now();
    
    // Get dynamic colors based on audio energy
    const colors = getDynamicColors(bassEnergy, midEnergy, trebleEnergy);
    
    // Draw multiple waves of different colors and properties
    drawWaveSet({
      color: colors.red, // Dynamic red color
      radius: baseRadius * 1.05,
      amplitude: 25 + (bassEnergy * 60),
      detail: 180,
      phase: currentTime * rotationSpeed,
      width: 1.5,
      count: 15,
      opacity: 0.7,
      wavy: true,
      wavyFactor: 5 + midEnergy * 10
    });
    
    drawWaveSet({
      color: colors.blue, // Dynamic blue color
      radius: baseRadius * 0.98,
      amplitude: 20 + (midEnergy * 55),
      detail: 180,
      phase: -currentTime * rotationSpeed * 0.7,
      width: 1.5,
      count: 15,
      opacity: 0.75,
      wavy: true,
      wavyFactor: 3 + trebleEnergy * 12
    });
    
    // Draw additional subtle connecting waves
    drawWaveSet({
      color: colors.accent, // Dynamic accent color
      radius: baseRadius * 1.02,
      amplitude: 15 + (trebleEnergy * 40),
      detail: 90,
      phase: currentTime * rotationSpeed * 1.2,
      width: 0.5,
      count: 5,
      opacity: 0.4,
      wavy: true,
      wavyFactor: 8 + bassEnergy * 8
    });
    
    function drawWaveSet(options) {
      const { 
        color, radius, amplitude, detail, phase, width, count, opacity,
        wavy, wavyFactor
      } = options;
      
      // Draw multiple lines with slight variations
      for (let w = 0; w < count; w++) {
        const waveOffset = (w / count) * Math.PI * 2; // Distribute waves
        const waveAmplitude = amplitude * (1 - w/count * 0.6); // Decreasing amplitude
        const waveRadius = radius * (1 + w/count * 0.1); // Increasing radius slightly
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = opacity * (1 - w/count * 0.5); // Fade out
        
        // Create the wave path
        const points = [];
        for (let i = 0; i <= detail; i++) {
          const angle = (i / detail) * Math.PI * 2;
          const timeDataIndex = Math.floor((i / detail) * timeData.length);
          
          // Use both time domain and frequency data for complex movement
          const timeValue = (timeData[timeDataIndex] - 128) / 128;
          const freqValue = frequencyData[timeDataIndex] / 255;
          
          // Calculate dynamic wave shape with added waviness
          let wobble = waveAmplitude * timeValue;
          let freqAmp = freqValue * waveAmplitude * 0.5;
          
          // Add extra waviness if requested
          if (wavy) {
            wobble += Math.sin(angle * wavyFactor + phase * 3) * waveAmplitude * 0.3;
            freqAmp += Math.cos(angle * (wavyFactor * 0.7) - phase * 2) * waveAmplitude * 0.2;
          }
          
          // Add variations based on different formulas for organic look
          const variation = 
            Math.sin(angle * 3 + phase + waveOffset) * wobble + 
            Math.sin(angle * 5 - phase * 1.3) * freqAmp;
          
          const x = centerX + Math.cos(angle + phase + waveOffset) * (waveRadius + variation);
          const y = centerY + Math.sin(angle + phase + waveOffset) * (waveRadius + variation);
          
          points.push({x, y});
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Use bezier curves for smoother waves
            if (i > 1 && i < detail && wavy) {
              const prev = points[i-1];
              const prev2 = points[i-2];
              const cpx1 = (prev.x + x) / 2;
              const cpy1 = (prev.y + y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, cpx1, cpy1);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        
        // Close the path
        ctx.closePath();
        
        // Add subtle glow to the lines
        ctx.shadowBlur = 8 + bassEnergy * 5;
        ctx.shadowColor = color;
        
        ctx.stroke();
        
        // Fill with very low opacity for subtle effect
        if (w % 3 === 0) { // Only fill every third wave for performance
          const fillColor = color.replace(/rgba?\(/, 'rgba(').replace(/\)/, `,${0.03 + bassEnergy * 0.02})`);
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        
        // Reset shadow for next drawing
        ctx.shadowBlur = 0;
      }
      
      ctx.globalAlpha = 1; // Reset alpha
    }
    
    // Add particle effects based on frequency data
    drawParticles();
  }
  
  function drawParticles() {
    const centerX = canvasEl.width / 2;
    const centerY = canvasEl.height / 2;
    const baseRadius = Math.min(canvasEl.width, canvasEl.height) * 0.3;
    
    // Get current colors
    const colors = getDynamicColors(bassEnergy, midEnergy, trebleEnergy);
    
    // Draw particles only when energy is high enough
    const particleThreshold = 0.4;
    if (bassEnergy > particleThreshold || midEnergy > particleThreshold) {
      const particleCount = Math.floor(20 + (bassEnergy + midEnergy) * 30);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = baseRadius * (0.8 + Math.random() * 0.6);
        
        const size = 1 + Math.random() * 3 * (bassEnergy + midEnergy);
        
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // Alternate between colors
        const particleColor = i % 2 === 0 ? colors.red : colors.blue;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particleColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  draw();
}