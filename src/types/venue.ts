export interface Venue {
  id: string
  name: string
  address: string
  googleMapsUrl: string
}

export interface VenueDBResponse {
  id: string
  name: string
  address: string
  google_maps_url: string
}

export const transformVenueFromDB = (venue: VenueDBResponse): Venue => ({
  id: venue.id,
  name: venue.name,
  address: venue.address,
  googleMapsUrl: venue.google_maps_url
})
