import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import api from 'shared/api';

import { Context } from 'shared/Context';
import { type ClusterType } from 'shared/types';

import InputRow from 'components/form-components/InputRow';
import EnvGroupArray, { type KeyValueType } from './EnvGroupArray';
import Selector from 'components/Selector';
import Helper from 'components/form-components/Helper';
import SaveButton from 'components/SaveButton';
import { isAlphanumeric } from 'shared/common';

type PropsType = {
  goBack: () => void;
  currentCluster: ClusterType;
};

const CreateEnvGroup = ({ goBack, currentCluster }: PropsType) => {
  const [envGroupName, setEnvGroupName] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [namespaceOptions, setNamespaceOptions] = useState<any[]>([]);
  const [envVariables, setEnvVariables] = useState<KeyValueType[]>([]);
  const [submitStatus, setSubmitStatus] = useState('');

  const context = useContext(Context);

  useEffect(() => {
    updateNamespaces();
  }, []);

  const isDisabled = (): boolean => {
    const isEnvGroupNameInvalid =
      !isAlphanumeric(envGroupName) ||
      envGroupName === '' ||
      envGroupName.length > 15;

    const isAnyEnvVariableBlank = envVariables.some(
      (envVar) => !envVar.key.trim() || !envVar.value.trim()
    );



    return isEnvGroupNameInvalid || isAnyEnvVariableBlank;
  };

  const onSubmit = (): void => {
    setSubmitStatus("loading")

    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};

    const envVariable = envVariables;

    if (context.currentProject.simplified_view_enabled) {
      api
        .createNamespace(
          "<token>",
          {
            name: "porter-env-group",
          },
          {
            id: context.currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .catch((error) => {
          if (error.response && error.response.status === 412) {
            // do nothing
          } else {
            // do nothing still
          }
        });
    }
    envVariable
      .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are marked as deleted and are duplicates
        const numCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key ? 1 : 0);
        }, 0);

        if (numCollisions === 1) {
          return true;
        } else {
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) =>
                _envVar.key === envVar.key && !_envVar.deleted
            )
          );
        }
      })
      .forEach((envVar: KeyValueType) => {
        if (!envVar.deleted) {
          if (envVar.hidden) {
            secretEnvVariables[envVar.key] = envVar.value;
          } else {
            apiEnvVariables[envVar.key] = envVar.value;
          }
        }
      });

    api
      .createEnvGroup(
        "<token>",
        {
          name: envGroupName,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: context.currentProject.id,
          cluster_id: currentCluster.id,
          namespace: context.currentProject.simplified_view_enabled ? "porter-env-group" : selectedNamespace,
        }
      )
      .then((res) => {
        setSubmitStatus("successful");
        // console.log(res);
        goBack();
      })
      .catch((err) => {
        setSubmitStatus("Could not create");
      });
  };

  const createEnv = () => {
    setSubmitStatus("loading")

    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};

    const envVariable = envVariables;
    envVariable
      .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
        // remove any collisions that are marked as deleted and are duplicates
        const numCollisions = self.reduce((n, _envVar: KeyValueType) => {
          return n + (_envVar.key === envVar.key ? 1 : 0);
        }, 0);

        if (numCollisions === 1) {
          return true;
        } else {
          return (
            index ===
            self.findIndex(
              (_envVar: KeyValueType) =>
                _envVar.key === envVar.key && !_envVar.deleted
            )
          );
        }
      })
      .forEach((envVar: KeyValueType) => {
        if (!envVar.deleted) {
          if (envVar.hidden) {
            secretEnvVariables[envVar.key] = envVar.value;
          } else {
            apiEnvVariables[envVar.key] = envVar.value;
          }
        }
      });

    api
      .createEnvironmentGroups(
        "<token>",
        {
          name: envGroupName,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: context.currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        setSubmitStatus("successful");
        // console.log(res);
        goBack();
      })
      .catch((err) => {
        if (err) {
          setSubmitStatus("Could not create");
        }
      });
  };

  const updateNamespaces = () => {
    const { currentProject } = context;
    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (res.data) {
          const availableNamespaces = res.data.filter((namespace: any) => {
            return namespace.status !== "Terminating";
          });
          const namespaceOptions = availableNamespaces.map(
            (x: { name: string }) => {
              return { label: x.name, value: x.name };
            }
          );
          if (availableNamespaces.length > 0) {
            setNamespaceOptions(namespaceOptions);
          }
        }
      })
      .catch(console.log);
  };


  return (
    <>
      <StyledCreateEnvGroup>
        <HeaderSection>
          <Button onClick={goBack}>
            <i className="material-icons">keyboard_backspace</i>
            Back
          </Button>
          <Title>Create an environment group</Title>
        </HeaderSection>
        <Wrapper>
          <DarkMatter antiHeight="-13px" />
          <Heading isAtTop={true}>Name</Heading>
          <Subtitle>
            <Warning
              makeFlush={true}
              highlight={
                (!isAlphanumeric(envGroupName) ||
                  envGroupName.length > 60) &&
                envGroupName !== ""
              }
            >
              Lowercase letters, numbers, and "-" only. Maximum 60 characters.
            </Warning>
          </Subtitle>
          <DarkMatter antiHeight="-29px" />
          <InputRow
            type="text"
            value={envGroupName}
            setValue={(x: string) => { setEnvGroupName(x) }}
            placeholder="ex: my-env-group"
            width="100%"
          />
          {!context?.currentProject?.simplified_view_enabled && (<>
            <Heading>Destination</Heading>
            <Subtitle>
              Specify the namespace you would like to create this environment
              group in.
            </Subtitle>
            <DestinationSection>
              <NamespaceLabel>
                <i className="material-icons">view_list</i>Namespace
              </NamespaceLabel>
              <Selector
                key={"namespace"}
                activeValue={selectedNamespace}
                setActiveValue={(namespace: string) => { setSelectedNamespace(namespace) }}
                options={namespaceOptions}
                width="250px"
                dropdownWidth="335px"
                closeOverlay={true}
              />
            </DestinationSection>
          </>
          )
          }
          <Heading>Environment variables</Heading>
          <Helper>
            Set environment variables for your secrets and environment-specific
            configuration.
          </Helper>
          <EnvGroupArray
            namespace={selectedNamespace}
            values={envVariables}
            setValues={(x: any) => { setEnvVariables(x); }}
            fileUpload={true}
            secretOption={true}
          />
        </Wrapper>
        <SaveButton
          disabled={isDisabled()}
          text="Create env group"
          clearPosition={true}
          statusPosition="right"
          onClick={context.currentProject.simplified_view_enabled ? createEnv : onSubmit}
          status={
            isDisabled()
              ? "Missing required fields"
              : submitStatus
          }
          makeFlush={true}
        />
      </StyledCreateEnvGroup>
      <Buffer />
    </>
  );

}

export default CreateEnvGroup;

const Wrapper = styled.div`
  padding: 30px;
  padding-bottom: 25px;
  border-radius: 5px;
  margin-top: -15px;
  background: ${props => props.theme.fg};
  border: 1px solid #494b4f;
  margin-bottom: 30px;
`;

const Buffer = styled.div`
  width: 100%;
  height: 150px;
`;

const StyledCreateEnvGroup = styled.div`
  padding-bottom: 70px;
  position: relative;
`;

const NamespaceLabel = styled.div`
  margin-right: 10px;
  display: flex;
  align-items: center;
  > i {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const DestinationSection = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-family: "Work Sans", sans-serif;
  font-size: 14px;
  margin-top: 2px;
  font-weight: 500;
  margin-bottom: 32px;

  > i {
    font-size: 25px;
    color: #ffffff44;
    margin-right: 13px;
  }
`;

const Button = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 20px;
  color: white;
  height: 35px;
  margin-left: -2px;
  padding: 0px 8px;
  padding-bottom: 1px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  border: 2px solid #969fbbaa;
  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    color: #969fbbaa;
    font-weight: 600;
    font-size: 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-15px"};
`;

const Warning = styled.span<{ highlight: boolean; makeFlush?: boolean }>`
  color: ${(props) => (props.highlight ? "#f5cb42" : "")};
  margin-left: ${(props) => (props.makeFlush ? "" : "5px")};
`;

const Subtitle = styled.div`
  padding: 11px 0px 16px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
  line-height: 1.6em;
  display: flex;
  align-items: center;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 15px;
  border-radius: 2px;
  color: #ffffff;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 40px;

  > i {
    cursor: pointer;
    font-size: 20px;
    color: #969fbbaa;
    padding: 2px;
    border: 2px solid #969fbbaa;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }

  > img {
    width: 20px;
    margin-left: 17px;
    margin-right: 7px;
  }
`;

const Heading = styled.div<{ isAtTop?: boolean }>`
  color: white;
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 5px;
  margin-top: ${(props) => (props.isAtTop ? "10px" : "30px")};
  display: flex;
  align-items: center;
`;
