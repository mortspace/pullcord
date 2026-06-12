# pullcord

A ceiling pull-cord for React. The rope is a real verlet sim (nodes + distance constraints), so it hangs under gravity, swings when you grab it and settles back on its own. I use it as a theme switch.

Everything runs in a single requestAnimationFrame loop that writes the DOM through refs, and the loop goes to sleep once the rope stops moving. So an idle cord costs basically nothing.

Live demo + the rest of the FeralUI stuff: https://github.com/mortspace/feralui

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

Respects prefers-reduced-motion. MIT.
