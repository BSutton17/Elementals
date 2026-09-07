import { useState } from 'react'
import {
  getDisplaySettings,
  setDisplaySettings,
  type SyncRate,
} from '../game/displaySettings'
import { socket } from '../sockets/socket'
import { sendSyncRate } from '../sockets/session'
import './DeviceSettings.css'

/**
 * Two settings for people whose phone gets hot.
 *
 * ⚠️ THIS DEVICE, NOT THIS ACCOUNT. Both answer "what can the thing in my hand
 * cope with", which is a property of the hardware. The same player on a laptop
 * and on an old phone wants different answers, so these live in local storage
 * and never follow anyone to another device.
 *
 * ⚠️ AND NEITHER CHANGES THE MATCH. The simulation runs on the server at a
 * fixed rate for everyone; these change how much this client DRAWS and how
 * often it is TOLD. Nobody else's game moves, and no rule changes.
 */
export function DeviceSettings() {
  const [settings, setSettings] = useState(getDisplaySettings)

  const setSaver = (on: boolean) => setSettings(setDisplaySettings({ batterySaver: on }))

  const setRate = (rate: SyncRate) => {
    setSettings(setDisplaySettings({ syncRate: rate }))
    // Told to the server now rather than at the next connect, so the change is
    // felt in the match currently being played.
    if (socket.connected) void sendSyncRate(socket)
  }

  return (
    <section className="device-settings" aria-labelledby="device-settings-title">
      <h3 className="device-settings__title" id="device-settings-title">
        This device
      </h3>
      <p className="device-settings__lead">
        Kept on this device only — not on your account.
      </p>

      <label className="device-settings__row">
        <input
          type="checkbox"
          checked={settings.batterySaver}
          onChange={(e) => setSaver(e.target.checked)}
          data-testid="setting-battery-saver"
        />
        <span>
          <span className="device-settings__name">Battery saver</span>
          <span className="device-settings__desc">
            Turns off glass, glows and idle animation, and redraws the
            battlefield less often. Everything still shows — it just looks
            flatter.
          </span>
        </span>
      </label>

      <fieldset className="device-settings__group">
        <legend className="device-settings__name">Update rate</legend>
        <p className="device-settings__desc">
          How often the server sends this device the state of the match.
        </p>
        {(
          [
            ['normal', 'Normal', 'Ten updates a second.'],
            [
              'reduced',
              'Reduced',
              'Half as many. Easier on the battery, and the board can be up to a ' +
                'fifth of a second behind — minigames always run at full speed.',
            ],
          ] as const
        ).map(([value, label, note]) => (
          <label className="device-settings__row" key={value}>
            <input
              type="radio"
              name="sync-rate"
              value={value}
              checked={settings.syncRate === value}
              onChange={() => setRate(value)}
              data-testid={`setting-rate-${value}`}
            />
            <span>
              <span className="device-settings__name">{label}</span>
              <span className="device-settings__desc">{note}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
