# g7112pcm.js
decode G.711 buffer to 16 bit PCM

`npm install g7112pcm`


```javascript
var decodeAlaw = require("g711pcm").decodeAlaw;
var decodeUlaw = require("g711pcm").decodeUlaw;

const pcmData = decodeAlaw(Uint8Array(ALAW_BUFFER));
const pcmData = decodeUlaw(Uint8Array(ULAW_BUFFER));
```
