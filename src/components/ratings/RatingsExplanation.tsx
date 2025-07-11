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