import React from "react";
import styled from "styled-components";

type Props = {
  text: string;
};

const InfoSection: React.FC<Props> = ({ text }) => {
  return (
    <StyledInfoSection>
      <TopRow>
        <InfoLabel>
          <i className="material-icons">info</i> Info
        </InfoLabel>
      </TopRow>
      <Description>{text}</Description>
    </StyledInfoSection>
  );
};

export default InfoSection;

const TopRow = styled.div`
  display: flex;
  align-items: center;
`;

const Description = styled.div`
  color: #aaaabb;
  margin-top: 13px;
  margin-left: 1px;
  font-size: 13px;
`;

const InfoLabel = styled.div`
  width: 72px;
  height: 20px;
  display: flex;
  align-items: center;
  color: #aaaabb;
  font-size: 13px;
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 5px;
  }
`;

const StyledInfoSection = styled.div`
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
`;
