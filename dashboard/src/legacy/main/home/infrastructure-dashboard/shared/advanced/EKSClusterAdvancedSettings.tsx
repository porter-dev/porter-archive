import React from "react";
import Button from "legacy/components/porter/Button";
import Checkbox from "legacy/components/porter/Checkbox";
import Container from "legacy/components/porter/Container";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type ClientClusterContract } from "legacy/lib/clusters/types";
import AnimateHeight from "react-animate-height";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

const EKSClusterAdvancedSettings: React.FC = () => {
  const { control, watch, register } = useFormContext<ClientClusterContract>();
  const loadBalancerType = watch("cluster.config.loadBalancer.type", "UNKNOWN");
  const {
    append: appendCertArn,
    remove: removeCertArn,
    fields: certificateArns,
  } = useFieldArray({
    control,
    name: "cluster.config.loadBalancer.certificateArns",
  });
  const {
    remove: removeTag,
    append: appendTag,
    fields: tags,
  } = useFieldArray({
    control,
    name: `cluster.config.loadBalancer.awsTags`,
  });
  const isWafV2Enabled = watch(
    "cluster.config.loadBalancer.isWafV2Enabled",
    false
  );

  return (
    <div>
      <Text size={16}>Compliance</Text>
      <Spacer y={0.5} />
      <SettingsGroupContainer>
        <SettingsGroupContainer>
          <Text size={14}>ECR scanning</Text>
          <Controller
            name={`cluster.config.isEcrScanningEnabled`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                checked={value}
                toggleChecked={() => {
                  onChange(!value);
                }}
              >
                <Text color="helper">ECR scanning enabled</Text>
              </Checkbox>
            )}
          />
        </SettingsGroupContainer>
        <SettingsGroupContainer>
          <Text size={14}>AWS GuardDuty</Text>
          <Text color="helper">
            In addition to installing the agent, you must enable GuardDuty
            through your AWS Console and enable EKS Protection in the EKS
            Protection tab of the GuardDuty console.
          </Text>
          <Controller
            name={`cluster.config.isGuardDutyEnabled`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                checked={value}
                toggleChecked={() => {
                  onChange(!value);
                }}
              >
                <Text color="helper">
                  AWS GuardDuty agent installed on cluster
                </Text>
              </Checkbox>
            )}
          />
        </SettingsGroupContainer>
        <SettingsGroupContainer>
          <Text size={14}>KMS Encryption</Text>
          <Controller
            name={`cluster.config.isKmsEncryptionEnabled`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                checked={value}
                toggleChecked={() => {
                  onChange(!value);
                }}
              >
                <Text color="helper">KMS encryption enabled</Text>
              </Checkbox>
            )}
          />
        </SettingsGroupContainer>
      </SettingsGroupContainer>
      <Spacer y={1} />
      <Text size={16}>AWS CloudWatch logging</Text>
      <Spacer y={0.5} />
      <Text color={"helper"}>
        Configure which EKS cluster control plane log types to send to AWS
        CloudWatch.
      </Text>
      <Spacer y={0.5} />
      <SettingsGroupContainer>
        <Controller
          name={`cluster.config.logging.isApiServerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">API Server logs</Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isAuditLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">Audit logs</Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isAuthenticatorLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">Authenticator logs</Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isControllerManagerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">Controller manager logs</Text>
            </Checkbox>
          )}
        />
        <Controller
          name={`cluster.config.logging.isSchedulerLogsEnabled`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              checked={value}
              toggleChecked={() => {
                onChange(!value);
              }}
            >
              <Text color="helper">Scheduler logs</Text>
            </Checkbox>
          )}
        />
      </SettingsGroupContainer>
      <Spacer y={1} />
      <Text size={16}>Load balancer</Text>
      <Spacer y={0.5} />
      <SettingsGroupContainer>
        <Text size={14}>Type</Text>
        <Controller
          name={`cluster.config.loadBalancer.type`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Container style={{ width: "300px" }}>
              <Select
                options={["NLB", "ALB"].map((value) => ({
                  value,
                  label: value,
                }))}
                setValue={(selected: string) => {
                  onChange(selected);
                }}
                value={value}
              />
            </Container>
          )}
        />
        <AnimateHeight
          duration={500}
          height={loadBalancerType === "ALB" ? "auto" : 0}
        >
          <SettingsGroupContainer>
            <SettingsGroupContainer>
              <Text size={14}>Wildcard domain</Text>
              <Text color="helper">
                The provided domain should have a wildcard subdomain pointed to
                the LoadBalancer address. Using testing.porter.run will create a
                certificate for testing.porter.run with a SAN
                *.testing.porter.run.
              </Text>
              <ControlledInput
                type="text"
                placeholder="user-2.porter.run"
                width="300px"
                {...register("cluster.config.loadBalancer.wildcardDomain")}
              />
            </SettingsGroupContainer>
            <SettingsGroupContainer>
              <Text size={14}>IP Allow List</Text>
              <Text color="helper">
                Each range should be a CIDR, including netmask such as
                10.1.2.3/21. To use multiple values, they should be
                comma-separated with no spaces.
              </Text>
              <ControlledInput
                type="text"
                placeholder="160.72.72.58/32,160.72.72.59/32"
                width="300px"
                {...register("cluster.config.loadBalancer.allowlistIpRanges")}
              />
            </SettingsGroupContainer>
            <SettingsGroupContainer>
              <Text size={14}>Certificate ARNs</Text>
              {certificateArns.length !== 0 && (
                <>
                  {certificateArns.map((certArn, i) => {
                    return (
                      <div key={certArn.id}>
                        <CertificateArnContainer>
                          <ControlledInput
                            type="text"
                            placeholder="arn:aws:acm:REGION:ACCOUNT_ID:certificate/ACM_ID"
                            width="275px"
                            {...register(
                              `cluster.config.loadBalancer.certificateArns.${i}.arn`
                            )}
                          />
                          <DeleteButton
                            onClick={() => {
                              removeCertArn(i);
                            }}
                          >
                            <i className="material-icons">cancel</i>
                          </DeleteButton>
                        </CertificateArnContainer>
                        <Spacer y={0.25} />
                      </div>
                    );
                  })}
                </>
              )}
              <Button
                onClick={() => {
                  appendCertArn({
                    arn: "",
                  });
                }}
              >
                + Add
              </Button>
            </SettingsGroupContainer>
            <SettingsGroupContainer>
              <Text size={14}>AWS Tags</Text>
              {tags.length !== 0 && (
                <>
                  {tags.map((tag, i) => {
                    return (
                      <div key={tag.id}>
                        <CertificateArnContainer>
                          <ControlledInput
                            type="text"
                            placeholder="key"
                            width="275px"
                            {...register(
                              `cluster.config.loadBalancer.awsTags.${i}.key`
                            )}
                          />
                          <ControlledInput
                            type="text"
                            placeholder="value"
                            width="275px"
                            {...register(
                              `cluster.config.loadBalancer.awsTags.${i}.value`
                            )}
                          />
                          <DeleteButton
                            onClick={() => {
                              removeTag(i);
                            }}
                          >
                            <i className="material-icons">cancel</i>
                          </DeleteButton>
                        </CertificateArnContainer>
                        <Spacer y={0.25} />
                      </div>
                    );
                  })}
                </>
              )}
              <Button
                onClick={() => {
                  appendTag({
                    key: "",
                    value: "",
                  });
                }}
              >
                + Add
              </Button>
            </SettingsGroupContainer>
            <SettingsGroupContainer>
              <Text size={14}>WAFv2</Text>
              <Controller
                name={`cluster.config.loadBalancer.isWafV2Enabled`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    checked={value}
                    toggleChecked={() => {
                      onChange(!value);
                    }}
                  >
                    <Text color="helper">WAFv2 enabled</Text>
                  </Checkbox>
                )}
              />
              {isWafV2Enabled && (
                <SettingsGroupContainer>
                  <Text size={14}>WAFv2 ARN</Text>
                  <Text color="helper">
                    Only Regional WAFv2 is supported. To find your ARN, navigate
                    to the WAF console, click the Gear icon in the top right,
                    and toggle on &quot;ARN&quot;.
                  </Text>
                  <ControlledInput
                    type="text"
                    placeholder="arn:aws:wafv2:REGION:ACCOUNT_ID:regional/webacl/ACL_NAME/RULE_ID"
                    width="300px"
                    {...register("cluster.config.loadBalancer.wafV2Arn")}
                  />
                </SettingsGroupContainer>
              )}
            </SettingsGroupContainer>
          </SettingsGroupContainer>
        </AnimateHeight>
      </SettingsGroupContainer>
    </div>
  );
};

export default EKSClusterAdvancedSettings;

const SettingsGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CertificateArnContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DeleteButton = styled.div`
  width: 15px;
  height: 15px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  margin-top: -3px;
  justify-content: center;

  > i {
    font-size: 17px;
    color: #ffffff44;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    :hover {
      color: #ffffff88;
    }
  }
`;
