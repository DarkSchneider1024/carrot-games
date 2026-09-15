# Card Games QA — After fixes

- Base: http://localhost:5199/
- Started: 2026-09-15T06:58:44.743Z
- Finished: 2026-09-15T07:03:39.591Z

| Game | Viewport | Play | Duration | High | Medium | Low | Page errors | Stalls | Flow errors |
|---|---|---|---|---|---|---|---|---|---|
| big-two | desktop-1920x1080 | 🔹 smoke | 6s | 0 | 0 | 0 | 0 | 0 | 0 |
| big-two | laptop-1366x768 | ✅ full round | 20s | 0 | 0 | 0 | 0 | 0 | 0 |
| big-two | tablet-1024x768 | 🔹 smoke | 6s | 0 | 0 | 0 | 0 | 0 | 0 |
| big-two | phone-landscape-844x390 | ✅ full round | 28s | 0 | 0 | 0 | 0 | 0 | 0 |
| big-two | phone-portrait-390x844 | 🔹 smoke | 6s | 0 | 0 | 1 | 0 | 0 | 0 |
| mahjong | desktop-1920x1080 | 🔹 smoke | 5s | 0 | 0 | 0 | 0 | 0 | 0 |
| mahjong | laptop-1366x768 | ✅ full round | 26s | 0 | 0 | 0 | 0 | 0 | 0 |
| mahjong | tablet-1024x768 | 🔹 smoke | 5s | 0 | 0 | 0 | 0 | 0 | 0 |
| mahjong | phone-landscape-844x390 | ✅ full round | 35s | 0 | 0 | 0 | 0 | 0 | 0 |
| mahjong | phone-portrait-390x844 | 🔹 smoke | 6s | 0 | 0 | 0 | 0 | 0 | 0 |
| poker | desktop-1920x1080 | ✅ full round | 13s | 0 | 0 | 0 | 0 | 0 | 0 |
| poker | laptop-1366x768 | ✅ full round | 58s | 0 | 0 | 0 | 0 | 0 | 0 |
| poker | tablet-1024x768 | ✅ full round | 14s | 0 | 0 | 0 | 0 | 0 | 0 |
| poker | phone-landscape-844x390 | ✅ full round | 56s | 0 | 0 | 0 | 0 | 0 | 0 |
| poker | phone-portrait-390x844 | ✅ full round | 12s | 0 | 0 | 0 | 0 | 0 | 0 |

## big-two @ desktop-1920x1080

No layout issues detected.

Screenshots: [initial-deal](big-two/desktop-1920x1080/01-initial-deal.jpg) · [human-selected-1-t1](big-two/desktop-1920x1080/02-human-selected-1-t1.jpg)

## big-two @ laptop-1366x768

**Results:** `👑 獲勝者：🧊 酷酷冰箱 (+7,000 籌碼)`

No layout issues detected.

Screenshots: [initial-deal](big-two/laptop-1366x768/01-initial-deal.jpg) · [chatbox-opened](big-two/laptop-1366x768/02-chatbox-opened.jpg) · [ai-combo-on-table](big-two/laptop-1366x768/03-ai-combo-on-table.jpg) · [human-selected-1-t4](big-two/laptop-1366x768/04-human-selected-1-t4.jpg) · [settlement-modal](big-two/laptop-1366x768/05-settlement-modal.jpg)

## big-two @ tablet-1024x768

No layout issues detected.

Screenshots: [initial-deal](big-two/tablet-1024x768/01-initial-deal.jpg) · [human-selected-5-t1](big-two/tablet-1024x768/02-human-selected-5-t1.jpg)

## big-two @ phone-landscape-844x390

**Results:** `👑 獲勝者：🎵 竹笛精靈 (+1,300 籌碼)`

No layout issues detected.

Screenshots: [initial-deal](big-two/phone-landscape-844x390/01-initial-deal.jpg) · [chatbox-opened](big-two/phone-landscape-844x390/02-chatbox-opened.jpg) · [human-selected-2-t1](big-two/phone-landscape-844x390/03-human-selected-2-t1.jpg) · [ai-combo-on-table](big-two/phone-landscape-844x390/04-ai-combo-on-table.jpg) · [human-selected-1-t4](big-two/phone-landscape-844x390/05-human-selected-1-t4.jpg) · [settlement-modal](big-two/phone-landscape-844x390/06-settlement-modal.jpg)

## big-two @ phone-portrait-390x844

| Sev | Kind | Element | Sample | Hits | Checkpoints |
|---|---|---|---|---|---|
| low | overlaps-other-card | `div.poker-card` in `div#p1-hand-cards.cards-hand-row` | 4/5 pts under another card | 1 | human-selected-1-t1 |

Screenshots: [rotate-notice](big-two/phone-portrait-390x844/01-rotate-notice.jpg) · [initial-deal](big-two/phone-portrait-390x844/02-initial-deal.jpg) · [human-selected-1-t1](big-two/phone-portrait-390x844/03-human-selected-1-t1.jpg) (1⚠)

## mahjong @ desktop-1920x1080

No layout issues detected.

Screenshots: [initial-deal](mahjong/desktop-1920x1080/01-initial-deal.jpg) · [human-selected-tile-t1](mahjong/desktop-1920x1080/02-human-selected-tile-t1.jpg)

## mahjong @ laptop-1366x768

**Results:** `玩家 (你) 1台`

No layout issues detected.

Screenshots: [initial-deal](mahjong/laptop-1366x768/01-initial-deal.jpg) · [chatbox-opened](mahjong/laptop-1366x768/02-chatbox-opened.jpg) · [human-selected-tile-t1](mahjong/laptop-1366x768/03-human-selected-tile-t1.jpg) · [claim-panel-chow](mahjong/laptop-1366x768/04-claim-panel-chow.jpg) · [ting-hint-popover](mahjong/laptop-1366x768/05-ting-hint-popover.jpg) · [human-selected-tile-t6](mahjong/laptop-1366x768/06-human-selected-tile-t6.jpg) · [settlement-modal](mahjong/laptop-1366x768/07-settlement-modal.jpg)

## mahjong @ tablet-1024x768

No layout issues detected.

Screenshots: [initial-deal](mahjong/tablet-1024x768/01-initial-deal.jpg) · [human-selected-tile-t1](mahjong/tablet-1024x768/02-human-selected-tile-t1.jpg)

## mahjong @ phone-landscape-844x390

**Results:** `東區小八 2台`

No layout issues detected.

Screenshots: [initial-deal](mahjong/phone-landscape-844x390/01-initial-deal.jpg) · [chatbox-opened](mahjong/phone-landscape-844x390/02-chatbox-opened.jpg) · [human-selected-tile-t1](mahjong/phone-landscape-844x390/03-human-selected-tile-t1.jpg) · [ting-hint-popover](mahjong/phone-landscape-844x390/04-ting-hint-popover.jpg) · [human-selected-tile-t6](mahjong/phone-landscape-844x390/05-human-selected-tile-t6.jpg) · [claim-panel-pong-chow-chow-chow](mahjong/phone-landscape-844x390/06-claim-panel-pong-chow-chow-chow.jpg) · [human-selected-tile-t12](mahjong/phone-landscape-844x390/07-human-selected-tile-t12.jpg) · [settlement-modal](mahjong/phone-landscape-844x390/08-settlement-modal.jpg)

## mahjong @ phone-portrait-390x844

No layout issues detected.

Screenshots: [rotate-notice](mahjong/phone-portrait-390x844/01-rotate-notice.jpg) · [initial-deal](mahjong/phone-portrait-390x844/02-initial-deal.jpg) · [human-selected-tile-t1](mahjong/phone-portrait-390x844/03-human-selected-tile-t1.jpg)

## poker @ desktop-1920x1080

**Results:** `hand 1: 貓咪 (AI) 以 順子 (Straight) 贏得籌碼 $990`

No layout issues detected.

Screenshots: [initial-deal](poker/desktop-1920x1080/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/desktop-1920x1080/02-my-turn-preflop-h1.jpg) · [hand1-result](poker/desktop-1920x1080/03-hand1-result.jpg)

## poker @ laptop-1366x768

**Results:** `hand 1: 快樂小鹿 #463 (你) 以 兩對 (Two Pair) 贏得籌碼 $1400` · `hand 2: 熊熊 (AI) 以 對子 (One Pair) 贏得籌碼 $40` · `hand 3: 快樂小鹿 #463 (你) 以 兩對 (Two Pair) 贏得籌碼 $120` · `hand 4: 貓咪 (AI) 以 兩對 (Two Pair) 贏得主池 $1960；熊熊 (AI) 以 兩對 (Two Pair) 贏得邊池 1 $210；快樂小鹿 #463 (你), 兔兔 (AI) 以 對子 (One Pair) 贏得邊池 2 $100` · `hand 5: 貓咪 (AI) 以 順子 (Straight) 贏得主池 $630；貓咪 (AI) 以 順子 (Straight) 贏得邊池 1 $1185`

**Notes:**
- `switched to 豪客場 $100/$200 to exercise all-in paths`

No layout issues detected.

Screenshots: [initial-deal](poker/laptop-1366x768/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/laptop-1366x768/02-my-turn-preflop-h1.jpg) · [my-turn-flop-h1](poker/laptop-1366x768/03-my-turn-flop-h1.jpg) · [my-turn-turn-h1](poker/laptop-1366x768/04-my-turn-turn-h1.jpg) · [my-turn-river-h1](poker/laptop-1366x768/05-my-turn-river-h1.jpg) · [hand1-result](poker/laptop-1366x768/06-hand1-result.jpg) · [my-turn-preflop-h2](poker/laptop-1366x768/07-my-turn-preflop-h2.jpg) · [my-turn-flop-h2](poker/laptop-1366x768/08-my-turn-flop-h2.jpg) · [my-turn-turn-h2](poker/laptop-1366x768/09-my-turn-turn-h2.jpg) · [my-turn-river-h2](poker/laptop-1366x768/10-my-turn-river-h2.jpg) · [hand2-result](poker/laptop-1366x768/11-hand2-result.jpg) · [my-turn-preflop-h3](poker/laptop-1366x768/12-my-turn-preflop-h3.jpg) · [my-turn-flop-h3](poker/laptop-1366x768/13-my-turn-flop-h3.jpg) · [my-turn-turn-h3](poker/laptop-1366x768/14-my-turn-turn-h3.jpg) · [my-turn-river-h3](poker/laptop-1366x768/15-my-turn-river-h3.jpg) · [hand3-result](poker/laptop-1366x768/16-hand3-result.jpg) · [my-turn-preflop-h4](poker/laptop-1366x768/17-my-turn-preflop-h4.jpg) · [my-turn-flop-h4](poker/laptop-1366x768/18-my-turn-flop-h4.jpg) · [my-turn-turn-h4](poker/laptop-1366x768/19-my-turn-turn-h4.jpg) · [my-turn-river-h4](poker/laptop-1366x768/20-my-turn-river-h4.jpg) · [hand4-result](poker/laptop-1366x768/21-hand4-result.jpg) · [my-turn-preflop-h5](poker/laptop-1366x768/22-my-turn-preflop-h5.jpg) · [my-turn-flop-h5](poker/laptop-1366x768/23-my-turn-flop-h5.jpg) · [my-turn-turn-h5](poker/laptop-1366x768/24-my-turn-turn-h5.jpg) · [hand5-result](poker/laptop-1366x768/25-hand5-result.jpg)

## poker @ tablet-1024x768

**Results:** `hand 1: 貓咪 (AI) 以 順子 (Straight) 贏得籌碼 $650`

No layout issues detected.

Screenshots: [initial-deal](poker/tablet-1024x768/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/tablet-1024x768/02-my-turn-preflop-h1.jpg) · [hand1-result](poker/tablet-1024x768/03-hand1-result.jpg)

## poker @ phone-landscape-844x390

**Results:** `hand 1: 熊熊 (AI) 以 兩對 (Two Pair) 贏得籌碼 $495` · `hand 2: 貓咪 (AI) 以 對子 (One Pair) 贏得籌碼 $755` · `hand 3: 幸運小鴨 #958 (你), 兔兔 (AI) 以 兩對 (Two Pair) 贏得籌碼 $40` · `hand 4: 兔兔 (AI) 以 對子 (One Pair) 贏得籌碼 $80` · `hand 5: 貓咪 (AI) 以 高牌 (High Card) 贏得籌碼 $400`

**Notes:**
- `switched to 豪客場 $100/$200 to exercise all-in paths`

No layout issues detected.

Screenshots: [initial-deal](poker/phone-landscape-844x390/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/phone-landscape-844x390/02-my-turn-preflop-h1.jpg) · [my-turn-flop-h1](poker/phone-landscape-844x390/03-my-turn-flop-h1.jpg) · [my-turn-turn-h1](poker/phone-landscape-844x390/04-my-turn-turn-h1.jpg) · [my-turn-river-h1](poker/phone-landscape-844x390/05-my-turn-river-h1.jpg) · [hand1-result](poker/phone-landscape-844x390/06-hand1-result.jpg) · [my-turn-preflop-h2](poker/phone-landscape-844x390/07-my-turn-preflop-h2.jpg) · [my-turn-flop-h2](poker/phone-landscape-844x390/08-my-turn-flop-h2.jpg) · [my-turn-turn-h2](poker/phone-landscape-844x390/09-my-turn-turn-h2.jpg) · [my-turn-river-h2](poker/phone-landscape-844x390/10-my-turn-river-h2.jpg) · [hand2-result](poker/phone-landscape-844x390/11-hand2-result.jpg) · [my-turn-preflop-h3](poker/phone-landscape-844x390/12-my-turn-preflop-h3.jpg) · [my-turn-flop-h3](poker/phone-landscape-844x390/13-my-turn-flop-h3.jpg) · [my-turn-turn-h3](poker/phone-landscape-844x390/14-my-turn-turn-h3.jpg) · [my-turn-river-h3](poker/phone-landscape-844x390/15-my-turn-river-h3.jpg) · [hand3-result](poker/phone-landscape-844x390/16-hand3-result.jpg) · [my-turn-preflop-h4](poker/phone-landscape-844x390/17-my-turn-preflop-h4.jpg) · [my-turn-flop-h4](poker/phone-landscape-844x390/18-my-turn-flop-h4.jpg) · [my-turn-turn-h4](poker/phone-landscape-844x390/19-my-turn-turn-h4.jpg) · [my-turn-river-h4](poker/phone-landscape-844x390/20-my-turn-river-h4.jpg) · [hand4-result](poker/phone-landscape-844x390/21-hand4-result.jpg) · [my-turn-preflop-h5](poker/phone-landscape-844x390/22-my-turn-preflop-h5.jpg) · [hand5-result](poker/phone-landscape-844x390/23-hand5-result.jpg)

## poker @ phone-portrait-390x844

**Results:** `hand 1: 兔兔 (AI), 貓咪 (AI) 以 葫蘆 (Full House) 贏得籌碼 $1630`

No layout issues detected.

Screenshots: [initial-deal](poker/phone-portrait-390x844/01-initial-deal.jpg) · [my-turn-preflop-h1](poker/phone-portrait-390x844/02-my-turn-preflop-h1.jpg) · [hand1-result](poker/phone-portrait-390x844/03-hand1-result.jpg)
