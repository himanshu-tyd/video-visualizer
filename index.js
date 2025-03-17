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
  canvasEl.width = canvasEl.clientWidth;  //clear canvas
  canvasEl.height = 500;

  analyser = audioCtx.createAnalyser();

  //deafult 256
  analyser.fftSize = 256;

  //frequencyBinCount is half of fftSize
  const frequenctBufferLength = analyser.frequencyBinCount;
  //audioBufferSourceNode is a audio node that represent the audio source
  const frequencyData = new Uint8Array(frequenctBufferLength);

  //connect source and analyser to get realtime data
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

  const channelData = audioBuffer.getChannelData(0);

  const numberOfchunaks = 400;

  const chunkSize = Math.ceil(channelData.length / numberOfchunaks);
  console.log("chunkSize", chunkSize);

  
  // Make bars bigger by reducing the bars shown (using a multiplier)
  const barMultiplier = 1; // Increase this value to make bars bigger
  const barWidth = (canvasEl.width / frequenctBufferLength) * barMultiplier;
  
  function draw() {
    // Only continue animation if we're playing
    if (isPlaying) {
      animationId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      analyser.getByteFrequencyData(frequencyData);
      //channgel data audiobuffer.getChannelData(0) 0 is PCM pusle code modulation
      //use to digital representaion of analog signals PCM DATA
      console.log(frequencyData);
      
      for (let i = 0; i < frequenctBufferLength; i += barMultiplier) {
        
        console.log(frequenctBufferLength);

        ctx.fillStyle = `rgba(70, 24, 255 , ${frequencyData[i] / 255})`;
        ctx.fillRect(
          (i / barMultiplier) * barWidth,
          canvasEl.height - frequencyData[i],
          barWidth - 2, // Slightly smaller for gap between bars
          frequencyData[i]
        );
      }
    }
  }

  draw();
}
