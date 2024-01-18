import React from "react";
import styled from "styled-components";

import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

import { useDatabaseContext } from "../DatabaseContextProvider";
import DatabaseHeaderItem from "../DatabaseHeaderItem";

const ConfigurationTab: React.FC = () => {
  const { datastore } = useDatabaseContext();
  return (
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
  );
};

export default ConfigurationTab;

const GridList = styled.div`
  display: grid;
  grid-column-gap: 25px;
  grid-row-gap: 25px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
`;
