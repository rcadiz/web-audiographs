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

		audiograph.settings = {
			player: {
				durations: { //all in milliseconds
					value: 200,
					delayBetweenValues: 400,
				},
				velocity: 127, // 0:127
			},
			pitch: {
				min: 40, // 0:127
				max: 100, // 0:127
			},
			scale: {
				y: {
					isRelative: false,
					min: function () {
						if (audiograph.settings.scale.y.isRelative) {
							return audiograph.data.minValue()
						} else {
							return audiograph.settings.scale.y.absolute.min
						}
					},
					max: function () {
						if (audiograph.settings.scale.y.isRelative) {
							return audiograph.data.maxValue()
						} else {
							return audiograph.settings.scale.y.absolute.max
						}
					}
					absolute: {
						min: 0,
						max: 100,
					},
				}
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
			//TODO: update for isRelative
			//TODO: update for 
			var pitchRange = audiograph.settings.pitch.max - audiograph.settings.pitch.min
			return ((value * pitchRange) / audiograph.settings.scale.y.max()) + audiograph.settings.pitch.min
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
			audiograph.dsp.keyOn(1, pitch, audiograph.settings.player.velocity)
		}

		audiograph.data = {
			values: [],
			maxValue: function () {
				if (audiograph.data.hasValues()) {
					return audiograph.data.values.reduce(function(a, b) {
					    return Math.max(a, b);
					});				
				} else {
					return 0
				}
			},
			minValue: function () {
				if (audiograph.data.hasValues()) {
					return audiograph.data.values.reduce(function(a, b) {
					    return Math.min(a, b);
					});				
				} else {
					return 0
				}
			},
			hasValues: function () {
				return audiograph.data.values.length > 0
			},
			stop: function () {
				audiograph.dsp.allNotesOff()
			},
			play: function () {
				var current = 0
				var timeout = null
				var values = audiograph.data.values
				var delay = function () {
					if (audiograph.debug) {
						console.log("Delaying next value")
					}
					audiograph.data.stop()
					timeout = setTimeout(next, audiograph.settings.player.durations.delayBetweenValues)
				}
				var next = function () {
					if (audiograph.debug) {
						console.log("Playing next value")
					}
					audiograph.data.stop()
					current++
					value()
				}
				var value = function () {
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
				if (values.length > 0) {
					value()
				}
			}
		}

		audiograph.ui = {
			checkboxScaleTypeAbsolute: null,
			render: function (selector) {
				var element = document.getElementById(selector)
				if (audiograph.debug) {
					console.log("Found " + selector)
					console.log(element)
				}

				var createButton = function (text, handler) {
					var button = document.createElement("button")
					button.innerText = text
					button.addEventListener("click", handler)
					return button
				}

				audiograph.ui.checkboxScaleTypeAbsolute = document.createElement("input")
				audiograph.ui.checkboxScaleTypeAbsolute.id = "scale-type-absolute"
				audiograph.ui.checkboxScaleTypeAbsolute.type = "checkbox"
				audiograph.ui.checkboxScaleTypeAbsolute.checked = audiograph.settings.scale.y.isRelative
				audiograph.ui.checkboxScaleTypeAbsolute.addEventListener("change", function () {

				})
				
				var checkboxLabel = document.createElement("label")
				checkboxLabel.setAttribute('for', audiograph.ui.checkboxScaleTypeAbsolute.id)
				checkboxLabel.innerText = "Usar escala absoluta"
				
				var checkboxContainer = document.createElement("div")
				checkboxContainer.appendChild(audiograph.ui.checkboxScaleTypeAbsolute)
				checkboxContainer.appendChild(checkboxLabel)

				element.appendChild(checkboxContainer)
				element.appendChild(createButton("Set audiograph mode to discrete", audiograph.activateDiscreteMode))
				element.appendChild(createButton("Set audiograph mode to continuous", audiograph.activateContinuousMode))
				element.appendChild(createButton("Play audiograph", audiograph.data.play))
				element.appendChild(createButton("Stop audiograph", audiograph.data.stop))
			}
		}

		audiograph.initialized = true
	})
}


