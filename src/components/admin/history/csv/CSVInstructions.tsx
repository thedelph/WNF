import React from 'react'
import { FaInfoCircle, FaFileDownload } from 'react-icons/fa'

interface Props {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const CSVInstructions: React.FC<Props> = ({ onFileUpload }) => {
  const downloadTemplate = () => {
    const headers = 'Date,Player Name,Team,Blue Score,Orange Score\n'
    const example = '2024-01-01,John Smith,blue,3,2\n2024-01-01,Jane Doe,orange,3,2'
    const blob = new Blob([headers + example], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historical_games_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-4">
      <div className="card-body">
        <h2 className="card-title flex items-center">
          <FaInfoCircle className="mr-2" /> CSV Import Instructions
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm mt-2">
          <li>Date format should be YYYY-MM-DD</li>
          <li>Team should be either 'blue' or 'orange' (case sensitive)</li>
          <li>Scores are optional - leave blank if unknown</li>
          <li>Player names must match existing friendly names in the system</li>
          <li>Multiple rows per game (one for each player)</li>
        </ul>
        <div className="flex justify-between items-center mt-4">
          <button 
            onClick={downloadTemplate}
            className="btn btn-sm btn-outline"
          >
            <FaFileDownload className="mr-2" /> Download Template
          </button>
          <input
            type="file"
            accept=".csv"
            onChange={onFileUpload}
            className="file-input file-input-bordered file-input-sm w-full max-w-xs"
          />
        </div>
      </div>
    </div>
  )
}

export default CSVInstructions
