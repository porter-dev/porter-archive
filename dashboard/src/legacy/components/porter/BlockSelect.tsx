import React from "react";
import Container from "legacy/components/porter/Container";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import Tooltip from "legacy/components/porter/Tooltip";
import styled from "styled-components";

export type BlockSelectOption = {
  name: string;
  displayName: string;
  icon: string;
  description?: string;
  descriptionColor?: "warner";
  disabledOpts?: {
    tooltipText: string;
  };
};
type Props = {
  options: BlockSelectOption[];
  selectedOption?: BlockSelectOption;
  setOption: (option: BlockSelectOption) => void;
};

const BlockSelect: React.FC<Props> = ({
  options,
  selectedOption,
  setOption,
}) => {
  return (
    <BlockList>
      {options.map((option) => {
        return option.disabledOpts ? (
          <Tooltip content={option.disabledOpts.tooltipText}>
            <Block
              key={option.name}
              selected={selectedOption?.name === option.name}
              onClick={() => {}}
              disabled
            >
              <Container row>
                <Icon src={option.icon} />
                <Spacer inline x={0.5} />
                <Text>{option.displayName}</Text>
              </Container>
              {option.description && (
                <>
                  <Spacer y={0.5} />
                  <Text
                    size={12}
                    color={
                      option.descriptionColor
                        ? option.descriptionColor
                        : "helper"
                    }
                  >
                    {option.description}
                  </Text>
                </>
              )}
            </Block>
          </Tooltip>
        ) : (
          <Block
            key={option.name}
            selected={selectedOption?.name === option.name}
            onClick={() => {
              setOption(option);
            }}
          >
            <Container row>
              <Icon src={option.icon} />
              <Spacer inline x={0.5} />
              <Text>{option.displayName}</Text>
            </Container>
            {option.description && (
              <>
                <Spacer y={0.5} />
                <Text
                  size={12}
                  color={
                    option.descriptionColor ? option.descriptionColor : "helper"
                  }
                >
                  {option.description}
                </Text>
              </>
            )}
          </Block>
        );
      })}
    </BlockList>
  );
};

export default BlockSelect;

const Block = styled.div<{ selected?: boolean; disabled?: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  align-items: left;
  user-select: none;
  font-size: 13px;
  overflow: hidden;
  font-weight: 500;
  padding: 10px 10px;
  align-item: center;
  color: #ffffff;
  position: relative;
  transition: all 0.2s;
  border-radius: 5px;
  filter: ${({ disabled }) => (disabled ? "brightness(0.8) grayscale(1)" : "")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  background: ${(props) => props.theme.clickable.bg};
  border: ${(props) =>
    props.selected ? "2px solid #8590ff" : "1px solid #494b4f"};
  :hover {
    border: ${({ selected, disabled }) =>
      !selected && !disabled && "1px solid #7a7b80"};
  }

  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const BlockList = styled.div`
  overflow: visible;
  margin-top: 6px;
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;
