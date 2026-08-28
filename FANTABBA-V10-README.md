# FantAbba V10

## Core philosophy
FantAbba is an auction decision system, not a player list. Default league: 8 managers, 500 credits, Classic 3-8-8-6.

### Data hierarchy
1. Observed 8x500 auction average when available.
2. External benchmark when available.
3. Transparent model estimate otherwise.

### Auction decision
The War Room accepts the live auction price manually and returns a decision using market reference, remaining budget and remaining roster slots. The user does not need to choose the target first.

### Squad optimizer
The optimizer must satisfy 3 P, 8 D, 8 C, 6 A and <=500 credits. Porters are treated as a strategic block; future versions can add full 38-round fixture optimization without changing the auction core.

### Important limitation
No fantasy model can guarantee winning. The app must never present an estimate as a real auction average and must fail visibly when data are insufficient.
