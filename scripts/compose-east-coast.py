"""Original demo: MooMoo's East Coast Holiday. 88 BPM, F major, 44 bars / 120 s.
Synthetic piano, plucked guitar/bass, reed lead, brushed percussion, vibraphone.
No recorded samples. Render with: uv run --with numpy python scripts/compose-east-coast.py
Writes a new master only; never overwrites an earlier render.
"""
from pathlib import Path
import json, math, wave
import numpy as np

RATE=32000; BPM=88; BEAT=60/BPM; BARS=44; LENGTH=BARS*4*BEAT
N=round(RATE*LENGTH); audio=np.zeros((N,2),np.float64)
rng=np.random.default_rng(1966); events=[]; cache={}
OUT=Path(__file__).resolve().parents[1]/'artifacts/east-coast-music-v1'
OUT.mkdir(parents=True,exist_ok=True)
master=OUT/'moomoo-east-coast-holiday-v1.wav'
if master.exists():raise SystemExit('Master already exists; render a new version instead')

# Root, compact left-hand voicing, fifth. Each tuple describes a full bar.
F=(41,[57,60,62,65],48); D7=(38,[54,60,64,69],45)
Gm=(43,[58,62,65,69],50); C9=(36,[58,62,64,67],43)
Am=(45,[55,60,64,67],52); Dm=(38,[57,60,65,69],45)
Bb=(34,[57,62,65,69],41); Bdim=(35,[56,62,65,68],41)
Cm=(36,[58,63,67,70],43); F7=(41,[57,63,67,72],48)
G7=(43,[59,62,65,69],50)
A=[F,D7,Gm,C9,Am,Dm,Gm,C9]
BRIDGE=[Bb,Bb,Bdim,F,Am,D7,G7,C9]
OUTRO=[F,Dm,Gm,C9,Bb,F,Gm,C9]
chords=[F,Dm,Gm,C9]+A+A+BRIDGE+A+OUTRO
# Original 8-bar question and answer; values are beat, MIDI pitch, note length in beats.
melody=[[(.5,69,.55),(1.5,72,.7),(2.5,74,.55),(3.5,72,.35)],
 [(0,69,1.0),(1.5,66,.45),(2.5,69,.45),(3,72,.7)],
 [(.5,70,.55),(1.5,69,.45),(2,67,.8),(3.5,65,.4)],
 [(0,64,1.1),(2,67,.55),(3,70,.65)],
 [(.5,72,.65),(1.5,76,.6),(2.5,74,.55),(3.5,72,.35)],
 [(0,69,1.25),(2,65,.65),(3,64,.5)],
 [(.5,62,.6),(1.5,65,.6),(2.5,69,.5),(3.5,67,.35)],
 [(0,64,.7),(1.5,67,.5),(2.5,65,.8)]]
bridge=[[(0,74,1.1),(1.5,77,.65),(3,74,.8)],[(.5,72,.7),(2,69,1.3)],
 [(0,68,.65),(1.5,71,.7),(3,74,.7)],[(.5,72,1.2),(2.5,69,.8)],
 [(0,67,.7),(1,69,.55),(2.5,72,.8)],[(.5,69,.7),(2,66,.7),(3,64,.6)],
 [(0,67,.8),(1.5,71,.65),(2.5,69,.8)],[(.5,67,.7),(2,64,1.0)]]

def swing(beat):
    whole=math.floor(beat);fraction=beat-whole
    return whole+(fraction*1.16 if fraction<=.5 else .58+(fraction-.5)*.84)

def voice(note,duration,kind):
    key=(note,round(duration,4),kind)
    if key in cache:return cache[key]
    f=440*2**((note-69)/12);tail={'piano':1.4,'guitar':.65,'bass':.25,'reed':.12,'vibes':1.8}[kind]
    t=np.arange(round((duration+tail)*RATE))/RATE
    if kind=='piano':
        v=np.zeros_like(t)
        for h,amp in enumerate([1,.42,.21,.11,.065,.035,.018],1):
            freq=f*h*math.sqrt(1+.00011*h*h)
            detune=.00055 if h<4 else .00025
            tone=(np.sin(2*np.pi*freq*t)+.35*np.sin(2*np.pi*freq*(1+detune)*t))/1.35
            v+=amp*tone*np.exp(-t*(1.35+.65*h))
        v*=np.minimum(1,t/.004)*np.exp(-np.maximum(0,t-duration)*5)
    elif kind=='guitar':
        v=np.zeros_like(t)
        for h in range(1,10):
            amp=np.sin(h*np.pi*.22)/h
            v+=amp*np.cos(2*np.pi*f*h*t)*np.exp(-t*(2.6+h*.75))
        v*=np.minimum(1,t/.003)*np.exp(-np.maximum(0,t-duration)*9)
    elif kind=='bass':
        phase=2*np.pi*f*t+.10*(1-np.exp(-t*25))
        v=(np.sin(phase)+.24*np.sin(2*phase)+.09*np.sin(3*phase))*np.exp(-t*2.4)
        v*=np.minimum(1,t/.009)*np.exp(-np.maximum(0,t-duration)*18)
    elif kind=='reed':
        phase=2*np.pi*f*t+.055*np.sin(2*np.pi*5.1*t)*np.minimum(1,t/.25)
        v=(np.sin(phase)+.19*np.sin(3*phase)+.045*np.sin(5*phase))
        v*=np.minimum(1,t/.045)*np.minimum(1,np.maximum(0,(duration+.10-t)/.13))
        v*=.87+.06*np.sin(2*np.pi*3.3*t)
    else:
        v=(np.sin(2*np.pi*f*t)+.19*np.sin(2*np.pi*f*4*t)*np.exp(-t*5))*np.exp(-t*1.8)
        v*=np.minimum(1,t/.006)*(.88+.12*np.sin(2*np.pi*4.8*t))
    v*=np.minimum(1,np.maximum(0,(t[-1]-t)/.03))
    cache[key]=v
    return v

def mix(sound,start,gain,pan):
    off=round(start*RATE);positions=(off+np.arange(len(sound)))%N
    audio[positions,0]+=sound*gain*math.sqrt((1-pan)/2)
    audio[positions,1]+=sound*gain*math.sqrt((1+pan)/2)

def note(n,bar,beat,duration,gain,pan,kind):
    # Mild, deterministic timing variation; retain exact bar boundaries for looping.
    start=(bar*4+swing(beat))*BEAT+(0 if beat==0 else rng.uniform(-.009,.009))
    mix(voice(n,round(duration*BEAT,4),kind),start,gain,pan)
    events.append({'bar':bar+1,'beat':beat,'midi':n,'durationBeats':duration,'voice':kind})

def brush(start,gain,accent=False):
    duration=.22 if accent else .10;t=np.arange(round(duration*RATE))/RATE
    noise=rng.normal(0,1,len(t));smooth=np.convolve(noise,np.ones(7)/7,mode='same')
    sound=(noise-smooth)*np.exp(-t/(.06 if accent else .025))*np.minimum(1,t/.007)
    sound=np.convolve(sound,np.array([.25,.5,.25]),mode='same')
    mix(sound,start,gain,.2)

for bar,(root,voicing,fifth) in enumerate(chords):
    intro=bar<4;outro=bar>=36;bridge_part=20<=bar<28
    fullness=.72 if intro else .86 if outro else 1.0
    # Sparse two-feel bass rather than a busy walking line.
    note(root,bar,0,1.25,.17*fullness,-.06,'bass')
    note(fifth,bar,2,1.0,.125*fullness,-.06,'bass')
    if not intro and bar%4==3:note(root+12,bar,3.5,.35,.065,-.06,'bass')
    # Gently swung, spread guitar voicings; piano melody remains in front.
    for beat,g in [(0,.065),(1.5,.052),(3,.047)]:
        for k,pitch in enumerate(voicing):note(pitch,bar,beat+k*.018,.7,g*fullness,-.4,'guitar')
    for beat in [0,1,2,3]:
        brush((bar*4+beat)*BEAT,.014*fullness,beat in [1,3])
        if not intro:brush((bar*4+swing(beat+.5))*BEAT,.006*fullness)
    if intro:
        for beat,pitch in [(0,voicing[-1]),(2.5,voicing[-2])]:note(pitch+12,bar,beat,1.2,.045,.35,'vibes')
    else:
        phrase=(bridge[(bar-20)%8] if bridge_part else melody[(bar-4)%8])
        lead='reed' if bridge_part or 12<=bar<16 else 'piano'
        for beat,pitch,d in phrase:
            gain=(.10 if lead=='reed' else .17)*(.82 if outro else 1)*rng.uniform(.91,1.04)
            note(pitch,bar,beat,d,gain,.12,lead)
        # Brief answers in gaps, never another competing tune.
        if bar%4 in [1,3] and not bridge_part:
            note(voicing[-1]+12,bar,3.65,.6,.026,.4,'vibes')
        if bar in [11,19,35,43]:
            for k,pitch in enumerate(voicing):note(pitch,bar,3.1+k*.03,.6,.035,-.18,'piano')

# Small, circular room ambience: tails wrap into start; no whole-track fade.
dry=audio.copy()
for seconds,g in [(.053,.10),(.113,.075),(.197,.05),(.307,.032)]:
    audio+=np.roll(dry[:,::-1],round(seconds*RATE),axis=0)*g
# Remove DC and prevent clipping, preserving dynamics.
audio-=audio.mean(axis=0);audio=np.tanh(audio*1.15)
peak=float(np.max(np.abs(audio)));audio*=.72/peak
pcm=np.round(audio*32767).astype('<i2')
with master.open('xb') as f:
    with wave.open(f,'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
metrics={'title':'MooMoo 的东岸小假期','version':1,'bpm':BPM,'key':'F major','bars':BARS,'durationSeconds':N/RATE,'sampleRate':RATE,'peak':float(np.max(np.abs(audio))),'rms':float(np.sqrt(np.mean(audio**2))),'loopEdgeDelta':np.abs(audio[0]-audio[-1]).tolist(),'notes':len(events),'voices':sorted({e['voice'] for e in events}),'render':'deterministic local synthesis, no samples'}
(OUT/'score.json').write_text(json.dumps({'metrics':metrics,'events':events},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
