import React, { useState } from "react";
import role from "legacy/assets/role.svg";
import Button from "legacy/components/porter/Button";
import Checkbox from "legacy/components/porter/Checkbox";
import Container from "legacy/components/porter/Container";
import Expandable from "legacy/components/porter/Expandable";
import Image from "legacy/components/porter/Image";
import Input from "legacy/components/porter/Input";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import styled from "styled-components";

type RoleModalProps = {
  readOnly?: boolean;
  name: string;
  closeModal: () => void;
  permissions?: any;
};

const RoleModal: React.FC<RoleModalProps> = ({
  name,
  closeModal,
  readOnly,
  permissions,
}) => {
  const [inputName, setInputName] = useState(name);
  const [perms, setPerms] = useState(permissions);
  return (
    <Modal closeModal={closeModal} width={"800px"}>
      <Container row>
        <Image size={18} src={role} />
        <Spacer inline x={1} />
        <Text size={16}>Configure role</Text>
      </Container>
      <Spacer y={1} />
      <Text color="helper">Role name</Text>
      <Spacer y={0.5} />
      <Input
        disabled={readOnly}
        placeholder="ex: Porter Developer"
        width="300px"
        value={inputName}
        setValue={setInputName}
      />
      <Spacer y={1} />
      <Text color="helper">Manage permissions for this role:</Text>
      <Spacer y={1} />
      <ScrollWrapper>
        <Expandable alt preExpanded header={<>Clusters</>}>
          <Expandable alt preExpanded header={<>All clusters</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
          </Expandable>
          <Expandable alt preExpanded header={<>staging</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
          </Expandable>
          <Expandable alt preExpanded header={<>production</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Applications</>}>
          <Expandable alt preExpanded header={<>All applications</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.applications.tabs.notifications}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Notifications
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.activity}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Activity
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.overview}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Overview
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.logs}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Logs
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.metrics}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Metrics
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.environment}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.build_settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Build settings
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
            <Expandable alt preExpanded header={<>Actions</>}>
              <Checkbox
                checked={perms?.applications.actions?.app_rollbacks}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                App rollbacks
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
          <Expandable alt preExpanded header={<>tetris-app</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.applications.tabs.notifications}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Notifications
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.activity}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Activity
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.overview}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Overview
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.logs}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Logs
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.metrics}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Metrics
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.environment}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.build_settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Build settings
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
            <Expandable alt preExpanded header={<>Actions</>}>
              <Checkbox
                checked={perms?.applications.actions?.app_rollbacks}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                App rollbacks
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
          <Expandable alt preExpanded header={<>chatter-v2-backend</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.applications.tabs.notifications}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Notifications
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.activity}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Activity
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.overview}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Overview
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.logs}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Logs
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.metrics}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Metrics
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.environment}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.build_settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Build settings
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
            <Expandable alt preExpanded header={<>Actions</>}>
              <Checkbox
                checked={perms?.applications.actions?.app_rollbacks}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                App rollbacks
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
          <Expandable alt preExpanded header={<>bartender-backend</>}>
            <Checkbox
              checked={perms?.applications.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.applications.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.applications.tabs.notifications}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Notifications
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.activity}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Activity
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.overview}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Overview
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.logs}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Logs
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.metrics}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Metrics
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.environment}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.build_settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Build settings
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.applications.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
            <Expandable alt preExpanded header={<>Actions</>}>
              <Checkbox
                checked={perms?.applications.actions?.app_rollbacks}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                App rollbacks
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Datastores</>}>
          <Expandable alt preExpanded header={<>All datastores</>}>
            <Checkbox
              checked={perms?.datastores.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.datastores.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.datastores.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.datastores.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.datastores.tabs.connection_info}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Connection info
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.datastores.tabs.connected_apps}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Connected apps
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.datastores.tabs.configuration}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Configuration
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.datastores.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Add-ons</>}>
          <Expandable alt preExpanded header={<>All add-ons</>}>
            <Checkbox
              checked={perms?.addOns.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.addOns.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.addOns.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.addOns.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Env groups</>}>
          <Expandable alt preExpanded header={<>All env groups</>}>
            <Checkbox
              checked={perms?.envGroups.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.envGroups.write}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Write
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.envGroups.create}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Create
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.envGroups.delete}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Delete
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.envGroups.tabs.environment_variables}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment variables
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.envGroups.tabs.synced_applications}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Synced applications
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.envGroups.tabs.settings}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Settings
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Preview environments</>}>
          <Expandable alt preExpanded header={<>All preview environments</>}>
            <Checkbox
              checked={perms?.previewEnvironments.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.previewEnvironments.manage}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Manage
            </Checkbox>
            <Spacer y={0.5} />
            <Expandable alt preExpanded header={<>Tabs</>}>
              <Checkbox
                checked={perms?.previewEnvironments.tabs.app_services}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                App services
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.previewEnvironments.tabs.environment_variables}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Environment variables
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.previewEnvironments.tabs.required_apps}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Required apps
              </Checkbox>
              <Spacer y={0.5} />
              <Checkbox
                checked={perms?.previewEnvironments.tabs.add_ons}
                toggleChecked={() => {}}
                disabled={readOnly}
              >
                Add-ons
              </Checkbox>
              <Spacer y={0.5} />
            </Expandable>
          </Expandable>
        </Expandable>

        <Expandable alt preExpanded header={<>Integrations</>}>
          <Expandable alt preExpanded header={<>All integrations</>}>
            <Checkbox
              checked={perms?.integrations.read}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Read
            </Checkbox>
            <Spacer y={0.5} />
            <Checkbox
              checked={perms?.integrations.manage}
              toggleChecked={() => {}}
              disabled={readOnly}
            >
              Manage
            </Checkbox>
            <Spacer y={0.5} />
          </Expandable>
        </Expandable>
      </ScrollWrapper>
      {!readOnly && (
        <>
          <Spacer y={1} />
          <Button>Create role</Button>
        </>
      )}
    </Modal>
  );
};

export default RoleModal;

const ScrollWrapper = styled.div`
  overflow-y: auto;
  max-height: calc(100vh - 360px);
`;
