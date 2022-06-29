import SaveButton from "components/SaveButton";
import styled from "styled-components";

export const CardGrid = styled.div`
  margin-top: 32px;
  margin-bottom: 32px;
  display: grid;
  grid-row-gap: 25px;
`;

export const Card = styled.div<{ variant?: "clickable" | "unclickable" }>`
  display: flex;
  color: #ffffff;
  background: #2b2e3699;
  justify-content: space-between;
  border-radius: 5px;
  height: 75px;
  padding: 12px;
  padding-left: 14px;
  border: 1px solid #ffffff0f;
  align-items: center;

  ${(props) => {
    if (props.variant === "unclickable") {
      return `
      cursor: default;
      :hover {
        border: 1px solid #ffffff0f;
      }
      `;
    }

    return `
      cursor: pointer;
      :hover {
        border: 1px solid #ffffff3c;
      }
    `;
  }}

  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const SubmitButton = styled(SaveButton)`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;

export const AddResourceButtonStyles = {
  Wrapper: styled(Card)`
    align-items: center;
    position: relative;
    font-size: 14px;
    height: 50px;
    :hover {
      background: #ffffff19;
    }
  `,
  Text: styled.span`
    font-size: 20px;
  `,
  Flex: styled.div`
    display: flex;
    align-items: center;
  `,
};

export const SelectorStyles = {
  Wrapper: styled.div`
    max-width: 200px;
    position: relative;
    font-size: 13px;

    margin-left: 10px;
  `,
  Button: styled.div`
    background-color: #ffffff11;
    border: 1px solid #ffffff22;
    border-radius: 5px;
    min-width: 115px;
    min-height: 30px;
    padding: 0 15px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    white-space: nowrap;
    overflow-y: hidden;
    text-overflow: ellipsis;
    cursor: pointer;

    > i {
      font-size: 20px;
      transform: ${(props: { expanded: boolean }) =>
        props.expanded ? "rotate(180deg)" : ""};
    }
  `,
  Dropdown: styled.div`
    position: absolute;
    background-color: #26282f;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
  `,
  Option: styled.div`
    min-height: 35px;
    padding: 0 15px;

    display: flex;
    align-items: center;

    cursor: pointer;

    &.active {
      background-color: #32343c;
    }

    :hover {
      background-color: #32343c;
    }

    :not(:last-child) {
      border-bottom: 1px solid #ffffff15;
    }
  `,
  OptionText: styled.span`
    max-width: 115px;
    overflow-x: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
};

export const ButtonWithIcon = styled.div<{ variant?: "normal" | "delete" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #ffffff11;
  border: 1px solid #ffffff22;
  cursor: pointer;

  ${({ variant }) => {
    if (variant === "delete") {
      return "margin-right: 5px;";
    }
  }}

  &:hover {
    background-color: #ffffff3c;
  }

  > i {
    font-size: 18px;
  }
`;

export const Flex = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
`;

export const Icon = styled.img`
  height: 30px;
  margin-right: 15px;
  margin-left: 5px;
`;
