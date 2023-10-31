import { useGithubContents } from "lib/hooks/useGithubContents";
import React, { useState } from "react";
import styled from "styled-components";
import file from "assets/file_v2.svg";
import folder from "assets/folder_v2.svg";
import file_branch from "assets/file-branch.svg";
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
    widthPixels?: number;
    heightPixels?: number;
    headerText: string;
}
const FileSelector: React.FC<Props> = ({
    repoId,
    repoOwner,
    repoName,
    branch,
    projectId,
    onFileSelect,
    isFileSelectable = () => true,
    widthPixels = 500,
    heightPixels = 275,
    headerText,
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

    return (
        <div>
            <StyledFileSelector widthPixels={widthPixels} heightPixels={heightPixels}>
                {isLoading ? (
                    <Loading />
                ) : (
                    <>
                    {path !== "./" && path !== "" ? (
                    <Item
                        onClick={() => {
                            const parentPath = path.split("/").slice(0, -2).join("/") + "/";
                            setPath(parentPath);
                        }}
                        isHeaderItem={false}
                    >
                        <img src={folder} />
                        ..
                    </Item>
                ) : (
                    <Item
                        onClick={() => {}}
                        isHeaderItem
                    >
                        <img src={file_branch} />
                        {headerText}
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
                                    onClick={() => {
                                        if (isSelectable) {
                                            onFileSelect(content.path);
                                        }
                                    }}
                                    isFileSelectable={isSelectable}
                                    isHeaderItem={false}
                                >
                                    <img src={file} />
                                    {relativePath}
                                </FileItem>
                            ))
                            .with({ type: "dir" }, (content) => (
                                <Item 
                                    key={i} 
                                    onClick={() => setPath(`${path}${relativePath}/`)}
                                    isHeaderItem={false}
                                >
                                    <img src={folder} />
                                    {relativePath}
                                </Item>
                            ))
                            .with({ type: "symlink" }, (content) => (
                                <FileItem 
                                    key={i} 
                                    onClick={() => ({})}
                                    isHeaderItem={false}
                                    isFileSelectable={false}
                                >
                                    <img src={folder} />
                                    {relativePath}
                                </FileItem>
                            ))
                        .exhaustive();
                    }
                )}
                    </>
                )}
            </StyledFileSelector>
        </div>
    );
};

export default FileSelector;

const StyledFileSelector = styled.div<{ widthPixels: number, heightPixels: number }>`
  margin-top: 10px;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
  width: ${({ widthPixels }) => widthPixels}px;
  height: ${({ heightPixels }) => heightPixels}px;
`;

const Item = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border: 1px solid #494b4f;
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props: { isHeaderItem: boolean }) =>
    props.isHeaderItem ? "default" : "pointer"};
  background:  ${(props) =>
    props.isHeaderItem ?  `${props.theme.fg2}` : `${props.theme.clickable.bg}`};
  :hover {
    border: ${(props) =>
        props.isHeaderItem ? `1px solid #494b4f` : `1px solid #7a7b80`};
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }

  animation: slideIn 0.5s 0s;
  animation-fill-mode: forwards;
  @keyframes slideIn {
    from {
      margin-left: -10px;
      opacity: 0;
      margin-right: 10px;
    }
    to {
      margin-left: 0;
      opacity: 1;
      margin-right: 0;
    }
  }
`;

const FileItem = styled(Item)`
  cursor: ${(props: { isFileSelectable: boolean }) =>
    props.isFileSelectable ? "pointer" : "default"};
  color: ${(props: { isFileSelectable: boolean }) =>
    props.isFileSelectable ? "#ffffff" : "#ffffff55"};
  :hover {
    border: ${(props) =>
        props.isFileSelectable ?  `1px solid #7a7b80`: `1px solid #494b4f`};
  }

  img {
    opacity: ${(props: { isFileSelectable: boolean }) =>
        props.isFileSelectable ? "1" : "0.5"} !important;
  }
`;