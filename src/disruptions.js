import * as L from "leaflet";
import { RailwayNetwork } from "./network";
import dayjs, { Dayjs } from "dayjs";
import $ from "jquery";


export class DisruptedLines {

    disruptions = [];
    filteredDisruptions = [];

    /**
     - Key - disruptionId
     - Value - {disruption: Disruption, featureGroup: L.FeatureGroup[]}
     */
    plottedDisruptions = new Map();

    flashGroup = L.featureGroup();
    flashHandler;


    /**
     * @param { L.Map } map
     * @param { RailwayNetwork } network
     */
    constructor(map, network) {
        this.map = map;
        this.network = network;
        this.flashGroup.addTo(map);
        this.init();
        $("#discloseInfoPanel").on("click", () => this.closeInfo());
    }

    async init() {
        const response = await fetch("assets/data/disrupted_lines.json");
        const disruptedLines = await response.json();

        for(let i=0; i<disruptedLines.length; i++) {
            const disruptedLine = disruptedLines[i];
            const rdtLine = disruptedLine.rdt_lines.split(" - ");
            if(rdtLine.length < 2) continue;
            
            const from = rdtLine[0].trim();
            const to = rdtLine[1].trim();
            const cause = disruptedLine.statistical_cause_en;
            const causeGroup = disruptedLine.cause_group;
            const startTime = dayjs(disruptedLine.start_time).second(0);
            const endTime = dayjs(disruptedLine.end_time).second(0);
            const duration = disruptedLine.duration_minutes;

            if(!this.network.hasStation(from) || !this.network.hasStation(to)) continue;

            const data = {disruptionId: i, from, to, cause, causeGroup, startTime, endTime, duration};
            this.disruptions.push(data);
        }
    }

    setDate(dateString) {
        const date = dayjs(dateString);
        this.filteredDisruptions = this.disruptions.filter((disruption) => {
            const startTime = disruption.startTime.hour(0).minute(0).second(0);
            const difference = date.diff(startTime, "days");
            return difference > -1 && difference <= 2;
        });
    }

    /**
     * 
     * @param {dayjs.Dayjs} timestamp 
     */
    render(timestamp) {
        this.clear(timestamp);

        const disruptions = this.filteredDisruptions.filter((disurption) => 
            timestamp.isAfter(disurption.startTime) && timestamp.isBefore(disurption.endTime));

        const colors = {"weather": "#4e75b2", "accidents": "#d6b34a", "infrastructure": "#a077c0", "unknown": "#b97a57", "rolling stock": "#b82b8b", "external": "#ff6f61", "staff": "#34B6AC", "logistical": "#ff82a9", "engineering work": "#ff82a9"}

        for(let disruption of disruptions) {
            const { disruptionId, from, to, causeGroup, duration } = disruption;
            if(this.plottedDisruptions.has(disruptionId)) continue;
            
            const path = this.network.getPath(from, to);
            const reversePath = this.network.getPath(to, from);

            let weight;
            if(duration <= 10){
                weight = 0.5;
            }
            else if(duration <= 120) {
                weight = 1.2;
            }
            else {
                weight = 2.5;
            }

            const lineOptions = { color: colors[causeGroup] || "#f00", weight: weight };

            const featureGroup = L.featureGroup().addTo(this.map);
            if(path) {
                const pathLine = L.polyline(path, lineOptions).addTo(featureGroup);
                pathLine.on("click", () => this.showInfo(disruption));
            }
            if(reversePath) {
                const reversepathLine = L.polyline(reversePath, lineOptions).addTo(featureGroup);
                reversepathLine.on("click", () => this.showInfo(disruption));
            } 

            this.plottedDisruptions.set(disruptionId, { disruption, featureGroup });
        }
    }

    /**
     * @param {Dayjs} timestamp 
     */
    clear(timestamp) {
        for(let [disruptionId, data] of this.plottedDisruptions.entries()) {
            if(timestamp.isBefore(data.disruption.startTime) || timestamp.isAfter(data.disruption.endTime)) {
                this.map.removeLayer(data.featureGroup);
                this.plottedDisruptions.delete(disruptionId);
            }
        }
    }

    clearAll() {
        for(let data of this.plottedDisruptions.values()) {
            this.map.removeLayer(data.featureGroup);
        }

        this.plottedDisruptions.clear();
        this.filteredDisruptions = [];
        this.stopFlash();
    }

    flash(rdt_lines) {
        this.flashGroup.clearLayers();
        const rdtLines = rdt_lines.split(",");

        for(let rdtLine of rdtLines) {
            const line = rdtLine.trim();
            const stations = line.split(" - ");
            if(stations.length < 2) continue;

            const from = stations[0].trim();
            const to = stations[1].trim();

            const path = this.network.getPath(from, to);
            const reversePath = this.network.getPath(to, from);

            const lineOptions = { color: "#f00", interactive: false };
            if(path) L.polyline(path, lineOptions).addTo(this.flashGroup);
            if(reversePath) L.polyline(reversePath, lineOptions).addTo(this.flashGroup);
        }

        if(!this.map.hasLayer(this.flashGroup)) this.map.addLayer(this.flashGroup);
        if(this.flashGroup.getLayers().length) this.map.fitBounds(this.flashGroup.getBounds());
        this.animateFlash();
    }

    animateFlash() {
        clearInterval(this.flashHandler);
        this.flashHandler = setInterval(() => {
            this.map.hasLayer(this.flashGroup) ? this.map.removeLayer(this.flashGroup) : this.map.addLayer(this.flashGroup);
        }, 400);
    }

    stopFlash() {
        this.flashGroup.clearLayers();
        clearInterval(this.flashHandler);
        this.map.flyTo([52.15838, 5.563263], 8, { duration: 0.5 });
    }

    showInfo(disruption) {
        console.log(disruption);
        const { disruptionId, from, to, causeGroup, cause, duration } = disruption;

        $("#disruptionId").text(disruptionId);
        $("#from").text(from);
        $("#to").text(to);
        $("#discause").text(cause);
        $("#discauseGroup").text(causeGroup);
        $("#duration").text(duration);
        $(".dis-info-panel").show();
    }

    closeInfo() {
        $(".dis-info-panel").hide();
    }
}