import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function WhatsAppBotHelp() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">📱 WhatsApp Bot Guide</h1>
          <p className="text-lg text-base-content/70">
            Register for games and check your stats directly from WhatsApp
          </p>
        </div>

        {/* Quick Start Card */}
        <div className="card bg-primary text-primary-content">
          <div className="card-body">
            <h2 className="card-title text-2xl">🚀 Quick Start</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <Link to="/profile" className="link link-hover">
                  Link your WhatsApp number in your profile
                </Link>
              </li>
              <li>Join the WNF WhatsApp group (ask admin for invite)</li>
              <li>React with 👍 to game announcements to register</li>
              <li>Use commands like /xp to check your stats</li>
            </ol>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Registration */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">👍</span>
                Quick Registration
              </h3>
              <p>React to game announcements with a thumbs up to register instantly. No need to open the website!</p>
              <div className="divider my-2"></div>
              <h4 className="font-semibold">How it works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Wait for game announcement in the group</li>
                <li>React with 👍 to the message</li>
                <li>Bot automatically registers you</li>
                <li>You'll receive confirmation</li>
              </ol>
            </div>
          </div>

          {/* Priority Tokens */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">🪙</span>
                Priority Tokens
              </h3>
              <p>Use your priority token to guarantee a spot in the next game.</p>
              <div className="divider my-2"></div>
              <h4 className="font-semibold">How to use:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>React with 👍 to register</li>
                <li>Also react with 🪙 on the same message</li>
                <li>Your token will be consumed</li>
                <li>You're guaranteed a spot!</li>
              </ol>
            </div>
          </div>

          {/* Shield Tokens */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">🛡️</span>
                Shield Tokens
              </h3>
              <p>Protect your streak when you can't play by using a shield token.</p>
              <div className="divider my-2"></div>
              <h4 className="font-semibold">How to use:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Send 🛡️ emoji in the group</li>
                <li>Bot activates your shield</li>
                <li>Your streak is frozen</li>
                <li>Reactivate next time you play</li>
              </ol>
            </div>
          </div>

          {/* Commands */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">
                <span className="text-2xl">⌨️</span>
                Bot Commands
              </h3>
              <p>Get instant stats and information by sending commands in the group.</p>
              <div className="divider my-2"></div>
              <div className="space-y-1 text-sm">
                <div><code className="bg-base-300 px-2 py-1 rounded">/xp</code> - Check your XP</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/stats</code> - View full stats</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/tokens</code> - Token status</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/shields</code> - Shield status</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/nextgame</code> - Next game info</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/winrate</code> - Win/loss record</div>
                <div><code className="bg-base-300 px-2 py-1 rounded">/help</code> - Show all commands</div>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="card bg-base-300">
          <div className="card-body">
            <h3 className="card-title text-2xl mb-4">🔧 Setup Instructions</h3>

            <div className="space-y-6">
              {/* Step 1 */}
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <span className="badge badge-primary">1</span>
                  Link Your WhatsApp Number
                </h4>
                <p className="text-sm mb-2">
                  Add your WhatsApp number to your profile so the bot can identify you.
                </p>
                <Link to="/profile" className="btn btn-sm btn-primary">
                  Go to Profile →
                </Link>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <span className="badge badge-primary">2</span>
                  Phone Number Format
                </h4>
                <p className="text-sm mb-2">
                  Use international format with country code:
                </p>
                <div className="bg-base-200 p-3 rounded-lg space-y-1 text-sm font-mono">
                  <div>✅ <span className="text-success">+447123456789</span> (UK)</div>
                  <div>✅ <span className="text-success">+12025551234</span> (US)</div>
                  <div>❌ <span className="text-error">07123456789</span> (Missing country code)</div>
                  <div>❌ <span className="text-error">447123456789</span> (Missing + sign)</div>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <h4 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <span className="badge badge-primary">3</span>
                  Join the WhatsApp Group
                </h4>
                <p className="text-sm mb-2">
                  If you're not already in the group, contact an admin for an invite link.
                </p>
                <div className="alert alert-info text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Make sure to use the same phone number in WhatsApp that you linked in your profile!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-2xl mb-4">❓ Frequently Asked Questions</h3>

            <div className="space-y-4">
              <div className="collapse collapse-plus bg-base-300">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                  What if the bot doesn't recognize me?
                </div>
                <div className="collapse-content text-sm">
                  <p>Make sure you've linked your WhatsApp number in your profile and that it matches the number you're using in the group. The format must be exactly the same (including country code).</p>
                </div>
              </div>

              <div className="collapse collapse-plus bg-base-300">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                  Can I change my WhatsApp number later?
                </div>
                <div className="collapse-content text-sm">
                  <p>Yes! Just update it in your profile settings. The bot will use your new number for all future interactions.</p>
                </div>
              </div>

              <div className="collapse collapse-plus bg-base-300">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                  Do I need to register via WhatsApp every time?
                </div>
                <div className="collapse-content text-sm">
                  <p>No! You can still register via the website if you prefer. WhatsApp registration is just a convenience option.</p>
                </div>
              </div>

              <div className="collapse collapse-plus bg-base-300">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                  What happens if I react after registration closes?
                </div>
                <div className="collapse-content text-sm">
                  <p>The bot won't process reactions after the registration window closes. You'll see an error message if you try.</p>
                </div>
              </div>

              <div className="collapse collapse-plus bg-base-300">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                  Is my phone number secure?
                </div>
                <div className="collapse-content text-sm">
                  <p>Yes! Your phone number is only used to match you to your player account. It's stored securely and never shared publicly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="card bg-info text-info-content">
          <div className="card-body">
            <h3 className="card-title text-2xl">💬 Need Help?</h3>
            <p>
              If you're having trouble with the bot or have questions not covered here,
              reach out to an admin in the WhatsApp group or via the website.
            </p>
            <div className="card-actions mt-4">
              <Link to="/profile" className="btn">
                Go to Profile
              </Link>
              <Link to="/leaderboards" className="btn btn-ghost">
                View Leaderboards
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
