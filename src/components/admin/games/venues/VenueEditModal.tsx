import React, { useState } from 'react';
import { Venue } from '../../../../types/game';
import { supabase } from '../../../../utils/supabase';
import toast from 'react-hot-toast';

interface VenueEditModalProps {
  venue: Venue;
  onClose: () => void;
  onVenueUpdated: () => void;
}

export const VenueEditModal: React.FC<VenueEditModalProps> = ({
  venue,
  onClose,
  onVenueUpdated,
}) => {
  const [formData, setFormData] = useState({
    name: venue.name,
    address: venue.address,
    google_maps_url: venue.google_maps_url || '',
    is_default: venue.is_default || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('venues')
        .update({
          name: formData.name,
          address: formData.address,
          google_maps_url: formData.google_maps_url,
          is_default: formData.is_default,
        })
        .eq('id', venue.id);

      if (error) throw error;

      toast.success('Venue updated successfully');
      onVenueUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating venue:', error);
      toast.error('Failed to update venue');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Venue</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Venue Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Address</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Google Maps URL</span>
            </label>
            <input
              type="url"
              className="input input-bordered w-full"
              value={formData.google_maps_url}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Set as Default Venue</span>
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              />
            </label>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
