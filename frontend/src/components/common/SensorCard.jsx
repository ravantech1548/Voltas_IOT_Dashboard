import React from 'react';

const SensorCard = ({ sensor, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg p-6 border-2 transition-all duration-300
        transform hover:scale-[1.02]
        ${isActive 
          ? 'bg-green-50 border-green-500 shadow-lg scale-[1.02] ring-4 ring-green-200 ring-opacity-50' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
      `}
      style={{
        boxShadow: isActive 
          ? '0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)' 
          : undefined
      }}
    >
      {/* Active Indicator Glow */}
      {isActive && (
        <div className="absolute inset-0 rounded-lg bg-green-400 opacity-10 blur-xl animate-pulse" />
      )}

      <div className="relative z-10">
        {/* Sensor Name */}
        <h3 className={`
          text-lg font-semibold mb-2 transition-all duration-300
          ${isActive ? 'text-green-700' : 'text-gray-500 opacity-50'}
        `}>
          {sensor.name}
        </h3>

        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`
              w-4 h-4 rounded-full transition-all duration-300 relative
              ${isActive 
                ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                : 'bg-gray-300'
              }
            `}>
              {isActive && (
                <div className="absolute inset-0 w-full h-full rounded-full bg-white opacity-30 animate-ping" />
              )}
            </div>
            <span className={`
              text-sm font-medium transition-all duration-300
              ${isActive ? 'text-green-700 font-bold' : 'text-gray-400'}
            `}>
              {isActive ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* Duration Display (if active) */}
          {isActive && sensor.duration && (
            <div className="text-xs text-green-600 font-medium animate-fade-in">
              {sensor.duration}
            </div>
          )}
        </div>

        {/* Location/Type Info */}
        <div className="mt-3 text-xs text-gray-500">
          {sensor.location && <div>{sensor.location}</div>}
          {sensor.type && <div>{sensor.type}</div>}
        </div>
      </div>
    </div>
  );
};

export default SensorCard;

