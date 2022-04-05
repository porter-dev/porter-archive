import DynamicLink from "components/DynamicLink";
import React from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import TitleSection from "components/TitleSection";

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
    <HeaderWrapper>
      <BackButton to={back_link}>
        <BackButtonImg src={backArrow} />
      </BackButton>
      <Title icon={icon} iconWidth="25px" materialIconClass={materialIconClass}>
        {name}
        <Flex>{inline_title_items}</Flex>
      </Title>

      {sub_title_items || (
        <InfoWrapper>
          <InfoText>Last updated {last_updated}</InfoText>
        </InfoWrapper>
      )}
    </HeaderWrapper>
  );
};

export default Header;

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

const BackButton = styled(DynamicLink)`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
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
