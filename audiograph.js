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
			            console.log(audiograph.dsp.getParams());					
					}
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
				if (audiograph.debug) {
					console.log('current index in series: ' + current)
				}
				if (current < values.length) {
					if (audiograph.debug) {
						console.log('current value in series: ' + values[current])
					}
					var pitch = audiograph.valueToPitch(values[current])
					if (audiograph.debug) {
						console.log('pitch for current value in series: ' + pitch)
					}
					audiograph.dsp.keyOn(1, pitch, 127)
					timeout = setTimeout(next, 1000)
				}
			}
			play()
		}

		audiograph.initialized = true
	})
}


