import React from "react";

import PorterForm from "./PorterForm";
import { PorterFormData } from "./types";
import { PorterFormContextProvider } from "./PorterFormContextProvider";

type PropsType = {
  formData: any,
  valuesToOverride?: any,
  isReadOnly?: boolean,
  onSubmit?: (values: any) => void, 
  renderTabContents?: (currentTab: string, submitValues?: any) => any,
  leftTabOptions?: { value: string, label: string }[],
  rightTabOptions?: { value: string, label: string }[],
  saveButtonText?: string,
  isInModal?: boolean,
  color?: string,
  addendum?: any,
  saveValuesStatus?: string,
  externalValues?: any,
};

const PorterFormWrapper: React.FunctionComponent<PropsType> = ({
  formData,
  valuesToOverride,
  isReadOnly,
  onSubmit,
  renderTabContents,
  leftTabOptions,
  rightTabOptions,
  saveButtonText,
  isInModal,
  color,
  addendum,
  saveValuesStatus,
  externalValues,
}) => {
  return (
    <>
      {formData && (formData as any).name && (
        <PorterFormContextProvider
          rawFormData={formData as PorterFormData}
          overrideVariables={valuesToOverride}
          isReadOnly={isReadOnly}
          onSubmit={onSubmit}
        >
          <PorterForm
            addendum={addendum}
            isReadOnly={isReadOnly}
            leftTabOptions={leftTabOptions}
            rightTabOptions={rightTabOptions}
            renderTabContents={renderTabContents}
            saveButtonText={saveButtonText}
            isInModal={isInModal}
            color={color}
            saveValuesStatus={saveValuesStatus}
            externalValues={externalValues}
          />
        </PorterFormContextProvider>
      )}
    </>
  );
};

export default PorterFormWrapper;
