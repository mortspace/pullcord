import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BubbleKey } from '../BubbleKey.tsx'
import { PullCord } from '../PullCord.tsx'
import '../pullcord.css'

const NAMES = ['bubblegum', 'sky', 'lemon', 'mint', 'ice']

function Demo() {
  const [dark, setDark] = useState(false)
  const [cap, setCap] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  return (
    <>
      <PullCord onPull={() => setDark((d) => !d)} pulled={!dark} ariaLabel="Toggle dark mode" />
      <main>
        <section className="hero">
          <BubbleKey size={340} onPress={setCap} />
          <p className="hint">
            press it · click, tap or Space · <b>{NAMES[cap]}</b>
          </p>
        </section>
        <section className="row">
          <figure>
            <BubbleKey size={190} legend="A" caps={['#7cc4ff', '#ff8fc8', '#ffd45e']} autoPlay={2100} />
            <figcaption>legend="A"</figcaption>
          </figure>
          <figure>
            <BubbleKey size={190} housing="#f4efe9" stem="#9b8cff" caps={['#ffb36b', '#ff8fc8', '#7ee6b8']} autoPlay={1900} />
            <figcaption>milky housing</figcaption>
          </figure>
          <figure>
            <BubbleKey
              size={190}
              autoPlay={false}
              caps={[
                { color: '#e8f3ff', clear: true },
                { color: '#ffd9f1', clear: true },
                { color: '#dcfff0', clear: true },
              ]}
            />
            <figcaption>clear caps, press me</figcaption>
          </figure>
        </section>
        <p className="hint">pull the cord for dark mode</p>
      </main>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)

// reload when a source file changes (esbuild --watch --serve)
new EventSource('/esbuild').addEventListener('change', () => location.reload())
