import { handlePlayerSelection } from '../playerSelection';
import { supabaseAdmin } from '../../utils/supabase';

// Mock supabaseAdmin
jest.mock('../../utils/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}));

describe('Player Selection Tests', () => {
  const mockRegisteredPlayers = [
    { player_id: '1', status: 'registered', selection_method: null, created_at: '2025-01-16T16:00:00Z' },
    { player_id: '2', status: 'registered', selection_method: null, created_at: '2025-01-16T16:01:00Z' },
    { player_id: '3', status: 'registered', selection_method: null, created_at: '2025-01-16T16:02:00Z' },
    { player_id: '4', status: 'registered', selection_method: null, created_at: '2025-01-16T16:03:00Z' }
  ];

  const mockPlayerStats = [
    { id: '1', xp: 100, current_streak: 0, caps: 10, bench_warmer_streak: 5 },  // Maddocks
    { id: '2', xp: 80, current_streak: 0, caps: 8, bench_warmer_streak: 3 },   // Chris H
    { id: '3', xp: 60, current_streak: 0, caps: 6, bench_warmer_streak: 2 },   // Player D
    { id: '4', xp: 40, current_streak: 0, caps: 4, bench_warmer_streak: 0 }    // Player C
  ];

  const mockWhatsAppStatus = [
    { id: '1', whatsapp_group_member: 'Yes' },
    { id: '2', whatsapp_group_member: 'Yes' },
    { id: '3', whatsapp_group_member: 'No' },
    { id: '4', whatsapp_group_member: 'No' }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup supabase mock responses
    (supabaseAdmin.from as jest.Mock).mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((callback) => {
        switch(table) {
          case 'game_registrations':
            return Promise.resolve({ data: mockRegisteredPlayers, error: null });
          case 'player_stats':
            return Promise.resolve({ data: mockPlayerStats, error: null });
          case 'players':
            return Promise.resolve({ data: mockWhatsAppStatus, error: null });
          default:
            return Promise.resolve({ data: [], error: null });
        }
      })
    }));
  });

  describe('Weighted Random Selection', () => {
    it('should select players with probabilities proportional to their bench_warmer_streak', async () => {
      const iterations = 1000;
      const selections: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
      
      // Run multiple selections
      for (let i = 0; i < iterations; i++) {
        const result = await handlePlayerSelection({
          gameId: 'test-game',
          xpSlots: 0,  // Only test random selection
          randomSlots: 1
        });
        
        if (result.selectedPlayers.length > 0) {
          const selectedId = result.selectedPlayers[0].id;
          selections[selectedId]++;
        }
      }

      // Calculate actual probabilities
      const actualProbs = {
        '1': (selections['1'] / iterations) * 100,  // Maddocks (6 points)
        '2': (selections['2'] / iterations) * 100,  // Chris H (4 points)
        '3': (selections['3'] / iterations) * 100,  // Player D (3 points)
        '4': (selections['4'] / iterations) * 100   // Player C (1 point)
      };

      // Expected probabilities based on bench_warmer_streak + 1
      const expectedProbs = {
        '1': 42.86,  // 6/14 * 100
        '2': 28.57,  // 4/14 * 100
        '3': 21.43,  // 3/14 * 100
        '4': 7.14    // 1/14 * 100
      };

      // Allow for some variance (±5%)
      Object.keys(expectedProbs).forEach(id => {
        expect(actualProbs[id]).toBeGreaterThanOrEqual(expectedProbs[id] - 5);
        expect(actualProbs[id]).toBeLessThanOrEqual(expectedProbs[id] + 5);
      });
    });

    it('should respect WhatsApp member priority', async () => {
      const result = await handlePlayerSelection({
        gameId: 'test-game',
        xpSlots: 0,
        randomSlots: 1
      });

      // When there are WhatsApp members available, they should be prioritized
      const selectedPlayer = result.selectedPlayers[0];
      const isWhatsApp = mockWhatsAppStatus.find(p => p.id === selectedPlayer.id)?.whatsapp_group_member === 'Yes';
      
      expect(isWhatsApp).toBe(true);
    });

    it('should never select the same player twice', async () => {
      const result = await handlePlayerSelection({
        gameId: 'test-game',
        xpSlots: 2,
        randomSlots: 2
      });

      const selectedIds = result.selectedPlayers.map(p => p.id);
      const uniqueIds = new Set(selectedIds);
      
      expect(selectedIds.length).toBe(uniqueIds.size);
    });
  });
});
