/**
 * Changelog data structure
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    type: 'Added' | 'Changed' | 'Fixed';
    items: {
      title: string;
      details?: string;
    }[];
  }[];
}

/**
 * Changelog data containing all version information
 */
export const changelogData: ChangelogEntry[] = [
  {
    version: '2.2.0',
    date: '21/02/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Goal Assists',
            details: "When adding a goal highlight, you can now optionally credit the player who set it up with an assist. The assist dropdown shows teammates from the scoring team (excluding the scorer). Assists are displayed with an \u{1F170}\uFE0F badge next to the scorer on highlight cards."
          },
          {
            title: 'Own Goals',
            details: "Goals can now be marked as own goals. When toggled, the goal credit automatically flips to the opposing team. Own goals display with a red-tinted '(OG)' badge and a dashed red border on the highlight card. Assists are disabled for own goals."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Scorer Dropdown Updated',
            details: "The goal scorer dropdown now shows all players from both teams regardless of remaining goal capacity. This allows selecting players from a team whose regular goals are full, so they can be marked as own goal scorers."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '2.1.0',
    date: '21/02/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Man of the Match Voting',
            details: "After every completed game, participants can now vote for their Man of the Match! Voting is open for 7 days after the game. See who earned the most votes with ranked results, progress bars, and a crown for the winner. You can change or remove your vote at any time during the voting window."
          },
          {
            title: 'Highlight Awards',
            details: "Two new community-voted awards per game: Best Goal (⚽) and Play of the Match (⭐). Vote for your favourite highlights and winning highlights get a trophy/star badge. Award winners are shown in a banner at the top of the highlights section."
          },
          {
            title: 'MOTM on Result Cards',
            details: "The results list now shows the MOTM winner on each game card with a gold crown badge, so you can see at a glance who was voted the best player in each game."
          },
          {
            title: 'MOTM Awards on Profile',
            details: "Your profile now shows your total Man of the Match awards in the stats grid. Collect those crowns!"
          },
          {
            title: 'MOTM Leaderboard',
            details: "A new 'MOTM Leaders' card on the Stats page shows who has the most Man of the Match awards overall."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Game Detail Page Enhanced',
            details: "The game detail page now features MOTM voting between the team rosters and login prompt sections. Highlight awards voting appears below the highlights grid."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Avatar Rendering in MOTM',
            details: "Fixed player avatars not displaying in the MOTM voting section. Avatars now render correctly using the same pattern as team rosters."
          }
        ]
      }
    ]
  },
  {
    version: '2.0.0',
    date: '15/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Public Game History & Results',
            details: "Browse all completed WNF games at /results with filters for year, outcome, and participation. Each game has a dedicated page at /results/WNF# with a Sky Sports-style match report showing score hero, team sheets, match summary, and post-match insights."
          },
          {
            title: 'Individual Game Pages',
            details: "Click any game to see the full match report including: large score display with winner indicator, game metadata (date, venue, player count), collapsible team sheets showing Blue and Orange rosters, match summary highlights, and filterable post-match insights."
          },
          {
            title: 'Personal Highlights Throughout',
            details: "When logged in, you're highlighted everywhere: in team sheets (with ring, bold name, and 'You' badge), in match summary (highlighted rows when you're mentioned), and in post-match insights (your insights have primary-colored rings). Makes it easy to spot yourself!"
          },
          {
            title: 'Smart Insights Display',
            details: "Post-match reports now show the top 12 most important insights by priority, with a 'Show X more insights' button to expand and see everything. Filter by category (Trophies, Streaks, Chemistry, Rivalries, Records) or by specific player."
          },
          {
            title: 'User-Centric Outcome Filters',
            details: "When filtering to 'Games I Played', the outcome filter changes from 'Blue Wins/Orange Wins' to 'My Wins/My Losses' - making it personal! See your victories and defeats regardless of which team color you were on."
          },
          {
            title: 'WhatsApp Summary Link',
            details: "When copying the WhatsApp summary from the admin Post-Match Report, it now automatically includes a link to the public game page (e.g., wnf.app/results/127) so players can view the full report online."
          },
          {
            title: 'Login Incentives',
            details: "Non-logged-in users see prompts to log in for personalized features like 'My Games' filtering and 'My Insights' quick-filter. Links redirect back to the game page after login."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Collapsible Sections',
            details: "Team Sheets and Post-Match Report sections are now collapsible with smooth animations. Click the header to expand/collapse - great for mobile users or when you just want to see the score."
          },
          {
            title: 'Streamlined Match Summary',
            details: "Removed redundant score banner from Match Summary since the score is already prominently displayed in the Score Hero at the top. Now shows just the key highlights."
          },
          {
            title: 'Cleaner Team Sheets',
            details: "Removed caps badges from team sheets - kept the focus on player names and avatars. Your name is highlighted if you played."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: '"You Played" Badge Accuracy',
            details: "The 'You Played' badge on game cards now correctly shows only when you were actually selected to play or were a reserve - not for other registration statuses like 'registered' or 'dropped_out'."
          },
          {
            title: 'Avatar Rendering',
            details: "Fixed player avatars in team sheets that weren't displaying correctly. Now properly renders avatar images."
          }
        ]
      }
    ]
  },
  {
    version: '1.9.0',
    date: '12/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Injury Token System (🩹)',
            details: "Injured during a WNF game? You can now claim an Injury Token to protect your streak. When you return, your streak will be set to 50% of your original value - so a 20-game streak becomes 10, and you build from there. Unlike Shield tokens which need to be earned, Injury tokens are free to use for WNF injuries. Admins can manage claims at /admin/injuries."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Shield Token Clarification',
            details: "The Shield Token status card now includes a callout explaining the difference between Shield (for planned absences like holidays) and Injury tokens (for WNF injuries). This helps players choose the right protection method."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.8.0',
    date: '09/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Team Placement Patterns',
            details: "Player profiles now show who they're most often placed with or against. See their top 5 frequent teammates and top 5 frequent opponents, with percentage breakdowns showing how often they end up on the same team vs opposite teams."
          },
          {
            title: 'Your Team History',
            details: "When viewing another player's profile, you can now see your specific relationship with them - how many times you've been teammates vs opponents. Includes fun tiered messages like 'You two are practically inseparable!' or 'The algorithm keeps putting you on opposite sides!' based on your together percentage."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.7.0',
    date: '09/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Site-Wide Dark Mode',
            details: "WNF now supports dark mode! The app automatically detects your system preference, or you can manually toggle between light and dark modes using the sun/moon button in the header. Your preference is saved and persists across sessions."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Header Icon Consistency',
            details: "Theme toggle and hamburger menu icons now match the notification bell size for visual consistency."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.6.0',
    date: '06/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Dropout with Shield Protection',
            details: "Players who registered but need to drop out can now use their shield token to protect their streak. After registration closes, click 'Drop Out' and choose whether to use a shield. Without a shield, your streak resets to 0. With a shield, it gradually recovers over half the games."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Shield Protection Display',
            details: "Dropped out players with shield protection now show the shield icon on their player cards in both card view and list view."
          }
        ]
      }
    ]
  },
  {
    version: '1.5.0',
    date: '06/01/2026',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Cursed Trio Award',
            details: "The Hall of Fame now features Cursed Trios - the three-player combinations with the worst chemistry. If you and two mates keep losing together, you might just make the leaderboard!"
          },
          {
            title: 'XP Champion Achievement Date',
            details: "The Hall of Fame XP Champion award now shows when each player achieved their highest XP, matching the Stats page display."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Award Card Color Scheme',
            details: "All award cards now use semantic colors with consistent meaning: amber for champions, green for victories, purple for royalty/elite status, pink for chemistry, red for rivalries, and slate for cursed awards. This creates visual consistency across the Stats page and Hall of Fame."
          },
          {
            title: 'Stats & Hall of Fame Consistency',
            details: "The Stats page and Hall of Fame tab now use identical naming, styling, and data display. Awards show the same labels ('chemistry', 'curse', 'rivalry'), W/D/L breakdowns, and font styling across both views."
          },
          {
            title: 'Mobile-Friendly Multi-Player Awards',
            details: "Pair and trio awards (Dynamic Duo, Cursed Duos, Dream Team Trio, etc.) now display properly on mobile devices. Player names wrap instead of being truncated with '...', and scores stack neatly below the names."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.4.0',
    date: '01/01/2026',
    sections: [
      {
        type: 'Changed',
        items: [
          {
            title: 'XP System v2 - Streak Bonus Rebalance',
            details: "The streak bonus was originally designed as a catch-up mechanic to help consistent players climb the rankings. However, it ended up creating runaway leaders with astronomically high XP values - when really all that matters is being ahead of the player behind you. Streak bonuses now use diminishing returns: +10%, +9%, +8%... down to +1% per game after the 10th. Remember: Shield Tokens (earned every 10 games) exist specifically to protect your streak during planned absences like holidays, injuries, or other commitments."
          },
          {
            title: 'XP System v2 - Long-Term Loyalty Rewarded',
            details: "Based on player feedback, games older than 40 now contribute 1 XP each instead of 0. Previously, the system completely forgot your long-term commitment once games aged out. Now your dedication builds up over time - loyal players will have a higher base XP even without streaks. Your history matters."
          },
          {
            title: 'XP System v2 - Smoother Decay Curve',
            details: "Base XP from games now decays gradually (20→19.5→19→18.5...) instead of in arbitrary batches (20→18→16→14...). This is simply more accurate and fair - no more sudden cliff drops when a game crosses into the next bracket."
          },
          {
            title: 'What This Means For You',
            details: "Your XP number will look lower than before, but your ranking should remain almost the same - it's only the raw numbers that have changed."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      },
      {
        type: 'Added',
        items: [
          {
            title: 'N/A',
            details: "No new features in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.3.2',
    date: '18/12/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Player Chemistry System',
            details: "New chemistry stats show which player pairs perform best when on the same team. Chemistry score factors in both win rate and sample size (minimum 10 games together), so larger samples carry more weight. View your chemistry with any player on their profile, see top chemistry partners, and check the Best Chemistry leaderboard on the Stats page."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Stats Page Reorganization',
            details: "Best Chemistry card moved to the Performance tab alongside other win/loss related statistics."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          }
        ]
      }
    ]
  },
  {
    version: '1.3.1',
    date: '26/09/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Averaged Playstyle Display on Player Cards',
            details: "Player cards now display averaged playstyles in the bottom left corner. Shows the closest matching playstyle based on averaged ratings from other players. Displays 'TBD' for players with fewer than 5 ratings, with a progress wheel showing how many more ratings are needed. Once 5+ ratings are received, shows the actual playstyle with a match quality indicator."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Playstyle Badge Requirements',
            details: "Playstyle badges now require a minimum of 5 ratings from other players to display the calculated playstyle, ensuring more accurate representation. Players with fewer ratings see 'TBD' with a progress indicator."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Playstyle Display Consistency',
            details: "Fixed issue where playstyles were not displaying correctly on game registration pages. Added missing data fetching for playstyle rating counts in game registration components."
          }
        ]
      }
    ]
  },
  {
    version: '1.3.0',
    date: '05/09/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Playstyle Rating System (Beta)',
            details: "Introduced a revolutionary new playstyle system with 24 unique playstyles across attacking, midfield, and defensive categories. Players can now assign playstyles when rating others, which automatically derives 6 key attributes: Pace, Shooting, Passing, Dribbling, Defending, and Physical. This feature is currently in beta and available to selected users for testing."
          },
          {
            title: 'Enhanced Team Balancing Algorithm',
            details: "Team balancing now uses a sophisticated three-layer system: Core Skills (60%), Derived Attributes from playstyles (30%), and Performance Metrics (10%). This creates more nuanced and balanced teams based on how players actually use their skills."
          },
          {
            title: 'Player Attribute Visualization',
            details: "Added radar chart visualizations in the admin dashboard to compare player attributes. Supports multi-player comparison with up to 4 players and shows all 6 derived attributes in an intuitive chart format."
          },
          {
            title: 'Attribute-Based Playstyle Filtering',
            details: "Intelligent filtering system allows users to select specific attributes (e.g., Pace + Dribbling) to find matching playstyles. Makes it easier to find the perfect playstyle for any player's abilities."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Advanced Filtering & Sorting',
            details: "Enhanced the ratings page with new filtering options for playstyles, categories, and attribute-based searches. Added sorting by playstyle name and category for better organization."
          },
          {
            title: 'Mobile Optimization',
            details: "All playstyle features are fully optimized for mobile devices with compact attribute abbreviations and responsive radar charts."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Rating System Stability',
            details: "Fixed critical database trigger conflicts that were causing 400 errors when saving playstyle ratings. The system now handles all rating operations smoothly."
          }
        ]
      }
    ]
  },
  
  {
    version: '1.2.0',
    date: '26/06/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Game IQ Rating System',
            details: "Introduced a third player rating metric alongside Attack and Defense. Game IQ measures tactical awareness, positioning, and decision-making abilities on a 0-10 scale (displayed as 0-5 stars). Players can now rate other players on all three dimensions after playing 5+ games together."
          },
          {
            title: 'Enhanced Team Balancing',
            details: "Team balancing algorithm now incorporates Game IQ ratings alongside other player metrics to create more balanced and competitive matches."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Rating Display Improvements',
            details: "Unrated values now display as 'unrated' instead of '0' or 'NaN'. Rating buttons dynamically show 'ADD GAME IQ RATING' when only Game IQ is missing, providing clearer guidance to users."
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Rating Display Issues',
            details: "Fixed various display issues where Game IQ ratings were showing as 'NaN' or missing from player profiles and rating pages."
          },
          {
            title: 'Null Rating Handling',
            details: "Added proper handling for players who haven't been rated yet, ensuring all rating displays work correctly even with partial data."
          }
        ]
      }
    ]
  },
  
  {
    version: '1.1.4',
    date: '17/04/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Win Rate Graph',
            details: "Added a win rate graph to show a player's win rate over time with a 10-game moving average."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          },
        ]
      }
    ]
  },
  {
    version: '1.1.3',
    date: '01/04/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Timezone Handling',
            details: "Added timezone handling/support to game display."
          },
        ]
      }
    ]
  },

  {
    version: '1.1.2',
    date: '24/03/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Winning Streaks',
            details: "Added Winning Streaks feature to show consecutive wins for each player."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          },
        ]
      }
    ]
  },

  {
    version: '1.1.1',
    date: '13/03/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'N/A',
            details: "Nothing added in this release"
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Token Eligibility Changes',
            details: "You now need to be up to date with payments to have token eligibility."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          },
        ]
      }
    ]
  },{
    version: '1.1.0',
    date: '27/02/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'XP Leaderboard',
            details: "Added XP Leaderboard on stats page to show highest XP achieved on what date."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No fixes in this release."
          },
        ]
      }
    ]
  },

  {
    version: '1.0.9',
    date: '05/02/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Priority Token Feature',
            details: "Gives players a guaranteed slot in games when they use a priority token. Priority tokens are reissued every 4 weeks. The amount of XP slots are reduced by the number of tokens used."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      }
    ]
  },
  {
    version: '1.0.8',
    date: '24/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Registered Players List View',
            details: "Added a list view for registered players that just shows name and XP."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      }
    ]
  },
  {
    version: '1.0.7',
    date: '22/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Missing Payments',
            details: "Adding missing payments. Each payment missing is a temporary -50% XP penalty. If a player ever owes for 3 or more games, they're unable to register for a game unless they first clear their debts."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Stats Page',
            details: 'Fixed the "Best Buddies calculations". Only showing Current Streaks on current year and "all-time" timeframes.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.6',
    date: '16/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Random Selection Process',
            details: 'Random selection now uses weighted probabilities based on bench warmer streaks. Players with longer bench warmer streaks have a higher chance of being selected for random slots, helping to ensure fairer rotation of reserve players.'
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Bench Warmer Streak Bonus',
            details: 'Now displays properly on player cards.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.5',
    date: '10/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'N/A',
            details: "No changes in this release."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Ratings Filtering',
            details: 'Ratings page now has WhatsApp Group Membership filter option  (on by default).'
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Win rate fix',
            details: 'Win rates now display correctly on the profile page. Previously was showing N/A.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.4',
    date: '10/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Bench Warmer Bonus',
            details: "To reward/incentivize reserves, players will get 5 XP for every game where they are listed as a reserve when the game ends. If the player gets an offer of a slot, and declines it, they will instead lose 10 XP. The 5 XP tails off after 40 games where it is then valued at 0 XP."
          },
          {
            title: 'Bench Warmer Streak',
            details: "For every game where a player is listed as a reserve when the game ends they will get a temporary 10% XP bonus. Similar to the regular streak bonus but to reward keen reserves. The streak is reset when the player plays a game or doesn't register as a reserve."
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Player Cards',
            details: 'Now show Bench Warmer Streak where appropriate.'
          },
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'XP fix',
            details: 'XP is now calculated entirely on the backend database rather than a frontend function.'
          },
          {
            title: 'Streak fix',
            details: 'Game streaks are now calculated entirely on the backend database rather than a frontend function.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.3',
    date: '08/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Tooltips',
            details: "Tooltips added to game history section. They display on games where there weren't an even number of players on each team, or where the score is unknown to indicate that those games don't count towards a player's winrate."
          },
          {
            title: 'Navigation buttons added',
            details: 'Navigation buttons added to player profiles to auto scroll the page.'
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'Game History View',
            details: 'Game history on player profiles now changed from table view to card view'
          },
          {
            title: 'XP tail-off for old games',
            details: 'Older games will eventually count for 0 XP, reducing runaway leader effect and introducing rolling seasons/soft resets over time.'
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Game Score Display',
            details: 'Previous game scores now showing correctly instead of saying "Unknown"'
          },
          {
            title: 'Sort by WNF #',
            details: 'Sort by WNF # now works correctly in game history.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.2',
    date: '07/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'WNF WhatsApp Group Priority System',
            details: 'WNF WhatsApp group members now get priority in game registration when it comes to random selection and reserve selection. '
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: 'No changes in this release'
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: 'No changes in this release'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.1',
    date: '06/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'WhatsApp Group Membership Indicator',
            details: 'Indicates if a player is a member of the WhatsApp group'
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: 'No changes in this release'
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'Win Rate Fix',
            details: 'Win rates now display correctly, and only show for games with even number of players and known results.'
          }
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    date: '01/01/2025',
    sections: [
      {
        type: 'Added',
        items: [
          {
            title: 'Initial release of Wednesday Night Football',
            details: 'Beta release of the WNF platform'
          },
          {
            title: 'Player management system',
            details: 'Basic player profile management'
          },
          {
            title: 'Player selection functionality',
            details: 'Basic player selection and team assignment system'
          },
          {
            title: 'Game scheduling and management',
            details: 'Basic game scheduling functionality'
          },
          {
            title: 'Player statistics tracking',
            details: 'Basic player statistics system'
          },
          {
            title: 'Team balancing algorithm',
            details: 'Initial version of team balancing system'
          }
        ]
      },
      {
        type: 'Changed',
        items: [
          {
            title: 'N/A',
            details: 'No changes in initial release'
          }
        ]
      },
      {
        type: 'Fixed',
        items: [
          {
            title: 'N/A',
            details: 'No fixes in initial release'
          }
        ]
      }
    ]
  }
];

/**
 * Get the current version of the application
 * @returns The latest version number
 */
export const getCurrentVersion = (): string => {
  return changelogData[0].version;
};
