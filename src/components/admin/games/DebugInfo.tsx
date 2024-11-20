import React from 'react'

export const DebugInfo = ({ game, registrations, players }) => {
  if (process.env.NODE_ENV === 'production') return null
  
  return (
    <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
      <h4 className="font-bold">Debug Info:</h4>
      <pre>
        {JSON.stringify({
          gameStatus: game.status,
          registrationsCount: registrations.length,
          playerCount: players.length,
          registrationStatuses: registrations.map(r => r.status),
        }, null, 2)}
      </pre>
    </div>
  )
}
