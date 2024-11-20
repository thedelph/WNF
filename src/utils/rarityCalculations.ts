export const calculateRarity = (xp: number, allXp: number[]): 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common' => {
  // Sort XP values in descending order
  const sortedXP = [...allXp].sort((a, b) => b - a)
  const totalPlayers = sortedXP.length
  
  console.log('Total Players:', totalPlayers)
  console.log('Sorted XP Values:', sortedXP)
  console.log('Current XP:', xp)
  
  // Calculate exact cutoff positions
  const legendaryCount = Math.max(1, Math.round(totalPlayers * 0.01))
  const epicCount = Math.max(2, Math.round(totalPlayers * 0.04))
  const rareCount = Math.max(7, Math.round(totalPlayers * 0.15))
  const uncommonCount = Math.round(totalPlayers * 0.33)
  
  console.log('Distribution:', {
    legendary: legendaryCount,
    epic: epicCount,
    rare: rareCount,
    uncommon: uncommonCount,
    common: totalPlayers - (legendaryCount + epicCount + rareCount + uncommonCount)
  })
  
  const position = sortedXP.indexOf(xp)
  
  if (position < legendaryCount) return 'Legendary'
  if (position < (legendaryCount + epicCount)) return 'Epic'
  if (position < (legendaryCount + epicCount + rareCount)) return 'Rare'
  if (position < (legendaryCount + epicCount + rareCount + uncommonCount)) return 'Uncommon'
  return 'Common'
}
