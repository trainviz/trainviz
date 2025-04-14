import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import am4themes_dark from "@amcharts/amcharts4/themes/dark";
import dayjs from "dayjs";


export class LineChart {

    selectedDisruptionType = "";

    constructor(onDateSelect, onDisruptionTypeSelect) {
        this.onDateSelect = onDateSelect;
        this.onDisruptionTypeSelect = onDisruptionTypeSelect;

        // Fetch data from JSON file
        fetch('assets/data/summary.json')
            .then(response => response.json())
            .then(data => this.createChart(data))
            .catch(error => console.error('Error loading the data:', error));
    }

    createChart(chartData) {
        am4core.useTheme(am4themes_animated);
        am4core.useTheme(am4themes_dark);

        let chart = am4core.create("lineChart", am4charts.XYChart);
        chart.padding(15, 0, 0, 0);

        // Parse date format
        chartData.forEach(item => item.date = new Date(item.date));
        chart.data = chartData;

        // Create X Axis (Date)
        let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.renderer.minGridDistance = 50;
        dateAxis.renderer.labels.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
        dateAxis.renderer.labels.template.events.on("hit", (e) => {
            const date = dayjs(e.target.text, "MMM DD").year(2023);
            if(date.isValid()) this.onDateSelect(date.format("YYYY-MM-DD"));
        });

        // Create Y Axis (Values)
        let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());

        // Categories to plot
        let categories = ["infrastructure", "rolling stock", "accidents", "external", "logistical", "engineering work", "staff", "unknown", "weather"];
        let colors = ["#A077C0", "#B82B8B", "#D6B34A", "#FF6F61", "#FF82A9", "#FF82A9", "#4db6ac", "#B97A57", "#4e75b2"]

        categories.forEach((category, index) => {
            let series = chart.series.push(new am4charts.LineSeries());
            series.dataFields.valueY = category;
            series.dataFields.dateX = "date";
            series.name = category[0].toUpperCase() + category.slice(1);
            series.strokeWidth = 2;
            series.stroke = am4core.color(colors[index]);
            // series.fill = am4core.color(colors[index]);
            // series.tooltipText = "{name}: {valueY}";
            // series.tooltip.background.fill = am4core.color(colors[index]);
            // series.bullets.push(new am4charts.CircleBullet());
        });

        // Add Legend
        chart.legend = new am4charts.Legend();
        chart.legend.fontSize = 14;
        chart.legend.itemContainers.template.togglable = false;
        chart.legend.itemContainers.template.events.on("hit", (ev) => {
            let targetName = ev.target.dataItem.dataContext.name;
            this.selectedDisruptionType = targetName == this.selectedDisruptionType ? "" : targetName;
            this.onDisruptionTypeSelect(this.selectedDisruptionType.toLowerCase());
        });
        chart.legend.itemContainers.template.events.on("hit", function (ev) {
            let targetName = ev.target.dataItem.dataContext.name;
            let clickedSeries = null;
            let allHidden = true;
        
            // Find the clicked series & check if all other series are hidden
            chart.series.each(function (series) {
                if (series.name === targetName) {
                    clickedSeries = series;
                } else if (!series.disabled) {
                    allHidden = false;
                }
            });
        
            if (clickedSeries) {
                if (allHidden) {
                    // If everything is hidden, show all
                    chart.series.each(function (series) {
                        series.disabled = false;
                    });
                } else {
                    // Otherwise, hide all others & keep the clicked one
                    chart.series.each(function (series) {
                        series.disabled = series.name !== targetName;
                    });
                }
            }
        });

        chart.scrollbarX = new am4core.Scrollbar();
        chart.scrollbarX.parent = chart.bottomAxesContainer;
        chart.scrollbarY = new am4core.Scrollbar();

        // Add Cursor
        chart.cursor = new am4charts.XYCursor();
        chart.mouseWheelBehavior = "zoomXY";
        // Enable zooming via the cursor (mouse wheel or dragging)  <-- **CHANGED**
        // chart.cursor.behavior = "zoomXY";  // <-- **CHANGED**
        // chart.cursor.xAxis = dateAxis;  // <-- **CHANGED**
        // chart.cursor.yAxis = valueAxis;  // <-- **CHANGED**
        // chart.chartContainer.wheelable = true;
    }

}
