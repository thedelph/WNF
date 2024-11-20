interface GameDetailsProps {
  date: string;
  registeredCount: number;
  maxPlayers: number;
  isRegistered: boolean;
  isRegistrationWindowOpen: boolean;
  onRegister: () => Promise<void>;
  onUnregister: () => Promise<void>;
  onClose: () => Promise<void>;
  isProcessingClose: boolean;
  isAdmin?: boolean;
}

export const GameDetails: React.FC<GameDetailsProps> = ({
  date,
  registeredCount,
  maxPlayers,
  isRegistered,
  isRegistrationWindowOpen,
  onRegister,
  onUnregister,
  onClose,
  isProcessingClose,
  isAdmin
}) => {
  return (
    <div className="...">
      {/* ... existing UI ... */}
      
      {isAdmin && isRegistrationWindowOpen && (
        <button
          onClick={onClose}
          disabled={isProcessingClose}
          className="btn btn-warning"
        >
          {isProcessingClose ? 'Processing...' : 'Close Registration'}
        </button>
      )}
      
      {/* ... rest of your UI ... */}
    </div>
  );
}; 