# Card Games QA — Baseline (before fixes)

- Base: http://localhost:5199/
- Started: 2026-09-15T02:48:56.900Z
- Finished: 2026-09-15T03:01:00.497Z

| Game | Viewport | Play | Duration | High | Medium | Low | Page errors | Stalls | Flow errors |
|---|---|---|---|---|---|---|---|---|---|
| big-two | desktop-1920x1080 | 🔹 smoke | 9s | 19 | 0 | 0 | 0 | 0 | 0 |
| big-two | laptop-1366x768 | ❌ not finished | 7s | 47 | 0 | 0 | 0 | 1 | 1 |
| big-two | tablet-1024x768 | 🔹 smoke | 6s | 31 | 6 | 0 | 0 | 0 | 0 |
| big-two | phone-landscape-844x390 | ❌ not finished | 55s | 57 | 87 | 0 | 1 | 1 | 0 |
| big-two | phone-portrait-390x844 | 🔹 smoke | 11s | 75 | 29 | 0 | 0 | 0 | 0 |
| mahjong | desktop-1920x1080 | 🔹 smoke | 10s | 54 | 12 | 1 | 0 | 0 | 1 |
| mahjong | laptop-1366x768 | ❌ not finished | 207s | 221 | 190 | 3 | 0 | 1 | 1 |
| mahjong | tablet-1024x768 | 🔹 smoke | 15s | 60 | 20 | 3 | 0 | 0 | 1 |
| mahjong | phone-landscape-844x390 | ❌ not finished | 199s | 275 | 560 | 0 | 0 | 1 | 1 |
| mahjong | phone-portrait-390x844 | 🔹 smoke | 15s | 148 | 52 | 1 | 0 | 0 | 1 |
| poker | desktop-1920x1080 | ✅ full round | 13s | 11 | 0 | 0 | 1 | 0 | 0 |
| poker | laptop-1366x768 | ✅ full round | 75s | 55 | 89 | 0 | 4 | 0 | 0 |
| poker | tablet-1024x768 | ✅ full round | 13s | 11 | 9 | 0 | 1 | 0 | 0 |
| poker | phone-landscape-844x390 | ✅ full round | 76s | 55 | 271 | 0 | 3 | 0 | 0 |
| poker | phone-portrait-390x844 | ✅ full round | 13s | 13 | 0 | 0 | 1 | 0 | 0 |

## big-two @ desktop-1920x1080

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 24% cut by div#p1-hand-cards.cards-hand-row axis y | 13 | initial-deal |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 2/5 pts covered by div.player-slot.player-slot-left < div.bigtwo-table | 6 | initial-deal, human-selected-2-t1 |

Screenshots: [initial-deal](big-two/desktop-1920x1080/01-initial-deal.jpg) (16⚠) · [human-selected-2-t1](big-two/desktop-1920x1080/02-human-selected-2-t1.jpg) (3⚠)

## big-two @ laptop-1366x768

**Stalls:**
- `human cannot act (play and pass both rejected)`

**Flow errors:**
- `human action rejected: PASS (last=4_C 4_D 2_D 2_H 2_S)`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 24% cut by div#p1-hand-cards.cards-hand-row axis y | 26 | initial-deal, chatbox-toggled |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 2/5 pts covered by div.player-slot.player-slot-left < div.bigtwo-table | 20 | initial-deal, chatbox-toggled, human-selected-5-t1, ai-combo-on-table… |
| high | occluded | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 3/5 pts covered by div#godgame-chatbox.godgame-chatbox < div.bigtwo-page.animate-fade-in | 1 | human-selected-5-t1 |

Screenshots: [initial-deal](big-two/laptop-1366x768/01-initial-deal.jpg) (17⚠) · [chatbox-toggled](big-two/laptop-1366x768/02-chatbox-toggled.jpg) (17⚠) · [human-selected-5-t1](big-two/laptop-1366x768/03-human-selected-5-t1.jpg) (5⚠) · [ai-combo-on-table](big-two/laptop-1366x768/04-ai-combo-on-table.jpg) (4⚠) · [human-stuck](big-two/laptop-1366x768/05-human-stuck.jpg) (4⚠)

## big-two @ tablet-1024x768

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 24% cut by div#p1-hand-cards.cards-hand-row axis y | 13 | initial-deal |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 2/5 pts covered by div.player-slot.player-slot-left < div.bigtwo-table | 8 | initial-deal, human-selected-2-t1 |
| high | viewport-clip-x | `div.poker-card.back` in `div#p3-cards-row` | x -49..-29 of vw 1024 | 6 | initial-deal, human-selected-2-t1 |
| high | occluded | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 5/5 pts covered by div#chatbox-body-content.chatbox-body < div#godgame-chatbox.godgame-chatbox | 3 | human-selected-2-t1 |
| high | occluded | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 2/5 pts covered by div#chatbox-header-bar.chatbox-header < div#godgame-chatbox.godgame-chatbox | 1 | human-selected-2-t1 |
| medium | hidden-in-scroll | `div.poker-card.back` in `div#p3-cards-row` | by div.bigtwo-page.animate-fade-in axis x | 4 | initial-deal, human-selected-2-t1 |
| medium | scroll-edge-cut | `div.poker-card.back` in `div#p3-cards-row` | 35% cut by div.bigtwo-page.animate-fade-in axis x | 2 | initial-deal, human-selected-2-t1 |

Screenshots: [initial-deal](big-two/tablet-1024x768/01-initial-deal.jpg) (23⚠) · [human-selected-2-t1](big-two/tablet-1024x768/02-human-selected-2-t1.jpg) (14⚠)

## big-two @ phone-landscape-844x390

**Stalls:**
- `state frozen 15s: {"phase":"GAME_OVER","turn":2,"hand":1,"counts":"1,2,0,3","last":"9_S","finished":false}`

**Notes:**
- `click blocked on #p1-hand-cards [data-card-id="2_C"]: locator.click: Timeout 4000ms exceeded.`

**Page errors:**
- `TypeError: Cannot read properties of undefined (reading 'name') |     at BigTwoEngine._endGame (http://localhost:5199/src/games/big-two/big-two-engine.js:414:43) |     at BigTwoEngine.playCards (http://localhost:5199/src/games/big-two/big-two-engine.js:245:14)`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 24% cut by div#p1-hand-cards.cards-hand-row axis y | 26 | initial-deal, chatbox-toggled |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 2/5 pts covered by div.player-slot.player-slot-left < div.bigtwo-table | 18 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |
| high | viewport-clip-x | `div.poker-card.back` in `div#p3-cards-row` | x -49..-29 of vw 844 | 13 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |
| medium | needs-page-scroll | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | y 468..548 of vh 390 | 60 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |
| medium | hidden-in-scroll | `div.poker-card.back` in `div#p3-cards-row` | by div.bigtwo-page.animate-fade-in axis x | 8 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table |
| medium | needs-page-scroll | `button#btn-bt-play.btn-bt-action.btn-bt-play` in `div.bigtwo-actions-bar` | y 542..575 of vh 390 | 7 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |
| medium | needs-page-scroll | `button#btn-bt-pass.btn-bt-action.btn-bt-pass` in `div.bigtwo-actions-bar` | y 542..575 of vh 390 | 7 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |
| medium | scroll-edge-cut | `div.poker-card.back` in `div#p3-cards-row` | 35% cut by div.bigtwo-page.animate-fade-in axis x | 5 | initial-deal, chatbox-toggled, human-selected-2-t1, ai-combo-on-table… |

Screenshots: [initial-deal](big-two/phone-landscape-844x390/01-initial-deal.jpg) (38⚠) · [chatbox-toggled](big-two/phone-landscape-844x390/02-chatbox-toggled.jpg) (38⚠) · [human-selected-2-t1](big-two/phone-landscape-844x390/03-human-selected-2-t1.jpg) (25⚠) · [ai-combo-on-table](big-two/phone-landscape-844x390/04-ai-combo-on-table.jpg) (23⚠) · [human-selected-1-t4](big-two/phone-landscape-844x390/05-human-selected-1-t4.jpg) (13⚠) · [human-selected-1-t12](big-two/phone-landscape-844x390/06-human-selected-1-t12.jpg) (4⚠) · [stall](big-two/phone-landscape-844x390/07-stall.jpg) (3⚠)

## big-two @ phone-portrait-390x844

**Notes:**
- `click blocked on #btn-bt-play: locator.click: Timeout 4000ms exceeded.`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | viewport-clip-x | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | x 382..436 of vw 390 | 21 | rotate-notice, initial-deal, human-selected-1-t1 |
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 24% cut by div#p1-hand-cards.cards-hand-row axis y | 12 | rotate-notice, initial-deal |
| high | viewport-clip-x | `div.poker-card.back` in `div#p3-cards-row` | x -49..-29 of vw 390 | 10 | rotate-notice, initial-deal, human-selected-1-t1 |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 5/5 pts covered by div#bt-rotate-notice.orientation-rotate-notice-bt < div.bigtwo-page.animate-fade-in | 10 | rotate-notice |
| high | occluded | `div.poker-card.back` in `div#p3-cards-row` | 2/5 pts covered by div.character-avatar-card < div.player-slot.player-slot-left | 8 | initial-deal, human-selected-1-t1 |
| high | occluded | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 5/5 pts covered by button.btn-quick-phrase < div.quick-phrases-grid | 5 | human-selected-1-t1 |
| high | partially-clipped | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 92% cut by div#p1-hand-cards.cards-hand-row axis xy | 2 | rotate-notice, initial-deal |
| high | occluded | `button#btn-bt-play.btn-bt-action.btn-bt-play` in `div.bigtwo-actions-bar` | 5/5 pts covered by div#chat-logs-list.chat-logs-list < div#chatbox-body-content.chatbox-body | 2 | initial-deal, human-selected-1-t1 |
| high | occluded | `button#btn-bt-pass.btn-bt-action.btn-bt-pass` in `div.bigtwo-actions-bar` | 5/5 pts covered by div#chat-logs-list.chat-logs-list < div#chatbox-body-content.chatbox-body | 2 | initial-deal, human-selected-1-t1 |
| high | occluded | `div.poker-card` in `div#last-played-box.last-play-combo-box` | 5/5 pts covered by strong < p | 1 | rotate-notice |
| high | occluded | `button#btn-bt-play.btn-bt-action.btn-bt-play` in `div.bigtwo-actions-bar` | 5/5 pts covered by div#bt-rotate-notice.orientation-rotate-notice-bt < div.bigtwo-page.animate-fade-in | 1 | rotate-notice |
| high | occluded | `button#btn-bt-pass.btn-bt-action.btn-bt-pass` in `div.bigtwo-actions-bar` | 5/5 pts covered by div#bt-rotate-notice.orientation-rotate-notice-bt < div.bigtwo-page.animate-fade-in | 1 | rotate-notice |
| medium | hidden-in-scroll | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | by div#p1-hand-cards.cards-hand-row axis xy | 12 | rotate-notice, initial-deal |
| medium | hidden-in-scroll | `div.poker-card.back` in `div#p3-cards-row` | by div.bigtwo-page.animate-fade-in axis x | 7 | rotate-notice, initial-deal, human-selected-1-t1 |
| medium | hidden-in-scroll | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | by div#p1-hand-cards.cards-hand-row axis x | 6 | human-selected-1-t1 |
| medium | scroll-edge-cut | `div.poker-card.back` in `div#p3-cards-row` | 35% cut by div.bigtwo-page.animate-fade-in axis x | 3 | rotate-notice, initial-deal, human-selected-1-t1 |
| medium | scroll-edge-cut | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 67% cut by div#p1-hand-cards.cards-hand-row axis x | 1 | human-selected-1-t1 |

Screenshots: [rotate-notice](big-two/phone-portrait-390x844/01-rotate-notice.jpg) (39⚠) · [initial-deal](big-two/phone-portrait-390x844/02-initial-deal.jpg) (32⚠) · [human-selected-1-t1](big-two/phone-portrait-390x844/03-human-selected-1-t1.jpg) (33⚠)

## mahjong @ desktop-1920x1080

**Flow errors:**
- `UI not refreshed: engine awaits human discard but DOM is stale`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 76% cut by div#p1-hand-tiles.player-hand-tiles axis y | 18 | initial-deal, human-selected-tile-t1 |
| high | viewport-clip-top | `div.mj-tile.small.back` in `div#p4-tiles` | doc top -81 | 14 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div.player-slot.player-slot-left < div.mahjong-table | 10 | initial-deal, human-selected-tile-t1 |
| high | partially-clipped | `div.mj-tile.small.back` in `div#p4-tiles` | 63% cut by div.mahjong-page.animate-fade-in axis y | 4 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div.mahjong-center-box < div.mahjong-table | 4 | initial-deal, human-selected-tile-t1 |
| high | viewport-clip-top | `div.mj-tile.small` in `div#p4-flowers` | doc top -127 | 2 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div.mahjong-dice-box < div.mahjong-center-box | 2 | initial-deal, human-selected-tile-t1 |
| medium | hidden-in-scroll | `div.mj-tile.small.back` in `div#p4-tiles` | by div.mahjong-page.animate-fade-in axis y | 10 | initial-deal, human-selected-tile-t1 |
| medium | hidden-in-scroll | `div.mj-tile.small` in `div#p4-flowers` | by div.mahjong-page.animate-fade-in axis y | 2 | initial-deal, human-selected-tile-t1 |
| low | overlaps-other-card | `div.mj-tile.small` in `div#p1-flowers` | 3/5 pts under another card | 1 | human-selected-tile-t1 |

Screenshots: [initial-deal](mahjong/desktop-1920x1080/01-initial-deal.jpg) (41⚠) · [human-selected-tile-t1](mahjong/desktop-1920x1080/02-human-selected-tile-t1.jpg) (26⚠)

## mahjong @ laptop-1366x768

**Stalls:**
- `state frozen 15s: {"phase":"PLAY","turn":0,"wall":0,"hand":4,"discards":90,"mine":[],"result":null}`

**Flow errors:**
- `UI not refreshed: engine awaits human discard but DOM is stale`

**Notes:**
- `click blocked on #p1-hand-tiles .mj-tile[data-tile="C"]: locator.click: Timeout 4000ms exceeded.`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | viewport-clip-top | `div.mj-tile.small.back` in `div#p4-tiles` | doc top -102 | 52 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 76% cut by div#p1-hand-tiles.player-hand-tiles axis y | 40 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div.player-slot.player-slot-left < div.mahjong-table | 35 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| high | partially-clipped | `div.mj-tile.small` in `div#discard-river.discard-river-grid` | 14% cut by div#discard-river.discard-river-grid axis y | 32 | human-selected-tile-t6, human-selected-tile-t12, human-selected-tile-t18, stall |
| high | partially-clipped | `div.mj-tile.small.back` in `div#p4-tiles` | 30% cut by div.mahjong-page.animate-fade-in axis y | 16 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 3/5 pts covered by div.mahjong-center-box < div.mahjong-table | 11 | claim-panel-chow, ting-hint-popover, human-selected-tile-t6, human-selected-tile-t12… |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div#discard-river.discard-river-grid < div.mahjong-center-box | 10 | initial-deal, chatbox-toggled, human-selected-tile-t1, human-selected-tile-t6… |
| high | viewport-clip-top | `div.mj-tile.small` in `div#p4-flowers` | doc top -127 | 9 | human-selected-tile-t6, human-selected-tile-t12, human-selected-tile-t18, stall |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by strong#mj-dealer-name < span | 6 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| high | occluded | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 5/5 pts covered by button.btn-quick-phrase < div.quick-phrases-grid | 3 | human-selected-tile-t1, claim-panel-chow, ting-hint-popover |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div.mahjong-dice-box < div.mahjong-center-box | 3 | human-selected-tile-t6, human-selected-tile-t12, human-selected-tile-t18 |
| high | occluded | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 3/5 pts covered by div#chatbox-body-content.chatbox-body < div#godgame-chatbox.godgame-chatbox | 2 | human-selected-tile-t1, ting-hint-popover |
| high | partially-clipped | `div.mj-tile.small` in `div#p2-flowers` | 81% cut by div.mahjong-page.animate-fade-in axis y | 2 | human-selected-tile-t18, stall |
| medium | hidden-in-scroll | `div.mj-tile.small` in `div#discard-river.discard-river-grid` | by div#discard-river.discard-river-grid axis y | 131 | human-selected-tile-t6, human-selected-tile-t12, human-selected-tile-t18, stall |
| medium | hidden-in-scroll | `div.mj-tile.small.back` in `div#p4-tiles` | by div.mahjong-page.animate-fade-in axis y | 36 | initial-deal, chatbox-toggled, human-selected-tile-t1, claim-panel-chow… |
| medium | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 1/5 pts covered by div#discard-river.discard-river-grid < div.mahjong-center-box | 16 | claim-panel-chow, ting-hint-popover, human-selected-tile-t6, human-selected-tile-t12… |
| medium | hidden-in-scroll | `div.mj-tile.small` in `div#p4-flowers` | by div.mahjong-page.animate-fade-in axis y | 7 | human-selected-tile-t6, human-selected-tile-t12, human-selected-tile-t18, stall |
| low | overlaps-other-card | `div.mj-tile.small` in `div#p1-flowers` | 3/5 pts under another card | 3 | human-selected-tile-t1, ting-hint-popover, human-selected-tile-t6 |

Screenshots: [initial-deal](mahjong/laptop-1366x768/01-initial-deal.jpg) (40⚠) · [chatbox-toggled](mahjong/laptop-1366x768/02-chatbox-toggled.jpg) (40⚠) · [human-selected-tile-t1](mahjong/laptop-1366x768/03-human-selected-tile-t1.jpg) (27⚠) · [claim-panel-chow](mahjong/laptop-1366x768/04-claim-panel-chow.jpg) (24⚠) · [ting-hint-popover](mahjong/laptop-1366x768/05-ting-hint-popover.jpg) (26⚠) · [human-selected-tile-t6](mahjong/laptop-1366x768/06-human-selected-tile-t6.jpg) (34⚠) · [human-selected-tile-t12](mahjong/laptop-1366x768/07-human-selected-tile-t12.jpg) (55⚠) · [human-selected-tile-t18](mahjong/laptop-1366x768/08-human-selected-tile-t18.jpg) (79⚠) · [stall](mahjong/laptop-1366x768/09-stall.jpg) (89⚠)

## mahjong @ tablet-1024x768

**Flow errors:**
- `UI not refreshed: engine awaits human discard but DOM is stale`

**Notes:**
- `click blocked on #p1-hand-tiles .mj-tile[data-tile="E"]: locator.click: Timeout 4000ms exceeded.`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 76% cut by div#p1-hand-tiles.player-hand-tiles axis y | 18 | initial-deal, human-selected-tile-t1 |
| high | viewport-clip-top | `div.mj-tile.small.back` in `div#p4-tiles` | doc top -102 | 16 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div.player-slot.player-slot-left < div.mahjong-table | 10 | initial-deal, human-selected-tile-t1 |
| high | viewport-clip-x | `div.mj-tile.small.back` in `div#p3-tiles` | x -80..-60 of vw 1024 | 8 | initial-deal, human-selected-tile-t1 |
| high | partially-clipped | `div.mj-tile.small.back` in `div#p4-tiles` | 30% cut by div.mahjong-page.animate-fade-in axis y | 4 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by strong#mj-dealer-name < span | 2 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div#discard-river.discard-river-grid < div.mahjong-center-box | 2 | initial-deal, human-selected-tile-t1 |
| medium | hidden-in-scroll | `div.mj-tile.small.back` in `div#p4-tiles` | by div.mahjong-page.animate-fade-in axis y | 12 | initial-deal, human-selected-tile-t1 |
| medium | hidden-in-scroll | `div.mj-tile.small.back` in `div#p3-tiles` | by div.mahjong-page.animate-fade-in axis x | 6 | initial-deal, human-selected-tile-t1 |
| medium | scroll-edge-cut | `div.mj-tile.small.back` in `div#p3-tiles` | 88% cut by div.mahjong-page.animate-fade-in axis x | 2 | initial-deal, human-selected-tile-t1 |
| low | overlaps-other-card | `div.mj-tile.small` in `div#p1-flowers` | 3/5 pts under another card | 3 | human-selected-tile-t1 |

Screenshots: [initial-deal](mahjong/tablet-1024x768/01-initial-deal.jpg) (48⚠) · [human-selected-tile-t1](mahjong/tablet-1024x768/02-human-selected-tile-t1.jpg) (35⚠)

## mahjong @ phone-landscape-844x390

**Stalls:**
- `state frozen 15s: {"phase":"PLAY","turn":0,"wall":0,"hand":10,"discards":81,"mine":[],"result":null}`

**Flow errors:**
- `UI not refreshed: engine awaits human discard but DOM is stale`

**Notes:**
- `click blocked on #p1-hand-tiles .mj-tile[data-tile="S"]: locator.click: Timeout 4000ms exceeded.`
- `click blocked on #p1-hand-tiles .mj-tile[data-tile="N"]: locator.click: Timeout 4000ms exceeded.`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | viewport-clip-top | `div.mj-tile.small.back` in `div#p4-tiles` | doc top -102 | 50 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div.player-slot.player-slot-left < div.mahjong-table | 40 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 76% cut by div#p1-hand-tiles.player-hand-tiles axis y | 36 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | partially-clipped | `div.mj-tile.small` in `div#discard-river.discard-river-grid` | 14% cut by div#discard-river.discard-river-grid axis y | 36 | human-selected-tile-t6, claim-panel-pong, human-selected-tile-t12, human-selected-tile-t18… |
| high | viewport-clip-x | `div.mj-tile.small.back` in `div#p3-tiles` | x -80..-60 of vw 844 | 31 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | partially-clipped | `div.mj-tile.small.back` in `div#p4-tiles` | 30% cut by div.mahjong-page.animate-fade-in axis y | 16 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | viewport-clip-top | `div.mj-tile.small` in `div#p2-flowers` | doc top -127 | 9 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | viewport-clip-x | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | x 799..847 of vw 844 | 9 | initial-deal, chatbox-toggled, human-selected-tile-t1, ting-hint-popover… |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 2/5 pts covered by div#chatbox-header-bar.chatbox-header < div#godgame-chatbox.godgame-chatbox.collapsed | 8 | chatbox-toggled, human-selected-tile-t1, ting-hint-popover, human-selected-tile-t6… |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by button#btn-toggle-chatbox.chatbox-toggle-btn < div#chatbox-header-bar.chatbox-header | 8 | chatbox-toggled, human-selected-tile-t1, ting-hint-popover, human-selected-tile-t6… |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div#discard-river.discard-river-grid < div.mahjong-center-box | 6 | initial-deal, chatbox-toggled, human-selected-tile-t1, human-selected-tile-t6 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 3/5 pts covered by div.mahjong-center-box < div.mahjong-table | 6 | ting-hint-popover, claim-panel-pong, human-selected-tile-t12, human-selected-tile-t18… |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by span < div.mahjong-dice-box | 4 | initial-deal, chatbox-toggled, human-selected-tile-t1, human-selected-tile-t6 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by strong#mj-dealer-name < span | 4 | claim-panel-pong, human-selected-tile-t12, human-selected-tile-t18, stall |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by div#chatbox-body-content.chatbox-body < div#godgame-chatbox.godgame-chatbox | 3 | initial-deal |
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 88% cut by div#p1-hand-tiles.player-hand-tiles axis xy | 2 | initial-deal, chatbox-toggled |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by div#chatbox-header-bar.chatbox-header < div#godgame-chatbox.godgame-chatbox | 1 | initial-deal |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by button.btn-quick-phrase < div.quick-phrases-grid | 1 | initial-deal |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by div.quick-phrases-grid < div#chatbox-body-content.chatbox-body | 1 | initial-deal |
| high | occluded | `div.mj-tile.small.back` in `div#p2-tiles` | 5/5 pts covered by div < div#chat-logs-list.chat-logs-list | 1 | initial-deal |

Screenshots: [initial-deal](mahjong/phone-landscape-844x390/01-initial-deal.jpg) (82⚠) · [chatbox-toggled](mahjong/phone-landscape-844x390/02-chatbox-toggled.jpg) (75⚠) · [human-selected-tile-t1](mahjong/phone-landscape-844x390/03-human-selected-tile-t1.jpg) (61⚠) · [ting-hint-popover](mahjong/phone-landscape-844x390/04-ting-hint-popover.jpg) (63⚠) · [human-selected-tile-t6](mahjong/phone-landscape-844x390/05-human-selected-tile-t6.jpg) (68⚠) · [claim-panel-pong](mahjong/phone-landscape-844x390/06-claim-panel-pong.jpg) (101⚠) · [human-selected-tile-t12](mahjong/phone-landscape-844x390/07-human-selected-tile-t12.jpg) (98⚠) · [human-selected-tile-t18](mahjong/phone-landscape-844x390/08-human-selected-tile-t18.jpg) (133⚠) · [stall](mahjong/phone-landscape-844x390/09-stall.jpg) (154⚠)

## mahjong @ phone-portrait-390x844

**Flow errors:**
- `UI not refreshed: engine awaits human discard but DOM is stale`

**Notes:**
- `click blocked on #p1-hand-tiles .mj-tile[data-tile="N"]: locator.click: Timeout 4000ms exceeded.`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div#mj-rotate-notice.orientation-rotate-notice < div.mahjong-page.animate-fade-in | 37 | rotate-notice |
| high | viewport-clip-x | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | x 391..439 of vw 390 | 30 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | partially-clipped | `div.mj-tile` in `div#p1-hand-tiles.player-hand-tiles` | 76% cut by div#p1-hand-tiles.player-hand-tiles axis y | 17 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | viewport-clip-x | `div.mj-tile.small.back` in `div#p3-tiles` | x -80..-60 of vw 390 | 15 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p3-tiles` | 5/5 pts covered by div.player-slot.player-slot-left < div.mahjong-table | 10 | initial-deal, human-selected-tile-t1 |
| high | viewport-clip-top | `div.mj-tile.small` in `div#p4-flowers` | doc top -47 | 9 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by strong#mj-dealer-name < span | 8 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by span < div.mahjong-dice-box | 4 | initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by div.rotate-icon-anim < div#mj-rotate-notice.orientation-rotate-notice | 3 | rotate-notice |
| high | viewport-clip-top | `div.mj-tile.small.back` in `div#p2-tiles` | doc top -22 | 3 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | partially-clipped | `div.mj-tile.small.back` in `div#p2-tiles` | 73% cut by div.mahjong-page.animate-fade-in axis y | 3 | rotate-notice, initial-deal, human-selected-tile-t1 |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by h3 < div#mj-rotate-notice.orientation-rotate-notice | 1 | rotate-notice |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by p < div#mj-rotate-notice.orientation-rotate-notice | 1 | rotate-notice |
| high | occluded | `div.mj-tile.small.back` in `div#p4-tiles` | 5/5 pts covered by strong < p | 1 | rotate-notice |
| high | occluded | `div.mj-tile.small` in `div#p1-flowers` | 5/5 pts covered by div#mj-rotate-notice.orientation-rotate-notice < div.mahjong-page.animate-fade-in | 1 | rotate-notice |
| high | occluded | `button#btn-mj-discard.btn-mj-action.btn-mj-discard` in `div#mj-actions-bar.mahjong-actions-bar` | 5/5 pts covered by div#mj-rotate-notice.orientation-rotate-notice < div.mahjong-page.animate-fade-in | 1 | rotate-notice |
| high | occluded | `button#btn-mj-ting.btn-mj-action.btn-mj-ting` in `div#mj-actions-bar.mahjong-actions-bar` | 5/5 pts covered by div#mj-rotate-notice.orientation-rotate-notice < div.mahjong-page.animate-fade-in | 1 | rotate-notice |
| high | occluded | `div.mj-tile.small` in `div#p1-flowers` | 5/5 pts covered by button.btn-quick-phrase < div.quick-phrases-grid | 1 | initial-deal |
| high | occluded | `button#btn-mj-discard.btn-mj-action.btn-mj-discard` in `div#mj-actions-bar.mahjong-actions-bar` | 5/5 pts covered by div < div#chat-logs-list.chat-logs-list | 1 | initial-deal |
| high | occluded | `button#btn-mj-ting.btn-mj-action.btn-mj-ting` in `div#mj-actions-bar.mahjong-actions-bar` | 5/5 pts covered by div < div#chat-logs-list.chat-logs-list | 1 | initial-deal |

Screenshots: [rotate-notice](mahjong/phone-portrait-390x844/01-rotate-notice.jpg) (89⚠) · [initial-deal](mahjong/phone-portrait-390x844/02-initial-deal.jpg) (57⚠) · [human-selected-tile-t1](mahjong/phone-portrait-390x844/03-human-selected-tile-t1.jpg) (55⚠)

## poker @ desktop-1920x1080

**Results:** `hand 1: 貓咪 (AI) 贏得籌碼 $80 (同花 (Flush))`

**Page errors:**
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at http://localhost:5199/src/pages/poker/poker.js:321:7`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.poker-card` in `div#cards-1.hole-cards` | 5/5 pts covered by div#winner-banner.winner-banner < div.poker-table-stage.glass | 6 | hand1-result |
| high | occluded | `div.poker-card` in `div#community-cards.community-cards` | 5/5 pts covered by span#winner-text < div#winner-banner.winner-banner | 5 | hand1-result |

Screenshots: [initial-deal](poker/desktop-1920x1080/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/desktop-1920x1080/02-my-turn-preflop-h1.jpg) · [hand1-result](poker/desktop-1920x1080/03-hand1-result.jpg) (11⚠)

## poker @ laptop-1366x768

**Results:** `hand 1: 貓咪 (AI) 贏得籌碼 $240 (葫蘆 (Full House))` · `hand 2: 熊熊 (AI) 贏得籌碼 $80 (順子 (Straight))` · `hand 3: 兔兔 (AI) 贏得籌碼 $80 (三條 (Three of a Kind))` · `hand 4: 熊熊 (AI) 贏得籌碼 $80 (兩對 (Two Pair))` · `hand 5: 兔兔 (AI) 贏得籌碼 $800 (兩對 (Two Pair))`

**Notes:**
- `switched to 豪客場 $100/$200 to exercise all-in paths`

**Page errors:**
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at HTMLButtonElement.<anonymous> (http://localhost:5199/src/pages/poker/poker.js:262:5)`
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at http://localhost:5199/src/pages/poker/poker.js:321:7`
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at HTMLButtonElement.<anonymous> (http://localhost:5199/src/pages/poker/poker.js:255:5)`
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at HTMLButtonElement.<anonymous> (http://localhost:5199/src/pages/poker/poker.js:303:7)`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.poker-card` in `div#cards-1.hole-cards` | 5/5 pts covered by div#winner-banner.winner-banner < div.poker-table-stage.glass | 30 | hand1-result, hand2-result, hand3-result, hand4-result… |
| high | occluded | `div.poker-card` in `div#community-cards.community-cards` | 5/5 pts covered by span#winner-text < div#winner-banner.winner-banner | 25 | hand1-result, hand2-result, hand3-result, hand4-result… |
| medium | needs-page-scroll | `button#pbtn-fold.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-check.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-call.btn.btn-cyan.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-raise.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-next.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..814 of vh 768 | 5 | hand1-result, hand2-result, hand3-result, hand4-result… |

Screenshots: [initial-deal](poker/laptop-1366x768/01-initial-deal.jpg) (4⚠) · [my-turn-preflop-h1](poker/laptop-1366x768/02-my-turn-preflop-h1.jpg) (4⚠) · [my-turn-flop-h1](poker/laptop-1366x768/03-my-turn-flop-h1.jpg) (4⚠) · [my-turn-turn-h1](poker/laptop-1366x768/04-my-turn-turn-h1.jpg) (4⚠) · [my-turn-river-h1](poker/laptop-1366x768/05-my-turn-river-h1.jpg) (4⚠) · [hand1-result](poker/laptop-1366x768/06-hand1-result.jpg) (12⚠) · [my-turn-preflop-h2](poker/laptop-1366x768/07-my-turn-preflop-h2.jpg) (4⚠) · [my-turn-flop-h2](poker/laptop-1366x768/08-my-turn-flop-h2.jpg) (4⚠) · [my-turn-turn-h2](poker/laptop-1366x768/09-my-turn-turn-h2.jpg) (4⚠) · [my-turn-river-h2](poker/laptop-1366x768/10-my-turn-river-h2.jpg) (4⚠) · [hand2-result](poker/laptop-1366x768/11-hand2-result.jpg) (12⚠) · [my-turn-preflop-h3](poker/laptop-1366x768/12-my-turn-preflop-h3.jpg) (4⚠) · [my-turn-flop-h3](poker/laptop-1366x768/13-my-turn-flop-h3.jpg) (4⚠) · [my-turn-turn-h3](poker/laptop-1366x768/14-my-turn-turn-h3.jpg) (4⚠) · [my-turn-river-h3](poker/laptop-1366x768/15-my-turn-river-h3.jpg) (4⚠) · [hand3-result](poker/laptop-1366x768/16-hand3-result.jpg) (12⚠) · [my-turn-preflop-h4](poker/laptop-1366x768/17-my-turn-preflop-h4.jpg) (4⚠) · [my-turn-flop-h4](poker/laptop-1366x768/18-my-turn-flop-h4.jpg) (4⚠) · [my-turn-turn-h4](poker/laptop-1366x768/19-my-turn-turn-h4.jpg) (4⚠) · [my-turn-river-h4](poker/laptop-1366x768/20-my-turn-river-h4.jpg) (4⚠) · [hand4-result](poker/laptop-1366x768/21-hand4-result.jpg) (12⚠) · [my-turn-preflop-h5](poker/laptop-1366x768/22-my-turn-preflop-h5.jpg) (4⚠) · [my-turn-flop-h5](poker/laptop-1366x768/23-my-turn-flop-h5.jpg) (4⚠) · [my-turn-turn-h5](poker/laptop-1366x768/24-my-turn-turn-h5.jpg) (4⚠) · [my-turn-river-h5](poker/laptop-1366x768/25-my-turn-river-h5.jpg) (4⚠) · [hand5-result](poker/laptop-1366x768/26-hand5-result.jpg) (12⚠)

## poker @ tablet-1024x768

**Results:** `hand 1: 勇敏狐狸 #555 (你), 貓咪 (AI) 贏得籌碼 $80 (順子 (Straight))`

**Page errors:**
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at http://localhost:5199/src/pages/poker/poker.js:321:7`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.poker-card` in `div#cards-1.hole-cards` | 5/5 pts covered by div#winner-banner.winner-banner < div.poker-table-stage.glass | 6 | hand1-result |
| high | occluded | `div.poker-card` in `div#community-cards.community-cards` | 5/5 pts covered by span#winner-text < div#winner-banner.winner-banner | 5 | hand1-result |
| medium | needs-page-scroll | `button#pbtn-fold.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 2 | initial-deal, my-turn-preflop-h1 |
| medium | needs-page-scroll | `button#pbtn-check.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 2 | initial-deal, my-turn-preflop-h1 |
| medium | needs-page-scroll | `button#pbtn-call.btn.btn-cyan.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 2 | initial-deal, my-turn-preflop-h1 |
| medium | needs-page-scroll | `button#pbtn-raise.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 768 | 2 | initial-deal, my-turn-preflop-h1 |
| medium | needs-page-scroll | `button#pbtn-next.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..814 of vh 768 | 1 | hand1-result |

Screenshots: [initial-deal](poker/tablet-1024x768/01-initial-deal.jpg) (4⚠) · [my-turn-preflop-h1](poker/tablet-1024x768/02-my-turn-preflop-h1.jpg) (4⚠) · [hand1-result](poker/tablet-1024x768/03-hand1-result.jpg) (12⚠)

## poker @ phone-landscape-844x390

**Results:** `hand 1: 兔兔 (AI) 贏得籌碼 $80 (兩對 (Two Pair))` · `hand 2: 貓咪 (AI) 贏得籌碼 $80 (兩對 (Two Pair))` · `hand 3: 熊熊 (AI) 贏得籌碼 $80 (對子 (One Pair))` · `hand 4: 貓咪 (AI) 贏得籌碼 $80 (順子 (Straight))` · `hand 5: 熊熊 (AI) 贏得籌碼 $800 (對子 (One Pair))`

**Notes:**
- `switched to 豪客場 $100/$200 to exercise all-in paths`

**Page errors:**
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at http://localhost:5199/src/pages/poker/poker.js:321:7`
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at HTMLButtonElement.<anonymous> (http://localhost:5199/src/pages/poker/poker.js:255:5)`
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at HTMLButtonElement.<anonymous> (http://localhost:5199/src/pages/poker/poker.js:303:7)`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.poker-card` in `div#cards-1.hole-cards` | 5/5 pts covered by div#winner-banner.winner-banner < div.poker-table-stage.glass | 30 | hand1-result, hand2-result, hand3-result, hand4-result… |
| high | occluded | `div.poker-card` in `div#community-cards.community-cards` | 3/3 pts covered by span#winner-text < div#winner-banner.winner-banner | 25 | hand1-result, hand2-result, hand3-result, hand4-result… |
| medium | needs-page-scroll | `div.poker-card` in `div#cards-0.hole-cards` | y 580..637 of vh 390 | 137 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `div.card-slot.empty` in `div#community-cards.community-cards` | y 350..420 of vh 390 | 45 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-fold.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 390 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-check.btn.btn-secondary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 390 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-call.btn.btn-cyan.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 390 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-raise.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..816 of vh 390 | 21 | initial-deal, my-turn-preflop-h1, my-turn-flop-h1, my-turn-turn-h1… |
| medium | needs-page-scroll | `button#pbtn-next.btn.btn-primary.action-btn` in `div.poker-action-buttons` | y 770..814 of vh 390 | 5 | hand1-result, hand2-result, hand3-result, hand4-result… |

Screenshots: [initial-deal](poker/phone-landscape-844x390/01-initial-deal.jpg) (11⚠) · [my-turn-preflop-h1](poker/phone-landscape-844x390/02-my-turn-preflop-h1.jpg) (11⚠) · [my-turn-flop-h1](poker/phone-landscape-844x390/03-my-turn-flop-h1.jpg) (11⚠) · [my-turn-turn-h1](poker/phone-landscape-844x390/04-my-turn-turn-h1.jpg) (11⚠) · [my-turn-river-h1](poker/phone-landscape-844x390/05-my-turn-river-h1.jpg) (11⚠) · [hand1-result](poker/phone-landscape-844x390/06-hand1-result.jpg) (19⚠) · [my-turn-preflop-h2](poker/phone-landscape-844x390/07-my-turn-preflop-h2.jpg) (11⚠) · [my-turn-flop-h2](poker/phone-landscape-844x390/08-my-turn-flop-h2.jpg) (11⚠) · [my-turn-turn-h2](poker/phone-landscape-844x390/09-my-turn-turn-h2.jpg) (11⚠) · [my-turn-river-h2](poker/phone-landscape-844x390/10-my-turn-river-h2.jpg) (11⚠) · [hand2-result](poker/phone-landscape-844x390/11-hand2-result.jpg) (19⚠) · [my-turn-preflop-h3](poker/phone-landscape-844x390/12-my-turn-preflop-h3.jpg) (11⚠) · [my-turn-flop-h3](poker/phone-landscape-844x390/13-my-turn-flop-h3.jpg) (11⚠) · [my-turn-turn-h3](poker/phone-landscape-844x390/14-my-turn-turn-h3.jpg) (11⚠) · [my-turn-river-h3](poker/phone-landscape-844x390/15-my-turn-river-h3.jpg) (11⚠) · [hand3-result](poker/phone-landscape-844x390/16-hand3-result.jpg) (19⚠) · [my-turn-preflop-h4](poker/phone-landscape-844x390/17-my-turn-preflop-h4.jpg) (11⚠) · [my-turn-flop-h4](poker/phone-landscape-844x390/18-my-turn-flop-h4.jpg) (11⚠) · [my-turn-turn-h4](poker/phone-landscape-844x390/19-my-turn-turn-h4.jpg) (11⚠) · [my-turn-river-h4](poker/phone-landscape-844x390/20-my-turn-river-h4.jpg) (11⚠) · [hand4-result](poker/phone-landscape-844x390/21-hand4-result.jpg) (19⚠) · [my-turn-preflop-h5](poker/phone-landscape-844x390/22-my-turn-preflop-h5.jpg) (11⚠) · [my-turn-flop-h5](poker/phone-landscape-844x390/23-my-turn-flop-h5.jpg) (11⚠) · [my-turn-turn-h5](poker/phone-landscape-844x390/24-my-turn-turn-h5.jpg) (11⚠) · [my-turn-river-h5](poker/phone-landscape-844x390/25-my-turn-river-h5.jpg) (11⚠) · [hand5-result](poker/phone-landscape-844x390/26-hand5-result.jpg) (19⚠)

## poker @ phone-portrait-390x844

**Results:** `hand 1: 熊熊 (AI) 贏得籌碼 $80 (對子 (One Pair))`

**Page errors:**
- `ReferenceError: initialUserChips is not defined |     at _updatePokerUI (http://localhost:5199/src/pages/poker/poker.js:463:71) |     at http://localhost:5199/src/pages/poker/poker.js:321:7`

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| high | occluded | `div.poker-card` in `div#cards-1.hole-cards` | 5/5 pts covered by div#winner-banner.winner-banner < div.poker-table-stage.glass | 8 | hand1-result |
| high | occluded | `div.poker-card` in `div#community-cards.community-cards` | 5/5 pts covered by span#winner-text < div#winner-banner.winner-banner | 5 | hand1-result |

Screenshots: [initial-deal](poker/phone-portrait-390x844/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/phone-portrait-390x844/02-my-turn-preflop-h1.jpg) · [hand1-result](poker/phone-portrait-390x844/03-hand1-result.jpg) (13⚠)
