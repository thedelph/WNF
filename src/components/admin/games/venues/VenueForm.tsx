import React from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../utils/supabase';
import { Venue } from '../../../../types/game';

interface VenueFormProps {
  onVenueAdded: () => void;
  editingVenue?: Venue | null;
  onCancel: () => void;
}

export const VenueForm: React.FC<VenueFormProps> = ({
  onVenueAdded,
  editingVenue,
  onCancel,
}) => {
  const [venueName, setVenueName] = React.useState(editingVenue?.name || '');
  const [venueAddress, setVenueAddress] = React.useState(editingVenue?.address || '');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState(editingVenue?.google_maps_url || '');
  const [isDefault, setIsDefault] = React.useState(editingVenue?.is_default || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const venueData = {
      name: venueName,
      address: venueAddress,
      google_maps_url: googleMapsUrl,
      is_default: isDefault,
    };

    if (editingVenue) {
      const { error } = await supabase
        .from('venues')
        .update(venueData)
        .eq('id', editingVenue.id);

      if (error) {
        toast.error('Failed to update venue');
        return;
      }

      toast.success('Venue updated successfully');
    } else {
      const { error } = await supabase
        .from('venues')
        .insert([venueData]);

      if (error) {
        toast.error('Failed to add venue');
        return;
      }

      toast.success('Venue added successfully');
    }

    onVenueAdded();
    resetForm();
  };

  const resetForm = () => {
    setVenueName('');
    setVenueAddress('');
    setGoogleMapsUrl('');
    setIsDefault(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">
          <span className="label-text">Venue Name</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
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
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
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
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Set as Default Venue</span>
          <input
            type="checkbox"
            className="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {editingVenue ? 'Update' : 'Add'} Venue
        </button>
      </div>
    </form>
  );
};
