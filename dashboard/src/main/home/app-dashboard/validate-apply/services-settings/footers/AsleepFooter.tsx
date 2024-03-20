import React from "react";
import _ from "lodash";
import styled from "styled-components";

import Container from "components/porter/Container";

import moon from "assets/moon.svg";

const AsleepFooter: React.FC = () => {
  return (
    <StyledStatusFooter>
      <Container row>
        <TagContainer>
          <ChipIcon src={moon} alt="Moon" />
          <TagText>Asleep</TagText>
        </TagContainer>
      </Container>
    </StyledStatusFooter>
  );
};

export default AsleepFooter;

const StyledStatusFooter = styled.div`
  width: 100%;
  padding: 10px 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  flex-direction: row;
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

const TagContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  position: relative;
  width: auto;
  height: 35px;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 200%;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ChipIcon = styled.img`
  width: 16px;
  height: 16px;
  margin-right: 4px;
`;

const TagText = styled.span`
  font-family: "General Sans";
  font-weight: 400;
  font-size: 14px;
  line-height: 100%;
  letter-spacing: -0.02em;
  color: #ffffff;
`;
