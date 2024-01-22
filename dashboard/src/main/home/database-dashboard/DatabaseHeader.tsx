import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import StatusDot from "components/porter/StatusDot";
import Text from "components/porter/Text";

import { readableDate } from "shared/string_utils";

import { useDatabaseContext } from "./DatabaseContextProvider";
import { getDatastoreIcon } from "./icons";
import EngineTag from "./tags/EngineTag";
import { datastoreField } from "./utils";

const DatabaseHeader: React.FC = () => {
  const { datastore } = useDatabaseContext();

  return (
    <>
      <Container row style={{ width: "100%" }}>
        <Container row spaced style={{ width: "100%" }}>
          <Container row>
            <Icon src={getDatastoreIcon(datastore.type)} height={"25px"} />
            <Spacer inline x={1} />
            <Text size={21}>{datastore.name}</Text>
            <Spacer inline x={1} />
            <Container row>
              <EngineTag engine={datastore.template.engine} heightPixels={15} />
            </Container>
          </Container>
          {match(datastoreField(datastore, "status"))
            .with("available", () => (
              <Container row>
                <StatusDot status={"available"} heightPixels={11} />
              </Container>
            ))
            .otherwise(() => (
              <Container row>
                <StatusDot status={"pending"} heightPixels={11} />
              </Container>
            ))}
        </Container>
      </Container>
      <Spacer y={0.5} />
      <CreatedAtContainer>
        <div style={{ flexShrink: 0 }}>
          <Text color="#aaaabb66">
            Created {readableDate(datastore.created_at)}
          </Text>
        </div>
        <Spacer y={0.5} />
      </CreatedAtContainer>
    </>
  );
};

export default DatabaseHeader;

const CreatedAtContainer = styled.div`
  display: inline-flex;
  column-gap: 6px;
`;
