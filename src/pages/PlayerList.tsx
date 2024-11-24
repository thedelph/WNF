// src/pages/PlayerList.tsx
import React from 'react'
import PlayerCardGrid from '../components/PlayerCardGrid'

const PlayerList = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Player List</h1>
      <PlayerCardGrid />
    </div>
  )
}

export default PlayerList