I want to make a weekly football (soccer) game web app called WNF (Wednesday Night Football). Every week there is a game - typically Wednesday at 9pm - 10pm. Players register their interest within a registration window and once the registration window is over the players are selected by their XP.

Their XP is calculated by their Caps (number of games previously played) + or - any modifiers (bonuses or penalties), The web app should handle calculating the team sheet each week and auto balancing the teams based on defence and attack ability values out of 10. Each player should have the ability to log in and create their profile, and see their stats (Caps, XP, Active Bonuses, Active Penalties etc). We don't log historical match results so don't need to track goals scored or clean sheets or anything like that. We do tend to track overall scores so it would be good for players to see their historical win rate as a percentage for example. All players should be able to browse other players. Players should look like collectable cards or FIFA ultimate cards.

Players should have the ability to rate other players (attack and defence) from 0 - 10 based on the following conditions. The player doing the rating has a minimum of 10 caps, and the player receiving the rating has played a minimum of 10 caps.

Anyone who doesn't make it into the teamsheet each week should be listed as a reserve, and if anyone drops out before the game, the reserves should be contacted (ideally via some sort of whatsapp bot integration, but also email), users to configure notification preferences in their dashboard.

The admin should have a separate portal with the ability to create games, and also run game over fuctions which would do things like everyone who played gets their Caps value increased by 1, and link to send payment out to all those that played via a Monzo link. Visibile in each players portal. Admin can mark players as paid or not paid. Players can see what previous games they've played, the scores, and whether they've paid or not. The admin needs read/write access over everyone's profile to be able to edit any and all attributes. One of the admins will be a super admin and will have the ability to grant other users admin access.

After each match players should be able to cast one vote for man of the match. Users should be able to see their number of previous man of the match awards. Users should have a public profile visible to other users. Users should have the ability to upload profile photos. Also set favourite position. Positions should be "GK, LB, CB, RB, RM, CM, LM, ST".

Bonuses and penalties are temporary modifiers that may last a specific amount of time (configurable via admin). Penalties are for things like dropping out of the game on the day of the game (i.e. not giving enough time to find a replacement player). Or previous games unpaid.

Bonuses are things like accepting a last minute slot (from someone else dropping out) on the day of the game. Or recent man of the match award.

Each bonus or penalty should be worth 0.1. Say a player has 1 active bonus, and has played 10 games, it would be XP = Caps * (1 + 0.1) = 11

Say a player has 1 active penalty, and has played 10 games, it would be XP = Caps * (1 - 0.1) = 9 

If a player has 1 active bonus and 1 active penalty, they would effectively cancel each othr out. i.e. their XP = Caps * (1 + 0.1 - 0.1) = 10 

If a player has 2 active bonuses and 0 active penalties and has played 10 games, XP = Caps * (1 + 0.1 + 0.1) = 12

If a player has 2 active bonuses and 1 active penalty  and has played 10 games, XP = Caps * (1 + 0.1 + 0.1 - 0.1) = 11

Bonuses would also be rewarded for a streak of attending consecutive matches without missing one, i.e. for every week in a row where they've attended they get an additional 0.1 modifier to their * (1 + modifier) bonus. 
For example, if they attend 10 weeks in a row then it should be XP = Caps * (1 + 0.9). This should reset as soon as they miss a game.

Bonuses and penalties should be visible to all players in public profiles, and also should look like circular badges kind of like xbox gamer achievements.

Player skill ratings should be not visible to that player or other players, but should all be visible to the admin.

Just some more context, each game is 9vs9 (18 players) any more interest registered should go onto the reserve list (again, sorted by XP from highest to lowest - therefore favouring players who have been playing the longest or have the most bonuses). Each player should be able to set a friendly name in their profile which is how it will appear on the teamsheet, and needs to be unique.

I would like to add historic game information via CSV of who was on what team (Blue or Orange are always team names), what the score was, what the outcome was (win, lose, draw). Allow for scores and overall outcomes to be unknown as some of the historic games we didn't keep score or log it down. All win rates and stats should not take into account games where score or outcome was unknown.

I want users to be assigned an avatar by default ideally random with a football theme, but users can replace this with a profile picture if desired.

I want all the players to be listed and shown as collectable cards, with their stats on the front and a WNF logo on the back. There should be the ability to flip the card and click on each card to see more details. 

On the card should show users XP, preferred position, Friendly Name, and any active bonuses/penalties that they currently have. Further details should show things like current streak and longest streak, as well as win ratio etc. Please factor this requirement in when deciding on the tech stack. 

Cards should be given a rarity based on their XP values, in relation to everyone else's XP values. i.e.

Common: bottom 49-50%
Uncommon: top ~32-33%
Rare: top ~12-15%
Epic: top ~3-4%
Legendary: top ~1%

The tech stack should be Supabase Auth and Supabase Database, React, Vite, Tailwind CSS, Daisy UI, and Framer Motion for animations. Toast for notifications.

Please put all API keys in .env files as necessary.

Split all code up to be as modular as possible. I'd rather have a lot of small files than one large file, from an administrative perspective this is easier to manage.