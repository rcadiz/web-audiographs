'use strict'

var audiograph = audiograph || {}

audiograph.initialized = false

audiograph.debug = true

audiograph.setup = function() {
	return import('./instrument.js')
	.then(faust => {
		var isWebKitAudio = (typeof (webkitAudioContext) !== "undefined")
		var audio_context = (isWebKitAudio) ? new webkitAudioContext() : new AudioContext()
		var instrument = null

		//TODO: create lexically scoped vars for private stuff and add to audiograph only public stuff

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

		audiograph.sonification = {
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
					if (audiograph.sonification.scale.isAbsolute) {
						return audiograph.sonification.scale.absolute.min
					} else {
						return audiograph.data.minValue()
					}
				},
				max: function () {
					if (audiograph.sonification.scale.isAbsolute) {
						return audiograph.sonification.scale.absolute.max
					} else {
						return audiograph.data.maxValue()
					}
				},
				valueToPitch: function (value) {
					var scaleRange = audiograph.sonification.scale.max() - audiograph.sonification.scale.min()
					var scaledValue = (value - audiograph.sonification.scale.min()) / scaleRange
					var pitchRange = audiograph.sonification.scale.pitch.max - audiograph.sonification.scale.pitch.min
					return (scaledValue * pitchRange) + audiograph.sonification.scale.pitch.min
				},
			},
		}

		audiograph.player = {
			timeout: null,
			durations: { //all in milliseconds
				value: 200,
				delayBetweenValues: 400,
			},
			velocity: 127, // 0:127
			setDiscreteMode: function () {
				audiograph.player.durations.value = 200
				audiograph.player.durations.delayBetweenValues = 400
			},
			setContinuousMode: function () {
				audiograph.player.durations.value = 70
				audiograph.player.durations.delayBetweenValues = 0
			},			
			stop: function () {
				if (audiograph.player.timeout) {
					clearTimeout(audiograph.player.timeout)
				}
				instrument.allNotesOff()
			},
			start: function () {
				var current = 0
				var values = audiograph.data.values
				var delay = function () {
					if (audiograph.debug) {
						console.log("Delaying next value")
					}
					audiograph.player.stop()
					audiograph.player.timeout = setTimeout(next, audiograph.player.durations.delayBetweenValues)
				}
				var next = function () {
					if (audiograph.debug) {
						console.log("Playing next value")
					}
					audiograph.player.stop()
					current++
					value()
				}
				var value = function () {
					var callback = (audiograph.player.durations.delayBetweenValues > 0) ? delay : next
					if (audiograph.debug) {
						console.log('current index in series: ' + current)
					}
					if (current < values.length) {
						if (audiograph.debug) {
							console.log('current value in series: ' + values[current])
						}
						var pitch = audiograph.sonification.scale.valueToPitch(values[current])
						if (audiograph.debug) {
							console.log('pitch for current value in series: ' + pitch)
						}
						instrument.keyOn(1, pitch, audiograph.player.velocity)
						audiograph.player.timeout = setTimeout(callback, audiograph.player.durations.value)
					}
				}
				if (values.length > 0) {
					value()
				}
			},
		}

		audiograph.data = {
			values: [],
			setValues: function (values) {
				audiograph.data.values = values
				//TODO: add side-effects here
			},
			hasValues: function () {
				return audiograph.data.values.length > 0
			},
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

			var inputAbsoluteMin = createInput("scale-min", audiograph.sonification.scale.absolute.min, "number", function () {
				audiograph.sonification.scale.absolute.min = inputAbsoluteMin.value
			})

			var inputAbsoluteMax = createInput("scale-max", audiograph.sonification.scale.absolute.max, "number", function () {
				audiograph.sonification.scale.absolute.max = inputAbsoluteMax.value
			})

			var scaleMinLabel = createLabel("Minimum value of absolute scale:", inputAbsoluteMin)
			var scaleMaxLabel = createLabel("Maximum value of absolute scale:", inputAbsoluteMax)

			var updateScaleContainerVisibility = function () {
				scaleContainer.style.display = (audiograph.sonification.scale.isAbsolute ? "block" : "none")
			}

			var scaleContainer = createContainer({className: "scale", elements: [
				scaleMinLabel, 
				inputAbsoluteMin,
				scaleMaxLabel,
				inputAbsoluteMax,
				]})

			updateScaleContainerVisibility()

			var checkboxIsAbsolute = createCheckbox("scale-type-absolute", audiograph.sonification.scale.isAbsolute, function () {
				audiograph.sonification.scale.isAbsolute = checkboxIsAbsolute.checked
				updateScaleContainerVisibility()
			})

			var checkboxLabel = createLabel("Use absolute scale", checkboxIsAbsolute)

			var checkboxContainer = document.createElement("div")
			checkboxContainer.appendChild(checkboxIsAbsolute)
			checkboxContainer.appendChild(checkboxLabel)
			checkboxContainer.appendChild(scaleContainer)

			element.appendChild(checkboxContainer)
			element.appendChild(createButton("Set audiograph mode to discrete", audiograph.player.setDiscreteMode))
			element.appendChild(createButton("Set audiograph mode to continuous", audiograph.player.setContinuousMode))
			element.appendChild(createButton("Play audiograph", audiograph.player.start))
			element.appendChild(createButton("Stop audiograph", audiograph.player.stop))
		}

		audiograph.initialized = true
	})
}


