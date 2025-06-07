import React from 'react'

interface Props {
  blueScore: string
  orangeScore: string
  onBlueScoreChange: (value: string) => void
  onOrangeScoreChange: (value: string) => void
}

const ScoreInputs: React.FC<Props> = ({
  blueScore,
  orangeScore,
  onBlueScoreChange,
  onOrangeScoreChange
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Blue Team Score</span>
        </label>
        <input
          type="number"
          value={blueScore}
          onChange={(e) => onBlueScoreChange(e.target.value)}
          className="input input-bordered"
          min="0"
          placeholder="Optional"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Orange Team Score</span>
        </label>
        <input
          type="number"
          value={orangeScore}
          onChange={(e) => onOrangeScoreChange(e.target.value)}
          className="input input-bordered"
          min="0"
          placeholder="Optional"
        />
      </div>
    </div>
  )
}

export default ScoreInputs
