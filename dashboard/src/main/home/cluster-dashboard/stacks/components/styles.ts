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
