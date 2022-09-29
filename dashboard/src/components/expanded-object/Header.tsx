import DynamicLink from "components/DynamicLink";
import React from "react";
import styled from "styled-components";
import TitleSection from "components/TitleSection";

import leftArrow from "assets/left-arrow.svg";

type Props = {
  last_updated: string;
  back_link: string;
  name: string;
  icon: string;
  inline_title_items?: React.ReactNodeArray;
  sub_title_items?: React.ReactNodeArray;
  materialIconClass?: string;
};

const Header: React.FunctionComponent<Props> = (props) => {
  const {
    last_updated,
    back_link,
    icon,
    name,
    inline_title_items,
    sub_title_items,
    materialIconClass,
  } = props;

  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb to={back_link}>
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <HeaderWrapper>
        <Title
          icon={icon}
          iconWidth="25px"
          materialIconClass={materialIconClass}
        >
          {name}
          <Flex>{inline_title_items}</Flex>
        </Title>

        {sub_title_items || (
          <InfoWrapper>
            <InfoText>Last updated {last_updated}</InfoText>
          </InfoWrapper>
        )}
      </HeaderWrapper>
    </>
  );
};

export default Header;

const Wrap = styled.div`
  z-index: 999;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const HeaderWrapper = styled.div`
  position: relative;
  margin-bottom: 10px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  width: auto;
  justify-content: space-between;
`;

const InfoText = styled.span`
  font-size: 13px;
  color: #aaaabb66;
`;

const Title = styled(TitleSection)`
  font-size: 16px;
  margin-top: 4px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
`;
