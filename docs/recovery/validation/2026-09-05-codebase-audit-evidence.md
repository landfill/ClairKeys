# 2026-09-05 codebase audit: reproducible evidence

Audited application revision: `2636657ecbdac6d354bd2e874026b9a05ff6d9c1`.

See [findings and limitations](2026-09-05-codebase-audit.md). This is a diagnostic record, not a new CI suite or an implementation change. The JavaScript assertions pin observed defects, not desired behavior. Its hook probe mocks audio callbacks and drives requestAnimationFrame in jsdom; it does not claim browser audio or physical-device verification. The Python probes exercise the existing converter in memory. The same-voice cross-staff tie probe is synthetic and is not attributed to either user score.

The JSON blocks preserve the downloaded bytes inside Markdown, including each source's trailing newline. No source PDF or PDF rendering is retained in the repository (D-040). Inputs were read from the public URLs the user supplied in GitHub issues #134 and #135 on 2026-09-05. Hashes are recorded in the findings and emitted by the JavaScript probe.

## Run from the repository root

```sh
node --import tsx -e 'const d=require("fs").readFileSync("docs/recovery/validation/2026-09-05-codebase-audit-evidence.md","utf8");eval(d.split("```javascript\n")[1].split("\n```")[0])'
python3 -c 'from pathlib import Path; d=Path("docs/recovery/validation/2026-09-05-codebase-audit-evidence.md").read_text(); exec(d.split("```python\n")[1].split("\n```")[0])'
```

## JavaScript: production JSON, fingering, timing boundary, scan cost and A-B wrap

```javascript
const { createRequire } = require('module');
const req = createRequire(process.cwd() + '/package.json');
const fs = require('fs');
const assert = require('assert/strict');
const { performance } = require('perf_hooks');
const { canonicalToFallingNotes } = req('./src/utils/dataConverter.ts');
const { addFingeringToNotes } = req('./src/utils/fingeringUtils.ts');
const { chordIsReachable } = req('./src/utils/handReach.ts');
const { getActiveNotes, calculateSongLength, notesToVisualNotes } = req('./src/utils/visualUtils.ts');
const { buildResponsiveKeyLayout } = req('./src/utils/pianoLayout.ts');
const { selectNotesInWindow } = req('./src/utils/audioScheduler.ts');
for (const id of [134, 135]) {
  const evidence = fs.readFileSync('docs/recovery/validation/2026-09-05-codebase-audit-evidence.md', 'utf8');
  const raw = evidence.split(`<!-- issue-${id}-json -->\n\x60\x60\x60json\n`)[1].split('\n\x60\x60\x60')[0];
  const d = JSON.parse(raw);
  const notes = canonicalToFallingNotes(d);
  const starts = [...new Set(notes.map(n => n.start))];
  const unholdable = [];
  const onsetUnholdable = [];
  for (const start of starts) for (const hand of ['L', 'R']) {
    const check = sounding => {
      const active = notes.filter(n => n.hand === hand && (sounding ? n.start <= start && n.start + n.duration > start + 0.00001 : n.start === start)).sort((a,b) => a.midi-b.midi);
      return active.length > 1 && !chordIsReachable(active.map(n => n.midi), active.map(n => n.finger)) ? { start, hand, span: active.at(-1).midi-active[0].midi, notes: active } : null;
    };
    const a=check(true), b=check(false);
    if(a) unholdable.push(a);
    if(b) onsetUnholdable.push(b);
  }
  console.log(JSON.stringify({id,sha256:require('crypto').createHash('sha256').update(raw).digest('hex'),count:notes.length,onsetUnholdable:onsetUnholdable.length,soundingUnholdable:unholdable.length,first:unholdable.slice(0,2),onsetFirst:onsetUnholdable.slice(0,2)}));
}
for (const count of [12000, 48000]) {
  const notes = Array.from({length:count}, (_,i) => ({midi:48+i%24,start:i*0.125,duration:0.12,hand:i%2?'R':'L'}));
  const runs=[];
  for(let i=0;i<4;i++) {const start=performance.now();addFingeringToNotes(notes);runs.push(+(performance.now()-start).toFixed(2));}
  const layout=buildResponsiveKeyLayout(1200,notes);
  const frameStart=performance.now();
  for(let i=0;i<600;i++){const t=500+i/60;calculateSongLength(notes);getActiveNotes(notes,t);notesToVisualNotes(notes,t,140,330,layout);if(i%6===0)selectNotesInWindow(notes,t,t+1.5);}
  console.log(JSON.stringify({count,inferenceMs:runs,pureFrameScanAverageMs:+((performance.now()-frameStart)/600).toFixed(3),excludes:'React reconciliation, DOM layout/paint, audio allocation, mobile hardware'}));
}
assert.deepEqual(getActiveNotes([{midi:60,start:0,duration:1},{midi:62,start:1,duration:1}],1).map(n=>n.midi),[60,62]);
console.log('Boundary probe: getActiveNotes includes both an ended note and its successor at t=1.');

// Preserve the stable callbacks used by the real audio hook. The repository's
// marker-only test creates fresh mocks per render and never crosses B.
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
global.window=dom.window;global.document=dom.window.document;
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.HTMLElement=dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT=true;
let clock=0, rafId=0, starts=0;
const frames=new Map();
global.requestAnimationFrame=cb=>{frames.set(++rafId,cb);return rafId;};
global.cancelAnimationFrame=id=>frames.delete(id);
const mockAudio={startAudio:async (_notes,offset)=>{clock=offset;starts++;return true;},stopAudio:()=>{},getCurrentTime:()=>clock,updateTempoScale:()=>{},setOffsetTime:t=>{clock=t;},setVolume:v=>v,sampleStatus:'ready',reset:()=>{clock=0;}};
const audioPath=req.resolve('./src/hooks/useFallingNotesAudio.ts');
req.cache[audioPath]={id:audioPath,filename:audioPath,loaded:true,exports:{DEFAULT_MASTER_GAIN:0.8,useFallingNotesAudio:()=>mockAudio}};
const { renderHook, act }=req('@testing-library/react');
const { useFallingNotesPlayer }=req('./src/hooks/useFallingNotesPlayer.ts');
async function main(){
  const stableNotes=[{midi:60,start:0,duration:10,hand:'R'}];
  const {result,unmount}=renderHook(()=>useFallingNotesPlayer(stableNotes));
  await act(async()=>{await result.current.seek(2);});
  act(()=>result.current.markLoopStart());
  await act(async()=>{await result.current.seek(4);});
  act(()=>result.current.markLoopEnd());
  await act(async()=>{await result.current.seek(2);await result.current.play();});
  const before=frames.size;
  clock=4.1;
  await act(async()=>{const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(0);});
  const observed={before,pendingFramesAfterWrap:frames.size,isPlaying:result.current.isPlaying,displayTime:result.current.currentTime,audioStarts:starts,loop:[result.current.loopStart,result.current.loopEnd]};
  console.log('Loop probe:',JSON.stringify(observed));
  assert.equal(observed.pendingFramesAfterWrap,0);
  assert.equal(observed.isPlaying,true);
  unmount();dom.window.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});

```

## Python: conversion probes

```python
import sys, xml.etree.ElementTree as E
sys.path.insert(0, 'omr-service')
from omr.converter import MusicXMLToClairKeysConverter
c = MusicXMLToClairKeysConverter()
note = lambda step, d=1, extra='': f'<note><pitch><step>{step}</step><octave>4</octave></pitch><duration>{d}</duration><voice>1</voice>{extra}</note>'
root = E.fromstring('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes><direction><sound tempo="60"/></direction>'+note('C',4)+'</measure><measure number="2">'+note('D')+'<direction><sound tempo="120"/></direction>'+note('E')+'</measure></part></score-partwise>')
print('Mid-measure tempo:', [(n['midi'],n['start'],n['duration']) for n in c._extract_notes(root,60)], 'expected D4=(4,1), E4=(5,0.5)')
root = E.fromstring('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><staves>2</staves></attributes>'+note('C',1,'<staff>1</staff><tie type="start"/>')+'<backup><duration>1</duration></backup>'+note('C',1,'<staff>2</staff><tie type="start"/>')+'</measure><measure number="2">'+note('C',1,'<staff>1</staff><tie type="stop"/>')+'<backup><duration>1</duration></backup>'+note('C',1,'<staff>2</staff><tie type="stop"/>')+'</measure></part></score-partwise>')
print('Cross-staff ties:', c._extract_notes(root,60), 'expected 2 notes, duration 2 each; same voice ID reused on two staves')
root = E.fromstring('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>'+note('C')+'<barline location="right"><repeat direction="backward" times="2"/></barline></measure></part></score-partwise>')
print('Repeat:', c._extract_notes(root,60), 'expected 2 attacks in performed timeline')
for key in ['<fifths>-1</fifths><mode>major</mode>', '<fifths>0</fifths><mode>minor</mode>']:
    print('Key:', key, '=>', c._extract_key_signature(E.fromstring('<score-partwise><key>'+key+'</key></score-partwise>')))

```

## Stored input for issue #134

<!-- issue-134-json -->
```json
{
  "version": "1.1",
  "title": "Clair de lune v2",
  "composer": "Claude Debussy",
  "metadata": {
    "title": "Clair de lune v2",
    "composer": "Claude Debussy"
  },
  "notes": [
    {
      "midi": 64,
      "start": 0.652174,
      "duration": 3.913044,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 0.652174,
      "duration": 3.913044,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 1.304348,
      "duration": 2.608696,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 79,
      "start": 1.304348,
      "duration": 2.608696,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 4.565217,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 68,
      "start": 4.565217,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 4.565217,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 4.565217,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 5.217391,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 5.217391,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 5.869565,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 5.869565,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 6.521739,
      "duration": 3.26087,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 6.521739,
      "duration": 3.26087,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 9.130435,
      "duration": 3.913044,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 9.130435,
      "duration": 2.608696,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 9.782609,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 9.782609,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 10.434783,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 10.434783,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 11.086957,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 11.086957,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 11.73913,
      "duration": 1.304348,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 11.73913,
      "duration": 1.304348,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 13.043478,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 62,
      "start": 15,
      "duration": 5.869565,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 15,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 15,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 15,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 15.652174,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 15.652174,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 16.304348,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 16.304348,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 16.956522,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 16.956522,
      "duration": 4.347826,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 18.913043,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 20.869565,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 20.869565,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 21.304348,
      "duration": 0.434783,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 21.73913,
      "duration": 0.434783,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 22.173913,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 22.826087,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 23.478261,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 24.130435,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 24.130435,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 24.130435,
      "duration": 0.978261,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 25.108696,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 25.76087,
      "duration": 1.304348,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 26.413043,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 26.413043,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 26.413043,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 27.065217,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 27.717391,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 28.369565,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 55,
      "start": 30.326087,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 30.326087,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 30.326087,
      "duration": 2.608696,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 30.326087,
      "duration": 0.978261,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 31.304348,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 31.956522,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 32.608696,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 33.26087,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 33.913043,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 52,
      "start": 34.565217,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 34.565217,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 34.565217,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 62,
      "start": 34.565217,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 60,
      "start": 35.217391,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 62,
      "start": 35.869565,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 60,
      "start": 36.521739,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 48,
      "start": 38.478261,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 52,
      "start": 39.130435,
      "duration": 2.608696,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 40.434783,
      "duration": 1.304348,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 40.434783,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 6,
      "staff": 1
    },
    {
      "midi": 53,
      "start": 41.73913,
      "duration": 5.869565,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 41.73913,
      "duration": 5.869565,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 41.73913,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 41.73913,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 42.391304,
      "duration": 5.217391,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 42.391304,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 43.043478,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 43.695652,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 52,
      "start": 47.608696,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 47.608696,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 47.608696,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 48.26087,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 48.913043,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 49.565217,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 79,
      "start": 49.565217,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 53,
      "start": 51.521739,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 51.521739,
      "duration": 5.869565,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 51.521739,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 51.521739,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 52.173913,
      "duration": 5.217391,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 52.173913,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 52.826087,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 53.478261,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 53,
      "start": 55.434783,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 55.434783,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 3,
      "staff": 1
    },
    {
      "midi": 52,
      "start": 57.391304,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 57.391304,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 58.043478,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 62,
      "start": 58.695652,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 60,
      "start": 59.347826,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 59.347826,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 59.347826,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 50,
      "start": 61.304348,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 53,
      "start": 61.304348,
      "duration": 5.869565,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 61.956522,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 62.608696,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 63.26087,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 63.26087,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 63.26087,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 50,
      "start": 65.217391,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 65.217391,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 65.217391,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 2,
      "staff": 1
    },
    {
      "midi": 43,
      "start": 67.173913,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 50,
      "start": 67.173913,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 53,
      "start": 67.173913,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 67.826087,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 68.478261,
      "duration": 0.652174,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 67,
      "start": 69.130435,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 69.130435,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 69.130435,
      "duration": 1.956522,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 36,
      "start": 71.086957,
      "duration": 1.304348,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 71.086957,
      "duration": 5.869565,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 79,
      "start": 71.086957,
      "duration": 5.869565,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 43,
      "start": 72.391304,
      "duration": 0.652174,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 48,
      "start": 73.043478,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 75,
      "duration": 1.956522,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 76.956522,
      "duration": 3.913043,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 76.956522,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 79,
      "start": 76.956522,
      "duration": 3.913043,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    }
  ],
  "duration": 80.86956500000001,
  "tempo": 46,
  "tempoSource": "user",
  "timingReferenceBpm": 46,
  "scoreTempo": 69,
  "keySignature": "C",
  "timeSignature": "6/8",
  "generated_at": "2026-09-05T04:52:58.598673"
}
```

## Stored input for issue #135

<!-- issue-135-json -->
```json
{
  "version": "1.1",
  "title": "Gymnopédie No.1",
  "composer": "Erik Satie",
  "metadata": {
    "title": "Gymnopédie No.1",
    "composer": "Erik Satie"
  },
  "notes": [
    {
      "midi": 43,
      "start": 0,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 0.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 0.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 0.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 2.368421,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 3.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 3.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 3.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 43,
      "start": 4.736842,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 5.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 5.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 5.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 7.105263,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 7.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 7.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 7.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 43,
      "start": 9.473684,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 10.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 10.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 10.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 10.263158,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 81,
      "start": 11.052632,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 11.842105,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 79,
      "start": 11.842105,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 12.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 12.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 12.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 12.631579,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 73,
      "start": 13.421053,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 43,
      "start": 14.210526,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 71,
      "start": 14.210526,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 15,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 15,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 15,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 73,
      "start": 15,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 15.789474,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 16.578947,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 16.578947,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 17.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 17.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 17.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 43,
      "start": 18.947368,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 18.947368,
      "duration": 9.473684,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 19.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 19.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 19.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 21.315789,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 22.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 22.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 22.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 43,
      "start": 23.684211,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 24.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 24.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 24.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 26.052632,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 26.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 26.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 26.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 43,
      "start": 28.421053,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 29.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 29.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 29.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 29.210526,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 81,
      "start": 30,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 30.789474,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 79,
      "start": 30.789474,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 31.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 31.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 31.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 31.578947,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 73,
      "start": 32.368421,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 43,
      "start": 33.157895,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 71,
      "start": 33.157895,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 33.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 33.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 33.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 73,
      "start": 33.947368,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 34.736842,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 35.526316,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 35.526316,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 36.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 36.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 36.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 42,
      "start": 37.894737,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 73,
      "start": 37.894737,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 38.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 38.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 38.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 35,
      "start": 40.263158,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 40.263158,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 41.052632,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 41.052632,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 41.052632,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 40,
      "start": 42.631579,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 42.631579,
      "duration": 7.105263,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 55,
      "start": 43.421053,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 43.421053,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 40,
      "start": 45,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 45.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 45.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 45.789474,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 47.368421,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 53,
      "start": 48.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 48.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 48.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 33,
      "start": 49.736842,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 49.736842,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 50.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 50.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 50.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 71,
      "start": 50.526316,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 51.315789,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 52.105263,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 52.105263,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 55,
      "start": 52.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 52.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 52.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 52.894737,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 53.684211,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 54.473684,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 54.473684,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 50,
      "start": 55.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 55.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 55.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 55.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 55.263158,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 56.052632,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 56.842105,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 56.842105,
      "duration": 3.947368,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 48,
      "start": 57.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 52,
      "start": 57.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 57.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 57.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 59.210526,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 48,
      "start": 60,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 54,
      "start": 60,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 60,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 60,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 60.789474,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 61.578947,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 61.578947,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 62.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 62.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 62.368421,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 77,
      "start": 62.368421,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 79,
      "start": 63.157895,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 63.947368,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 81,
      "start": 63.947368,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 64.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 64.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 64.736842,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 64.736842,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 65.526316,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 66.315789,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 66.315789,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 50,
      "start": 67.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 67.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 67.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 67.105263,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 67.105263,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 67.894737,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 68.684211,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 68.684211,
      "duration": 3.947368,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 48,
      "start": 69.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 52,
      "start": 69.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 69.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 69.473684,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 38,
      "start": 71.052632,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 48,
      "start": 71.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 54,
      "start": 71.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 71.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 71.842105,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 72.631579,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 73.421053,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 79,
      "start": 73.421053,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 74.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 74.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 74.210526,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 42,
      "start": 75.789474,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 78,
      "start": 75.789474,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 76.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 76.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 76.578947,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 35,
      "start": 78.157895,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 71,
      "start": 78.157895,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 78.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 78.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 78.947368,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 78.947368,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 71,
      "start": 79.736842,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 80.526316,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 73,
      "start": 80.526316,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 61,
      "start": 81.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 81.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 81.315789,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 81.315789,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 82.105263,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 82.894737,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 73,
      "start": 82.894737,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 83.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 61,
      "start": 83.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 83.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 83.684211,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 83.684211,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 76,
      "start": 84.473684,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 85.263158,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 66,
      "start": 85.263158,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 47,
      "start": 86.052632,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 86.052632,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 86.052632,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 52,
      "start": 86.842105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 86.842105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 86.842105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 86.842105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 45,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 87.631579,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 90,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 45,
      "start": 90,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 50,
      "start": 90,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 90,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 66,
      "start": 90,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 90,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 90,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 92.368421,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 79,
      "start": 92.368421,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 59,
      "start": 93.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 93.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 93.157895,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 40,
      "start": 94.736842,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 95.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 95.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 95.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 95.526316,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 40,
      "start": 97.105263,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 71,
      "start": 97.105263,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 97.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 97.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 97.894737,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 72,
      "start": 97.894737,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 77,
      "start": 98.684211,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 99.473684,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 99.473684,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 60,
      "start": 100.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 64,
      "start": 100.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 100.263158,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 100.263158,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 101.052632,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 101.842105,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 76,
      "start": 101.842105,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 57,
      "start": 102.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 102.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 102.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 69,
      "start": 102.631579,
      "duration": 1.578947,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 74,
      "start": 102.631579,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 103.421053,
      "duration": 0.789474,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 40,
      "start": 104.210526,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 6,
      "staff": 2
    },
    {
      "midi": 65,
      "start": 104.210526,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 47,
      "start": 105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 57,
      "start": 105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 105,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 52,
      "start": 105.789474,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 59,
      "start": 105.789474,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 105.789474,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 67,
      "start": 105.789474,
      "duration": 0.789474,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 45,
      "start": 106.578947,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 55,
      "start": 106.578947,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 60,
      "start": 106.578947,
      "duration": 1.578947,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 64,
      "start": 106.578947,
      "duration": 1.578947,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 106.578947,
      "duration": 1.578947,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 106.578947,
      "duration": 1.578947,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 72,
      "start": 106.578947,
      "duration": 1.578947,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 38,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 45,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 50,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "L",
      "finger": null,
      "voice": 5,
      "staff": 2
    },
    {
      "midi": 62,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 65,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 69,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    },
    {
      "midi": 74,
      "start": 108.947368,
      "duration": 2.368421,
      "hand": "R",
      "finger": null,
      "voice": 1,
      "staff": 1
    }
  ],
  "duration": 111.315789,
  "tempo": 76,
  "tempoSource": "user",
  "timingReferenceBpm": 76,
  "scoreTempo": null,
  "keySignature": "D",
  "timeSignature": "3/4",
  "generated_at": "2026-09-05T05:13:29.711745"
}
```
