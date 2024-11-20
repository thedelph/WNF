import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { supabase } from '../../../utils/supabase'
import { Venue } from '../../../types/game'
import FormContainer from '../../common/containers/FormContainer'

interface Props {
  venues: Venue[]
  onUpdate: () => Promise<void>
}

export const VenueManagement: React.FC<Props> = ({ venues, onUpdate }) => {
  const [isAddingVenue, setIsAddingVenue] = useState(false)
  const [isEditingVenue, setIsEditingVenue] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueAddress, setNewVenueAddress] = useState('')
  const [newVenueMapUrl, setNewVenueMapUrl] = useState('')

  const resetForm = () => {
    setNewVenueName('')
    setNewVenueAddress('')
    setNewVenueMapUrl('')
    setIsAddingVenue(false)
    setIsEditingVenue(false)
    setEditingVenue(null)
  }

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditingVenue && editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update({
            name: newVenueName,
            address: newVenueAddress,
            google_maps_url: newVenueMapUrl
          })
          .match({ id: editingVenue.id })

        if (error) throw error
        toast.success('Venue updated successfully!')
      } else {
        const { error } = await supabase
          .from('venues')
          .insert({
            name: newVenueName,
            address: newVenueAddress,
            google_maps_url: newVenueMapUrl
          })

        if (error) throw error
        toast.success('Venue added successfully!')
      }

      resetForm()
      onUpdate()
    } catch (error) {
      toast.error(isEditingVenue ? 'Failed to update venue' : 'Failed to add venue')
    }
  }

  const handleEditVenue = (venue: Venue) => {
    setIsEditingVenue(true)
    setEditingVenue(venue)
    setNewVenueName(venue.name)
    setNewVenueAddress(venue.address)
    setNewVenueMapUrl(venue.google_maps_url || '')
  }

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .match({ id: venueId })

      if (error) throw error

      toast.success('Venue deleted successfully!')
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete venue')
    }
  }

  return (
    <FormContainer title="Venue Management">
      <div className="space-y-4">
        {/* Venue List */}
        <div className="space-y-2">
          {venues.map((venue) => (
            <motion.div
              key={venue.id}
              className="flex justify-between items-center p-3 bg-base-200 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div>
                <h3 className="font-medium">{venue.name}</h3>
                <p className="text-sm text-gray-500">{venue.address}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditVenue(venue)}
                  className="btn btn-sm btn-ghost"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVenue(venue.id)}
                  className="btn btn-sm btn-error"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add/Edit Venue Form */}
        {(isAddingVenue || isEditingVenue) ? (
          <form onSubmit={handleVenueSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Venue Name</span>
              </label>
              <input
                type="text"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Address</span>
              </label>
              <input
                type="text"
                value={newVenueAddress}
                onChange={(e) => setNewVenueAddress(e.target.value)}
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Google Maps URL</span>
              </label>
              <input
                type="url"
                value={newVenueMapUrl}
                onChange={(e) => setNewVenueMapUrl(e.target.value)}
                className="input input-bordered"
                placeholder="https://maps.google.com/..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
            >
              {isEditingVenue ? 'Update Venue' : 'Add Venue'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingVenue(true)}
            className="btn btn-primary"
          >
            Add Venue
          </button>
        )}
      </div>
    </FormContainer>
  )
}
