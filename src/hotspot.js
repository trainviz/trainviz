import * as L from 'leaflet';
import "leaflet.heat";

class Hotspot {

    heatLayer = null;
    
    /**
     * @param {L.Map} map 
     * @param stops 
     */
    constructor(map, stops) {
        this.map = map;
        this.disruptedStations = new Map();
        this.stationCoords = new Map();

        for(let feature of stops.features) {
            const { name } = feature.properties;
                const coords = feature.geometry.coordinates;
                this.stationCoords.set(name, L.latLng(coords[1], coords[0]));
        }
    }

    addStation(stationName) {
        if (this.disruptedStations.has(stationName)) {
            this.disruptedStations.set(stationName, this.disruptedStations.get(stationName) + 1);
        } else {
            this.disruptedStations.set(stationName, 1);
        }
    }

    plot() {
        this.heatLayer?.remove();

        const min = Math.min(...Array.from(this.disruptedStations.values()));
        const max = Math.max(...Array.from(this.disruptedStations.values()));
        const heatData = Array.from(this.disruptedStations.entries()).map(([stationName, count]) => {
            const coords = this.stationCoords.get(stationName);
            if (!coords) return null;
            const intensity = (count - min) / (max - min);
            return [coords.lat, coords.lng, intensity];
        }).filter(Boolean);

        this.heatLayer = L.heatLayer(heatData, {
            radius: 20,
            blur: 15,
            maxZoom: 1,
            minOpacity: 0.5
        }).addTo(this.map);
    }

    show() {
        if(this.heatLayer && !this.map.hasLayer(this.heatLayer)) {
            this.heatLayer.addTo(this.map);
        }
    }

    hide() {
        if(this.heatLayer && this.map.hasLayer(this.heatLayer)) {
            this.map.removeLayer(this.heatLayer);
        }
    }

    clear() {
        this.disruptedStations.clear();
        this.heatLayer?.remove();
    }
}

export default Hotspot;