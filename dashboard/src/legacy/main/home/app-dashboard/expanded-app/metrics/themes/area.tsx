import { buildChartTheme, grayColors } from '@visx/xychart';

let chart = buildChartTheme({
    backgroundColor: '#222',
    colors: [
        "#4B4F7C", // gray (1xx)
        "#FFFFFF", // white (2xx)
        "#54B835", // green (3xx)
        "#BBBB3C", // yellow (4xx)
        "#9C20A5", // purple (5xx)
    ],
    tickLength: 4,
    svgLabelSmall: {
        fill: grayColors[2],
    },
    svgLabelBig: {
        fill: grayColors[0],
    },
    gridColor: grayColors[4],
    gridColorDark: grayColors[1],
});

chart.gridStyles.strokeDasharray = "1,3";
chart.gridStyles.stroke = "white";
chart.gridStyles.strokeOpacity = 0.2;


export default chart;