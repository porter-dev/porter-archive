import React, { useMemo, useCallback } from "react";
import { AreaClosed, Line, Bar } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";

import {
  withTooltip,
  Tooltip,
  TooltipWithBounds,
  defaultStyles,
} from "@visx/tooltip";

import { GridRows, GridColumns } from "@visx/grid";

import { WithTooltipProvidedProps } from "@visx/tooltip/lib/enhancers/withTooltip";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { max, extent, bisector } from "d3-array";
import { timeFormat } from "d3-time-format";

/*
export const accentColor = '#f5cb42';
export const accentColorDark = '#949eff';
*/

export type MetricsData = {
  date: number; // unix timestamp
  value: number; // value
};

type TooltipData = MetricsData;

var globalData: MetricsData[];

export const background = "#3b697800";
export const background2 = "#20405100";
export const accentColor = "#949eff";
export const accentColorDark = "#949eff";
const tooltipStyles = {
  ...defaultStyles,
  background,
  border: "1px solid white",
  color: "white",
};

// util
const formatDate = timeFormat("%H:%M:%S %b %d, '%y");

const hourFormat = timeFormat("%H:%M");
const dayFormat = timeFormat("%b %d");

// map resolutions to formats
const formats: { [range: string]: (date: Date) => string } = {
  "1H": hourFormat,
  "6H": hourFormat,
  "1D": hourFormat,
  "1M": dayFormat,
};

// accessors
const getDate = (d: MetricsData) => new Date(d.date * 1000);
const getValue = (d: MetricsData) => d.value;

const bisectDate = bisector<MetricsData, Date>((d) => new Date(d.date * 1000))
  .left;

export type AreaProps = {
  data: MetricsData[];
  resolution: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
};

export default withTooltip<AreaProps, TooltipData>(
  ({
    data,
    resolution,
    width,
    height,
    margin = { top: 0, right: 0, bottom: 0, left: 0 },
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipTop = 0,
    tooltipLeft = 0,
  }: AreaProps & WithTooltipProvidedProps<TooltipData>) => {
    globalData = data;

    if (width == 0 || height == 0 || width < 10) {
      return null;
    }

    // bounds
    const innerWidth = width - margin.left - margin.right - 40;
    const innerHeight = height - margin.top - margin.bottom - 20;

    // scales
    const dateScale = useMemo(
      () =>
        scaleTime({
          range: [margin.left, innerWidth + margin.left],
          domain: extent(globalData, getDate) as [Date, Date],
        }),
      [innerWidth, margin.left, width, height, data]
    );
    const valueScale = useMemo(
      () =>
        scaleLinear({
          range: [innerHeight + margin.top, margin.top],
          domain: [0, 1.25 * max(globalData, getValue)],
          nice: true,
        }),
      [margin.top, innerHeight, width, height, data]
    );

    // tooltip handler
    const handleTooltip = useCallback(
      (
        event:
          | React.TouchEvent<SVGRectElement>
          | React.MouseEvent<SVGRectElement>
      ) => {
        const { x } = localPoint(event) || { x: 0 };
        const x0 = dateScale.invert(x);
        const index = bisectDate(globalData, x0, 1);
        const d0 = globalData[index - 1];
        const d1 = globalData[index];
        let d = d0;

        if (d1 && getDate(d1)) {
          d =
            x0.valueOf() - getDate(d0).valueOf() >
            getDate(d1).valueOf() - x0.valueOf()
              ? d1
              : d0;
        }

        showTooltip({
          tooltipData: d,
          tooltipLeft: x || 0,
          tooltipTop: valueScale(getValue(d)) || 0,
        });
      },
      [showTooltip, valueScale, dateScale, width, height, data]
    );

    return (
      <div>
        <svg width={width} height={height}>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="url(#area-background-gradient)"
            rx={14}
          />
          <LinearGradient
            id="area-background-gradient"
            from={background}
            to={background2}
          />
          <LinearGradient
            id="area-gradient"
            from={accentColor}
            to={accentColor}
            toOpacity={0}
          />
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
          <AreaClosed<MetricsData>
            data={data}
            x={(d) => dateScale(getDate(d)) ?? 0}
            y={(d) => valueScale(getValue(d)) ?? 0}
            height={innerHeight}
            yScale={valueScale}
            strokeWidth={1}
            stroke="url(#area-gradient)"
            fill="url(#area-gradient)"
            curve={curveMonotoneX}
          />
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
          <Bar
            x={margin.left}
            y={margin.top}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            rx={14}
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
          {tooltipData && (
            <g>
              <Line
                from={{ x: tooltipLeft, y: margin.top }}
                to={{ x: tooltipLeft, y: innerHeight + margin.top }}
                stroke={accentColorDark}
                strokeWidth={2}
                pointerEvents="none"
                strokeDasharray="5,2"
              />
              <circle
                cx={tooltipLeft}
                cy={tooltipTop + 1}
                r={4}
                fill="black"
                fillOpacity={0.1}
                stroke="black"
                strokeOpacity={0.1}
                strokeWidth={2}
                pointerEvents="none"
              />
              <circle
                cx={tooltipLeft}
                cy={tooltipTop}
                r={4}
                fill={accentColorDark}
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </g>
          )}
        </svg>
        {tooltipData && (
          <div>
            <TooltipWithBounds
              key={Math.random()}
              top={tooltipTop - 12}
              left={tooltipLeft + 12}
              style={tooltipStyles}
            >
              {getValue(tooltipData)}
            </TooltipWithBounds>
            <Tooltip
              top={-10}
              left={tooltipLeft}
              style={{
                ...defaultStyles,
                background: "#26272f",
                color: "#aaaabb",
                width: 100,
                paddingTop: 35,
                textAlign: "center",
                transform: "translateX(-60px)",
              }}
            >
              {formatDate(getDate(tooltipData))}
            </Tooltip>
          </div>
        )}
      </div>
    );
  }
);
