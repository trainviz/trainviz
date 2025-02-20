import * as L from "leaflet";
import "leaflet-pulse-icon";

const train = L.icon({
    iconUrl: "assets/icons/train.png",
    iconSize: [10, 32]
});

const dTrain = (sizeFactor) => {
    const width = 10;
    const height = 32;
    return  L.icon({
        iconUrl: "assets/icons/dtrain.png",
        iconSize: [width * sizeFactor, height * sizeFactor]
    });
}

const bar = (width, heightFactor, rotationAngle, isCancelled, isPartial, causeGroup) => {
    const height = 18;
    const offsetX = 0;
    const offsetY = height * heightFactor;
    const angleRad = (rotationAngle * Math.PI) / 180;
    const rotatedOffsetX = offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad);
    const rotatedOffsetY = offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad);

    const icons = {
        "rolling stock": "bar-rollingstock",
        "infrastructure": "bar-infra",
        "weather": "bar-weather",
        "external": "bar-external",
        "logistical": "bar-logistical",
        "engineering work": "bar-logistical",
        "staff": "bar-staff",
        "unknown": "bar-unknown",
        "accidents": "bar-accidents"
    };

    const partialIcons = {
        "rolling stock": "bar-partial-rollingstock",
        "infrastructure": "bar-partial-infra",
        "weather": "bar-partial-weather",
        "external": "bar-partial-external",
        "logistical": "bar-partial-logistical",
        "engineering work": "bar-partial-logistical",
        "staff": "bar-partial-staff",
        "unknown": "bar-partial-unknown",
        "accidents": "bar-partial-accident"
    };

    let iconName;
    if(isCancelled){
        iconName = "bar-gray";
    }
    else if(isPartial){
        iconName = partialIcons[causeGroup] || "bar-partial";
    }
    else {
        iconName = icons[causeGroup] || "bar-red";
    };

    return L.icon({
        iconUrl: `assets/icons/${iconName}.png`,
        iconSize: [width, height],
        iconAnchor: [width/2 - rotatedOffsetX, height/2 - rotatedOffsetY]
    });
}

const pulseIcon = (gap, rotationAngle) => {
    const width = 18;
    const height = 18;
    const offsetX = 0;
    const offsetY = height * gap;
    const angleRad = (rotationAngle * Math.PI) / 180;
    const rotatedOffsetX = offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad);
    const rotatedOffsetY = offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad);
    return L.icon.pulse({ iconSize:[width, height], color:'red', iconAnchor: [width/2 - rotatedOffsetX, height/2 - rotatedOffsetY] })
};

export default { train, dTrain, bar, pulseIcon };