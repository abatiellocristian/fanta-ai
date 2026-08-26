# FantAbba data contract

The frontend must treat these fields as distinct:
- `quotation`: official list price
- `fvm`: official FVM
- `auctionAvg8x500`: observed average for 7-8 teams / 500 credits when available
- `auctionAvg8x500Season`: season of the observed average
- `auctionSample8x500`: number of observed auctions, if available
- `auctionSource`: source URL/name
- `dataConfidence`: real / historical / insufficient
- `team`, `role`
- optional performance fields: `media`, `fantamedia`, `presenze`, `gol`, `assist`
- optional fixture fields supplied by a trusted importer

Never present a calculated estimate as an observed auction price. If an observed 2026/27 8x500 price is unavailable, show N/D and label any fallback as an estimate.
