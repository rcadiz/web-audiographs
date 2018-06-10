// Simple Organ
import("stdfaust.lib");

// Data series parameters
freq1		= hslider("freq1[unit:Hz]", 0, 100, 800, 1); 	// series1 frequency
freq2		= hslider("freq2[unit:Hz]", 0, 100, 800, 1); 	// series2 frequency

// Timbre parameters
//gate 	 		 = button("gate");
volume			 = hslider("volume", 1, 0, 1, 0.1);
reverb		 	 = hslider("reverb", 1, 0, 1, 0.1);
brightness		 = hslider("brightness", 1, 0, 1, 0.1);
is_discrete 	 = hslider("is_discrete", 0, 0, 1, 1);
envelop_duration = hslider("envelop_duration", 1, 0, 1000, 1); // 
type_1			 = hslider("type_1", 1, 1, 3, 1);  
type_2			 = hslider("type_2", 1, 1, 3, 1);  

// Frequency dependent variables
gate(0)			 	= 0;
gate(f)			 	= 1;

// Envelop parameters (based on envelop_duration)
attack	= (envelop_duration * 0.01) / 1000;
decay	= (envelop_duration * 0.3) / 1000;
sustain	= (envelop_duration * 0.5) / 1000;
release	= (envelop_duration * 0.2) / 1000;

//TODO: change this to a formula on freqs
gain(f)		= 0.5;

process = play_values(freq1,freq2);

// Handle mono vs. stereo according to selected frequencies
play_values(0,f2)	= voice(f2); // mono
play_values(f1,0)	= voice(f1); // mono
play_values(f1,f2)	= voice(f1) , voice(f2); //stereo: f1 = left, f2 = rigth

// Implementation (this version ignores timbre parameters)
phasor(f)   = f/ma.SR : (+,1.0:fmod) ~ _ ;
osc(f)      = phasor(f) * 6.28318530718 : sin;

timbre(freq)= osc(freq) + 0.1*osc(2.0*freq) + 0.25*osc(3.0*freq) + (volume * brightness * reverb * type_1 * type_2);

envelop_cont(freq) = gain(freq) : smooth(0.9995) with { 
	smooth(c) = * (1-c) : + ~ * (c) ; 
} ;

envelop_disc(freq) = en.adsr(attack, decay, sustain, release, gate(freq));

envelop(freq) = envelop_disc(freq) * is_discrete + envelop_cont(freq) * (is_discrete - 1);

voice(freq) = envelop(freq) * timbre(freq);
