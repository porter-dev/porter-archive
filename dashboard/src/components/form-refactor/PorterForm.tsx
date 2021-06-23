import React, { useState } from "react";
import { PorterFormData, Section, FormField } from "./types";
import TabRegion, { TabOption } from "../TabRegion";
import Heading from "../values-form/Heading";
import Helper from "../values-form/Helper";
import styled from "styled-components";

interface Props {
  formData: PorterFormData;
}

const PorterForm: React.FC<Props> = ({ formData }) => {
  const [currentTab, setCurrentTab] = useState(
    formData.tabs.length > 0 ? formData.tabs[0].name : ""
  );

  const renderSectionField = (field: FormField): JSX.Element => {
    switch (field.type) {
      case "heading":
        return <Heading>{field.label}</Heading>;
      case "subtitle":
        return <Helper>{field.label}</Helper>;
    }
    return <p>Not Implemented: {field.type}</p>;
  };

  const renderSection = (section: Section): JSX.Element => {
    console.log(section);
    return (
      <>
        {section.contents.map((field, i) => {
          return (
            <React.Fragment key={`${section.name}-${field.type}-${i}`}>
              {renderSectionField(field)}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const getTabOptions = (): TabOption[] => {
    return formData.tabs.map((tab) => {
      return { label: tab.label, value: tab.name };
    });
  };

  const renderTab = (name: string): JSX.Element => {
    const tab = formData.tabs.filter((tab) => tab.name == name)[0];

    if (!tab) {
      return <></>;
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
        {renderTab(currentTab)}
      </TabRegion>
    </>
  );
};

export default PorterForm;
