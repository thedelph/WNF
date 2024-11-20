import { format } from 'date-fns';

interface GameDetailsProps {
  date: string;
  registeredCount: number;
  maxPlayers: number;
  isRegistered: boolean;
  isRegistrationWindowOpen: boolean;
  onRegister: () => void;
  onUnregister: () => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({
  date,
  registeredCount,
  maxPlayers,
  isRegistered,
  isRegistrationWindowOpen,
  onRegister,
  onUnregister,
}) => (
  <div className="text-center">
    <h2 className="text-2xl font-bold mb-2">
      {format(new Date(date), 'EEEE d MMMM yyyy')}
    </h2>
    <p className="text-xl">
      {format(new Date(date), 'HH:mm')}
    </p>
    
    <div className="mt-4 mb-6">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        {registeredCount}/{maxPlayers} Registered
      </span>
    </div>

    {isRegistrationWindowOpen ? (
      <button
        onClick={isRegistered ? onUnregister : onRegister}
        className={`${
          isRegistered 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white font-bold py-2 px-6 rounded-lg transition-colors`}
      >
        {isRegistered ? 'Unregister' : 'Register'}
      </button>
    ) : (
      <p className="text-sm text-gray-500 mt-2">
        Registration window has closed
      </p>
    )}
  </div>
); 