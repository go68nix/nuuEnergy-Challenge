type Props = {
  address: string
  coordinates?: { lat: number; lon: number }
}

export const LocationMapPreview = ({ address, coordinates }: Props) => {
  if (!coordinates) return null
  const { lat, lon } = coordinates
  const bbox = `${lon - 0.006},${lat - 0.004},${lon + 0.006},${lat + 0.004}`
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`
  const openUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
  return <div className="location-map-preview">
    <iframe title={`OpenStreetMap location for ${address}`} src={mapUrl} loading="lazy" />
    <div className="location-map-footer">
      <span>Map location is approximate. © OpenStreetMap contributors</span>
      <a href={openUrl} target="_blank" rel="noreferrer">Open larger map ↗</a>
    </div>
  </div>
}
