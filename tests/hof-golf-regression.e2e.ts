// Regression test: play HOF Golf on a fixed route and check the score.
//
// The route starts on the 1997 Detroit Tigers (no Hall of Famers). Each round
// picks a player on the current roster, then one of that player's seasons on
// another team. `points` is the game total after landing on that team. Two
// Hall of Famers return on later rosters (Mussina, Fisk) and must not score
// twice. The visited teams have a winning record, so there is no +5 bonus.
//
// Agent steps do the navigation. Exact assertions check each round's score.
// Recorded agent steps in .e2e/cache replay without a model call.
import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";

const START_TEAM = "1997 Detroit Tigers";

const ROUTE = [
  {
    player: "Tony Clark",
    season: "2004, NYA",
    team: "2004 New York Yankees",
    points: 3,
  },
  {
    player: "Mike Mussina",
    season: "1995, BAL",
    team: "1995 Baltimore Orioles",
    points: 5,
  },
  {
    player: "Harold Baines",
    season: "1983, CHA",
    team: "1983 Chicago White Sox",
    points: 6,
  },
  {
    player: "Carlton Fisk",
    season: "1975, BOS",
    team: "1975 Boston Red Sox",
    points: 8,
  },
  {
    player: "Fred Lynn",
    season: "1981, CAL",
    team: "1981 California Angels",
    points: 9,
  },
  {
    player: "Rod Carew",
    season: "1977, MIN",
    team: "1977 Minnesota Twins",
    points: 9,
  },
  {
    player: "Larry Hisle",
    season: "1978, ML4",
    team: "1978 Milwaukee Brewers",
    points: 11,
  },
  {
    player: "Paul Molitor",
    season: "1993, TOR",
    team: "1993 Toronto Blue Jays",
    points: 14,
  },
  {
    player: "Rickey Henderson",
    season: "1989, OAK",
    team: "1989 Oakland Athletics",
    points: 16,
  },
] as const;

const FINAL_SCORE = 16;

test(
  "HOF Golf: fixed route from the 1997 Tigers scores 16",
  { timeout: 25 * 60_000 },
  async ({ agent, app, screen }) => {
    await app.open();

    // A game left over from an earlier run opens the resume dialog
    const abandon = screen.getByText("Abandon Game");
    if ((await abandon.count()) > 0) {
      await abandon.tap();
    }

    await agent.act(
      `Open the "HOF Golf" game. For the starting team, select "Choose", ` +
        `then open the team picker and select the ${START_TEAM}. ` +
        `Keep the timer on "Untimed". Then tap "Play".`,
    );
    // Play shows a 3-second countdown, then the starting roster
    const status = screen.getByTestId("game-status-bar");
    await expect(status).toContainText(/Rd 1\/9/, { timeout: 30_000 });
    await expect(status).toContainText(/\b0 pts/);

    for (const [i, step] of ROUTE.entries()) {
      await agent.act(
        `On the roster, tap the player "${step.player}". ` +
          `On his player page, scroll to his seasons and tap the "${step.season}" season row.`,
      );
      // The last pick ends the game: the round counter stays at 9/9
      const round = Math.min(i + 2, 9);
      await expect(status).toContainText(new RegExp(`Rd ${round}/9`), {
        timeout: 30_000,
      });
      await expect(status).toContainText(new RegExp(`\\b${step.points} pts`));
      await expect(screen.getByText(step.team).first()).toBeVisible();
    }

    await expect(status).toContainText(/Game complete!/);
    await screen.getByText("Continue").tap();
    await expect(screen.getByTestId("final-score")).toHaveText(
      String(FINAL_SCORE),
      {
        timeout: 30_000,
      },
    );
  },
);
