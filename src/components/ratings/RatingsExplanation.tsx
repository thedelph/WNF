import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RatingsExplanation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full mb-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <span className="inline-flex items-center justify-center w-4 h-4">ℹ️</span>
        <span className="font-medium">RATINGS EXPLAINED</span>
      </motion.button>

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
                {/* How Ratings Work Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" defaultChecked /> 
                  <div className="collapse-title font-medium text-primary">
                    How Player Ratings Work
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p>
                        All ratings are <span className="font-medium">completely confidential</span> and used solely by our team balancing algorithm to create fair and competitive games. 
                        Each rating is on a scale of 0-10 (displayed as 0-5 stars) and represents different aspects of a player's game.
                      </p>
                      <p className="font-medium">
                        Important: Ratings should reflect both a player's skill level AND their tendency to play in that role.
                      </p>
                      <p className="text-xs mt-2">
                        Please rate players honestly and fairly for the best game experience.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attack Rating Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" /> 
                  <div className="collapse-title font-medium text-primary">
                    ⚔️ Attack Rating
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">What to consider when rating attack:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">Offensive Skills:</span> Goal scoring ability, shot accuracy, dribbling, and creating chances</li>
                        <li><span className="font-medium">Attacking Contribution:</span> How often they push forward and contribute to attacks</li>
                        <li><span className="font-medium">Position Preference:</span> Their tendency to play in attacking positions</li>
                      </ul>
                      <div className="bg-warning/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Example:</span> A player might be an excellent finisher but if they rarely play up front or push forward, 
                          their attack rating should reflect this lower attacking contribution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Defense Rating Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" /> 
                  <div className="collapse-title font-medium text-primary">
                    🛡️ Defense Rating
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">What to consider when rating defense:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">Defensive Skills:</span> Tackling, marking, interceptions, and defensive positioning</li>
                        <li><span className="font-medium">Defensive Contribution:</span> How often they track back and help defend</li>
                        <li><span className="font-medium">Position Preference:</span> Their tendency to play in defensive positions</li>
                      </ul>
                      <div className="bg-warning/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Example:</span> A player might be a solid defender when needed but if they rarely play at the back or track back, 
                          their defense rating should reflect this lower defensive contribution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game IQ Rating Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-primary">
                    🧠 Game IQ Rating
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">What Game IQ measures:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">Tactical Awareness:</span> Understanding of team shape, spacing, and game situations</li>
                        <li><span className="font-medium">Decision Making:</span> Choosing the right pass, when to hold/release the ball, shot selection</li>
                        <li><span className="font-medium">Positioning:</span> Being in the right place at the right time, creating/exploiting space</li>
                        <li><span className="font-medium">Game Reading:</span> Anticipating plays, recognizing patterns, adapting to game flow</li>
                        <li><span className="font-medium">Communication:</span> Organizing teammates, calling for the ball effectively</li>
                      </ul>
                      <div className="bg-info/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Note:</span> Game IQ is independent of physical ability. A player can have high Game IQ
                          but lower attack/defense ratings, or vice versa.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GK Rating Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-primary">
                    🥅 GK Rating
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">What to consider when rating goalkeeping:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">Shot-Stopping:</span> Ability to make saves, reflexes, and positioning in goal</li>
                        <li><span className="font-medium">Command of Area:</span> Confidence coming for crosses, organizing the defense</li>
                        <li><span className="font-medium">Distribution:</span> Throwing accuracy, kicking quality, starting attacks from the back</li>
                        <li><span className="font-medium">1v1 Ability:</span> Performance in one-on-one situations with attackers</li>
                        <li><span className="font-medium">Positioning:</span> Angle management, staying on line, coming off the line when needed</li>
                      </ul>
                      <div className="bg-info/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Note:</span> Since we rotate keepers in 9v9 games, everyone should go in goal at least once per game
                          (ideally ~7 minutes each).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Position Preferences Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-primary">
                    🗺️ Position Preferences
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">What Position Preferences Show:</p>
                      <p>
                        Position preferences show <span className="font-medium">WHERE</span> a player excels on the pitch.
                        This helps create balanced teams by ensuring each team has good coverage across all areas of the field.
                      </p>

                      <p className="font-medium">The 11 Positions:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">🥅 Goalkeeper:</span> GK</li>
                        <li><span className="font-medium">🛡️ Defense:</span> LB (Left Back), CB (Center Back), RB (Right Back), WB (Wing Back)</li>
                        <li><span className="font-medium">⚙️ Midfield:</span> LM (Left Mid), CM (Center Mid), RM (Right Mid), CAM (Attacking Mid), CDM (Defensive Mid)</li>
                        <li><span className="font-medium">⚔️ Attack:</span> ST (Striker)</li>
                      </ul>

                      <div className="bg-info/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">How it works:</span> Select all positions where the player can perform well.
                          Aim for 1-3 positions for best results. The system aggregates ratings from multiple people to show
                          consensus (e.g., "75% LB" means 75% of raters said this player excels at Left Back).
                        </p>
                      </div>

                      <div className="bg-info/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Important:</span> Position preferences complement Attack/Defense ratings.
                          A player can have high Attack rating but prefer playing in midfield rather than as a striker.
                          Rate where they <span className="font-medium">actually play and excel</span>, not just where they could play.
                        </p>
                      </div>

                      <div className="bg-warning/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Team Balancing:</span> The algorithm uses position preferences to prevent
                          imbalanced teams (e.g., one team with 4 strikers and the other with 1). This ensures more tactical
                          balance in addition to skill balance.
                        </p>
                      </div>

                      <div className="bg-success/20 p-3 rounded-md mt-3">
                        <p className="text-xs font-medium">Consensus Display:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                          <li><span className="font-medium">Primary (50%+):</span> Strong consensus, shown with solid badge</li>
                          <li><span className="font-medium">Secondary (25-49%):</span> Moderate consensus, shown with lighter badge</li>
                          <li><span className="font-medium">Minimum 5 raters required:</span> Position data only shown after 5+ people have rated</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Playstyle Rating Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium text-primary">
                    ⚡ Playstyle Rating
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium">How Playstyles Work:</p>
                      <p>
                        Playstyles complement your Attack/Defense/Game IQ/GK ratings by showing <span className="font-medium">HOW</span> a player uses their skills.
                        Select the attributes that best describe the player's strengths.
                      </p>

                      <p className="font-medium">The 6 Attributes to Choose From:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><span className="font-medium">Pace:</span> Speed and acceleration</li>
                        <li><span className="font-medium">Shooting:</span> Finishing and shot power</li>
                        <li><span className="font-medium">Passing:</span> Vision and passing accuracy</li>
                        <li><span className="font-medium">Dribbling:</span> Ball control and agility</li>
                        <li><span className="font-medium">Defending:</span> Tackling and positioning</li>
                        <li><span className="font-medium">Physical:</span> Strength and stamina</li>
                      </ul>

                      <div className="bg-info/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">How it works:</span> Simply check the boxes for attributes the player possesses.
                          The system will automatically generate an appropriate playstyle name based on your selections. There are 63 possible
                          combinations, with recognizable names like "Hunter" (Pace + Shooting) or "Engine" (Pace + Passing + Dribbling)
                          for common combinations.
                        </p>
                      </div>

                      <div className="bg-warning/20 p-3 rounded-md mt-3">
                        <p className="text-xs">
                          <span className="font-medium">Tip:</span> Use the "Filter by attributes" feature to preview which playstyle names
                          match specific attribute combinations before making your selection.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why Accurate Ratings Matter Section */}
                <div className="collapse collapse-arrow bg-base-100">
                  <input type="checkbox" /> 
                  <div className="collapse-title font-medium text-primary">
                    ⚖️ Why Accurate Ratings Matter
                  </div>
                  <div className="collapse-content">
                    <div className="text-sm opacity-70 space-y-4">
                      <p className="font-medium text-error">
                        Gaming the rating system only hurts everyone - including yourself!
                      </p>
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">What happens when ratings are inaccurate:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                            <li>Teams become unbalanced, leading to one-sided games</li>
                            <li>Players get frustrated with unfair matchups</li>
                            <li>The quality of games decreases for everyone</li>
                            <li>You might end up on weaker teams if you overrate others</li>
                          </ul>
                        </div>
                        
                        <div className="bg-success/20 p-3 rounded-md">
                          <p className="font-medium mb-2">Benefits of honest ratings:</p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>More competitive and enjoyable games</li>
                            <li>Better team balance means closer matches</li>
                            <li>Everyone has more fun when games are fair</li>
                            <li>Helps players improve by playing at appropriate levels</li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs mt-3 italic">
                        Remember: The algorithm considers multiple factors beyond just ratings. 
                        Trying to manipulate ratings rarely produces the desired outcome and usually backfires.
                      </p>
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

export default RatingsExplanation;