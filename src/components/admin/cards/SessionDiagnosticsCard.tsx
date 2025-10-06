import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle } from 'lucide-react'

const SessionDiagnosticsCard: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title">
          <Activity className="w-6 h-6" />
          Session Diagnostics
        </h2>
        <p>Diagnose and fix user login issues</p>
        <div className="card-actions justify-between items-center mt-4">
          <div className="badge badge-warning gap-1">
            <AlertTriangle className="w-3 h-3" />
            Fix Login Issues
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/admin/session-diagnostics')}
          >
            Open Tool
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionDiagnosticsCard