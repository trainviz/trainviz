import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import am4themes_dark from "@amcharts/amcharts4/themes/dark";
import dayjs from "dayjs";
import * as L from "leaflet";
import $ from "jquery";


class MareyChart {

    /** 
     * @type {am4charts.XYChart}
     */
    chart;

    stationCoords = new Map();

    constructor() {
        am4core.useTheme(am4themes_animated);
        am4core.useTheme(am4themes_dark);
    }

    /** Initialize with stops.geojson data to get coordinates of a station */
    initStations(stops) {
        for(let feature of stops.features) {
            const { name } = feature.properties;
            const coords = feature.geometry.coordinates;
            this.stationCoords.set(name, L.latLng(coords[1], coords[0]));
        }
    }

    getChartData(stations) {
        const data = [];
        const origin = stations[0].station_name;

        let previousPosition = this.stationCoords.get(origin);
        let totalDistance = 0;

        let previousScheduledDept = dayjs("");
        let previousActualDept = dayjs("");

        for(let i=0; i<stations.length; i++) {
            const { station_name, arr_time, arr_delay, dept_time, dept_delay } = stations[i];
            const scheduledArrTime = dayjs(arr_time);
            const scheduledDeptTime = dayjs(dept_time);
            const arrDelay = parseInt(arr_delay) || 0;
            const deptDelay = parseInt(dept_delay) || 0;
            const effectiveDelay = Math.abs(deptDelay - arrDelay);

            const travelDuration = scheduledArrTime.isValid() && previousScheduledDept.isValid() ? scheduledArrTime.diff(previousScheduledDept, "minutes") : 0;
            const stoppingTime = scheduledDeptTime.isValid() && scheduledArrTime.isValid() ? scheduledDeptTime.diff(scheduledArrTime, "minutes") : 0;

            const actualArrTime = previousActualDept.add(travelDuration, "minutes");
            const actualDeptTime = actualArrTime.isValid() ? actualArrTime.add(stoppingTime + effectiveDelay, "minutes") : scheduledDeptTime.add(effectiveDelay, "minutes");

            const stationPosition = this.stationCoords.get(station_name);
            const distance = previousPosition && stationPosition ? previousPosition.distanceTo(stationPosition) : data.at(-1)?.distance + 5000 || 0;
            totalDistance += distance / 1000;
            
            if(scheduledArrTime.isValid() && actualArrTime.isValid())
                data.push({ station: station_name, distance: totalDistance, scheduledTimestamp: scheduledArrTime.toDate(), actualTimestamp: actualArrTime.toDate() });
            
            if(scheduledDeptTime.isValid() && actualDeptTime.isValid())
                data.push({ station: station_name, distance: totalDistance, scheduledTimestamp: scheduledDeptTime.toDate(), actualTimestamp: actualDeptTime.toDate() });

            previousScheduledDept = scheduledDeptTime;
            previousActualDept = actualDeptTime;
            previousPosition = stationPosition;
        }

        return data;
    }

    draw(stations) {
        if (this.chart) this.chart.dispose();
        $("#mareyChartContainer").fadeIn();

        const data = this.getChartData(stations);

        this.chart = am4core.create("mareyChart", am4charts.XYChart);
        this.chart.padding(15, 0, 0, 0);
        this.chart.data = data;

        const dateAxis = this.chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.minGridDistance = 50;

        const valueAxis = this.chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.renderer.inversed = true;
        valueAxis.renderer.grid.template.disabled = true;
        valueAxis.renderer.labels.template.disabled = true;
        valueAxis.renderer.labels.template.fontSize = 12;
        valueAxis.renderer.tooltip.disabled = true;
        valueAxis.min = 0;
        valueAxis.max = data.at(-1)?.distance;
        valueAxis.strictMinMax = true;

        function createGrid(distance, station) {
            const range = valueAxis.axisRanges.create();
            range.value = distance;
            range.label.text = station;
        }
        data.forEach((row) => createGrid(row.distance, row.station));

        const scheduledSeries = this.chart.series.push(new am4charts.LineSeries());
        scheduledSeries.dataFields.valueY = "distance";
        scheduledSeries.dataFields.dateX = "scheduledTimestamp";
        scheduledSeries.strokeWidth = 3;
        scheduledSeries.minBulletDistance = 10;
        // scheduledSeries.tooltipText = "[bold]{station}[/]\n Scheduled: {scheduledTimestamp}\n Actual: {actualTimestamp}";
        scheduledSeries.tooltip.pointerOrientation = "vertical";
        scheduledSeries.legendSettings.labelText = "Scheduled timeline";

        const actualSeries = this.chart.series.push(new am4charts.LineSeries());
        actualSeries.dataFields.valueY = "distance";
        actualSeries.dataFields.dateX = "actualTimestamp";
        actualSeries.strokeWidth = 3;
        actualSeries.strokeDasharray = "3,4";
        actualSeries.stroke = am4core.color("#f00");
        actualSeries.legendSettings.labelText = "Actual timeline";

        this.chart.cursor = new am4charts.XYCursor();
        this.chart.cursor.xAxis = dateAxis;

        this.chart.scrollbarX = new am4core.Scrollbar();
        this.chart.scrollbarX.parent = this.chart.bottomAxesContainer;
        this.chart.scrollbarY = new am4core.Scrollbar();

        this.chart.mouseWheelBehavior = "zoomXY";
        this.chart.legend = new am4charts.Legend();
    }

    destroy() {
        if(this.chart) this.chart.dispose();
        $("#mareyChartContainer").fadeOut();
    }
}

export default new MareyChart();
