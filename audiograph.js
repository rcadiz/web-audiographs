'use strict'

var audiograph = audiograph || {}

audiograph.initialized = false

audiograph.debug = true
audiograph.sonification = null

audiograph.setup = function() {
	return import('https://lab.adapar.net/cita/audiographs/google/instrument.js')
	.then(faust => {
		var isWebKitAudio = (typeof (webkitAudioContext) !== "undefined")
		var audio_context = (isWebKitAudio) ? new webkitAudioContext() : new AudioContext()
		var instrument = null

		var sonificationCallback = (audiograph.sonification) ? 
			function () {
				if (audiograph.debug) {
					console.log("Calling sonification callback");
				}
				audiograph.sonification(player.start)
			} 
			: player.start

		var sonification = {
			callback: sonificationCallback,
			freqToPitch: function (freq) {
				return Math.ceil(((12.0 * Math.log(freq/440.0)) / Math.log(2.0)) + 69.0)
			},
			pitchToFreq: function (pitch) {
		        return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
			},
			scale: {
				isAbsolute: false,
				absolute: {
					min: 0,
					max: 100,
				},
				pitch: {
					min: 27, // 0:127
					max: 100, // 0:127
				},
				min: function () {
					if (sonification.scale.isAbsolute) {
						return sonification.scale.absolute.min
					} else {
						return data.minValue()
					}
				},
				max: function () {
					if (sonification.scale.isAbsolute) {
						return sonification.scale.absolute.max
					} else {
						return data.maxValue()
					}
				},
				valueToPitch: function (value) {
					var scaleRange = sonification.scale.max() - sonification.scale.min()
					var scaledValue = (value - sonification.scale.min()) / scaleRange
					var pitchRange = sonification.scale.pitch.max - sonification.scale.pitch.min
					return Math.ceil((scaledValue * pitchRange) + sonification.scale.pitch.min)
				},
			},
		}

		var player = {
			timeout: null,
			isDiscrete: false,
			durations: { //all in milliseconds
				value: function () {
					if (data.hasValues()) {
						var steps = data.values.length
						return Math.ceil(player.durations.total / steps)
					}
					return 0
				},
				delayBetweenValues: function () {
					if (player.isDiscrete && data.hasValues()) {
						//TODO: Handle this gracefully
						return 400
					}
					return 0
				},
				total: 3000,
			},
			velocity: 127, // 0:127
			setDiscreteMode: function () {
				player.isDiscrete = true
				console.log("isDiscrete is " + (player.isDiscrete ? "true":"false"))
			},
			setContinuousMode: function () {
				player.isDiscrete = false
				console.log("isDiscrete is " + (player.isDiscrete ? "true":"false"))
			},			
			stop: function () {
				if (audiograph.debug) {
					console.log("Player stopping");
				}
				if (player.timeout) {
					clearTimeout(player.timeout)
				}
				instrument.allNotesOff()
			},
			start: function () {
				if (audiograph.debug) {
					console.log("Player starting");
				}
				var current = 0
				var values = data.values
				var delay = function () {
					if (audiograph.debug) {
						console.log("Delaying next value")
					}
					player.stop()
					player.timeout = setTimeout(next, player.durations.delayBetweenValues())
				}
				var next = function () {
					if (audiograph.debug) {
						console.log("Playing next value")
					}
					player.stop()
					current++
					value()
				}
				var value = function () {
					var callback = (player.durations.delayBetweenValues() > 0) ? delay : next
					if (audiograph.debug) {
						console.log('current index in series: ' + current)
					}
					if (current < values.length) {
						if (audiograph.debug) {
							console.log('current value in series: ' + values[current])
						}
						var pitch = sonification.scale.valueToPitch(values[current])
						if (audiograph.debug) {
							console.log('pitch for current value in series: ' + pitch)
						}
						instrument.keyOn(1, pitch, player.velocity)
						if (audiograph.debug) {
							console.log('Value duration: ' + player.durations.value())
							console.log('Delay duration: ' + player.durations.delayBetweenValues())
						}
						player.timeout = setTimeout(callback, player.durations.value())
					}
				}
				if (values.length > 0) {
					value()
				}
			},
		}

		var data = {
			values: [],
			hasValues: function () {
				return data.values.length > 0
			},
			maxValue: function () {
				if (data.hasValues()) {
					return data.values.reduce(function(a, b) {
					    return Math.max(a, b);
					});				
				} else {
					return 0
				}
			},
			minValue: function () {
				if (data.hasValues()) {
					return data.values.reduce(function(a, b) {
					    return Math.min(a, b);
					});				
				} else {
					return 0
				}
			},
		}

		audiograph.ui = function (selector) {
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

			var createLabel = function (text, forField) {
				var label = document.createElement("label")
				label.setAttribute("for", forField.id)
				label.innerText = text
				return label
			}

			var createCheckbox = function (id, checked, handler) {
				var checkbox = document.createElement("input")
				checkbox.id = id
				checkbox.type = "checkbox"
				checkbox.checked = checked
				checkbox.addEventListener("change", handler)
				return checkbox
			}

			var createInput = function (id, value, type, handler) {
				var input = document.createElement("input")
				input.id = id
				input.type = type
				input.value = value
				input.addEventListener("change", handler)
				return input
			}

			var createContainer = function (args) {
				var container = document.createElement("div")
				if (args) {
					if (args.id) {
						container.id = args.id
					}
					if (args.className) {
						container.setAttribute("class", args.className)
					}
					if (args.elements && args.elements.length && args.elements.length > 0) {
						args.elements.forEach(function (element) {
							container.appendChild(element)
						})
					}
				}
				return container
			}

			var inputAbsoluteMin = createInput("scale-min", sonification.scale.absolute.min, "number", function () {
				sonification.scale.absolute.min = inputAbsoluteMin.value
			})

			var inputAbsoluteMax = createInput("scale-max", sonification.scale.absolute.max, "number", function () {
				sonification.scale.absolute.max = inputAbsoluteMax.value
			})

			var scaleMinLabel = createLabel("Minimum value of absolute scale:", inputAbsoluteMin)
			var scaleMaxLabel = createLabel("Maximum value of absolute scale:", inputAbsoluteMax)

			var scaleContainer = createContainer({className: "scale-absolute", elements: [
				scaleMinLabel, 
				inputAbsoluteMin,
				scaleMaxLabel,
				inputAbsoluteMax,
				]})

			var updateScaleContainerVisibility = function () {
				scaleContainer.style.display = (sonification.scale.isAbsolute ? "block" : "none")
			}

			updateScaleContainerVisibility()

			var checkboxIsAbsolute = createCheckbox("scale-type-absolute", sonification.scale.isAbsolute, function () {
				sonification.scale.isAbsolute = checkboxIsAbsolute.checked
				updateScaleContainerVisibility()
			})

			var checkboxLabel = createLabel("Use absolute scale", checkboxIsAbsolute)

			var checkboxContainer = createContainer({className: "scale", elements: [
				checkboxIsAbsolute,
				checkboxLabel,
				scaleContainer,
			]})

			
			var inputDuration = createInput("duration", player.durations.total, "number", function () {
				player.durations.total = inputDuration.value
				console.log(player.durations.value())
				console.log(player.durations.delayBetweenValues())
			})
				console.log(player.durations.value())

			var durationLabel = createLabel("Audiograph duration (in milliseconds)", inputDuration)

			var minFreq = Math.ceil(sonification.pitchToFreq(0))
			var maxFreq = Math.ceil(sonification.pitchToFreq(127))

			var inputMinFreq = createInput("freq-min", sonification.pitchToFreq(sonification.scale.pitch.min), "range", function () {
				if (inputMinFreq.valueAsNumber > inputMaxFreq.valueAsNumber) {
					inputMinFreq.valueAsNumber = inputMaxFreq.valueAsNumber - 1
				}
				sonification.scale.pitch.min = sonification.freqToPitch(inputMinFreq.valueAsNumber)
			})
			inputMinFreq.setAttribute("min", minFreq)
			inputMinFreq.setAttribute("max", maxFreq)
			inputMinFreq.setAttribute("step", 1)

			var inputMaxFreq = createInput("freq-max", sonification.pitchToFreq(sonification.scale.pitch.max), "range", function () {
				if (inputMaxFreq.valueAsNumber < inputMinFreq.valueAsNumber) {
					inputMaxFreq.valueAsNumber = inputMinFreq.valueAsNumber - 1
				}
				sonification.scale.pitch.max = sonification.freqToPitch(inputMaxFreq.valueAsNumber)
			})
			inputMaxFreq.setAttribute("min", minFreq)
			inputMaxFreq.setAttribute("max", maxFreq)
			inputMaxFreq.setAttribute("step", 1)

			var minFreqLabel = createLabel("Minimum frequency (from " + minFreq + "Hz to " + maxFreq + "Hz)", inputMinFreq)
			var maxFreqLabel = createLabel("Maximum frequency (from " + minFreq + "Hz to " + maxFreq + "Hz)", inputMaxFreq)

			var modeContainer = createContainer({className: "mode", elements: [
				createButton("Set audiograph mode to discrete", player.setDiscreteMode),
				createButton("Set audiograph mode to continuous", player.setContinuousMode),
				durationLabel,
				inputDuration,
				minFreqLabel,
				inputMinFreq,
				maxFreqLabel,
				inputMaxFreq,
			]})

			var controlContainer = createContainer({className: "control", elements: [
				createButton("Play audiograph", sonification.callback),
				createButton("Stop audiograph", player.stop),
				createButton("Timbre", function () {}),
			]})

			element.appendChild(controlContainer)
			element.appendChild(modeContainer)
			element.appendChild(checkboxContainer)
		}

		audiograph.start = function (playOnStart) {
			faust.default.createinstrument_poly(audio_context, 1024, 6, 
				function (node) {
					instrument = node
					if (audiograph.debug) {
						console.log("Faust DSP params:")
			            console.log(instrument.getParams())
					}
		            instrument.connect(audio_context.destination)
		            console.log("playOnStart is:")
		            console.log(playOnStart)
		            if (playOnStart) {
		            	sonification.callback()
		            }
				})
		}

		audiograph.setValues = function (values) {
			if (audiograph.debug) {
				console.log("Setting values to:")
				console.log(values)
			}
			data.values = values
		}

		audiograph.play = sonification.callback
		audiograph.stop = player.stop

		audiograph.initialized = true
	})
}


