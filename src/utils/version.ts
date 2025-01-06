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
