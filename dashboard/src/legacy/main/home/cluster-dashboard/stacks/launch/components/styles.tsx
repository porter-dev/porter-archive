import SaveButton from "components/SaveButton";
import styled from "styled-components";

export const Card = {
  Grid: styled.div`
    margin-bottom: 32px;
    display: grid;
    grid-row-gap: 15px;
  `,
  Wrapper: styled.div<{ variant?: "clickable" | "unclickable" }>`
    display: flex;
    color: #ffffff;
    justify-content: space-between;
    height: 75px;
    padding: 12px;
    padding-left: 14px;
    align-items: center;
    border-radius: 5px;
    background: #26292e;
    border: 1px solid #494b4f;

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
          border: 1px solid #7A7B80;
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
  `,

  Title: styled.div`
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
  `,
  SmallerIcon: styled.img`
    height: 20px;
    margin-right: 18px;
    margin-left: 8px;
  `,
  Icon: styled.img`
    height: 30px;
    margin-right: 15px;
    margin-left: 5px;
  `,
  Actions: styled.div`
    margin-right: 5px;
    display: flex;
  `,
  ActionButton: styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #ffffff11;
    border: 1px solid #ffffff22;
    cursor: pointer;
    color: white;

    :not(:first-child) {
      margin-left: 10px;
    }

    &:hover {
      background-color: #ffffff3c;
    }

    > i {
      font-size: 18px;
    }
  `,
};

export const SubmitButton = styled(SaveButton)`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;

export const AddResourceButtonStyles = {
  Wrapper: styled(Card.Wrapper)`
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
    z-index: 999;
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

export const BackButton = styled.div`
  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
    margin-right: 10px;
    padding: 3px;
    margin-left: 0px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

export const Polymer = styled.div`
  margin-bottom: -6px;

  > i {
    color: #ffffff;
    font-size: 24px;
    margin-left: 5px;
    margin-right: 18px;
  }
`;

export const Icon = styled.img`
  width: 40px;
  margin-right: 14px;

  opacity: 0;
  animation: floatIn 0.5s 0.2s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
