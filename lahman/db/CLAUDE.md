# Database

SQLite database with customer/order data migrated from SQL Server.

## Tables

2.0 Data Tables

The design follows these general principles. Each player is assigned a unique number (playerID). All of the information relating to that player
is tagged with his playerID. The playerIDs are linked to names and birthdates in the People table.

The database is comprised of the following main tables:

People Player names and biographical information

Teams Yearly stats and standings
TeamFranchises Franchise information
Parks List of major league ballparks

Batting Batting statistics
Pitching Pitching statistics
Fielding Fielding statistics
FieldingOF Outfield position data for years where LF/CF/RF fielding data is available, until 1955
FieldingOFsplit LF/CF/RF game played splits for all years, including those where LF/CF/RF fielding data is not available

Appearances Details on the positions a player appeared during a season
Managers Managerial statistics

It is supplemented by these tables:

AllStarFull All-Star appearances

BattingPost Post-season batting statistics
PitchingPost Post-season pitching statistics
FieldingPost Post-season fielding data
SeriesPost Post-season series information

HomeGames Number of home games played by each team in each ballpark
ManagersHalf Split season data for managers
TeamsHalf Split season data for teams

AwardsManagers Awards won by managers
AwardsPlayers Awards won by players
AwardsShareManagers Award voting data for manager awards
AwardsSharePlayers Award voting data for player awards
HallofFame Hall of Fame voting data

CollegePlaying List of players and the colleges they attended (last updated 2014)
Salaries Player salary data (last updated 2016)
Schools List of colleges that players attended (last updated 2014)

---

PEOPLE TABLE

ID Numeric ID, not used anywhere else.
playerID A unique code assigned to each player. The playerID links the data in this file with records in the other files.
birthYear Year player was born
birthMonth Month player was born
birthDay Day player was born
birthCity City where player was born
birthCountry Country where player was born
birthState State where player was born
deathYear Year player died
deathMonth Month player died
deathDay Day player died
deathCountry Country where player died
deathState State where player died
deathCity City where player died
nameFirst Player's first name
nameLast Player's last name
nameGiven Player's given name (typically first and middle)
weight Player's weight in pounds
height Player's height in inches
bats Player's batting hand (left, right, or both)  
throws Player's throwing hand (left or right)
debut Date that player made first major league appearance
bbrefID ID used by Baseball Reference website
finalGame Date that player made last major league appearance
retroID ID used by Retrosheet

---

TEAMS TABLE

yearID Year
lgID League
teamID Team
franchID Franchise (links to TeamsFranchise table)
divID Team's division
Rank Position in final standings
G Games played
GHome Games played at home
W Wins
L Losses
DivWin Division Winner (Y or N)
WCWin Wild Card Winner (Y or N)
LgWin League Champion (Y or N)
WSWin World Series Winner (Y or N)
R Runs scored
AB At bats
H Hits by batters
2B Doubles
3B Triples
HR Homeruns by batters
BB Walks by batters
SO Strikeouts by batters
SB Stolen bases
CS Caught stealing
HBP Batters hit by pitch
SF Sacrifice flies
RA Opponents runs scored
ER Earned runs allowed
ERA Earned run average
CG Complete games
SHO Shutouts (team level)
SV Saves
IPOuts Outs Pitched (innings pitched x 3)
HA Hits allowed
HRA Homeruns allowed
BBA Walks allowed
SOA Strikeouts by pitchers
E Errors
DP Double Plays (team level)
FP Fielding percentage
name Team's full name
park Name of team's home ballpark
attendance Home attendance total
BPF Three-year park factor for batters
PPF Three-year park factor for pitchers
teamIDBR Team ID used by Baseball Reference website
teamIDlahman45 Team ID used in Lahman database version 4.5
teamIDretro Team ID used by Retrosheet

---

TEAM FRANCHISES TABLE

franchID Franchise ID
franchName Franchise name
active Whether team is currently active or not (Y or N)
NAassoc ID of National Association team franchise played as

---

PARKS TABLE

parkkey Ballpark ID code
parkname Name of ballpark
parkalias Alternate names of ballpark, separated by semicolon
city City
state State
country Country

---

BATTING TABLE

playerID Player ID code
yearID Year
stint player's stint (order of appearances within a season)
teamID Team
lgID League
G Games
AB At Bats
R Runs
H Hits
2B Doubles
3B Triples
HR Homeruns
RBI Runs Batted In
SB Stolen Bases
CS Caught Stealing
BB Base on Balls
SO Strikeouts
IBB Intentional walks
HBP Hit by pitch
SH Sacrifice hits
SF Sacrifice flies
GIDP Grounded into double plays

---

PITCHING TABLE

playerID Player ID code
yearID Year
stint player's stint (order of appearances within a season)
teamID Team
lgID League
W Wins
L Losses
G Games
GS Games Started
CG Complete Games
SHO Shutouts
SV Saves
IPOuts Outs Pitched (innings pitched x 3)
H Hits
ER Earned Runs
HR Homeruns
BB Walks
SO Strikeouts
BAOpp Opponent's Batting Average
ERA Earned Run Average
IBB Intentional Walks
WP Wild Pitches
HBP Batters Hit By Pitch
BK Balks
BFP Batters faced by Pitcher
GF Games Finished
R Runs Allowed
SH Sacrifices by opposing batters
SF Sacrifice flies by opposing batters
GIDP Grounded into double plays by opposing batter

---

FIELDING TABLE

playerID Player ID code
yearID Year
stint player's stint (order of appearances within a season)
teamID Team
lgID League
Pos Position
G Games
GS Games Started
InnOuts Time played in the field expressed as outs
PO Putouts
A Assists
E Errors
DP Double Plays
PB Passed Balls (by catchers)
WP Wild Pitches (by catchers)
SB Opponent Stolen Bases (by catchers)
CS Opponents Caught Stealing (by catchers)
ZR Zone Rating

---

FIELDING OF TABLE

playerID Player ID code
yearID Year
stint Player's stint (order of appearances within a season)
Glf Games played in left field
Gcf Games played in center field
Grf Games played in right field

---

FIELDING OF SPLIT TABLE

playerID Player ID code
yearID Year
stint Player's stint (order of appearances within a season)
teamID Team
lgID League
Pos Position
G Games
GS Games Started
InnOuts Time played in the field expressed as outs
PO Putouts
A Assists
E Errors
DP Double Plays

---

APPEARANCES TABLE

yearID Year
teamID Team
lgID League
playerID Player ID code
G_all Total games played
GS Games started
G_batting Games in which player batted
G_defense Games in which player appeared on defense
G_p Games as pitcher
G_c Games as catcher
G_1b Games as first baseman
G_2b Games as second baseman
G_3b Games as third baseman
G_ss Games as shortstop
G_lf Games as left fielder
G_cf Games as center fielder
G_rf Games as right fielder
G_of Games as outfielder (if a player appeared in a single game at multiple OF positions, this will count as one g_OF game)
G_dh Games as designated hitter
G_ph Games as pinch hitter
G_pr Games as pinch runner

---

MANAGERS TABLE

playerID Player ID Number
yearID Year
teamID Team
lgID League
inseason Managerial order, in order of appearance during the year. One if the individual managed the team the entire year.
G Games managed
W Wins
L Losses
rank Team's final position in standings that year
plyrMgr Player Manager (denoted by 'Y')

---

ALL STAR FULL TABLE

playerID Player ID code
YearID Year
gameNum Game number (zero if only one All-Star game played that season)
gameID Retrosheet ID for the game
teamID Team
lgID League
GP 1 if Played in the game
startingPos If player was game starter, the position played, can have multiple positions listed

---

BATTING POST TABLE

yearID Year
round Level of playoffs
playerID Player ID code
teamID Team
lgID League
G Games
AB At Bats
R Runs
H Hits
2B Doubles
3B Triples
HR Homeruns
RBI Runs Batted In
SB Stolen Bases
CS Caught stealing
BB Base on Balls
SO Strikeouts
IBB Intentional walks
HBP Hit by pitch
SH Sacrifices
SF Sacrifice flies
GIDP Grounded into double plays

---

PITCHING POST TABLE

playerID Player ID code
yearID Year
round Level of playoffs
teamID Team
lgID League
W Wins
L Losses
G Games
GS Games Started
CG Complete Games
SHO Shutouts
SV Saves
IPOuts Outs Pitched (innings pitched x 3)
H Hits
ER Earned Runs
HR Homeruns
BB Walks
SO Strikeouts
BAOpp Opponents' batting average
ERA Earned Run Average
IBB Intentional Walks
WP Wild Pitches
HBP Batters Hit By Pitch
BK Balks
BFP Batters faced by Pitcher
GF Games Finished
R Runs Allowed
SH Sacrifice Hits allowed
SF Sacrifice Flies allowed
GIDP Grounded into Double Plays

---

FIELDING POST TABLE

playerID Player ID code
yearID Year
teamID Team
lgID League
round Level of playoffs
Pos Position
G Games
GS Games Started
InnOuts Time played in the field expressed as outs (innings played x 3)
PO Putouts
A Assists
E Errors
DP Double Plays
TP Triple Plays
PB Passed Balls
SB Stolen Bases allowed (by catcher)
CS Caught Stealing (by catcher)

---

SERIES POST TABLE

yearID Year
round Level of playoffs
teamIDwinner Team ID of the team that won the series
lgIDwinner League ID of the team that won the series
teamIDloser Team ID of the team that lost the series
lgIDloser League ID of the team that lost the series
wins Wins by team that won the series
losses Losses by team that won the series
ties Tie games

---

HOME GAMES TABLE

yearkey Year
leaguekey League
teamkey Team ID
parkkey Ballpark ID
spanfirst Date of first game played
spanlast Date of last game played
games Total number of games
openings Total number of paid dates played (games with attendance, note that doubleheaders may make the openings less than games)
attendance Total attendance

---

MANAGERS HALF TABLE

playerID Manager ID code
yearID Year
teamID Team
lgID League
inseason Managerial order, in order of appearance during the year, 1 if the individual managed the team the entire year
half First or second half of season
G Games managed
W Wins
L Losses
rank Team's position in standings for the half

---

TEAMS HALF TABLE

yearID Year
lgID League
teamID Team
half First or second half of season
divID Division
DivWin Won Division (Y or N)
rank Team's position in standings for the half
G Games played
W Wins
L Losses

---

AWARDS MANAGERS TABLE

playerID Manager ID code
awardID Name of award won
yearID Year
lgID League
tie Award was a tie (Y or N)
notes Notes about the award

---

AWARDS PLAYERS TABLE

playerID Player ID code
awardID Name of award won
yearID Year
lgID League
tie Award was a tie (Y or N)
notes Notes about the award

---

AWARDS SHARE MANAGERS TABLE

awardID Name of award votes were received for
yearID Year
lgID League
playerID Manager ID code
pointsWon Number of points received
pointsMax Maximum number of points possible
votesFirst Number of first place votes

---

AWARDS SHARE PLAYERS TABLE

awardID Name of award votes were received for
yearID Year
lgID League
playerID Player ID code
pointsWon Number of points received
pointsMax Maximum number of points possible
votesFirst Number of first place votes

---

HALL OF FAME TABLE

playerID Player ID code
yearID Year of ballot
votedBy Method by which player was voted upon
ballots Total ballots cast in that year
needed Number of votes needed for selection in that year
votes Total votes received
inducted Whether player was inducted by that vote or not (Y or N)
category Category in which candidate was honored
needed_note Explanation of qualifiers for special elections, revised in 2023 to include important notes about the record.

---

COLLEGE PLAYING TABLE

playerid Player ID code
schoolID School ID code
yearID Year

---

SALARIES TABLE

yearID Year
teamID Team
lgID League
playerID Player ID code
salary Salary

---

SCHOOLS TABLE

schoolID School ID code
schoolName School name
schoolCity City where school is located
schoolState State where school's city is located
schoolNick Nickname for school's baseball team

## Notes

---

2.1 Notes on Negro League data

---

Seamheads data for the Negro League is now in the database. The data here constitutes major league data as per SABR's recommendations from
Feb 11, 2021 (https://sabr.org/latest/sabr-negro-leagues-task-force-issues-recommendations-on-major-league-status/) and Jun 3, 2024
(https://sabr.org/latest/sabr-special-committee-acknowledges-1949-50-negro-american-league-independent-black-baseball-teams-as-major-league-caliber/).

The recovery of this data is an ongoing process, and changes can and will occur when new sources are located and compiled. The definitions of
the teams and games that qualify as major leagues may also differ across datasets (SABR, Seamheads, MLB, Retrosheet, Baseball Reference, etc.)
This database reflects SABR's current recommendations.

Playing level of data
All Negro League data within the Lahman database reflects major league caliber league and independent team competition. It does not include exhibitions
of any level (majors, minors, or semi-pro), nor does it include games within Cuban leagues. In all cases below, read any reference to data, stats, games,
teams, leagues, etc. within this context.

NULLs
Missing data within the Negro Leagues dataset will be represented by NULL values, rather than zeros, in the same way that existing National League
seasons in the 1800s may have NULL values for caught stealing. In both cases, the NULLs represent that the value is unknown. First names can also have
NULLs.

The 1939 Toledo Crawfords played in two leagues
Given the barnstorming nature of major league teams of Black baseball and the Negro Leagues, it is feasible that a single team may play within
more than a single league that qualifies as major league (or within a major league and barnstorming/independent games that qualify as major league) in a single
year.

Currently, there are no teams that played both major league games and barnstorming/independent games that qualify as major league in a single year.

There is one team that played in more than one major league in a single year, the 1939 Toledo Crawfords, who played in the Negro American League and the second
Negro National League. Within this database, this is represented as two separate team IDs for 1939 (TC and TC2) that belong to one franchise (PC). This is a
unique situation within the database, and we believe it is the best way to present this data. However, it is atypical and therefore specially noted here.

On colleges
Seamheads has compiled a good list of colleges for people within the dataset. When reviewing this data, I discovered that many of the schools still existed
under different names. Many were already in the Lahman school list. I briefly considered keying the old data to the current schools, but I declined to do
that for the sake of keeping the history intact. I also did not want to change the table schema or have the name field of the college be a list of names.
I decided to take these old names of the schools and put them as new rows in the Schools table, but use the key for the current school with a year suffix
that corresponds to the first year that name was used.

As a practical example, Howard Millon attended Illinois State Normal University. Today, this school is known as Illinois State University. It was called
Illinois State Normal University from 1957-1964. In order to keep the identity of the school as it was when Millon attended, there will be a new school
record for Illinois State Normal University with a schoolID of illinoisst1857, which will tie it to Illinois State University, which has a schoolID of illinoisst.
I have also taken a school like New Orleans University, which exists today as Dillard University, and given it the key of dillard1869.

The Negro League college data lacks years, so the years in here will be NULL.

Team and Player level data
Due to the incomplete nature of Negro League data, there may be instances where game-level data is available but player-level data is not available. This can result
in player-level data not adding up to team level data.

Team record against all teams versus team record within league
Teams within leagues also played games outside of league competition against independent major league caliber Negro League teams. Because of this most Seamheads
team records will have wins, losses, and ties within the league and against all clubs. For the first iteration of Lahman, the records on the team table will reflect
the league level w/l/t data. For independent teams that lacked a league, the same data will reflect their record against all teams.

Player data against all teams versus within league
All player-level data is in the context of against all teams.

AllstarFull
There are six new "Leagues" within the data: NOS (North All Stars) and SAS (South All Stars) from the North-South series, WES (West All Stars) and EAS (East All Stars)
from the East-West series, and NNN (Negro National League II North All Stars) and NNS (Negro National League II South All Stars). Teams for the players will reflect the
primary team they were on that season (in terms of games played). There are cases where the only major league games that were played in that season were the All Star
Games, and in these cases I have looked back one season, then forward one season, then back two seasons, etc. until I located a team. There are two players in the
data who only played on the All Star team during their known major league career. S. M. Humphries in 1937 (who played on the independent non-major league Atlanta
Black Crackers) and Peppy Collins in 1939 (who has no other major league playing record). GameNum and gameID will be NULL, as we have the cumulative data for the year
not individual games within this dataset. With this, the startingPos field can have multiple positions, in a format like 3;6, if the player started one game at 1B and
another game at SS. The order of the data does not indicate the first or second game of a multiple-game record.

Appearances
GS will be NULL for many seasons. G_defense and g_of, both of which record distinct games on defense, not a simple sum of positional data. The dataset does not include
this level of granularity to tell when a player appeared at multiple positions during the same game.

FieldingOF
FieldingOF is not used as all the data is at the LF/CF/RF level.

Managers
Some teams do not have a known manager and these teams will not have a record within the Manager table.

ManagersHalf
There were several seasons with First and Second half champions for many Negro Leagues between 1925-1948. The exact records and standings are not within the
dataset for each half. Therefore, the ManagersHalf table will not have any data for the Negro Leagues at this time.

SeriesPost and other Post tables
Round IDs are:
ALC (NAL Championship Series)
NWS (Negro League World Series)
NNC (NNL I Championship Series)
NLC (NNL II Championship Series)
NLP (NNL II Playoff Series)
NSC (NSL Championship Series)

TeamsHalf
There were several seasons with First and Second half champions for many Negro Leagues between 1925-1948. The exact records and standings are not within the
dataset for each half. However, the TeamsHalf table has been updated with the known First and Second half champions, leaving the record blank with a Rank of 1.
Other teams outside the first place finish are not recorded in the table.
