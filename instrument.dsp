// Simple Organ
import("stdfaust.lib");

// Data series parameters
freq1		= hslider("freq1[unit:Hz]", 0, 0, 12000, 1); 	// series1 frequency
freq2		= hslider("freq2[unit:Hz]", 0, 0, 12000, 1); 	// series2 frequency

// Timbre parameters
volume			 = hslider("volume", 1, 0, 1, 0.1);
reverb		 	 = hslider("reverb", 1, 0, 1, 0.1);
brightness		 = hslider("brightness", 1, 0, 1, 0.1);
is_discrete 	 = button("is_discrete");
envelop_duration = hslider("envelop_duration", 1, 0, 1000, 1);
type_1			 = hslider("type_1", 1, 1, 3, 1);  
type_2			 = hslider("type_2", 1, 1, 3, 1);  

// Frequency dependent variables
gate(0)			 	= 0;
gate(f)			 	= 1;

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

timbre(freq)= osc(freq) + 0.1*osc(2.0*freq) + 0.25*osc(3.0*freq) + (volume * brightness * reverb  * envelop_duration * is_discrete * type_1 * type_2);

envelop(freq) = gain(freq) : smooth(0.9995)
                with { smooth(c) = * (1-c) : + ~ * (c) ; } ;

voice(freq) = envelop(freq) * timbre(freq);


//DUMMY

envelop_me(d) = d/d;
