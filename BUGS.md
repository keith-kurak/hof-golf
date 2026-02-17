## Bugs

~~- doesn't show team name in header after going from player to team~~
~~- shouldn't have back buttons during game~~

- sort sp by ip
- on a timeout, show why you got zero points / don't show +1's
  ~~- add missing 2026 hall of famers~~
- pitcher/batter check is clumsy (See Tom House)
  ~~- "finished" error~~
  ~~- check manager logic - didn't pick up dusty baker in hof mode~~
- not obvious when a player doesn't count
  ~~- bottom button safe area~~
  ~~- history safe area~~
  ~~- nav bug (probably just need to suppress)~~
  ~~- cut off big text~~
  ~~- didn't cut off pre-1947~~
  ~~- crash when browsing outside game mode~~

## changes

~~- don't show as much player/team header info during game~~
~~- show detail when tapping on status~~
~~- message/ toast area~~
~~- don't show cumulative record~~
~~- show detail on history~~

- filter for history/results
- haptics
- refactor game state into hook for less duplicate code
- confirmation when picking player

## Refactor

- useGame() hook
- in [playerId], move all game update logic to the other side (after navigating to the next team)
