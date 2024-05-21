import Loading from "components/Loading";
import React, { useRef, useState } from "react";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";
import { capitalize } from "shared/string_utils";
import { SelectorStyles } from "./styles";

export const VersionSelector = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
}) => {
  const wrapperRef = useRef();

  const [isExpanded, setIsExpanded] = useState(false);

  useOutsideAlerter(wrapperRef, () => setIsExpanded(false));

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
          {capitalize(value)}
          <i className="material-icons">arrow_drop_down</i>
        </SelectorStyles.Button>

        {isExpanded ? (
          <SelectorStyles.Dropdown>
            {options.map((version) => (
              <SelectorStyles.Option
                className={version === value ? "active" : ""}
                onClick={() => {
                  onChange(version);
                  setIsExpanded(false);
                }}
              >
                {capitalize(version)}
              </SelectorStyles.Option>
            ))}
          </SelectorStyles.Dropdown>
        ) : null}
      </SelectorStyles.Wrapper>
    </>
  );
};
