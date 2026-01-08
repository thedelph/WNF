import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  csvData: any[]
  maxPreviewRows?: number
}

const CSVPreview: React.FC<Props> = ({ csvData, maxPreviewRows = 5 }) => {
  if (csvData.length === 0) return null

  const previewData = csvData.slice(0, maxPreviewRows)
  const hasMoreRows = csvData.length > maxPreviewRows

  return (
    <div className="card bg-base-100 shadow-xl mb-4">
      <div className="card-body">
        <h3 className="card-title">Preview</h3>
        <div className="overflow-x-auto">
          <table className="table table-compact w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Blue Team</th>
                <th>Orange Team</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {previewData.map((game, index) => (
                  <motion.tr
                    key={`${game.date}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <td>{game.date}</td>
                    <td>
                      <span className="text-blue-500">
                        {game.bluePlayers.length} players
                      </span>
                    </td>
                    <td>
                      <span className="text-orange-500">
                        {game.orangePlayers.length} players
                      </span>
                    </td>
                    <td>
                      {game.blueScore !== null && game.orangeScore !== null
                        ? `${game.blueScore} - ${game.orangeScore}`
                        : 'Unknown'}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {hasMoreRows && (
          <div className="text-sm text-gray-500 mt-2">
            And {csvData.length - maxPreviewRows} more games...
          </div>
        )}
      </div>
    </div>
  )
}

export default CSVPreview
