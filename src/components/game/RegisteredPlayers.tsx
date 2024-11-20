interface RegisteredPlayersProps {
  registrations: Array<{
    id: string;
    players?: {
      friendly_name: string;
    };
  }>;
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({ registrations }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
    {registrations.map((registration) => (
      <div 
        key={registration.id}
        className="p-3 bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <p className="font-medium text-gray-900">
          {registration.players?.friendly_name || 'Unknown Player'}
        </p>
      </div>
    ))}
  </div>
);
