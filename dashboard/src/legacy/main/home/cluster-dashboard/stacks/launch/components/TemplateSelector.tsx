import Loading from "components/Loading";
import React, { useRef, useState } from "react";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import { capitalize } from "shared/string_utils";
import { PorterTemplate } from "shared/types";
import { SelectorStyles } from "./styles";

export const TemplateSelector = ({
  value,
  options,
  onChange,
}: {
  value: PorterTemplate;
  options: PorterTemplate[];
  onChange: (newValue: PorterTemplate) => void;
}) => {
  const wrapperRef = useRef();

  const [isExpanded, setIsExpanded] = useState(false);

  useOutsideAlerter(wrapperRef, () => setIsExpanded(false));

  const getName = (template: PorterTemplate) => {
    if (template?.name === "web") {
      return "Web Application";
    }
    return capitalize(template?.name || "");
  };

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <SelectorStyles.Wrapper>
        <SelectorStyles.Button expanded={false}>
          <Loading />
        </SelectorStyles.Button>
      </SelectorStyles.Wrapper>
    );
  }

  return (
    <>
      <SelectorStyles.Wrapper ref={wrapperRef}>
        <SelectorStyles.Button
          expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {getName(value)}
          <i className="material-icons">arrow_drop_down</i>
        </SelectorStyles.Button>

        {isExpanded ? (
          <SelectorStyles.Dropdown>
            {options.map((template) => (
              <SelectorStyles.Option
                className={template.name === value.name ? "active" : ""}
                onClick={() => {
                  onChange(template);
                  setIsExpanded(false);
                }}
              >
                <SelectorStyles.OptionText>
                  {getName(template)}
                </SelectorStyles.OptionText>
              </SelectorStyles.Option>
            ))}
          </SelectorStyles.Dropdown>
        ) : null}
      </SelectorStyles.Wrapper>
    </>
  );
};
