import useFormField from "components/porter-form/hooks/useFormField";
import {
  GetFinalVariablesFunction,
  InputField,
  StringInputFieldState,
} from "components/porter-form/types";
import * as React from "react";
import styled from "styled-components";
import {
  InputSliderField as InputSliderField,
  GenericInputField,
} from "../porter-form/types";

export const hasSetValue = (field: GenericInputField) => {
  return field.value && field.value.length != 0 && field.value[0] != null;
};
const clipOffUnit = (unit: string, x: string) => {
  if (typeof x === "string" && unit) {
    return unit === x.slice(x.length - unit.length, x.length)
      ? x.slice(0, x.length - unit.length)
      : x;
  }
  return x;
};

const InputSlider: React.FC<InputSliderField> = (props) => {
  const { id, variable, label, settings, value } = props;

  const {
    state,
    variables,
    setVars,
    setValidation,
  } = useFormField<StringInputFieldState>(id, {
    initValidation: {
      validated: hasSetValue(props),
    },
    initVars: {
      [variable]: hasSetValue(props)
        ? clipOffUnit(settings?.unit, value[0])
        : undefined,
      displayUnit: "MiB", // Initialize displayUnit here
    },
  });

  const maxValue = 8192 / 1024; // Update maxValue to be in GiB
  const stepValue = 0.01; // Remove stepValue state and set it as a constant
  const [popupPosition, setPopupPosition] = React.useState<React.CSSProperties>(
    {}
  );
  const [showPopup, setShowPopup] = React.useState(false);

  // Function to update the popup position based on the slider value
  const updatePopupPosition = () => {
    if (rangeInputRef.current) {
      const rect = rangeInputRef.current.getBoundingClientRect();
      const percentage =
        (displayValue - parseFloat(rangeInputRef.current.min)) /
        (parseFloat(rangeInputRef.current.max) -
          parseFloat(rangeInputRef.current.min));
      const x = rect.width * percentage;
      // Add an offset to the x position calculation to center the popup above the dial
      const xOffset = 8;
      setPopupPosition({
        left: x + xOffset,
      });
    }
  };
  const rangeInputRef = React.useRef<HTMLInputElement>(null);
  if (state == undefined) {
    return <></>;
  }

  const handleMouseMove = () => {
    updatePopupPosition();
  };

  // Event handlers to show and hide the popup
  const handleMouseEnter = () => {
    updatePopupPosition();
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    setShowPopup(false);
  };
  const setValue = (x: string | number) => {
    setVars((vars) => {
      return {
        ...vars,
        [variable]: x === 0 ? 0 : x, // Add explicit handling of zero value
      };
    });
    setValidation((prev) => {
      return {
        ...prev,
        validated:
          settings?.type == "number"
            ? !isNaN(x as number)
            : !!(x as string).trim(),
      };
    });
  };
  const handleValueChange = (newValue: number) => {
    const convertedValue = newValue * 1024; // Always convert GiB to MiB
    setValue(convertedValue);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = parseFloat(e.target.value);
    if (inputValue > maxValue) {
      inputValue = maxValue;
    }
    handleValueChange(inputValue);
    updatePopupPosition();
  };
  const curValue =
    variables[variable] !== undefined && variables[variable] !== null
      ? variables[variable]
      : "";
  const displayValue = curValue / 1024;

  const showUnitToggle = label === "RAM";

  return (
    <InputSliderWrapper>
      <Label htmlFor="input-slider">{label}</Label>
      <InputSliderContainer>
        <RangeInput
          type="range"
          id="input-slider"
          value={displayValue}
          onChange={handleChange}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          ref={rangeInputRef}
          min={0}
          max={maxValue}
          step={stepValue}
        />
        {/* Display the popup with the current value if showPopup is true */}
        {showPopup && (
          <Popup style={popupPosition}>{displayValue.toFixed(2)}</Popup>
        )}
        <NumberInput
          type="number"
          value={displayValue}
          onChange={handleChange}
          min={0}
          max={maxValue}
          step={stepValue}
        />
        {
          <>
            {showUnitToggle ? (
              <UnitText> GiB</UnitText>
            ) : (
              <UnitText> {props.settings.unit}</UnitText>
            )}
          </>
        }
      </InputSliderContainer>
    </InputSliderWrapper>
  );
};

export const getFinalVariablesForStringInput: GetFinalVariablesFunction = (
  vars,
  props: InputSliderField
) => {
  const val =
    vars[props.variable] != undefined && vars[props.variable] != null
      ? vars[props.variable]
      : hasSetValue(props)
      ? clipOffUnit(props.settings?.unit, props.value[0])
      : undefined;

  return {
    [props.variable]:
      props.settings?.unit && !props.settings.omitUnitFromValue
        ? val + props.settings.unit
        : val,
  };
};

export default InputSlider;

const InputSliderWrapper = styled.div`
  width: 100%;
  font-family: Arial, sans-serif;
  margin-bottom: 10px;
`;

const Label = styled.label`
  color: #ffffff;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-family: "Work Sans", sans-serif;
`;

const InputSliderContainer = styled.div`
  display: flex;
  align-items: center;
`;

const RangeInput = styled.input`
  flex-grow: 1;
  margin-right: 1%;
`;

const NumberInput = styled.input`
  outline: none;
  border: none;
  font-size: 16px;
  background: ffffff05;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "")};
  width: 6%;
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  height: 35px;
`;

const UnitText = styled.span`
  padding: 0 10px;
  font-size: 16px;

  background: #ffffff05;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: solid #ffffff55;
`;

const MinLabel = styled.span`
  font-size: 12px;
  margin-right: 5px;
`;

const MaxLabel = styled.span`
  font-size: 12px;
  margin-left: 5px;
`;

const Popup = styled.div`
  position: absolute;
  background-color: #ffffff;
  color: #000000;
  border-radius: 5px;
  padding: 5px;
  font-size: 12px;
  transform: translate(-50%, -100%);
  pointer-events: none;
`;
