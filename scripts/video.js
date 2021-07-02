let myElement = document.querySelector(".Blocker");
let myText = document.querySelector(".BlockerText");



let lookingAtScreen = false
let audiotag = document.getElementById("audiotag1")
let videoWidth, videoHeight

// whether streaming video from the camera.
let streaming = true

let video = document.getElementById('video')
let canvasOutput = document.getElementById('canvasOutput')
let canvasOutputCtx = canvasOutput.getContext('2d')
let stream = null

let detectFace = document.getElementById('face')
let detectEye = document.getElementById('eye')


function startCamera () {
  if (streaming) return
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then(function (s) {
      stream = s
      video.srcObject = s
      video.play()
    })
    .catch(function (err) {
      console.log('An error occured! ' + err)
    })

  video.addEventListener(
    'canplay',
    function (ev) {
      if (!streaming) {
        videoWidth = video.videoWidth
        videoHeight = video.videoHeight
        video.setAttribute('width', videoWidth)
        video.setAttribute('height', videoHeight)
        canvasOutput.width = videoWidth
        canvasOutput.height = videoHeight
        streaming = true
      }
      startVideoProcessing()
    },
    false
  )
}

let faceClassifier = null
let eyeClassifier = null

let src = null
let dstC1 = null
let dstC3 = null
let dstC4 = null

let canvasInput = null
let canvasInputCtx = null

let canvasBuffer = null
let canvasBufferCtx = null

function startVideoProcessing () {
  if (!streaming) {
    console.warn('Please startup your webcam')
    return
  }
  stopVideoProcessing()
  canvasInput = document.createElement('canvas')
  canvasInput.width = videoWidth
  canvasInput.height = videoHeight
  canvasInputCtx = canvasInput.getContext('2d')

  canvasBuffer = document.createElement('canvas')
  canvasBuffer.width = videoWidth
  canvasBuffer.height = videoHeight
  canvasBufferCtx = canvasBuffer.getContext('2d')

  srcMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4)
  grayMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC1)

  faceClassifier = new cv.CascadeClassifier()
  faceClassifier.load('haarcascade_frontalface_default.xml')

  eyeClassifier = new cv.CascadeClassifier()
  eyeClassifier.load('haarcascade_eye.xml')

  requestAnimationFrame(processVideo)
}

function processVideo () {
  stats.begin()
  canvasInputCtx.drawImage(video, 0, 0, videoWidth, videoHeight)
  let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight)
  srcMat.data.set(imageData.data)
  cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY)
  let faces = []
  let eyes = []
  let size
  if (detectFace.checked) {
    let faceVect = new cv.RectVector()
    let faceMat = new cv.Mat()
    if (detectEye.checked) {
      cv.pyrDown(grayMat, faceMat)
      size = faceMat.size()
    } else {
      cv.pyrDown(grayMat, faceMat)
      cv.pyrDown(faceMat, faceMat)
      size = faceMat.size()
    }
    faceClassifier.detectMultiScale(faceMat, faceVect)
    if (faceVect.size() < 1) {
      lookingAtScreen = false
      console.log('No audience detected!')
    //   myElement.style.display = "grid";

    //   myText.textContent = "RESUME VIEWING"
    //   player.pauseVideo();
    //   audiotag.play();
    }
    
  


    for (let i = 0; i < faceVect.size(); i++) {
      let face = faceVect.get(i)
      lookingAtScreen = true
      console.log('Human is watching')
    //   player.playVideo();
    //   audiotag.pause();
    //   myElement.style.display = "none";
      // !!! Uncomment to enable anti shoulder-surfer !!!
      //   if (faceVect.size() > 1) {
      //   lookingAtScreen = false
      //   console.log('Spy audience detected!')
      //   myElement.style.display = "grid";
      //   myText.textContent = "SHOULDER SURFER DETECTED"
      //   player.pauseVideo();
      //   audiotag.play();
      // }
      faces.push(new cv.Rect(face.x, face.y, face.width, face.height))
      if (detectEye.checked) {
        let eyeVect = new cv.RectVector()
        let eyeMat = faceMat.getRoiRect(face)
        eyeClassifier.detectMultiScale(eyeMat, eyeVect)
        for (let i = 0; i < eyeVect.size(); i++) {
          let eye = eyeVect.get(i)
          eyes.push(
            new cv.Rect(face.x + eye.x, face.y + eye.y, eye.width, eye.height)
          )
        }
        eyeMat.delete()
        eyeVect.delete()
      }
    }
    faceMat.delete()
    faceVect.delete()
  } else {
    if (detectEye.checked) {
      let eyeVect = new cv.RectVector()
      let eyeMat = new cv.Mat()
      cv.pyrDown(grayMat, eyeMat)
      size = eyeMat.size()
      eyeClassifier.detectMultiScale(eyeMat, eyeVect)
      for (let i = 0; i < eyeVect.size(); i++) {
        let eye = eyeVect.get(i)
        eyes.push(new cv.Rect(eye.x, eye.y, eye.width, eye.height))
      }
      eyeMat.delete()
      eyeVect.delete()
    }
  }
  canvasOutputCtx.drawImage(canvasInput, 0, 0, videoWidth, videoHeight)
  drawResults(canvasOutputCtx, faces, 'red', size)
  drawResults(canvasOutputCtx, eyes, 'yellow', size)
  stats.end()
  requestAnimationFrame(processVideo)
}

function drawResults (ctx, results, color, size) {
  for (let i = 0; i < results.length; ++i) {
    let rect = results[i]
    let xRatio = videoWidth / size.width
    let yRatio = videoHeight / size.height
    ctx.lineWidth = 3
    ctx.strokeStyle = color
    ctx.strokeRect(
      rect.x * xRatio,
      rect.y * yRatio,
      rect.width * xRatio,
      rect.height * yRatio
    )
  }
}

function stopVideoProcessing () {
  if (src != null && !src.isDeleted()) src.delete()
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete()
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete()
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete()
}

function stopCamera () {
  if (!streaming) return
  stopVideoProcessing()
  document
    .getElementById('canvasOutput')
    .getContext('2d')
    .clearRect(0, 0, width, height)
  video.pause()
  video.srcObject = null
  stream.getVideoTracks()[0].stop()
  streaming = false
}

function initUI () {
  stats = new Stats()
  stats.showPanel(0)
  document.getElementById('container').appendChild(stats.dom)
}

function opencvIsReady () {
  console.log('OpenCV.js is ready')
  window.onload = function(){
  initUI()
  startCamera()
  };
}


//  // 2. This code loads the IFrame Player API code asynchronously.
//  var tag = document.createElement('script');

//  tag.src = "https://www.youtube.com/iframe_api";
//  var firstScriptTag = document.getElementsByTagName('script')[0];
//  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

//  // 3. This function creates an <iframe> (and YouTube player)
//  //    after the API code downloads.
//  var player;
//  function onYouTubeIframeAPIReady() {
//    player = new YT.Player('player', {
//      height: screen.height,
//      width: screen.width,
//      videoId: '8UCV2qmryuU',
//      events: {
//        'onReady': onPlayerReady,
//        'onStateChange': onPlayerStateChange
//      }
//    });
//  }

//  // 4. The API will call this function when the video player is ready.
//  function onPlayerReady(event) {

//   player.setVolume('30');
//    event.target.playVideo();

//  }



//  // 5. The API calls this function when the player's state changes.
//  //    The function indicates that when playing a video (state=1),
//  //    the player should play for six seconds and then stop.

//  function stopVideo() {

// }
// function playVideo() {
//  player.playVideo();
// }



//  function onPlayerStateChange(event) {



//  }