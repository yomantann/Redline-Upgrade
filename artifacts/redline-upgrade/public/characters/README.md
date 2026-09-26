# Character portrait assets

The 21 PNG character portraits in this folder were imported from the supplied Redline Auction project archive. The source project was not modified. The roster's `imagePath` values in `src/game/characters.ts` refer to these files through one clean mapping. The UI resolves each path against Vite's base URL.

```
guardian_h.png
click_click.png
frostbyte.png
sadman.png
rainbow_dash.png
accuser.png
low_flame.png
wandering_eye.png
the_rind.png
anointed.png
executive_p.png
alpha_prime.png
roll_safe.png
hotwired.png
panic_bot.png
primate.png
pain_hider.png
prom_king.png
idol_core.png
danger_zone.png
the_tank.png
```

The four special source assets are intentionally mapped directly to the normal Redline Upgrade character ids: `prom_king` uses the supplied Social image, `idol_core` uses the supplied Social image, `danger_zone` uses the supplied Bio image, and `the_tank` uses the supplied Bio image. There is no alternate-image logic in Redline Upgrade.