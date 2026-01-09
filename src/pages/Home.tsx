import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Home: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Wednesday Night Football</h1>
      <p className="text-xl mb-8">Register your interest for the next game and track your stats!</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 dark:text-white">Next Game</h2>
          <p className="dark:text-gray-300">Date: Wednesday, June 7th, 2023</p>
          <p className="dark:text-gray-300">Time: 9:00 PM - 10:00 PM</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Register Interest</button>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 dark:text-white">Your Stats</h2>
          {user ? (
            <>
              <p className="dark:text-gray-300">Caps: 10</p>
              <p className="dark:text-gray-300">XP: 11</p>
              <p className="dark:text-gray-300">Win Rate: 60%</p>
              <Link to="/profile" className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">View Full Profile</Link>
            </>
          ) : (
            <>
              <p className="dark:text-gray-300">Please log in to view your stats</p>
              <Link to="/login" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home