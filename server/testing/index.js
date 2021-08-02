// noinspection JSUnresolvedVariable,JSUnresolvedFunction,JSIgnoredPromiseFromCall

// basic style

document.body.style.margin = '0';
document.body.style.padding = '0';

// basic style end

mapboxgl.accessToken = 'pk.eyJ1IjoicmVlZGd6IiwiYSI6ImNqaDZ6YjN5ejAybHkycXZ0cTRid3o1cWMifQ.BVLj2qYChnBhn9rnUWw9LA';

function createMapboxContainer() {
    const div = document.createElement('div');
    div.id = 'container';
    div.style.width = '100vw';
    div.style.height = '100vh';
    return div;
}

const mapboxContainer = document.body.appendChild(createMapboxContainer());
const map = new mapboxgl.Map({
    container: mapboxContainer,
    minZoom: 7, maxZoom: 21, doubleClickZoom: true, scrollZoom: true,
    minPitch: 0, maxPitch: 0, touchPitch: false,
    pitchWithRotate: false, dragRotate: false, touchZoomRotate: true,
    keyboard: false,
    attributionControl: false
});

map.touchZoomRotate.disableRotation();

const nav = new mapboxgl.NavigationControl({ showCompass: false, showZoom: true, visualizePitch: false });
map.addControl(nav, 'bottom-right');

async function loadStyle() {
    const url = new URL(location.href).searchParams.get('style');
    const resp = await fetch(url);
    const style = await resp.json();
    map.setStyle(style);
}

loadStyle();

map.jumpTo({ center: [-79.381714, 43.648778], zoom: 19 });

function createTipContainer() {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.zIndex = '100';
    div.style.right = '10px';
    div.style.top = '110px';
    div.style.padding = '0.2em .5em';
    div.style.fontSize = '14px';
    div.style.backgroundColor = 'gray';
    div.style.color = 'white';
    return div;
}

const tip = document.body.appendChild(createTipContainer());

function updateTip() {
    tip.innerText = map.getZoom().toFixed(3)
        + '\n' + map.getCenter().lat
        + '\n' + map.getCenter().lng;
}

map.on('load', () => updateTip());
map.on('zoom', () => updateTip());

const fps = new mapboxgl.FrameRateControl({ /* optional options */ });
map.addControl(fps);

// timing

function showLayerCosts() {
    function createTimingContainer() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.zIndex = '100';
        div.style.left = '0';
        div.style.top = '0';
        div.style.width = 'fit-content';
        div.style.maxWidth = '80vw';
        div.style.height = 'fit-content';
        div.style.maxHeight = '80vh';
        div.style.padding = '4px';
        div.style.overflow = 'auto';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        return div;
    }

    const container = document.body.appendChild(createTimingContainer());

    map.on('gpu-timing-layer', result => {
        // 按从大到小排序
        const sorted = Object.entries(result['layerTimes'])
            .sort((a, b) => b[1] - a[1]);
        container.innerText = sorted
            .map(item => item.join(': '))
            .join('\n');
    });
}

if (!navigator.userAgent.toLowerCase().includes('iphone')) {
    showLayerCosts();
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function getFPS() {
    return parseInt(fps.readOutput.innerText.slice(0, 2)); // '0 FPS (16 Avg)'
}

let csv = 'Layer,FPS1,FPS2,FPS3,FPS4,FPS5,FPS6,FPS7,FPS8,FPS9,FPS10,FPS11,FPS12,FPS13,FPS14,FPS15,FPS16\n';

async function play() {
    // https://github.com/housesigma/openmaptiles/wiki/iphone-12-performance-test
    const latLonZooms = [
        [[-79.3789, 43.648], 21],
        [[-79.37879, 43.64896], 21],
        [[-79.3712622, 43.6505782], 21],
        [[-79.3701281, 43.6601984], 19]
    ];

    const actions = [
        [500, 0], // 向左
        [0, 500], // 向上
        [-1000, 0], // 向右
        [0, -1000] // 向下
    ];

    for (let i = 0; i < latLonZooms.length; i++) {
        map.jumpTo({ center: latLonZooms[i][0], zoom: latLonZooms[i][1] });
        await sleep(3);

        for (let j = 0; j < actions.length; j++) {
            map.panBy(actions[j], { animation: true, duration: 1000 });
            csv += ',' + getFPS();
            await sleep(1);
        }
    }

    csv += '\n';
}

function downloadCSV() {
    const blob = new Blob([csv], { type: "text/csv,charset=UTF-8" })
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.download = 'result.csv';
    a.href = url;
    a.click()
}

async function iterateLayers() {
    const url = new URL(location.href).searchParams.get('style');
    const resp = await fetch(url);
    const style = await resp.json();

    const originalLayers = [].concat(style.layers);

    for (let i = 0; i < originalLayers.length; i++) {
        console.log('iterate layers', `${ i + 1 }/${ originalLayers.length }`);

        style.layers = [].concat(originalLayers);
        const deleted = style.layers.splice(i, 1);
        map.setStyle(style);
        await sleep(3);

        csv += deleted[0].id;
        await play();
        await sleep(1);
    }

    downloadCSV();
}

// setTimeout(() => iterateLayers(), 3000);
