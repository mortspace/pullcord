import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  CAP_REST,
  CAP_TOP_PATH,
  FACE_TURN,
  GRAD_STOPS,
  TRAVEL,
  buildSwitch,
  capFrame,
  floorEllipse,
  inkOf,
  liftPx,
  makeRamp,
  project,
  rrect,
  shadeAt,
  stemFaces,
  stemTop,
  type Grad,
  type Ramp,
} from './bubbleKeyScene.ts'

/*
 * BubbleKey: a squishy gummy keycap on a chunky toy switch, drawn in plain SVG.
 *
 * The shapes are real 3D (see bubbleKeyScene.ts) but the output is flat SVG
 * paths and gradients, rewritten each frame through refs. Press it (pointer,
 * Space / Enter) and the cap squashes onto the switch, swaps to the next
 * colour right as it bottoms out, puffs a few bubbles and pops back up with a
 * jelly wobble. With autoPlay it presses itself on a loop.
 *
 * Everything is springs: travel, squash and the two tilt axes, stepped at a
 * fixed 240Hz inside one rAF loop so the feel is the same at any refresh rate.
 * The loop sleeps when nothing moves (autoPlay and float off) and while the
 * key is scrolled out of view.
 */

export interface BubbleKeyCap {
  /** Cap colour, hex. */
  color: string
  /** See-through "ice" jelly instead of solid gummy. */
  clear?: boolean
}

export interface BubbleKeyProps {
  /** Caps cycled through, one per press. Hex strings or { color, clear }. */
  caps?: (string | BubbleKeyCap)[]
  /** Press itself on a loop: true = every 1600ms, or pass the interval in ms. */
  autoPlay?: boolean | number
  /** Gentle idle bob. */
  float?: boolean
  /** The little face on the cap. */
  face?: boolean
  /** Short text printed on the cap instead of the face (1-2 characters look best). */
  legend?: string
  /** Housing colour, hex. */
  housing?: string
  /** Stem colour, hex. */
  stem?: string
  /** Rendered width in px; the height follows. */
  size?: number
  /** Fired each time a press bottoms out, with the index of the new cap. */
  onPress?: (cap: number) => void
  /** Accessible name for the button. */
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

export const BUBBLE_KEY_CAPS: BubbleKeyCap[] = [
  { color: '#ff8fc8' }, // bubblegum
  { color: '#7cc4ff' }, // sky
  { color: '#ffd45e' }, // lemon
  { color: '#7ee6b8' }, // mint
  { color: '#e8f3ff', clear: true }, // ice
]

// viewBox, sized for the highest pop, the bubbles and the floor shadow
const VB = { x: -165, y: -212, w: 330, h: 368 }
const FLOOR = -12.5
const BUBBLES = 8
const AUTO_MS = 1600
/** fill opacity of a clear cap: walls you can see the stem through, a frostier top */
const ICE = { body: 0.62, band: 0.66, top: 0.82 }

type Spring = { x: number; v: number }
type Bubble = { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; age: number; life: number }

function spring(s: Spring, target: number, freq: number, zeta: number, h: number) {
  const w = 2 * Math.PI * freq
  s.v += (-w * w * (s.x - target) - 2 * zeta * w * s.v) * h
  s.x += s.v * h
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduce(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduce
}

// Skips DOM writes that would not change anything: a lot of attributes hold
// still for many frames (gradients only drift, the face rarely changes).
function makeWriter() {
  let written = new WeakMap<Element, Map<string, string>>()
  const put = (el: Element | null | undefined, name: string, value: string) => {
    if (!el) return
    let m = written.get(el)
    if (!m) written.set(el, (m = new Map()))
    if (m.get(name) === value) return
    m.set(name, value)
    el.setAttribute(name, value)
  }
  const grad = (el: SVGLinearGradientElement | null, stops: (SVGStopElement | null)[], g: Grad) => {
    put(el, 'x1', g.x1.toFixed(1))
    put(el, 'y1', g.y1.toFixed(1))
    put(el, 'x2', g.x2.toFixed(1))
    put(el, 'y2', g.y2.toFixed(1))
    g.stops.forEach((c, i) => put(stops[i], 'stop-color', c))
  }
  // React may have rewritten attributes behind our back (new props)
  const reset = () => {
    written = new WeakMap()
  }
  return { put, grad, reset }
}

interface Material {
  ramp: Ramp
  ink: string
  clear: boolean
}

export function BubbleKey({
  caps = BUBBLE_KEY_CAPS,
  autoPlay = true,
  float = true,
  face = true,
  legend,
  housing = '#4a4560',
  stem = '#ff7f9c',
  size = 240,
  onPress,
  ariaLabel = 'Press the key',
  className,
  style,
}: BubbleKeyProps) {
  const reduce = usePrefersReducedMotion()
  const id = 'bk' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const url = (name: string) => `url(#${id}-${name})`

  const capsKey = JSON.stringify(caps)
  const materials = useMemo<Material[]>(() => {
    const list = (JSON.parse(capsKey) as (string | BubbleKeyCap)[]).map((c) => (typeof c === 'string' ? { color: c } : c))
    if (!list.length) list.push(BUBBLE_KEY_CAPS[0])
    return list.map(({ color, clear = false }) => ({
      ramp: clear ? makeRamp(color, 0.42, 0.55, [3, 0.9]) : makeRamp(color),
      ink: clear ? '#4b5870' : inkOf(color),
      clear,
    }))
  }, [capsKey])

  const housingRamp = useMemo(() => makeRamp(housing, 0.34, 0.55, [1, 0.9]), [housing])
  const stemRamp = useMemo(() => makeRamp(stem), [stem])
  const parts = useMemo(() => buildSwitch(housingRamp, makeRamp('#f2c14e', 0.5, 0.55, [1.1, 0.6])), [housingRamp])
  // the cap at rest, so the first paint (and SSR) already shows a finished key
  const rest = useMemo(() => capFrame({ y: CAP_REST, squash: 0, tiltX: 0, tiltZ: 0 }, materials[0].ramp), [materials])
  const restStem = useMemo(() => stemFaces(stemTop(0), stemRamp), [stemRamp])
  const ground = floorEllipse(FLOOR, 8.2)

  const cfg = useRef({ materials, stemRamp, autoMs: 0, float, reduce, onPress })
  cfg.current = {
    materials,
    stemRamp,
    autoMs: autoPlay === false ? 0 : autoPlay === true ? AUTO_MS : Math.max(400, autoPlay),
    float,
    reduce,
    onPress,
  }

  const svgRef = useRef<SVGSVGElement>(null)
  const liftRef = useRef<SVGGElement>(null)
  const groundRef = useRef<SVGEllipseElement>(null)
  const stemRefs = useRef<(SVGPathElement | null)[]>([])
  const shadowRef = useRef<SVGGElement>(null)
  const topFaceRef = useRef<SVGPathElement>(null)
  const bodyRef = useRef<SVGPathElement>(null)
  const clipRef = useRef<SVGPathElement>(null)
  const bandRef = useRef<SVGPathElement>(null)
  const rimRef = useRef<SVGPathElement>(null)
  const topRef = useRef<SVGGElement>(null)
  const streakRef = useRef<SVGPathElement>(null)
  const streakGradRef = useRef<SVGLinearGradientElement>(null)
  const wallGradRef = useRef<SVGLinearGradientElement>(null)
  const bandGradRef = useRef<SVGLinearGradientElement>(null)
  const wallStops = useRef<(SVGStopElement | null)[]>([])
  const bandStops = useRef<(SVGStopElement | null)[]>([])
  const topStops = useRef<(SVGStopElement | null)[]>([])
  const bubbleStops = useRef<(SVGStopElement | null)[]>([])
  const tintStops = useRef<(SVGStopElement | null)[]>([])
  const inkRef = useRef<SVGGElement>(null)
  const faceRefs = useRef<Record<string, SVGElement | null>>({})
  const bubbleRefs = useRef<(SVGGElement | null)[]>([])

  const api = useRef({ press: () => {}, release: () => {}, sync: () => {} })

  useEffect(() => {
    const { put, grad: putGrad, reset } = makeWriter()
    const sim = {
      t: 0,
      travel: { x: 0, v: 0 },
      squash: { x: 0, v: 0 },
      tiltX: { x: 0, v: 0 },
      tiltZ: { x: 0, v: 0 },
      dip: { x: 0, v: 0 },
      held: false,
      /** let go as soon as the press has bottomed out (+ a short hold) */
      wantUp: false,
      holdFor: 0,
      auto: false,
      bottomed: false,
      bottomAt: 0,
      autoAt: 0.9,
      userAt: -99,
      happyUntil: 0,
      blinkAt: 2.2,
      blinkUntil: 0,
      cap: 0,
      shown: -1,
      bubbles: [] as Bubble[],
    }
    let raf = 0
    let running = false
    let visible = true
    let prev = 0

    const emit = () => {
      // puff from the front half of the rim so none of them pop out of the cap's back
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.31 + (Math.random() - 0.5) * Math.PI * 1.25
        const out = 5 + Math.random() * 6
        sim.bubbles.push({
          x: Math.cos(a) * 9.4,
          y: CAP_REST - TRAVEL + 0.9,
          z: Math.sin(a) * 9.4,
          vx: Math.cos(a) * out,
          vy: 9 + Math.random() * 8,
          vz: Math.sin(a) * out,
          r: 0.35 + Math.random() * 0.6,
          age: 0,
          life: 0.4 + Math.random() * 0.35,
        })
      }
      if (sim.bubbles.length > BUBBLES) sim.bubbles.splice(0, sim.bubbles.length - BUBBLES)
    }

    const bottomOut = (v: number) => {
      const { materials, onPress } = cfg.current
      sim.bottomed = true
      sim.bottomAt = sim.t
      const hit = Math.min(1, v / 45)
      sim.squash.v += 2.2 + 3.4 * hit
      sim.tiltX.v += (Math.random() - 0.5) * (0.8 + 1.6 * hit)
      sim.tiltZ.v += (Math.random() - 0.5) * (0.8 + 1.6 * hit)
      sim.dip.v -= 4 + 7 * hit
      sim.cap = (sim.cap + 1) % materials.length
      emit()
      onPress?.(sim.cap)
    }

    // A tap can let go before the cap reaches the bottom; like a real key it
    // still clicks: the release waits for the bottom-out, then a short hold.
    const letGo = (hold: number) => {
      sim.wantUp = true
      sim.holdFor = hold
    }

    const release = () => {
      if (!sim.held) return
      sim.held = false
      sim.wantUp = false
      if (sim.auto) {
        sim.auto = false
        sim.autoAt = sim.t + cfg.current.autoMs / 1000
      }
      if (sim.bottomed) {
        sim.bottomed = false
        sim.squash.v -= 3.2 // stretch as it springs back up
        sim.tiltX.v += (Math.random() - 0.5) * 0.9
        sim.happyUntil = sim.t + 0.6
      }
    }

    const step = (dt: number) => {
      const { autoMs, float, reduce } = cfg.current
      sim.t += dt
      if (autoMs && !reduce) {
        // a person pressing takes over from the loop for a moment
        if (!sim.held && sim.t >= sim.autoAt && sim.t - sim.userAt > 2.4) {
          sim.held = true
          sim.auto = true
          letGo(0.1)
        }
      }
      const sway = float && !reduce ? 1 : 0
      const n = Math.max(1, Math.ceil(dt * 240))
      const h = dt / n
      for (let i = 0; i < n; i++) {
        const tr = sim.travel
        // aim past the bottom so the cap arrives with speed and bottoms out
        if (sim.held) spring(tr, TRAVEL + 1.4, 5.2, 1, h)
        else spring(tr, 0, 4.2, 0.32, h)
        if (tr.x >= TRAVEL) {
          if (sim.held && !sim.bottomed) bottomOut(tr.v)
          tr.x = TRAVEL
          if (tr.v > 0) tr.v = 0
        }
        spring(sim.squash, 0, 4.8, 0.2, h)
        spring(sim.tiltX, sway * 0.035 * Math.sin(sim.t * 1.6), 2.4, 0.15, h)
        spring(sim.tiltZ, sway * 0.04 * Math.sin(sim.t * 2.05 + 1), 2.1, 0.15, h)
        spring(sim.dip, 0, 3.2, 0.34, h)
      }
      if (sim.held && sim.wantUp && sim.bottomed && sim.t - sim.bottomAt >= sim.holdFor) release()
      for (const b of sim.bubbles) {
        b.age += dt / b.life
        const drag = Math.exp(-2.4 * dt)
        b.vx *= drag
        b.vz *= drag
        b.vy = b.vy * drag + 8 * dt // they float
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.z += b.vz * dt
      }
      sim.bubbles = sim.bubbles.filter((b) => b.age < 1)
      if (sim.t > sim.blinkAt) {
        sim.blinkUntil = sim.t + 0.13
        sim.blinkAt = sim.t + 2.4 + Math.random() * 3
      }
    }

    const render = () => {
      const { materials, stemRamp, float, reduce } = cfg.current
      const mat = materials[sim.cap % materials.length]
      const bob = float && !reduce ? Math.sin(sim.t * 2.2) : 0
      const lift = 0.5 * bob + sim.dip.x
      const capBob = float && !reduce ? 0.22 * Math.sin(sim.t * 2.2 - 0.9) : 0
      const travel = sim.travel.x

      put(liftRef.current, 'transform', `translate(0 ${liftPx(lift).toFixed(2)})`)
      const gs = 1 - lift * 0.035
      put(groundRef.current, 'transform', `translate(${ground.cx} ${ground.cy}) scale(${gs.toFixed(3)})`)
      put(groundRef.current, 'opacity', Math.min(1, Math.max(0.25, 0.8 - lift * 0.08)).toFixed(2))

      const stems = stemFaces(stemTop(travel) + capBob, stemRamp)
      stemRefs.current.forEach((el, i) => {
        put(el, 'd', stems[i]?.d ?? '')
        put(el, 'fill', stems[i]?.fill ?? 'none')
      })

      const f = capFrame(
        { y: CAP_REST - travel + capBob, squash: sim.squash.x, tiltX: sim.tiltX.x, tiltZ: sim.tiltZ.x },
        mat.ramp,
      )
      put(bodyRef.current, 'd', f.body)
      put(clipRef.current, 'd', f.body)
      put(bandRef.current, 'd', f.band)
      putGrad(wallGradRef.current, wallStops.current, f.wall)
      putGrad(bandGradRef.current, bandStops.current, f.bandGrad)
      put(topRef.current, 'transform', f.top)
      const k = f.topK
      put(topStops.current[0], 'stop-color', shadeAt(mat.ramp, k + 0.1))
      put(topStops.current[1], 'stop-color', shadeAt(mat.ramp, k))
      put(topStops.current[2], 'stop-color', shadeAt(mat.ramp, k - 0.16))
      put(rimRef.current, 'd', f.rim)
      put(streakRef.current, 'd', f.streak)
      put(streakRef.current, 'opacity', f.streakAlpha.toFixed(2))
      const [sx1, sy1, sx2, sy2] = f.streakAxis
      put(streakGradRef.current, 'x1', sx1.toFixed(1))
      put(streakGradRef.current, 'y1', sy1.toFixed(1))
      put(streakGradRef.current, 'x2', sx2.toFixed(1))
      put(streakGradRef.current, 'y2', sy2.toFixed(1))
      put(shadowRef.current, 'transform', f.shadow)
      put(shadowRef.current, 'opacity', f.shadowAlpha.toFixed(3))

      if (sim.shown !== sim.cap) {
        sim.shown = sim.cap
        // ice: see-through walls, a frostier (thicker) top, a thin glassy edge
        put(bodyRef.current, 'fill-opacity', mat.clear ? String(ICE.body) : '1')
        put(bandRef.current, 'fill-opacity', mat.clear ? String(ICE.band) : '1')
        put(topFaceRef.current, 'fill-opacity', mat.clear ? String(ICE.top) : '1')
        put(bodyRef.current, 'stroke', mat.clear ? shadeAt(mat.ramp, 0.15) : 'none')
        put(rimRef.current, 'stroke', shadeAt(mat.ramp, 1))
        put(inkRef.current, 'color', mat.ink)
        put(bubbleStops.current[1], 'stop-color', shadeAt(mat.ramp, 0.85))
        put(bubbleStops.current[2], 'stop-color', shadeAt(mat.ramp, 0.55))
        tintStops.current.forEach((el) => put(el, 'stop-color', shadeAt(mat.ramp, 0.7)))
      }

      // expressions: squint while squashed, beam on the way back up, blink now and then
      const squish = travel > TRAVEL * 0.6 || sim.squash.x > 0.1
      const happy = !squish && sim.t < sim.happyUntil
      const blink = !squish && !happy && sim.t < sim.blinkUntil
      const fr = faceRefs.current
      const show = (key: string, on: boolean) => put(fr[key], 'display', on ? 'inline' : 'none')
      show('eyes', !squish && !happy && !blink)
      show('blink', blink)
      show('squint', squish)
      show('beam', happy)
      show('smile', !squish && !happy)
      show('oh', squish)
      show('grin', happy)

      bubbleRefs.current.forEach((el, i) => {
        const b = sim.bubbles[i]
        if (!b) return put(el, 'display', 'none')
        const scr = project([b.x, b.y, b.z])
        const grow = 1 + b.age * 0.35 + (b.age > 0.85 ? (b.age - 0.85) * 3 : 0)
        const alpha = b.age < 0.12 ? b.age / 0.12 : b.age > 0.85 ? Math.max(0, 1 - (b.age - 0.85) / 0.15) : 1
        put(el, 'display', 'inline')
        put(el, 'transform', `translate(${scr[0].toFixed(1)} ${scr[1].toFixed(1)}) scale(${(b.r * 10 * grow).toFixed(2)})`)
        put(el, 'opacity', alpha.toFixed(2))
      })
    }

    const frame = (now: number) => {
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 1 / 60
      prev = now
      step(dt)
      render()
      const { autoMs, float, reduce } = cfg.current
      const busy =
        sim.held ||
        sim.bubbles.length > 0 ||
        Math.abs(sim.travel.x) + Math.abs(sim.travel.v) > 0.002 ||
        Math.abs(sim.squash.x) + Math.abs(sim.squash.v) > 0.002 ||
        Math.abs(sim.dip.x) + Math.abs(sim.dip.v) > 0.002 ||
        Math.abs(sim.tiltX.v) + Math.abs(sim.tiltZ.v) > 0.002
      const alive = !reduce && (float || autoMs > 0 || sim.t < sim.happyUntil)
      if (!visible || !(busy || alive)) {
        running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (running || !visible) return
      running = true
      prev = 0
      raf = requestAnimationFrame(frame)
    }

    api.current = {
      press: () => {
        sim.userAt = sim.t
        if (cfg.current.reduce) {
          // no motion: just the colour change
          sim.cap = (sim.cap + 1) % cfg.current.materials.length
          cfg.current.onPress?.(sim.cap)
          render()
          return
        }
        sim.auto = false
        sim.held = true
        sim.wantUp = false
        wake()
      },
      release: () => {
        if (sim.held) letGo(0.06)
        wake()
      },
      sync: () => {
        reset()
        sim.cap %= cfg.current.materials.length
        sim.shown = -1
        render()
        wake()
      },
    }

    let io: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined' && svgRef.current) {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible) wake()
      })
      io.observe(svgRef.current)
    }

    render()
    wake()
    return () => {
      cancelAnimationFrame(raf)
      io?.disconnect()
    }
  }, [])

  // new props: repaint (materials may have changed) and wake a sleeping loop
  useEffect(() => {
    api.current.sync()
  }, [autoPlay, float, capsKey, reduce, stem, housing, face, legend])

  const lastKey = useRef(0)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (e.repeat) return
    lastKey.current = performance.now()
    api.current.press()
  }
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    api.current.release()
  }
  // clicks that don't come from a pointer or the keys above (e.g. assistive tech)
  const onClick = (e: React.MouseEvent) => {
    if (e.detail !== 0 || performance.now() - lastKey.current < 600) return
    api.current.press()
    window.setTimeout(() => api.current.release(), 120)
  }

  const m0 = materials[0]
  const wide = { strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', stroke: 'currentColor' } as const

  return (
    <button
      type="button"
      className={className ? `bubblekey ${className}` : 'bubblekey'}
      aria-label={ariaLabel}
      title={ariaLabel}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture?.(e.pointerId)
        api.current.press()
      }}
      onPointerUp={() => api.current.release()}
      onPointerCancel={() => api.current.release()}
      onLostPointerCapture={() => api.current.release()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => api.current.release()}
      onClick={onClick}
      style={{
        display: 'inline-block',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: 28,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        lineHeight: 0,
        ...style,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        width={size}
        height={(size * VB.h) / VB.w}
        aria-hidden="true"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`${id}-wall`} ref={wallGradRef} gradientUnits="userSpaceOnUse" {...xy(rest.wall)}>
            {rest.wall.stops.map((c, i) => (
              <stop key={i} ref={(el) => void (wallStops.current[i] = el)} offset={i / (GRAD_STOPS - 1)} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id={`${id}-band`} ref={bandGradRef} gradientUnits="userSpaceOnUse" {...xy(rest.bandGrad)}>
            {rest.bandGrad.stops.map((c, i) => (
              <stop key={i} ref={(el) => void (bandStops.current[i] = el)} offset={i / (GRAD_STOPS - 1)} stopColor={c} />
            ))}
          </linearGradient>
          <radialGradient id={`${id}-top`} cx="0.4" cy="0.36" r="0.75">
            {[0.1, 0, -0.16].map((d, i) => (
              <stop
                key={i}
                ref={(el) => void (topStops.current[i] = el)}
                offset={[0, 0.6, 1][i]}
                stopColor={shadeAt(m0.ramp, rest.topK + d)}
              />
            ))}
          </radialGradient>
          <radialGradient id={`${id}-spec`}>
            <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`${id}-streak`}
            ref={streakGradRef}
            gradientUnits="userSpaceOnUse"
            x1={rest.streakAxis[0]}
            y1={rest.streakAxis[1]}
            x2={rest.streakAxis[2]}
            y2={rest.streakAxis[3]}
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop offset="0.35" stopColor="#140f1e" stopOpacity="0.9" />
            <stop offset="1" stopColor="#140f1e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-tint`}>
            <stop ref={(el) => void (tintStops.current[0] = el)} offset="0" stopColor={shadeAt(m0.ramp, 0.7)} stopOpacity="0.5" />
            <stop ref={(el) => void (tintStops.current[1] = el)} offset="1" stopColor={shadeAt(m0.ramp, 0.7)} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-ground`}>
            <stop offset="0" stopColor="#1d1830" stopOpacity="0.28" />
            <stop offset="1" stopColor="#1d1830" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-bubble`} cx="0.36" cy="0.34" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop ref={(el) => void (bubbleStops.current[1] = el)} offset="0.55" stopColor={shadeAt(m0.ramp, 0.85)} stopOpacity="0.45" />
            <stop ref={(el) => void (bubbleStops.current[2] = el)} offset="1" stopColor={shadeAt(m0.ramp, 0.55)} stopOpacity="0.8" />
          </radialGradient>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <filter id={`${id}-blur`} x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={`${id}-glow`} x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id={`${id}-cap`}>
            <path ref={clipRef} d={rest.body} />
          </clipPath>
          <clipPath id={`${id}-well`}>
            <path d={parts.topClip} />
          </clipPath>
          {parts.shapes.map((s, i) =>
            s.grad ? (
              <linearGradient key={i} id={`${id}-h${i}`} gradientUnits="userSpaceOnUse" {...xy(s.grad)}>
                {s.grad.stops.map((c, j) => (
                  <stop key={j} offset={j / (GRAD_STOPS - 1)} stopColor={c} />
                ))}
              </linearGradient>
            ) : null,
          )}
        </defs>

        <ellipse
          ref={groundRef}
          cx={0}
          cy={0}
          rx={ground.rx}
          ry={ground.ry}
          transform={`translate(${ground.cx} ${ground.cy})`}
          fill={url('ground')}
        />

        <g ref={liftRef}>
          {parts.shapes.map((s, i) => (
            <path
              key={i}
              d={s.d}
              fill={s.grad ? url(`h${i}`) : s.fill}
              opacity={s.opacity}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth}
              transform={s.transform}
            />
          ))}

          {Array.from({ length: 15 }, (_, i) => (
            <path
              key={i}
              ref={(el) => void (stemRefs.current[i] = el)}
              d={restStem[i]?.d ?? ''}
              fill={restStem[i]?.fill ?? 'none'}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.4}
              strokeLinejoin="round"
            />
          ))}

          <g clipPath={url('well')}>
            <g ref={shadowRef} transform={rest.shadow} opacity={rest.shadowAlpha}>
              <path d={rrect(9.4, 9.4, 4.8)} fill={url('shadow')} />
              {/* light through the jelly tints the housing under it */}
              <path d={rrect(7.2, 7.2, 3.6)} fill={url('tint')} />
            </g>
          </g>

          <g>
            <path
              ref={bodyRef}
              d={rest.body}
              fill={url('wall')}
              fillOpacity={m0.clear ? ICE.body : 1}
              stroke={m0.clear ? shadeAt(m0.ramp, 0.15) : 'none'}
              strokeOpacity={0.45}
              strokeWidth={1.2}
            />
            <g clipPath={url('cap')}>
              <path
                ref={rimRef}
                d={rest.rim}
                fill="none"
                stroke={shadeAt(m0.ramp, 1)}
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.55}
                filter={url('glow')}
              />
              <path ref={bandRef} d={rest.band} fill={url('band')} fillOpacity={m0.clear ? ICE.band : 1} filter={url('soft')} />
              <g ref={topRef} transform={rest.top}>
                <path ref={topFaceRef} d={CAP_TOP_PATH} fill={url('top')} fillOpacity={m0.clear ? ICE.top : 1} />
                <ellipse cx={-1.9} cy={-2.3} rx={2.6} ry={1.25} transform="rotate(-38 -1.9 -2.3)" fill={url('spec')} />
                <circle cx={-3.55} cy={-0.9} r={0.34} fill="#fff" opacity={0.8} />
                <g ref={inkRef} transform={`rotate(${FACE_TURN}) scale(1.22)`} color={m0.ink}>
                  {legend ? (
                    <text
                      x={0}
                      y={1.35}
                      textAnchor="middle"
                      fontSize={legend.length > 1 ? 3.4 : 4.4}
                      fontWeight={800}
                      fontFamily='ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif'
                      fill="currentColor"
                    >
                      {legend}
                    </text>
                  ) : face ? (
                    <>
                      <g fill="#ff6f9f" opacity={0.42}>
                        <ellipse cx={-2.85} cy={0.62} rx={0.9} ry={0.52} />
                        <ellipse cx={2.85} cy={0.62} rx={0.9} ry={0.52} />
                      </g>
                      <g ref={(el) => void (faceRefs.current.eyes = el)} fill="currentColor">
                        <ellipse cx={-1.65} cy={-0.35} rx={0.55} ry={0.7} />
                        <ellipse cx={1.65} cy={-0.35} rx={0.55} ry={0.7} />
                        <circle cx={-1.47} cy={-0.62} r={0.18} fill="#fff" />
                        <circle cx={1.83} cy={-0.62} r={0.18} fill="#fff" />
                      </g>
                      <path
                        ref={(el) => void (faceRefs.current.blink = el)}
                        d="M-2.15 -0.3Q-1.65 0.1 -1.15 -0.3M1.15 -0.3Q1.65 0.1 2.15 -0.3"
                        strokeWidth={0.36}
                        display="none"
                        {...wide}
                      />
                      <path
                        ref={(el) => void (faceRefs.current.squint = el)}
                        d="M-2.25 -1L-1.25 -0.38L-2.25 0.24M2.25 -1L1.25 -0.38L2.25 0.24"
                        strokeWidth={0.38}
                        display="none"
                        {...wide}
                      />
                      <path
                        ref={(el) => void (faceRefs.current.beam = el)}
                        d="M-2.2 -0.12Q-1.65 -1.1 -1.1 -0.12M1.1 -0.12Q1.65 -1.1 2.2 -0.12"
                        strokeWidth={0.38}
                        display="none"
                        {...wide}
                      />
                      <path
                        ref={(el) => void (faceRefs.current.smile = el)}
                        d="M-0.62 0.55Q0 1.15 0.62 0.55"
                        strokeWidth={0.32}
                        {...wide}
                      />
                      <ellipse
                        ref={(el) => void (faceRefs.current.oh = el)}
                        cx={0}
                        cy={0.78}
                        rx={0.42}
                        ry={0.36}
                        fill="currentColor"
                        display="none"
                      />
                      <path
                        ref={(el) => void (faceRefs.current.grin = el)}
                        d="M-0.8 0.42Q0 1.65 0.8 0.42Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth={0.2}
                        strokeLinejoin="round"
                        display="none"
                      />
                    </>
                  ) : null}
                </g>
              </g>
            </g>
            <path
              ref={streakRef}
              d={rest.streak}
              fill="none"
              stroke={url('streak')}
              strokeWidth={9}
              strokeLinecap="round"
              opacity={rest.streakAlpha}
              filter={url('blur')}
            />
          </g>

          {Array.from({ length: BUBBLES }, (_, i) => (
            <g key={i} ref={(el) => void (bubbleRefs.current[i] = el)} display="none">
              <circle r={1} fill={url('bubble')} />
              <circle r={1} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.08} />
              <circle cx={-0.34} cy={-0.36} r={0.22} fill="#fff" />
            </g>
          ))}
        </g>
      </svg>
    </button>
  )
}

const xy = (g: Grad) => ({ x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 })
