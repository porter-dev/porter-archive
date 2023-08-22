import _ from "lodash";
import React, { useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import { AreaSeries, AreaStack, Tooltip, XYChart } from "@visx/xychart";
import { AxisBottom, AxisLeft } from "@visx/axis"; 
import { curveMonotoneX as visxCurve } from "@visx/curve";
import { localPoint } from "@visx/event";
import { GridColumns, GridRows } from "@visx/grid";
import { scaleLinear, scaleTime } from "@visx/scale";
import { Bar, Line } from "@visx/shape";
import { defaultStyles, TooltipWithBounds, useTooltip } from "@visx/tooltip";
import { bisector, extent, max } from "d3-array";
import { timeFormat } from "d3-time-format";

import { default as areaTheme } from "./themes/area";
import { NormalizedNginxStatusMetricsData } from "../../../cluster-dashboard/expanded-chart/metrics/types";
import { StatusCodeDataColors } from "./utils";

var globalData: NormalizedNginxStatusMetricsData[];

export const background = "#3b697800";
export const background2 = "#20405100";
export const accentColor = "#949eff";
export const accentColorDark = "#949eff";

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
const getDate = (d: NormalizedNginxStatusMetricsData) => new Date(d.date * 1000);
const getDateAsString = (d: NormalizedNginxStatusMetricsData) => formatDate(getDate(d));
const getStatusValue = (d: NormalizedNginxStatusMetricsData, level: string) =>{
    const statusLevel = level as keyof NormalizedNginxStatusMetricsData;
    return d?[statusLevel] && Number(d[statusLevel]?.toFixed(4)) : 0;
}
const get1xxValue = (d: NormalizedNginxStatusMetricsData) => getStatusValue(d, "1xx");
const get2xxValue = (d: NormalizedNginxStatusMetricsData) => getStatusValue(d, "2xx");
const get3xxValue = (d: NormalizedNginxStatusMetricsData) => getStatusValue(d, "3xx");
const get4xxValue = (d: NormalizedNginxStatusMetricsData) => getStatusValue(d, "4xx");
const get5xxValue = (d: NormalizedNginxStatusMetricsData) => getStatusValue(d, "5xx");

const getMaxValue = (d: NormalizedNginxStatusMetricsData) =>
    max([get1xxValue(d), get2xxValue(d), get3xxValue(d), get4xxValue(d), get5xxValue(d)]) || 0;

const bisectDate = bisector<NormalizedNginxStatusMetricsData, Date>(
    (d) => new Date(d.date * 1000)
).left;

export type StackedAreaChartProps = {
    data: NormalizedNginxStatusMetricsData[];
    dataKey: string;
    resolution: string;
    width: number;
    height: number;
    margin?: { top: number; right: number; bottom: number; left: number };
};

const StackedAreaChart: React.FunctionComponent<StackedAreaChartProps> = ({
    data,
    dataKey,
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
                    globalData,
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
                        globalData,
                        getMaxValue
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
                    margin={{ top: 0, right: 0, bottom: 20, left: 50 }}

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
                            data={data}
                            xAccessor={getDate}
                            yAccessor={get1xxValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="2xx"
                            data={data}
                            xAccessor={getDate}
                            yAccessor={get2xxValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="3xx"
                            data={data}
                            xAccessor={getDate}
                            yAccessor={get3xxValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="4xx"
                            data={data}
                            xAccessor={getDate}
                            yAccessor={get4xxValue}
                            fillOpacity={0.4}
                        />
                        <AreaSeries
                            dataKey="5xx"
                            data={data}
                            xAccessor={getDate}
                            yAccessor={get5xxValue}
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
