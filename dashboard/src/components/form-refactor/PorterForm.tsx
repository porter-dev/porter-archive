import React, { useContext, useState } from "react";
import { Section, FormField, StringInputField, CheckboxField } from "./types";
import TabRegion, { TabOption } from "../TabRegion";
import Heading from "../values-form/Heading";
import Helper from "../values-form/Helper";
import StringInput from "./field-components/StringInput";
import { PorterFormContext } from "./PorterFormContextProvider";
import Checkbox from "./field-components/Checkbox";
import styled from "styled-components";
import SaveButton from "../SaveButton";

interface Props {
  leftTabOptions?: TabOption[];
  rightTabOptions?: TabOption[];
  renderTabContents?: (
    currentTab: string,
    submitValues?: any
  ) => React.ReactElement;
  saveButtonText?: string;
}

const PorterForm: React.FC<Props> = (props) => {
  const { formData, isReadOnly } = useContext(PorterFormContext);

  const [currentTab, setCurrentTab] = useState(
    formData.tabs.length > 0 ? formData.tabs[0].name : ""
  );

  const renderSectionField = (field: FormField, id: string): JSX.Element => {
    const bundledProps = {
      ...field,
      isReadOnly,
    };
    switch (field.type) {
      case "heading":
        return <Heading>{field.label}</Heading>;
      case "subtitle":
        return <Helper>{field.label}</Helper>;
      case "string-input":
        return <StringInput id={id} {...(bundledProps as StringInputField)} />;
      case "checkbox":
        return <Checkbox id={id} {...(bundledProps as CheckboxField)} />;
    }
    return <p>Not Implemented: {(field as any).type}</p>;
  };

  const renderSection = (section: Section): JSX.Element => {
    return (
      <>
        {section.contents.map((field, i) => {
          const id = `${section.name}-${field.type}-${i}`;
          return (
            <React.Fragment key={id}>
              {renderSectionField(field, id)}
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

  const renderTab = (name: string): JSX.Element => {
    const tab = formData.tabs.filter((tab) => tab.name == name)[0];

    if (!tab) {
      // tab is external
      return props.renderTabContents ? props.renderTabContents(name) : <></>;
    }

    return (
      <>
        {tab.sections.map((section) => {
          return (
            <React.Fragment key={section.name}>
              {renderSection(section)}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <>
      <TabRegion
        options={getTabOptions()}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      >
        <StyledPorterForm>{renderTab(currentTab)}</StyledPorterForm>
      </TabRegion>
      <SaveButton
        text={props.saveButtonText || "Deploy"}
        onClick={() => {}}
        makeFlush
      />
      <Spacer />
    </>
  );
};

export default PorterForm;

const Spacer = styled.div`
  height: 50px;
`;

const StyledPorterForm = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff11;
  color: #ffffff;
  padding: 0px 35px 25px;
  position: relative;
  border-radius: 5px;
  font-size: 13px;
  overflow: auto;
`;
