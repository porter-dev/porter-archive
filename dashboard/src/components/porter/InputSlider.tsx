import React from 'react';
import Slider, { Mark } from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import styled from 'styled-components';
import { withStyles } from '@material-ui/core/styles';
import Container from './Container';


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

}) => {
  const marks: Mark[] = [

    {
      value: max,
      label: max.toString(),
    },
  ];

  return (
    <SliderContainer width={width}>
      <LabelContainer>
        {label && <Label>{label}</Label>}
        <Value>{`${value} ${unit}`}</Value>
      </LabelContainer>
      <DisabledTooltip title={disabled ? disabledTooltip || '' : ''} arrow>

        <div style={{ position: 'relative' }}>
          <StyledSlider
            ValueLabelComponent={ValueLabelComponent}
            aria-label="input slider"
            min={min}
            max={max}
            value={Number(value)}
            onChange={(event, newValue) => {
              setValue(newValue as number);
            }}
            disabled={disabled}
            marks={marks}
            step={step ? step : 1}
            style={{
              color: disabled ? "gray" : color,
            }}
          />
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
  width: ${({ width }) => width || '600px'};
  margin: 1px 0;
`;

const Label = styled.div<{ color?: string }>`
  font-size: 13px;
  margin-right: 5px;
  margin-bottom: 10px;
  color: #aaaabb;
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
  track: {
    height: 8, // Same as root height for consistency
    borderRadius: 4,
  },
  rail: {
    height: 8, // Same as root height for consistency
    borderRadius: 4,
  },
  valueLabel: {
    top: -22,
    '& *': {
      background: 'transparent',
      border: 'none', // remove the default border
    },
  },
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