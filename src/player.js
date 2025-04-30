import * as L from "leaflet";
import dayjs from "dayjs";
import $ from "jquery";
import { Train } from "./train";
import { RailwayNetwork } from "./network";
import { DisruptedLines } from "./disruptions";
import MareyChart from "./marey";
import { LineChart } from "./linechart";
import Hotspot from "./hotspot";


export class Player {

    animationHandler = null;
    playbackSpeed = 5;

    MAPBOX_TOKEN = "pk.eyJ1Ijoic2FuZGh5YS10dXdpZW4iLCJhIjoiY201eHdyNzcyMDAyODJpc2ZpZGV5YWEwZSJ9.MrTVCgLsbik7V5eBVOHQKA";

    railwayNetwork = new RailwayNetwork();

    /**
     * @type {DisruptedLines}
     */
    disruptedLines;

    /**
     * @type {Train}
     */
    trainRenderer;

    isSliderChanging = false;

    constructor(map) {
        this.map = map;
        const mapboxGl = L.mapboxGL({
            accessToken: this.MAPBOX_TOKEN,
            style: "mapbox://styles/sandhya-tuwien/cm6yyr8jw003s01qva97n5jor"
        }).addTo(map);

        this.fromTimestamp = dayjs("2023-01-01 00:00:00");
        this.currentTimestamp = this.fromTimestamp.clone();
        
        this.dateDisplay = $("#date");
        this.slider = $("#slider");
        this.slider.on("change", this.onSliderChange);
        this.slider.on("mousedown", () => this.isSliderChanging = true);
        this.dateDisplay.text(this.fromTimestamp.format("DD MMM, YYYY"));

        this.init();
        new LineChart(this.setDate, (disruptionType) => {
            this.disruptedLines.toggleDisruption(disruptionType);
            this.trainRenderer.toggleDisruption(disruptionType);

            if(disruptionType) {
                const disruptionTypeLabel = disruptionType.charAt(0).toUpperCase() + disruptionType.slice(1);
                $("#disruptionTypeLabel").text(disruptionTypeLabel).show();
            }
            else {
                $("#disruptionTypeLabel").hide();
            }
        });
    }

    async init() {
        const { stops } = await this.createNetwork();
        this.disruptedLines = new DisruptedLines(this.map, this.railwayNetwork);
        this.trainRenderer = new Train(this.map, this.railwayNetwork, this.disruptedLines, stops);
        this.hotspot = new Hotspot(this.map, stops);
        await this.getServiceDisruptions();
    }

    async getServiceDisruptions() {
        const date = this.fromTimestamp.format("YYYY-MM-DD");
        const disruptedServicesData = new Map();

        try {
            const response = await fetch(`assets/data/services-disruptions/${date}.json`);
            const data = await response.json();
            let id = 0;
    
            for(let trainNo in data) {
                const journeys = data[trainNo];
    
                for(let journey of journeys) {
                    if(!journey.is_disrupted) continue;
    
                    const { disruption, stations } = journey;
                    const arrTime = stations.at(-1).arr_time;
                    const lastStation = stations.at(-1).station_name;
                    const service = { trainNo, disruption, stations, id };
    
                    const disruptedServices = disruptedServicesData.get(arrTime);
                    if(disruptedServices) {
                        disruptedServices.push(service);
                    }
                    else {
                        disruptedServicesData.set(arrTime, [service]);
                    }

                    id++;
                    this.hotspot.addStation(lastStation);
                }
            }

            this.trainRenderer.setDisruptedServices(disruptedServicesData);
            this.hotspot.plot();
        }
        catch(err) {
            console.log(err);
        }
    }

    async createNetwork() {
        const [stopsResponse, segmentsResponse] = await Promise.all([fetch("assets/data/stops.geojson"), fetch("assets/data/segments.geojson")]);
        const [stops, segments] = await Promise.all([stopsResponse.json(), segmentsResponse.json()]);
        this.railwayNetwork.addNodes(stops);
        this.railwayNetwork.addEdges(segments);
        MareyChart.initStations(stops);
        return { stops, segments };
    }

    setDate = (date) => {
        this.pause();
        this.fromTimestamp = dayjs(date);
        this.currentTimestamp = dayjs(date);
        this.dateDisplay.text(this.fromTimestamp.format("DD MMM, YYYY"));
        this.updateTimer();
        this.disruptedLines.clearAll();
        this.trainRenderer.clear();
        this.hotspot.clear();

        this.disruptedLines.setDate(date);
        this.getServiceDisruptions();
    }

    onSliderChange = () => {
        const minutes = this.slider.val();
        this.currentTimestamp = this.fromTimestamp.add(minutes, "minutes");
        this.updateTimer();
        this.isSliderChanging = false;
    }

    play() {
        this.animationHandler = setInterval(this.render, 1000 * (1/this.playbackSpeed));
        $("#playPauseButton").text("Pause");
        this.hotspot.hide();
    }

    pause() {
        clearInterval(this.animationHandler);
        $("#playPauseButton").text("Play");
        this.hotspot.show();
    }

    render = () => {
        this.currentTimestamp = this.currentTimestamp.add(1, "minute");

        this.updateTimer();
        this.trainRenderer.render(this.currentTimestamp);
        this.disruptedLines.render(this.currentTimestamp);

        if(this.currentTimestamp.date() != this.fromTimestamp.date()) {
            this.pause();
        }
    }

    updateTimer() {
        const progressMinutes = this.currentTimestamp.diff(this.fromTimestamp, "minutes");
        const progressPercentage = progressMinutes / 1440 * 100;
        if(!this.isSliderChanging) this.slider.val(progressMinutes);
        
        $(".slider-value").text(this.currentTimestamp.format("HH:mm"));
        $(".slider-value").css("left", `calc(${progressPercentage}% - 30px)`);
        $(".slider-value").css("transform", `translate(- calc(${progressPercentage}% - 30px), 0%);`);
    }
}