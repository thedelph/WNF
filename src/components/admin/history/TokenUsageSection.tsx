import React, { useEffect, useState } from 'react'
import { supabaseAdmin } from '../../../utils/supabase'
import { PiCoinDuotone } from 'react-icons/pi'

interface TokenUsageData {
  player_id: string
  player_name: string
  token_id: string | null
  was_forgiven: boolean
  selection_method: string
}

interface TokenUsageSectionProps {
  gameId: string
}

export const TokenUsageSection: React.FC<TokenUsageSectionProps> = ({ gameId }) => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTokenUsage = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .rpc('get_game_token_usage', { p_game_id: gameId })

        if (error) {
          console.error('Error fetching token usage:', error)
          return
        }

        setTokenUsage(data || [])
      } catch (error) {
        console.error('Error fetching token usage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTokenUsage()
  }, [gameId])

  if (loading) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <PiCoinDuotone className="text-2xl text-warning" />
            Priority Token Usage
          </h2>
          <p className="text-sm opacity-70">Loading...</p>
        </div>
      </div>
    )
  }

  if (tokenUsage.length === 0) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2">
            <PiCoinDuotone className="text-2xl text-base-content opacity-50" />
            Priority Token Usage
          </h2>
          <p className="text-sm opacity-70">No priority tokens were used in this game.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200 shadow-lg">
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <PiCoinDuotone className="text-2xl text-warning" />
          Priority Token Usage ({tokenUsage.length})
        </h2>

        <div className="space-y-2">
          {tokenUsage.map((token) => (
            <div
              key={token.player_id}
              className="flex items-center justify-between p-3 bg-base-100 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <PiCoinDuotone className="text-xl text-warning" />
                <span className="font-medium">{token.player_name}</span>
              </div>

              <div className="flex items-center gap-2">
                {token.was_forgiven ? (
                  <div className="badge badge-success gap-1">
                    <span>Token Forgiven</span>
                    <div
                      className="tooltip tooltip-left"
                      data-tip="Player would have been selected by XP anyway, so token was returned"
                    >
                      <span className="cursor-help">ℹ️</span>
                    </div>
                  </div>
                ) : (
                  <div className="badge badge-warning gap-1">
                    <span>Token Consumed</span>
                    <div
                      className="tooltip tooltip-left"
                      data-tip="Token was consumed when game completed"
                    >
                      <span className="cursor-help">ℹ️</span>
                    </div>
                  </div>
                )}

                <div className="badge badge-ghost">
                  {token.selection_method === 'token' ? 'Token Selection' : 'Merit Selection'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-info bg-opacity-10 rounded-lg">
          <p className="text-sm opacity-70">
            <strong>Note:</strong> Priority tokens are only consumed if the player wouldn't have been
            selected by XP. If a player would have gotten in by merit anyway, their token is automatically
            returned (forgiven) and they'll be on cooldown for the next game.
          </p>
        </div>
      </div>
    </div>
  )
}
