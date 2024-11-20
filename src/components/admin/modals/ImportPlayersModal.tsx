import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { FaDownload } from 'react-icons/fa'
import Papa from 'papaparse'

interface ImportPlayersModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayersImported: () => void
}

interface CSVPlayer {
  friendly_name: string
  caps: string
  xp: string
}

const ImportPlayersModal: React.FC<ImportPlayersModalProps> = ({
  isOpen,
  onClose,
  onPlayersImported
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const downloadTemplate = () => {
    // Create sample data
    const sampleData = [
      {
        friendly_name: 'John Smith',
        caps: '5',
        xp: '5'
      },
      {
        friendly_name: 'Jane Doe',
        caps: '3',
        xp: '3'
      }
    ]

    // Convert to CSV
    const csv = Papa.unparse(sampleData)
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'player_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a CSV file')
      return
    }

    setIsProcessing(true)

    try {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const players = results.data as CSVPlayer[]
          
          // Transform and validate the data
          const transformedPlayers = players.map(player => ({
            friendly_name: player.friendly_name,
            caps: parseInt(player.caps) || 0,
            xp: parseInt(player.xp) || 0,
            is_test_user: true,
            win_rate: 0
          }))

          // Insert into database
          const { error } = await supabaseAdmin
            .from('players')
            .insert(transformedPlayers)

          if (error) throw error

          toast.success(`${transformedPlayers.length} players imported successfully`)
          onPlayersImported()
          onClose()
        },
        error: (error) => {
          throw new Error(error.message)
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import players')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-base-100 p-6 rounded-lg w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4">Import Players from CSV</h2>
            
            <div className="mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-outline btn-sm"
                onClick={downloadTemplate}
              >
                <FaDownload className="mr-2" /> Download Template
              </motion.button>
            </div>

            <form onSubmit={handleImport}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">CSV File</span>
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered w-full"
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/70">
                    CSV should contain: friendly_name, caps, xp
                  </span>
                </label>
              </div>

              <div className="mt-6 flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  type="submit"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-ghost"
                  onClick={onClose}
                  type="button"
                  disabled={isProcessing}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ImportPlayersModal
