import * as L from "leaflet";

export async function addStations(map) {
    const stationsUrl = "assets/data/stops.geojson";
    const response = await fetch(stationsUrl);
    const data = await response.json();

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 2,
                fillColor: "#3D3D3D",
                color: "#3D3D3D",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8,
                interactive: false
            });
        }
    }).addTo(map);
}

export async function addServices(map) {
    const stationsUrl = "assets/data/railway_lines.geojson";
    const response = await fetch(stationsUrl);
    const data = await response.json();

    L.geoJSON(data, { style: { weight: 0.5, color: "#3D3D3D", interactive: false } }).addTo(map);
}