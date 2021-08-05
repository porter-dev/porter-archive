import React, { useMemo, useCallback, useRef } from "react";
import { AreaClosed, Line, Bar, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";

import { TooltipWithBounds, defaultStyles, useTooltip } from "@visx/tooltip";

import { GridRows, GridColumns } from "@visx/grid";

import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { max, extent, bisector } from "d3-array";
import { timeFormat } from "d3-time-format";
import { NormalizedMetricsData } from "./types";

var globalData: NormalizedMetricsData[];

export const background = "#3b697800";
export const background2 = "#20405100";
export const accentColor = "#949eff";
export const accentColorDark = "#949eff";

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
const getDate = (d: NormalizedMetricsData) => new Date(d.date * 1000);
const getValue = (d: NormalizedMetricsData) =>
  d?.value && Number(d.value?.toFixed(4));

const bisectDate = bisector<NormalizedMetricsData, Date>(
  (d) => new Date(d.date * 1000)
).left;

export type AreaProps = {
  data: NormalizedMetricsData[];
  dataKey: string;
  hpaEnabled?: boolean;
  hpaData?: NormalizedMetricsData[];
  resolution: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
};

const AreaChart: React.FunctionComponent<AreaProps> = ({
  data,
  dataKey,
  hpaEnabled = false,
  hpaData = [],
  resolution,
  width,
  height,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
}) => {
  globalData = data;

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipTop,
    tooltipLeft,
  } = useTooltip<{
    data: NormalizedMetricsData;
    tooltipHpaData: NormalizedMetricsData;
  }>();

  const svgContainer = useRef();
  // bounds
  const innerWidth = width - margin.left - margin.right - 40;
  const innerHeight = height - margin.top - margin.bottom - 20;
  const isHpaEnabled = hpaEnabled && !!hpaData.length;

  // scales
  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [margin.left, innerWidth + margin.left],
        domain: extent(
          [...globalData, ...(isHpaEnabled ? hpaData : [])],
          getDate
        ) as [Date, Date],
      }),
    [margin.left, width, height, data, hpaData, isHpaEnabled]
  );
  const valueScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight + margin.top, margin.top],
        domain: [
          0,
          1.25 *
            max([...globalData, ...(isHpaEnabled ? hpaData : [])], getValue),
        ],
        nice: true,
      }),
    [margin.top, width, height, data, hpaData, isHpaEnabled]
  );

  // tooltip handler
  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
    ) => {
      const isHpaEnabled = hpaEnabled && !!hpaData.length;

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

      const hpaIndex = bisectDate(hpaData, x0, 1);
      // Get new index without min value to be sure that data exists for HPA
      const hpaIndex2 = bisectDate(hpaData, x0);

      if (!isHpaEnabled || hpaIndex !== hpaIndex2) {
        showTooltip({
          tooltipData: { data: d, tooltipHpaData: undefined },
          tooltipLeft: x || 0,
          tooltipTop: valueScale(getValue(d)) || 0,
        });
        return;
      }

      const tooltipHpaData0 = hpaData[hpaIndex - 1];
      const tooltipHpaData1 = hpaData[hpaIndex];
      let tooltipHpaData = tooltipHpaData0;

      if (tooltipHpaData1 && getDate(tooltipHpaData1)) {
        tooltipHpaData =
          x0.valueOf() - getDate(tooltipHpaData0).valueOf() >
          getDate(tooltipHpaData1).valueOf() - x0.valueOf()
            ? tooltipHpaData1
            : tooltipHpaData0;
      }

      const container: SVGSVGElement = svgContainer.current;

      let point = container.createSVGPoint();
      // @ts-ignore
      point.x = (event as any)?.clientX || 0;
      // @ts-ignore
      point.y = (event as any)?.clientY || 0;
      point = point?.matrixTransform(container.getScreenCTM().inverse());

      showTooltip({
        tooltipData: { data: d, tooltipHpaData },
        tooltipLeft: x || 0,
        tooltipTop: point.y || 0,
      });
    },
    [
      showTooltip,
      valueScale,
      dateScale,
      width,
      height,
      data,
      hpaData,
      svgContainer,
      hpaEnabled,
    ]
  );

  if (width == 0 || height == 0 || width < 10) {
    return null;
  }
  const hpaGraphTooltipGlyphPosition =
    (hpaEnabled &&
      tooltipData?.tooltipHpaData &&
      valueScale(getValue(tooltipData?.tooltipHpaData))) ||
    null;

  const dataGraphTooltipGlyphPosition =
    (tooltipData?.data && valueScale(getValue(tooltipData.data))) || 0;

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
        <AreaClosed<NormalizedMetricsData>
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
        {isHpaEnabled && (
          <LinePath<NormalizedMetricsData>
            stroke="#ffffff"
            strokeWidth={2}
            data={hpaData}
            x={(d) => dateScale(getDate(d)) ?? 0}
            y={(d) => valueScale(getValue(d)) ?? 0}
            strokeDasharray="6,4"
            strokeOpacity={1}
            pointerEvents="none"
          />
        )}

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
              cy={dataGraphTooltipGlyphPosition + 1}
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
              cy={dataGraphTooltipGlyphPosition}
              r={4}
              fill={accentColorDark}
              stroke="white"
              strokeWidth={2}
              pointerEvents="none"
            />
            {isHpaEnabled && hpaGraphTooltipGlyphPosition !== null && (
              <>
                <circle
                  cx={tooltipLeft}
                  cy={hpaGraphTooltipGlyphPosition + 1}
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
                  cy={hpaGraphTooltipGlyphPosition}
                  r={4}
                  fill={accentColorDark}
                  stroke="white"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              </>
            )}
          </g>
        )}
      </svg>
      {tooltipData && (
        <div>
          <TooltipWithBounds
            key={Math.random()}
            top={tooltipTop - 12}
            left={tooltipLeft + 12}
            style={{
              ...defaultStyles,
              background: "#26272f",
              color: "#aaaabb",
              textAlign: "center",
            }}
          >
            {formatDate(getDate(tooltipData.data))}
            <div style={{ color: accentColor }}>
              {dataKey}: {getValue(tooltipData.data)}
            </div>
            {isHpaEnabled && hpaGraphTooltipGlyphPosition !== null && (
              <div style={{ color: "#FFF" }}>
                Autoscaling Threshold: {getValue(tooltipData.tooltipHpaData)}
              </div>
            )}
          </TooltipWithBounds>
        </div>
      )}
    </div>
  );
};

export default AreaChart;
