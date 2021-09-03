export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoic3VsaW1hbjE0NzQiLCJhIjoiY2tzaHlkdHMwMDZuNTJvbDRtaXFqOTYyMCJ9.uG4BHnEYwbhKORuZW-vH3Q';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/suliman1474/ckshyumtv06qr17nyun4sfkc1',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //create a marker
    const el = document.createElement('div');
    el.className = 'marker'; // we have it designed in our css file
    //add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom' // so markers end piont will be on location
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // for popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p> Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    //extends map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
