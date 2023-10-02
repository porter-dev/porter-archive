import React, { useMemo, useState } from 'react';
import Slider, { Mark } from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';
import Spacer from 'components/porter/Spacer';
import NodeInfoModal from 'main/home/app-dashboard/new-app-flow/tabs/NodeInfoModal';

type IntelligentSliderProps = {
    label?: string;
    unit?: string;
    min: number;
    max: number;
    value: string;
    setValue: (value: number) => void;
    disabled?: boolean;
    disabledTooltip?: string;
    color?: string;
    width?: string;
    step?: number;
    isSmartOptimizationOn: boolean;
    decimalsToRoundTo?: number;
};

const ValueLabelComponent: React.FC<any> = (props) => {
    const { children, value } = props;

    return (
        <StyledTooltip
            placement="bottom"
            title={value}
            arrow
        >
            {children}
        </StyledTooltip>
    );
}

const IntelligentSlider: React.FC<IntelligentSliderProps> = ({
    label,
    unit,
    min,
    max,
    value,
    setValue,
    disabled,
    disabledTooltip,
    color,
    step,
    width,
    isSmartOptimizationOn,
    decimalsToRoundTo = 0,
}) => {
    const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);

    const marks: Mark[] = useMemo(() => {
        const marks: Mark[] = [
            {
                value: max,
                label: max.toString(),
            },
            {
                value: min,
                label: min.toString(),
            }
        ];

        if (isSmartOptimizationOn) {
            let half = min + (max - min) * 0.5;
            let quarter = min + (max - min) * 0.25;
            let eighth = min + (max - min) * 0.125;
            if (decimalsToRoundTo > 0) {
                half = Number(half.toFixed(decimalsToRoundTo));
                quarter = Number(quarter.toFixed(decimalsToRoundTo));
                eighth = Number(eighth.toFixed(decimalsToRoundTo));
            }
            marks.push(
                {
                    value: half,
                    label: half.toString(),
                },
                {
                    value: quarter,
                    label: quarter.toString(),
                },
                {
                    value: eighth,
                    label: eighth.toString(),
                },
            );
        }

        return marks;
    }, [isSmartOptimizationOn, min, max, decimalsToRoundTo]);

    const displayOptimalText = useMemo(() => {
        let half = min + (max - min) * 0.5;
        let quarter = min + (max - min) * 0.25;
        let eighth = min + (max - min) * 0.125;
        if (decimalsToRoundTo > 0) {
            half = Number(half.toFixed(decimalsToRoundTo));
            quarter = Number(quarter.toFixed(decimalsToRoundTo));
            eighth = Number(eighth.toFixed(decimalsToRoundTo));
        }

        return isSmartOptimizationOn && (Number(value) === quarter || Number(value) === eighth || Number(value) === half);
    }, [value, min, max, isSmartOptimizationOn]);

    const smartLimit = useMemo(() => {
        let half = min + (max - min) * 0.5;
        if (decimalsToRoundTo > 0) {
            half = Number(half.toFixed(decimalsToRoundTo));
        }
        return min + (max - min) * 0.5;
    }, [min, max]);

    const isExceedingLimit = useMemo(() => {
        return isSmartOptimizationOn && Number(value) > smartLimit;
    }, [value, min, max, isSmartOptimizationOn]);

    const getClosestMark = (value: string, marks: Mark[]) => {
        return marks.reduce((prev, curr) => (
            Math.abs(curr.value - Number(value)) < Math.abs(prev.value - Number(value)) ? curr : prev
        )).value;
    };

    return (
        <SliderContainer width={width}>
            <LabelContainer>
                {label && <Label>{label}</Label>}
                <Value>{`${value} ${unit}`}</Value>
                {displayOptimalText &&
                    <>
                        <Spacer inline x={1} /><Label>Recommended based on the available compute </Label>  <StyledIcon
                            className="material-icons"
                            onClick={() => {
                                setShowNeedHelpModal(true)
                            }}
                        >
                            help_outline
                        </StyledIcon>
                    </>
                }
                {showNeedHelpModal &&
                    <NodeInfoModal
                        setModalVisible={setShowNeedHelpModal}
                    />
                }
                {isExceedingLimit &&
                    <>
                        <Spacer inline x={1} />
                        <Label color="#FFBF00"> Value is not optimal for cost</Label>
                    </>
                }
            </LabelContainer>

            <DisabledTooltip title={disabled ? disabledTooltip || '' : ''} arrow>
                <div style={{ position: 'relative' }}>
                    <MaxedOutToolTip title={Number(value) === smartLimit && isSmartOptimizationOn ? "Using resources beyond this limit is not cost-optimal - to override, toggle off Smart Optimization" : ""} arrow>
                        <div style={{ position: 'relative' }}>
                            <StyledSlider
                                ValueLabelComponent={ValueLabelComponent}
                                aria-label="input slider"
                                isExceedingLimit={isExceedingLimit}
                                min={min}
                                max={max}
                                value={(Number(value))}
                                onChange={(_, newValue) => {
                                    if (!Array.isArray(newValue)) {
                                        if (isSmartOptimizationOn) {
                                            if (newValue > smartLimit) {
                                                return; // can't go beyond the limit
                                            }
                                            const closestMark = getClosestMark(newValue.toString(), marks);
                                            setValue(closestMark);
                                        } else {
                                            setValue(newValue);
                                        }
                                    }
                                }}
                                classes={{
                                    track: isExceedingLimit ? 'exceeds-limit' : '',
                                    rail: isExceedingLimit ? 'exceeds-limit' : ''
                                }}
                                valueLabelDisplay={smartLimit && Number(value) > smartLimit ? "off" : "auto"}
                                disabled={disabled}
                                marks={marks}
                                step={(step ? step : 1)}
                                style={{
                                    color: disabled ? "gray" : color,
                                }}
                            />
                        </div>
                    </MaxedOutToolTip>
                    {disabled && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                cursor: 'not-allowed',
                                zIndex: 1
                            }}
                        />
                    )}
                </div>
            </DisabledTooltip>

        </SliderContainer >
    );
};


export default IntelligentSlider;

const SliderContainer = styled.div<{ width?: string }>`
  width: ${({ width }) => width || '90%'};
  margin: 1px 0;
`;

const Label = styled.div<{ color?: string }>`
  font-size: 13px;
  margin-right: 5px;
  margin-bottom: 10px;
  color: ${props => props.color ? props.color : '#aaaabb'};
`;

const Value = styled.div<{ color?: string }>`
  font-size: 13px;
  margin-bottom: 10px;
  color: #ffff;
`;

const DisabledTooltip = withStyles(theme => ({
    tooltip: {
        backgroundColor: '#333',
        color: '#fff',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '14px',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        maxWidth: '200px',
        width: '200px',
        [theme.breakpoints.up('sm')]: {
            margin: '0 14px',
        },
    },
    arrow: {
        color: '#333',
    },
}))(Tooltip);

const MaxedOutToolTip = withStyles(theme => ({
    tooltip: {
        backgroundColor: '#333',
        color: '#fff',
        padding: '5px',
        borderRadius: '2px',
        fontSize: '12px',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        maxWidth: '200px',
        width: '200px',
        [theme.breakpoints.up('sm')]: {
            margin: '0 2px',
        },
    },
}))(Tooltip);

const StyledSlider = withStyles({
    root: {
        height: '8px', //height of the track
    },
    mark: {
        backgroundColor: '#fff',  // mark color
        height: 4, // size of the mark
        width: 1, // size of the mark
        borderRadius: '50%',
        marginTop: 6,
        marginLeft: -1,
    },
    markActive: {
        backgroundColor: '#fff',
    },
    markLabel: {
        color: '#6e717d',
        fontSize: '12px',
        marginRight: 5,
        '&[data-mark-value="Recommended"]': { // targeting the Recommended label
            transform: 'translateY(-100%)', // move it upwards
            marginBottom: '15px', // adjust the margin to position it
        },
    },
    markLabelActive: {
        color: '#6e717d',
        marginRight: 5,
    },
    thumb: {
        height: 16, // Size of the thumb
        width: 16, // Size of the thumb
        backgroundColor: '#fff',
        border: '2px solid currentColor',
        '&:focus, &:hover, &$active': {
            boxShadow: 'inherit',
        },
        '&$disabled': { // Targeting the thumb when the slider is disabled
            height: 16,
            width: 16,
        },
    },
    track: (props) => ({
        height: 8,
        borderRadius: 4,
        backgroundColor: props.isExceedingLimit ? '#FFBF00' : '',  // setting color conditionally
    }),
    rail: (props) => ({
        height: 8,
        borderRadius: 4,
        backgroundColor: props.isExceedingLimit ? '#FFBF00' : '',  // setting color conditionally
    }),
    valueLabel: {
        top: -22,
        '& *': {
            background: 'transparent',
            border: 'none', // remove the default border
        },
    }
    ,
    disabled: {},
})(Slider);


const StyledTooltip = withStyles({
    tooltip: {
        fontSize: 12,
        padding: "5px 10px",

    }
})(Tooltip);

const LabelContainer = styled.div`
  display: flex;
  align-items: center;
`;

const StyledIcon = styled.i`
  cursor: pointer;
  font-size: 16px; 
  margin-bottom : 10px;
  &:hover {
    color: #666;  
  }
`;