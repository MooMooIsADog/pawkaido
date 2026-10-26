"""Original score: Sakura Pawprints / 樱风里的小爪印.
D yo-pentatonic (D E G A B), 4/4, quarter = 64, 16 bars = 60 seconds.
Synthesized koto-like plucks, breathy flute and soft wood taps, no samples.
The circular delay and note tails preserve a continuous looping soundscape.
"""
from array import array
from functools import lru_cache
from pathlib import Path
import math, wave, sys
RATE=32000
BEAT=60/64
BAR=4*BEAT
LENGTH=16*BAR
N=round(RATE*LENGTH)
left,right=array('f',[0])*N,array('f',[0])*N
# Original call and response, with a suspended final phrase returning to D.
MELODY=[[(0,74,1.4),(2,76,.7),(3,79,.8)],[(0,81,1.8),(2.5,79,1.1)],
 [(0,76,1.5),(2,74,.8),(3,71,.7)],[(0,69,2.7)],
 [(0,71,.8),(1,74,1.6),(3,76,.7)],[(0,79,1.7),(2.5,81,1.1)],
 [(0,83,1.3),(2,81,.6),(3,79,.7)],[(0,76,1.5),(2,74,1.8)],
 [(0,86,1.8),(2.5,83,1.0)],[(0,81,1.7),(2.5,79,1.1)],
 [(0,76,1.6),(2,79,.7),(3,81,.7)],[(0,79,2.8)],
 [(0,76,.8),(1,74,1.3),(3,71,.8)],[(0,69,1.5),(2,71,1.5)],
 [(0,74,1.6),(2,76,.7),(3,71,.7)],[(0,74,2.8)]]
ROOTS=[50,50,55,57,55,50,59,50,55,57,50,55,50,55,57,50]
@lru_cache(maxsize=512)
def voice(midi,duration,kind):
 f=440*2**((midi-69)/12); total=duration+1.0; out=array('f')
 for i in range(round(total*RATE)):
  t=i/RATE; end=min(1,(total-t)/.08)
  if kind=='flute':
   attack=min(1,t/.15); release=math.exp(-max(0,t-duration)*6)
   phase=2*math.pi*f*t+.035*math.sin(2*math.pi*4.7*t)
   # Deterministic low-amplitude pseudo-noise adds a little breath.
   noise=(((i*1103515245+12345)&65535)/32768-1)*.025
   value=(math.sin(phase)+.19*math.sin(2*phase)+.06*math.sin(3*phase)+noise)*attack*release
  elif kind=='wood':
   value=(math.sin(2*math.pi*f*t)+.3*math.sin(2*math.pi*f*2.13*t))*math.exp(-t*35)*min(1,t/.002)
  else:
   phase=2*math.pi*f*t+.05*math.exp(-t*20)
   value=sum(w*math.sin(phase*h)*math.exp(-t*(1.8+h*.9)) for h,w in enumerate([1,.48,.27,.13,.07,.025],1))
   value*=min(1,t/.003)*math.exp(-max(0,t-duration)*5)
  out.append(value*max(0,end))
 return out

def add(midi,start,duration,gain,pan,kind):
 a,b=gain*math.sqrt((1-pan)/2),gain*math.sqrt((1+pan)/2)
 off=round(start*RATE)
 for i,v in enumerate(voice(midi,round(duration,4),kind)):
  j=(off+i)%N;left[j]+=v*a;right[j]+=v*b

for bar,notes in enumerate(MELODY):
 start=bar*BAR
 for beat,n,d in notes:
  add(n,start+beat*BEAT,d*BEAT,.16 if bar<8 else .14,.22,'flute')
 root=ROOTS[bar]
 for beat,n,g in [(0,root,.20),(1.5,root+7,.115),(2.5,root+12,.10),(3.5,root+7,.085)]:
  add(n,start+beat*BEAT,BEAT*1.5,g,-.35,'koto')
 if bar in [1,3,5,7,9,11,13,15]:
  add(86 if bar%4==1 else 81,start+3.25*BEAT,BEAT*.6,.07,-.1,'koto')
 if bar%2==0:
  add(55,start+2*BEAT,.08,.035,.1,'wood')

dry_l,dry_r=array('f',left),array('f',right)
for delay,gain in [(.13,.12),(.29,.08),(.43,.045)]:
 shift=round(delay*RATE)
 for i in range(N):
  j=(i-shift)%N;left[i]+=dry_r[j]*gain;right[i]+=dry_l[j]*gain
peak=max(max(abs(x)for x in left),max(abs(x)for x in right));scale=.66/peak
pcm=array('h');sq=0
for l,r in zip(left,right):
 pcm.extend((round(l*scale*32767),round(r*scale*32767)));sq+=((l*scale)**2+(r*scale)**2)/2
if sys.byteorder!='little':pcm.byteswap()
out=Path(__file__).resolve().parents[1]/'dist/assets/sakura-pawprints.wav'
with wave.open(str(out),'wb')as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
print(f'{out.name}: {LENGTH}s stereo {RATE}Hz; peak .66; RMS {math.sqrt(sq/N):.4f}')
print(f'Loop edge delta: {abs(left[0]-left[-1])*scale:.6f}, {abs(right[0]-right[-1])*scale:.6f}')
