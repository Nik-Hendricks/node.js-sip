//var lame = require('lame');
const spawn = require('child_process').spawn;
const UTILS = require('../utils.js')
const dgram = require('dgram')
const fs = require('fs')

var decodeAlaw = require("g7112pcm").decodeAlaw;
var decodeUlaw = require("g7112pcm").decodeUlaw;

const DtmfDetectionStream = require('./DTMF.js')

const format_map = {
    'ulaw': 'pcm_mulaw', 
    'alaw': 'pcm_alaw'
}

const Codecs = {
    'g711u': {
        'sample_rate': 8000,
        'channels': 1,
        'bit_depth': 8,
        'bit_rate': 64,
        'codec': 'libavcodec',
        'format': 'pcm_mulaw',
        'sdp_format': 'PCMU',
        'rtp_payload_type': 0
    },
    'g711a': {
        'sample_rate': 8000,
        'channels': 1,
        'bit_depth': 8,
        'bit_rate': 64,
        'codec': 'libavcodec',
        'format': 'pcm_alaw',
        'sdp_format': 'PCMA',
        'rtp_payload_type': 8
    },
    'g722': {
        'sample_rate': 16000,
        'channels': 1,
        'bit_depth': '16',
        'bit_rate': 64,
        'codec': 'libavcodec',
        'format': 'g722',
        'sdp_format': 'G722',
        'rtp_payload_type': 9
    },
    'mp3': {
        'sample_rate': 44100, // Sample rate for MP3 files (adjust as needed)
        'channels': 2, // Adjust based on the number of channels in your MP3 file
        'bit_rate': 128, // Adjust the bit rate as needed
        'codec': 'libmp3lame', // Codec for MP3
        'format': 'mp3', // Format for MP3
        'sdp_format': 'MPA', // SDP format for MP3 (you may need to confirm this)
        'rtp_payload_type': 14 // Adjust the payload type as needed
    },
    

    get_codec_by_payload_type: (payload_type) => {
        for (var codec in Codecs){
            if (Codecs[codec].rtp_payload_type == payload_type){
                return codec
            }
        }
    }
}

class Listener{
    constructor(port, codec, callback, debug = false){
        var socket = dgram.createSocket('udp4')
        socket.bind(port)
        this.digit_counter = 0;
        this.current_digit = null;
        const format = {
            sampleRate: 8000,
            bitDepth: 16,
            channels: 1,
        }
        
        const dds = new DtmfDetectionStream(format)

        dds.on('digit', digit => {
            if (digit != this.current_digit){
                this.current_digit = digit;
                this.digit_counter = 0;
            }
            this.digit_counter++;
            if (this.digit_counter == 50){
                console.log('DTMF: ' + digit)
            }
        })

        socket.on('listening', () => {
            console.log('listening')
        })

        socket.on('message', (msg, rinfo) => {
            callback(msg)
            const rtpHeader = msg.slice(0, 12);
            const version = rtpHeader.readUInt8(0) >> 6;
            const payloadType = Codecs.get_codec_by_payload_type(rtpHeader.readUInt8(1) & 0x7F);
            const sequenceNumber = rtpHeader.readUInt16BE(2);
            const timestamp = rtpHeader.readUInt32BE(4);
            const ssrc = rtpHeader.readUInt32BE(8);
            
            const payload = msg.slice(12, msg.length)

            if(debug){
                console.log(`Version: ${version}`);
                console.log(`Payload Type: ${payloadType}`);
                console.log(`Sequence Number: ${sequenceNumber}`);
                console.log(`Timestamp: ${timestamp}`);
                console.log(`SSRC: ${ssrc}`);
            }
            
            if (payloadType == 'g711u'){
                var msg = decodeUlaw(msg)
                dds.write(msg)
                callback(msg)
            }else if (payloadType == 'g711a'){
                var msg = decodeAlaw(msg)
                dds.write(msg)
                callback(msg)
            }
        })
    }
}

class Listener_old{
    constructor(port, codec, callback){
        const ffmpegArgs = [
  
            '-nodisp', // No display (audio only)
            '-protocol_whitelist','pipe,file,rtp,udp', // Read input at the native frame rate
            '-i','pipe:0' 
        ];

        var sdp = 'v=0\r\n' +
        `o=- 0 0 IN IP4 0\r\n` +
        's=No Name\r\n' +
        `c=IN IP4 0\r\n` +
        't=0 0\r\n' +
        'a=tool:libavformat 58.76.100\r\n' +
        `m=audio ${port} RTP/AVP ${Codecs[codec].rtp_payload_type}\r\n` +
        'b=AS:64\r\n'
        
        const ffmpegProcess = spawn('ffplay', ffmpegArgs);
        ffmpegProcess.stdin.on('data', (data) => {
            callback(data);
        }); 

        console.log(sdp)
        ffmpegProcess.stdin.write(sdp);
        ffmpegProcess.stdin.end();
        ffmpegProcess.stdin.pause();
    }

    kill(child) {
        child.kill('SIGINT');
    }
}

class RTP{
    constructor(){
        this.ssrc = Math.floor(Math.random() * 0xFFFFFFFF); // Generate a random SSRC
    }

    start_stream(filename, codec, callback){
        if(filename !== false){
            var audio = fs.createReadStream(filename)
            audio.on('data', (data) => {
                console.log('data')
                // Divide the audio data into RTP packets
                this.process_audio_data(data, codec, callback)
            })
        }
    }


    
    _process_audio_data(data, codec, callback) {
        //const audioContext = new AudioContext()
        //audioContext.decodeAudioData(data, function(decodedData) {
        //    const leftChannelData = decodedData.getChannelData(0); // Extract left channel data
        //    const rightChannelData = decodedData.getChannelData(1);
        //})

        var payload_type = Codecs[codec].rtp_payload_type;
        const channels = Codecs[codec].channels; // Get the number of channels

        const packetizationInterval = (Codecs[codec].sample_rate / channels)
        let timestamp = 0;
        let sequenceNumber = 0;
        for (let i = 0; i < data.length; i += packetizationInterval) {
            const packetData = data.slice(i, i + packetizationInterval);
            const packet = this.Packet(sequenceNumber, timestamp, this.ssrc, payload_type, packetData);
            sequenceNumber++;
            timestamp += 1;
            callback(packet)
        }
    }

    process_audio_data(data, codec, callback) {
        var payload_type = Codecs[codec].rtp_payload_type;
        const channels = Codecs[codec].channels; // Get the number of channels
        const packetizationInterval = (Codecs[codec].sample_rate / channels)
        let timestamp = 0;
        let sequenceNumber = 0;
        for (let i = 0; i < data.length; i += packetizationInterval) {
            const packetData = data.slice(i, i + packetizationInterval);
            const packet = this.Packet(sequenceNumber, timestamp, this.ssrc, payload_type, packetData);
            sequenceNumber++;
            timestamp += 1;
            callback(packet)
        }
    }


    Packet(sequenceNumber, timestamp, ssrc, payloadType, payloadData){
        // RTP header consists of 12 bytes
        const header = new Uint8Array(12);
        // Set version (2 bits), padding (1 bit), extension (1 bit), CSRC count (4 bits)
        header[0] = 0x80; // Version: 2, Padding: 0, Extension: 0, CSRC Count: 0
        // Set marker (1 bit), payload type (7 bits)
        header[1] = payloadType & 0x7F; // Payload type
        // Set sequence number (16 bits)
        header[2] = (sequenceNumber >> 8) & 0xFF;
        header[3] = sequenceNumber & 0xFF;
        // Set timestamp (32 bits)
        header[4] = (timestamp >> 24) & 0xFF;
        header[5] = (timestamp >> 16) & 0xFF;
        header[6] = (timestamp >> 8) & 0xFF;
        header[7] = timestamp & 0xFF;
        // Set SSRC (32 bits)
        header[8] = (ssrc >> 24) & 0xFF;
        header[9] = (ssrc >> 16) & 0xFF;
        header[10] = (ssrc >> 8) & 0xFF;
        header[11] = ssrc & 0xFF;
        // Combine the header and payload
        const packet = new Uint8Array(header.length + payloadData.length);
        packet.set(header);
        packet.set(payloadData, header.length);

        return packet;
    }

}

module.exports = {
    Listener,
    Listener_old,
    RTP,
}