import React, { useContext, useState } from "react";
import { PorterFormData, Section, FormField } from "./types";
import TabRegion, { TabOption } from "../TabRegion";
import Heading from "../values-form/Heading";
import Helper from "../values-form/Helper";
import StringInput from "./field-components/StringInput";
import { PorterFormContext } from "./PorterFormContextProvider";
import Checkbox from "./field-components/Checkbox";

interface Props {}

const PorterForm: React.FC<Props> = () => {
  const { formData } = useContext(PorterFormContext);

  const [currentTab, setCurrentTab] = useState(
    formData.tabs.length > 0 ? formData.tabs[0].name : ""
  );

  const renderSectionField = (field: FormField, id: string): JSX.Element => {
    switch (field.type) {
      case "heading":
        return <Heading>{field.label}</Heading>;
      case "subtitle":
        return <Helper>{field.label}</Helper>;
      case "string-input":
        return <StringInput id={id} {...field} />;
      case "checkbox":
        return <Checkbox id={id} {...field} />;
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
