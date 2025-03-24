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
            title: 'No changes in this release',
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
