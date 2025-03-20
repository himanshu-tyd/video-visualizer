const inputEl = document.querySelector(".audio-input");
const canvasEl = document.querySelector(".canvas");

//1 readfile file input file
//2 create instance of fileRead API to convert file formate into text formate
//3 create arraybuffer  and readFile using reader.readAsArrayBuffer(file) --> arrayBuffer raw array data
//4 conver arrayBuffer into audio buffer using audioContext Api
//5 getChanngle data fro audioBuffer using getChannelData(0) --> 0 represent one side  this will return you PCM data this this the method that used to digitally respresent analog singals

//6 devide channel into cunks so we can fit all data into canvas proccess each chunks into single data point
//7 run loop and display bars on screen
//8 Use FFT algorithem to convert singals from its original time-based formate into a frequencey-based format using analyserNode

//9 convert orignal sample into using ffSize
//10 get ther frequencyData using analyser.frequencyBinCount
//11 connect source and analyser to get realtime data
//12 fetch freqency every 10 second
//13 use requestAnimationFrame smooth animation

inputEl.addEventListener("change", (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader(); //FileReader API to convert the file  text formate

  reader.addEventListener("load", (e) => {
    const arraybuffer = e.target.result;

    const audioContext = new AudioContext();

    audioContext.decodeAudioData(arraybuffer, (audioBuffer) => {
      visualizer(audioBuffer, audioContext);
    });
  });

  reader.readAsArrayBuffer(file);
});

function visualizer(audioBuffer, audioContext) {
  const ctx = canvasEl.getContext("2d");
  canvasEl.width = canvasEl.clientWidth 
  canvasEl.height =canvasEl.clientHeight

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;

  const frequencyBufferLength = analyser.frequencyBinCount;
  const frequencyData = new Uint8Array(frequencyBufferLength);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(analyser);
  source.connect(audioContext.destination);
  source.start();

  const channalData = audioBuffer.getChannelData(1); // it return float32Array that contain PCM data  (Pulse code modulation )  this the method that used to digitally respresent analog singals

  console.log(channalData);

  const numberOfCunks = 500;

  ctx.fillStyle = "rgb(127, 107, 255)";

  const center = canvasEl.height / 2;
  const barWidth = canvasEl.width / frequencyBufferLength;

  const chunksSize = Math.ceil(channalData.length / numberOfCunks); //math.ceil remove floating number

  console.log(chunksSize);

  
 

  function draw() {

    requestAnimationFrame(draw)
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    console.log(frequencyData);
    analyser.getByteFrequencyData(frequencyData);
    for (let i = 0; i < frequencyBufferLength; i++) {
      ctx.fillRect(
        i * barWidth,
         center-frequencyData[i],
        barWidth-1,
        frequencyData[i]
      );
    }
  }

  draw()
}
