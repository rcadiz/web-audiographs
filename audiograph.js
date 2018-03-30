'use strict';

var audiograph = audiograph || {};

audiograph.initialized = false

audiograph.debug = true

audiograph.setup = function() {
	return import('./instrument.js')
	.then(faust => {
		audiograph.isWebKitAudio = (typeof (webkitAudioContext) !== "undefined");
		audiograph.audio_context = (audiograph.isWebKitAudio) ? new webkitAudioContext() : new AudioContext();
		audiograph.dsp = null;

		audiograph.axis_x = {
			min: 0,
			max: 100
		}

		audiograph.axis_y = {
			min: 0,
			max: 100
		}

		audiograph.settings = {
			pitch: {
				min: 40,
				max: 80
			}
		}

		audiograph.valueToPitch = function (value) {
			var pitchRange = audiograph.settings.pitch.max - audiograph.settings.pitch.min
			return ((value * pitchRange) / audiograph.axis_y.max) + audiograph.settings.pitch.min
		}

		audiograph.start = function () {
			faust.default.createinstrument_poly(audiograph.audio_context, 1024, 6, 
				function (node) {
					audiograph.dsp = node;
					if (audiograph.debug) {
			            // Print paths to be used with 'setParamValue'
			            console.log(audiograph.dsp.getParams());					
					}
		            // Connect it to output as a regular WebAudio node
		            audiograph.dsp.connect(audiograph.audio_context.destination);
				});
		}

		audiograph.playValues = function (values) {
			var current = 0
			var timeout = null
			var next = function () {
				audiograph.dsp.allNotesOff()
				current++
				play()
			}
			var play = function () {
				console.log('current: ' + current)
				if (current < values.length) {
					console.log('current value: ' + values[current])
					var pitch = audiograph.valueToPitch(values[current])
					console.log('current pitch: ' + pitch)
					audiograph.dsp.keyOn(1, pitch, 127)
					timeout = setTimeout(next, 1000)
				}
			}
			play()
		}

		audiograph.playKey1 = function () {
			audiograph.playKey(64)
		}

		audiograph.playKey2 = function () {
			audiograph.playKey(76)
		}

		audiograph.playKey = function (pitch) {
			audiograph.dsp.allNotesOff()
			audiograph.dsp.keyOn(1, pitch, 127)
			setTimeout(audiograph.stopKey, 2000)
		}

		audiograph.stopKey = function () {
			audiograph.dsp.allNotesOff()
		}

		audiograph.initialized = true
	})
}


