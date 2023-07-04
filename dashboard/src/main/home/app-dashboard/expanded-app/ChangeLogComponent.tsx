import React, { FC } from 'react';
import * as Diff from "deep-diff";
import styled from 'styled-components';

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

const ChangeBoxComponent: FC<BoxProps> = ({ type, children }) => {

  return (
    <ChangeBox type={type}>
      {children}
    </ChangeBox>
  );

};

type Props = {
  oldYaml: any;
  newYaml: any;
};

const ChangeLogComponent: FC<Props> = ({ oldYaml, newYaml }) => {
  const diff = Diff.diff(oldYaml, newYaml);
  const changes: JSX.Element[] = [];
  const servicePattern = /^[a-zA-Z0-9\-]*-[a-zA-Z0-9]*[^\.]$/;

  diff?.forEach((difference: any) => {
    let path = difference.path?.join(".");
    // Extract the base path and check if it includes forbidden paths

    const syncedPaths = ["synced"];
    const isSyncedPath = syncedPaths.some(subPath => path?.includes(subPath));

    // Restructure the path when synced is included
    if (isSyncedPath) {
      const parts = path?.split(".");
      const syncedIndex = parts?.indexOf("synced");
      path = `${parts[0]}.${parts[syncedIndex]}.${parts[parts?.length - 1]}`;
    }

    // Extract the base path and check if it includes forbidden paths
    const basePath = path?.split('.').slice(0, -1).join('.');
    const forbiddenPaths = ["container", "env", "keys", "name"];
    const isForbiddenPath = forbiddenPaths.some(subPath => basePath?.includes(subPath));

    if (difference.kind === "E" && isForbiddenPath && !isSyncedPath) {
      return;  // Skip if it's a forbidden path
    }

    console.log("Filtered Difference: ", difference);
    console.log("Filtered Path: ", path);

    // rest of th

    switch (difference.kind) {
      case "E":
        const tags = getTagsFromChange(path);
        if (tags) {
          const repoId = "your-repo-id-here"; // replace with your repoId
          const link = createCompareLink(repoId, tags.oldTag, tags.newTag);
          changes.push(
            <ChangeBoxComponent type="E">
              Image tag changed: {tags.oldTag} -{'>'} {tags.newTag}
            </ChangeBoxComponent>
          );
        } else {
          changes.push(
            <ChangeBoxComponent type="E">
              {`${path}: ${JSON.stringify(difference.lhs)} -> ${JSON.stringify(difference.rhs)}`}
            </ChangeBoxComponent>
          );
        }
        break;
      case "N":
        if (servicePattern.test(path)) {
          changes.push(
            <ChangeBoxComponent type="N">{`${path} created`}</ChangeBoxComponent>
          );
        } else {
          changes.push(
            <ChangeBoxComponent type="N">{`${path} added: ${JSON.stringify(difference.rhs)}`}</ChangeBoxComponent>
          );
        }
        break;
      case "D":
        if (servicePattern.test(path)) {
          changes.push(
            <ChangeBoxComponent type="D">{`${path} deleted`}</ChangeBoxComponent>
          );
        } else {
          changes.push(
            <ChangeBoxComponent type="D">{`${path} removed`}</ChangeBoxComponent>
          );
        }
        break;
      case "A":
        path = `${path}[${difference.index}]`;
        if (difference.item.kind === "N") {
          changes.push(
            <ChangeBoxComponent type="N">{`${path} added`}</ChangeBoxComponent>
          );
        } else if (difference.item.kind === "D") {
          changes.push(
            <ChangeBoxComponent type="D">{`${path} deleted`}</ChangeBoxComponent>
          );
        }
        break;
      default:
        break;
    }

    if (changes.length === 0) {
      changes.push(<ChangeBoxComponent type="E">No changes detected</ChangeBoxComponent>);
    }
  });
  return <ChangeLog>{changes}</ChangeLog>;
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