
'use strict';

const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const mutedButton = document.getElementById('muted');
const aVButton = document.getElementById('aV');
const holaButton = document.getElementById('hola');
const adiosButton = document.getElementById('adios');
const levManoButton = document.getElementById('lev-mano');
hangupButton.disabled = true;

let localStream;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let pc;
let muted;
let remote_muted;
muted = true;
remote_muted = true;

const signaling = new BroadcastChannel('webrtc');
signaling.onmessage = e => {
  if (!localStream) {
    console.log('not ready yet');
    return;
  }

  switch (e.data.type) {
    case 'offer':
      handleOffer(e.data);
      break;
    case 'answer':
      handleAnswer(e.data);
      break;
    case 'candidate':
      handleCandidate(e.data);
      break;
    case 'ready':
      if (pc) {
        console.log('already in call, ignoring');
        return;
      }
      makeCall();
      break;
    case 'bye':
      if (pc) {
        hangup();
      }
      break;
    case 'muteStatus':
      handleMuteStatus(e.data);
      break;
    case 'aVStatus':
      handleaVStatus();
    break;
    case 'holaStatus':
      handleHolaStatus();
    break;
    case 'adiosStatus':
      handleAdiosStatus();
    break;
    case 'levManoStatus':
      handleLevManoStatus();
    break;
    default:
      console.log('unhandled', e); // Manejar el mensaje no manejado
      break;
  }
};


// Verificar compatibilidad de getUserMedia
navigator.getUserMedia = navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia;

startButton.onclick = async () => {
  try {
    // Verificar si getUserMedia está disponible
    if (navigator.getUserMedia) {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localVideo.srcObject = localStream;

      startButton.disabled = true;
      hangupButton.disabled = false;

      signaling.postMessage({ type: 'ready' });
    } else {
      console.error('getUserMedia no está disponible en este navegador.');
    }
  } catch (error) {
    console.error('Error al obtener el dispositivo de medios:', error.message);
  }
};

hangupButton.onclick = async () => {
  hangup();
  signaling.postMessage({type: 'bye'});
};

mutedButton.onclick = async () => {
  if (muted) {
      localStream.getAudioTracks().forEach(track => track.enabled = false);
      console.log("Muteado");
      showMuteIndicator(true);
      // Informar a la otra persona sobre el cambio de estado de silencio
      signaling.postMessage({ type: 'muteStatus'});
  } else {
      localStream.getAudioTracks().forEach(track => track.enabled = true);
      console.log("Desmuteado");
      showMuteIndicator(false);
      // Informar a la otra persona sobre el cambio de estado de silencio
      signaling.postMessage({ type: 'muteStatus'});
  }

  muted = !muted;
};

aVButton.onclick = async () => {
  signaling.postMessage({ type: 'aVStatus'});
  const aVIndicator = document.getElementById('aVIndicator');
  aVIndicator.style.visibility = 'visible';
  // Establecer un temporizador para ocultar el indicador después de 5 segundos
  setTimeout(() => {
    aVIndicator.style.visibility = 'hidden';
  }, 5000); // 5000 milisegundos = 5 segundos
};

holaButton.onclick = async () => {
  signaling.postMessage({ type: 'holaStatus'});
  const holaIndicator = document.getElementById('holaIndicator');
  holaIndicator.style.visibility = 'visible';
  // Establecer un temporizador para ocultar el indicador después de 5 segundos
  setTimeout(() => {
    holaIndicator.style.visibility = 'hidden';
  }, 5000); // 5000 milisegundos = 5 segundos
};

adiosButton.onclick = async () => {
  signaling.postMessage({ type: 'adiosStatus'});
  const adiosIndicator = document.getElementById('adiosIndicator');
  adiosIndicator.style.visibility = 'visible';
  // Establecer un temporizador para ocultar el indicador después de 5 segundos
  setTimeout(() => {
    adiosIndicator.style.visibility = 'hidden';
  }, 5000); // 5000 milisegundos = 5 segundos
};

levManoButton.onclick = async () => {
  signaling.postMessage({ type: 'levManoStatus'});
  const levManoIndicator = document.getElementById('levManoIndicator');
  levManoIndicator.style.visibility = 'visible';
  // Establecer un temporizador para ocultar el indicador después de 5 segundos
  setTimeout(() => {
    levManoIndicator.style.visibility = 'hidden';
  }, 5000); // 5000 milisegundos = 5 segundos
};

function showMuteIndicator(show) {
  const muteIndicator = document.getElementById('muteIndicator');
  muteIndicator.style.visibility = show ? 'visible' : 'hidden';
}

async function hangup() {
  if (pc) {
    pc.close();
    pc = null;
  }
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
  showMuteIndicator(false);
};

function createPeerConnection() {
  pc = new RTCPeerConnection();
  pc.onicecandidate = e => {
    const message = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    signaling.postMessage(message);
  };
  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

async function makeCall() {
  await createPeerConnection();

  const offer = await pc.createOffer();
  signaling.postMessage({type: 'offer', sdp: offer.sdp});
  await pc.setLocalDescription(offer);
}

async function handleOffer(offer) {
  if (pc) {
    console.error('existing peerconnection');
    return;
  }
  await createPeerConnection();
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  signaling.postMessage({type: 'answer', sdp: answer.sdp});
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleMuteStatus() {
  const remoteMuteIndicator = document.getElementById('remoteMuteIndicator');
  if (remoteMuteIndicator) {
    const remoteStream = remoteVideo.srcObject;

    if (remoteStream) {
      const remoteAudioTracks = remoteStream.getAudioTracks();

      if (remoteAudioTracks.length > 0) {
        const remoteAudioTrack = remoteAudioTracks[0];

        if (remote_muted) {
          remoteAudioTrack.enabled = false;
          console.log("Invitado Muteado");
          remoteMuteIndicator.style.visibility = 'visible';
        } else {
          remoteAudioTrack.enabled = true;
          console.log("Invitado Desmuteado");
          remoteMuteIndicator.style.visibility = 'hidden';
        }
      }
    } else {
      console.error('No se encontró un MediaStream en remoteVideo.');
    }
  } else {
    console.error('Elemento remoteMuteIndicator no encontrado en el DOM.');
  }
  console.log('Valor de remote_muted antes:', remote_muted);
  remote_muted = !remote_muted;
  console.log('Valor de remote_muted despues:', remote_muted);
}

async function handleaVStatus(){
  const remoteAVIndicator = document.getElementById('remoteAVIndicator');
  if (remoteAVIndicator) {
    remoteAVIndicator.style.visibility = 'visible';
    // Establecer un temporizador para ocultar el indicador después de 5 segundos
    setTimeout(() => {
      remoteAVIndicator.style.visibility = 'hidden';
    }, 5000); // 5000 milisegundos = 5 segundos
  }else {
    console.error('Elemento no encontrado en el DOM.');
  }
}

async function handleHolaStatus(){
  const remoteHolaIndicator = document.getElementById('remoteHolaIndicator');
  if (remoteHolaIndicator) {
    remoteHolaIndicator.style.visibility = 'visible';
    // Establecer un temporizador para ocultar el indicador después de 5 segundos
    setTimeout(() => {
      remoteHolaIndicator.style.visibility = 'hidden';
    }, 5000); // 5000 milisegundos = 5 segundos
  }else {
    console.error('Elemento no encontrado en el DOM.');
  }
}

async function handleAdiosStatus(){
  const remoteAdiosIndicator = document.getElementById('remoteAdiosIndicator');
  if (remoteAdiosIndicator) {
    remoteAdiosIndicator.style.visibility = 'visible';
    // Establecer un temporizador para ocultar el indicador después de 5 segundos
    setTimeout(() => {
      remoteAdiosIndicator.style.visibility = 'hidden';
    }, 5000); // 5000 milisegundos = 5 segundos
  }else {
    console.error('Elemento no encontrado en el DOM.');
  }
}

async function handleLevManoStatus(){
  const remoteLevManoIndicator = document.getElementById('remoteLevManoIndicator');
  if (remoteLevManoIndicator) {
    remoteLevManoIndicator.style.visibility = 'visible';
    // Establecer un temporizador para ocultar el indicador después de 5 segundos
    setTimeout(() => {
      remoteLevManoIndicator.style.visibility = 'hidden';
    }, 5000); // 5000 milisegundos = 5 segundos
  }else {
    console.error('Elemento no encontrado en el DOM.');
  }
}


async function handleCandidate(candidate) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  if (!candidate.candidate) {
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}
