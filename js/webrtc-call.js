// WebRTC Call Manager
class CallManager {
  constructor() {
    this.localStream = null
    this.remoteStream = null
    this.peerConnection = null
    this.socket = null
    this.isCallActive = false
    this.isIncomingCall = false
    this.currentCallId = null
    this.remoteUserId = null
    this.localUserId = null

    // WebRTC configuration
    this.pcConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    }

    this.init()
  }

  init() {
    const user = JSON.parse(localStorage.getItem("user"))
    if (user) {
      this.localUserId = user._id
      console.log("CallManager initialized for user:", this.localUserId)
      this.setupSocket()
    } else {
      console.error("No user found in localStorage for CallManager")
    }
  }

  setupSocket() {
    // Try to use existing global socket first
    if (window.globalSocket && window.globalSocket.connected) {
      this.socket = window.globalSocket
      this.setupSocketListeners()
      console.log("CallManager connected to existing socket")
      return
    }

    // If no global socket, create new connection
    const io = window.io // Declare the io variable here
    if (typeof io !== "undefined") {
      const BACKEND_URL = window.BACKEND_URL || "https://platego-smi4.onrender.com"
      this.socket = io(BACKEND_URL)

      this.socket.on("connect", () => {
        console.log("CallManager socket connected")
        this.socket.emit("joinUser", this.localUserId)
        this.setupSocketListeners()
      })

      this.socket.on("disconnect", () => {
        console.log("CallManager socket disconnected")
      })
    } else {
      console.log("Socket.io not available, retrying...")
      setTimeout(() => this.setupSocket(), 1000)
    }
  }

  setupSocketListeners() {
    // Incoming call
    this.socket.on("incomingCall", (data) => {
      this.handleIncomingCall(data)
    })

    // Call accepted
    this.socket.on("callAccepted", (data) => {
      this.handleCallAccepted(data)
    })

    // Call rejected
    this.socket.on("callRejected", (data) => {
      this.handleCallRejected(data)
    })

    // Call ended
    this.socket.on("callEnded", (data) => {
      this.handleCallEnded(data)
    })

    // WebRTC signaling
    this.socket.on("webrtc-offer", (data) => {
      this.handleOffer(data)
    })

    this.socket.on("webrtc-answer", (data) => {
      this.handleAnswer(data)
    })

    this.socket.on("webrtc-ice-candidate", (data) => {
      this.handleIceCandidate(data)
    })
  }

  async initiateCall(targetUserId, targetUserName, carPlate) {
    try {
      console.log("Initiating call to:", targetUserId)

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      // Create call ID
      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.remoteUserId = targetUserId

      // Show calling UI
      this.showCallingUI(targetUserName, carPlate)

      // Send call request
      this.socket.emit("initiateCall", {
        callId: this.currentCallId,
        targetUserId: targetUserId,
        callerName: JSON.parse(localStorage.getItem("user")).firstName,
        carPlate: carPlate,
      })

      // Set timeout for call
      setTimeout(() => {
        if (!this.isCallActive && this.currentCallId) {
          this.endCall()
          this.showNotification("Call timeout - no answer", "error")
        }
      }, 30000) // 30 second timeout
    } catch (error) {
      console.error("Error initiating call:", error)
      this.showNotification("Could not access microphone", "error")
    }
  }

  async handleIncomingCall(data) {
    console.log("Incoming call from:", data.callerName)

    this.isIncomingCall = true
    this.currentCallId = data.callId
    this.remoteUserId = data.callerId

    // Show incoming call UI
    this.showIncomingCallUI(data.callerName, data.carPlate)

    // Play ringtone
    this.playRingtone()
  }

  async acceptCall() {
    try {
      console.log("Accepting call")

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })

      // Hide incoming call UI
      this.hideIncomingCallUI()

      // Send acceptance
      this.socket.emit("acceptCall", {
        callId: this.currentCallId,
        targetUserId: this.remoteUserId,
      })

      this.isIncomingCall = false
      this.stopRingtone()
    } catch (error) {
      console.error("Error accepting call:", error)
      this.rejectCall()
      this.showNotification("Could not access microphone", "error")
    }
  }

  rejectCall() {
    console.log("Rejecting call")

    this.socket.emit("rejectCall", {
      callId: this.currentCallId,
      targetUserId: this.remoteUserId,
    })

    this.hideIncomingCallUI()
    this.stopRingtone()
    this.cleanup()
  }

  async handleCallAccepted(data) {
    console.log("Call accepted")

    this.isCallActive = true
    this.hideCallingUI()
    this.showActiveCallUI()

    // Create peer connection and start WebRTC
    await this.createPeerConnection()
    await this.createOffer()
  }

  handleCallRejected(data) {
    console.log("Call rejected")

    this.hideCallingUI()
    this.showNotification("Call rejected", "info")
    this.cleanup()
  }

  handleCallEnded(data) {
    console.log("Call ended")

    this.hideAllCallUI()
    this.showNotification("Call ended", "info")
    this.cleanup()
  }

  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.pcConfig)

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("Received remote stream")
      this.remoteStream = event.streams[0]
      this.playRemoteAudio()
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc-ice-candidate", {
          callId: this.currentCallId,
          targetUserId: this.remoteUserId,
          candidate: event.candidate,
        })
      }
    }

    // Handle connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log("ICE connection state:", state);
    
      if (state === "disconnected" || state === "failed") {
        this.showNotification("Connection lost. Trying to reconnect...", "warning");
        this.tryReconnect();
      } else if (state === "connected") {
        this.showNotification("Call connection stable", "success");
      }
    }
  }

  async tryReconnect() {
  console.log("Trying to re-establish connection...");

  try {
    this.cleanupPeer();

    await this.createPeerConnection();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit("webrtc-offer", {
      callId: this.currentCallId,
      targetUserId: this.remoteUserId,
      offer: offer,
    });

    this.showNotification("Reconnection attempt sent...", "info");
  } catch (err) {
    console.error("Reconnection failed:", err);
    this.showNotification("Reconnection failed", "error");
  }
}

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      this.socket.emit("webrtc-offer", {
        callId: this.currentCallId,
        targetUserId: this.remoteUserId,
        offer: offer,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
    }
  }

  async handleOffer(data) {
    try {
      if (!this.peerConnection) {
        await this.createPeerConnection()
      }

      await this.peerConnection.setRemoteDescription(data.offer)
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      this.socket.emit("webrtc-answer", {
        callId: this.currentCallId,
        targetUserId: this.remoteUserId,
        answer: answer,
      })

      this.isCallActive = true
      this.showActiveCallUI()
    } catch (error) {
      console.error("Error handling offer:", error)
    }
  }

async handleAnswer(data) {
  try {
    if (!this.peerConnection) {
      await this.createPeerConnection();
    }
    await this.peerConnection.setRemoteDescription(data.answer);
  } catch (error) {
    console.error("Error handling answer:", error);
    this.tryReconnect();  
  }
}

  async handleIceCandidate(data) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(data.candidate)
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  endCall() {
    console.log("Ending call")

    if (this.currentCallId) {
      this.socket.emit("endCall", {
        callId: this.currentCallId,
        targetUserId: this.remoteUserId,
      })
    }

    this.hideAllCallUI()
    this.cleanup()
  }

cleanupPeer() {
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }

  if (this.remoteStream) {
    this.remoteStream.getTracks().forEach(t => t.stop());
    this.remoteStream = null;
  }
}

  // UI Methods
  showCallingUI(targetName, carPlate) {
    const callUI = document.createElement("div")
    callUI.id = "calling-ui"
    callUI.className = "call-overlay"
    callUI.innerHTML = `
      <div class="call-modal">
        <div class="call-header">
          <h3>Calling...</h3>
        </div>
        <div class="call-info">
          <div class="call-avatar">📞</div>
          <div class="call-name">${targetName}</div>
          <div class="call-plate">${carPlate}</div>
        </div>
        <div class="call-actions">
          <button class="call-btn end-call" onclick="window.callManager.endCall()">
            <img src="images/end-call.png" alt="End Call" />
          </button>
        </div>
      </div>
    `
    document.body.appendChild(callUI)
  }

  showIncomingCallUI(callerName, carPlate) {
    const callUI = document.createElement("div")
    callUI.id = "incoming-call-ui"
    callUI.className = "call-overlay"
    callUI.innerHTML = `
      <div class="call-modal">
        <div class="call-header">
          <h3>Incoming Call</h3>
        </div>
        <div class="call-info">
          <div class="call-avatar">📞</div>
          <div class="call-name">${callerName}</div>
          <div class="call-plate">${carPlate}</div>
        </div>
        <div class="call-actions">
          <button class="call-btn accept-call" onclick="window.callManager.acceptCall()">
            <img src="images/accept-call.png" alt="Accept" />
          </button>
          <button class="call-btn reject-call" onclick="window.callManager.rejectCall()">
            <img src="images/end-call.png" alt="Reject" />
          </button>
        </div>
      </div>
    `
    document.body.appendChild(callUI)
  }

  showActiveCallUI() {
    const callUI = document.createElement("div")
    callUI.id = "active-call-ui"
    callUI.className = "call-overlay"
    callUI.innerHTML = `
      <div class="call-modal active-call">
        <div class="call-header">
          <h3>Call Active</h3>
          <div class="call-timer" id="call-timer">00:00</div>
        </div>
        <div class="call-info">
          <div class="call-avatar">🔊</div>
          <div class="call-status">Connected</div>
        </div>
        <div class="call-actions">
          <button class="call-btn mute-btn" id="mute-btn" onclick="window.callManager.toggleMute()">
            <img src="images/mic-on.svg" alt="Mute" />
          </button>
          <button class="call-btn end-call" onclick="window.callManager.endCall()">
            <img src="images/end-call.svg" alt="End Call" />
          </button>
        </div>
        <audio id="remote-audio" autoplay></audio>
      </div>
    `
    document.body.appendChild(callUI)

    // Start call timer
    this.startCallTimer()
  }

  hideCallingUI() {
    const ui = document.getElementById("calling-ui")
    if (ui) ui.remove()
  }

  hideIncomingCallUI() {
    const ui = document.getElementById("incoming-call-ui")
    if (ui) ui.remove()
  }

  hideActiveCallUI() {
    const ui = document.getElementById("active-call-ui")
    if (ui) ui.remove()
  }

  hideAllCallUI() {
    this.hideCallingUI()
    this.hideIncomingCallUI()
    this.hideActiveCallUI()
  }

  playRemoteAudio() {
    const audioElement = document.getElementById("remote-audio")
    if (audioElement && this.remoteStream) {
      audioElement.srcObject = this.remoteStream
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        const muteBtn = document.getElementById("mute-btn")
        const img = muteBtn.querySelector("img")

        if (audioTrack.enabled) {
          img.src = "images/mic-on.svg"
          img.alt = "Mute"
        } else {
          img.src = "images/mic-off.svg"
          img.alt = "Unmute"
        }
      }
    }
  }

  startCallTimer() {
    let seconds = 0
    const timer = setInterval(() => {
      if (!this.isCallActive) {
        clearInterval(timer)
        return
      }

      seconds++
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      const timerElement = document.getElementById("call-timer")

      if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
      }
    }, 1000)
  }

  playRingtone() {
    // Create ringtone audio
    this.ringtoneAudio = new Audio()
    this.ringtoneAudio.loop = true
    this.ringtoneAudio.volume = 0.5

    // Try to play ringtone sound
    const ringtonePaths = ["sounds/ringtone.mp3", "./sounds/ringtone.mp3", "/sounds/ringtone.mp3"]

    let played = false
    ringtonePaths.forEach((path) => {
      if (!played) {
        this.ringtoneAudio.src = path
        this.ringtoneAudio
          .play()
          .then(() => {
            played = true
          })
          .catch(() => {
            // Fallback to beep
            this.createRingtoneBeep()
          })
      }
    })
  }

  stopRingtone() {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause()
      this.ringtoneAudio = null
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval)
      this.ringtoneInterval = null
    }
  }

  createRingtoneBeep() {
    // Create repeating beep sound for ringtone
    this.ringtoneInterval = setInterval(() => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = "sine"

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      } catch (error) {
        console.error("Could not create ringtone beep:", error)
      }
    }, 1000)
  }

  showNotification(message, type = "info") {
    // Reuse the global notification system
    if (window.showGlobalNotification) {
      window.showGlobalNotification(message, type)
    } else {
      console.log("Call notification:", message)
    }
  }

  isReady() {
    const ready = this.socket && this.socket.connected && this.localUserId
    console.log("CallManager ready check:", {
      hasSocket: !!this.socket,
      socketConnected: this.socket?.connected,
      hasUserId: !!this.localUserId,
      ready,
    })
    return ready
  }
}

// Initialize call manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.callManager = new CallManager()
})
