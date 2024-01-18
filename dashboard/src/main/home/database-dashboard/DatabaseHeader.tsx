import React, { useMemo } from "react";
import styled from "styled-components";

import Banner from "components/porter/Banner";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import TitleSection from "components/TitleSection";

import { readableDate } from "shared/string_utils";

import { getTemplateEngineDisplayName } from "./constants";
import { useDatabaseContext } from "./DatabaseContextProvider";
import { getDatastoreIcon } from "./icons";
import { datastoreField } from "./utils";

const DatabaseHeader: React.FC = () => {
  const { datastore } = useDatabaseContext();

  const templateDisplayName = useMemo(() => {
    return getTemplateEngineDisplayName(datastore.engine);
  }, [datastore.engine]);
  return (
    <>
      <TitleSection icon={getDatastoreIcon(datastore.type)} iconWidth="33px">
        {datastore.name}
        <Spacer inline x={1} />
        <Container row>
          <Tag hoverable={false}>
            <Text size={13}>{templateDisplayName}</Text>
          </Tag>
        </Container>
      </TitleSection>
      <Spacer y={1} />
      <LatestDeployContainer>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Created {readableDate(datastore.created_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
      </LatestDeployContainer>
      {datastoreField(datastore, "status") !== "available" && (
        <>
          <Spacer y={1} />
          <Banner>
            <BannerContents>
              <b>Database is being created</b>
            </BannerContents>
            <Spacer inline width="5px" />
          </Banner>
          <Spacer y={1} />
        </>
      )}
    </>
  );
};

export default DatabaseHeader;

const BannerContents = styled.div`
  display: flex;
  flex-direction: column;
  row-gap: 0.5rem;
`;

const LatestDeployContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
