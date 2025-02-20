import { DirectedGraph } from "graphology";
import { bidirectional } from "graphology-shortest-path";


export class RailwayNetwork {

    /**
     * @type {Map<string, Array<L.LatLng[]>}
     */
    segments;

    constructor() {
        this.network = new DirectedGraph();
        this.segments = new Map();
    }

    addNodes(stops) {
        for(let feature of stops.features) {
            const { name } = feature.properties;
            if(!this.network.hasNode(name)) {
                this.network.addNode(name);
            }
        }
    }

    hasStation(stationName) {
        return this.network.hasNode(stationName);
    }

    addEdges(segments) {
        for(let feature of segments.features) {
            const { from, to } = feature.properties;
            const segmentId = `${from}_${to}`;
            const coords = feature.geometry.coordinates[0].map((coord) => L.latLng(coord.toReversed()));
            
            if(!this.network.hasNode(from) || !this.network.hasNode(to)) continue;
            
            if(this.segments.has(segmentId)) {
                const segment = this.segments.get(segmentId);
                segment.push(coords);
            }
            else {
                this.network.addEdge(from, to);
                this.segments.set(segmentId, [coords]);
            }            
        }
    }

    getPath(from, to) {
        if(!this.network.hasNode(from) || !this.network.hasNode(to)) return null;

        const stations = bidirectional(this.network, from, to);
        if(!stations) return null;
        
        const path = [];
        for(let i=0; i<stations.length-1; i++) {
            const stationId = stations[i] + "_" + stations[i+1];
            const segments = this.segments.get(stationId);
            if(!segments) continue;

            path.push(...segments);
        }

        return path;
    }
}