import React, { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { PorterApp } from "main/home/app-dashboard/types/porterApp";
import api from "shared/api";
import styled from "styled-components";
import { z } from "zod";
import Loading from "components/Loading";
import github from "assets/github-white.png";
import Input from "components/porter/Input";
import { BackButton } from "./EnvironmentApps";
import Spacer from "components/porter/Spacer";

type ImportAppProps = {
    projectId: number;
    clusterId: number;
    tempApp: Partial<PorterApp>;
    setTempApp: Dispatch<SetStateAction<Partial<PorterApp>>>;
};

export const ImportApp: React.FC<ImportAppProps> = ({
    projectId,
    clusterId,
    tempApp,
    setTempApp,
}) => {
    const { data, status } = useQuery<Partial<PorterApp>[]>(
        ["getPorterApps", projectId, clusterId],
        async () => {
            const { data } = await api.getPorterApps(
                "<token>",
                {},
                {
                    project_id: projectId,
                    cluster_id: clusterId,
                }
            );

            return data.reverse();
        }
    );

    const renderApps = () => {
        if (status === "error" || tempApp.name === undefined) {
            return null;
        }

        if (status === "loading") {
            return (
                <LoadingWrapper>
                    <Loading />
                </LoadingWrapper>
            );
        }

        return tempApp.name === "" ? (
            <AppListWrapper>
                {data.map((app, idx) => (
                    <AppName
                        key={idx}
                        isSelected={app.name === tempApp.name}
                        lastItem={idx === data.length - 1}
                        onClick={() => {
                            setTempApp(app);
                        }}
                    >
                        {!!app.repo_name ? (
                            <img src={github} alt={"github icon"} />
                        ) : (
                            <img
                                src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/97_Docker_logo_logos-512.png"
                                alt={"github icon"}
                            />
                        )}
                        {app.name}
                    </AppName>
                ))}
            </AppListWrapper>
        ) : (
            <>
                <Input
                    disabled={true}
                    label="Porter App:"
                    width="100%"
                    value={tempApp.name}
                    setValue={() => {}}
                    placeholder=""
                />
                <BackButton
                    width="130px"
                    onClick={() => {
                        setTempApp((prev) => {
                            const newApp = {
                                ...prev,
                                name: "",
                            };

                            return newApp;
                        });
                    }}
                >
                    <i className="material-icons">keyboard_backspace</i>
                    Select app
                </BackButton>
                <Spacer y={0.5} />
            </>
        );
    };
    return <ExpandedWrapper>{renderApps()}</ExpandedWrapper>;
};

const ExpandedWrapper = styled.div`
    margin-top: 10px;
    width: 100%;
    border-radius: 3px;
    max-height: 221px;
`;

const AppListWrapper = styled.div`
    border: 1px solid #ffffff55;
    border-radius: 3px;
    overflow-y: auto;
`;

const LoadingWrapper = styled.div`
    padding: 30px 0px;
    background: #ffffff11;
    display: flex;
    align-items: center;
    font-size: 13px;
    justify-content: center;
    color: #ffffff44;
`;

type AppNameProps = {
    lastItem: boolean;
    isSelected: boolean;
};

const AppName = styled.div<AppNameProps>`
    display: flex;
    width: 100%;
    font-size: 13px;
    border-bottom: 1px solid
        ${(props) => (props.lastItem ? "#00000000" : "#606166")};
    color: "#ffffff";
    user-select: none;
    align-items: center;
    padding: 10px 0px;
    cursor: pointer;
    pointer-events: auto;
    ${(props) => {
        if (props.isSelected) {
            return `background: #ffffff22;`;
        }

        return `background: #ffffff11;`;
    }}

    :hover {
        background: #ffffff22;

        > i {
            background: #ffffff22;
        }
    }

    > img,
    i {
        width: 18px;
        height: 18px;
        margin-left: 12px;
        margin-right: 12px;
        font-size: 20px;
    }
`;
