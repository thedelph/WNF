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
