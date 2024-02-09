import React from "react";
import styled, { css } from "styled-components";

import Icon from "components/porter/Icon";

type SelectableRowProps = {
  selectable: React.ReactNode;
  onSelect?: () => void;
  onDeselect?: () => void;
  selected?: boolean;
  selectedIcon?: string;
};

const SelectableRow: React.FC<SelectableRowProps> = ({
  selectable,
  selected,
  onSelect,
  onDeselect,
  selectedIcon,
}) => {
  return (
    <ResourceOption
      selected={selected}
      onClick={() => {
        if (selected) {
          onDeselect?.();
        } else {
          onSelect?.();
        }
      }}
      isHoverable={onSelect != null || onDeselect != null}
    >
      <div>{selectable}</div>
      {selected && selectedIcon && <Icon height="18px" src={selectedIcon} />}
    </ResourceOption>
  );
};

type ListProps = {
  listItems: Array<{
    selectable: React.ReactNode;
    key: string;
    onSelect?: () => void;
    onDeselect?: () => void;
    isSelected?: boolean;
  }>;
  scroll?: boolean;
};

const SelectableList: React.FC<ListProps> = ({ listItems, scroll = true }) => {
  return (
    <StyledSelectableList scroll={scroll}>
      {listItems.map((li) => {
        return (
          <SelectableRow
            key={li.key}
            selectable={li.selectable}
            selected={li.isSelected}
            onSelect={li.onSelect}
            onDeselect={li.onDeselect}
          />
        );
      })}
    </StyledSelectableList>
  );
};

export default SelectableList;

const StyledSelectableList = styled.div<{ scroll?: boolean }>`
  display: flex;
  row-gap: 10px;
  flex-direction: column;
  ${(props) =>
    props.scroll &&
    css`
      max-height: 400px;
      overflow-y: scroll;
    `}
`;

const ResourceOption = styled.div<{ selected?: boolean; isHoverable: boolean }>`
  background: ${(props) => props.theme.clickable.bg};
  border: 1px solid
    ${(props) => (props.selected ? "#ffffff" : props.theme.border)};
  width: 100%;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${(props) => props.isHoverable && "cursor: pointer;"}
  ${(props) =>
    props.isHoverable &&
    !props.selected &&
    css`
      &:hover {
        border: 1px solid #7a7b80;
      }
    `}
`;
