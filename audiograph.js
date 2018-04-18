'use strict'

var audiograph = audiograph || {}

audiograph.initialized = false

audiograph.debug = true
audiograph.sonification = null

audiograph.setup = function() {
	return import('./instrument.js')
	.then(faust => {
		var isWebKitAudio = (typeof (webkitAudioContext) !== "undefined")
		var audio_context = (isWebKitAudio) ? new webkitAudioContext() : new AudioContext()
		var instrument = null

		var sonificationCallback = (audiograph.sonification) ? 
			function () {
				audiograph.sonification()
				player.start()
			} 
			: player.start

		var sonification = {
			callback: sonificationCallback,
			scale: {
				isAbsolute: true,
				absolute: {
					min: 0,
					max: 100,
				},
				pitch: {
					min: 40, // 0:127
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
					return (scaledValue * pitchRange) + sonification.scale.pitch.min
				},
			},
		}

		var player = {
			timeout: null,
			durations: { //all in milliseconds
				value: 200,
				delayBetweenValues: 400,
			},
			velocity: 127, // 0:127
			setDiscreteMode: function () {
				player.durations.value = 200
				player.durations.delayBetweenValues = 400
			},
			setContinuousMode: function () {
				player.durations.value = 70
				player.durations.delayBetweenValues = 0
			},			
			stop: function () {
				if (player.timeout) {
					clearTimeout(player.timeout)
				}
				instrument.allNotesOff()
			},
			start: function () {
				var current = 0
				var values = data.values
				var delay = function () {
					if (audiograph.debug) {
						console.log("Delaying next value")
					}
					player.stop()
					player.timeout = setTimeout(next, player.durations.delayBetweenValues)
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
					var callback = (player.durations.delayBetweenValues > 0) ? delay : next
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
						player.timeout = setTimeout(callback, player.durations.value)
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
				input.value = value
				input.type = type
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

			var modeContainer = createContainer({className: "mode", elements: [
				createButton("Set audiograph mode to discrete", player.setDiscreteMode),
				createButton("Set audiograph mode to continuous", player.setContinuousMode),
			]})

			var controlContainer = createContainer({className: "control", elements: [
				createButton("Play audiograph", audiograph.sonification.callback),
				createButton("Stop audiograph", player.stop),
			]})

			element.appendChild(controlContainer)
			element.appendChild(modeContainer)
			element.appendChild(checkboxContainer)
		}

		audiograph.start = function () {
			faust.default.createinstrument_poly(audio_context, 1024, 6, 
				function (node) {
					instrument = node
					if (audiograph.debug) {
						console.log("Faust DSP params:")
			            console.log(instrument.getParams())
					}
		            instrument.connect(audio_context.destination)
				})
		}

		audiograph.setValues = function (values) {
			data.values = values
		}

		audiograph.play = sonification.callback
		audiograph.stop = player.stop

		audiograph.initialized = true
	})
}


