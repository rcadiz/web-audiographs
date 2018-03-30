'use strict';

var audiograph = audiograph || {};

audiograph.initialized = false

audiograph.debug = true

audiograph.setup = function() {
	return import('./faust.js')
	.then(faustx => {
		var faust = faustx.default
		console.log(faust)
		audiograph.isWebKitAudio = (typeof (webkitAudioContext) !== "undefined");
		audiograph.audio_context = (audiograph.isWebKitAudio) ? new webkitAudioContext() : new AudioContext();
		audiograph.dsp = null;

		audiograph.start = function () {
			faust.create_poly(audiograph.audio_context, 1024, 6, 
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


