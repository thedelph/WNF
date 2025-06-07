import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { parseHistoricalGamesCsv } from '../../../../utils/csvParser'
import CSVInstructions from './CSVInstructions'
import CSVPreview from './CSVPreview'
import { supabaseAdmin } from '../../../../utils/supabase'

interface Props {
  onImportComplete: () => void
}

const CSVImport: React.FC<Props> = ({ onImportComplete }) => {
  const [csvData, setCsvData] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const parsedData = await parseHistoricalGamesCsv(file)
      setCsvData(parsedData)
    } catch (error) {
      toast.error('Failed to parse CSV file')
      console.error('CSV parse error:', error)
    }
  }

  const handleImport = async () => {
    setIsProcessing(true)
    try {
      for (const game of csvData) {
        // Create game record
        const { data: gameData, error: gameError } = await supabaseAdmin
          .from('games')
          .insert({
            date: game.date,
            score_blue: game.blueScore || null,
            score_orange: game.orangeScore || null,
            status: 'completed',
            is_historical: true,
            outcome: game.outcome
          })
          .select()
          .single()

        if (gameError) throw gameError

        // Create player registrations
        const registrations = [
          ...game.bluePlayers.map((playerId: string) => ({
            game_id: gameData.id,
            player_id: playerId,
            team: 'blue',
            status: 'selected'
          })),
          ...game.orangePlayers.map((playerId: string) => ({
            game_id: gameData.id,
            player_id: playerId,
            team: 'orange',
            status: 'selected'
          }))
        ]

        const { error: regError } = await supabaseAdmin
          .from('game_registrations')
          .insert(registrations)

        if (regError) throw regError
      }

      toast.success('Historical games imported successfully')
      setCsvData([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onImportComplete()
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import games')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.5
      }}
    >
      <CSVInstructions onFileUpload={handleFileUpload} />
      <CSVPreview csvData={csvData} />
      <button
        onClick={handleImport}
        className="btn btn-primary"
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Import Historical Games'}
      </button>
    </motion.div>
  )
}

export default CSVImport
