import { Database } from './database'

export type RatingRow = Database['public']['Tables']['ratings']['Row']

export interface Rating {
  id: string
  attack_rating: number
  defense_rating: number
  created_at: string
  rater: { friendly_name: string }
  rated_player: { friendly_name: string }
}

export interface RatingStats {
  id: string
  friendly_name: string
  total_ratings: number
  ratings_given?: number
  average_attack?: number
  average_defense?: number
}

export const transformRatingFromDB = (rating: RatingRow): Rating => {
  return {
    id: rating.id,
    attack_rating: rating.attack_rating,
    defense_rating: rating.defense_rating,
    created_at: rating.created_at,
    rater: {
      friendly_name: rating.rater_id
    },
    rated_player: {
      friendly_name: rating.rated_player_id
    }
  }
}
