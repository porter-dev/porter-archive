import React from "react";
import postgresql from "legacy/assets/postgresql.svg";
import redis from "legacy/assets/redis.svg";
import Icon from "legacy/components/porter/Icon";
import Spacer from "legacy/components/porter/Spacer";
import Tag from "legacy/components/porter/Tag";
import Text from "legacy/components/porter/Text";
import { type DatastoreEngine } from "legacy/lib/databases/types";
import styled from "styled-components";
import { match } from "ts-pattern";

type Props = {
  engine: DatastoreEngine;
  heightPixels?: number;
};

const EngineTag: React.FC<Props> = ({ engine, heightPixels = 13 }) => {
  return (
    <Tag hoverable={false}>
      <IconContainer>
        {match(engine)
          .with({ name: "POSTGRES" }, () => (
            <Icon src={postgresql} height={`${heightPixels}px`} />
          ))
          .with({ name: "REDIS" }, () => (
            <Icon src={redis} height={`${heightPixels}px`} />
          ))
          .with({ name: "AURORA-POSTGRES" }, () => (
            <Icon src={postgresql} height={`${heightPixels}px`} />
          ))
          .otherwise(() => null)}
      </IconContainer>
      <Spacer inline x={0.5} />
      <Text size={heightPixels}>{engine.displayName}</Text>
    </Tag>
  );
};

export default EngineTag;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  margin-bottom: 1px;
`;
