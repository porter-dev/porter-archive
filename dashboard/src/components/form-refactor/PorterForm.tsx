import React, { useContext, useState } from "react";
import { PorterFormData, Section, FormField } from "./types";
import TabRegion, { TabOption } from "../TabRegion";
import Heading from "../values-form/Heading";
import Helper from "../values-form/Helper";
import StringInput from "./field-components/StringInput";
import { PorterFormContext } from "./PorterFormContextProvider";
import Checkbox from "./field-components/Checkbox";
import { ShowIf, ShowIfAnd, ShowIfNot, ShowIfOr } from "../../shared/types";

interface Props {}

const PorterForm: React.FC<Props> = () => {
  const { formData, formState } = useContext(PorterFormContext);

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

  const evalShowIf = (vals: ShowIf): boolean => {
    if (!vals) {
      return false;
    }
    if (typeof vals == "string") {
      return !!formState.variables[vals];
    }
    if ((vals as ShowIfOr).or) {
      vals = vals as ShowIfOr;
      for (let i = 0; i < vals.or.length; i++) {
        if (evalShowIf(vals.or[i])) {
          return true;
        }
      }
      return false;
    }
    if ((vals as ShowIfAnd).and) {
      vals = vals as ShowIfAnd;
      for (let i = 0; i < vals.and.length; i++) {
        if (!evalShowIf(vals.and[i])) {
          return false;
        }
      }
      return true;
    }
    if ((vals as ShowIfNot).not) {
      vals = vals as ShowIfNot;
      return !evalShowIf(vals.not);
    }

    return false;
  };

  const renderSection = (section: Section): JSX.Element => {
    if (section.show_if && !evalShowIf(section.show_if)) {
      return null;
    }
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
