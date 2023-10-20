import { useGithubContents } from "lib/hooks/useGithubContents";
import React, { useState } from "react";
import styled from "styled-components";
import file from "assets/file_v2.svg";
import folder from "assets/folder_v2.svg";
import info from "assets/info.svg";
import { match } from "ts-pattern";
import Loading from "components/Loading";

type Props = {
    repoId: number;
    repoOwner: string;
    repoName: string;
    branch: string;
    projectId: number;
    onFileSelect: (path: string) => void;
    isFileSelectable?: (path: string) => boolean;
}
const FileSelector: React.FC<Props> = ({
    repoId,
    repoOwner,
    repoName,
    branch,
    projectId,
    onFileSelect,
    isFileSelectable = () => true,
}) => {
    const [ path, setPath ] = useState<string>("./");
    const { contents, isLoading } = useGithubContents({
        repoId,
        repoOwner,
        repoName,
        branch,
        path,
        projectId,
    })

    if (isLoading) {
        return (
            <StyledFileSelector>
                <Item lastItem={false}>
                    <Loading />
                </Item>
            </StyledFileSelector>
        )
    }

    return (
        <StyledFileSelector>
            {path !== "./" && path !== "" ? (
                <Item
                    lastItem={false}
                    onClick={() => {
                        const parentPath = path.split("/").slice(0, -2).join("/") + "/";
                        setPath(parentPath);
                    }}
                >
                    <img src={folder} />
                    ..
                </Item>
            ) : (
                <Item
                    lastItem={false}
                    onClick={() => {}}
                >
                    <img src={info} />
                    Select your Dockerfile below:
                </Item>
            )}
            {contents.map((content, i) => 
                {
                    // this is the path in the scope of the current directory
                    // e.g. if the path is ./foo/bar, then the relative path is bar
                    const relativePath = content.path.split("/").slice(-1)[0];
                    const isSelectable = isFileSelectable(relativePath);
                    return match(content)
                        .with({ type: "file" }, (content) => (
                            <FileItem 
                                key={i} 
                                lastItem={i === contents.length - 1}
                                onClick={() => {
                                    if (isSelectable) {
                                        onFileSelect(content.path);
                                    }
                                }}
                                isFileSelectable={isSelectable}
                            >
                                <img src={file} />
                                {relativePath}
                            </FileItem>
                        ))
                        .with({ type: "dir" }, (content) => (
                            <Item 
                                key={i} 
                                lastItem={i === contents.length - 1}
                                onClick={() => setPath(`${path}${relativePath}/`)}
                            >
                                <img src={folder} />
                                {relativePath}
                            </Item>
                        ))
                    .exhaustive();
                }
            )}
        </StyledFileSelector>
    );
};

export default FileSelector;

const StyledFileSelector = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const Item = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected?: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected?: boolean; lastItem: boolean }) =>
    props.isSelected ? "#ffffff22" : "#ffffff11"};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const FileItem = styled(Item)`
  cursor: ${(props: { isFileSelectable?: boolean }) =>
    props.isFileSelectable ? "pointer" : "default"};
  color: ${(props: { isFileSelectable?: boolean }) =>
    props.isFileSelectable ? "#ffffff" : "#ffffff55"};
`;