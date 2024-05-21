import React from "react";
import styled from "styled-components";

import TitleSection from "../TitleSection";
import Container from "./Container";
import Spacer from "./Spacer";
import Tooltip from "./Tooltip";

type Props = {
  image?: string;
  title: React.ReactNode;
  description?: string;
  materialIconClass?: string;
  capitalize?: boolean;
  prefix?: React.ReactNode;
};

const DashboardHeader: React.FC<Props> = ({
  image,
  title,
  description,
  materialIconClass,
  capitalize,
  prefix,
}) => {
  return (
    <>
      <Container row>
        {prefix}
        <TitleSection
          capitalize={capitalize === undefined || capitalize}
          icon={image}
          materialIconClass={materialIconClass}
        >
          {title}
        </TitleSection>
      </Container>

      {description && (
        <>
          <Spacer y={1} />
          <InfoSection>
            <TopRow>
              <Tooltip content="TestInfo" position="bottom" hidden={true}>
                <InfoLabel>
                  <i className="material-icons">info</i> Info
                </InfoLabel>
              </Tooltip>
            </TopRow>
            <Description>{description}</Description>
          </InfoSection>
        </>
      )}
      <Spacer height="35px" />
    </>
  );
};

export default DashboardHeader;

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

const InfoSection = styled.div`
  font-family: "Work Sans", sans-serif;
  margin-left: 0px;
`;
