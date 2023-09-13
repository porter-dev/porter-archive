import React, { useState } from 'react';
import Slider, { Mark } from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';
import Text from './Text';
import Spacer from './Spacer';
import SmartOptModal from 'main/home/app-dashboard/new-app-flow/tabs/SmartOptModal';

type InputSliderProps = {
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
  smartLimit?: number;
  override?: boolean;
  nodeCount?: number;
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

const InputSlider: React.FC<InputSliderProps> = ({
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
  smartLimit,
  override,
  nodeCount
}) => {
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);

  const optimal = nodeCount ? Math.round((max / nodeCount) * 10) / 10 : 0;

  const mid = min + (max - min) * 0.5;
  const marks: Mark[] = [
    {
      value: max,
      label: max.toString(),
    },
  ];
  var isExceedingLimit = false;
  var displayOptimalText = false;
  //Optimal Marks only give useful information to user if they are using more than 2 nodes
  if (optimal != 0 && nodeCount && nodeCount > 2) {
    marks.push({
      value: optimal,
      label: (
        <Text color="helper" size={10}>
          Recommended
        </Text>

      )
    });
    displayOptimalText = Number(value) == optimal;
  }

  if (smartLimit) {
    marks.push({
      value: smartLimit,
      label: smartLimit.toString(),
    });

    isExceedingLimit = Number(value) > smartLimit;
  }
  const isCloseToMark = (value, marks, threshold = 0.1) => {
    return marks.some(mark => Math.abs(mark.value - value) < threshold);
  };

  const getClosestMark = (value, marks) => {
    return marks.reduce((prev, curr) => (
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    )).value;
  };


  return (
    <SliderContainer width={width}>
      <LabelContainer>
        <>
          {label && <Label>{label}</Label>}
          <Value>{`${Math.floor(value * 100) / 100} ${unit}`}</Value>
          {displayOptimalText &&
            <><Spacer inline x={1} /><Label>Recommended based on the available compute ({nodeCount} application nodes)  </Label>  <StyledIcon
              className="material-icons"
              onClick={() => {
                setShowNeedHelpModal(true)
              }}
            >
              help_outline
            </StyledIcon></>}
          {showNeedHelpModal &&
            <SmartOptModal
              setModalVisible={setShowNeedHelpModal}
            />}
          {isExceedingLimit &&
            <><Spacer inline x={1} /><Label color="#FFBF00"> Value is not optimal for cost</Label></>}
        </>
      </LabelContainer>

      <DisabledTooltip title={disabled ? disabledTooltip || '' : ''} arrow>
        <div style={{ position: 'relative' }}>
          {/* <div style={{ position: 'absolute', bottom: '100%', left: `calc(${((threeQuarter - min) / (max - min)) * 100}% - 50px)` }}>
            Recommended
          </div> */}
          <MaxedOutToolTip title={smartLimit?.toString() == value && !override ? "To increase value toggle off Smart Optimization" || '' : ''} arrow>
            <div style={{ position: 'relative' }}>

              <StyledSlider
                ValueLabelComponent={ValueLabelComponent}
                aria-label="input slider"
                isExceedingLimit={isExceedingLimit}
                min={min}
                max={max}
                value={(!override && isExceedingLimit) ? smartLimit : Number(value)}
                onChange={(event, newValue) => {
                  if (!override && smartLimit && newValue > smartLimit) {
                    setValue(smartLimit);
                  } else {
                    if (isCloseToMark(newValue, marks)) {
                      const closestMarkValue = getClosestMark(newValue, marks);
                      setValue(closestMarkValue);
                    }
                    else {
                      setValue(newValue as number);
                    }
                  }
                }

                }
                classes={{
                  track: isExceedingLimit ? 'exceeds-limit' : '',
                  rail: isExceedingLimit ? 'exceeds-limit' : ''
                }}
                valueLabelDisplay={smartLimit && Number(value) > smartLimit ? "off" : "auto"}
                disabled={disabled}
                marks={marks}
                step={step ? step : 1}
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


export default InputSlider;

const SliderContainer = styled.div<{ width?: string }>`
  width: ${({ width }) => width || '800px'};
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