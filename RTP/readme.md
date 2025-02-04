# Session Manager for RTP Streams

## Overview
This project provides a **Session Manager** for handling **RTP streams** using **Node.js**. It dynamically generates **SDP (Session Description Protocol)** files, selects the best available codec, and uses **FFmpeg** to stream audio over RTP. It supports various codecs such as **Opus, G.711 (PCMU/PCMA), G.729, G722, GSM, and iLBC**.

## Features
- Dynamically assigns a **random RTP port** for each session.
- Generates an **SDP file** for managing RTP streaming.
- Uses **FFmpeg** to send audio streams over RTP.
- Supports multiple codecs, including **Opus, PCMU, PCMA, G729, GSM, and more**.
- Handles both **session creation** and **termination**.

## Installation
Ensure you have **Node.js** and **FFmpeg** installed on your system.

### Install Node.js Dependencies
```sh
npm install
```

### Install FFmpeg (if not already installed)
For Ubuntu/Debian:
```sh
sudo apt update && sudo apt install ffmpeg
```
For macOS:
```sh
brew install ffmpeg
```
For Windows:
1. Download FFmpeg from [FFmpeg Official Site](https://ffmpeg.org/download.html).
2. Add it to your system **PATH**.

## Usage

### Importing the Session Manager
```javascript
const { SessionManager } = require('./index');
const sessionManager = new SessionManager();
```

### Creating a New RTP Session
```javascript
const session = sessionManager.new_session({
    call_id: '123456',
    sdp: `v=0\no=User 123 123 IN IP4 192.168.1.12\ns=Session\nc=IN IP4 192.168.1.12\nt=0 0\nm=audio 5050 RTP/AVP 106 9 98 101\na=rtpmap:106 opus/48000/2`,
    callback: (event) => {
        console.log('Session Event:', event);
    }
});

session.start();
```

### Stopping an RTP Session
```javascript
session.stop();
```

## Project Structure
```
├── index.js              # Exports Session and SessionManager modules
├── Session.js            # Handles individual RTP sessions
├── SessionManager.js     # Manages multiple RTP sessions
├── utils.js              # Utility functions (e.g., fetching local IP address)
```

## Code Explanation
### **SessionManager.js**
- Maintains an **object of active sessions**.
- Assigns a **random RTP port** for each session.
- Generates an **SDP offer** dynamically.
- Creates a new **Session** instance.

### **Session.js**
- Extracts **IP, port, and codec details** from SDP.
- Selects the **best codec** available.
- Spawns an **FFmpeg process** to send RTP audio.
- Calls the provided **callback** when the session starts.
- Supports **session termination** by killing the FFmpeg process.

### **index.js**
- Exports the **Session** and **SessionManager** classes for external use.

## Supported Codecs
The system can handle the following RTP codecs:
- **Opus (Recommended)**
- **G.711 (PCMU/PCMA)**
- **G.729**
- **G.722**
- **GSM**
- **iLBC**

## Troubleshooting
### FFmpeg Errors
If you see errors like:
```
FFmpeg: Protocol 'rtp' not on whitelist 'file,crypto,data'!
```
Try running FFmpeg with the correct protocol whitelist:
```sh
ffmpeg -protocol_whitelist file,rtp,udp -i stream.sdp -f wav output.wav
```

### No RTP Audio Received
- Ensure the RTP port assigned in the SDP is open and reachable.
- Verify FFmpeg is correctly installed and can process RTP streams.
- Use Wireshark or Tshark to check incoming RTP packets:
```sh
tshark -i any -Y "rtp"
```

## License
This project is open-source and licensed under the **MIT License**.

