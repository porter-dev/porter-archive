import React from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import closeImg from "assets/close.png";

type ExpandedNodeViewParams = {
  nodeId: string;
};

export const ExpandedNodeView = () => {
  const { nodeId } = useParams<ExpandedNodeViewParams>();

  const closeNodeView = () => {};

  return (
    <>
      <CloseOverlay onClick={closeNodeView} />
      <StyledExpandedChart>
        {/* <ConfirmOverlay
            show={this.state.showDeleteOverlay}
            message={`Are you sure you want to delete ${currentChart.name}?`}
            onYes={this.handleUninstallChart}
            onNo={() => this.setState({ showDeleteOverlay: false })}
          />
          {this.renderDeleteOverlay()} */}

        <HeaderWrapper>
          <TitleSection>
            <Title>
              <IconWrapper></IconWrapper>
              {"Some name"}
            </Title>
          </TitleSection>

          <CloseButton onClick={closeNodeView}>
            <CloseButtonImg src={closeImg} />
          </CloseButton>
        </HeaderWrapper>
        <BodyWrapper>{nodeId}</BodyWrapper>
      </StyledExpandedChart>
    </>
  );
};

export default ExpandedNodeView;

const BodyWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const DeleteOverlay = styled.div`
  position: absolute;
  top: 0px;
  opacity: 100%;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 999;
  display: flex;
  padding-bottom: 30px;
  align-items: center;
  justify-content: center;
  font-family: "Work Sans", sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: white;
  flex-direction: column;
  background: rgb(0, 0, 0, 0.73);
  opacity: 0;
  animation: lindEnter 0.2s;
  animation-fill-mode: forwards;

  @keyframes lindEnter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Bolded = styled.div`
  font-weight: 500;
  color: #ffffff44;
  margin-right: 6px;
`;

const Url = styled.a`
  display: block;
  margin-left: 2px;
  font-size: 13px;
  margin-top: 16px;
  user-select: all;
  margin-bottom: -5px;
  user-select: text;
  display: flex;
  align-items: center;

  > i {
    font-size: 15px;
    margin-right: 10px;
  }
`;

const TabButton = styled.div`
  position: absolute;
  right: 0px;
  height: 30px;
  background: linear-gradient(to right, #26282f00, #26282f 20%);
  padding-left: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${(props: { devOpsMode: boolean }) =>
    props.devOpsMode ? "#aaaabb" : "#aaaabb55"};
  margin-left: 35px;
  border-radius: 20px;
  text-shadow: 0px 0px 8px
    ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "#ffffff66" : "none"};
  cursor: pointer;
  :hover {
    color: ${(props: { devOpsMode: boolean }) =>
      props.devOpsMode ? "" : "#aaaabb99"};
  }

  > i {
    font-size: 17px;
    margin-right: 9px;
  }
`;

const CloseOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #202227;
  animation: fadeIn 0.2s 0s;
  opacity: 0;
  animation-fill-mode: forwards;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const HeaderWrapper = styled.div``;

const Dot = styled.div`
  margin-right: 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-left: 6px;
  margin-top: 22px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-left: 10px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const TagWrapper = styled.div`
  position: absolute;
  bottom: 0px;
  right: 0px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const Icon = styled.img`
  width: 100%;
`;

const IconWrapper = styled.div`
  color: #efefef;
  font-size: 16px;
  height: 20px;
  width: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 3px;
  margin-right: 12px;

  > i {
    font-size: 20px;
  }
`;

const Title = styled.div`
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  user-select: text;
`;

const TitleSection = styled.div`
  width: 100%;
  position: relative;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledExpandedChart = styled.div`
  width: calc(100% - 50px);
  height: calc(100% - 50px);
  z-index: 0;
  position: absolute;
  top: 25px;
  left: 25px;
  border-radius: 10px;
  background: #26272f;
  box-shadow: 0 5px 12px 4px #00000033;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  padding: 25px;
  display: flex;
  overflow: hidden;
  flex-direction: column;

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
