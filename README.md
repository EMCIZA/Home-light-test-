# 💡 Glow – bedroom Hue lights, the fun way

A Home Assistant setup for **2 bedside lamps + 2 downlights**, plus a phone app hosted
free on GitHub Pages. You add it to your home screen, so no App Store and no subscription.

| Folder | What it is |
|---|---|
| `home-assistant/packages/bedroom_lights.yaml` | Scenes, bedtime, night mode, daylight lock, wake-up light, everything in Home Assistant |
| `app/` | The **Glow** phone app (plain HTML/JS, no build step) |
| `.github/workflows/pages.yml` | Publishes the app to GitHub Pages |

## What it does

- **12 warm & colourful scenes, no cool white light**: Golden 🌟, Citrus 🍊, Read 📖, Relax 🛋️, Movie 🎬, Sunset 🌅,
  Rose 🌸, Ocean 🌊, Aurora 💚, Galaxy 🌌, Lavender 💜, Nightlight 🕯️.
  On white-only bulbs, colours fall back to warm white automatically. The app's warmth slider stops at warm white (3000K),
  and the wake-up sunrise ends on warm gold.
- **🔌 Phone on charge = bedtime**: after your bedtime, plugging your phone in fades the lights out and turns on *sleep mode*.
  Unplugging it in the morning (from 90 min before wake time) turns sleep mode off.
- **🕯️ Gentle lights at night**: after bedtime (or in sleep mode), a wall switch, Hue dimmer or the Hue app turns lights on as a soft 5% glow instead of full blast.
- **☀️ Daylight lock** (off by default): in daylight, lights switched on by switches or the Hue app go straight back off,
  and lights left on get switched off once it's properly light. The Glow app still works, and *Pause 1h* lets switches work for an hour.
- **🌅 Wake-up light** (off by default): the bedside lamps brighten slowly like a sunrise, weekdays only if you want.
- **🏃 Everyone left**: all lights off 10 minutes after the last person leaves home.
- **😴 Sleep timer**: 15 min, 30 min or 1 hour, then the lights fade out over a minute. It cancels itself if you switch the lights off first.
- **🌙 Wind-down** (off by default): from 30 minutes before bedtime, lights that are on dim a little every 5 minutes and keep their colours.
- **🌇 Sunset & welcome home** (off by default): when it gets dark, or someone gets home after dark, the lights come on to Relax. Never after bedtime.
- **Shared active scene**: the scene someone picks is highlighted on every phone running Glow.
- **Hey Siri**: in Shortcuts, make a shortcut with Home Assistant → *Perform Action* → `script.turn_on` → `script.bedroom_scene_rose` (or any scene), name it "Rose lights", and say *"Hey Siri, Rose lights"*.
- Every time, toggle and slider can be changed from the app's **Routines** tab.

## 1 · Home Assistant setup (about 5 minutes)

1. Make sure the **Philips Hue** integration is set up in Home Assistant and your 4 lights show up.
2. Install the **Home Assistant Companion app** on your phone and log in. That's what tells HA when your phone is charging.
3. Open your HA config folder (the *File editor* or *Studio Code Server* add-on is easiest) and add this to `configuration.yaml`:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
4. Create a folder `packages` next to `configuration.yaml` and copy `home-assistant/packages/bedroom_lights.yaml` into it.
5. Edit the **YOUR DEVICES** section at the top of that file:
   - the 4 light IDs (find them in *Settings → Devices & services → Entities*, search `light.`)
   - your phone's battery state sensor, e.g. `sensor.iphone_battery_state` (search `battery state`)
6. *Developer tools → YAML → Check configuration*, then **Restart**.

Default settings (bedtime 22:30, wake 07:00 and so on) are filled in on first start. Change them in the app afterwards.

### iPhone: make "phone on charge" instant (recommended)

iOS only lets the Companion app send its battery state now and then, and not at all if you swipe the app away.
Two Shortcuts automations fix that. They run the moment the charger connects or disconnects, even with the app closed:

1. **Shortcuts → Automation → + → Charger → Is Connected → Run Immediately → Next**
2. **New Blank Automation → Add Action →** search **Home Assistant** → **Perform Action**
   (on older app versions it's called *Call Service*).
3. Action: `input_boolean.turn_on`, entity: `input_boolean.bedroom_phone_on_charger`. Then tap **Done**.
4. Repeat with **Is Disconnected** and `input_boolean.turn_off`.

Home Assistant uses whichever reported most recently, the Shortcut or the app, and the bedtime check still applies.

**Partner's phone:** do the same on their iPhone (they need the Home Assistant app installed and logged in),
but use `input_boolean.bedroom_partner_phone_on_charger`. Then choose in Glow → Routines:
- **Wait for both phones = off:** whichever phone goes on charge first after bedtime starts Goodnight.
- **Wait for both phones = on:** Goodnight waits until both phones are charging.

Unplugging either phone in the morning ends sleep mode.

**Who's home:** set `device_tracker.my_phone` and `device_tracker.partner_phone` in the package to your phones'
location trackers (from the Companion app). Then:
- *Wait for both phones* only waits for phones that are **at home**, so if one of you is away, the other's phone alone starts Goodnight.
- *Everyone left* only switches the lights off when **neither** phone is home.

## 2 · Put the app online with GitHub Pages

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Go to **Actions → Publish app to GitHub Pages → Run workflow** (it also runs on every push to `main` that changes `app/`).
4. Your app will be at **`https://<your-username>.github.io/Home-light-test-/`**.

## 3 · Install it on your phone

1. Open that link in **Safari** (iPhone) or **Chrome** (Android).
2. Tap **Share → Add to Home Screen**. It now opens full screen like a normal app.
3. Not home yet? Tap **"Just let me play (demo)"** to try it with pretend lights.
4. To connect for real you need:
   - **Address**: your Home Assistant web address. Because GitHub Pages is `https://`, this must be an
     `https://` address too, e.g. Nabu Casa (`https://xxxx.ui.nabu.casa`), DuckDNS or a Cloudflare tunnel.
   - **Token**: in Home Assistant tap your profile (bottom-left) → **Security** → **Long-lived access tokens** → **Create token**.

Your token is saved **only on your phone**. It is never in this repo, so the repo can be public.

### Only have local access (`http://homeassistant.local:8123`)?
Browsers block an `https` page from talking to an `http` address. Instead, serve the app from Home Assistant itself:
copy the contents of `app/` into `config/www/glow/` and open
`http://homeassistant.local:8123/local/glow/index.html` on your phone while at home, then *Add to Home Screen*.

## Using the app

- **Big orb**: tap to turn everything on or off. Slider = brightness of whatever is on.
- **Lamps / Downlights** pills toggle each pair.
- **Scenes**: one tap.
- **Light cards**: tap to toggle. Tap **⋯** (or long-press) for brightness, warm↔cool and colours.
- **🌙 Goodnight**: downlights off, lamps fade out, sleep mode on.
- The background changes with the time of day: sky by day, dusk in the evening, stars at night.

## Tested

The package was run on a real Home Assistant 2026.2 instance (with demo lights standing in for Hue bulbs). The tests covered:
config check, all 8 scenes, phone-charging goodnight inside and outside bedtime, morning unplug, goodnight fade,
wake-up light, gentle night glow from a simulated wall switch (and *not* from the app), daylight lock,
plus the app connecting and controlling it all in a phone-sized browser.

## Troubleshooting

| Problem | Fix |
|---|---|
| App says it can't reach HA | Check the address opens in your phone's browser; it must be `https://` (see above). |
| "Token rejected" | Make a new long-lived token and paste it in *Settings*. |
| No lights in the app | The package isn't loaded, or you renamed the groups. Check *Settings → Light groups* in the app. |
| Phone shows "Not set up" | Wrong sensor name in `bedroom_lights.yaml`, or Companion app sensors disabled. |
| Light flashes bright before dimming at night | Normal with a physical switch: the bulb comes on at its last level, then HA dims it within a second. |
