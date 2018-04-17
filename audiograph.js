'use strict'

var audiograph = audiograph || {}

audiograph.initialized = false

audiograph.debug = true

audiograph.setup = function() {
	return import('./instrument.js')
	.then(faust => {
		audiograph.isWebKitAudio = (typeof (webkitAudioContext) !== "undefined")
		audiograph.audio_context = (audiograph.isWebKitAudio) ? new webkitAudioContext() : new AudioContext()
		audiograph.dsp = null

		audiograph.axis_y = {
			min: 0,
			max: 100
		}

		audiograph.settings = {
			player: {
				durations: { //all in milliseconds
					value: 200,
					delayBetweenValues: 0,
				},
				volume: 1.0,
			},
			pitch: {
				min: 40,
				max: 80
			}
		}

		audiograph.activateDiscreteMode = function () {
			audiograph.settings.player.durations.value = 200
			audiograph.settings.player.durations.delayBetweenValues = 400
		}

		audiograph.activateContinuousMode = function () {
			audiograph.settings.player.durations.value = 70
			audiograph.settings.player.durations.delayBetweenValues = 0
		}
		
		audiograph.valueToPitch = function (value) {
			var pitchRange = audiograph.settings.pitch.max - audiograph.settings.pitch.min
			return ((value * pitchRange) / audiograph.axis_y.max) + audiograph.settings.pitch.min
		}

		audiograph.start = function () {
			faust.default.createinstrument_poly(audiograph.audio_context, 1024, 6, 
				function (node) {
					audiograph.dsp = node
					if (audiograph.debug) {
						console.log("Faust DSP params:")
			            console.log(audiograph.dsp.getParams())
					}
		            audiograph.dsp.connect(audiograph.audio_context.destination)
				})
		}

		audiograph.play = function (pitch) {
			audiograph.dsp.keyOn(1, pitch, audiograph.settings.player.volume * 127)
		}

		audiograph.playValues = function (values) {
			var current = 0
			var timeout = null
			var delay = function () {
				if (audiograph.debug) {
					console.log("Delaying next value")
				}
				audiograph.dsp.allNotesOff()
				timeout = setTimeout(next, audiograph.settings.player.durations.delayBetweenValues)
			}
			var next = function () {
				if (audiograph.debug) {
					console.log("Playing next value")
				}
				audiograph.dsp.allNotesOff()
				current++
				playCurrentValue()
			}
			var playCurrentValue = function () {
				var callback = (audiograph.settings.player.durations.delayBetweenValues > 0) ? delay : next
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
					audiograph.play(pitch)
					timeout = setTimeout(callback, audiograph.settings.player.durations.value)
				}
			}
			playCurrentValue()
		}

		audiograph.initialized = true
	})
}


