import React, { useContext, useEffect } from "react";
import { useParams } from "react-router";
import styled from "styled-components";
import closeImg from "assets/close.png";
import api from "shared/api";
import { Context } from "shared/Context";

type ExpandedNodeViewParams = {
  nodeId: string;
};

export const ExpandedNodeView = () => {
  const { nodeId } = useParams<ExpandedNodeViewParams>();
  const { currentCluster, currentProject } = useContext(Context);

  useEffect(() => {
    api
      .getClusterNode(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          nodeName: nodeId,
        }
      )
      .then((res) => {
        console.log(res);
      });
  }, []);

  const closeNodeView = () => {};

  return (
    <>
      <StyledExpandedChart>
        <HeaderWrapper>
          <TitleSection>
            <Title>
              <IconWrapper></IconWrapper>
              {nodeId}
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

const HeaderWrapper = styled.div``;

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
