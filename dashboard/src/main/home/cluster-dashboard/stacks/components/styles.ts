import DynamicLink from "components/DynamicLink";
import styled from "styled-components";

const StatusBase = styled.div`
  margin-top: 1px;
  width: 8px;
  height: 8px;
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 16px;
`;

export const StatusStyles = {
  Spinner: styled.img`
    width: 15px;
    height: 15px;
    margin-right: 15px;
    margin-bottom: -3px;
  `,
  Failed: styled(StatusBase)`
    background: #ed5f85;
  `,
  Successful: styled(StatusBase)`
    background: #4797ff;
  `,
  Unknown: styled(StatusBase)`
    background: #f5cb42;
  `,
  Status: styled.div`
    display: flex;
    height: 20px;
    font-size: 13px;
    flex-direction: row;
    text-transform: capitalize;
    align-items: center;
    font-family: "Work Sans", sans-serif;
    color: #aaaabb;
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
};

export const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 10px 0px 35px;
`;

export const Br = styled.div`
  width: 100%;
  height: 1px;
`;

export const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;

  height: 20px;
  font-size: 13px;
  position: relative;
  font-weight: 400;
  color: #ffffff66;
  margin-left: 1px;
`;

export const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

export const Text = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

export const SepDot = styled.div`
  color: #aaaabb66;
  margin: 0 9px;
`;

export const Flex = styled.div`
  display: flex;
  align-items: center;
`;

export const NamespaceTag = {
  Wrapper: styled.div`
    height: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff44;
    border: 1px solid #ffffff44;
    border-radius: 3px;
    padding-left: 5px;
  `,

  Tag: styled.div`
    height: 20px;
    margin-left: 6px;
    color: #aaaabb;
    background: #ffffff22;
    border-radius: 3px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0px 6px;
    padding-left: 7px;
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
};

export const Action = {
  Row: styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 35px;
  `,
  Button: styled(DynamicLink)`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    cursor: pointer;
    font-family: "Work Sans", sans-serif;
    border-radius: 5px;
    color: white;
    height: 35px;
    padding: 0px 8px;
    min-width: 130px;
    padding-bottom: 1px;
    font-weight: 500;
    padding-right: 15px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-shadow: 0 5px 8px 0px #00000010;
    cursor: ${(props: { disabled?: boolean }) =>
      props.disabled ? "not-allowed" : "pointer"};

    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "#aaaabbee" : "#616FEEcc"};
    :hover {
      background: ${(props: { disabled?: boolean }) =>
        props.disabled ? "" : "#505edddd"};
    }

    > i {
      color: white;
      width: 18px;
      height: 18px;
      font-weight: 600;
      font-size: 12px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      margin-right: 5px;
      justify-content: center;
    }
  `,
};
