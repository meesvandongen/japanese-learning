/**
 * Generate two short PCM WAV files used by the native useAudioFeedback hook.
 *
 * The web hook synthesises beeps via WebAudio at runtime; native uses
 * expo-audio with bundled assets so we ship pre-generated PCM here.
 *
 * Output: packages/core/assets/{correct,incorrect}.wav
 *
 * The waveform is a simple sine sweep — same vibe as the web tones:
 *   correct   880 Hz → 1100 Hz over 200ms
 *   incorrect 220 Hz → 110  Hz over 300ms
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'packages', 'core', 'assets')
mkdirSync(outDir, { recursive: true })

const SAMPLE_RATE = 44_100
const BITS_PER_SAMPLE = 16
const CHANNELS = 1

function generate({ from, to, durationMs, gain = 0.3 }) {
  const samples = Math.round((SAMPLE_RATE * durationMs) / 1000)
  const data = Buffer.alloc(samples * 2)
  let phase = 0
  for (let i = 0; i < samples; i++) {
    const t = i / samples
    // exponential frequency ramp matches WebAudio's exponentialRampToValueAtTime
    const freq = from * Math.pow(to / from, t)
    phase += (2 * Math.PI * freq) / SAMPLE_RATE
    // gentle envelope so the cut-off isn't a click
    const env = Math.min(1, (1 - t) * 6) * Math.min(1, t * 50)
    const sample = Math.round(Math.sin(phase) * env * gain * 32_767)
    data.writeInt16LE(sample, i * 2)
  }
  return data
}

function wav(pcm) {
  const dataLen = pcm.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataLen, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)            // fmt chunk size
  header.writeUInt16LE(1, 20)             // PCM
  header.writeUInt16LE(CHANNELS, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE((SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8, 28)
  header.writeUInt16LE((CHANNELS * BITS_PER_SAMPLE) / 8, 32)
  header.writeUInt16LE(BITS_PER_SAMPLE, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataLen, 40)
  return Buffer.concat([header, pcm])
}

writeFileSync(join(outDir, 'correct.wav'), wav(generate({ from: 880, to: 1100, durationMs: 200 })))
writeFileSync(join(outDir, 'incorrect.wav'), wav(generate({ from: 220, to: 110, durationMs: 300 })))

// 1 second of silence — used by walk mode as the keep-alive RNTP track.
writeFileSync(join(outDir, 'silence.wav'), wav(generate({ from: 1, to: 1, durationMs: 1000, gain: 0 })))

console.log(`✓ ${outDir}/correct.wav`)
console.log(`✓ ${outDir}/incorrect.wav`)
console.log(`✓ ${outDir}/silence.wav`)
