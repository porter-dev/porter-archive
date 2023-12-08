import React, { useMemo } from "react";
import { type PorterApp } from "@porter-dev/api-contracts";
import styled from "styled-components";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { prefixSubdomain } from "lib/porter-apps/services";

import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";
import database from "assets/database.svg";
import CopyToClipboard from "components/CopyToClipboard";
import copy from "assets/copy-left.svg"

import Fieldset from "components/porter/Fieldset";
import { withRouter, type RouteComponentProps } from "react-router";
import Banner from "components/porter/Banner";
import TitleSection from "components/TitleSection";

// Buildpack icons
type Props = RouteComponentProps & {
  dbData: any
}
export const HELLO_PORTER_PLACEHOLDER_TAG = "porter-initial-image";

const DatabaseHeader: React.FC<Props> = ({ dbData }) => {

  const truncateText = (text: string, length: number): string => {
    if (text.length <= length) {
      return text;
    }
    return `${text.substring(0, length)}...`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "rds":
        return awsRDS;
      case "elasticache-redis":
        return awsElastiCache;
      default:
        return database;
    }
  }


  return (
    <>
      <TitleSection
        icon={getIcon(dbData?.type)}
        iconWidth="33px"
      >
        {dbData?.name}
      </TitleSection>
      <Spacer y={1} />

      {
        dbData?.status !== "available" && <>
          <Banner>
            <BannerContents>
              <b>Database is being created</b>
            </BannerContents>
            <Spacer inline width="5px" />
          </Banner>
          <Spacer y={1} />
        </>
      }
      {/* } */}

      <Fieldset>

        <Text size={12}>Database details: </Text>
        <Spacer y={.5} />

        <GridList>

          {dbData?.metadata.map((item, index) => (
            <>
              <Container column>
                <Text size={12}>{item.name}</Text>

                <Container row>
                  <Text title={item.value} color="helper" size={10}>{truncateText(item.value, 42)}</Text>
                  <CopyToClipboard text={item.value.toString()}>
                    <CopyIcon src={copy} alt="copy" />
                  </CopyToClipboard>
                </Container>
              </Container>

            </>
          ))}
        </GridList>


      </Fieldset>
    </>
  );
};

export default withRouter(DatabaseHeader);


const CopyIcon = styled.img`
      cursor: pointer;
      margin-left: 5px;
      margin-right: 5px;
      width: 10px;
      height: 10px;
      `;
const GridList = styled.div`
      display: grid;
      grid-column-gap: 25px;
      grid-row-gap: 25px;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      `;

const BannerContents = styled.div`
display: flex;
flex-direction: column;
row-gap: 0.5rem;
`;