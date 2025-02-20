import * as L from "leaflet";
import "mapbox-gl-leaflet";
import $ from "jquery";
import { addServices, addStations } from "./layers";
import { Player } from "./player";
import "./index.css";
import CalHeatmap from 'cal-heatmap';
import Legend from 'cal-heatmap/plugins/Legend';
import Tooltip from 'cal-heatmap/plugins/Tooltip';


const renderer = L.canvas({ tolerance: 10 });
const map = L.map("map", { center: [52.15838, 5.563263], zoom: 8, minZoom: 8, maxZoom: 22, renderer, attributionControl: false });

// Add layers
addStations(map);
addServices(map);

const player = new Player(map);
let isPlaying = false;

$("#playPauseButton").on("click", () => {
    if (!isPlaying) {
        player.play();
        isPlaying = true;
    }
    else {
        player.pause();
        isPlaying = false;
    }
});

async function calheatmap() {
    const response = await fetch("assets/data/cal_heatmap_data.json");
    const data = await response.json();
    const cal = new CalHeatmap();

    cal.paint({
        data: {
            source: data,
            type: 'json',
            x: 'date',
            y: 'value'
        },
        date: {
            start: new Date('2023-01-01'),
            min: new Date('2023-01-01'),
            max: new Date('2023-12-31')
        },
        domain: {
            type: 'month',
            gutter: 15
        },
        subDomain: { type: 'day', radius: 2, gutter: 3, width: 10, height: 10 },
        range: 4,
        scale: { color: { type: 'linear', scheme: 'Reds', domain: [1, 123] } },
    },
    [
        [
            Tooltip,
            {
                text: (timestamp, value) => {
                    const date = new Date(timestamp); // Convert timestamp to Date object
                    return `${date.toISOString().split("T")[0]}`;
                }
            }
        ],
        [
            Legend,
            {
                label: 'No.of.Disruptions',
                width: 400,
                itemSelector: '#cal-heatmap-legend'
            }
        ]
    ]);
    
    cal.on("click", (event, timestamp, value) => {
        const date = new Date(timestamp).toISOString().slice(0, 10);
        player.setDate(date);
    });

    document.getElementById("prev-btn").addEventListener("click", () => {
        cal.previous(); // Move to the previous range
    });

    document.getElementById("next-btn").addEventListener("click", () => {
        cal.next(); // Move to the next range
    });
}

calheatmap();
