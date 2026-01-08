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
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Blue Team Score</legend>
        <input
          type="number"
          value={blueScore}
          onChange={(e) => onBlueScoreChange(e.target.value)}
          className="input"
          min="0"
          placeholder="Optional"
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Orange Team Score</legend>
        <input
          type="number"
          value={orangeScore}
          onChange={(e) => onOrangeScoreChange(e.target.value)}
          className="input"
          min="0"
          placeholder="Optional"
        />
      </fieldset>
    </div>
  )
}

export default ScoreInputs
