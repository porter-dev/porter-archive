import React from "react";
import styled from "styled-components";

import Banner from "components/porter/Banner";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import TitleSection from "components/TitleSection";

import DatabaseHeaderItem from "./DatabaseHeaderItem";
import { datastoreIcons } from "./icons";
import { type DatastoreWithSource } from "./types";
import { datastoreField } from "./utils";

type Props = {
  datastore: DatastoreWithSource;
};

const DatabaseHeader: React.FC<Props> = ({ datastore }) => {
  return (
    <>
      <TitleSection icon={datastoreIcons[datastore.type]} iconWidth="33px">
        {datastore.name}
      </TitleSection>
      <Spacer y={1} />

      {datastoreField(datastore, "status") !== "available" && (
        <>
          <Banner>
            <BannerContents>
              <b>Database is being created</b>
            </BannerContents>
            <Spacer inline width="5px" />
          </Banner>
          <Spacer y={1} />
        </>
      )}

      <Fieldset>
        <Text size={12}>Database details: </Text>
        <Spacer y={0.5} />

        {datastore.metadata !== undefined && datastore.metadata?.length > 0 && (
          <GridList>
            {datastore.metadata?.map((item, index) => (
              <DatabaseHeaderItem item={item} key={index}></DatabaseHeaderItem>
            ))}
          </GridList>
        )}
      </Fieldset>
    </>
  );
};

export default DatabaseHeader;

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
