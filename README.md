# pullcord

A ceiling pull-cord for React. The rope is a real verlet sim (nodes + distance constraints), so it hangs under gravity, swings when you grab it and settles back on its own. I use it as a theme switch.

<video src="https://github.com/user-attachments/assets/0c32d673-88a7-49b2-8dad-ab36fa256f9e" controls muted loop width="420"></video>

Everything runs in a single requestAnimationFrame loop that writes the DOM through refs, and the loop goes to sleep once the rope stops moving. So an idle cord costs basically nothing.

Try it live: https://feralui.vercel.app/#/pullcord

Rest of the FeralUI stuff: https://github.com/mortspace/feralui

## install

```bash
npm install pullcord
```

## usage

```tsx
import { PullCord } from 'pullcord'
import 'pullcord/pullcord.css'

function App() {
  const [dark, setDark] = useState(true)

  return (
    <PullCord
      onPull={() => setDark(d => !d)}
      pulled={!dark}
      ariaLabel="Toggle theme"
    />
  )
}
```

Mount it anywhere, it fixes itself to the top of the viewport. `onPull` fires when the pull crosses the detent depth, like a real pull-chain it clicks mid-pull, not on release. Click and Enter work too so it's fine with a keyboard.

Props: `onPull`, `pulled` (mirrored to aria-pressed), `ariaLabel`, `noEntrance` (skip the drop-in), `config` (physics overrides), `className`.

## the feel

All the physics knobs sit on the `config` prop and get read fresh every frame, so you can change them live:

```tsx
<PullCord
  config={{
    gravity: 1250,   // hang tension / fall speed
    damping: 0.94,   // higher = snappier retract
    iterations: 20,  // rope stiffness
    stretchMax: 26,  // how deep you can pull
  }}
/>
```

The full list (actuation depth, velocity cap, sleep threshold...) is in [config.ts](config.ts), every field has a comment.

## where it hangs

CSS vars on any ancestor:

```css
:root {
  --pullcord-top: 0px;
  --pullcord-right: 7rem;
  --pullcord-z: 5;
  --pullcord-ink: rgba(255, 255, 255, 0.24);
}
```

Respects prefers-reduced-motion.

## bubblekey

Also in here: a squishy gummy keycap on a little toy switch. Same idea as the cord, all plain SVG and one rAF loop, but the shapes are tiny 3D models (rounded-rect rings through an orthographic camera) so it tilts and squashes like a real thing. Press it and the cap squishes down, swaps to the next colour right as it bottoms out, puffs some bubbles and pops back up with a wobble. It has a face. It squints when you press it.

```tsx
import { BubbleKey } from 'pullcord'

<BubbleKey onPress={(cap) => console.log('now on cap', cap)} />
```

No stylesheet needed. Pointer, Space and Enter all press it (hold to keep it down), and it's a real `<button>`.

```tsx
<BubbleKey
  caps={['#ff8fc8', '#7cc4ff', { color: '#e8f3ff', clear: true }]} // cycled per press, clear = ice
  autoPlay={1600}      // presses itself every 1.6s (false to stop), pauses while someone is pressing
  legend="A"           // print a letter instead of the face
  housing="#f4efe9"    // milky switch
  size={320}
/>
```

Props: `caps`, `autoPlay`, `float` (idle bob), `face`, `legend`, `housing`, `stem`, `size` (width in px), `onPress`, `ariaLabel`, `className`, `style`. Colours are hex. With prefers-reduced-motion it holds still and just changes colour, and the loop sleeps while it's off screen.

MIT.
