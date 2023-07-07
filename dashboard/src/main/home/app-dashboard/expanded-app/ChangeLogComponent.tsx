import React, { FC } from 'react';
import * as Diff from "deep-diff";
import styled from 'styled-components';
import Text from 'components/porter/Text';
import { flatMapDepth } from 'lodash';
import Link from 'components/porter/Link';

const createCompareLink = (repoId: string, oldTag: string, newTag: string) => {
  const baseUrl = 'https://github.com';
  const link = `${baseUrl}/${repoId}/compare/${oldTag}...${newTag}`;
  return link;
}

const getTagsFromChange = (changeString: string) => {
  const tagPattern = /"global image tag: "([^"]*)" -> "([^"]*)""/;
  const match = changeString.match(tagPattern);
  if (match) {
    return { oldTag: match[1], newTag: match[2] };
  }
  return null;
}

type Props = {
  oldYaml: any;
  newYaml: any;
  appData: any;
};

const ChangeLogComponent: FC<Props> = ({ oldYaml, newYaml, appData }) => {
  const diff = Diff.diff(oldYaml, newYaml);
  const changes: JSX.Element[] = [];
  // Define the regex pattern to match service creation
  const servicePattern = /^[a-zA-Z0-9\-]*-[a-zA-Z0-9]*[^\.]$/;
  diff?.forEach((difference: any) => {
    let path = difference.path?.join(" ");
    switch (difference.kind) {
      case "N":
        // Check if the added item is a service by testing the path against the regex pattern
        if (path?.includes('container env normal')) {
          const appName = path.split(' ')[0];
          const keyName = path.split(' ')[4];
          changes.push(
            <ChangeBox type="N">{`${appName} added env var ${keyName} = ${difference.rhs}`}</ChangeBox>
          );
        } else if (servicePattern.test(path)) {
          changes.push(<ChangeBox type="N">{`${path} created`}</ChangeBox>);
        } else {
          // If not, display the full message
          changes.push(
            <ChangeBox type="N">{`${path} added: ${JSON.stringify(
              difference.rhs
            )}`}</ChangeBox>
          );
        }
        break;
      case "D":
        if (servicePattern.test(path)) {
          // If so, display a simplified message
          changes.push(<ChangeBox type="D">
            {`${path} deleted`}
          </ChangeBox>);
        } else {

          changes.push(<ChangeBox type="D">
            {`${path} removed`}
          </ChangeBox>);
        }
        break;
      case "E":
        if (path === "global image tag") {
          const oldCommit = difference.lhs;
          const newCommit = difference.rhs;
          const commitDiffLink = `https://github.com/${appData.app.repo_name}/compare/${oldCommit}...${newCommit}`;
          changes.push(
            <ChangeBox type="E">
              {`Image tag: ${oldCommit} -> ${newCommit}. `}

              <Link
                target="_blank"
                hasunderline
                to={commitDiffLink}
              >
                View Commit Diff
              </Link>
            </ChangeBox>
          );
        } else {
          changes.push(
            <ChangeBox type="E">
              {`${path}: ${JSON.stringify(difference.lhs)} -> ${JSON.stringify(difference.rhs)}`}
            </ChangeBox>
          );
        }
        break;
      case "A":
        path = path + `[${difference.index}]`;
        if (difference.item.kind === "N") {
          if (path.includes('container env synced')) {
            const appName = path.split(' ')[0];
            if (path.includes('keys')) {
              // This is an addition of a key in an existing env group
              const keyName = difference.item.rhs?.name;
              changes.push(
                <ChangeBox type="N">{`${appName} synced env-group key ${keyName} added`}</ChangeBox>
              );
            } else {
              // This is an addition of a whole new env group
              const groupName = difference.item.rhs?.name;
              changes.push(
                <ChangeBox type="N">{`${appName} synced env-group ${groupName} added`}</ChangeBox>
              );
            }
          } else {
            changes.push(
              <ChangeBox type="N">{`${path} added: ${JSON.stringify(difference.item.rhs)}`}</ChangeBox>
            );
          }
        }
        if (difference.item.kind === "D") {
          if (path.includes('container env synced')) {
            const appName = path.split(' ')[0];
            if (path.includes('keys')) {
              // This is a deletion of a key in an existing env group
              const keyName = difference.item.lhs?.name;
              changes.push(
                <ChangeBox type="D">{`${appName} synced env-group key ${keyName} removed`}</ChangeBox>
              );
            } else {
              // This is a deletion of a whole env group
              const groupName = difference.item.lhs?.name;
              changes.push(
                <ChangeBox type="D">{`${appName} synced env-group ${groupName} removed`}</ChangeBox>
              );
            }
          } else {
            changes.push(
              <ChangeBox type="D">{`${path} removed: ${JSON.stringify(difference.item.lhs)}`}</ChangeBox>
            );
          }
        }
        if (difference.item.kind === "E")
          changes.push(
            <ChangeBox type="E">
              {`${path} updated: ${JSON.stringify(
                difference.item.lhs
              )} -> ${JSON.stringify(difference.item.rhs)}`}
            </ChangeBox>
          );
        break;
    }
  });
  if (changes.length === 0) {
    changes.push(
      <ChangeBox type="E">
        {`No changes detected`}
      </ChangeBox>
    )
  }

  return <ChangeLog>{changes}</ChangeLog>

};

export default ChangeLogComponent;

const ChangeLog = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
`;

type BoxProps = {
  type: string,
  children?: React.ReactNode,
};

const ChangeBox = styled.div<BoxProps>`
  padding: 10px;
  background-color: ${({ type }) =>
    type === "N"
      ? "#034a53"
      : type === "D"
        ? "#632f34"
        : type === "E"
          ? "#272831"
          : "#fff"};
  color: "#fff";
`;