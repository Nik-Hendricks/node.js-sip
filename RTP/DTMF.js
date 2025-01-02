const { Writable } = require('stream')
const { EventEmitter } = require('events')

const DTMF = require('goertzeljs/lib/dtmf')

//const createBuffer = require('audio-buffer-from')

class DtmfDetectionStream extends Writable {
	constructor(format, opts) {
		super(opts)

		var dtmf_opts = {
			sampleRate: format.sampleRate,
			//peakFilterSensitivity: 1.4,
			peakFilterSensitivity: 0.5,
			repeatMin: 0,
			//downsampleRate: 1,
			downsampleRate: 1,
			threshold: 0.9,
		}
	
		this.dtmf = new DTMF(dtmf_opts)

		this.bytesPerSample = format.bitDepth ? format.bitDepth/8 : 2

		this.float = format.float
		this.signed = format.signed

		if(opts) {
			this.numSamples = opts.numSamples ? opts.numSamples : 320
		} else {
			this.numSamples = 320
		}

		this.remains = null

		this.previous = Array(16) // one slot for each DTMF tone

		this.eventEmitter = new EventEmitter()
	}

	on(evt, cb) {
		this.eventEmitter.on(evt, cb)
	}

	_digitToSlot(d) {
		switch(d){
		case '*':
			return 14
		case '#':
			return 15
		case 'A':
		case 'B':
		case 'C':
		case 'D':
			return parseInt(d, 16)
		default:
			return parseInt(d, 10)
		}
	}

	_slotToDigit(s) {
		if(s < 10) {
			return s + ''
		} else if(s >=10 && s < 14) {
			return String.fromCharCode(65 - 10 + s)
		} else if(s == 14) {
			return '*'
		} else {
			return '#'
		}
	}

	_processSamples(data) {
		var buffer = new Float32Array(this.numSamples)

		for(var i = 0 ; i<this.numSamples ; i++) {
			var f
			if(this.bytesPerSample == 1) {
				f = data[i]
			} else if (this.bytesPerSample == 2) {
				f = data.readInt16LE(i*this.bytesPerSample)
				if(f != 0) {
					var LIMIT = 0.9999999999999999
					f = (LIMIT - -LIMIT)/(32767 - -32768)*(f - 32767)+LIMIT
				}
			} else if (this.bytesPerSample == 4) {
				if(this.float) {
					f = data.readFloatLE(i*this.bytesPerSample)
				} else {
					f = data.readInt32LE(i*this.bytesPerSample)
					if(f != 0) {
						var LIMIT = 0.9999999999999999
						f = (LIMIT - -LIMIT)/(2147483647 - -2147483648)*(f - 2147483647)+LIMIT
					}
				}
			} else {
				throw "NOT SUPPORTED"
			}
			buffer[i] = f
		}
		
		var digits = this.dtmf.processBuffer(buffer)


		// report digits upon signal extinction
		var slots = digits.map(digit => this._digitToSlot(digit))
		var absentOnes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].filter(slot => slots.indexOf(slot) < 0)
		absentOnes.forEach(slot => {
			if(this.previous[slot]) {
				this.eventEmitter.emit('digit', this._slotToDigit(slot))
				this.previous[slot] = null
			}
		})

		slots.forEach(slot => {
			this.previous[slot] = true
		})
	}

	_write(chunk, encoding, callback) {
		//console.log('_write', chunk)
		var data = chunk

		if(this.remains) {
			data = Buffer.concat([this.remains, data])
			this.remains = null
		}

		var numBytes = this.numSamples * this.bytesPerSample

		//console.log(data.length, numBytes)
		if(data.length < numBytes) {
			this.remains = data
		} else if(data.length == numBytes) {
			this._processSamples(data)
		} else {
			var blocks = Math.floor(data.length / numBytes)
			for(var i=0 ; i<blocks ; i++) {
				this._processSamples(data.slice(i*numBytes, i*numBytes+numBytes))
			}
			var remaining = data.length - blocks*numBytes
			if(remaining > 0) {
				this.remains = data.slice(-remaining)
			}
		}

		if(callback) callback(null)
	}
}

module.exports = DtmfDetectionStream
