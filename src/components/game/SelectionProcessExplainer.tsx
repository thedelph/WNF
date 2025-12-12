import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SelectionProcessExplainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-outline btn-info h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <span className="inline-flex items-center justify-center w-4 h-4">❓</span>
          <span className="font-medium">FAQs</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 bg-base-100 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Overview */}
                <div className="text-sm opacity-90">
                  <p className="mb-4">
                    When registration closes, players are selected automatically using a fair, multi-stage process that balances priority systems with random selection.
                  </p>
                </div>

                {/* Selection Stages */}
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title font-medium text-info">
                    How does the selection process work?
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-4 text-sm">
                      {/* Stage 1: Priority Tokens */}
                      <div>
                        <h4 className="font-semibold text-warning mb-2 flex items-center gap-2">
                          <span>🪙</span> Stage 1: Priority Tokens (Guaranteed)
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li>Players using their Priority Token get <strong>guaranteed slots</strong></li>
                          <li>Priority Tokens are earned by meeting specific criteria (see your profile for eligibility)</li>
                          <li>Token users always appear at the top of the player list</li>
                          <li>These slots are taken from the merit pool (not random slots)</li>
                        </ul>
                      </div>

                      {/* Stage 2: Merit Selection */}
                      <div>
                        <h4 className="font-semibold text-success mb-2 flex items-center gap-2">
                          <span>🏆</span> Stage 2: Merit Selection (XP-Based)
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li>After token slots, remaining slots filled by <strong>highest XP</strong></li>
                          <li>Typically 16 slots for 18-player games (minus any tokens used)</li>
                          <li>Players with unpaid games are moved to the bottom of merit selection</li>
                          <li><strong>XP Tiebreakers</strong> (only when XP is exactly equal):
                            <ol className="list-decimal list-inside ml-4 mt-1">
                              <li>WhatsApp member status (Yes before No)</li>
                              <li>Current streak (higher wins)</li>
                              <li>Caps (more caps wins)</li>
                              <li>Registration time (earlier wins)</li>
                            </ol>
                          </li>
                        </ul>
                      </div>

                      {/* Stage 3: Random Selection */}
                      <div>
                        <h4 className="font-semibold text-error mb-2 flex items-center gap-2">
                          <span>🎲</span> Stage 3: The Randomiser
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li>Final 2 slots filled by <strong>weighted random selection</strong></li>
                          <li>WhatsApp members selected first before non-members</li>
                          <li>Players with unpaid games moved to lowest priority tier</li>
                          <li><strong>Weighted Selection</strong>: Your odds improve based on reserve history
                            <ul className="list-disc list-inside ml-4 mt-1">
                              <li>Base weight: 1 point (everyone)</li>
                              <li>Reserve bonus: +1 point per consecutive reserve appearance</li>
                              <li>Example: 3 consecutive reserves = 4 points total (1 base + 3 bonus)</li>
                            </ul>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Understanding the Page Layout */}
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-info">
                    What do the different sections on this page mean?
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-4 text-sm">
                      {/* Summary Stats */}
                      <div>
                        <h4 className="font-semibold mb-2">📊 Summary Stats (Top of Page)</h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li><strong>Guaranteed:</strong> Players certain to be selected (tokens + safe merit spots)</li>
                          <li><strong>At Risk:</strong> Players whose selection depends on other factors</li>
                        </ul>
                      </div>

                      {/* Guaranteed Section */}
                      <div>
                        <h4 className="font-semibold text-success mb-2">✅ Guaranteed Section</h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li>Token users (always guaranteed)</li>
                          <li>High-XP merit players who are safe from being pushed out</li>
                          <li>These players <strong>will definitely play</strong></li>
                        </ul>
                      </div>

                      {/* At Risk Section */}
                      <div>
                        <h4 className="font-semibold text-warning mb-2">⚠️ At Risk Section</h4>
                        <p className="opacity-80 mb-2">This section contains two groups:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li><strong>Merit Zone - At Risk:</strong> Currently in merit zone but could be pushed to random selection if:
                            <ul className="list-disc list-inside ml-4 mt-1">
                              <li>Unregistered players with higher XP register</li>
                              <li>Unregistered players with eligible tokens register and use them</li>
                            </ul>
                          </li>
                          <li><strong>The Randomiser:</strong> Players in the random selection zone
                            <ul className="list-disc list-inside ml-4 mt-1">
                              <li>Shows percentage odds based on current registrations</li>
                              <li>Odds will change if more players register</li>
                              <li>Higher odds = better reserve history</li>
                            </ul>
                          </li>
                        </ul>
                      </div>

                      {/* Reserve List */}
                      <div>
                        <h4 className="font-semibold mb-2">📋 Reserve List</h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 opacity-80">
                          <li>Players not selected are placed on the reserve list</li>
                          <li>Ordered by WhatsApp status first, then XP</li>
                          <li>Reserves earn +5 XP for registering on time</li>
                          <li>If someone drops out, reserves are offered the spot in order</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shield vs Register Decision */}
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-info">
                    Can I register first and then use a shield if I don't get picked?
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-3 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">⚠️ No - you must choose before registration closes</h4>
                        <p className="opacity-80 mb-2">
                          You cannot register and use a shield for the same game. Once registration closes,
                          your choice is final - you can't switch from registered to shielded if you end up as a reserve.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">📊 What happens with each choice:</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li><strong>Register and get selected:</strong> You play, streak continues</li>
                          <li><strong>Register and become reserve:</strong> Your attendance streak resets (but you earn reserve XP and Bench Warmer bonus)</li>
                          <li><strong>Use a shield:</strong> Your streak is protected with gradual decay</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">💡 Making your decision:</h4>
                        <p className="opacity-80">
                          If you think your selection chances are low and you have a streak you want to protect,
                          using a shield is a valid choice - they're a resource you've earned.
                          When more than 18 players register, you'll see your odds in "The Randomiser" section.
                        </p>
                        <p className="opacity-80 mt-2">
                          <strong>Remember:</strong> Using a shield means you won't play that week, even if you would have been selected.
                          You're trading the chance to play for guaranteed streak protection.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shield Tokens */}
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-info">
                    What are Shield Tokens and when should I use them?
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-3 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">🛡️ What are Shield Tokens?</h4>
                        <p className="opacity-80 mb-2">
                          Shield tokens protect your XP streak when you can't play (holidays, illness, injury).
                          Use a shield token INSTEAD of registering to protect your streak.
                        </p>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>Use shields INSTEAD of registering (can't do both)</li>
                          <li>Your streak is protected with gradual decay when you return</li>
                          <li>Earn 1 shield token per 10 games played (max 4 tokens)</li>
                          <li>Can be cancelled before registration closes</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">⚙️ Gradual Decay System</h4>
                        <div className="opacity-80 space-y-2">
                          <p><strong>When you use a shield:</strong></p>
                          <ul className="list-disc list-inside ml-4">
                            <li>Your current streak value is protected (e.g., 10-game streak)</li>
                            <li>When you return, the protected bonus gradually decreases as your natural streak builds</li>
                          </ul>
                          <p className="mt-2"><strong>Example (10-game streak protected):</strong></p>
                          <ul className="list-disc list-inside ml-4">
                            <li>Game 1: Natural 1, Protected 9 → +90% XP</li>
                            <li>Game 2: Natural 2, Protected 8 → +80% XP</li>
                            <li>Game 3: Natural 3, Protected 7 → +70% XP</li>
                            <li>Game 4: Natural 4, Protected 6 → +60% XP</li>
                            <li>Game 5: Natural 5, Protected 5 → +50% XP (converged!)</li>
                            <li>Game 6: Natural 6 → +60% XP (continues normally)</li>
                          </ul>
                          <p className="mt-2"><strong>The benefit:</strong></p>
                          <ul className="list-disc list-inside ml-4">
                            <li>Without shield: miss 1 game → streak resets to 0</li>
                            <li>With shield: recover in <strong>half the games</strong> (10-game streak → 5 games to recover)</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">⚠️ Important Rules</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>You cannot register AND use a shield for the same game</li>
                          <li>Once registration closes, shield usage is final</li>
                          <li>If you have an active shield and miss another game without using another shield, you lose your protection</li>
                          <li>For multi-week absences, you need enough shields to cover the entire period</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">📍 Where to Use Shields</h4>
                        <p className="opacity-80">
                          Find the shield token section on the game registration page, below the "Register Interest" button.
                          Your shield status and progress toward your next token is shown on your profile page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-info">
                    How can I improve my chances of being selected?
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-3 text-sm">
                      <div>
                        <h4 className="font-semibold mb-1">🎯 Want to guarantee your spot?</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>Build your XP by playing consistently</li>
                          <li>Save your Priority Token for when you really need it</li>
                          <li>Join the WhatsApp group for priority in random selection</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">🛡️ Protect your streak</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>Use shield tokens when you know you can't play</li>
                          <li>Don't use shields casually - save them for genuine absences</li>
                          <li>Plan ahead for multi-week holidays (need multiple shields)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">📈 Improve your random selection odds</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>Register early and consistently</li>
                          <li>Being a reserve increases your weight in future random selections</li>
                          <li>Consecutive reserve appearances stack your bonus points</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-1">💰 Keep payments current</h4>
                        <ul className="list-disc list-inside ml-4 opacity-80">
                          <li>Unpaid games move you to the bottom of merit selection</li>
                          <li>Also puts you in lowest priority tier for random selection</li>
                          <li>Pay promptly to maximize your chances</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
