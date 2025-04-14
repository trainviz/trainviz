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
     - Value - { position: L.LatLng, bearing: number, bars: L.Marker[] }
     */
    destinations = new Map();

    /**
     * @type {L.Polyline}
     */
    trainPath;

    pulseMarker;

    /** Disruption type currently enabled from line chart */
    disruptionType = "";

    stationCoords = new Map();
    stationLabels = [];
    stationBounds = [];

    /**
     * 
     * @param {L.Map} map 
     * @param {RailwayNetwork} railwayNetwork 
     * @param {DisruptedLines} disruptedLines 
     * @param stops 
     */
    constructor(map, railwayNetwork, disruptedLines, stops) {
        this.map = map;
        this.disruptedLines = disruptedLines;
        this.railwayNetwork = railwayNetwork;
        this.trainGroup = L.featureGroup().addTo(this.map);
        this.barGroup = L.featureGroup().addTo(this.map);
        this.stationGroup = L.featureGroup().addTo(this.map);

        for(let feature of stops.features) {
            const { name } = feature.properties;
            const coords = feature.geometry.coordinates;
            this.stationCoords.set(name, L.latLng(coords[1], coords[0]));
        }

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

        const scaledBarWidth = this.getScaledBarWidth(barWidth);
        let bar, train;

        if(!this.destinations.has(lastStation)) {
            const lastSegment = path.at(-1);
            const lastVertex = lastSegment.at(-1);
            const penultimateVertex = lastSegment.at(-2);
            let bearing = GeometryUtil.bearing(penultimateVertex, lastVertex);
            if(bearing < 0) bearing += 360;

            train = L.marker(lastVertex, { rotationAngle: bearing, rotationOrigin: "center center", icon: icons.dTrain(1), 
                interactive: false });

            const barGap = 2;
            const iconGap = this.getIconGap(barGap);
            bar = L.marker(lastVertex, { rotationAngle: bearing, rotationOrigin: "center center", barWidth, barGap, bearing, isCancelled, isPartial, causeGroup,
                icon: icons.bar(scaledBarWidth, iconGap, bearing, isCancelled, isPartial, causeGroup)});
            bar.on("click", () => this.showInfo(bar, service));
            
            this.destinations.set(lastStation, {position: lastVertex, bearing, bars: [bar]});
        }
        else {
            const destination = this.destinations.get(lastStation);
            const addedBars = destination.bars.filter((bar) => this.map.hasLayer(bar));
            const barGap = 2 + (addedBars.length * 0.6) ;
            const iconGap = this.getIconGap(barGap);
            bar = L.marker(destination.position, { rotationAngle: destination.bearing, rotationOrigin: "center center", barWidth, barGap, bearing: destination.bearing, isCancelled, isPartial, causeGroup,
                icon: icons.bar(scaledBarWidth, iconGap, destination.bearing, isCancelled, isPartial, causeGroup) });
            bar.on("click", () => this.showInfo(bar, service));
            destination.bars.push(bar);
        }

        if(!this.disruptionType || this.disruptionType == causeGroup) {
            if(train) train.addTo(this.trainGroup);
            bar.addTo(this.barGroup);
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
            const scaledBarWidth = this.getScaledBarWidth(barWidth);

            const iconGap = this.getIconGap(barGap);
            layer.setIcon(icons.bar(scaledBarWidth, iconGap, bearing, isCancelled, isPartial, causeGroup))
        });

        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) {
            const { barGap, bearing } = this.pulseMarker.options;
            const iconGap = this.getIconGap(barGap);
            this.pulseMarker.setIcon(icons.pulseIcon(iconGap, bearing));
        }

        this.stationGroup.clearLayers();
        this.stationBounds = [];
        for(let label of this.stationLabels) {
            const labelBounds = this.getBounds(label.getLatLng());
            const isIntersecting = this.doesLabelIntersect(labelBounds);

            if(!isIntersecting) {
                this.stationGroup.addLayer(label);
            }

            // Push labelBounds to the array after checking intersection
            this.stationBounds.push(labelBounds)
        }
    }

    /** Toggle disrupted services based on disruption type */
    toggleDisruption(disruptionType) {
        this.trainGroup.clearLayers();
        this.barGroup.clearLayers();
        this.disruptionType = disruptionType;

        for(let destination of this.destinations.values()) {
            const { position, bearing, bars } = destination;
            let skippedBarsCount = 0;
            let isTrainPlotted = false;

            for(let i=0; i<bars.length; i++) {
                const bar = bars[i];
                const {barWidth, isCancelled, isPartial, causeGroup} = bar.options;
                if(disruptionType && disruptionType != causeGroup) {
                    skippedBarsCount++;
                    continue;
                }

                if(!isTrainPlotted) {
                    L.marker(position, { rotationAngle: bearing, rotationOrigin: "center center", 
                        icon: icons.dTrain(1), interactive: false }).addTo(this.trainGroup);
                    isTrainPlotted = true;
                }

                const scaledBarWidth = this.getScaledBarWidth(barWidth);
                const barGap = 2 + ((i - skippedBarsCount) * 0.6) ;
                const iconGap = this.getIconGap(barGap);

                const icon = icons.bar(scaledBarWidth, iconGap, bearing, isCancelled, isPartial, causeGroup);
                bar.setIcon(icon);
                bar.options.barGap = barGap;
                bar.addTo(this.barGroup);
            }
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
        this.showStations(stations);


        // Highlight clicked bar
        const pulsePosition = barMarker.getLatLng();
        const { barGap, bearing } = barMarker.options;
        const iconGap = this.getIconGap(barGap);

        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) this.map.removeLayer(this.pulseMarker);            
        this.pulseMarker = L.marker(pulsePosition, { barGap, bearing, icon: icons.pulseIcon(iconGap, bearing), interactive: false }).addTo(this.map);
    }

    closeInfo() {
        $(".info-panel").hide();
        MareyChart.destroy();
        this.disruptedLines.stopFlash();
        this.hideTrainPath();
        if(this.pulseMarker && this.map.hasLayer(this.pulseMarker)) this.map.removeLayer(this.pulseMarker);
        this.clearStationLabels();
    }

    clear() {
        this.trainGroup.clearLayers();
        this.barGroup.clearLayers();
        this.destinations.clear();
        this.hideTrainPath();
        this.clearStationLabels();
    }

    clearStationLabels() {
        this.stationGroup.clearLayers();
        this.stationLabels = [];
        this.stationBounds = [];
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

    showStations(stations) {
        this.clearStationLabels();

        for(let station of stations) {
            const { station_name } = station;
            const stationPosition = this.stationCoords.get(station_name);
            if(!stationPosition) continue;

            const label = L.marker(stationPosition, {
                icon: L.divIcon({ html: station_name, className: "station-name", iconSize: [80, 20] }),
                interactive: false
            });
            this.stationLabels.push(label);

            const labelBounds = this.getBounds(stationPosition);
            const isIntersecting = this.doesLabelIntersect(labelBounds);
    
            if(!isIntersecting) {
                this.stationGroup.addLayer(label);
            }
    
            this.stationBounds.push(labelBounds);
        }
    }

    doesLabelIntersect(labelBounds) {
        for(let bounds of this.stationBounds) {
            if(labelBounds.intersects(bounds)) {
                return true;
            }
        }

        return false;
    }
    
    getBounds(position) {
        const topLeft = this.map.latLngToContainerPoint(position);
        const bottomRight = L.point(topLeft.x + 80, topLeft.y + 20);
        const labelBounds = L.bounds(topLeft, bottomRight);

        return labelBounds;
    }

    getScaledBarWidth(barWidth) {
        let scaledBarWidth = barWidth * (this.map.getZoom() / 18);
        if(scaledBarWidth < 3) scaledBarWidth = 3;
        if(scaledBarWidth > 30) scaledBarWidth = 30;

        return scaledBarWidth;
    }

    getIconGap(barGap) {
        return barGap * (this.map.getZoom() / 18);
    }
    
}