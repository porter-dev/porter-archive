import React, { useContext, useState } from "react";
import {
  Section,
  FormField,
  InputField,
  CheckboxField,
  KeyValueArrayField,
  ArrayInputField,
  SelectField,
  ServiceIPListField,
  ResourceListField,
} from "./types";
import TabRegion, { TabOption } from "../TabRegion";
import Heading from "../values-form/Heading";
import Helper from "../values-form/Helper";
import Input from "./field-components/Input";
import { PorterFormContext } from "./PorterFormContextProvider";
import Checkbox from "./field-components/Checkbox";
import KeyValueArray from "./field-components/KeyValueArray";
import styled from "styled-components";
import SaveButton from "../SaveButton";
import ArrayInput from "./field-components/ArrayInput";
import Select from "./field-components/Select";
import ServiceIPList from "./field-components/ServiceIPList";
import ResourceList from "./field-components/ResourceList";
import VeleroForm from "../forms/VeleroForm";

interface Props {
  leftTabOptions?: TabOption[];
  rightTabOptions?: TabOption[];
  renderTabContents?: (
    currentTab: string,
    submitValues?: any
  ) => React.ReactElement;
  saveButtonText?: string;
  isReadOnly?: boolean;
  isInModal?: boolean;
  color?: string;
  addendum?: any;
  saveValuesStatus?: string;
  externalValues?: any;
}

const PorterForm: React.FC<Props> = (props) => {
  const { formData, isReadOnly, validationInfo, onSubmit } = useContext(
    PorterFormContext
  );

  const [currentTab, setCurrentTab] = useState(
    props.leftTabOptions?.length > 0 ? props.leftTabOptions[0].value : (
      formData.tabs.length > 0 ? formData.tabs[0].name : ""
    )
  );

  const renderSectionField = (field: FormField): JSX.Element => {
    const bundledProps = {
      ...field,
      isReadOnly,
    };
    switch (field.type) {
      case "heading":
        return <Heading>{field.label}</Heading>;
      case "subtitle":
        return <Helper>{field.label}</Helper>;
      case "input":
        return <Input {...(bundledProps as InputField)} />;
      case "checkbox":
        return <Checkbox {...(bundledProps as CheckboxField)} />;
      case "key-value-array":
        return <KeyValueArray {...(bundledProps as KeyValueArrayField)} />;
      case "array-input":
        return <ArrayInput {...(bundledProps as ArrayInputField)} />;
      case "select":
        return <Select {...(bundledProps as SelectField)} />;
      case "service-ip-list":
        return <ServiceIPList {...(bundledProps as ServiceIPListField)} />;
      case "resource-list":
        return <ResourceList {...(bundledProps as ResourceListField)} />;
      case "velero-create-backup":
        return <VeleroForm />;
    }
    return <p>Not Implemented: {(field as any).type}</p>;
  };

  const renderSection = (section: Section): JSX.Element => {
    return (
      <>
        {section.contents.map((field, i) => {
          return (
            <React.Fragment key={field.id}>
              {renderSectionField(field)}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const getTabOptions = (): TabOption[] => {
    return (props.leftTabOptions || [])
      .concat(
        formData.tabs.map((tab) => {
          return { label: tab.label, value: tab.name };
        })
      )
      .concat(props.rightTabOptions || []);
  };

  const showSaveButton = (): boolean => {
    if (props.isReadOnly) {
      return false;
    }

    let returnVal = true;
    props.leftTabOptions?.forEach((tab: any) => {
      if (tab.value === currentTab) {
        returnVal = false;
      }
    });
    props.rightTabOptions?.forEach((tab: any) => {
      if (tab.value === currentTab) {
        returnVal = false;
      }
    });

    return returnVal;
  };

  const renderTab = (): JSX.Element => {
    const tab = formData.tabs.filter((tab) => tab.name == currentTab)[0];

    // Handle external tab
    if (!tab) {
      return props.renderTabContents ? props.renderTabContents(currentTab) : <></>;
    }

    return (
      <StyledPorterForm showSave={showSaveButton()}>
        {tab.sections.map((section) => {
          return (
            <React.Fragment key={section.name}>
              {renderSection(section)}
            </React.Fragment>
          );
        })}
      </StyledPorterForm>
    );
  };

  const isDisabled = () => {
    if (props.saveValuesStatus == "loading") {
      return true;
    }

    return isReadOnly || !validationInfo.validated;
  };

  const renderSaveStatus = (): string => {
    if (isDisabled() && props.saveValuesStatus !== "loading") {
      return "Missing required fields";
    }
    return props.saveValuesStatus;
  }

  return (
    <>
      <TabRegion
        addendum={props.addendum}
        color={props.color}
        options={getTabOptions()}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      >
        {renderTab()}
      </TabRegion>
      <br />
      {
        showSaveButton() && (
          <SaveButton
            text={props.saveButtonText || "Deploy"}
            onClick={onSubmit}
            makeFlush={!props.isInModal}
            status={validationInfo.validated ? renderSaveStatus() : validationInfo.error}
            disabled={isDisabled()}
          /> 
        )
      }
      <Spacer />
    </>
  );
};

export default PorterForm;

const Spacer = styled.div`
  height: 50px;
`;

const StyledPorterForm = styled.div<{ showSave?: boolean }>`
  width: 100%;
  height: ${props => props.showSave ? 'calc(100% - 50px)' : '100%'};
  background: #ffffff11;
  color: #ffffff;
  padding: 0px 35px 25px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
`;
