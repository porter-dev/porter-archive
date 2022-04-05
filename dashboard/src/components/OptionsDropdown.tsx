import React, { useState } from "react";
import styled from "styled-components";

export const OptionsDropdown: React.FC<{
  expandIcon?: string;
  shrinkIcon?: string;
}> = ({ children, expandIcon = "expand_more", shrinkIcon = "expand_less" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: any) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleOnBlur = () => {
    setIsOpen(false);
  };

  return (
    <OptionsButton onClick={handleClick} onBlur={handleOnBlur}>
      <i className="material-icons">
        {isOpen ? { shrinkIcon } : { expandIcon }}
      </i>
      {isOpen && <DropdownMenu>{children}</DropdownMenu>}
    </OptionsButton>
  );
};

const OptionsButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  color: #ffffff44;
  :hover {
    background: #32343a;
    cursor: pointer;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  right: 12px;
  top: 30px;
  overflow: hidden;
  width: 120px;
  height: auto;
  background: #26282f;
  box-shadow: 0 8px 20px 0px #00000088;
  color: white;
`;

const DropdownOption = styled.div`
  width: 100%;
  height: 37px;
  font-size: 13px;
  cursor: pointer;
  padding-left: 10px;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  justify-content: center;
  align-items: center;
  :hover {
    background: #ffffff22;
  }
  :not(:first-child) {
    border-top: 1px solid #00000000;
  }

  :not(:last-child) {
    border-bottom: 1px solid #ffffff15;
  }

  > i {
    margin-right: 5px;
    font-size: 16px;
  }
`;

export default {
  Dropdown: OptionsDropdown,
  Option: DropdownOption,
};
