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

		audiograph.sonification = {
			scale: {
				y: {
					isAbsolute: true,
					min: function () {
						if (audiograph.sonification.scale.y.isAbsolute) {
							return audiograph.sonification.scale.y.absolute.min
						} else {
							return audiograph.data.minValue()
						}
					},
					max: function () {
						if (audiograph.sonification.scale.y.isAbsolute) {
							return audiograph.sonification.scale.y.absolute.max
						} else {
							return audiograph.data.maxValue()
						}
					},
					absolute: {
						min: 0,
						max: 100,
					},
				}
			},
			settings: {
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
			},
			setDiscreteMode: function () {
				audiograph.sonification.settings.player.durations.value = 200
				audiograph.sonification.settings.player.durations.delayBetweenValues = 400
			}

			setContinuousMode: function () {
				audiograph.sonification.settings.player.durations.value = 70
				audiograph.sonification.settings.player.durations.delayBetweenValues = 0
			}
			
		}

/*
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
					isAbsolute: true,
					min: function () {
						if (audiograph.sonification.scale.y.isAbsolute) {
							return audiograph.sonification.scale.y.absolute.min
						} else {
							return audiograph.data.minValue()
						}
					},
					max: function () {
						if (audiograph.sonification.scale.y.isAbsolute) {
							return audiograph.sonification.scale.y.absolute.max
						} else {
							return audiograph.data.maxValue()
						}
					},
					absolute: {
						min: 0,
						max: 100,
					},
				}
			}
		}
*/
/*
		audiograph.activateDiscreteMode = function () {
			audiograph.settings.player.durations.value = 200
			audiograph.settings.player.durations.delayBetweenValues = 400
		}

		audiograph.activateContinuousMode = function () {
			audiograph.settings.player.durations.value = 70
			audiograph.settings.player.durations.delayBetweenValues = 0
		}
		*/
		
		audiograph.valueToPitch = function (value) {
			var scaleRange = audiograph.sonification.scale.y.max() - audiograph.sonification.scale.y.min()
			var scaledValue = (value - audiograph.sonification.scale.y.min()) / scaleRange
			var pitchRange = audiograph.settings.pitch.max - audiograph.settings.pitch.min
			return (scaledValue * pitchRange) + audiograph.settings.pitch.min
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

		audiograph.control = {
			setData: function (values) {
				audiograph.data.values = values
			}
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
			timeout: null,
			stop: function () {
				if (audiograph.data.timeout) {
					clearTimeout(audiograph.data.timeout)
				}
				audiograph.dsp.allNotesOff()
			},
			play: function () {
				var current = 0
				var values = audiograph.data.values
				var delay = function () {
					if (audiograph.debug) {
						console.log("Delaying next value")
					}
					audiograph.data.stop()
					audiograph.data.timeout = setTimeout(next, audiograph.settings.player.durations.delayBetweenValues)
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
						audiograph.data.timeout = setTimeout(callback, audiograph.settings.player.durations.value)
					}
				}
				if (values.length > 0) {
					value()
				}
			}
		}

		audiograph.ui = {
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

				var inputAbsoluteMin = createInput("scale-min", audiograph.sonification.scale.y.absolute.min, "number", function () {
					audiograph.sonification.scale.y.absolute.min = inputAbsoluteMin.value
				})

				var inputAbsoluteMax = createInput("scale-max", audiograph.sonification.scale.y.absolute.max, "number", function () {
					audiograph.sonification.scale.y.absolute.max = inputAbsoluteMax.value
				})

				var scaleMinLabel = createLabel("Minimum value of absolute scale:", inputAbsoluteMin)
				var scaleMaxLabel = createLabel("Maximum value of absolute scale:", inputAbsoluteMax)

				var updateScaleContainerVisibility = function () {
					scaleContainer.style.display = (audiograph.sonification.scale.y.isAbsolute ? "block" : "none")
				}

				var scaleContainer = createContainer({className: "scale", elements: [
					scaleMinLabel, 
					inputAbsoluteMin,
					scaleMaxLabel,
					inputAbsoluteMax,
					]})

				updateScaleContainerVisibility()

				var checkboxIsAbsolute = createCheckbox("scale-type-absolute", audiograph.sonification.scale.y.isAbsolute, function () {
					audiograph.sonification.scale.y.isAbsolute = checkboxIsAbsolute.checked
					updateScaleContainerVisibility()
				})

				var checkboxLabel = createLabel("Use absolute scale", checkboxIsAbsolute)

				var checkboxContainer = document.createElement("div")
				checkboxContainer.appendChild(checkboxIsAbsolute)
				checkboxContainer.appendChild(checkboxLabel)
				checkboxContainer.appendChild(scaleContainer)

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


