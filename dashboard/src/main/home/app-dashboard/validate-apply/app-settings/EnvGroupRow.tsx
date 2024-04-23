import React, { useContext, useMemo } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import FileArray from "components/porter/FileArray";
import Image from "components/porter/Image";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import EnvGroupArray from "main/home/env-dashboard/EnvGroupArray";

import { Context } from "shared/Context";
import { envGroupPath } from "shared/util";
import database from "assets/database.svg";
import doppler from "assets/doppler.png";
import key from "assets/key.svg";

type Props = {
  maxHeight?: string;
  onRemove?: (name: string) => void;
  envGroup: {
    name: string;
    type: string;
    variables: Record<string, string>;
    secret_variables: Record<string, string>;
    files: Array<{ name: string; contents: string }>;
  };
  canDelete?: boolean;
  noLink?: boolean;
};

// TODO: support footer for consolidation w/ app services
const EnvGroupRow: React.FC<Props> = ({
  maxHeight,
  envGroup,
  onRemove,
  canDelete = true,
  noLink = false,
}) => {
  const { currentProject } = useContext(Context);
  const history = useHistory();

  const variables = useMemo(() => {
    const normalVariables = Object.entries(envGroup.variables || {}).map(
      ([key, value]) => ({
        key,
        value,
        hidden: value.includes("PORTERSECRET"),
        locked: value.includes("PORTERSECRET"),
        deleted: false,
      })
    );

    const secretVariables = Object.entries(envGroup.secret_variables || {}).map(
      ([key, value]) => ({
        key,
        value,
        hidden: true,
        locked: true,
        deleted: false,
      })
    );

    return [...normalVariables, ...secretVariables];
  }, [envGroup]);

  return (
    <Expandable
      maxHeight={maxHeight}
      header={
        <Container row spaced>
          <Container row>
            <Image
              size={20}
              src={
                envGroup.type === "doppler"
                  ? doppler
                  : envGroup.type === "datastore"
                  ? database
                  : key
              }
            />
            <Spacer inline x={1} />
            <Text size={14}>{envGroup.name}</Text>
          </Container>
          <Container row>
            {!noLink && (
              <Svg
                onClick={() => {
                  history.push(
                    envGroupPath(
                      currentProject,
                      `/${envGroup.name}/synced-apps`
                    )
                  );
                }}
                data-testid="geist-icon"
                fill="none"
                height="27px"
                shape-rendering="geometricPrecision"
                stroke="currentColor"
                stroke-linecap="round"
                strokeLinejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="27px"
                data-darkreader-inline-stroke=""
                data-darkreader-inline-color=""
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                <path d="M15 3h6v6"></path>
                <path d="M10 14L21 3"></path>
              </Svg>
            )}
            {canDelete && onRemove && (
              <>
                <Spacer inline x={0.5} />
                <I
                  className="material-icons"
                  onClick={() => {
                    onRemove(envGroup.name);
                  }}
                >
                  delete
                </I>
              </>
            )}
          </Container>
        </Container>
      }
    >
      <EnvGroupArray values={variables} disabled={true} />
      {envGroup.files?.length > 0 && (
        <>
          <Spacer y={0.5} />
          <FileArray files={envGroup.files} setFiles={() => {}} disabled />
        </>
      )}
    </Expandable>
  );
};

export default EnvGroupRow;

const I = styled.i`
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  color: #aaaabb;
  :hover {
    color: white;
  }
`;

const Svg = styled.svg`
  stroke-width: 2;
  cursor: pointer;
  padding: 5px;
  stroke: #aaaabb;
  :hover {
    stroke: white;
  }
`;
