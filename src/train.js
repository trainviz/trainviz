import * as L from "leaflet";
import "leaflet-rotatedmarker";
import "leaflet.marker.slideto";
import GeometryUtil from "leaflet-geometryutil";
import icons from "./icons";
import { RailwayNetwork } from "./network";
import { DisruptedLines } from "./disruptions";
import $ from "jquery";
import MareyChart from "./marey";


export class Train {


    /**
     - Key - Station name
     - Value - { barGap: number, position: L.LatLng, bearing: number }
     */
    destinations = new Map();

    /**
     * @type {L.Polyline}
     */
    trainPath;

    pulseMarker;

    /**
     * 
     * @param {L.Map} map 
     * @param {RailwayNetwork} railwayNetwork 
     * @param {DisruptedLines} disruptedLines 
     */
    constructor(map, railwayNetwork, disruptedLines) {
        this.map = map;
        this.disruptedLines = disruptedLines;
        this.railwayNetwork = railwayNetwork;
        this.trainGroup = L.featureGroup().addTo(this.map);
        this.barGroup = L.featureGroup().addTo(this.map);

        this.map.on("zoomend", this.onZoomEnd);
        $("#closeInfoPanel").on("click", () => this.closeInfo());
    }

    render(service) {
        const { stations } = service;
        const causeGroup = service.disruption.cause_group;
        const isCancelled = stations[0].complete_cancellation == "true";
        const maxDelay = parseInt(stations[0].max_delay);
        const lastStation = stations.at(-1).station_name;
        const penultimateStation = stations.at(-2).station_name;
        let isPartial = false;

        for(let station of stations){
            if(station.partly_cancellation == "true"){
                isPartial = true;
                break;
            }   
        }

        const path = this.railwayNetwork.getPath(penultimateStation, lastStation);
        if(!path) {
            console.log(`${penultimateStation} - ${lastStation}`);
            return;
        }
        
        let barWidth;
        if(maxDelay < 5)
            barWidth = 10;
        else if(maxDelay < 15)
            barWidth = 20;
        else
            barWidth = 30;

        const zoom = this.map.getZoom();
        let scaledBarWidth = barWidth * (zoom / 18);
        if(scaledBarWidth < 3) scaledBarWidth = 3;
        if(scaledBarWidth > 30) scaledBarWidth = 30;

        if(!this.destinations.has(lastStation)) {
            const lastSegment = path.at(-1);
            const lastVertex = lastSegment.at(-1);
            const penultimateVertex = lastSegment.at(-2);
            let bearing = GeometryUtil.bearing(penultimateVertex, lastVertex);
            if(bearing < 0) bearing += 360;

            L.marker(lastVertex, { rotationAngle: bearing, rotationOrigin: "center center", icon: icons.dTrain(1), 
                interactive: false }).addTo(this.trainGroup);

            const barGap = 2;
            const iconGap = barGap * (zoom / 18) ;
            const bar = L.marker(lastVertex, { rotationAngle: bearing, rotationOrigin: "center center", barWidth, barGap, bearing, isCancelled, isPartial, causeGroup,
                icon: icons.bar(scaledBarWidth, iconGap, bearing, isCancelled, isPartial, causeGroup)}).addTo(this.barGroup);
            bar.on("click", () => this.showInfo(bar, service));
            
            this.destinations.set(lastStation, {barGap, position: lastVertex, bearing});
        }
        else {
            const destination = this.destinations.get(lastStation);
            const barGap = destination.barGap + 0.6;
            const iconGap = barGap * (zoom / 18) ;
            const bar = L.marker(destination.position, { rotationAngle: destination.bearing, rotationOrigin: "center center", barWidth, barGap, bearing: destination.bearing, isCancelled, isPartial, causeGroup,
                icon: icons.bar(scaledBarWidth, iconGap, destination.bearing, isCancelled, isPartial, causeGroup) }).addTo(this.barGroup);
            destination.barGap = barGap;
            bar.on("click", () => this.showInfo(bar, service));
        }
    }

    onZoomEnd = () => {
        const zoom = this.map.getZoom();
        const scaleFactor = zoom <= 12 ? 1 : 2;
        this.trainGroup.eachLayer((layer) => {
            layer.setIcon(icons.dTrain(scaleFactor));
        });

        this.barGroup.eachLayer((layer) => {
            const { barWidth, barGap, bearing, isCancelled, isPartial, causeGroup } = layer.options;
            let scaledBarWidth = barWidth * (zoom / 18);
            if(scaledBarWidth < 3) scaledBarWidth = 3;
            if(scaledBarWidth > 30) scaledBarWidth = 30;

            const iconGap = barGap * (zoom / 18) ;
            layer.setIcon(icons.bar(scaledBarWidth, iconGap, bearing, isCancelled, isPartial, causeGroup))
        });

        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) {
            const { barGap, bearing } = this.pulseMarker.options;
            const iconGap = barGap * (zoom / 18) ;
            this.pulseMarker.setIcon(icons.pulseIcon(iconGap, bearing));
        }
    }

    showInfo(barMarker, service) {
        console.log(service);
        const {trainNo, disruption, stations} = service;
        const origin = stations[0].station_name;
        const destination = stations.at(-1).station_name;
        const rdtLines = disruption.rdt_lines;
        const disruptedStations = disruption.station_names;
        const cause = disruption.statistical_cause;
        const causeGroup = disruption.cause_group;
        const isCancelled = stations[0].complete_cancellation == "true";
        const maxDelay = stations[0].max_delay;

        $("#trainNo").text(trainNo);
        $("#origin").text(origin);
        $("#destination").text(destination);
        $("#rdtLines").text(rdtLines);
        $("#disruptedStations").text(disruptedStations);
        $("#cause").text(cause);
        $("#causeGroup").text(causeGroup);
        $("#maxDelay").text(maxDelay);

        $("#completeCancellation").hide();
        $("#partlyCancellation").hide();
        $("#cancelledStationsField").hide();
        $("#maxDelayField").hide();

        if(isCancelled) {
            $("#completeCancellation").show();
            MareyChart.destroy();
        }
        else {
            const cancelledStations = [];
            for(let station of stations){
                if(station.arr_cancelled == "true" || station.dept_cancelled == "true"){
                    cancelledStations.push(station.station_name);
                }   
            }

            if(cancelledStations.length > 0) {
                $("#partlyCancellation").show();
                $("#cancelledStationsField").show();
                $("#cancelledStations").text(cancelledStations.join(", "));
            }

            $("#maxDelayField").show();
            MareyChart.draw(stations);
        }

        $(".info-panel").show();
        this.disruptedLines.flash(rdtLines);
        this.showTrainPath(stations);


        // Highlight clicked bar
        const pulsePosition = barMarker.getLatLng();
        const { barGap, bearing } = barMarker.options;
        const iconGap = barGap * (this.map.getZoom() / 18) ;

        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) this.map.removeLayer(this.pulseMarker);            
        this.pulseMarker = L.marker(pulsePosition, { barGap, bearing, icon: icons.pulseIcon(iconGap, bearing), interactive: false }).addTo(this.map);
    }

    closeInfo() {
        $(".info-panel").hide();
        MareyChart.destroy();
        this.disruptedLines.stopFlash();
        this.hideTrainPath();
        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) this.map.removeLayer(this.pulseMarker);            
    }

    clear() {
        this.trainGroup.clearLayers();
        this.barGroup.clearLayers();
        this.destinations.clear();
        this.hideTrainPath();
    }

    showTrainPath(stations) {
        const multiLineCoords = [];
        for(let i=0; i<stations.length - 1; i++) {
            const from = stations[i].station_name;
            const to = stations[i+1].station_name;
            const path = this.railwayNetwork.getPath(from, to);
            
            if(path) {
                multiLineCoords.push(...path);
            }
        }

        if(this.trainPath && this.map.hasLayer(this.trainPath)) {
            this.trainPath.setLatLngs(multiLineCoords);
        }
        else {
            this.trainPath = L.polyline(multiLineCoords, { color: "#f00" }).addTo(this.map);
        }
    }

    hideTrainPath() {
        if(this.trainPath && this.map.hasLayer(this.trainPath)) {
            this.map.removeLayer(this.trainPath);
        }
    }
    
}