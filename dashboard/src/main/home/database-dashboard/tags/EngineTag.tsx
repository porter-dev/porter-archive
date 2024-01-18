import React from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { type DatabaseEngine } from "lib/databases/types";

import postgresql from "assets/postgresql.svg";
import redis from "assets/redis.svg";

type Props = {
  engine: DatabaseEngine;
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
