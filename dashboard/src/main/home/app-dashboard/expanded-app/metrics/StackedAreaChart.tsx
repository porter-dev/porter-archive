import _ from "lodash";
import React, { useMemo, useRef } from "react";
import { AreaSeries, AreaStack, Tooltip, XYChart } from "@visx/xychart";
import { AxisBottom, AxisLeft } from "@visx/axis"; 
import { scaleLinear, scaleTime } from "@visx/scale";
import { curveMonotoneX as visxCurve } from "@visx/curve";
import { bisector, extent, max } from "d3-array";
import { timeFormat } from "d3-time-format";
import { GridColumns, GridRows } from "@visx/grid";

import { default as areaTheme } from "./themes/area";
import { NormalizedMetricsData } from "../../../cluster-dashboard/expanded-chart/metrics/types";

export const background = "#3b697800";
export const background2 = "#20405100";
export const accentColor = "#949eff";
export const accentColorDark = "#949eff";

type StatusCode = "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

// util
const formatDate = timeFormat("%H:%M:%S %b %d, '%y");

const hourFormat = timeFormat("%H:%M");
const dayFormat = timeFormat("%b %d");

const dateScaleConfig = { type: 'point' } as const;
const yScaleConfig = { type: 'linear' } as const;

// map resolutions to formats
const formats: { [range: string]: (date: Date) => string } = {
    "1H": hourFormat,
    "6H": hourFormat,
    "1D": hourFormat,
    "1M": dayFormat,
};

// accessors
const getDate = (d: NormalizedMetricsData) => new Date(d.date * 1000);
const getDateAsString = (d: NormalizedMetricsData) => formatDate(getDate(d));
const getValue = (d: NormalizedMetricsData) =>
    d?.value && Number(d.value?.toFixed(4));

const bisectDate = bisector<NormalizedMetricsData, Date>(
    (d) => new Date(d.date * 1000)
).left;

export type StackedAreaChartProps = {
    data: Record<string, NormalizedMetricsData[]>;
    resolution: string;
    width: number;
    height: number;
    margin?: { top: number; right: number; bottom: number; left: number };
};

const StackedAreaChart: React.FunctionComponent<StackedAreaChartProps> = ({
    data,
    resolution,
    width,
    height,
    margin = { top: 0, right: 0, bottom: 0, left: 0 },
}) => {

    const svgContainer = useRef();
    // bounds
    const innerWidth = width - margin.left - margin.right - 40;
    const innerHeight = height - margin.top - margin.bottom - 20;

    // scales
    const dateScale = useMemo(
        () =>
            scaleTime({
                range: [margin.left, innerWidth + margin.left],
                domain: extent(
                    data["1xx"],
                    getDate
                ) as [Date, Date],
            }),
        [margin.left, width, height, data]
    );
    const valueScale = useMemo(
        () =>
            scaleLinear({
                range: [innerHeight + margin.top, margin.top],
                domain: [
                    0,
                    1.25 *
                    max(
                        data["1xx"],
                        getValue
                    ),
                ],
                nice: true,
            }),
        [margin.top, width, height, data]
    );

    if (width == 0 || height == 0 || width < 10) {
        return null;
    }

    return (
        <div>
            <svg width={width} height={height} ref={svgContainer}>
                <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="url(#area-background-gradient)"
                    rx={14}
                />

                <XYChart
                    theme={areaTheme}
                    xScale={dateScaleConfig}
                    yScale={yScaleConfig}
                    height={height}
                    width={width}
                    margin={{ top: 50, right: 0, bottom: 50, left: 50 }}

                >
                    <GridRows
                        left={margin.left}
                        scale={valueScale}
                        width={innerWidth}
                        strokeDasharray="1,3"
                        stroke="white"
                        strokeOpacity={0.2}
                        pointerEvents="none"
                    />
                    <GridColumns
                        top={margin.top}
                        scale={dateScale}
                        height={innerHeight}
                        strokeDasharray="1,3"
                        stroke="white"
                        strokeOpacity={0.2}
                        pointerEvents="none"
                    />
                    <AreaStack curve={visxCurve}>
                        <AreaSeries
                            dataKey="1xx"
                            data={data["1xx"]}
                            xAccessor={getDate}
                            yAccessor={getValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="2xx"
                            data={data["2xx"]}
                            xAccessor={getDate}
                            yAccessor={getValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="3xx"
                            data={data["3xx"]}
                            xAccessor={getDate}
                            yAccessor={getValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="4xx"
                            data={data["4xx"]}
                            xAccessor={getDate}
                            yAccessor={getValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="5xx"
                            data={data["5xx"]}
                            xAccessor={getDate}
                            yAccessor={getValue}
                            fillOpacity={0.4}
                        />
                    </AreaStack>
                    <AxisLeft
                        left={10}
                        scale={valueScale}
                        hideAxisLine={true}
                        hideTicks={true}
                        tickLabelProps={() => ({
                            fill: "white",
                            fontSize: 11,
                            textAnchor: "start",
                            fillOpacity: 0.4,
                            dy: 0,
                        })}
                    />
                    <Tooltip<NormalizedMetricsData>
                        showHorizontalCrosshair={true}
                        showVerticalCrosshair={true}
                        snapTooltipToDatumX={true}
                        snapTooltipToDatumY={true}
                        showDatumGlyph={true}
                        renderTooltip={({ tooltipData, colorScale }) => (
                            <>
                                {/** date */}
                                {(tooltipData?.nearestDatum?.datum &&
                                    getDateAsString(tooltipData?.nearestDatum?.datum)) ||
                                    "No date"}
                                <br />
                                <br />
                                {/** temperatures */}
                                {((Object.keys(tooltipData?.datumByKey ?? {})).filter((city) => city) as StatusCode[]).map((statusCode) => {
                                    const temperature =
                                        tooltipData?.nearestDatum?.datum &&
                                        getValue(
                                            tooltipData?.nearestDatum?.datum
                                        );

                                    return (
                                        <div key={statusCode}>
                                            <em
                                                style={{
                                                    color: colorScale?.(statusCode),
                                                    textDecoration:
                                                        tooltipData?.nearestDatum?.key === statusCode
                                                            ? "underline"
                                                            : undefined
                                                }}
                                            >
                                                {statusCode}
                                            </em>{" "}
                                            {temperature == null || Number.isNaN(temperature)
                                                ? "–"
                                                : `${temperature} AVG RPS`}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    />
                </XYChart>
                <AxisBottom
                    top={height - 20}
                    scale={dateScale}
                    tickFormat={formats[resolution]}
                    hideAxisLine={true}
                    hideTicks={true}
                    tickLabelProps={() => ({
                        fill: "white",
                        fontSize: 11,
                        textAnchor: "middle",
                        fillOpacity: 0.4,
                    })}
                />
            </svg>
        </div>
    )
};

export default StackedAreaChart;
