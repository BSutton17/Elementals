import { useEffect, useRef } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Google's script attaches itself to `window.google`. TypeScript doesn't know
// it exists, so we tell it. `any` is acceptable here: this is a third-party
// global we don't control the types for.
declare global {
  interface Window {
    google?: any
  }
}

/**
 * Draws Google's official sign-in button and hands the resulting ID token
 * to `onToken`. The token is Google's signed note about who this person is —
 * it is NOT proof of anything until our server verifies it.
 */
export function GoogleSignInButton({
  onToken,
}: {
  onToken: (idToken: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set - sign-in is disabled')
      return
    }

    // The script tag is `async`, so `window.google` may not exist yet on the
    // first render. Poll briefly until it does, then stop.
    let cancelled = false
    const timer = window.setInterval(() => {
      if (cancelled || !window.google || !container.current) return
      window.clearInterval(timer)

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: { credential: string }) => {
          // `credential` IS the ID token. Nothing else here matters.
          onToken(response.credential)
        },
      })

      window.google.accounts.id.renderButton(container.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      })
    }, 100)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [onToken])

  return <div ref={container} />
}
