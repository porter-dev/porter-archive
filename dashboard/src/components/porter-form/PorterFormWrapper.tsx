import React, { useState } from "react";

import PorterForm from "./PorterForm";
import { InjectedProps, PorterFormData } from "./types";
import { PorterFormContextProvider } from "./PorterFormContextProvider";

type PropsType = {
  formData: any;
  valuesToOverride?: any;
  isReadOnly?: boolean;
  onSubmit?: (values: any, cb?: () => void) => void;
  renderTabContents?: (currentTab: string, submitValues?: any) => any;
  leftTabOptions?: { value: string; label: string }[];
  rightTabOptions?: { value: string; label: string }[];
  saveButtonText?: string;
  isInModal?: boolean;
  color?: string;
  addendum?: any;
  saveValuesStatus?: string;
  showStateDebugger?: boolean;
  isLaunch?: boolean;
  includeHiddenFields?: boolean;
  hideBottomSpacer?: boolean;
  redirectTabAfterSave?: string;
  includeMetadata?: boolean;
  injectedProps?: InjectedProps;
};

const PorterFormWrapper: React.FC<PropsType> = ({
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
  showStateDebugger,
  isLaunch,
  includeHiddenFields,
  hideBottomSpacer,
  redirectTabAfterSave,
  includeMetadata,
  injectedProps,
}) => {
  const hashCode = (s: string) => {
    return s?.split("").reduce(function (a, b) {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
  };

  const getInitialTab = (): string => {
    if (leftTabOptions?.length > 0) {
      return leftTabOptions[0].value;
    } else if (formData?.tabs?.length > 0) {
      let includedTabs = formData.tabs;
      if (isLaunch) {
        includedTabs = formData.tabs.filter(
          (tab: any) => !tab?.settings?.omitFromLaunch
        );
      }
      return includedTabs[0].name;
    } else if (rightTabOptions?.length > 0) {
      return rightTabOptions[0].value;
    } else {
      return "";
    }
  };

  // Lifted into PorterFormWrapper to allow tab to be remembered on re-render (e.g., on revision select)
  const [currentTab, setCurrentTab] = useState(getInitialTab());

  return (
    <React.Fragment key={hashCode(JSON.stringify(formData))}>
      <PorterFormContextProvider
        rawFormData={formData as PorterFormData}
        overrideVariables={valuesToOverride}
        isReadOnly={isReadOnly}
        onSubmit={onSubmit}
        includeHiddenFields={includeHiddenFields}
        includeMetadata={includeMetadata}
      >
        <PorterForm
          showStateDebugger={showStateDebugger}
          addendum={addendum}
          isReadOnly={isReadOnly}
          leftTabOptions={leftTabOptions}
          rightTabOptions={rightTabOptions}
          renderTabContents={renderTabContents}
          saveButtonText={saveButtonText}
          isInModal={isInModal}
          color={color}
          saveValuesStatus={saveValuesStatus}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isLaunch={isLaunch}
          hideSpacer={hideBottomSpacer}
          redirectTabAfterSave={redirectTabAfterSave}
          injectedProps={injectedProps}
        />
      </PorterFormContextProvider>
    </React.Fragment>
  );
};

export default PorterFormWrapper;
